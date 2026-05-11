import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone

import torch
import torch.nn.functional as F

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from model import checkpoint_device_safe_load, create_model, load_checkpoint_into_model
from preprocess import (
    build_label_map,
    build_vocab,
    encode_text,
    load_config,
    load_examples,
    load_vocab,
    save_vocab,
)


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def load_training_rows(examples, label_to_id):
    rows = []
    for item in examples:
        text = (item.get("text") or "").strip()
        label = item.get("label")
        if not text or label not in label_to_id:
            continue

        weight = float(item.get("weight", 1.0))
        if item.get("preferred"):
            weight += 0.15

        rows.append(
            {
                "text": text,
                "label_id": label_to_id[label],
                "weight": max(weight, 0.1),
            }
        )
    return rows


def train_from_data_dir(data_dir):
    config = load_config(data_dir)
    vocab = load_vocab(data_dir)
    examples = load_examples(data_dir)
    labels, label_to_id = build_label_map(config)
    training_config = config.get("training", {})

    rows = load_training_rows(examples, label_to_id)
    texts = [row["text"] for row in rows]
    vocab = build_vocab(
        texts,
        max_size=training_config.get("maxVocabSize", 5000),
        existing_vocab=vocab,
    )
    vocab["updated_at"] = utc_now()
    save_vocab(data_dir, vocab)

    model_path = os.path.join(data_dir, "model.pt")
    model = create_model(len(vocab["id_to_token"]), len(labels), config)

    checkpoint = None
    if os.path.exists(model_path):
        checkpoint = checkpoint_device_safe_load(model_path)
        state_dict = checkpoint.get("model_state", {})
        model = load_checkpoint_into_model(model, state_dict)

    if not rows:
        blank_checkpoint = {
            "model_state": model.state_dict(),
            "labels": labels,
            "vocab_size": len(vocab["id_to_token"]),
            "created_at": utc_now(),
            "trained_at": None,
            "example_count": 0,
            "metrics": {
                "status": "blank",
                "loss": None,
                "accuracy": None,
                "epochs": 0,
            },
        }
        torch.save(blank_checkpoint, model_path)
        return {
            "status": "blank",
            "trained": False,
            "example_count": 0,
            "vocab_size": len(vocab["id_to_token"]),
            "model_path": model_path,
        }

    sequence_length = training_config.get("sequenceLength", 24)
    batch_size = max(1, training_config.get("batchSize", 8))
    epochs = int(os.environ.get("TRAIN_EPOCHS", training_config.get("epochs", 18)))
    learning_rate = training_config.get("learningRate", 0.003)

    feature_rows = [encode_text(row["text"], vocab, sequence_length) for row in rows]
    label_rows = [row["label_id"] for row in rows]
    weight_rows = [row["weight"] for row in rows]

    features = torch.tensor(feature_rows, dtype=torch.long)
    targets = torch.tensor(label_rows, dtype=torch.long)
    weights = torch.tensor(weight_rows, dtype=torch.float32)

    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    model.train()

    final_loss = None
    for _epoch in range(epochs):
        permutation = torch.randperm(features.size(0))
        for start in range(0, features.size(0), batch_size):
            batch_indices = permutation[start : start + batch_size]
            batch_x = features[batch_indices]
            batch_y = targets[batch_indices]
            batch_w = weights[batch_indices]

            optimizer.zero_grad()
            logits = model(batch_x)
            losses = F.cross_entropy(logits, batch_y, reduction="none")
            loss = (losses * batch_w).mean()
            loss.backward()
            optimizer.step()
            final_loss = float(loss.item())

    model.eval()
    with torch.no_grad():
        logits = model(features)
        probabilities = torch.softmax(logits, dim=-1)
        predictions = torch.argmax(probabilities, dim=-1)
        accuracy = float((predictions == targets).float().mean().item())
        avg_confidence = float(
            probabilities.max(dim=-1).values.mean().item() if probabilities.numel() else 0.0
        )

    label_counts = {}
    for item in rows:
        label_name = labels[item["label_id"]]
        label_counts[label_name] = label_counts.get(label_name, 0) + 1

    result = {
        "status": "trained",
        "trained": True,
        "example_count": len(rows),
        "vocab_size": len(vocab["id_to_token"]),
        "epochs": epochs,
        "loss": None if final_loss is None else round(final_loss, 6),
        "accuracy": round(accuracy, 4),
        "avg_confidence": round(avg_confidence, 4),
        "label_counts": label_counts,
        "trained_at": utc_now(),
        "min_examples_hint": training_config.get("minExamplesToTrain", 8),
    }

    checkpoint = {
        "model_state": model.state_dict(),
        "labels": labels,
        "vocab_size": len(vocab["id_to_token"]),
        "created_at": checkpoint.get("created_at") if checkpoint else utc_now(),
        "trained_at": result["trained_at"],
        "example_count": len(rows),
        "metrics": result,
    }
    torch.save(checkpoint, model_path)
    return result


def main():
    parser = argparse.ArgumentParser(description="Train the blank-slate reply classifier.")
    parser.add_argument("--data-dir", required=True, help="Path to the shared data directory.")
    args = parser.parse_args()
    result = train_from_data_dir(args.data_dir)
    print(json.dumps(result))


if __name__ == "__main__":
    main()

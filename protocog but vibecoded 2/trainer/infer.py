import argparse
import json
import os
import sys

import torch

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from model import checkpoint_device_safe_load, create_model, load_checkpoint_into_model
from preprocess import (
    build_label_map,
    encode_text,
    known_token_ratio,
    load_config,
    load_examples,
    load_vocab,
)


def blank_response(config):
    labels = config.get("labels", [])
    top_predictions = [{"label": label, "score": 0.0} for label in labels[:3]]
    return {
        "trained": False,
        "label": "fallback",
        "confidence": 0.0,
        "top_predictions": top_predictions,
        "known_ratio": 0.0,
        "example_count": 0,
    }


def predict_text(data_dir, text):
    config = load_config(data_dir)
    vocab = load_vocab(data_dir)
    labels, _label_to_id = build_label_map(config)
    examples = load_examples(data_dir)
    model_path = os.path.join(data_dir, "model.pt")

    if not labels or not os.path.exists(model_path) or not examples:
        return blank_response(config)

    checkpoint = checkpoint_device_safe_load(model_path)
    model = create_model(len(vocab["id_to_token"]), len(labels), config)
    model = load_checkpoint_into_model(model, checkpoint.get("model_state", {}))
    model.eval()

    sequence_length = config.get("training", {}).get("sequenceLength", 24)
    encoded = torch.tensor([encode_text(text, vocab, sequence_length)], dtype=torch.long)
    with torch.no_grad():
        logits = model(encoded)
        probabilities = torch.softmax(logits, dim=-1)[0]
        top_k = min(3, probabilities.shape[0])
        scores, indices = torch.topk(probabilities, k=top_k)

    known_ratio = known_token_ratio(text, vocab)
    raw_confidence = float(scores[0].item()) if len(scores) else 0.0
    confidence = raw_confidence * (0.55 + (0.45 * known_ratio))

    example_count = int(checkpoint.get("example_count", 0))
    min_hint = config.get("training", {}).get("minExamplesToTrain", 8)
    if example_count < min_hint:
        confidence *= 0.85

    top_predictions = []
    for score, index in zip(scores.tolist(), indices.tolist()):
        top_predictions.append(
            {
                "label": labels[index],
                "score": round(float(score), 4),
            }
        )

    return {
        "trained": True,
        "label": labels[indices[0].item()],
        "confidence": round(float(confidence), 4),
        "raw_confidence": round(raw_confidence, 4),
        "top_predictions": top_predictions,
        "known_ratio": round(known_ratio, 4),
        "example_count": example_count,
        "metrics": checkpoint.get("metrics", {}),
    }


def main():
    parser = argparse.ArgumentParser(description="Run reply-class inference.")
    parser.add_argument("--data-dir", required=True, help="Path to the shared data directory.")
    parser.add_argument("--text", required=True, help="Text to classify.")
    args = parser.parse_args()
    result = predict_text(args.data_dir, args.text)
    print(json.dumps(result))


if __name__ == "__main__":
    main()

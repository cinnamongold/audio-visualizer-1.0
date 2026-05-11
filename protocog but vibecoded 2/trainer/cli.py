import argparse
import base64
import json
import os
import sys
from datetime import datetime, timezone

import torch

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from infer import predict_text
from model import create_model
from preprocess import build_label_map, load_config, load_examples, load_vocab
from train import train_from_data_dir


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def ensure_saved_model(data_dir):
    config = load_config(data_dir)
    vocab = load_vocab(data_dir)
    labels, _label_to_id = build_label_map(config)
    model_path = os.path.join(data_dir, "model.pt")

    if os.path.exists(model_path):
        return {"status": "exists", "model_path": model_path}

    model = create_model(len(vocab["id_to_token"]), len(labels), config)
    torch.save(
        {
            "model_state": model.state_dict(),
            "labels": labels,
            "vocab_size": len(vocab["id_to_token"]),
            "created_at": utc_now(),
            "trained_at": None,
            "example_count": 0,
            "metrics": {"status": "blank"},
        },
        model_path,
    )
    return {"status": "saved", "model_path": model_path}


def load_model_metadata(data_dir):
    model_path = os.path.join(data_dir, "model.pt")
    if not os.path.exists(model_path):
        return {"status": "missing", "model_path": model_path}

    checkpoint = torch.load(model_path, map_location="cpu")
    return {
        "status": "loaded",
        "model_path": model_path,
        "example_count": checkpoint.get("example_count", 0),
        "trained_at": checkpoint.get("trained_at"),
        "metrics": checkpoint.get("metrics", {}),
    }


def export_summary(data_dir):
    payload = {
        "config_labels": load_config(data_dir).get("labels", []),
        "example_count": len(load_examples(data_dir)),
        "vocab_size": len(load_vocab(data_dir).get("id_to_token", [])),
        "model": load_model_metadata(data_dir),
    }
    return payload


def main():
    parser = argparse.ArgumentParser(description="CLI helpers for the blank-slate trainer.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    train_parser = subparsers.add_parser("train", help="Train the model.")
    train_parser.add_argument("--data-dir", required=True)

    predict_parser = subparsers.add_parser("predict", help="Classify a message.")
    predict_parser.add_argument("--data-dir", required=True)
    predict_parser.add_argument("--text", required=True)

    save_parser = subparsers.add_parser("save", help="Write a blank checkpoint if needed.")
    save_parser.add_argument("--data-dir", required=True)

    load_parser = subparsers.add_parser("load", help="Load checkpoint metadata.")
    load_parser.add_argument("--data-dir", required=True)

    export_parser = subparsers.add_parser("export", help="Show a trainer-side export summary.")
    export_parser.add_argument("--data-dir", required=True)

    args = parser.parse_args()

    if args.command == "train":
        print(json.dumps(train_from_data_dir(args.data_dir)))
        return

    if args.command == "predict":
        print(json.dumps(predict_text(args.data_dir, args.text)))
        return

    if args.command == "save":
        print(json.dumps(ensure_saved_model(args.data_dir)))
        return

    if args.command == "load":
        print(json.dumps(load_model_metadata(args.data_dir)))
        return

    if args.command == "export":
        print(json.dumps(export_summary(args.data_dir)))


if __name__ == "__main__":
    main()

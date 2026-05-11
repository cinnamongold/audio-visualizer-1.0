import torch
import torch.nn as nn


class IntentNet(nn.Module):
    def __init__(self, vocab_size, embedding_size, hidden_size, num_labels, pad_index=0):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_size, padding_idx=pad_index)
        self.encoder = nn.GRU(
            input_size=embedding_size,
            hidden_size=hidden_size,
            batch_first=True,
        )
        self.classifier = nn.Linear(hidden_size, num_labels)

    def forward(self, input_ids):
        embedded = self.embedding(input_ids)
        _output, hidden = self.encoder(embedded)
        logits = self.classifier(hidden[-1])
        return logits


def create_model(vocab_size, num_labels, config):
    training = config.get("training", {})
    return IntentNet(
        vocab_size=vocab_size,
        embedding_size=training.get("embeddingSize", 48),
        hidden_size=training.get("hiddenSize", 64),
        num_labels=num_labels,
        pad_index=0,
    )


def load_checkpoint_into_model(model, state_dict):
    current_state = model.state_dict()
    patched_state = {}

    for key, value in state_dict.items():
        if key not in current_state:
            continue

        target = current_state[key]
        if value.shape == target.shape:
            patched_state[key] = value
            continue

        merged = target.clone()
        if value.dim() == 1 and target.dim() == 1:
            length = min(value.shape[0], target.shape[0])
            merged[:length] = value[:length]
            patched_state[key] = merged
            continue

        if value.dim() == 2 and target.dim() == 2:
            rows = min(value.shape[0], target.shape[0])
            cols = min(value.shape[1], target.shape[1])
            merged[:rows, :cols] = value[:rows, :cols]
            patched_state[key] = merged

    current_state.update(patched_state)
    model.load_state_dict(current_state)
    return model


def checkpoint_device_safe_load(model_path):
    return torch.load(model_path, map_location="cpu")

import json
import os
import re
from collections import Counter

PAD_TOKEN = "<pad>"
UNK_TOKEN = "<unk>"
TOKEN_PATTERN = re.compile(r"[a-z0-9']+")


def read_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, payload):
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def tokenize(text):
    return TOKEN_PATTERN.findall((text or "").lower())


def load_config(data_dir):
    return read_json(os.path.join(data_dir, "config.json"), {})


def load_examples(data_dir):
    payload = read_json(os.path.join(data_dir, "examples.json"), {"items": []})
    return payload.get("items", [])


def load_vocab(data_dir):
    return read_json(
        os.path.join(data_dir, "vocab.json"),
        {
            "token_to_id": {PAD_TOKEN: 0, UNK_TOKEN: 1},
            "id_to_token": [PAD_TOKEN, UNK_TOKEN],
            "updated_at": None,
        },
    )


def save_vocab(data_dir, vocab):
    write_json(os.path.join(data_dir, "vocab.json"), vocab)


def build_label_map(config):
    labels = config.get("labels", [])
    return labels, {label: index for index, label in enumerate(labels)}


def build_vocab(texts, max_size=5000, existing_vocab=None):
    counter = Counter()
    for text in texts:
        counter.update(tokenize(text))

    token_to_id = {PAD_TOKEN: 0, UNK_TOKEN: 1}
    id_to_token = [PAD_TOKEN, UNK_TOKEN]

    if existing_vocab:
        existing_tokens = existing_vocab.get("id_to_token", [])
        for token in existing_tokens[2:]:
            if token not in token_to_id:
                token_to_id[token] = len(id_to_token)
                id_to_token.append(token)

    for token, _count in counter.most_common():
        if token in token_to_id:
            continue
        if len(id_to_token) >= max_size:
            break
        token_to_id[token] = len(id_to_token)
        id_to_token.append(token)

    return {
        "token_to_id": token_to_id,
        "id_to_token": id_to_token,
    }


def encode_text(text, vocab, max_len):
    token_to_id = vocab["token_to_id"]
    tokens = tokenize(text)
    ids = [token_to_id.get(token, token_to_id[UNK_TOKEN]) for token in tokens[:max_len]]

    if len(ids) < max_len:
        ids.extend([token_to_id[PAD_TOKEN]] * (max_len - len(ids)))

    return ids


def known_token_ratio(text, vocab):
    tokens = tokenize(text)
    if not tokens:
        return 0.0
    token_to_id = vocab["token_to_id"]
    known = sum(1 for token in tokens if token in token_to_id)
    return known / max(len(tokens), 1)

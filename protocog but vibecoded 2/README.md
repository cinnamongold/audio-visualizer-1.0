# Blank Slate Bot

Blank Slate Bot is a small hybrid chatbot that learns over time without using an LLM or any external generative API. It combines:

- a Node.js + Express web server,
- a browser chat UI in vanilla HTML/CSS/JS,
- a PyTorch intent classifier,
- persistent JSON memory, vocabulary, examples, and model checkpoints.

The bot starts effectively blank. It stores facts and preferences, logs every turn as training data, and gets better when you retrain it.

## What it does

- Accepts messages in a browser chat UI
- Saves conversation history to disk
- Extracts simple user facts, preferences, and recurring topics
- Converts chat turns into labeled training examples
- Trains a small neural network from scratch with an embedding + GRU + classifier head
- Saves and reloads model checkpoints from `server/data/model.pt`
- Falls back to safe template replies when confidence is low
- Supports retrain, clear memory, export data, import data, and auto-train mode

## Project structure

```txt
.
├── package.json
├── README.md
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── server/
│   ├── data/
│   │   ├── config.json
│   │   ├── examples.json
│   │   ├── memory.json
│   │   ├── sample_seed.json
│   │   └── vocab.json
│   └── index.js
└── trainer/
    ├── cli.py
    ├── infer.py
    ├── model.py
    ├── preprocess.py
    ├── requirements.txt
    └── train.py
```

## Setup

### 1. Install Node dependencies

```bash
npm install
```

### 2. Create a Python virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r trainer/requirements.txt
```

macOS or Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r trainer/requirements.txt
```

### 3. Configure environment variables

Create a `.env` file from `.env.example`.

```txt
PORT=3000
PYTHON_BIN=python
```

If your machine uses `py -3` or another Python launcher, set that as the value for `PYTHON_BIN`.

### 4. Start the app

```bash
npm start
```

Then open `http://localhost:3000`.

## How learning works

1. Every user message is stored in `server/data/memory.json`.
2. The server extracts simple signals such as:
   - name statements like `my name is Sam`
   - preferences like `I like ramen`
   - recurring topics from keywords
   - corrections and positive feedback
3. Each user turn becomes a training example in `server/data/examples.json`.
4. The PyTorch trainer rebuilds or expands the vocabulary in `server/data/vocab.json`.
5. Retraining writes a checkpoint to `server/data/model.pt`.
6. Future chats call `trainer/infer.py` to predict a reply class and confidence score.
7. The server fills a response template with memory and context.

## Data files

- `server/data/memory.json`
  Stores profile data, remembered facts, preferences, topics, recent chat history, and learning logs.
- `server/data/examples.json`
  Stores conversation-derived supervised examples used by the trainer.
- `server/data/vocab.json`
  Stores the tokenizer vocabulary used by the PyTorch model.
- `server/data/config.json`
  Stores labels, response templates, and training settings.
- `server/data/model.pt`
  Saved after training. Not present at the start unless you explicitly create or train a model.

## Optional seed data

The shipped default state is blank so the bot can start learning from scratch.

If you want a tiny starter dataset instead:

1. Launch the app
2. Click `Import Data`
3. Choose `server/data/sample_seed.json`
4. Click `Retrain`

That gives the model a small bootstrap set of labeled examples without changing the default blank-state behavior.

## Scripts

```bash
npm start
npm run train
npm run predict
npm run cli:train
npm run cli:predict
npm run cli:export
```

## Python CLI examples

```bash
python trainer/train.py --data-dir server/data
python trainer/infer.py --data-dir server/data --text "what do you remember about me"
python trainer/cli.py save --data-dir server/data
python trainer/cli.py load --data-dir server/data
python trainer/cli.py export --data-dir server/data
```

## API routes

- `POST /api/chat`
- `POST /api/train`
- `GET /api/memory`
- `POST /api/memory`
- `POST /api/export`
- `POST /api/import`
- `POST /api/settings`

## Notes

- This project does not generate open-ended text with an LLM.
- The neural model learns to classify response styles and reply categories.
- Low-confidence predictions intentionally fall back to safer prompts.
- `Clear Memory` wipes remembered facts and chat history, but keeps saved examples and model weights.
- Export files include memory, examples, vocabulary, config, and the model checkpoint as base64 when available.

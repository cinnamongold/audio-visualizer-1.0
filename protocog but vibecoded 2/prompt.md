# Codex Prompt

You are an expert full-stack engineer and ML engineer. Build a complete runnable app that feels like a conversational system with a blank-slate neural network that gradually learns from the user over time.

## Goal

Create a chatbot system that does **not** use an LLM or external generative AI API. Instead, it should:

- start from a randomly initialized neural network,
- learn from user conversations,
- save and reload its learned state,
- remember user facts,
- choose responses intelligently from learned patterns, templates, and memory.

The end result should feel like a tiny personal bot that slowly becomes more coherent the more the user talks to it.

## Recommended stack

Use:

- **Node.js + Express** for the web server and API
- **Vanilla HTML/CSS/JavaScript** for the browser UI
- **Python + PyTorch** for the learning engine
- **SQLite** or simple JSON files for persistent memory and training data

## Important constraints

- Do **not** use OpenAI, Claude, Gemini, or any external LLM API.
- Do **not** hardcode a giant response tree.
- Do **not** make the bot purely rule-based.
- The system must include a real neural network that starts untrained and improves over time.
- The model must persist to disk and reload on startup.
- The bot should save:
  - learned model weights,
  - vocabulary/token mappings,
  - conversation memory,
  - training examples,
  - user preferences/facts,
  - timestamps of stored memories.

## Desired behavior

The bot should:

- accept user messages through a browser chat UI,
- store every conversation turn,
- extract simple features from messages,
- predict a response category, intent, or reply template,
- optionally rank candidate replies,
- use a fallback response when confidence is low,
- update the model in the background or on a training command,
- improve gradually as more conversations happen.

## Core design

Implement a hybrid architecture:

1. **Memory system**
   - Save user facts like name, preferences, recurring topics, and corrections.
   - Retrieve relevant memories when generating a response.

2. **Training data pipeline**
   - Convert each conversation turn into training examples.
   - Store examples in a dataset file.
   - Support incremental retraining.

3. **Neural model**
   - Build a small PyTorch model, such as:
     - embedding layer,
     - GRU or LSTM encoder,
     - classification head for intent/reply class,
     - optional confidence score output.
   - Initialize from scratch.
   - Train on saved examples.

4. **Response generation**
   - Do not generate free-form LLM text.
   - Instead, use the network to select:
     - response class,
     - template,
     - tone,
     - memory to mention.
   - Fill templates with stored memory or extracted entities.

5. **Persistence**
   - Save model weights to a file such as `model.pt`.
   - Save vocabulary/tokenizer state.
   - Save memories and examples to disk.
   - Load everything automatically when the server starts.

6. **UI**
   - Build a clean chat interface in the browser. DO NOT PRIORITIZE STYLING. I would rather you build an ugly website with good functionality than a beautiful website with mid-tier functionality.
   - Show bot messages, user messages, and maybe a “learning” status.
   - Include buttons for:
     - retrain,
     - clear memory,
     - export data,
     - import data.

## Suggested folder structure

Use this structure or something very close:

```txt
project/
  server/
    index.js
    package.json
    .env.example
    data/
      memory.json
      examples.json
      vocab.json
      model.pt
      config.json
  trainer/
    train.py
    model.py
    preprocess.py
    infer.py
    requirements.txt
  public/
    index.html
    styles.css
    app.js
  README.md
```

## Backend requirements

The Node server should:

- serve the frontend,
- expose API routes like:
  - `POST /api/chat`
  - `POST /api/train`
  - `GET /api/memory`
  - `POST /api/memory`
  - `POST /api/export`
  - `POST /api/import`
- call the Python inference script for bot replies,
- call the Python training script for retraining,
- handle JSON input and output cleanly.

## Python requirements

The Python side should:

- tokenize messages,
- build or load a vocabulary,
- encode text,
- run inference,
- train the model,
- save checkpoints,
- load checkpoints safely,
- expose a CLI interface for:
  - `train`
  - `predict`
  - `save`
  - `load`
  - `export`

## Learning behavior

Make the bot “learn” in a way that feels real:

- store corrections from the user,
- mark certain responses as preferred,
- increase the probability of responses that got positive feedback,
- remember recurring topics,
- improve the reply classifier over time.

## Confidence and fallback logic

If the model is uncertain:

- use a safe template,
- ask a clarifying question,
- retrieve a matching memory,
- or use a minimal neutral response.

## Saving and loading

This part is critical:

- On every training session, persist the updated model.
- On startup, check whether saved files exist.
- If they do, load them.
- If not, create fresh files and initialize a blank model.
- Make sure the bot continues learning across restarts.

## Developer experience

Include:

- clear setup instructions,
- a working `README.md`,
- `npm install` steps,
- Python venv setup,
- example commands to run the server and trainer,
- sample data format examples.

## Code quality requirements

- Write complete code, not pseudocode.
- Make it runnable.
- Keep it simple enough for someone unfamiliar to learn it quickly.
- Use comments only where they help clarity.
- Avoid unnecessary abstraction.
- Prefer explicit code over clever code.

## Deliverables

Generate:

- all source files,
- package manifests,
- Python requirements,
- README,
- sample seed data,
- a working browser UI,
- a functioning learning pipeline,
- persistent model saving/loading.

## Extra polish

If possible, add:

- a “training mode” button in the UI,
- a memory viewer,
- a small confidence meter,
- a log of what the model learned most recently.

Now generate the entire project file-by-file with full code.
const fs = require("fs");
const path = require("path");
const express = require("express");
const { spawn } = require("child_process");
const { randomUUID } = require("crypto");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const TRAINER_DIR = path.join(ROOT_DIR, "trainer");
const MODEL_PATH = path.join(DATA_DIR, "model.pt");

const DATA_FILES = {
  memory: path.join(DATA_DIR, "memory.json"),
  examples: path.join(DATA_DIR, "examples.json"),
  vocab: path.join(DATA_DIR, "vocab.json"),
  config: path.join(DATA_DIR, "config.json"),
};

const DEFAULT_MEMORY = {
  profile: {
    name: null,
  },
  facts: [],
  preferences: [],
  topics: {},
  conversation: [],
  recent_learning: [],
  settings: {
    autoTrain: false,
  },
  stats: {
    total_messages: 0,
    total_trains: 0,
    new_examples_since_train: 0,
    last_train_at: null,
    last_train_result: null,
  },
  last_example_id: null,
  last_bot_label: null,
  last_template_key: null,
  user_style: {
    greeting_patterns: [],
    sentence_lengths: [],
    common_words: {},
    formality_score: 0.5,
    exclamation_use: 0,
  },
};

const DEFAULT_EXAMPLES = {
  version: 1,
  items: [],
};

const DEFAULT_VOCAB = {
  token_to_id: {
    "<pad>": 0,
    "<unk>": 1,
  },
  id_to_token: ["<pad>", "<unk>"],
  updated_at: null,
};

const STOPWORDS = new Set([
  "about",
  "again",
  "also",
  "am",
  "and",
  "are",
  "been",
  "but",
  "can",
  "could",
  "did",
  "do",
  "for",
  "from",
  "have",
  "here",
  "how",
  "i",
  "im",
  "i'm",
  "into",
  "its",
  "just",
  "like",
  "more",
  "really",
  "that",
  "the",
  "them",
  "they",
  "this",
  "was",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "would",
  "you",
  "your",
]);

let trainingPromise = null;

app.use(express.json({ limit: "10mb" }));
app.use(express.static(PUBLIC_DIR));

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return deepClone(fallback);
  }
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function ensureJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    writeJson(filePath, fallback);
  }
}

function mergeMemory(memory) {
  return {
    ...deepClone(DEFAULT_MEMORY),
    ...memory,
    profile: {
      ...DEFAULT_MEMORY.profile,
      ...(memory.profile || {}),
    },
    facts: Array.isArray(memory.facts) ? memory.facts : [],
    preferences: Array.isArray(memory.preferences) ? memory.preferences : [],
    topics: memory.topics && typeof memory.topics === "object" ? memory.topics : {},
    conversation: Array.isArray(memory.conversation) ? memory.conversation : [],
    recent_learning: Array.isArray(memory.recent_learning) ? memory.recent_learning : [],
    settings: {
      ...DEFAULT_MEMORY.settings,
      ...(memory.settings || {}),
    },
    stats: {
      ...DEFAULT_MEMORY.stats,
      ...(memory.stats || {}),
    },
  };
}

function loadMemory() {
  return mergeMemory(readJson(DATA_FILES.memory, DEFAULT_MEMORY));
}

function saveMemory(memory) {
  writeJson(DATA_FILES.memory, mergeMemory(memory));
}

function loadExamples() {
  const payload = readJson(DATA_FILES.examples, DEFAULT_EXAMPLES);
  return {
    version: payload.version || 1,
    items: Array.isArray(payload.items) ? payload.items : [],
  };
}

function saveExamples(examples) {
  writeJson(DATA_FILES.examples, {
    version: examples.version || 1,
    items: Array.isArray(examples.items) ? examples.items : [],
  });
}

function loadConfig() {
  return readJson(DATA_FILES.config, {});
}

function loadVocab() {
  return readJson(DATA_FILES.vocab, DEFAULT_VOCAB);
}

function bootstrapStorage() {
  ensureDir(DATA_DIR);
  ensureJsonFile(DATA_FILES.memory, DEFAULT_MEMORY);
  ensureJsonFile(DATA_FILES.examples, DEFAULT_EXAMPLES);
  ensureJsonFile(DATA_FILES.vocab, DEFAULT_VOCAB);
}

function appendLearning(memory, type, summary) {
  memory.recent_learning.unshift({
    at: nowIso(),
    type,
    summary,
  });
  memory.recent_learning = memory.recent_learning.slice(0, 20);
}

function appendConversationTurn(memory, turn) {
  memory.conversation.push(turn);
  memory.conversation = memory.conversation.slice(-160);
}

function normalizeSpace(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function titleCase(value) {
  return normalizeSpace(value)
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function tokenize(message) {
  return (message.toLowerCase().match(/[a-z0-9']+/g) || []).filter(Boolean);
}

function extractTopics(message) {
  const seen = new Set();
  return tokenize(message)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token))
    .filter((token) => {
      if (seen.has(token)) {
        return false;
      }
      seen.add(token);
      return true;
    })
    .slice(0, 3);
}

function extractSignals(message) {
  const raw = normalizeSpace(message);
  const lower = raw.toLowerCase();
  const preferences = [];
  const facts = [];
  const topics = extractTopics(raw);

  const nameMatch =
    raw.match(/\b(?:my name is|call me|i'm called)\s+([a-z][a-z0-9' -]{1,30})/i) || null;
  const name = nameMatch ? titleCase(nameMatch[1]) : null;

  const favoriteMatch = raw.match(/\bmy favorite ([a-z ]{2,20}) is ([^.!?]{1,60})/i);
  if (favoriteMatch) {
    preferences.push({
      kind: "favorite",
      subject: normalizeSpace(favoriteMatch[1].toLowerCase()),
      value: normalizeSpace(favoriteMatch[2]),
    });
  }

  const likeMatch = raw.match(/\b(?:i like|i love|i enjoy)\s+([^.!?]{1,60})/i);
  if (likeMatch) {
    preferences.push({
      kind: "like",
      subject: null,
      value: normalizeSpace(likeMatch[1]),
    });
  }

  const dislikeMatch = raw.match(/\b(?:i don't like|i dislike|i hate)\s+([^.!?]{1,60})/i);
  if (dislikeMatch) {
    preferences.push({
      kind: "dislike",
      subject: null,
      value: normalizeSpace(dislikeMatch[1]),
    });
  }

  const identityMatch = raw.match(/\b(?:i am|i'm)\s+([^.!?]{2,70})/i);
  if (identityMatch && !name) {
    facts.push(`you are ${normalizeSpace(identityMatch[1])}`);
  }

  const workMatch = raw.match(/\b(?:i am|i'm|i've been)\s+(?:working on|building|making)\s+([^.!?]{2,70})/i);
  if (workMatch) {
    facts.push(`you are working on ${normalizeSpace(workMatch[1])}`);
  }

  const positiveFeedback = /\b(yes|yep|correct|exactly|nice|good job|that works|that's right)\b/i.test(
    lower,
  );
  const negativeFeedback = /\b(no|nope|wrong|not quite|that's not right|actually|instead)\b/i.test(
    lower,
  );

  return {
    raw,
    lower,
    name,
    preferences,
    facts,
    topics,
    positiveFeedback,
    negativeFeedback,
  };
}

function inferHeuristicLabel(message, signals) {
  const lower = signals.lower;
  const trimmed = normalizeSpace(message);

  if (/\b(hi|hello|hey|yo)\b/i.test(lower)) {
    return "greeting";
  }
  if (/\b(bye|goodbye|see you|later)\b/i.test(lower)) {
    return "farewell";
  }
  if (/\b(thanks|thank you|appreciate it)\b/i.test(lower)) {
    return "gratitude";
  }
  if (/\b(what do you remember|remember about me|what do you know about me|who am i to you)\b/i.test(lower)) {
    return "memory_query";
  }
  if (/\b(what do i like|what's my favorite|what is my favorite|what do you know i like)\b/i.test(lower)) {
    return "preference_query";
  }
  if (signals.negativeFeedback) {
    return "correction";
  }
  if (signals.name) {
    return "self_intro";
  }
  if (signals.preferences.length) {
    return "preference_share";
  }
  if (signals.facts.length) {
    return "fact_share";
  }
  if (/\?$/.test(trimmed) || /^(who|what|when|where|why|how|can|could|would|do|does|did|is|are)\b/i.test(lower)) {
    return "question";
  }
  if (signals.topics.length) {
    return "topic_followup";
  }
  return "fallback";
}

function rememberFact(memory, fact) {
  const normalized = normalizeSpace(fact).toLowerCase();
  const exists = memory.facts.some((entry) => normalizeSpace(entry.text).toLowerCase() === normalized);
  if (exists) {
    return false;
  }

  memory.facts.push({
    id: randomUUID(),
    text: normalizeSpace(fact),
    at: nowIso(),
  });
  memory.facts = memory.facts.slice(-25);
  return true;
}

function rememberPreference(memory, preference) {
  const key = [
    preference.kind || "",
    preference.subject || "",
    normalizeSpace(preference.value).toLowerCase(),
  ].join("|");

  const index = memory.preferences.findIndex((entry) => {
    const entryKey = [
      entry.kind || "",
      entry.subject || "",
      normalizeSpace(entry.value || "").toLowerCase(),
    ].join("|");
    return entryKey === key;
  });

  const payload = {
    id: index >= 0 ? memory.preferences[index].id : randomUUID(),
    kind: preference.kind,
    subject: preference.subject || null,
    value: normalizeSpace(preference.value),
    at: nowIso(),
  };

  if (index >= 0) {
    memory.preferences.splice(index, 1);
  }
  memory.preferences.push(payload);
  memory.preferences = memory.preferences.slice(-25);
}

function learnUserStyle(memory, message) {
  if (!memory.user_style) {
    memory.user_style = {
      greeting_patterns: [],
      sentence_lengths: [],
      common_words: {},
      formality_score: 0.5,
      exclamation_use: 0,
    };
  }

  const style = memory.user_style;

  // Track greeting patterns
  const lower = message.toLowerCase();
  const greetingMatch = lower.match(/^(hey|hi|hello|yo|oh|uh|ah|hiya|hey there)/);
  if (greetingMatch) {
    style.greeting_patterns.push(greetingMatch[1]);
    if (style.greeting_patterns.length > 10) {
      style.greeting_patterns.shift();
    }
  }

  // Track sentence length
  const sentences = message.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  sentences.forEach((sent) => {
    const wordCount = sent.trim().split(/\s+/).length;
    style.sentence_lengths.push(wordCount);
    if (style.sentence_lengths.length > 50) {
      style.sentence_lengths.shift();
    }
  });

  // Track common words (excluding stopwords)
  const words = message.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
  words.forEach((word) => {
    if (!STOPWORDS.has(word)) {
      style.common_words[word] = (style.common_words[word] || 0) + 1;
    }
  });

  // Track exclamation usage
  const exclamationCount = (message.match(/!/g) || []).length;
  style.exclamation_use = (style.exclamation_use * 0.9) + (exclamationCount > 0 ? 0.1 : 0);

  // Track formality (simple heuristic: longer words, less slang)
  const slangPatterns = /\b(like|just|so|basically|actually|pretty|kind of|sort of)\b/i;
  const formalPatterns = /\b(therefore|however|consequently|regarding|concerning)\b/i;
  const slangCount = (message.match(slangPatterns) || []).length;
  const formalCount = (message.match(formalPatterns) || []).length;
  const adjustedFormality = (slangCount - formalCount) / Math.max(1, words.length);
  style.formality_score = Math.max(0, Math.min(1, 0.5 - adjustedFormality * 0.5));
}

function getUserStyleResponse(memory, label) {
  if (!memory.user_style || memory.stats.total_messages < 5) {
    return null;
  }

  const style = memory.user_style;
  const avgLength =
    style.sentence_lengths.length > 0
      ? style.sentence_lengths.reduce((a, b) => a + b, 0) / style.sentence_lengths.length
      : 10;

  // Get most common greeting pattern
  let greetingPrefix = "";
  if (style.greeting_patterns.length > 0) {
    const freq = {};
    style.greeting_patterns.forEach((g) => {
      freq[g] = (freq[g] || 0) + 1;
    });
    const common = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    if (common && common[1] >= 2) {
      greetingPrefix = common[0] + " ";
    }
  }

  // Get top words for personalization
  const topWords = Object.entries(style.common_words)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);

  return {
    avgLength: Math.round(avgLength),
    greetingPrefix,
    topWords,
    usesExclamations: style.exclamation_use > 0.3,
    isCasual: style.formality_score < 0.4,
    isFormal: style.formality_score > 0.6,
  };
}

function applyUserStyleToResponse(reply, memory, label) {
  const userStyle = getUserStyleResponse(memory, label);
  if (!userStyle) {
    return reply;
  }

  // Adjust response length based on user's average sentence length
  const words = reply.split(/\s+/);
  const currentLength = words.length;

  if (userStyle.isCasual && currentLength > 15) {
    // Shorten responses for casual users
    const shortened = words.slice(0, Math.max(8, Math.round(currentLength * 0.6))).join(" ");
    if (shortened.length > 10) {
      reply = shortened + (reply.endsWith("?") ? "?" : ".");
    }
  } else if (userStyle.isFormal && currentLength < 10) {
    // Add a bit more detail for formal users
    const additions = {
      greeting: "Good to connect.",
      fallback: "Let me think about that.",
      question: "That's an interesting one.",
    };
    if (additions[label]) {
      reply = `${reply} ${additions[label]}`;
    }
  }

  // Add exclamation for users who use them frequently
  if (userStyle.usesExclamations && !reply.includes("!") && label !== "fallback") {
    reply = reply.replace(/([.?])$/, "!$1");
  }

  // Personalize with user's common words occasionally
  if (userStyle.topWords.length > 0 && Math.random() < 0.2) {
    const word = userStyle.topWords[Math.floor(Math.random() * userStyle.topWords.length)];
    if (word.length > 3 && !reply.toLowerCase().includes(word)) {
      reply = reply.replace(/(\w+)$/, `$1, ${word}`);
    }
  }

  return reply;
}

function formatPreference(preference) {
  if (!preference) {
    return "";
  }
  if (preference.kind === "favorite" && preference.subject) {
    return `your favorite ${preference.subject} is ${preference.value}`;
  }
  if (preference.kind === "dislike") {
    return `you dislike ${preference.value}`;
  }
  return `you like ${preference.value}`;
}

function getLatestPreference(memory) {
  const latest = memory.preferences[memory.preferences.length - 1];
  return latest ? formatPreference(latest) : null;
}

function getLatestFact(memory) {
  const latest = memory.facts[memory.facts.length - 1];
  return latest ? latest.text : null;
}

function getTopTopic(memory) {
  const entries = Object.entries(memory.topics || {}).sort((left, right) => right[1] - left[1]);
  return entries.length ? entries[0][0] : null;
}

function applySignalsToMemory(memory, signals) {
  if (signals.name && signals.name !== memory.profile.name) {
    memory.profile.name = signals.name;
    appendLearning(memory, "memory", `Stored name: ${signals.name}.`);
  }

  signals.facts.forEach((fact) => {
    if (rememberFact(memory, fact)) {
      appendLearning(memory, "memory", `Stored fact: ${fact}.`);
    }
  });

  signals.preferences.forEach((preference) => {
    rememberPreference(memory, preference);
    appendLearning(memory, "memory", `Stored preference: ${formatPreference(preference)}.`);
  });

  signals.topics.forEach((topic) => {
    memory.topics[topic] = (memory.topics[topic] || 0) + 1;
  });
}

function findExampleById(examples, exampleId) {
  for (let index = examples.items.length - 1; index >= 0; index -= 1) {
    if (examples.items[index].id === exampleId) {
      return examples.items[index];
    }
  }
  return null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function applyFeedbackToPreviousExample(examples, memory, signals) {
  if (!memory.last_example_id) {
    return null;
  }

  const target = findExampleById(examples, memory.last_example_id);
  if (!target) {
    return null;
  }

  if (signals.positiveFeedback) {
    target.weight = clamp(Number(target.weight || 1) + 0.35, 0.1, 3);
    target.preferred = true;
    return `Boosted the previous example after positive feedback.`;
  }

  if (signals.negativeFeedback) {
    target.weight = clamp(Number(target.weight || 1) - 0.35, 0.1, 3);
    return `Reduced confidence in the previous example after a correction.`;
  }

  return null;
}

function findRelevantMemories(message, memory) {
  const queryTokens = new Set(extractTopics(message));
  const candidates = [];

  if (memory.profile.name) {
    candidates.push({
      text: `your name is ${memory.profile.name}`,
      tokens: new Set(tokenize(memory.profile.name)),
      bonus: 0.5,
    });
  }

  memory.facts.forEach((fact) => {
    candidates.push({
      text: fact.text,
      tokens: new Set(tokenize(fact.text)),
      bonus: 0.1,
    });
  });

  memory.preferences.forEach((preference) => {
    const text = formatPreference(preference);
    candidates.push({
      text,
      tokens: new Set(tokenize(text)),
      bonus: 0.15,
    });
  });

  Object.entries(memory.topics || {}).forEach(([topic, score]) => {
    candidates.push({
      text: `you mention ${topic} a lot`,
      tokens: new Set([topic]),
      bonus: Math.min(score / 10, 0.3),
    });
  });

  const ranked = candidates
    .map((candidate) => {
      let overlap = 0;
      queryTokens.forEach((token) => {
        if (candidate.tokens.has(token)) {
          overlap += 1;
        }
      });
      return {
        ...candidate,
        score: overlap + candidate.bonus,
      };
    })
    .sort((left, right) => right.score - left.score);

  const best = ranked.filter((candidate) => candidate.score > 0);
  const pool = best.length ? best : ranked;
  return pool.slice(0, 3).map((candidate) => candidate.text);
}

function buildMemorySummary(memory) {
  const parts = [];
  if (memory.profile.name) {
    parts.push(`your name is ${memory.profile.name}`);
  }
  const preference = getLatestPreference(memory);
  if (preference) {
    parts.push(preference);
  }
  const fact = getLatestFact(memory);
  if (fact) {
    parts.push(fact);
  }
  const topic = getTopTopic(memory);
  if (topic) {
    parts.push(`you often talk about ${topic}`);
  }
  return parts.length ? parts.join("; ") : "I only have a tiny amount of memory so far.";
}

function buildTemplateContext(memory, signals, relevantMemories) {
  const latestSignalPreference = signals.preferences[signals.preferences.length - 1];
  const latestPreference = latestSignalPreference
    ? formatPreference(latestSignalPreference)
    : getLatestPreference(memory);
  const latestFact = signals.facts[signals.facts.length - 1] || getLatestFact(memory);

  return {
    name: memory.profile.name || "there",
    fact: latestFact || "you shared something new",
    preference: latestPreference ? latestPreference.replace(/^you /, "") : "have a few preferences",
    preference_memory: latestPreference || "I have not learned your preferences yet",
    topic: signals.topics[0] || getTopTopic(memory) || "this",
    memory: relevantMemories[0] || buildMemorySummary(memory),
  };
}

function renderTemplate(template, context) {
  return template.replace(/\{([a-z_]+)\}/gi, (_match, key) => context[key] || "");
}

function pickTemplate(label, config, memory) {
  const templates =
    (config.templates && config.templates[label]) ||
    (config.templates && config.templates.fallback) ||
    ["I'm still learning how to respond to that."];

  let index = memory.conversation.length % templates.length;
  let key = `${label}:${index}`;
  if (key === memory.last_template_key && templates.length > 1) {
    index = (index + 1) % templates.length;
    key = `${label}:${index}`;
  }

  return {
    key,
    template: templates[index],
  };
}

function maybeAppendMemory(response, label, config, memory, relevantMemories) {
  if (!relevantMemories.length) {
    return response;
  }

  if (["memory_query", "preference_query", "self_intro", "fact_share"].includes(label)) {
    return response;
  }

  const templates = config.memory_templates || [];
  if (!templates.length) {
    return response;
  }

  const index = memory.recent_learning.length % templates.length;
  const snippet = renderTemplate(templates[index], { memory: relevantMemories[0] });
  return `${response} ${snippet}`;
}

function selectLabel({ prediction, heuristicLabel, memory, config, relevantMemories, signals }) {
  if (!prediction || !prediction.trained) {
    return heuristicLabel !== "fallback" ? heuristicLabel : "fallback";
  }

  const threshold = config.training?.confidenceThreshold || 0.52;
  const candidates = new Set(["fallback"]);
  candidates.add(heuristicLabel);
  if (prediction.label) {
    candidates.add(prediction.label);
  }

  let bestLabel = "fallback";
  let bestScore = 0.05;

  candidates.forEach((label) => {
    let score = label === "fallback" ? 0.05 : 0;
    if (prediction.label === label) {
      score += Number(prediction.confidence || 0);
    }
    if (heuristicLabel === label) {
      score += 0.34;
    }
    if (label === "memory_query" && relevantMemories.length) {
      score += 0.12;
    }
    if (label === "preference_query" && getLatestPreference(memory)) {
      score += 0.12;
    }
    if (label === "correction" && signals.negativeFeedback) {
      score += 0.12;
    }
    if (label === "question" && /\?$/.test(signals.raw)) {
      score += 0.08;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLabel = label;
    }
  });

  if (prediction.confidence < threshold && heuristicLabel === "fallback") {
    return "fallback";
  }

  return bestLabel;
}

function createExample(message, label, prediction, heuristicLabel) {
  const confidenceBoost = prediction && prediction.confidence > 0.68 ? 0.12 : 0;
  const heuristicBoost = heuristicLabel === label ? 0.08 : 0;
  return {
    id: randomUUID(),
    text: normalizeSpace(message),
    label,
    weight: clamp(1 + confidenceBoost + heuristicBoost, 0.1, 3),
    preferred: Boolean(prediction && prediction.confidence > 0.72),
    source: "conversation",
    created_at: nowIso(),
    metadata: {
      heuristicLabel,
      predictedLabel: prediction?.label || null,
      predictedConfidence: prediction?.confidence || 0,
      trained: Boolean(prediction?.trained),
    },
  };
}

function buildSnapshot() {
  const memory = loadMemory();
  const examples = loadExamples();
  const vocab = loadVocab();
  return {
    memory,
    meta: {
      exampleCount: examples.items.length,
      vocabSize: Array.isArray(vocab.id_to_token) ? vocab.id_to_token.length : 0,
      modelExists: fs.existsSync(MODEL_PATH),
      trainingInProgress: Boolean(trainingPromise),
    },
  };
}

function parseJsonOutput(stdout) {
  const trimmed = (stdout || "").trim();
  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      try {
        return JSON.parse(lines[index]);
      } catch (_lineError) {
        continue;
      }
    }
  }

  throw new Error("Python script returned unreadable JSON.");
}

function getPythonCommandParts() {
  return (process.env.PYTHON_BIN || "python").split(/\s+/).filter(Boolean);
}

function runPythonScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(TRAINER_DIR, scriptName);
    const commandParts = getPythonCommandParts();
    const command = commandParts[0];
    const commandArgs = [...commandParts.slice(1), scriptPath, ...args];

    const child = spawn(command, commandArgs, {
      cwd: ROOT_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Python script exited with code ${code}.`));
        return;
      }

      try {
        resolve(parseJsonOutput(stdout));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function queueTraining(reason) {
  if (trainingPromise) {
    return trainingPromise;
  }

  trainingPromise = runPythonScript("train.py", ["--data-dir", DATA_DIR])
    .then((result) => {
      const memory = loadMemory();
      memory.stats.total_trains += result.trained ? 1 : 0;
      memory.stats.new_examples_since_train = 0;
      memory.stats.last_train_at = result.trained_at || nowIso();
      memory.stats.last_train_result = result;
      appendLearning(
        memory,
        "training",
        result.status === "trained"
          ? `Training finished from ${reason} mode with ${result.example_count} examples.`
          : `Saved a blank model checkpoint because there were no examples yet.`,
      );
      saveMemory(memory);
      return result;
    })
    .catch((error) => {
      const memory = loadMemory();
      memory.stats.last_train_result = {
        status: "error",
        error: error.message,
        at: nowIso(),
      };
      appendLearning(memory, "training", `Training failed: ${error.message}`);
      saveMemory(memory);
      throw error;
    })
    .finally(() => {
      trainingPromise = null;
    });

  return trainingPromise;
}

app.get("/api/memory", (_req, res) => {
  res.json(buildSnapshot());
});

app.post("/api/memory", (req, res) => {
  let memory = loadMemory();
  const examples = loadExamples();

  if (req.body && req.body.reset) {
    memory = deepClone(DEFAULT_MEMORY);
    appendLearning(memory, "memory", "Memory cleared. Training examples and model weights were kept.");
    saveMemory(memory);
    res.json({
      memory,
      meta: {
        exampleCount: examples.items.length,
        modelExists: fs.existsSync(MODEL_PATH),
        trainingInProgress: Boolean(trainingPromise),
      },
    });
    return;
  }

  if (typeof req.body.autoTrain === "boolean") {
    memory.settings.autoTrain = req.body.autoTrain;
    appendLearning(
      memory,
      "settings",
      `Auto-train ${req.body.autoTrain ? "enabled" : "disabled"}.`,
    );
  }

  if (req.body.name) {
    memory.profile.name = titleCase(req.body.name);
  }

  if (req.body.fact) {
    rememberFact(memory, normalizeSpace(req.body.fact));
  }

  if (req.body.preference) {
    rememberPreference(memory, {
      kind: "like",
      subject: null,
      value: normalizeSpace(req.body.preference),
    });
  }

  saveMemory(memory);
  res.json(buildSnapshot());
});

app.post("/api/settings", (req, res) => {
  const memory = loadMemory();
  memory.settings.autoTrain = Boolean(req.body.autoTrain);
  appendLearning(
    memory,
    "settings",
    `Auto-train ${memory.settings.autoTrain ? "enabled" : "disabled"}.`,
  );
  saveMemory(memory);
  res.json(buildSnapshot());
});

app.post("/api/chat", async (req, res) => {
  const message = normalizeSpace(req.body?.message || "");
  if (!message) {
    res.status(400).json({ error: "A message is required." });
    return;
  }

  const memory = loadMemory();
  const examples = loadExamples();
  const config = loadConfig();
  const signals = extractSignals(message);
  const heuristicLabel = inferHeuristicLabel(message, signals);

  const feedbackNote = applyFeedbackToPreviousExample(examples, memory, signals);
  if (feedbackNote) {
    appendLearning(memory, "feedback", feedbackNote);
  }

  memory.stats.total_messages += 1;
  appendConversationTurn(memory, {
    role: "user",
    text: message,
    at: nowIso(),
  });

  applySignalsToMemory(memory, signals);
  learnUserStyle(memory, message);
  const relevantMemories = findRelevantMemories(message, memory);

  let prediction = {
    trained: false,
    label: "fallback",
    confidence: 0,
    top_predictions: [],
  };

  try {
    prediction = await runPythonScript("infer.py", ["--data-dir", DATA_DIR, "--text", message]);
  } catch (error) {
    appendLearning(memory, "inference", `Used fallback because inference failed: ${error.message}`);
  }

  const label = selectLabel({
    prediction,
    heuristicLabel,
    memory,
    config,
    relevantMemories,
    signals,
  });

  const context = buildTemplateContext(memory, signals, relevantMemories);
  const picked = pickTemplate(label, config, memory);
  let reply = renderTemplate(picked.template, context);
  reply = applyUserStyleToResponse(reply, memory, label);
  reply = maybeAppendMemory(reply, label, config, memory, relevantMemories);

  const example = createExample(message, label, prediction, heuristicLabel);
  examples.items.push(example);
  memory.last_example_id = example.id;
  memory.last_bot_label = label;
  memory.last_template_key = picked.key;

  appendConversationTurn(memory, {
    role: "bot",
    text: reply,
    at: nowIso(),
    label,
    confidence: prediction.confidence || 0,
  });

  memory.stats.new_examples_since_train += 1;
  saveExamples(examples);
  saveMemory(memory);

  let trainingQueued = false;
  const autoTrainThreshold = config.training?.autoTrainThreshold || 6;
  if (memory.settings.autoTrain && memory.stats.new_examples_since_train >= autoTrainThreshold) {
    trainingQueued = true;
    appendLearning(
      memory,
      "training",
      `Queued background training after ${memory.stats.new_examples_since_train} new examples.`,
    );
    saveMemory(memory);
    queueTraining("auto").catch(() => {});
  }

  res.json({
    reply,
    label,
    confidence: prediction.confidence || 0,
    trained: Boolean(prediction.trained),
    heuristicLabel,
    relevantMemories,
    topPredictions: prediction.top_predictions || [],
    usedFallback: label === "fallback" || !prediction.trained,
    trainingQueued,
    memoryPreview: buildMemorySummary(memory),
  });
});

app.post("/api/train", async (_req, res) => {
  try {
    const result = await queueTraining("manual");
    res.json({
      ok: true,
      result,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.post("/api/export", (_req, res) => {
  const payload = {
    exported_at: nowIso(),
    files: {
      memory: loadMemory(),
      examples: loadExamples(),
      vocab: loadVocab(),
      config: loadConfig(),
      model_base64: fs.existsSync(MODEL_PATH) ? fs.readFileSync(MODEL_PATH).toString("base64") : null,
    },
  };
  res.json(payload);
});

app.post("/api/import", (req, res) => {
  const payload = req.body?.payload || req.body;
  if (!payload || !payload.files) {
    res.status(400).json({ error: "Import payload must contain a files object." });
    return;
  }

  const importedMemory = mergeMemory(payload.files.memory || DEFAULT_MEMORY);
  const importedExamples = payload.files.examples || DEFAULT_EXAMPLES;
  const importedVocab = payload.files.vocab || DEFAULT_VOCAB;
  const importedConfig = payload.files.config || loadConfig();

  writeJson(DATA_FILES.memory, importedMemory);
  writeJson(DATA_FILES.examples, {
    version: importedExamples.version || 1,
    items: Array.isArray(importedExamples.items) ? importedExamples.items : [],
  });
  writeJson(DATA_FILES.vocab, importedVocab);
  writeJson(DATA_FILES.config, importedConfig);

  if (typeof payload.files.model_base64 === "string" && payload.files.model_base64.trim()) {
    fs.writeFileSync(MODEL_PATH, Buffer.from(payload.files.model_base64, "base64"));
  } else if (payload.files.model_base64 === null && fs.existsSync(MODEL_PATH)) {
    fs.unlinkSync(MODEL_PATH);
  }

  const memory = loadMemory();
  appendLearning(
    memory,
    "import",
    `Imported dataset with ${loadExamples().items.length} examples.`,
  );
  saveMemory(memory);

  res.json(buildSnapshot());
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

bootstrapStorage();

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Blank Slate Bot listening on http://localhost:${port}`);
});

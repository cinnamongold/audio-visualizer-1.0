const state = {
  snapshot: null,
  busy: false,
};

const elements = {
  messages: document.getElementById("messages"),
  chatForm: document.getElementById("chat-form"),
  messageInput: document.getElementById("message-input"),
  sendButton: document.getElementById("send-button"),
  retrainButton: document.getElementById("retrain-button"),
  clearMemoryButton: document.getElementById("clear-memory-button"),
  exportButton: document.getElementById("export-button"),
  importInput: document.getElementById("import-input"),
  autoTrainToggle: document.getElementById("auto-train-toggle"),
  trainingStatus: document.getElementById("training-status"),
  confidenceFill: document.getElementById("confidence-fill"),
  confidenceLabel: document.getElementById("confidence-label"),
  memorySummary: document.getElementById("memory-summary"),
  datasetStats: document.getElementById("dataset-stats"),
  lastTrain: document.getElementById("last-train"),
  learningLog: document.getElementById("learning-log"),
  // Settings elements
  darkModeToggle: document.getElementById("dark-mode-toggle"),
  fontSelect: document.getElementById("font-select"),
  googleFontInput: document.getElementById("google-font-input"),
  colorBgTop: document.getElementById("color-bg-top"),
  colorBgBottom: document.getElementById("color-bg-bottom"),
  colorAccent: document.getElementById("color-accent"),
  colorText: document.getElementById("color-text"),
};

function setBusy(isBusy) {
  state.busy = isBusy;
  elements.sendButton.disabled = isBusy;
  elements.retrainButton.disabled = isBusy;
  elements.clearMemoryButton.disabled = isBusy;
  elements.exportButton.disabled = isBusy;
  elements.autoTrainToggle.disabled = isBusy;
}

function setStatus(text) {
  elements.trainingStatus.textContent = text;
}

function setConfidence(confidence, label) {
  const percent = Math.max(0, Math.min(100, Math.round((confidence || 0) * 100)));
  elements.confidenceFill.style.width = `${percent}%`;
  elements.confidenceLabel.textContent = label ? `${percent}% · ${label}` : `${percent}%`;
}

function formatDate(value) {
  if (!value) {
    return "Never";
  }
  return new Date(value).toLocaleString();
}

function createMessage(turn) {
  const article = document.createElement("article");
  article.className = `message ${turn.role}`;

  const head = document.createElement("div");
  head.className = "message-head";

  const role = document.createElement("span");
  role.textContent = turn.role === "user" ? "You" : turn.role === "bot" ? "Bot" : "System";

  const meta = document.createElement("span");
  if (turn.role === "bot" && typeof turn.confidence === "number") {
    meta.textContent = `${turn.label || "reply"} · ${Math.round(turn.confidence * 100)}%`;
  } else {
    meta.textContent = formatDate(turn.at);
  }

  const body = document.createElement("div");
  body.className = "message-body";
  body.textContent = turn.text;

  head.append(role, meta);
  article.append(head, body);
  return article;
}

function showTypingIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  indicator.id = "typing-indicator";
  indicator.innerHTML = "<span></span><span></span><span></span>";
  elements.messages.append(indicator);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  if (indicator) {
    indicator.remove();
  }
}

function renderMessages(conversation) {
  elements.messages.innerHTML = "";
  if (!conversation.length) {
    elements.messages.append(
      createMessage({
        role: "system",
        text: "No chat history yet. Start with a greeting, a personal fact, or a preference.",
        at: new Date().toISOString(),
      }),
    );
    return;
  }

  conversation.forEach((turn) => {
    elements.messages.append(createMessage(turn));
  });
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function buildList(items, formatter) {
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "small-copy";
    p.textContent = "Nothing saved yet.";
    return p;
  }

  const list = document.createElement("ul");
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = formatter(item);
    list.append(li);
  });
  return list;
}

function renderMemory(memory) {
  const topTopics = Object.entries(memory.topics || {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);

  elements.memorySummary.innerHTML = "";

  const profileBlock = document.createElement("section");
  profileBlock.className = "memory-block";
  profileBlock.innerHTML = `<h3>Profile</h3><p>${memory.profile.name ? `Name: ${memory.profile.name}` : "Name not learned yet."}</p>`;

  const factsBlock = document.createElement("section");
  factsBlock.className = "memory-block";
  factsBlock.innerHTML = "<h3>Facts</h3>";
  factsBlock.append(
    buildList(
      (memory.facts || []).slice(-4).reverse(),
      (item) => item.text,
    ),
  );

  const preferenceBlock = document.createElement("section");
  preferenceBlock.className = "memory-block";
  preferenceBlock.innerHTML = "<h3>Preferences</h3>";
  preferenceBlock.append(
    buildList(
      (memory.preferences || []).slice(-4).reverse(),
      (item) => {
        if (item.kind === "favorite" && item.subject) {
          return `Favorite ${item.subject}: ${item.value}`;
        }
        if (item.kind === "dislike") {
          return `Dislikes ${item.value}`;
        }
        return `Likes ${item.value}`;
      },
    ),
  );

  const topicBlock = document.createElement("section");
  topicBlock.className = "memory-block";
  topicBlock.innerHTML = "<h3>Topics</h3>";
  topicBlock.append(
    buildList(topTopics, ([topic, count]) => `${topic} (${count})`),
  );

  elements.memorySummary.append(profileBlock, factsBlock, preferenceBlock, topicBlock);
}

function renderLearning(memory) {
  elements.learningLog.innerHTML = "";
  const log = memory.recent_learning || [];

  if (!log.length) {
    const p = document.createElement("p");
    p.className = "small-copy";
    p.textContent = "The bot has not logged any new learning events yet.";
    elements.learningLog.append(p);
    return;
  }

  log.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "learning-item";

    const time = document.createElement("time");
    time.textContent = `${entry.type || "update"} · ${formatDate(entry.at)}`;

    const text = document.createElement("p");
    text.textContent = entry.summary;

    item.append(time, text);
    elements.learningLog.append(item);
  });
}

function renderSnapshot(snapshot) {
  state.snapshot = snapshot;
  const { memory, meta } = snapshot;

  renderMessages(memory.conversation || []);
  renderMemory(memory);
  renderLearning(memory);
  elements.autoTrainToggle.checked = Boolean(memory.settings?.autoTrain);

  const stats = memory.stats || {};
  const modelText = meta.modelExists ? "saved checkpoint present" : "no saved checkpoint yet";
  elements.datasetStats.textContent =
    `${meta.exampleCount} examples · ${meta.vocabSize} vocab tokens · ${modelText}`;

  const lastTrainResult = stats.last_train_result;
  if (lastTrainResult && lastTrainResult.status === "trained") {
    elements.lastTrain.textContent =
      `Last train: ${formatDate(stats.last_train_at)} · accuracy ${Math.round((lastTrainResult.accuracy || 0) * 100)}% · loss ${lastTrainResult.loss}`;
  } else if (stats.last_train_at) {
    elements.lastTrain.textContent = `Last train event: ${formatDate(stats.last_train_at)}`;
  } else {
    elements.lastTrain.textContent = "No training run yet.";
  }
}

async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

async function refreshSnapshot() {
  const snapshot = await getJson("/api/memory");
  renderSnapshot(snapshot);
}

async function handleSubmit(event) {
  event.preventDefault();
  const message = elements.messageInput.value.trim();
  if (!message || state.busy) {
    return;
  }

  setBusy(true);
  setStatus("Processing message");
  showTypingIndicator();

  try {
    const payload = await getJson("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    removeTypingIndicator();
    elements.messageInput.value = "";
    setConfidence(payload.confidence, payload.label);
    // Internal status updates stay behind the scenes - user just sees the bot response
    setStatus("Ready");

    await refreshSnapshot();
  } catch (error) {
    removeTypingIndicator();
    setStatus("Something went wrong.");
  } finally {
    setBusy(false);
    elements.messageInput.focus();
  }
}

async function handleRetrain() {
  if (state.busy) {
    return;
  }

  setBusy(true);
  setStatus("Training in progress");

  try {
    const payload = await getJson("/api/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = payload.result || {};
    setStatus(
      result.status === "trained"
        ? "All done!"
        : "Nothing to train yet.",
    );
    await refreshSnapshot();
  } catch (error) {
    setStatus("Training didn't work.");
  } finally {
    setBusy(false);
  }
}

async function handleClearMemory() {
  if (state.busy) {
    return;
  }

  const confirmed = window.confirm(
    "Clear remembered facts, preferences, topics, and chat history? Training examples and model weights will stay on disk.",
  );
  if (!confirmed) {
    return;
  }

  setBusy(true);
  try {
    await getJson("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    });
    setStatus("Memory cleared.");
    setConfidence(0, "");
    await refreshSnapshot();
  } catch (error) {
    setStatus("Couldn't clear that.");
  } finally {
    setBusy(false);
  }
}

async function handleExport() {
  if (state.busy) {
    return;
  }

  setBusy(true);
  try {
    const payload = await getJson("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `blank-slate-export-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Done.");
  } catch (error) {
    setStatus("Export didn't work.");
  } finally {
    setBusy(false);
  }
}

async function handleImport(event) {
  const [file] = event.target.files || [];
  if (!file || state.busy) {
    return;
  }

  setBusy(true);
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    await getJson("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    setStatus("Loaded!");
    await refreshSnapshot();
  } catch (error) {
    setStatus("Import didn't work.");
  } finally {
    event.target.value = "";
    setBusy(false);
  }
}

async function handleAutoTrainToggle() {
  if (state.busy) {
    return;
  }

  setBusy(true);
  try {
    await getJson("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoTrain: elements.autoTrainToggle.checked }),
    });
    setStatus(
      elements.autoTrainToggle.checked
        ? "Training mode on."
        : "Training mode off.",
    );
    await refreshSnapshot();
  } catch (error) {
    setStatus("Couldn't save that.");
  } finally {
    setBusy(false);
  }
}

// Settings handlers
function handleDarkModeToggle() {
  if (elements.darkModeToggle.checked) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
  localStorage.setItem("darkMode", elements.darkModeToggle.checked);
}

function handleFontChange() {
  const font = elements.fontSelect.value;
  document.documentElement.style.setProperty("--font-family", font);
  localStorage.setItem("fontFamily", font);
}

function handleGoogleFont() {
  const fontName = elements.googleFontInput.value.trim();
  if (fontName) {
    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, "+")}:wght@400;600;700&display=swap`;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    document.documentElement.style.setProperty("--font-family", `"${fontName}", sans-serif`);
    localStorage.setItem("googleFont", fontName);
  }
}

function handleColorChange(colorType, colorValue) {
  const root = document.documentElement;
  switch (colorType) {
    case "bg-top":
      root.style.setProperty("--bg-top", colorValue);
      break;
    case "bg-bottom":
      root.style.setProperty("--bg-bottom", colorValue);
      break;
    case "accent":
      root.style.setProperty("--accent", colorValue);
      break;
    case "text":
      root.style.setProperty("--ink", colorValue);
      break;
  }
  localStorage.setItem(`color_${colorType}`, colorValue);
}

function loadSettings() {
  // Load dark mode
  const darkMode = localStorage.getItem("darkMode");
  if (darkMode === "true") {
    elements.darkModeToggle.checked = true;
    document.body.classList.add("dark-mode");
  }

  // Load font
  const font = localStorage.getItem("fontFamily");
  if (font) {
    elements.fontSelect.value = font;
    document.documentElement.style.setProperty("--font-family", font);
  }

  // Load Google font
  const googleFont = localStorage.getItem("googleFont");
  if (googleFont) {
    elements.googleFontInput.value = googleFont;
    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?family=${googleFont.replace(/ /g, "+")}:wght@400;600;700&display=swap`;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    document.documentElement.style.setProperty("--font-family", `"${googleFont}", sans-serif`);
  }

  // Load custom colors
  const bgTop = localStorage.getItem("color_bg-top");
  if (bgTop) {
    document.documentElement.style.setProperty("--bg-top", bgTop);
    elements.colorBgTop.value = bgTop;
  }
  const bgBottom = localStorage.getItem("color_bg-bottom");
  if (bgBottom) {
    document.documentElement.style.setProperty("--bg-bottom", bgBottom);
    elements.colorBgBottom.value = bgBottom;
  }
  const accent = localStorage.getItem("color_accent");
  if (accent) {
    document.documentElement.style.setProperty("--accent", accent);
    elements.colorAccent.value = accent;
  }
  const text = localStorage.getItem("color_text");
  if (text) {
    document.documentElement.style.setProperty("--ink", text);
    elements.colorText.value = text;
  }
}

elements.chatForm.addEventListener("submit", handleSubmit);
elements.retrainButton.addEventListener("click", handleRetrain);
elements.clearMemoryButton.addEventListener("click", handleClearMemory);
elements.exportButton.addEventListener("click", handleExport);
elements.importInput.addEventListener("change", handleImport);
elements.autoTrainToggle.addEventListener("change", handleAutoTrainToggle);

// Settings event listeners
elements.darkModeToggle.addEventListener("change", handleDarkModeToggle);
elements.fontSelect.addEventListener("change", handleFontChange);
elements.googleFontInput.addEventListener("change", handleGoogleFont);
elements.colorBgTop.addEventListener("input", (e) => handleColorChange("bg-top", e.target.value));
elements.colorBgBottom.addEventListener("input", (e) => handleColorChange("bg-bottom", e.target.value));
elements.colorAccent.addEventListener("input", (e) => handleColorChange("accent", e.target.value));
elements.colorText.addEventListener("input", (e) => handleColorChange("text", e.target.value));

// Load saved settings
loadSettings();

// Add cursor-following hover effect for cards
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const deltaX = (x - centerX) / centerX;
    const deltaY = (y - centerY) / centerY;
    card.style.transform = `translateY(-2px) rotateX(${deltaY * -2}deg) rotateY(${deltaX * 2}deg)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "";
  });
});

refreshSnapshot()
  .then(() => {
    setStatus("Ready");
  })
  .catch(() => {
    setStatus("Ready");
  });

// ============================================================================
// ChatterBox - Main.js
// Client-side JavaScript for WebSocket communication
// ============================================================================

// DOM Elements
const chatLog = document.getElementById('chat-log');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// Settings elements
const botnessSlider = document.getElementById('botness-slider');
const styleSelect = document.getElementById('style-select');
const formalitySelect = document.getElementById('formality-select');

// Info display elements
const learnedPhrasesEl = document.getElementById('learned-phrases');
const wordFrequencyEl = document.getElementById('word-frequency');
const styleStatusEl = document.getElementById('style-status');
const messageHistoryEl = document.getElementById('message-history');

// WebSocket connection
let ws = null;
let currentData = null;

// Botness level mapping (slider 0-2 to low/medium/high)
const botnessMap = ['low', 'medium', 'high'];

// ============================================================================
// WebSocket Connection
// ============================================================================

function connectWebSocket() {
  // Determine WebSocket protocol (ws or wss based on page protocol)
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${protocol}://${window.location.host}`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('Connected to ChatterBox');
    addSystemMessage('Connected to ChatterBox!');
  };
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  };
  
  ws.onclose = () => {
    console.log('Disconnected from server');
    addSystemMessage('Disconnected. Reconnecting...');
    // Reconnect after 3 seconds
    setTimeout(connectWebSocket, 3000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// Handle incoming server messages
function handleServerMessage(message) {
  switch (message.type) {
    case 'init':
      // Initialize with data from server
      currentData = message.data;
      updateBotnessSlider(message.personality.botness);
      styleSelect.value = message.personality.style;
      formalitySelect.value = message.personality.formality;
      updateInfoPanels(currentData);
      break;
      
    case 'response':
      // Bot response received
      addBotMessage(message.content);
      currentData = message.data;
      updateInfoPanels(currentData);
      break;
      
    case 'personalityUpdated':
      // Personality updated successfully
      showNotification('Settings updated!');
      break;
      
    case 'data':
      // Data update received
      currentData = message.data;
      updateInfoPanels(currentData);
      break;
  }
}

// ============================================================================
// Message Handling
// ============================================================================

// Send message to server
function sendMessage() {
  const content = messageInput.value.trim();
  if (!content || !ws || ws.readyState !== WebSocket.OPEN) return;
  
  // Add user message to chat
  addUserMessage(content);
  
  // Send to server
  ws.send(JSON.stringify({
    type: 'chat',
    content: content
  }));
  
  // Clear input
  messageInput.value = '';
}

// Add user message to chat
function addUserMessage(content) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message user';
  messageEl.innerHTML = `
    <div class="content">${escapeHtml(content)}</div>
    <div class="timestamp">${new Date().toLocaleTimeString()}</div>
  `;
  chatLog.appendChild(messageEl);
  scrollToBottom();
}

// Add bot message to chat
function addBotMessage(content) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message bot';
  messageEl.innerHTML = `
    <div class="content">${escapeHtml(content)}</div>
    <div class="timestamp">${new Date().toLocaleTimeString()}</div>
  `;
  chatLog.appendChild(messageEl);
  scrollToBottom();
}

// Add system message to chat
function addSystemMessage(content) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message bot system';
  messageEl.style.background = '#e8f4f8';
  messageEl.style.fontStyle = 'italic';
  messageEl.style.color = '#636e72';
  messageEl.innerHTML = `
    <div class="content">${escapeHtml(content)}</div>
  `;
  chatLog.appendChild(messageEl);
  scrollToBottom();
}

// Scroll chat to bottom
function scrollToBottom() {
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// Settings Handling
// ============================================================================

// Update botness slider based on value
function updateBotnessSlider(botness) {
  const index = botnessMap.indexOf(botness);
  botnessSlider.value = index >= 0 ? index : 1;
}

// Send personality update to server
function updatePersonality() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  
  const personality = {
    botness: botnessMap[botnessSlider.value],
    style: styleSelect.value,
    formality: formalitySelect.value
  };
  
  ws.send(JSON.stringify({
    type: 'updatePersonality',
    personality: personality
  }));
}

// Show notification
function showNotification(message) {
  // Create temporary notification
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #00b894;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(notification);
  
  // Remove after 2 seconds
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

// ============================================================================
// Info Panels Update
// ============================================================================

// Update all info panels with current data
function updateInfoPanels(data) {
  updateLearnedPhrases(data.learnedPhrases || []);
  updateWordFrequency(data.wordFrequency || {});
  updateStyleStatus(data.styleLearned || false);
  updateMessageHistory(data.messageHistory || []);
}

// Update learned phrases display
function updateLearnedPhrases(phrases) {
  if (phrases.length === 0) {
    learnedPhrasesEl.innerHTML = '<p class="empty-state">Learning your style...</p>';
    return;
  }
  
  // Show last 15 phrases
  const recentPhrases = phrases.slice(-15);
  const html = recentPhrases.map(phrase => 
    `<span class="memory-item">${escapeHtml(phrase)}</span>`
  ).join('');
  
  learnedPhrasesEl.innerHTML = html;
}

// Update word frequency display
function updateWordFrequency(freq) {
  const words = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  
  if (words.length === 0) {
    wordFrequencyEl.innerHTML = '<p class="empty-state">Collecting words...</p>';
    return;
  }
  
  const html = words.map(([word, count]) => 
    `<span class="topic-tag">${escapeHtml(word)} (${count})</span>`
  ).join('');
  
  wordFrequencyEl.innerHTML = html;
}

// Update style status display
function updateStyleStatus(learned) {
  if (learned) {
    styleStatusEl.innerHTML = '<span class="state-badge learned">Style Learned! 🎉</span>';
  } else {
    styleStatusEl.innerHTML = '<span class="state-badge learning">Learning your style...</span>';
  }
}

// Update message history display
function updateMessageHistory(history) {
  if (!history || history.length === 0) {
    messageHistoryEl.innerHTML = '<p class="empty-state">No messages yet...</p>';
    return;
  }
  
  // Show last 10 messages
  const recentHistory = history.slice(-10);
  const html = recentHistory.map(msg => `
    <div class="history-item">
      <span class="role ${msg.role}">${msg.role}:</span>
      ${escapeHtml(msg.content.substring(0, 50))}${msg.content.length > 50 ? '...' : ''}
    </div>
  `).join('');
  
  messageHistoryEl.innerHTML = html;
}

// ============================================================================
// Event Listeners
// ============================================================================

// Send button click
sendBtn.addEventListener('click', sendMessage);

// Enter key in input
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// Botness slider change
botnessSlider.addEventListener('change', updatePersonality);

// Style select change
styleSelect.addEventListener('change', updatePersonality);

// Formality select change
formalitySelect.addEventListener('change', updatePersonality);

// ============================================================================
// Initialize
// ============================================================================

// Connect to WebSocket server
connectWebSocket();

// Focus input
messageInput.focus();
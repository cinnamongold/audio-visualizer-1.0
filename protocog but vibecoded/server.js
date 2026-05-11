// ============================================================================
// ChatterBox - A Self-Hostable Chat App
// ============================================================================
// README:
// ------
// How to run:
//   1. Initialize: npm init -y
//   2. Install dependencies: npm install express ws
//   3. Run: node server.js
//   4. Open in browser: http://localhost:3000
//
// How to override data path:
//   node server.js --data-path=./my-memory.json
//
// What URL to open: http://localhost:3000
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// ============================================================================
// CONFIGURATION
// ============================================================================

// Parse command-line arguments for data path
const args = process.argv.slice(2);
let dataFilePath = './data.json';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--data-path' && args[i + 1]) {
    dataFilePath = args[i + 1];
  }
}

// Bot personality configuration - adjustable via UI
let BOT_PERSONALITY = {
  style: 'sarcastic',      // sarcastic, helpful, casual, formal
  formality: 'casual',     // casual, formal, neutral
  botness: 'medium'       // low, medium, high
};

// ============================================================================
// DATA PERSISTENCE LAYER
// ============================================================================

// Default data structure
function createDefaultData() {
  return {
    learnedPhrases: [],      // N-grams learned from user
    wordFrequency: {},        // Word frequency map
    responsePatterns: [],    // Patterns user uses to start conversations
    conversationState: 'intro',
    personality: { ...BOT_PERSONALITY },
    messageHistory: [],
    learnedTopics: [],
    userPreferences: {
      language: null,
      hobbies: [],
      moods: []
    },
    firstMessage: true,      // Track if this is the first exchange
    styleLearned: false      // Track if we've learned enough to respond in user's style
  };
}

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const raw = fs.readFileSync(dataFilePath, 'utf8');
      const data = JSON.parse(raw);
      // Restore personality from saved data
      if (data.personality) {
        BOT_PERSONALITY = { ...BOT_PERSONALITY, ...data.personality };
      }
      return data;
    }
  } catch (err) {
    console.error('Error loading data:', err.message);
  }
  return createDefaultData();
}

// Save data to file
function saveData(data) {
  try {
    // Update personality in data before saving
    data.personality = { ...BOT_PERSONALITY };
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving data:', err.message);
  }
}

// Global data store
let appData = loadData();

// ============================================================================
// BOT ENGINE - Learning System (Markov-style + Style Mirroring)
// ============================================================================

// Learn from user's message - extract phrases, words, and patterns
function learnFromUser(message, data) {
  const words = message.trim().split(/\s+/);
  
  // Learn word frequency
  for (const word of words) {
    const cleanWord = word.toLowerCase().replace(/[^\w']/g, '');
    if (cleanWord.length > 1) {
      data.wordFrequency[cleanWord] = (data.wordFrequency[cleanWord] || 0) + 1;
    }
  }
  
  // Learn n-grams (2-4 word phrases)
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join(' ');
      data.learnedPhrases.push(phrase);
    }
  }
  
  // Learn response patterns (how user starts conversations)
  if (data.messageHistory.length === 0 || data.messageHistory.filter(m => m.role === 'user').length < 3) {
    // First few messages are learning phase
    const firstWords = words.slice(0, Math.min(3, words.length)).join(' ');
    if (firstWords && !data.responsePatterns.includes(firstWords)) {
      data.responsePatterns.push(firstWords);
    }
  }
  
  // Mark that we've learned enough
  if (data.messageHistory.filter(m => m.role === 'user').length >= 3) {
    data.styleLearned = true;
  }
}

// Generate response that mirrors user's style
function generateLearnedResponse(message, data) {
  const userMessageCount = data.messageHistory.filter(m => m.role === 'user').length;
  
  // If we haven't learned enough, use generic responses
  if (userMessageCount < 3 || data.learnedPhrases.length < 5) {
    return null; // Signal to use fallback
  }
  
  const words = message.trim().split(/\s+/);
  const responses = [];
  
  // Strategy 1: Echo back learned phrases with variation
  if (data.learnedPhrases.length > 0) {
    // Pick a random learned phrase
    const randomPhrase = data.learnedPhrases[Math.floor(Math.random() * data.learnedPhrases.length)];
    // Sometimes use it directly
    if (Math.random() > 0.3) {
      responses.push(randomPhrase);
    }
  }
  
  // Strategy 2: Use most frequent words in new combinations
  const frequentWords = Object.entries(data.wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  if (frequentWords.length > 2) {
    // Create a response using frequent words
    const responseLength = Math.min(frequentWords.length, 3 + Math.floor(Math.random() * 3));
    const selectedWords = frequentWords.slice(0, responseLength);
    responses.push(selectedWords.join(' '));
  }
  
  // Strategy 3: Mirror user's message length
  if (words.length <= 3) {
    // Short response for short message
    if (data.responsePatterns.length > 0) {
      responses.push(data.responsePatterns[Math.floor(Math.random() * data.responsePatterns.length)]);
    }
  } else if (words.length >= 8) {
    // Longer response for longer message
    const longResponses = [
      "yeah i hear you on that one",
      "that's pretty based actually",
      "fair enough honestly",
      "i feel that deep"
    ];
    responses.push(...longResponses);
  }
  
  if (responses.length > 0) {
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  return null;
}

// Fallback responses when not enough learned
const fallbackResponses = [
  "yo",
  "what's good",
  "hey",
  "sup",
  "yeah?",
  "go on",
  "i'm listening",
  "tell me more",
  "oh word",
  "for real",
  "that's crazy",
  "nice",
  "cool",
  "bet",
  "aight",
  "wsg",
  "what's up",
  "hey hey",
  "ohhh",
  "I see"
];

// Generate bot response
function generateResponse(message, data) {
  // Learn from user's message
  learnFromUser(message, data);
  
  // Try to generate learned response first
  const learnedResponse = generateLearnedResponse(message, data);
  if (learnedResponse) {
    return learnedResponse;
  }
  
  // Fallback to random responses (will be replaced as we learn)
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

// ============================================================================
// HTTP SERVER
// ============================================================================

const PORT = 3000;
const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, 'public', filePath);
  
  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json'
  };
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    res.end(content);
  });
});

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

// Using WebSocket because:
// - Real-time bidirectional communication
// - Lower latency than long-polling
// - More efficient for chat applications
// - Persistent connection avoids repeated HTTP overhead

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send initial data to client
  ws.send(JSON.stringify({
    type: 'init',
    data: appData,
    personality: BOT_PERSONALITY
  }));
  
  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      
      if (parsed.type === 'chat') {
        // Add user message to history
        appData.messageHistory.push({
          role: 'user',
          content: parsed.content,
          timestamp: new Date().toISOString()
        });
        
        // Generate bot response
        const response = generateResponse(parsed.content, appData);
        
        // Add bot response to history
        appData.messageHistory.push({
          role: 'bot',
          content: response,
          timestamp: new Date().toISOString()
        });
        
        // Save data
        saveData(appData);
        
        // Send response
        ws.send(JSON.stringify({
          type: 'response',
          content: response,
          data: appData
        }));
        
      } else if (parsed.type === 'updatePersonality') {
        // Update bot personality
        BOT_PERSONALITY = { ...BOT_PERSONALITY, ...parsed.personality };
        appData.personality = BOT_PERSONALITY;
        saveData(appData);
        
        ws.send(JSON.stringify({
          type: 'personalityUpdated',
          personality: BOT_PERSONALITY
        }));
        
      } else if (parsed.type === 'getData') {
        // Send current data
        ws.send(JSON.stringify({
          type: 'data',
          data: appData
        }));
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    ChatterBox Server                        ║
╠═══════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                  ║
║  Data file: ${dataFilePath.padEnd(45)}║
║  Bot personality: ${JSON.stringify(BOT_PERSONALITY).padEnd(35)}║
╚═══════════════════════════════════════════════════════════╝
  `);
});
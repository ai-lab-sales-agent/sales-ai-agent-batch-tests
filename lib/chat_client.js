const { Client } = require('@botpress/chat');

const RETRY_DELAY = 10000;
const MAX_RETRIES = 3;
const DEFAULT_RESPONSE_TIMEOUT = 30000;
const POLL_INTERVAL = 1000;
const SILENCE_THRESHOLD = 10000; // 10s — accounts for KB searches & flow transitions

function createChatClient(webhookId) {
  const client = new Client({ webhookId });

  async function withRetry(fn) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const is429 = err?.response?.status === 429 || err?.status === 429 || String(err).includes('429');
        if (is429 && attempt < MAX_RETRIES) {
          console.log(`  Rate limited (429). Waiting ${RETRY_DELAY / 1000}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
          await sleep(RETRY_DELAY);
          continue;
        }
        throw err;
      }
    }
  }

  async function createUser() {
    return withRetry(async () => {
      const { user, key } = await client.createUser({});
      return { user, userKey: key };
    });
  }

  async function createConversation(userKey) {
    return withRetry(async () => {
      const { conversation } = await client.createConversation({ 'x-user-key': userKey });
      return conversation;
    });
  }

  async function sendMessage(userKey, conversationId, text) {
    return withRetry(async () => {
      const { message } = await client.createMessage({
        'x-user-key': userKey,
        conversationId,
        payload: { type: 'text', text }
      });
      return message;
    });
  }

  async function waitForBotResponses(userKey, conversationId, userId, seenMessageIds = new Set(), timeout = DEFAULT_RESPONSE_TIMEOUT) {
    // Poll listMessages until new bot messages appear and bot goes silent
    const startTime = Date.now();
    let silenceSince = null;
    const newBotMessages = [];

    while (Date.now() - startTime < timeout) {
      await sleep(POLL_INTERVAL);

      const messages = await getAllMessages(userKey, conversationId);

      // Find new bot messages we haven't seen
      const freshBotMsgs = messages.filter(m =>
        m.userId !== userId && !seenMessageIds.has(m.id)
      );

      if (freshBotMsgs.length > newBotMessages.length) {
        // New messages arrived
        for (const msg of freshBotMsgs) {
          if (!newBotMessages.some(existing => existing.id === msg.id)) {
            const text = extractText(msg.payload);
            if (text) {
              newBotMessages.push({ id: msg.id, text, payload: msg.payload });
            }
          }
        }
        silenceSince = Date.now();
      }

      // If we have new bot messages and enough silence, we're done
      if (newBotMessages.length > 0 && silenceSince && Date.now() - silenceSince >= SILENCE_THRESHOLD) {
        break;
      }
    }

    // Mark these messages as seen
    for (const msg of newBotMessages) {
      seenMessageIds.add(msg.id);
    }

    return newBotMessages.map(m => ({ text: m.text, payload: m.payload }));
  }

  async function getAllMessages(userKey, conversationId) {
    try {
      const { messages } = await client.listMessages({
        'x-user-key': userKey,
        conversationId
      });
      return messages || [];
    } catch (err) {
      return [];
    }
  }

  return { createUser, createConversation, sendMessage, waitForBotResponses, getAllMessages };
}

function extractText(payload) {
  if (!payload) return '';
  if (payload.type === 'text') return payload.text || '';
  if (payload.type === 'markdown') return payload.markdown || '';
  if (payload.type === 'choice') return payload.text || '';
  if (payload.type === 'dropdown') return payload.text || '';
  if (payload.type === 'bloc') {
    return (payload.items || []).map(item => extractText(item)).filter(Boolean).join('\n');
  }
  if (payload.type === 'card') return [payload.title, payload.subtitle].filter(Boolean).join(' — ');
  if (payload.type === 'carousel') {
    return (payload.items || []).map(item => extractText(item)).filter(Boolean).join('\n');
  }
  return JSON.stringify(payload);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { createChatClient, sleep };

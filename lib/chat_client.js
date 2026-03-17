const { Client } = require('@botpress/chat');

const RETRY_DELAY = 10000;
const MAX_RETRIES = 3;
const BOT_SILENCE_TIMEOUT = 3000;
const DEFAULT_RESPONSE_TIMEOUT = 15000;

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

  async function waitForBotResponses(userKey, conversationId, userId, timeout = DEFAULT_RESPONSE_TIMEOUT) {
    const botMessages = [];

    return new Promise(async (resolve) => {
      let silenceTimer = null;
      let timeoutTimer = null;

      function cleanup(listener) {
        if (silenceTimer) clearTimeout(silenceTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        listener.disconnect().catch(() => {});
      }

      function resetSilenceTimer(listener) {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          cleanup(listener);
          resolve(botMessages);
        }, BOT_SILENCE_TIMEOUT);
      }

      let listener;
      try {
        listener = await client.listenConversation({
          'x-user-key': userKey,
          id: conversationId
        });

        timeoutTimer = setTimeout(() => {
          cleanup(listener);
          resolve(botMessages);
        }, timeout);

        listener.on('message_created', (data) => {
          if (data.userId !== userId) {
            const text = extractText(data.payload);
            if (text) {
              botMessages.push({ text, payload: data.payload });
            }
            resetSilenceTimer(listener);
          }
        });

        listener.on('error', () => {
          cleanup(listener);
          resolve(botMessages);
        });

        resetSilenceTimer(listener);
      } catch (err) {
        if (listener) cleanup(listener);
        resolve(botMessages);
      }
    });
  }

  return { createUser, createConversation, sendMessage, waitForBotResponses };
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

const { Client } = require('@botpress/client');

function createTablesClient({ token, botId, workspaceId }) {
  const client = new Client({ token, botId, workspaceId });

  async function findLeadByEmail(email) {
    try {
      const { rows } = await client.findTableRows({
        table: 'LeadsTable',
        filter: { visitor_email: email },
        limit: 1,
        offset: 0
      });
      return rows && rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error(`  Tables API error (LeadsTable) for ${email}: ${err.message}`);
      return null;
    }
  }

  async function findLeadByConversationId(conversationId) {
    try {
      const { rows } = await client.findTableRows({
        table: 'LeadsTable',
        search: conversationId,
        limit: 5,
        offset: 0
      });
      return rows && rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error(`  Tables API error (LeadsTable) for conv ${conversationId}: ${err.message}`);
      return null;
    }
  }

  async function findContactFormByConversationId(conversationId) {
    try {
      const { rows } = await client.findTableRows({
        table: 'ContactFormTable',
        search: conversationId,
        limit: 5,
        offset: 0
      });
      return rows && rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error(`  Tables API error (ContactFormTable) for conv ${conversationId}: ${err.message}`);
      return null;
    }
  }

  async function findConversationLog(conversationId) {
    try {
      const { rows } = await client.findTableRows({
        table: 'Conversation_LogsTable',
        search: conversationId,
        limit: 5,
        offset: 0
      });
      return rows && rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error(`  Tables API error (Conversation_LogsTable) for conv ${conversationId}: ${err.message}`);
      return null;
    }
  }

  async function findLeadByVisitorId(visitorId) {
    try {
      const { rows } = await client.findTableRows({
        table: 'LeadsTable',
        filter: { visitor_id: visitorId },
        limit: 10,
        offset: 0
      });
      if (!rows || rows.length === 0) return null;
      // Sort by createdAt descending — bot creates multiple rows as lead progresses, we want the latest
      rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return rows[0];
    } catch (err) {
      console.error(`  Tables API error (LeadsTable) for visitor ${visitorId}: ${err.message}`);
      return null;
    }
  }

  return { findLeadByEmail, findLeadByConversationId, findLeadByVisitorId, findContactFormByConversationId, findConversationLog };
}

module.exports = { createTablesClient };

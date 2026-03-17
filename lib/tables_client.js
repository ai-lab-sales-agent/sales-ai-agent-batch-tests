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
      console.error(`  Tables API error for ${email}: ${err.message}`);
      return null;
    }
  }

  return { findLeadByEmail };
}

module.exports = { createTablesClient };

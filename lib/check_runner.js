function runChecks(checks, botResponses, tableRow, extraTables) {
  return checks.map(check => runSingleCheck(check, botResponses, tableRow, extraTables));
}

function runSingleCheck(check, botResponses, tableRow, extraTables) {
  const base = { check, description: check.description || '' };
  const { contactFormRow, convLogRow } = extraTables || {};

  try {
    switch (check.type) {
      case 'response_contains':
        return checkResponseContains(check, botResponses, base);
      case 'response_not_contains':
        return checkResponseNotContains(check, botResponses, base);
      case 'message_count':
        return checkMessageCount(check, botResponses, base);
      case 'total_bot_messages':
        return checkTotalBotMessages(check, botResponses, base);
      case 'table_variable':
        return checkTableVariable(check, tableRow, base);
      case 'table_variable_not':
        return checkTableVariableNot(check, tableRow, base);
      case 'table_variable_set':
        return checkTableVariableSet(check, tableRow, base);
      case 'table_variable_not_set':
        return checkTableVariableNotSet(check, tableRow, base);
      case 'conversation_ended':
        return checkConversationEnded(check, botResponses, base);
      case 'tone_check':
        return checkTone(check, botResponses, base);
      // ContactFormTable checks
      case 'contact_form_exists':
        return checkRowExists(contactFormRow, 'ContactFormTable', base);
      case 'contact_form_not_exists':
        return checkRowNotExists(contactFormRow, 'ContactFormTable', base);
      case 'contact_form_variable':
        return checkExtraTableVariable(check, contactFormRow, 'ContactFormTable', base);
      case 'contact_form_variable_set':
        return checkExtraTableVariableSet(check, contactFormRow, 'ContactFormTable', base);
      // Conversation_LogsTable checks
      case 'conv_log_variable':
        return checkExtraTableVariable(check, convLogRow, 'Conversation_LogsTable', base);
      case 'conv_log_variable_set':
        return checkExtraTableVariableSet(check, convLogRow, 'Conversation_LogsTable', base);
      case 'conv_log_variable_not_set':
        return checkExtraTableVariableNotSet(check, convLogRow, 'Conversation_LogsTable', base);
      default:
        return { ...base, result: 'SKIPPED', actual: null, detail: `Unknown check type: ${check.type}` };
    }
  } catch (err) {
    return { ...base, result: 'ERROR', actual: null, detail: err.message };
  }
}

function checkResponseContains(check, botResponses, base) {
  if (check.message_index === -1) {
    // Search ALL responses for the text
    const allText = botResponses.map(r => getBotText(r)).join('\n').toLowerCase();
    const found = allText.includes(check.text.toLowerCase());
    return { ...base, result: found ? 'PASS' : 'FAIL', actual: truncate(allText, 200), detail: found ? '' : `"${check.text}" not found in any response` };
  }
  const idx = resolveIndex(check.message_index, botResponses.length);
  if (idx === null) {
    return { ...base, result: 'FAIL', actual: `No bot response at index ${check.message_index}`, detail: `Only ${botResponses.length} responses` };
  }
  const text = getBotText(botResponses[idx]).toLowerCase();
  const found = text.includes(check.text.toLowerCase());
  return { ...base, result: found ? 'PASS' : 'FAIL', actual: truncate(text, 200), detail: found ? '' : `"${check.text}" not found` };
}

function checkResponseNotContains(check, botResponses, base) {
  const searchText = check.text.toLowerCase();
  if (check.message_index === -1) {
    // Check ALL responses
    for (let i = 0; i < botResponses.length; i++) {
      const text = getBotText(botResponses[i]).toLowerCase();
      if (text.includes(searchText)) {
        return { ...base, result: 'FAIL', actual: truncate(text, 200), detail: `"${check.text}" found in response ${i}` };
      }
    }
    return { ...base, result: 'PASS', actual: null, detail: '' };
  }
  const idx = resolveIndex(check.message_index, botResponses.length);
  if (idx === null) {
    return { ...base, result: 'PASS', actual: `No response at index ${check.message_index}`, detail: 'Response missing, so text absent' };
  }
  const text = getBotText(botResponses[idx]).toLowerCase();
  const found = text.includes(searchText);
  return { ...base, result: found ? 'FAIL' : 'PASS', actual: truncate(text, 200), detail: found ? `"${check.text}" found` : '' };
}

function checkMessageCount(check, botResponses, base) {
  const counts = botResponses.map(r => r.messageCount || 1);
  const idx = check.after_visitor_message_index;
  if (idx < 0 || idx >= counts.length) {
    return { ...base, result: 'FAIL', actual: `No turn at index ${idx}`, detail: '' };
  }
  const actual = counts[idx];
  const expected = check.expected_count;
  return { ...base, result: actual === expected ? 'PASS' : 'FAIL', actual, detail: actual !== expected ? `Expected ${expected}, got ${actual}` : '' };
}

function checkTotalBotMessages(check, botResponses, base) {
  const total = botResponses.reduce((sum, r) => sum + (r.messageCount || 1), 0);
  const inRange = total >= check.min && total <= check.max;
  return { ...base, result: inRange ? 'PASS' : 'FAIL', actual: total, detail: inRange ? '' : `Expected ${check.min}-${check.max}, got ${total}` };
}

function checkTableVariable(check, tableRow, base) {
  if (!tableRow) return { ...base, result: 'SKIPPED', actual: null, detail: 'No LeadsTable row found' };
  const actual = tableRow[check.variable];
  const match = String(actual).toLowerCase() === String(check.expected).toLowerCase();
  return { ...base, result: match ? 'PASS' : 'FAIL', actual, detail: match ? '' : `Expected "${check.expected}", got "${actual}"` };
}

function checkTableVariableNot(check, tableRow, base) {
  if (!tableRow) return { ...base, result: 'SKIPPED', actual: null, detail: 'No LeadsTable row found' };
  const actual = tableRow[check.variable];
  const match = String(actual).toLowerCase() === String(check.expected).toLowerCase();
  return { ...base, result: match ? 'FAIL' : 'PASS', actual, detail: match ? `Variable equals "${check.expected}" (should not)` : '' };
}

function checkTableVariableSet(check, tableRow, base) {
  if (!tableRow) return { ...base, result: 'SKIPPED', actual: null, detail: 'No LeadsTable row found' };
  const actual = tableRow[check.variable];
  const isSet = actual !== null && actual !== undefined && actual !== '';
  return { ...base, result: isSet ? 'PASS' : 'FAIL', actual, detail: isSet ? '' : `${check.variable} is not set` };
}

function checkTableVariableNotSet(check, tableRow, base) {
  if (!tableRow) return { ...base, result: 'PASS', actual: null, detail: 'No LeadsTable row — variable not set (as expected)' };
  const actual = tableRow[check.variable];
  const isSet = actual !== null && actual !== undefined && actual !== '';
  return { ...base, result: isSet ? 'FAIL' : 'PASS', actual, detail: isSet ? `${check.variable} is set but should not be` : '' };
}

function checkConversationEnded(check, botResponses, base) {
  if (botResponses.length === 0) {
    return { ...base, result: 'FAIL', actual: 'No responses', detail: '' };
  }
  const lastText = getBotText(botResponses[botResponses.length - 1]).toLowerCase();
  const closeIndicators = [
    'thanks for reaching out',
    'reach out when',
    'come back when',
    'good luck',
    'take care',
    'all the best',
    'been a pleasure',
    'is there anything else'
  ];
  const ended = closeIndicators.some(indicator => lastText.includes(indicator));
  return { ...base, result: ended ? 'PASS' : 'FAIL', actual: truncate(lastText, 200), detail: ended ? '' : 'No close indicator detected in last response' };
}

function checkTone(check, botResponses, base) {
  const allText = botResponses.map(r => getBotText(r)).join(' ').toLowerCase();
  const failures = [];

  if (check.keywords_present) {
    for (const kw of check.keywords_present) {
      if (!allText.includes(kw.toLowerCase())) {
        failures.push(`Missing: "${kw}"`);
      }
    }
  }
  if (check.keywords_absent) {
    for (const kw of check.keywords_absent) {
      if (allText.includes(kw.toLowerCase())) {
        failures.push(`Found (should be absent): "${kw}"`);
      }
    }
  }

  return { ...base, result: failures.length === 0 ? 'PASS' : 'FAIL', actual: failures.join('; '), detail: '' };
}

// --- Extra table checks (ContactFormTable, Conversation_LogsTable) ---

function checkRowExists(row, tableName, base) {
  return { ...base, result: row ? 'PASS' : 'FAIL', actual: row ? 'Row found' : null, detail: row ? '' : `No ${tableName} row found` };
}

function checkRowNotExists(row, tableName, base) {
  return { ...base, result: row ? 'FAIL' : 'PASS', actual: row ? 'Row found (should not exist)' : null, detail: row ? `${tableName} row exists but should not` : '' };
}

function checkExtraTableVariable(check, row, tableName, base) {
  if (!row) return { ...base, result: 'SKIPPED', actual: null, detail: `No ${tableName} row found` };
  const actual = row[check.variable];
  const match = String(actual).toLowerCase() === String(check.expected).toLowerCase();
  return { ...base, result: match ? 'PASS' : 'FAIL', actual, detail: match ? '' : `Expected "${check.expected}", got "${actual}"` };
}

function checkExtraTableVariableSet(check, row, tableName, base) {
  if (!row) return { ...base, result: 'SKIPPED', actual: null, detail: `No ${tableName} row found` };
  const actual = row[check.variable];
  const isSet = actual !== null && actual !== undefined && actual !== '';
  return { ...base, result: isSet ? 'PASS' : 'FAIL', actual, detail: isSet ? '' : `${check.variable} is not set in ${tableName}` };
}

function checkExtraTableVariableNotSet(check, row, tableName, base) {
  if (!row) return { ...base, result: 'PASS', actual: null, detail: `No ${tableName} row — variable not set (as expected)` };
  const actual = row[check.variable];
  const isSet = actual !== null && actual !== undefined && actual !== '';
  return { ...base, result: isSet ? 'FAIL' : 'PASS', actual, detail: isSet ? `${check.variable} is set but should not be` : '' };
}

function getBotText(response) {
  if (typeof response === 'string') return response;
  if (response?.text) return response.text;
  return '';
}

function resolveIndex(idx, length) {
  if (length === 0) return null;
  if (idx < 0) {
    const resolved = length + idx;
    return resolved >= 0 ? resolved : null;
  }
  return idx < length ? idx : null;
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

function computeOverallResult(checkResults) {
  if (checkResults.length === 0) return 'SKIPPED';
  const hasError = checkResults.some(c => c.result === 'ERROR');
  if (hasError) return 'ERROR';
  const hasFail = checkResults.some(c => c.result === 'FAIL');
  const hasPass = checkResults.some(c => c.result === 'PASS');
  if (hasFail && hasPass) return 'PARTIAL';
  if (hasFail) return 'FAIL';
  if (hasPass) return 'PASS';
  return 'SKIPPED';
}

module.exports = { runChecks, computeOverallResult };

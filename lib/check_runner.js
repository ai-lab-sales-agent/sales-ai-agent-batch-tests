function runChecks(checks, botResponses, tableRow) {
  return checks.map(check => runSingleCheck(check, botResponses, tableRow));
}

function runSingleCheck(check, botResponses, tableRow) {
  const base = { check, description: check.description || '' };

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
      case 'conversation_ended':
        return checkConversationEnded(check, botResponses, base);
      case 'tone_check':
        return checkTone(check, botResponses, base);
      default:
        return { ...base, result: 'SKIPPED', actual: null, detail: `Unknown check type: ${check.type}` };
    }
  } catch (err) {
    return { ...base, result: 'ERROR', actual: null, detail: err.message };
  }
}

function checkResponseContains(check, botResponses, base) {
  const idx = check.message_index;
  if (idx < 0 || idx >= botResponses.length) {
    return { ...base, result: 'FAIL', actual: `No bot response at index ${idx}`, detail: `Only ${botResponses.length} responses` };
  }
  const text = getBotText(botResponses[idx]).toLowerCase();
  const found = text.includes(check.text.toLowerCase());
  return { ...base, result: found ? 'PASS' : 'FAIL', actual: truncate(text, 200), detail: found ? '' : `"${check.text}" not found` };
}

function checkResponseNotContains(check, botResponses, base) {
  const searchText = check.text.toLowerCase();
  if (check.message_index === -1) {
    for (let i = 0; i < botResponses.length; i++) {
      const text = getBotText(botResponses[i]).toLowerCase();
      if (text.includes(searchText)) {
        return { ...base, result: 'FAIL', actual: truncate(text, 200), detail: `"${check.text}" found in response ${i}` };
      }
    }
    return { ...base, result: 'PASS', actual: null, detail: '' };
  }
  const idx = check.message_index;
  if (idx < 0 || idx >= botResponses.length) {
    return { ...base, result: 'PASS', actual: `No response at index ${idx}`, detail: 'Response missing, so text absent' };
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

function getBotText(response) {
  if (typeof response === 'string') return response;
  if (response?.text) return response.text;
  return '';
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

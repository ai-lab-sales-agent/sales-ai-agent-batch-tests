const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

function readTestCases(filePath, filters = {}) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  let records = parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });

  records = records.map(r => ({
    ...r,
    visitor_messages: safeJsonParse(r.visitor_messages, []),
    expected_checks: safeJsonParse(r.expected_checks, [])
  }));

  if (filters.priority) {
    records = records.filter(r => r.priority === filters.priority);
  }
  if (filters.sheet) {
    records = records.filter(r => r.sheet === filters.sheet);
  }
  if (filters.test_id) {
    records = records.filter(r => r.test_id === filters.test_id);
  }

  return records;
}

function writeResults(filePath, results) {
  const rows = results.map(r => ({
    test_id: r.test_id,
    mode: r.mode,
    scenario_name: r.scenario_name || '',
    sheet: r.sheet || '',
    priority: r.priority || '',
    conversation_id: r.conversation_id || '',
    user_id: r.user_id || '',
    overall_result: r.overall_result,
    check_results: JSON.stringify(r.check_results || []),
    bot_responses_summary: r.bot_responses_summary || '',
    errors: r.errors || '',
    timestamp: r.timestamp || new Date().toISOString()
  }));

  const csv = stringify(rows, { header: true });
  fs.writeFileSync(filePath, csv);
}

function writeSummary(filePath, scriptedResults, personaResults, opts) {
  const lines = [];
  lines.push('=== BATCH TEST SUMMARY ===');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  if (opts) {
    lines.push('--- RUN CONFIGURATION ---');
    lines.push(`Mode: ${opts.mode || 'all'}`);
    if (opts.priority) lines.push(`Priority filter: ${opts.priority}`);
    if (opts.sheet) lines.push(`Sheet filter: ${opts.sheet}`);
    if (opts.testId) lines.push(`Single test: ${opts.testId}`);
    if (opts.personaId) lines.push(`Single persona: ${opts.personaId}`);
    if (opts.excludePersonas) lines.push(`Excluded personas: ${opts.excludePersonas.join(', ')}`);
    lines.push('');
  }

  if (scriptedResults.length > 0) {
    lines.push('--- LEVEL 2: SCRIPTED TESTS ---');
    const total = scriptedResults.length;
    const passed = scriptedResults.filter(r => r.overall_result === 'PASS').length;
    const failed = scriptedResults.filter(r => r.overall_result === 'FAIL').length;
    const partial = scriptedResults.filter(r => r.overall_result === 'PARTIAL').length;
    const errors = scriptedResults.filter(r => r.overall_result === 'ERROR').length;
    const skipped = scriptedResults.filter(r => r.overall_result === 'SKIPPED').length;

    lines.push(`Total: ${total} | PASS: ${passed} | FAIL: ${failed} | PARTIAL: ${partial} | ERROR: ${errors} | SKIPPED: ${skipped}`);
    lines.push(`Pass rate: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`);
    lines.push('');

    const byPriority = groupBy(scriptedResults, 'priority');
    for (const [priority, tests] of Object.entries(byPriority)) {
      const p = tests.filter(r => r.overall_result === 'PASS').length;
      lines.push(`  ${priority}: ${p}/${tests.length} passed`);
    }
    lines.push('');

    const bySheet = groupBy(scriptedResults, r => r.sheet || 'Unknown');
    for (const [sheet, tests] of Object.entries(bySheet)) {
      const p = tests.filter(r => r.overall_result === 'PASS').length;
      lines.push(`  ${sheet}: ${p}/${tests.length} passed`);
    }
    lines.push('');

    const failures = scriptedResults.filter(r => r.overall_result === 'FAIL' || r.overall_result === 'ERROR');
    if (failures.length > 0) {
      lines.push('FAILURES:');
      for (const f of failures) {
        lines.push(`  ${f.test_id} (${f.overall_result}): ${f.scenario_name} — ${f.errors || summarizeCheckFailures(f.check_results)}`);
      }
      lines.push('');
    }
  }

  if (personaResults.length > 0) {
    lines.push('--- LEVEL 3: PERSONA TESTS ---');
    for (const p of personaResults) {
      const avg = p.evaluation?.average_score || 'N/A';
      const topIssue = p.evaluation?.top_issue || 'N/A';
      lines.push(`  ${p.test_id} ${p.scenario_name}: avg=${avg}/5 | top issue: ${topIssue}`);
    }
    lines.push('');

    const allEdgeCases = personaResults.flatMap(p => (p.evaluation?.edge_case_results || []).map(e => ({ persona: p.test_id, ...e })));
    if (allEdgeCases.length > 0) {
      lines.push('EDGE CASE RESULTS:');
      for (const e of allEdgeCases) {
        lines.push(`  ${e.persona} — ${e.edge_case}: ${e.result} (${e.detail || ''})`);
      }
      lines.push('');
    }
  }

  lines.push('--- CONVERSATION IDS (for Dashboard lookup) ---');
  const allResults = [...scriptedResults, ...personaResults];
  for (const r of allResults) {
    if (r.conversation_id) {
      lines.push(`  ${r.test_id}: ${r.conversation_id}`);
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'));
}

function safeJsonParse(str, fallback) {
  if (!str || str === '') return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function groupBy(arr, keyOrFn) {
  const fn = typeof keyOrFn === 'function' ? keyOrFn : (item) => item[keyOrFn];
  const groups = {};
  for (const item of arr) {
    const key = fn(item) || 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function summarizeCheckFailures(checks) {
  if (!checks || !Array.isArray(checks)) return '';
  return checks.filter(c => c.result === 'FAIL').map(c => c.description || c.check?.description || 'check failed').join('; ');
}

module.exports = { readTestCases, writeResults, writeSummary };

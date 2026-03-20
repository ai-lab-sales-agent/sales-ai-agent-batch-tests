#!/usr/bin/env node
require('dotenv').config({ override: true });

const fs = require('fs');
const path = require('path');
const { createChatClient, sleep } = require('./lib/chat_client');
const { createTablesClient } = require('./lib/tables_client');
const { createClaudeClient } = require('./lib/claude_client');
const { readTestCases, writeResults, writeSummary } = require('./lib/csv_handler');
const { runChecks, computeOverallResult } = require('./lib/check_runner');
const { runPersonaConversation, evaluatePersona } = require('./lib/persona_runner');

const RESULTS_DIR = path.join(__dirname, 'results');
const TEST_CASES_FILE = path.join(__dirname, 'test_cases.csv');
const PERSONAS_FILE = path.join(__dirname, 'personas.json');
const BETWEEN_TESTS_DELAY = 3000;
const SCRIPTED_MESSAGE_DELAY = 2000;

// --- CLI Argument Parsing ---

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { mode: 'all', verbose: false, dryRun: false };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--mode': opts.mode = args[++i]; break;
      case '--priority': opts.priority = args[++i]; break;
      case '--sheet': opts.sheet = args[++i]; break;
      case '--test': opts.testId = args[++i]; break;
      case '--persona': opts.personaId = args[++i]; break;
      case '--exclude': opts.excludePersonas = args[++i].split(','); break;
      case '--verbose': opts.verbose = true; break;
      case '--dry-run': opts.dryRun = true; break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!['scripted', 'persona', 'all'].includes(opts.mode)) {
    console.error(`Invalid mode: ${opts.mode}. Use: scripted, persona, or all`);
    process.exit(1);
  }

  return opts;
}

function printHelp() {
  console.log(`
Usage: node batch_runner.js [options]

Options:
  --mode <scripted|persona|all>   Test mode (default: all)
  --priority <P1|P2|P3>          Filter scripted tests by priority
  --sheet <name>                  Filter scripted tests by sheet
  --test <test_id>                Run a single scripted test
  --persona <persona_id>          Run a single persona test
  --dry-run                       Show what would run without executing
  --verbose                       Detailed output
  --help                          Show this help
  `);
}

// --- Main ---

async function main() {
  const opts = parseArgs();

  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const allScriptedResults = [];
  const allPersonaResults = [];

  // Graceful shutdown — write partial results
  let shuttingDown = false;
  process.on('SIGINT', () => {
    if (shuttingDown) process.exit(1);
    shuttingDown = true;
    console.log('\nInterrupted — writing partial results...');
    saveResults(allScriptedResults, allPersonaResults);
    process.exit(0);
  });

  // Initialize clients
  const chatClient = createChatClient(process.env.WEBHOOK_ID);
  const tablesClient = createTablesClient({
    token: process.env.BOT_PAT,
    botId: process.env.BOT_ID,
    workspaceId: process.env.WORKSPACE_ID
  });

  if (opts.mode === 'scripted' || opts.mode === 'all') {
    const results = await runScriptedTests(chatClient, tablesClient, opts);
    allScriptedResults.push(...results);
  }

  if (opts.mode === 'persona' || opts.mode === 'all') {
    const claudeClient = createClaudeClient(process.env.ANTHROPIC_API_KEY);
    const results = await runPersonaTests(chatClient, tablesClient, claudeClient, opts);
    allPersonaResults.push(...results);
  }

  saveResults(allScriptedResults, allPersonaResults);
  console.log('\nDone. Results saved to results/ directory.');
}

// --- Scripted Tests ---

async function runScriptedTests(chatClient, tablesClient, opts) {
  console.log('\n=== LEVEL 2: SCRIPTED TESTS ===\n');

  if (!fs.existsSync(TEST_CASES_FILE)) {
    console.error('test_cases.csv not found. Skipping scripted tests.');
    return [];
  }

  const filters = {};
  if (opts.priority) filters.priority = opts.priority;
  if (opts.sheet) filters.sheet = opts.sheet;
  if (opts.testId) filters.test_id = opts.testId;

  const testCases = readTestCases(TEST_CASES_FILE, filters);
  console.log(`Found ${testCases.length} test cases to run.`);

  if (opts.dryRun) {
    for (const tc of testCases) {
      console.log(`  [DRY RUN] ${tc.test_id} — ${tc.scenario_name} (${tc.priority}) — ${tc.visitor_messages.length} messages, ${tc.expected_checks.length} checks`);
    }
    return [];
  }

  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`[${i + 1}/${testCases.length}] ${tc.test_id}: ${tc.scenario_name}`);

    try {
      const result = await runSingleScriptedTest(tc, chatClient, tablesClient, opts.verbose);
      results.push(result);
      console.log(`  Result: ${result.overall_result}`);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      results.push({
        test_id: tc.test_id,
        mode: 'scripted',
        scenario_name: tc.scenario_name,
        priority: tc.priority,
        sheet: tc.sheet,
        conversation_id: '',
        user_id: '',
        overall_result: 'ERROR',
        check_results: [],
        bot_responses_summary: '',
        errors: err.message,
        timestamp: new Date().toISOString()
      });
    }

    if (i < testCases.length - 1) {
      await sleep(BETWEEN_TESTS_DELAY);
    }
  }

  return results;
}

async function runSingleScriptedTest(tc, chatClient, tablesClient, verbose) {
  const { user, userKey } = await chatClient.createUser();
  const conversation = await chatClient.createConversation(userKey);

  if (verbose) console.log(`  Conversation: ${conversation.id} | User: ${user.id}`);

  const allBotResponses = [];
  const messageCounts = [];
  const seenMessageIds = new Set();

  for (let j = 0; j < tc.visitor_messages.length; j++) {
    const msg = tc.visitor_messages[j];
    if (verbose) console.log(`  Visitor [${j}]: ${msg.slice(0, 80)}...`);

    await chatClient.sendMessage(userKey, conversation.id, msg);
    await sleep(2000);
    const botMsgs = await chatClient.waitForBotResponses(userKey, conversation.id, user.id, seenMessageIds);

    const turnText = botMsgs.map(m => m.text).join('\n');
    allBotResponses.push({ text: turnText, messageCount: botMsgs.length });
    messageCounts.push(botMsgs.length);

    if (verbose) console.log(`  Bot [${j}] (${botMsgs.length} msg): ${turnText.slice(0, 100)}...`);

    if (j < tc.visitor_messages.length - 1) {
      await sleep(SCRIPTED_MESSAGE_DELAY);
    }
  }

  // Wait for conversation to end before checking tables
  const completionType = tc.completion_type || 'complete';
  if (completionType === 'timeout') {
    const TIMEOUT_WAIT = 2 * 60 * 1000 + 15000; // 2 min + 15s buffer
    if (verbose) console.log(`  Waiting ${TIMEOUT_WAIT / 1000}s for timeout-based conversation end...`);
    await sleep(TIMEOUT_WAIT);
  } else {
    // Complete conversations — wait a few seconds for data to be written
    await sleep(5000);
  }

  // Look up LeadsTable by visitor_id (more reliable than email)
  let tableRow = null;
  if (verbose) console.log(`  LeadsTable lookup by visitor_id (${user.id})`);
  tableRow = await tablesClient.findLeadByVisitorId(user.id);
  if (!tableRow) {
    // Retry after additional wait — table write may lag
    if (verbose) console.log(`  Not found, retrying in 15s...`);
    await sleep(15000);
    tableRow = await tablesClient.findLeadByVisitorId(user.id);
  }
  if (verbose) console.log(`  LeadsTable: ${tableRow ? 'found, lead_score=' + tableRow.lead_score : 'not found'}`);

  const checkResults = runChecks(tc.expected_checks, allBotResponses, tableRow);
  const overall = computeOverallResult(checkResults);

  return {
    test_id: tc.test_id,
    mode: 'scripted',
    scenario_name: tc.scenario_name,
    priority: tc.priority,
    sheet: tc.sheet,
    conversation_id: conversation.id,
    user_id: user.id,
    overall_result: overall,
    check_results: checkResults,
    bot_responses_summary: messageCounts.join(','),
    errors: '',
    timestamp: new Date().toISOString()
  };
}

function extractTestEmail(tc) {
  const emailPattern = /test-[\w-]+@test\.halo-lab\.team/i;
  for (const msg of tc.visitor_messages) {
    const match = msg.match(emailPattern);
    if (match) return match[0];
  }
  // Fallback: construct from test_id
  return `test-${tc.test_id.toLowerCase()}@test.halo-lab.team`;
}

// --- Persona Tests ---

async function runPersonaTests(chatClient, tablesClient, claudeClient, opts) {
  console.log('\n=== LEVEL 3: PERSONA TESTS ===\n');

  if (!fs.existsSync(PERSONAS_FILE)) {
    console.error('personas.json not found. Skipping persona tests.');
    return [];
  }

  let personas = JSON.parse(fs.readFileSync(PERSONAS_FILE, 'utf-8'));

  if (opts.personaId) {
    personas = personas.filter(p => p.persona_id === opts.personaId);
  }
  if (opts.excludePersonas) {
    personas = personas.filter(p => !opts.excludePersonas.includes(p.persona_id));
  }

  console.log(`Found ${personas.length} personas to run.`);

  if (opts.dryRun) {
    for (const p of personas) {
      console.log(`  [DRY RUN] ${p.persona_id} — ${p.name} — expected: ${p.expected_outcome}, max turns: ${p.max_turns || 20}`);
    }
    return [];
  }

  const results = [];
  const evaluations = [];

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    console.log(`[${i + 1}/${personas.length}] ${persona.persona_id}: ${persona.name}`);

    try {
      // Run conversation
      const { conversation, user, userKey, transcript, turnCount, forceEnded } =
        await runPersonaConversation(persona, chatClient, claudeClient, opts.verbose);

      console.log(`  Turns: ${turnCount}${forceEnded ? ' (force-ended)' : ''} | Conversation: ${conversation.id}`);

      // Wait for bot timeout to trigger conversation end + table writes
      const PERSONA_TIMEOUT_WAIT = 2 * 60 * 1000 + 15000; // 2 min + 15s buffer
      if (opts.verbose) console.log(`  Waiting ${PERSONA_TIMEOUT_WAIT / 1000}s for bot timeout and table writes...`);
      await sleep(PERSONA_TIMEOUT_WAIT);

      // Fetch ALL messages after timeout (bot may send closing messages with Cal.com link)
      const allPostTimeoutMessages = await chatClient.getAllMessages(userKey, conversation.id);
      const postTimeoutBotMessages = allPostTimeoutMessages
        .filter(m => m.userId !== user.id)
        .map(m => {
          const text = m.payload?.text || m.payload?.markdown || '';
          return { text, payload: m.payload };
        })
        .filter(m => m.text);

      if (opts.verbose) {
        const postConvCount = postTimeoutBotMessages.length - transcript.filter(t => t.role === 'bot').length;
        if (postConvCount > 0) {
          console.log(`  Found ${postConvCount} additional bot messages after timeout (closing flow)`);
        }
      }

      // Evaluate
      const evaluation = await evaluatePersona(persona, transcript, claudeClient, opts.verbose);

      // Look up tables by visitor_id (user.id) — exact match, no ambiguity
      // Retry up to 3 times with 15s delay if LeadsTable row not found (scoring may take time after timeout)
      let tableRow = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        tableRow = await tablesClient.findLeadByVisitorId(user.id);
        if (tableRow) break;
        if (attempt < 3) {
          if (opts.verbose) console.log(`  LeadsTable not found yet, retrying in 15s (attempt ${attempt}/3)...`);
          await sleep(15000);
        }
      }
      if (opts.verbose) console.log(`  LeadsTable lookup by visitor_id (${user.id}): ${tableRow ? 'found, lead_score=' + tableRow.lead_score : 'not found'}`);
      const contactFormRow = await tablesClient.findContactFormByConversationId(conversation.id);
      const conversationLog = await tablesClient.findConversationLog(conversation.id);
      if (opts.verbose) {
        console.log(`  LeadsTable: ${tableRow ? 'found' : 'not found'}`);
        console.log(`  ContactFormTable: ${contactFormRow ? 'found' : 'not found'}`);
        console.log(`  Conversation_LogsTable: ${conversationLog ? 'found' : 'not found'}`);
      }

      // Run automated checks using ALL bot messages (including post-timeout closing messages)
      const allBotResponses = postTimeoutBotMessages.map(m => ({ text: m.text, messageCount: 1 }));
      const checkResults = runChecks(persona.expected_checks || [],
        allBotResponses, tableRow, { contactFormRow, conversationLog });
      const overall = computeOverallResult(checkResults);

      const messageCounts = transcript.filter(t => t.role === 'bot').map(t => t.messageCount || 1);

      const result = {
        test_id: persona.persona_id,
        mode: 'persona',
        scenario_name: persona.name,
        priority: 'P1',
        sheet: 'Persona',
        conversation_id: conversation.id,
        user_id: user.id,
        overall_result: overall,
        check_results: checkResults,
        bot_responses_summary: messageCounts.join(','),
        errors: forceEnded ? 'Force-ended at max turns' : '',
        timestamp: new Date().toISOString(),
        evaluation
      };

      results.push(result);

      evaluations.push({
        persona_id: persona.persona_id,
        name: persona.name,
        expected_outcome: persona.expected_outcome,
        conversation_id: conversation.id,
        user_id: user.id,
        turn_count: turnCount,
        force_ended: forceEnded,
        transcript,
        evaluation,
        automated_checks: checkResults,
        timestamp: new Date().toISOString()
      });

      console.log(`  Score: ${evaluation.average_score}/5 | Checks: ${overall}`);

    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      results.push({
        test_id: persona.persona_id,
        mode: 'persona',
        scenario_name: persona.name,
        priority: 'P1',
        sheet: 'Persona',
        conversation_id: '',
        user_id: '',
        overall_result: 'ERROR',
        check_results: [],
        bot_responses_summary: '',
        errors: err.message,
        timestamp: new Date().toISOString()
      });
    }

    if (i < personas.length - 1) {
      await sleep(BETWEEN_TESTS_DELAY);
    }
  }

  // Write persona evaluations (will be copied to run dir by saveResults caller)
  if (evaluations.length > 0) {
    fs.writeFileSync(
      path.join(RESULTS_DIR, 'persona_evaluations.json'),
      JSON.stringify(evaluations, null, 2)
    );
  }
  // Store for run dir saving
  global._personaEvaluations = evaluations;

  return results;
}

// --- Output ---

function saveResults(scriptedResults, personaResults) {
  const allResults = [...scriptedResults, ...personaResults];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runDir = path.join(RESULTS_DIR, `run_${timestamp}`);
  fs.mkdirSync(runDir, { recursive: true });

  if (allResults.length > 0) {
    writeResults(path.join(runDir, 'test_results.csv'), allResults);
  }
  writeSummary(path.join(runDir, 'test_summary.txt'), scriptedResults, personaResults);

  // Also write latest (symlink-like) for quick access
  if (allResults.length > 0) {
    writeResults(path.join(RESULTS_DIR, 'test_results.csv'), allResults);
  }
  writeSummary(path.join(RESULTS_DIR, 'test_summary.txt'), scriptedResults, personaResults);

  // Copy persona evaluations to run dir
  if (global._personaEvaluations && global._personaEvaluations.length > 0) {
    fs.writeFileSync(
      path.join(runDir, 'persona_evaluations.json'),
      JSON.stringify(global._personaEvaluations, null, 2)
    );
  }

  console.log(`Results saved to ${runDir}`);
}

// --- Run ---

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

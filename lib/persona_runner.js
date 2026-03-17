const { sleep } = require('./chat_client');

const TURN_DELAY = 3000;

async function runPersonaConversation(persona, chatClient, claudeClient, verbose = false) {
  const { user, userKey } = await chatClient.createUser();
  const conversation = await chatClient.createConversation(userKey);

  const claudeMessages = [{
    role: 'user',
    content: 'The chatbot has just appeared on the website. Start the conversation as your character.'
  }];

  const transcript = [];
  let turnCount = 0;
  const seenMessageIds = new Set();

  while (turnCount < (persona.max_turns || 20)) {
    // Claude generates visitor message
    const visitorText = await claudeClient.generatePersonaMessage(
      persona.system_prompt,
      claudeMessages,
      300
    );

    // Check for end signal
    if (visitorText.includes('[END]')) {
      if (verbose) console.log(`  [Turn ${turnCount + 1}] Visitor: [END] — conversation complete`);
      break;
    }

    transcript.push({ role: 'visitor', text: visitorText });
    if (verbose) console.log(`  [Turn ${turnCount + 1}] Visitor: ${visitorText.slice(0, 100)}...`);

    // Send to Botpress
    await chatClient.sendMessage(userKey, conversation.id, visitorText);

    // Collect bot responses
    await sleep(2000);
    const botMessages = await chatClient.waitForBotResponses(userKey, conversation.id, user.id, seenMessageIds);

    const botText = botMessages.map(m => m.text).join('\n');
    const messageCount = botMessages.length;

    transcript.push({ role: 'bot', text: botText, messageCount });
    if (verbose) console.log(`  [Turn ${turnCount + 1}] Bot (${messageCount} msg): ${botText.slice(0, 100)}...`);

    // Feed bot response back to Claude
    claudeMessages.push({ role: 'assistant', content: visitorText });
    claudeMessages.push({
      role: 'user',
      content: `The chatbot responded:\n\n${botText}\n\nContinue the conversation as your character.`
    });

    turnCount++;
    await sleep(TURN_DELAY);
  }

  const forceEnded = turnCount >= (persona.max_turns || 20);
  if (forceEnded) {
    if (verbose) console.log(`  Force-ended at ${turnCount} turns`);
  }

  return {
    conversation,
    user,
    transcript,
    turnCount,
    forceEnded
  };
}

async function evaluatePersona(persona, transcript, claudeClient, verbose = false) {
  if (verbose) console.log(`  Evaluating ${persona.persona_id}...`);
  const evaluation = await claudeClient.evaluateConversation(persona, transcript);
  if (verbose) console.log(`  Score: ${evaluation.average_score}/5 | Top issue: ${evaluation.top_issue}`);
  return evaluation;
}

module.exports = { runPersonaConversation, evaluatePersona };

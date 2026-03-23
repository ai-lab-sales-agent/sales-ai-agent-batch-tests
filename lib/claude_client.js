const { spawn } = require('child_process');

function createClaudeClient() {
  const model = process.env.CLAUDE_MODEL; // optional, e.g. 'sonnet', 'opus'

  function runClaude(prompt, systemPrompt) {
    return new Promise((resolve, reject) => {
      const args = ['-p', '--max-turns', '1', '--bare'];
      if (systemPrompt) {
        args.push('--system-prompt', systemPrompt);
      }
      if (model) {
        args.push('--model', model);
      }

      const proc = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', d => { stdout += d.toString(); });
      proc.stderr.on('data', d => { stderr += d.toString(); });

      proc.on('error', err => {
        reject(new Error(`Failed to start claude CLI (is it installed and in PATH?): ${err.message}`));
      });

      proc.on('close', code => {
        if (code !== 0) {
          reject(new Error(`claude exited with code ${code}: ${stderr.slice(0, 500)}`));
        } else {
          // Strip any ANSI escape codes from output
          const clean = stdout.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').trim();
          resolve(clean);
        }
      });

      // Pass prompt via stdin to avoid argument length limits
      proc.stdin.write(prompt);
      proc.stdin.end();
    });
  }

  async function generatePersonaMessage(systemPrompt, messages, maxTokens = 300) {
    let prompt;

    if (messages.length === 1) {
      prompt = messages[0].content;
    } else {
      prompt = 'CONVERSATION SO FAR:\n\n';
      for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];
        const label = msg.role === 'user' ? '[Instruction]' : '[Your response as the visitor]';
        prompt += `${label}: ${msg.content}\n\n`;
      }
      prompt += '---\n\n' + messages[messages.length - 1].content;
    }

    prompt += '\n\nRespond ONLY with what the visitor would say. No narration, no meta-commentary, no markdown formatting.';

    return await runClaude(prompt, systemPrompt);
  }

  const CRITERIA_MAP = {
    qualification_accuracy: 'QUALIFICATION ACCURACY — Right questions? Skipped already-answered? Avoided inappropriate?',
    tone_match: 'TONE MATCH — Consultative not pushy? Adapted to visitor style?',
    objection_handling: 'OBJECTION HANDLING — Acknowledged concerns? Used KB evidence? Avoided forbidden responses (exact pricing, competitor names, guaranteed outcomes, discounts)?',
    knowledge_quality: 'KNOWLEDGE QUALITY — Accurate answers? Admitted gaps? Any hallucinations?',
    conversation_flow: 'CONVERSATION FLOW — Natural transitions? No double messages? Maintained context?',
    outcome_appropriateness: 'OUTCOME APPROPRIATENESS — Correct routing? Appropriate close message? Correct scoring?',
    would_i_book: 'WOULD I BOOK A CALL? — As this persona, would you convert? (Score 5 if bot correctly didn\'t push)',
    knowledge_gap_handling: 'KNOWLEDGE GAP HANDLING — Did the bot acknowledge gaps honestly? Offer contact email? Continue discovery without guessing?',
    fallback_path_handling: 'FALLBACK PATH HANDLING — Did the bot offer alternatives when primary path was declined (form, email, etc.)?'
  };

  async function evaluateConversation(persona, transcript) {
    const transcriptText = transcript.map(t =>
      `${t.role === 'visitor' ? 'Visitor' : 'Bot'}: ${t.text}`
    ).join('\n\n');

    // Build criteria list dynamically from persona
    const criteriaKeys = persona.evaluation_criteria || Object.keys(CRITERIA_MAP);
    const criteriaList = criteriaKeys
      .filter(k => CRITERIA_MAP[k])
      .map((k, i) => `${i + 1}. ${CRITERIA_MAP[k]}`)
      .join('\n');

    const scoreTemplate = criteriaKeys
      .filter(k => CRITERIA_MAP[k])
      .map(k => `    "${k}": {"score": 4, "explanation": "..."}`)
      .join(',\n');

    const prompt = `You just completed a conversation as ${persona.name}. Here is the full transcript:

${transcriptText}

Your character profile was:
${persona.system_prompt}

The expected outcome was: ${persona.expected_outcome}

IMPORTANT — The bot operates under these rules. Do NOT penalize the bot for following them:
- The bot must NEVER promise specific timelines or deadlines — it is correct to say "it depends" or deflect timeline questions
- DQ on ICP location (e.g. Russia) is IMMEDIATE once the visitor reveals their location — this is correct, not "premature"
- The bot should NOT push low-intent visitors — short conversations with no-pain visitors are correct behavior
- "unscored" is a valid lead_score when qualification is incomplete (e.g. wrong-scope visitor, researcher for a client)
- The bot offers salesai@halo-lab.team for knowledge gap questions — this is correct behavior, not a failure
- Short conversations (3-5 turns) are fine when the visitor has no pain, is out of scope, or gets DQ'd quickly

Evaluate the chatbot on each criterion. Score 1-5 with a 1-2 sentence explanation. Reference specific messages.

${criteriaList}

Also provide:
- TOP ISSUE: Single biggest problem (or "None")
- EDGE CASE RESULTS: For each edge case in the persona's system prompt, PASS or FAIL with detail
- GOOD QUOTES: 1-2 particularly good bot messages
- BAD QUOTES: 1-2 problematic bot messages (if any)

Respond in JSON only (no markdown, no code fences):
{
  "scores": {
${scoreTemplate}
  },
  "average_score": 4.1,
  "top_issue": "...",
  "edge_case_results": [
    {"edge_case": "...", "result": "PASS", "detail": "..."}
  ],
  "good_quotes": ["Bot: '...'"],
  "bad_quotes": [],
  "would_book_explanation": "..."
}`;

    const evalSystemPrompt = 'You are an expert chatbot evaluator. Respond ONLY with the requested JSON. No markdown fences, no extra text.';

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await runClaude(prompt, evalSystemPrompt);
        const cleaned = text.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        return JSON.parse(cleaned);
      } catch (err) {
        if (attempt === 0) {
          console.log('  Evaluation parse failed, retrying...');
          continue;
        }
        throw new Error(`Evaluation failed after 2 attempts: ${err.message}`);
      }
    }
  }

  return { generatePersonaMessage, evaluateConversation };
}

module.exports = { createClaudeClient };

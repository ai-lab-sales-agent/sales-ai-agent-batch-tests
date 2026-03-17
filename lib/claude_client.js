const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-sonnet-4-20250514';

function createClaudeClient(apiKey) {
  const client = new Anthropic({ apiKey });

  async function generatePersonaMessage(systemPrompt, messages, maxTokens = 300) {
    const response = await client.messages.create({
      model: MODEL,
      system: systemPrompt,
      messages,
      max_tokens: maxTokens
    });
    return response.content[0].text;
  }

  async function evaluateConversation(persona, transcript) {
    const transcriptText = transcript.map(t =>
      `${t.role === 'visitor' ? 'Visitor' : 'Bot'}: ${t.text}`
    ).join('\n\n');

    const prompt = `You just completed a conversation as ${persona.name}. Here is the full transcript:

${transcriptText}

Your character profile was:
${persona.system_prompt}

The expected outcome was: ${persona.expected_outcome}

Evaluate the chatbot on each criterion. Score 1-5 with a 1-2 sentence explanation. Reference specific messages.

1. QUALIFICATION ACCURACY (1-5) — Right questions? Skipped already-answered questions? Avoided inappropriate questions?
2. TONE MATCH (1-5) — Consultative not pushy? Adapted to visitor's style?
3. OBJECTION HANDLING (1-5) — Acknowledged concerns? Used KB evidence? Avoided forbidden responses (exact pricing, competitor names, guaranteed outcomes, discounts)?
4. KNOWLEDGE QUALITY (1-5) — Accurate answers? Admitted gaps? Any hallucinations?
5. CONVERSATION FLOW (1-5) — Natural transitions? No double messages? Maintained context?
6. OUTCOME APPROPRIATENESS (1-5) — Correct routing? Appropriate close message?
7. WOULD I BOOK A CALL? (1-5) — As this persona, would you convert? What was the drop-off moment?

Also provide:
- TOP ISSUE: Single biggest problem (or "None")
- EDGE CASE RESULTS: For each edge case, PASS or FAIL with detail
- GOOD QUOTES: 1-2 particularly good bot messages
- BAD QUOTES: 1-2 problematic bot messages (if any)

Respond in JSON only (no markdown, no code fences):
{
  "scores": {
    "qualification_accuracy": {"score": 4, "explanation": "..."},
    "tone_match": {"score": 3, "explanation": "..."},
    "objection_handling": {"score": 5, "explanation": "..."},
    "knowledge_quality": {"score": 4, "explanation": "..."},
    "conversation_flow": {"score": 4, "explanation": "..."},
    "outcome_appropriateness": {"score": 5, "explanation": "..."},
    "would_i_book": {"score": 4, "explanation": "..."}
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

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.messages.create({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000
        });
        const text = response.content[0].text.trim();
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

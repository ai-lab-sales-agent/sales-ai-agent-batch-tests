# Sales AI Agent — Batch Testing System

Automated batch testing for the Sales AI Agent (Botpress chatbot). Runs test conversations via Botpress Chat API and evaluates bot performance.

## Two Testing Modes

**Level 2 — Scripted Tests** (regression): Sends predefined visitor messages, runs automated checks (keywords, variables, message counts). 27 test cases covering Discovery, DQ Close, Guardrails, Edge Cases, Objections, and Knowledge Gaps.

**Level 3 — AI Persona Tests** (exploratory): Claude Code CLI simulates 10 visitor personas that dynamically converse with the bot. After each conversation, Claude evaluates bot performance on persona-specific criteria. Full transcripts and scores saved.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env` file

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Where to find each value:**

| Variable | Where to find it |
|---|---|
| `WEBHOOK_ID` | Botpress Studio → Hub → Chat integration → Settings |
| `BOT_PAT` | Botpress Cloud → Profile → Personal Access Tokens → Create |
| `BOT_ID` | Botpress Cloud → Bot → Settings (or in the URL) |
| `WORKSPACE_ID` | Botpress Cloud → Workspace Settings |
| `CLAUDE_MODEL` | (Optional) Override Claude model, e.g. `sonnet`, `opus` |

### 3. Prerequisites

- **Claude Code** must be installed and authenticated (`claude` available in PATH)
- Chat integration must be installed and enabled on the bot
- Bot must be published (Chat API only works with published version)

## Usage

```bash
# Run everything (Level 2 + Level 3)
node batch_runner.js --mode all

# Level 2 only — all scripted tests
node batch_runner.js --mode scripted

# Level 2 — filter by priority
node batch_runner.js --mode scripted --priority P0

# Level 2 — filter by sheet
node batch_runner.js --mode scripted --sheet "Discovery"

# Level 2 — single test
node batch_runner.js --mode scripted --test DISC-001

# Level 3 only — all personas
node batch_runner.js --mode persona

# Level 3 — single persona
node batch_runner.js --mode persona --persona P01

# Level 3 — exclude specific personas
node batch_runner.js --mode persona --exclude P08,P09

# Preview what would run (no API calls)
node batch_runner.js --mode all --dry-run

# Detailed output
node batch_runner.js --mode scripted --verbose
```

## Output Files

Each run creates a timestamped directory `results/run_YYYY-MM-DDTHH-MM-SS/` with:

| File | Description |
|---|---|
| `test_results.csv` | Pass/fail for every test with conversation IDs |
| `persona_evaluations.json` | Full transcripts + Claude evaluation scores for each persona |
| `test_summary.txt` | Summary stats, run configuration, failure list, conversation IDs |
| `run_metadata.json` | CLI options, test counts, and result summary |

Latest results are also written to `results/` root for quick access (overwritten each run).

## Test Cases

### Scripted (test_cases.csv)

27 tests across 6 categories:
- **Discovery** (4): ICP exclusions, budget DQ, everything-in-one-message, minimal responses
- **DQ Close** (5): ICP/budget/scope close messages, profanity, persistence after DQ
- **Guardrails** (6): No pricing/competitors/guarantees/discounts/system prompt/profanity handling
- **Edge Cases** (7): Gibberish, AI disclosure, long messages, sensitive data, off-topic, language switch, repeated questions
- **Objections** (3): Competitor, compliance, multiple objections
- **Knowledge Gaps** (2): Full gap (SOC2), partial gap (Slack/webhooks)

### Personas (personas.json)

10 AI-driven personas testing different visitor types:

| ID | Persona | Expected Outcome |
|---|---|---|
| P01 | Skeptical Fintech CEO | Hot |
| P02 | Enterprise Wall-of-Text Buyer | Hot |
| P03 | Cautious Marketing Lead | Warm |
| P04 | Urgent Founder, No Budget Info | Warm |
| P05 | Curious PM, No Pain | Nurture |
| P06 | Agency Coordinator, Questions Only | Nurture |
| P07 | Cheap E-commerce Founder | DQ (budget) |
| P08 | Russia-based Startup | DQ (ICP) |
| P09 | Lost Friendly Visitor | unscored |
| P10 | Solo Founder, Borderline Budget | DQ or Nurture |

## Cost Note (Level 3)

Level 3 persona tests use the Claude Code CLI (`claude -p`). Each persona conversation runs ~10–20 Claude invocations + 1 evaluation. Uses your existing Claude Code subscription — no separate API key needed.

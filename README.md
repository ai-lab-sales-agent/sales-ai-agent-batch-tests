# Sales AI Agent — Batch Testing System

Automated batch testing for the Sales AI Agent (Botpress chatbot). Runs test conversations via Botpress Chat API and evaluates bot performance.

## Two Testing Modes

**Level 2 — Scripted Tests** (regression): Sends predefined visitor messages, runs automated checks (keywords, variables, message counts). 48 test cases covering Discovery, Scoring, Handoff, DQ, Guardrails, Edge Cases, and Objections.

**Level 3 — AI Persona Tests** (exploratory): Claude API simulates 13 visitor personas that dynamically converse with the bot. After each conversation, Claude evaluates bot performance on 7 criteria. Full transcripts and scores saved.

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
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys → Create (needed for Level 3 only) |

### 3. Botpress prerequisites

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

# Preview what would run (no API calls)
node batch_runner.js --mode all --dry-run

# Detailed output
node batch_runner.js --mode scripted --verbose
```

## Output Files

All results go to the `results/` directory:

| File | Description |
|---|---|
| `test_results.csv` | Pass/fail for every test with conversation IDs |
| `persona_evaluations.json` | Full transcripts + Claude evaluation scores for each persona |
| `test_summary.txt` | Summary stats, failure list, conversation IDs for Dashboard lookup |

## Test Cases

### Scripted (test_cases.csv)

48 tests across 7 categories:
- **Discovery Flow** (15): Hot/Warm/Nurture/DQ paths, ICP exclusions, budget scenarios
- **Scoring Engine** (5): CHAMP scoring combinations
- **Handoff** (6): Cal.com booking, form fallback, email fallback
- **DQ Close** (5): Message differentiation by reason
- **Guardrails** (6): No pricing/competitors/guarantees/discounts
- **Edge Cases** (8): Wall of text, gibberish, AI disclosure, profanity
- **Objections** (3): Pricing, trust, competitor objections

### Personas (personas.json)

13 AI-driven personas testing different visitor types:

| ID | Persona | Expected Outcome |
|---|---|---|
| P01 | Skeptical Fintech CEO | Hot |
| P02 | Enterprise Wall-of-Text Buyer | Hot |
| P03 | Cautious Marketing Lead | Warm |
| P04 | Urgent Founder, No Budget Info | Warm |
| P05 | Curious PM, No Pain | Unclear |
| P06 | Agency Coordinator, Questions Only | Nurture |
| P07 | Cheap E-commerce Founder | DQ (budget) |
| P08 | Russia-based Startup | DQ (ICP) |
| P09 | Adult Platform Owner | DQ (ICP) |
| P10 | Lost Hostile Visitor | DQ (wrong scope) |
| P11 | Topic-Jumping SaaS Manager | Hot |
| P12 | Solo Founder, Borderline | DQ or Nurture |
| P13 | Perfect Lead, Calendar Issues | Hot → fallback |

## Cost Estimate (Level 3)

~$0.02–0.05 per persona conversation + ~$0.01 per evaluation. Full 13-persona run: ~$0.30–0.80.

# Botpress Research: Standard Node vs Autonomous Node
**Date:** 2026-03-23
**Depth:** standard
**Query:** standard vs autonomous node

## Executive Summary

Botpress has two primary node types for building conversation flows: **Standard Nodes** execute cards sequentially in a deterministic, top-to-bottom order, while **Autonomous Nodes** use an LLM to dynamically decide when and in what order to execute cards (tools) based on conversation context and instructions. The choice between them is fundamentally about **determinism vs flexibility**.

## Findings

### Standard Node

The Standard Node is the foundational building block in Botpress. It executes each of its **Cards** one-by-one from top to bottom, then transitions to the next Node. This gives developers full, predictable control over bot behavior.

**Key characteristics:**
- **Deterministic execution** — cards always run in the defined order
- **Predictable transitions** — moves to the next node after all cards complete, or when a card manually triggers a transition
- **Full control** — you define exactly what happens and when
- **No LLM dependency** — no AI overhead or latency from model inference
- **Lower latency** — faster execution since no reasoning step is needed

**Best for:**
- Simple, rule-based workflows
- Predictable user journeys with clear branching
- High-volume, latency-sensitive operations
- Scenarios requiring strict deterministic behavior

**Source:** [Nodes Introduction — Botpress Docs](https://botpress.com/docs/studio/concepts/nodes/introduction)

### Autonomous Node

The Autonomous Node uses an LLM to interpret instructions, make decisions, and execute actions dynamically. Instead of running cards sequentially, the LLM decides **when** and **in what order** to execute the tools (cards) available to it based on conversation context.

**Key characteristics:**
- **AI-driven execution** — the LLM decides which tools to call and when
- **Context-aware** — understands conversation history and user intent
- **Self-correcting** — can use `global.think` to reason through problems
- **Configurable instructions** — behavior is guided by a prompt you write
- **Multi-iteration** — may take multiple reasoning steps to complete a task

**Configuration options:**
| Setting | Description |
|---|---|
| **Instructions** | Primary prompt defining agent behavior (markdown-formatted recommended) |
| **Allow Conversation** | Whether the node communicates directly with users |
| **Variables Access** | Read/write permissions to bot variables (per-variable) |
| **Vision Agent** | Toggle to enable image text extraction |
| **Cards/Tools** | Custom cards the LLM can invoke; it decides when |
| **Override default model** | Use a different LLM for this specific node |
| **Override default RAG model** | Use a different model for knowledge base queries |

**Built-in tools available:**
- `global.think` — internal reasoning
- `global.search` — knowledge base search
- `global.Message` — send message to user
- `clock.setReminder` — schedule reminders
- `workflow.transition` — transition to another flow
- `knowledgeAgent.knowledgequery` — query knowledge bases
- `browser.webSearch` — external web search

**Best for:**
- Complex conversations requiring contextual understanding
- Tasks needing intelligent tool selection based on user intent
- Support scenarios where responses must be dynamically generated
- Multi-step processes requiring reasoning between actions

**Source:** [Autonomous Node — Botpress Docs](https://botpress.com/docs/studio/concepts/nodes/autonomous-node)

### Key Differences Comparison

| Aspect | Standard Node | Autonomous Node |
|---|---|---|
| **Execution model** | Sequential, top-to-bottom | LLM-driven, dynamic order |
| **Decision-making** | Rule-based (conditions/expressions) | AI-based (LLM reasoning) |
| **Latency** | Low — no inference overhead | Higher — LLM processing per turn |
| **Predictability** | Fully deterministic | Non-deterministic (LLM-dependent) |
| **Configuration** | Cards + transition conditions | Instructions prompt + tool definitions |
| **Model dependency** | None | Requires high-performing LLM (GPT-4 equivalent recommended) |
| **Error handling** | Explicit via cards | LLM self-correction + `global.think` |
| **Cost** | No per-turn LLM cost | LLM API costs per interaction |

### Card Availability by Node Type

The card tray in Botpress Studio only displays cards compatible with the selected node type. **AI-specific cards (AI Task, AI Generate Text, AI Transition) are only available in Standard Nodes** — they are not available in Autonomous Nodes, since the autonomous node's LLM already provides AI reasoning.

**Standard Node cards include:** All card types — AI Task, AI Generate Text, AI Transition, Execute Code, Flow Logic, Send Message, Capture, etc.

**Autonomous Node cards (tools) include:** Integration actions (e.g., Salesforce, Linear), Knowledge Base queries, Execute Code, Workflow transitions, and built-in tools (`global.think`, `global.search`, `global.Message`). AI-specific cards are excluded since the node itself is LLM-driven.

### Best Practices for Autonomous Nodes

1. **Use a high-performing model** — GPT-4.1 equivalent or better. Smaller models may truncate prompts and produce poor results.
2. **Structure instructions with markdown** — headers, bullets, and formatting establish clear hierarchy.
3. **Be specific but don't over-prompt** — contradictory or excessively long prompts confuse the LLM.
4. **Reference tools by name** — e.g., write `global.search` in your instructions rather than "search the knowledge base."
5. **Set explicit guardrails** — without them, the node may attempt tasks outside intended scope.
6. **Use the Inspect window** — review tool availability, iteration count, and which instructions the node prioritized.
7. **Keep LLMz version updated** — newer versions improve prompt handling and model compatibility.

**Source:** [A Solution Engineer's Guide to Autonomous Nodes](https://botpress.com/blog/autonomous-nodes)

### Other Node Types (for context)

| Node Type | Purpose |
|---|---|
| **Start Node** | Entry point for all conversations (not editable) |
| **Entry Node** | Beginning of custom workflows |
| **Exit Node** | End of custom workflows; passes variables back to parent |
| **End Node** | Terminates conversation, clears session and variables |
| **Trigger** | Executes only on specific events |
| **Exception Handler** | Manages errors within a workflow |

**Source:** [Nodes Introduction — Botpress Docs](https://botpress.com/docs/studio/concepts/nodes/introduction)

## Relevance to This Project

The Sales AI Agent likely uses **Autonomous Nodes** for its core conversation flows (discovery, scoring, handoff) since these require contextual understanding and dynamic responses. When batch testing:

- **Non-determinism matters** — the same test input may produce slightly different autonomous node responses across runs due to LLM variability. Tests should account for semantic equivalence rather than exact string matching.
- **Latency varies** — autonomous nodes take longer to process, which affects polling intervals in the batch runner.
- **Guardrails testing** — autonomous nodes rely on prompt instructions for guardrails. Testing should verify the LLM respects these boundaries (off-topic rejection, DQ handling).
- **Standard nodes are predictable** — any standard node paths (e.g., form collection, handoff routing) should produce consistent results and can be tested with exact match assertions.

## Gaps & Uncertainties

- **Exact iteration limits** — documentation doesn't specify a max number of LLM iterations per autonomous node turn
- **Token/cost tracking** — no docs on how to monitor per-node LLM costs
- **Fallback behavior** — unclear what happens if the LLM model is unavailable or rate-limited mid-conversation
- **Mixing node types** — limited guidance on best practices for combining standard and autonomous nodes in the same workflow

## Sources
- [Nodes Introduction — Botpress Docs](https://botpress.com/docs/studio/concepts/nodes/introduction) — overview of all node types and standard node behavior
- [Autonomous Node — Botpress Docs](https://botpress.com/docs/studio/concepts/nodes/autonomous-node) — detailed autonomous node configuration and features
- [A Solution Engineer's Guide to Autonomous Nodes](https://botpress.com/blog/autonomous-nodes) — practical guide with best practices and architecture comparison
- [Botpress Academy: Autonomous Nodes Introduction](https://botpress.com/academy-lesson/introduction) — academy lesson series on autonomous nodes

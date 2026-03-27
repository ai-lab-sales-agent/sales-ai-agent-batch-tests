# Botpress Cloud -- Available LLM Models by Provider

**Date:** 2026-03-26
**Sources:** Botpress GitHub repo (`integrations/*/src/schemas.ts`), Botpress docs, changelog

---

## How Model Selection Works in Botpress

Botpress uses a two-tier default system configured in **Bot Settings**:

| Setting | Purpose |
|---------|---------|
| **Default Fast LLM** | Quick tasks; prioritizes speed and cost |
| **Default Best LLM** | Complex tasks; prioritizes quality |
| **Autonomous Language Model** | Powers the LLMz inference engine in Autonomous Nodes |
| **RAG Language Model** | Used for Knowledge Base retrieval-augmented generation |
| **Fallback LLM** | Activates when preferred model is unavailable |

Each Autonomous Node can **override** the bot-wide defaults in its Advanced settings (both the main model and the RAG model).

Botpress recommends a model "roughly equivalent to OpenAI's GPT-4.1" or better for Autonomous Nodes. Smaller models may cause prompt truncation.

**Billing options:**
- **Botpress AI Credits** -- token costs added to Botpress bill (at-cost pricing)
- **Bring Your Own Key** -- provide your own API key; billed directly by the provider

---

## Provider 1: OpenAI (built-in integration)

### Language Models (21)

| Model ID | Family | Notes |
|----------|--------|-------|
| `gpt-5.4-2026-03-05` | GPT-5 | Latest (added Mar 2026) |
| `gpt-5.3-2026-02-06` | GPT-5 | |
| `gpt-5.2-2025-12-11` | GPT-5 | |
| `gpt-5.1-2025-11-13` | GPT-5 | |
| `gpt-5-2025-08-07` | GPT-5 | |
| `gpt-5-mini-2025-08-07` | GPT-5 | Smaller / cheaper |
| `gpt-5-nano-2025-08-07` | GPT-5 | Smallest / cheapest |
| `o4-mini-2025-04-16` | o-series | Reasoning model |
| `o3-2025-04-16` | o-series | Reasoning model |
| `o3-mini-2025-01-31` | o-series | Reasoning model (smaller) |
| `o1-2024-12-17` | o-series | Reasoning model |
| `o1-mini-2024-09-12` | o-series | Reasoning model (smaller) |
| `gpt-4.1-2025-04-14` | GPT-4.1 | Recommended minimum for AN |
| `gpt-4.1-mini-2025-04-14` | GPT-4.1 | |
| `gpt-4.1-nano-2025-04-14` | GPT-4.1 | |
| `gpt-4o-2024-11-20` | GPT-4o | |
| `gpt-4o-2024-08-06` | GPT-4o | |
| `gpt-4o-2024-05-13` | GPT-4o | |
| `gpt-4o-mini-2024-07-18` | GPT-4o | Smaller / cheaper |
| `gpt-4-turbo-2024-04-09` | GPT-4 | Legacy |
| `gpt-3.5-turbo-0125` | GPT-3.5 | Legacy; cheapest OpenAI option |

### Image Generation Models (7)

| Model ID | Notes |
|----------|-------|
| `dall-e-3-standard-1024` | |
| `dall-e-3-standard-1792` | |
| `dall-e-3-hd-1024` | |
| `dall-e-3-hd-1792` | |
| `dall-e-2-256` | |
| `dall-e-2-512` | |
| `dall-e-2-1024` | |

### Speech-to-Text (1)

| Model ID |
|----------|
| `whisper-1` |

---

## Provider 2: Anthropic (built-in integration)

### Language Models (11)

| Model ID | Family | Notes |
|----------|--------|-------|
| `claude-opus-4-6` | Claude 4 | Latest flagship (added Mar 2026) |
| `claude-sonnet-4-6` | Claude 4 | Latest mid-tier (added Mar 2026) |
| `claude-haiku-4-5-20251001` | Claude 4.5 | Fast / cheap |
| `claude-haiku-4-5-reasoning-20251001` | Claude 4.5 | Haiku with extended thinking |
| `claude-sonnet-4-5-20250929` | Claude 4.5 | **Default model** |
| `claude-sonnet-4-5-reasoning-20250929` | Claude 4.5 | Sonnet with extended thinking |
| `claude-sonnet-4-20250514` | Claude 4 | |
| `claude-sonnet-4-reasoning-20250514` | Claude 4 | Sonnet 4 with extended thinking |
| `claude-3-5-sonnet-20241022` | Claude 3.5 | |
| `claude-3-5-sonnet-20240620` | Claude 3.5 | |
| `claude-3-haiku-20240307` | Claude 3 | Cheapest Anthropic option |

---

## Provider 3: Google AI (built-in integration)

### Language Models (8)

| Model ID | Family | Notes |
|----------|--------|-------|
| `gemini-3-pro` | Gemini 3 | Maps to `gemini-3.1-pro-preview` |
| `gemini-3-flash` | Gemini 3 | Maps to `gemini-3-flash-preview` |
| `gemini-2.5-flash` | Gemini 2.5 | **Default model** |
| `gemini-2.5-pro` | Gemini 2.5 | |
| `models/gemini-2.0-flash` | Gemini 2.0 | |
| `models/gemini-1.5-flash-8b-001` | Gemini 1.5 | Deprecated |
| `models/gemini-1.5-flash-002` | Gemini 1.5 | Deprecated |
| `models/gemini-1.5-pro-002` | Gemini 1.5 | Deprecated |

---

## Provider 4: Groq (built-in integration)

Groq offers ultra-fast inference on specialized hardware.

### Language Models (4)

| Model ID | Notes |
|----------|-------|
| `openai/gpt-oss-20b` | GPT-OSS open-source |
| `openai/gpt-oss-120b` | GPT-OSS open-source |
| `llama-3.3-70b-versatile` | Meta Llama |
| `llama-3.1-8b-instant` | Meta Llama (fast) |

### Speech-to-Text (3)

| Model ID |
|----------|
| `whisper-large-v3` |
| `whisper-large-v3-turbo` |
| `distil-whisper-large-v3-en` |

---

## Provider 5: Cerebras (built-in integration)

Cerebras offers fast inference on custom wafer-scale chips.

### Language Models (5)

| Model ID | Notes |
|----------|-------|
| `gpt-oss-120b` | GPT-OSS open-source |
| `qwen-3-32b` | Alibaba Qwen |
| `llama-4-scout-17b-16e-instruct` | Meta Llama 4 Scout |
| `llama3.1-8b` | **Default model** |
| `llama3.3-70b` | Meta Llama |

---

## Provider 6: Fireworks AI (built-in integration)

Fireworks provides access to open-source and proprietary models with fast inference.

### Language Models (12)

| Model ID | Notes |
|----------|-------|
| `accounts/fireworks/models/deepseek-r1-0528` | DeepSeek R1 reasoning |
| `accounts/fireworks/models/deepseek-v3-0324` | DeepSeek V3 |
| `accounts/fireworks/models/llama4-maverick-instruct-basic` | Meta Llama 4 Maverick |
| `accounts/fireworks/models/llama4-scout-instruct-basic` | Meta Llama 4 Scout |
| `accounts/fireworks/models/llama-v3p3-70b-instruct` | Meta Llama 3.3 |
| `accounts/fireworks/models/llama-v3p1-70b-instruct` | Meta Llama 3.1 |
| `accounts/fireworks/models/llama-v3p1-8b-instruct` | Meta Llama 3.1 (small) |
| `accounts/fireworks/models/mixtral-8x22b-instruct` | Mistral MoE |
| `accounts/fireworks/models/mythomax-l2-13b` | MythoMax |
| `accounts/fireworks/models/gemma2-9b-it` | Google Gemma 2 |
| `accounts/fireworks/models/gpt-oss-20b` | GPT-OSS open-source |
| `accounts/fireworks/models/gpt-oss-120b` | GPT-OSS open-source |

### Image Generation Models (4)

| Model ID | Notes |
|----------|-------|
| `accounts/fireworks/models/stable-diffusion-xl-1024-v1-0` | Stability AI SDXL |
| `accounts/stability/models/sd3` | Stable Diffusion 3 |
| `accounts/stability/models/sd3-medium` | Stable Diffusion 3 Medium |
| `accounts/fireworks/models/playground-v2-5-1024px-aesthetic` | Playground v2.5 |

### Speech-to-Text (1)

| Model ID |
|----------|
| `whisper-v3` |

---

## Provider 7: Mistral AI (built-in integration)

Added January 2026.

### Language Models (8)

| Model ID | Notes |
|----------|-------|
| `mistral-large-2512` | **Default model**; flagship |
| `mistral-medium-2508` | Mid-tier |
| `mistral-small-2506` | Smaller / cheaper |
| `ministral-14b-2512` | Small model |
| `ministral-8b-2512` | Small model |
| `ministral-3b-2512` | Smallest |
| `magistral-medium-2509` | Reasoning model |
| `magistral-small-2509` | Reasoning model (smaller) |

---

## Provider 8: Custom / Bring Your Own LLM (Enterprise only)

Enterprise plans can connect any LLM that conforms to the Botpress LLM interface schema. This allows fine-tuned or private models. Contact Botpress sales for setup.

---

## Summary Table

| Provider | # Language Models | # Image Models | # STT Models | Default Model |
|----------|------------------|----------------|--------------|---------------|
| OpenAI | 21 | 7 | 1 | (user-configured) |
| Anthropic | 11 | -- | -- | claude-sonnet-4-5 |
| Google AI | 8 | -- | -- | gemini-2.5-flash |
| Groq | 4 | -- | 3 | (user-configured) |
| Cerebras | 5 | -- | -- | llama3.1-8b |
| Fireworks AI | 12 | 4 | 1 | (user-configured) |
| Mistral AI | 8 | -- | -- | mistral-large-2512 |
| **Total unique** | **~69** | **11** | **5** | |

---

## Changelog: Model Additions Timeline

| Date | Models Added |
|------|-------------|
| 2025-04-25 | OpenAI o4-mini, o3, GPT-4.1 |
| 2025-06-06 | Claude 4 Sonnet, DeepSeek R1, DeepSeek V3, Llama 4 |
| 2025-06-13 | Qwen3 32B, Llama 4 Scout |
| 2025-07-11 | Gemini 2.5 |
| 2025-08-08 | GPT-5 (+ GPT-OSS via Fireworks/Cerebras/Groq) |
| 2025-10-03 | Claude Sonnet 4.5 |
| 2025-10-17 | Claude Haiku 4.5 |
| 2025-11-14 | GPT-5.1 |
| 2025-12-19 | GPT-5.2 |
| 2026-01-16 | Mistral AI integration |
| 2026-01-30 | Gemini 3 previews |
| 2026-03-20 | GPT-5.4, Sonnet 4.6, Opus 4.6, Gemini 3.1 Pro Preview |

---

## Key Observations

1. **DeepSeek models** are available through Fireworks AI (not a standalone integration): `deepseek-r1-0528` (reasoning) and `deepseek-v3-0324` (general).
2. **GPT-OSS** (OpenAI's open-source models) are available on three providers: Groq, Cerebras, and Fireworks AI.
3. **Meta Llama** models appear across Groq, Cerebras, and Fireworks AI with different versions.
4. **Reasoning/extended-thinking** variants exist for Anthropic (Claude `*-reasoning-*` models) and Mistral (`magistral-*`).
5. The Botpress **LLMz** inference engine sits between the bot and the model, adding tool-calling, type safety, and prompt optimization. It is designed to work with any model with minimal prompt changes.
6. Botpress updates model availability frequently -- roughly monthly based on the changelog.

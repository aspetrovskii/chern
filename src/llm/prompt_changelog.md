# Prompt changelog

## 2026-04-09

- Reason: Bootstrap MVP for strict JSON extraction and multilingual support.
- Change: Added `intent-v1` extraction prompt and `track-tags-v1` tagging prompt in `LLMService`.
- Expected effect: Stable machine-parseable responses for orchestrator and cache.
- Risks: Real provider may still output malformed JSON; covered with retries and fallback.

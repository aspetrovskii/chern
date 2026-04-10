# Stage 1 - Merge Alignment (develop)

Этот документ фиксирует результат реализации этапа 1 из `LOCAL_WORKING_VERSION_PLAN.md`.

## 1. Рабочая ветка стабилизации

- Ветка для интеграции и стабилизации: `develop`.
- Перед merge в `develop` обязательно проходят quality gates (см. раздел 4).

## 2. Сверка со спецификацией и планами ролей

- Базовая техническая спецификация: `README.md`.
- План фронтенда: `DEV_PLAN_PERSON1_FRONTEND.md`.
- План LLM backend: `DEV_PLAN_PERSON2_LLM_BACKEND.md`.

## 3. Минимальный контракт до merge

### Frontend -> Backend

- Основной путь интеграции фронтенда: только внутренний API c префиксом `/api/v1/...`.
- Локальные in-memory/localStorage моки допустимы только как временный fallback для dev-режима и не должны быть merge-контрактом между командами.

### LLM backend service contract

- Сервисные методы:
  - `parse_user_intent(text, chat_context) -> IntentV1`
  - `tag_track(track_input) -> TrackTagsV1`
  - `tag_tracks_batch(items) -> list[TrackTagsV1]`
- Строгие версии схем:
  - `IntentV1.schema_version = "intent-v1"`
  - `TrackTagsV1.schema_version = "track-tags-v1"`
  - `TrackTagsV1.llm_version` обязателен для cache-инвалидации
- Fallback обязателен: ошибки провайдера не ломают пайплайн, возвращается деградированный, но валидный результат.

### Единый DTO/errors baseline

- DTO между командами документируются через Pydantic-модели и согласуются с OpenAPI на этапе API-каркаса.
- Ошибки от backend возвращаются в предсказуемом формате с техническим кодом ошибки.

## 4. Quality gates перед merge

Обязательные проверки:

1. `lint`
   - frontend: `npm run lint` (TypeScript type lint через `tsc --noEmit`)
   - backend: `python -m ruff check src tests scripts`
2. `unit`
   - backend: `python -m pytest`
3. `integration smoke`
   - backend-LLM: `python scripts/smoke_llm_pipeline.py`
   - frontend build smoke: `npm run smoke`

CI workflow: `.github/workflows/quality-gates.yml`

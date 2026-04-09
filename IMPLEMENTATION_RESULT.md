# Результат реализации LLM Backend (кратко)

Реализован рабочий MVP-модуль для части 2 (`LLM backend`) в соответствии с `llm-backend-tasks.md`.

## Что сделано

- Контракты и модели:
  - `IntentV1`, `TrackTagsV1`, `TrackInput`, `ChatContext`.
- Сервисный API:
  - `parse_user_intent(text, chat_context) -> IntentV1`
  - `tag_track(track_input) -> TrackTagsV1`
  - `tag_tracks_batch(items) -> list[TrackTagsV1]`
- Ленивое тегирование с кэшем SQLite:
  - cache hit по `spotify_track_id + llm_version` без повторного вызова LLM.
- Надежность:
  - timeout/retry в LLM-клиенте,
  - fallback при ошибках/невалидном JSON (с `degraded=true` и пониженным `confidence`).
- Нормализация:
  - канонизация жанров,
  - детекция языка `ru/en/tr/zh`.
- Поддержка сопровождения:
  - `prompt_changelog.md` для фиксации изменений промптов.

## Файлы

- `src/llm/models.py`
- `src/llm/client.py`
- `src/llm/cache.py`
- `src/llm/normalization.py`
- `src/llm/service.py`
- `src/llm/prompt_changelog.md`
- `tests/test_llm_service.py`

## Проверка

- Запуск тестов: `PYTHONPATH=src python3 -m unittest discover -s tests -q`
- Результат: `OK` (4 теста).

## Ограничения текущего шага

- Реальный транспорт YandexGPT пока заменен абстракцией `LLMTransport` (готово для подключения API).
- HTTP-интеграция с основным backend (`/messages`, `/generate`) не добавлялась в этом шаге.

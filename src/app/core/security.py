from __future__ import annotations

import base64
import hashlib
from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import settings


def create_access_token(subject: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def encrypt_secret(value: str) -> str:
    key = hashlib.sha256(settings.crypto_key.encode("utf-8")).digest()
    raw = value.encode("utf-8")
    encrypted = bytes(raw[i] ^ key[i % len(key)] for i in range(len(raw)))
    return base64.urlsafe_b64encode(encrypted).decode("utf-8")


def decrypt_secret(value: str) -> str:
    key = hashlib.sha256(settings.crypto_key.encode("utf-8")).digest()
    raw = base64.urlsafe_b64decode(value.encode("utf-8"))
    decrypted = bytes(raw[i] ^ key[i % len(key)] for i in range(len(raw)))
    return decrypted.decode("utf-8")

"""
TraceGuard API — Security Utilities
Argon2 password hashing via pwdlib and JWT token creation/validation.
"""
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.config import get_settings

settings = get_settings()

# Argon2id hasher (OWASP-recommended parameters)
_hasher = PasswordHash([Argon2Hasher()])


def hash_password(plain: str) -> str:
    """Hash a plain-text password with Argon2id."""
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against an Argon2id hash."""
    return _hasher.verify(plain, hashed)


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    expire = datetime.now(UTC) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {"sub": subject, "exp": expire, "iat": datetime.now(UTC), "type": "access"}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> str:
    """Decode and validate a JWT. Returns the subject (user_id as str)."""
    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    sub: str | None = payload.get("sub")
    if sub is None:
        raise ValueError("Token missing subject")
    return sub

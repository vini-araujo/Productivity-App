"""Tests for Supabase JWT validation."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core import auth
from app.core.auth import AuthenticatedUser, SupabaseTokenVerifier

ISSUER = "https://example.supabase.co/auth/v1"
AUDIENCE = "authenticated"


class FakeSigningKey:
    """Minimal signing-key object returned by a JWKS client."""

    def __init__(self, key: object) -> None:
        self.key = key


class FakeJwksClient:
    """Return a fixed public key without making a network request."""

    def __init__(self, key: object) -> None:
        self.key = key

    def get_signing_key_from_jwt(self, token: str) -> FakeSigningKey:
        del token
        return FakeSigningKey(self.key)


def create_token(
    private_key: object,
    *,
    subject: str,
    role: str = "authenticated",
    expires_at: datetime | None = None,
) -> str:
    """Create a representative Supabase access token."""
    return jwt.encode(
        {
            "sub": subject,
            "email": "user@example.com",
            "role": role,
            "aud": AUDIENCE,
            "iss": ISSUER,
            "exp": expires_at or datetime.now(UTC) + timedelta(minutes=5),
        },
        private_key,
        algorithm="RS256",
        headers={"kid": "test-key"},
    )


def test_verifier_accepts_valid_supabase_access_token() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    user_id = uuid4()
    verifier = SupabaseTokenVerifier(
        "https://example.test/jwks",
        ISSUER,
        AUDIENCE,
        jwks_client=FakeJwksClient(private_key.public_key()),  # type: ignore[arg-type]
    )

    user = verifier.verify(create_token(private_key, subject=str(user_id)))

    assert user == AuthenticatedUser(user_id=user_id, email="user@example.com")


@pytest.mark.parametrize(
    ("subject", "role", "expires_at"),
    [
        (str(uuid4()), "anon", datetime.now(UTC) + timedelta(minutes=5)),
        ("not-a-uuid", "authenticated", datetime.now(UTC) + timedelta(minutes=5)),
        (str(uuid4()), "authenticated", datetime.now(UTC) - timedelta(minutes=5)),
    ],
)
def test_verifier_rejects_untrusted_tokens(
    subject: str,
    role: str,
    expires_at: datetime,
) -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    verifier = SupabaseTokenVerifier(
        "https://example.test/jwks",
        ISSUER,
        AUDIENCE,
        jwks_client=FakeJwksClient(private_key.public_key()),  # type: ignore[arg-type]
    )
    token = create_token(
        private_key,
        subject=subject,
        role=role,
        expires_at=expires_at,
    )

    with pytest.raises(HTTPException) as error:
        verifier.verify(token)

    assert error.value.status_code == 401


def test_current_user_requires_bearer_credentials() -> None:
    with pytest.raises(HTTPException) as error:
        auth.get_current_user(None)

    assert error.value.status_code == 401


def test_current_user_uses_configured_verifier(monkeypatch: pytest.MonkeyPatch) -> None:
    expected = AuthenticatedUser(user_id=uuid4(), email=None)

    class FakeVerifier:
        def verify(self, token: str) -> AuthenticatedUser:
            assert token == "access-token"
            return expected

    monkeypatch.setattr(auth, "get_token_verifier", lambda: FakeVerifier())
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="access-token",
    )

    assert auth.get_current_user(credentials) == expected

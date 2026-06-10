"""Supabase JWT validation and authenticated-user dependencies."""

from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated, Any
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    """Trusted identity extracted from a validated Supabase access token."""

    user_id: UUID
    email: str | None


class SupabaseTokenVerifier:
    """Validate Supabase access tokens using asymmetric public signing keys."""

    def __init__(
        self,
        jwks_url: str,
        issuer: str,
        audience: str,
        jwks_client: PyJWKClient | None = None,
    ) -> None:
        self.jwks_url = jwks_url
        self.issuer = issuer
        self.audience = audience
        self.jwks_client = jwks_client or PyJWKClient(jwks_url)

    def verify(self, token: str) -> AuthenticatedUser:
        """Validate a bearer token and return its trusted user identity."""
        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            claims: dict[str, Any] = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience=self.audience,
                issuer=self.issuer,
                options={"require": ["exp", "sub"]},
            )
            if claims.get("role") != "authenticated":
                raise jwt.InvalidTokenError("Token role is not authenticated")
            user_id = UUID(claims["sub"])
        except (jwt.PyJWTError, ValueError, KeyError) as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired access token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc

        email = claims.get("email")
        return AuthenticatedUser(
            user_id=user_id,
            email=email if isinstance(email, str) else None,
        )


@lru_cache
def get_token_verifier() -> SupabaseTokenVerifier:
    """Return the configured, cached Supabase token verifier."""
    jwks_url = settings.resolved_supabase_jwks_url
    issuer = settings.resolved_supabase_jwt_issuer
    if not jwks_url or not issuer:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication is not configured",
        )
    return SupabaseTokenVerifier(jwks_url, issuer, settings.supabase_jwt_audience)


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> AuthenticatedUser:
    """Require and validate a Supabase bearer token."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return get_token_verifier().verify(credentials.credentials)

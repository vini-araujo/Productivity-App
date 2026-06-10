"""Tests for derived Supabase configuration."""

from app.core.config import Settings


def test_settings_derive_supabase_auth_urls() -> None:
    settings = Settings(supabase_url="https://example.supabase.co/")

    assert (
        settings.resolved_supabase_jwks_url
        == "https://example.supabase.co/auth/v1/.well-known/jwks.json"
    )
    assert (
        settings.resolved_supabase_jwt_issuer == "https://example.supabase.co/auth/v1"
    )


def test_settings_prefer_explicit_supabase_auth_urls() -> None:
    settings = Settings(
        supabase_url="https://example.supabase.co",
        supabase_jwks_url="https://keys.example.test/jwks",
        supabase_jwt_issuer="https://issuer.example.test",
    )

    assert settings.resolved_supabase_jwks_url == "https://keys.example.test/jwks"
    assert settings.resolved_supabase_jwt_issuer == "https://issuer.example.test"

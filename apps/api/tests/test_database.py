"""Tests for database configuration helpers."""

import pytest
from fastapi import HTTPException

from app.core import database


@pytest.mark.parametrize(
    ("provided", "expected"),
    [
        ("postgres://host/db", "postgresql+psycopg://host/db"),
        ("postgresql://host/db", "postgresql+psycopg://host/db"),
        ("sqlite:///:memory:", "sqlite:///:memory:"),
    ],
)
def test_normalize_database_url(provided: str, expected: str) -> None:
    assert database.normalize_database_url(provided) == expected


def test_get_session_reports_missing_database_configuration(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(database.settings, "database_url", "")
    database.get_engine.cache_clear()

    with pytest.raises(HTTPException) as error:
        next(database.get_session())

    assert error.value.status_code == 503

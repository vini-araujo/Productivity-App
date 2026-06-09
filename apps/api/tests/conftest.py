"""Shared API test fixtures."""

import pytest


@pytest.fixture
def anyio_backend() -> str:
    """Run async tests on asyncio, which is the API server runtime."""
    return "asyncio"

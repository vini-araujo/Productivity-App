"""Smoke-test a running Ordyn Life API deployment."""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import urlopen


@dataclass(frozen=True)
class SmokeResponse:
    """Minimal HTTP response details needed by the smoke checks."""

    status: int
    body: dict[str, Any]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--attempts", default=10, type=int)
    parser.add_argument("--delay", default=1.0, type=float)
    parser.add_argument("--require-ready", action="store_true")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    try:
        health = request_with_retry(
            f"{base_url}/health",
            attempts=args.attempts,
            delay=args.delay,
        )
        assert_response(health, 200, {"status": "ok"}, "/health")

        ready = request_with_retry(
            f"{base_url}/ready",
            attempts=args.attempts,
            delay=args.delay,
            allowed_statuses={200, 503},
        )
        validate_ready_response(ready, require_ready=args.require_ready)
    except RuntimeError as error:
        print(f"Smoke check failed: {error}", file=sys.stderr)
        return 1

    print(f"Smoke check passed for {base_url}")
    return 0


def request_with_retry(
    url: str,
    *,
    attempts: int,
    delay: float,
    allowed_statuses: set[int] | None = None,
) -> SmokeResponse:
    allowed = allowed_statuses or {200}
    last_error = ""

    for attempt in range(1, attempts + 1):
        try:
            return request_json(url, allowed_statuses=allowed)
        except RuntimeError as error:
            last_error = str(error)
            if attempt < attempts:
                time.sleep(delay)

    raise RuntimeError(last_error)


def request_json(url: str, *, allowed_statuses: set[int]) -> SmokeResponse:
    try:
        with urlopen(url, timeout=5) as response:
            status = response.status
            body = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        status = error.code
        body = json.loads(error.read().decode("utf-8"))
    except (OSError, URLError, json.JSONDecodeError) as error:
        raise RuntimeError(f"{url} did not return JSON: {error}") from error

    if status not in allowed_statuses:
        raise RuntimeError(f"{url} returned unexpected status {status}: {body}")

    return SmokeResponse(status=status, body=body)


def assert_response(
    response: SmokeResponse,
    expected_status: int,
    expected_body: dict[str, Any],
    path: str,
) -> None:
    if response.status != expected_status or response.body != expected_body:
        raise RuntimeError(
            f"{path} returned {response.status} {response.body}, "
            f"expected {expected_status} {expected_body}",
        )


def validate_ready_response(response: SmokeResponse, *, require_ready: bool) -> None:
    if response.status == 200 and response.body == {"status": "ready"}:
        return

    if not require_ready and response.status == 503:
        detail = response.body.get("detail")
        if isinstance(detail, dict) and detail.get("status") == "not_ready":
            return

    expected = "200 ready"
    if not require_ready:
        expected += " or 503 not_ready"
    raise RuntimeError(
        f"/ready returned {response.status} {response.body}; expected {expected}"
    )


if __name__ == "__main__":
    raise SystemExit(main())

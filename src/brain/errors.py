"""Typed errors and exit codes.

Every failure has a code (machine-readable), a message, and a fix (plain-language).
Errors double as navigation — per the agent-native design principle.
"""

from __future__ import annotations

from enum import IntEnum


class ExitCode(IntEnum):
    SUCCESS = 0
    UNEXPECTED = 1
    USER_ERROR = 2  # invalid input; won't succeed if retried as-is
    RETRYABLE = 3  # transient (I/O hiccup, lock contention)
    NO_VAULT = 4  # vault missing / not initialized


class BrainError(Exception):
    """User-facing error with structured metadata for the envelope."""

    def __init__(
        self,
        code: str,
        message: str,
        fix: str,
        *,
        exit_code: ExitCode = ExitCode.USER_ERROR,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.fix = fix
        self.exit_code = exit_code
        self.retryable = retryable

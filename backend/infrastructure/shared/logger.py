"""Uygulama genelinde loglama — colored console + trace yardımcıları."""

from __future__ import annotations

import logging
import sys
import time
from contextlib import contextmanager
from typing import Any, Optional

__all__ = ["setup_logging", "get_logger", "trace_step"]

_RESET = "\033[0m"
_BOLD = "\033[1m"
_DIM = "\033[2m"
_RED = "\033[31m"
_GREEN = "\033[32m"
_YELLOW = "\033[33m"
_BLUE = "\033[34m"
_CYAN = "\033[36m"
_WHITE = "\033[37m"

_LEVEL_COLORS: dict[str, str] = {
    "DEBUG": _DIM,
    "INFO": _GREEN,
    "WARNING": _YELLOW,
    "ERROR": _RED,
    "CRITICAL": _RED + _BOLD,
}

_MODULE_COLORS: dict[str, str] = {
    "app.services.auth_services":   _GREEN,
    "app.services.board_services":  _CYAN,
    "app.services.column_services": _CYAN,
    "app.services.card_services":   _CYAN,
    "app.infrastructure.supabase":  _BLUE,
    "app.infrastructure.auth":      _YELLOW,
    "app.infrastructure.shared":    _WHITE,
    "app.main":                     _BOLD + _WHITE,
    "trace":                        _BOLD + _GREEN,
}


def _color_for_module(name: str) -> str:
    for prefix, color in _MODULE_COLORS.items():
        if name.startswith(prefix):
            return color
    return _CYAN


class _ColoredFormatter(logging.Formatter):
    def __init__(self, fmt: str | None = None, datefmt: str | None = None, *, use_color: bool = True):
        super().__init__(fmt=fmt, datefmt=datefmt, style="%")
        self.use_color = use_color and sys.stdout.isatty()

    def format(self, record: logging.LogRecord) -> str:
        if self.use_color:
            level_color = _LEVEL_COLORS.get(record.levelname, _RESET)
            module_color = _color_for_module(record.name)
            record.levelname = f"{level_color}{record.levelname:8}{_RESET}"
            record.name = f"{module_color}{record.name}{_RESET}"
        return super().format(record)


_logging_configured = False


def setup_logging(level: str = "INFO", use_color: bool = True) -> None:
    global _logging_configured
    if _logging_configured:
        return
    _logging_configured = True

    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    if root.handlers:
        root.handlers.clear()

    fmt = "%(asctime)s │ %(levelname)s │ %(name)s │ %(message)s"
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(_ColoredFormatter(fmt, datefmt="%H:%M:%S", use_color=use_color))
    root.addHandler(console)

    for noisy in ("uvicorn", "uvicorn.access", "uvicorn.error", "httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def trace_step(step: str, **kwargs: Any) -> None:
    logger = get_logger("trace")
    extra = " ".join(f"{k}={v!r}" for k, v in kwargs.items()) if kwargs else ""
    logger.info("▶ %s%s", step, f" │ {extra}" if extra else "")


@contextmanager
def trace_span(name: str, **kwargs: Any):
    logger = get_logger("trace")
    extra = " ".join(f"{k}={v!r}" for k, v in kwargs.items()) if kwargs else ""
    logger.info("▶▶ START %s%s", name, f" │ {extra}" if extra else "")
    t0 = time.perf_counter()
    try:
        yield
        elapsed = round((time.perf_counter() - t0) * 1000, 2)
        logger.info("◀◀ END   %s │ elapsed_ms=%s", name, elapsed)
    except Exception as exc:
        elapsed = round((time.perf_counter() - t0) * 1000, 2)
        logger.exception("◀◀ FAIL  %s │ elapsed_ms=%s error=%s", name, elapsed, exc)
        raise

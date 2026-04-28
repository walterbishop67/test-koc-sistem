"""Vercel serverless entry point — ASGI app re-exported for @vercel/python builder."""
from app.main import app

__all__ = ["app"]

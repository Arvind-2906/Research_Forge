"""ResearchForge AI Engine - Unique ID Generator.

Generates cuid-compatible alphanumeric identifiers for Neon database entities.
"""

import time
import secrets


def generate_cuid(prefix: str = "c") -> str:
    """Generates a random 25-character CUID-like identifier."""
    timestamp = hex(int(time.time() * 1000))[2:]
    random_part = secrets.token_hex(8)
    return f"{prefix}{timestamp}{random_part}"[:25]


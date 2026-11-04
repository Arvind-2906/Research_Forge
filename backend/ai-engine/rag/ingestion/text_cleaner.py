"""ResearchForge AI Engine - Document Text Cleaner.

Cleans, normalizes, and sanitizes extracted text while preserving semantic
paragraph boundaries, code blocks, and list structure.
"""

import re
import unicodedata


class TextCleaner:
    """Sanitizes raw document text before chunking and embedding."""

    @staticmethod
    def clean(text: str) -> str:
        """Normalizes unicode, strips unprintable control chars, and normalizes whitespace."""
        if not text:
            return ""

        # Normalize unicode (NFC)
        normalized = unicodedata.normalize("NFC", text)

        # Replace carriage returns
        normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")

        # Strip null bytes and non-printable control characters (except newline, tab)
        normalized = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", normalized)

        # Normalize multiple consecutive spaces/tabs to a single space
        normalized = re.sub(r"[ \t]+", " ", normalized)

        # Collapse more than 3 consecutive newlines to 2 newlines (preserve paragraphs)
        normalized = re.sub(r"\n{3,}", "\n\n", normalized)

        return normalized.strip()

    @staticmethod
    def extract_title_candidate(text: str) -> str:
        """Extracts first non-empty line as candidate document title."""
        for line in text.splitlines():
            cleaned = line.strip().lstrip("#").strip()
            if len(cleaned) > 3:
                return cleaned[:120]
        return "Untitled Document"


text_cleaner = TextCleaner()


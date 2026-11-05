"""ResearchForge AI Engine - Security Hardening Utilities.

Provides defense against Prompt Injection, Server-Side Request Forgery (SSRF),
unbounded tool outputs, and credential leakage.
"""

import re
import json
import ipaddress
import socket
from urllib.parse import urlparse
from typing import Any, Union, List, Dict
from utils.logger import logger


# Blocked private and internal CIDR blocks
PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),      # Loopback
    ipaddress.ip_network("10.0.0.0/8"),       # RFC 1918 Private
    ipaddress.ip_network("172.16.0.0/12"),    # RFC 1918 Private
    ipaddress.ip_network("192.168.0.0/16"),   # RFC 1918 Private
    ipaddress.ip_network("169.254.0.0/16"),   # Link-Local
    ipaddress.ip_network("0.0.0.0/8"),        # This host
    ipaddress.ip_network("240.0.0.0/4"),      # Reserved
    ipaddress.ip_network("::1/128"),          # IPv6 Loopback
    ipaddress.ip_network("fc00::/7"),         # IPv6 Unique Local
    ipaddress.ip_network("fe80::/10"),        # IPv6 Link-Local
]

BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata.google.internal",
    "169.254.169.254",
    "instance-data",
}

# Prompt injection tokens and patterns
PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+all\s+(previous|prior)\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+all\s+previous", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+DAN\s+mode", re.IGNORECASE),
    re.compile(r"reveal\s+your\s+system\s+prompt", re.IGNORECASE),
    re.compile(r"print\s+your\s+(initial|system)\s+instructions", re.IGNORECASE),
    re.compile(r"bypass\s+all\s+safety\s+filters", re.IGNORECASE),
]

JAILBREAK_DELIMITERS = [
    "<system>",
    "</system>",
    "[INST]",
    "[/INST]",
    "<<SYS>>",
    "<</SYS>>",
    "<|im_start|>",
    "<|im_end|>",
]


def is_safe_url(url: str) -> bool:
    """Verifies that a URL targets a valid public HTTP/HTTPS endpoint and is not SSRF vulnerable."""
    if not url or not isinstance(url, str):
        return False

    url = url.strip()
    try:
        parsed = urlparse(url)
        if parsed.scheme.lower() not in ("http", "https"):
            return False

        hostname = (parsed.hostname or "").lower()
        if not hostname or hostname in BLOCKED_HOSTNAMES:
            return False

        # Check if hostname directly represents an IP address
        try:
            ip = ipaddress.ip_address(hostname)
            for net in PRIVATE_NETWORKS:
                if ip in net:
                    return False
            return True
        except ValueError:
            pass  # It is a domain name

        # Resolve hostname to check for private DNS rebinding
        try:
            resolved_ips = socket.getaddrinfo(hostname, None)
            for item in resolved_ips:
                ip_str = item[4][0]
                ip = ipaddress.ip_address(ip_str)
                for net in PRIVATE_NETWORKS:
                    if ip in net:
                        return False
        except (socket.gaierror, ValueError):
            # If DNS resolution fails, allow if public domain structure, else reject
            if "." not in hostname or hostname.endswith(".local") or hostname.endswith(".internal"):
                return False

        return True
    except Exception as e:
        logger.debug(f"[Security] URL safety check failed for '{url}': {e}")
        return False


def sanitize_prompt_input(text: str) -> str:
    """Sanitizes user queries and untrusted inputs against prompt injection."""
    if not text or not isinstance(text, str):
        return ""

    sanitized = text

    # Escape delimiter boundaries
    for delimiter in JAILBREAK_DELIMITERS:
        if delimiter in sanitized:
            sanitized = sanitized.replace(delimiter, f"[ESCAPED_{delimiter.strip('<>[]|')}]")

    # Neutralize active instruction override directives
    for pattern in PROMPT_INJECTION_PATTERNS:
        sanitized = pattern.sub("[FILTERED_INJECTION_ATTEMPT]", sanitized)

    return sanitized


def wrap_untrusted_content(content: str, label: str = "untrusted_content") -> str:
    """Safely encloses external text within XML boundary tags to prevent context escape."""
    cleaned = sanitize_prompt_input(content)
    return f"<{label}>\n{cleaned}\n</{label}>"


def truncate_tool_output(output: Any, max_chars: int = 50000) -> Any:
    """Truncates unbounded tool outputs to prevent context explosion and memory spikes."""
    if output is None:
        return None

    if isinstance(output, str):
        if len(output) > max_chars:
            logger.warning(f"[Security] Truncating tool output from {len(output)} to {max_chars} chars.")
            return output[:max_chars] + f"\n\n[OUTPUT TRUNCATED: Exceeded max allowed length of {max_chars} chars]"
        return output

    if isinstance(output, dict):
        truncated_dict = {}
        for k, v in output.items():
            if isinstance(v, str) and len(v) > max_chars:
                truncated_dict[k] = v[:max_chars] + "\n[FIELD TRUNCATED]"
            elif isinstance(v, (dict, list)):
                truncated_dict[k] = truncate_tool_output(v, max_chars // 2)
            else:
                truncated_dict[k] = v
        return truncated_dict

    if isinstance(output, list):
        if len(output) > 100:
            logger.warning(f"[Security] Truncating tool list output from {len(output)} to 100 items.")
            output = output[:100]
        return [truncate_tool_output(item, max_chars // 2) for item in output]

    return output


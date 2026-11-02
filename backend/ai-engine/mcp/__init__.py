"""ResearchForge AI Engine - MCP Subsystem & SDK Bridge.

Exposes local MCP subsystem modules while bridging to the official third-party
MCP SDK in site-packages.
"""

import os
import sys

_site_packages_mcp = [
    os.path.join(p, "mcp")
    for p in sys.path
    if "site-packages" in p.lower() and os.path.isdir(os.path.join(p, "mcp"))
]

for _p in _site_packages_mcp:
    if _p not in __path__:
        __path__.append(_p)

if _site_packages_mcp:
    _init_file = os.path.join(_site_packages_mcp[0], "__init__.py")
    if os.path.exists(_init_file):
        with open(_init_file, "r", encoding="utf-8") as _f:
            _code = compile(_f.read(), _init_file, "exec")
            exec(_code, globals())

#!/usr/bin/env python3
"""Bump repo-root VERSION from merged PR title.

Looks for one of: +(semver:major), +(semver:minor), +(semver:patch)
Defaults to patch if none found.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path


def parse_bump(title: str) -> str:
    m = re.search(r"\+\(semver:(major|minor|patch)\)", title, re.I)
    if m:
        return m.group(1).lower()
    return "patch"


def bump(ver: str, kind: str) -> str:
    parts = [int(x) for x in ver.strip().split(".")]
    while len(parts) < 3:
        parts.append(0)
    major, minor, patch = parts[0], parts[1], parts[2]
    if kind == "major":
        major += 1
        minor = 0
        patch = 0
    elif kind == "minor":
        minor += 1
        patch = 0
    else:
        patch += 1
    return f"{major}.{minor}.{patch}"


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: bump_version.py <pr_title>", file=sys.stderr)
        return 2
    title = sys.argv[1]
    root = Path(__file__).resolve().parents[1]
    vf = root / "VERSION"
    old = vf.read_text().strip()
    kind = parse_bump(title)
    new = bump(old, kind)
    vf.write_text(new + "\n")
    print(f"bump={kind} {old} -> {new}")
    print(new)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

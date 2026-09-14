#!/usr/bin/env python3
"""Validate the safe, browser-simulated lab blueprint catalog."""
from __future__ import annotations

import json
import sys
from pathlib import Path

BLUEPRINT_PATH = Path(__file__).resolve().parents[1] / "client/src/data/practice_blueprints.json"
REQUIRED = {"id", "slug", "title", "platform", "difficulty", "category", "summary", "skills", "hints", "flag_user", "flag_root", "terminal", "phases", "verification"}


def main() -> int:
    payload = json.loads(BLUEPRINT_PATH.read_text(encoding="utf-8"))
    seen: set[str] = set()
    labs = []
    for platform in payload.get("platforms", []):
        if not platform.get("catalog_url", "").startswith("https://"):
            raise ValueError(f"Invalid catalog URL for {platform.get('id')}")
        for lab in platform.get("labs", []):
            missing = REQUIRED - set(lab)
            if missing:
                raise ValueError(f"{lab.get('id')}: missing {sorted(missing)}")
            if lab["id"] in seen:
                raise ValueError(f"Duplicate lab id: {lab['id']}")
            seen.add(lab["id"])
            if not lab["flag_user"].startswith("flag{") or not lab["flag_root"].startswith("flag{"):
                raise ValueError(f"{lab['id']}: flags must be fictitious flag{{...}} values")
            sensitive_keys = {"password", "passwd", "token", "secret", "credential", "payload"}
            if sensitive_keys.intersection(lab.keys()) or sensitive_keys.intersection(lab["terminal"].keys()):
                raise ValueError(f"{lab['id']}: unsafe credential/payload field detected")
            terminal = lab["terminal"]
            if not terminal["initial_host"].endswith(".lab"):
                raise ValueError(f"{lab['id']}: non-isolated host name")
            if not terminal["suggested_cmd"].startswith(("nmap ", "curl ")):
                raise ValueError(f"{lab['id']}: unexpected command")
            labs.append(lab)

    if len(labs) != 9:
        raise ValueError(f"Expected 9 reproducible labs, found {len(labs)}")
    print(f"Validated {len(labs)} labs across {len(payload['platforms'])} platforms")
    print(", ".join(sorted(seen)))
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Public catalog synchronizer for VulnLab.

This script only reads public catalog/learning pages. It does not log in,
download virtual machines, execute exploits, or access protected content.
It emits a normalized JSON catalog on stdout for the Node backend to persist.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

from scrapling.fetchers import Fetcher

SOURCES = [
    {
        "id": "hackthebox",
        "name": "Hack The Box",
        "url": "https://www.hackthebox.com/machines",
        "base": "https://www.hackthebox.com",
        "patterns": ("/machines", "/academy", "/starting-point"),
        "category": "Adversary Simulation",
        "fallback": [
            ("HTB Hacking Labs", "https://www.hackthebox.com/hacker/hacking-labs", "Colección pública de laboratorios prácticos con máquinas vulnerables, retos breves y Guided Mode."),
            ("Machines", "https://www.hackthebox.com/machines", "Máquinas vulnerables para practicar penetración, enumeración y escalada de privilegios."),
            ("Challenges", "https://www.hackthebox.com/challenges", "Retos breves de web, crypto, reversing y forensics para practicar técnicas específicas."),
            ("Sherlocks", "https://help.hackthebox.com/en/articles/8570249-how-to-play-sherlocks", "Escenarios defensivos de DFIR, SOC, malware analysis y threat intelligence."),
            ("Pro Labs", "https://www.hackthebox.com/hacker/pro-labs", "Infraestructuras empresariales simuladas para practicar Active Directory, pivoting y TTPs."),
        ],
    },
    {
        "id": "tryhackme",
        "name": "TryHackMe",
        "url": "https://tryhackme.com/paths",
        "base": "https://tryhackme.com",
        "patterns": ("/path/", "/room/", "/resources/"),
        "category": "Guided Learning Paths",
        "fallback": [
            ("Common Attacks", "https://tryhackme.com/room/commonattacks", "Sala pública sobre ataques comunes, ingeniería social y medidas de prevención."),
            ("Introductory Researching", "https://tryhackme.com/room/introtoresearch", "Sala pública de habilidades de investigación para pentesting y consulta de vulnerabilidades."),
            ("Pre Security", "https://tryhackme.com/path/outline/presecurity", "Ruta formativa pública de fundamentos de redes, web y sistemas operativos."),
            ("Jr Penetration Tester", "https://tryhackme.com/path/outline/jrpenetrationtester", "Ruta formativa de enumeración, explotación y documentación de pentesting."),
        ],
    },
    {
        "id": "portswigger",
        "name": "PortSwigger Web Security Academy",
        "url": "https://portswigger.net/web-security/all-materials",
        "base": "https://portswigger.net",
        "patterns": ("/web-security/",),
        "category": "Web Security Academy",
        "fallback": [
            ("SQL injection — hidden data", "https://portswigger.net/web-security/sql-injection", "Laboratorio Apprentice sobre una inyección SQL en una cláusula WHERE que permite recuperar datos ocultos."),
            ("Reflected XSS — HTML context", "https://portswigger.net/web-security/cross-site-scripting", "Laboratorio Apprentice sobre XSS reflejado en contexto HTML sin codificación de entrada."),
            ("Unprotected admin functionality", "https://portswigger.net/web-security/access-control", "Laboratorio Apprentice sobre funcionalidad administrativa sin protección y escalada vertical."),
            ("Basic SSRF against local server", "https://portswigger.net/web-security/ssrf", "Laboratorio Apprentice sobre SSRF básica contra el servidor local."),
            ("CSRF vulnerability with no defenses", "https://portswigger.net/web-security/csrf", "Laboratorio Apprentice sobre una vulnerabilidad CSRF sin defensas."),
        ],
    },
]


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def canonical_url(base: str, href: str) -> str | None:
    if not href or href.startswith(("#", "mailto:", "javascript:", "tel:")):
        return None
    absolute = urljoin(base, href)
    parsed = urlparse(absolute)
    if parsed.scheme not in {"http", "https"}:
        return None
    return absolute.split("#", 1)[0]


def fetch_public_page(url: str):
    fetcher = Fetcher()
    return fetcher.get(
        url,
        timeout=30,
        headers={
            "Accept-Encoding": "gzip, deflate",
            "User-Agent": "VulnLabCatalogSync/1.0 (+public-catalog-only)",
        },
    )


def extract_candidates(source: dict) -> list[dict]:
    try:
        page = fetch_public_page(source["url"])
        if page.status >= 400:
            raise RuntimeError(f"HTTP {page.status}")

        candidates: list[dict] = []
        seen: set[str] = set()
        for link in page.css("a[href]"):
            href = canonical_url(source["base"], link.attrib.get("href", ""))
            title = clean_text(link.get_all_text(strip=True))
            if not href or not title or len(title) < 3:
                continue
            if not any(pattern in href for pattern in source["patterns"]):
                continue
            if href in seen or href.rstrip("/") == source["url"].rstrip("/"):
                continue
            seen.add(href)
            candidates.append({
                "title": title[:120],
                "url": href,
                "description": f"Entorno público descubierto en el catálogo de {source['name']}.",
                "discoveryMethod": "scrapling",
            })
            if len(candidates) >= 12:
                break
        return candidates
    except Exception as error:
        print(f"[scrapling] {source['id']}: {error}", file=sys.stderr)
        return []


def normalize(source: dict, candidates: list[dict]) -> list[dict]:
    if not candidates:
        candidates = [
            {"title": title, "url": url, "description": description, "discoveryMethod": "curated-fallback"}
            for title, url, description in source["fallback"]
        ]

    normalized = []
    for index, item in enumerate(candidates):
        slug = re.sub(r"[^a-z0-9]+", "-", item["title"].lower()).strip("-") or f"env-{index + 1}"
        normalized.append({
            "id": f"{source['id']}-{slug}",
            "sourceId": source["id"],
            "sourceName": source["name"],
            "title": item["title"],
            "url": item["url"],
            "category": source["category"],
            "difficulty": "Varied",
            "description": item["description"],
            "discoveryMethod": item["discoveryMethod"],
            "skills": ["Reconocimiento", "Análisis de superficie", "Documentación técnica"],
            "points": 150 + (index % 4) * 50,
        })
    return normalized


def main() -> None:
    environments: list[dict] = []
    source_results: list[dict] = []
    for source in SOURCES:
        extracted = extract_candidates(source)
        environments.extend(normalize(source, extracted))
        source_results.append({
            "id": source["id"],
            "name": source["name"],
            "url": source["url"],
            "items": len(extracted),
            "usedFallback": not bool(extracted),
        })

    payload = {
        "source": "public-catalogs",
        "syncedAt": datetime.now(timezone.utc).isoformat(),
        "sources": source_results,
        "environments": environments,
    }
    json.dump(payload, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()

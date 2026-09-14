# Fuentes públicas para sincronización

La sincronización lee únicamente páginas públicas y no inicia sesión, no descarga máquinas virtuales y no ejecuta exploits.

| Fuente | URL de catálogo | Campos usados |
|---|---|---|
| Hack The Box | https://www.hackthebox.com/machines | título, URL, categoría, descripción breve |
| TryHackMe | https://tryhackme.com/paths | título, URL, categoría, descripción breve |
| PortSwigger Web Security Academy | https://portswigger.net/web-security/all-materials | título, URL, categoría, descripción breve |

El extractor se encuentra en `scripts/scrapling_sync.py`. Usa `scrapling.fetchers.Fetcher`, `Accept-Encoding: gzip, deflate`, un User-Agent identificable, URLs canónicas y límites de extracción. Si una fuente no expone contenido catalogable sin autenticación, usa un conjunto curado de enlaces públicos y lo marca con `discoveryMethod: curated-fallback`.

Los fallbacks públicos verificados incluyen **HTB Hacking Labs, Machines, Challenges, Sherlocks y Pro Labs**; **TryHackMe Common Attacks, Introductory Researching, Pre Security y Jr Penetration Tester**; y laboratorios públicos de **PortSwigger** sobre SQL injection, XSS reflejado, access control, SSRF y CSRF. Las páginas completas de inventarios interactivos pueden requerir cuenta, suscripción o JavaScript; el sincronizador no intenta sortear esas limitaciones.

La sincronización persiste los entornos en la tabla `practice_environments` y la fecha/resultado por fuente en `catalog_sync_runs`.

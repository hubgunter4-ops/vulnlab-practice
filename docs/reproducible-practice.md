# Base reproducible de práctica

La base de práctica contiene nueve laboratorios **browser-simulated**, tres por plataforma. Cada blueprint es determinista y tiene el mismo contrato: objetivo, dificultad, categoría, habilidades, fases, pistas, terminal, criterios de verificación y dos flags ficticias.

| Plataforma | Laboratorios | Enfoque |
|---|---|---|
| Hack The Box | Web Forge, Cloud Trail, Northbridge Pivot | Web, DFIR y pivoting/Active Directory |
| TryHackMe | Common Attacks, Introductory Researching, Web Fundamentals | Awareness, investigación y fundamentos web |
| PortSwigger | SQL Injection, Reflected XSS, Access Control | Inyección, contexto de salida y autorización |

## Reproducir la base

Desde la raíz del proyecto:

```bash
python3 scripts/validate_blueprints.py
pnpm install
pnpm check
pnpm test -- --run
pnpm run build
```

El resultado esperado del validador es:

```text
Validated 9 labs across 3 platforms
```

La interfaz carga los nueve blueprints junto con el catálogo de VulnHub y los entornos descubiertos por el sincronizador Scrapling. La terminal ejecuta comandos reales allowlisted contra un workspace propio del laboratorio. Los hosts terminan en `.lab`, la red está deshabilitada y no representan máquinas reales.

Los comandos disponibles son `pwd`, `ls`, `find . -maxdepth 2 -type f`, `cat`, `head`, `grep`, `whoami` e `id`. También acepta `help`; los comandos de red como `nmap`, `curl` o `gobuster` se rechazan explícitamente porque esta aplicación pública no debe escanear objetivos ni ejecutar payloads.

## Contrato de un laboratorio

Cada entrada requiere:

- `id` y `slug` únicos.
- `platform`, `title`, `difficulty`, `category` y `summary`.
- `skills`, `phases` y `verification` para una progresión observable.
- `hints` sin credenciales ni soluciones operativas peligrosas.
- `flag_user` y `flag_root` ficticias con formato `flag{...}`.
- `terminal.initial_host` aislado bajo `.lab`, una lista de puertos sintética y un comando de reconocimiento `nmap` o `curl`.

Para ampliar la base, añade un objeto a `client/src/data/practice_blueprints.json`, ejecuta el validador y verifica el laboratorio desde la UI. No introduzcas contraseñas, tokens, payloads reales, Connection Packs, archivos de VM ni instrucciones para atacar objetivos externos.

## Progresión recomendada

1. **Reconocimiento:** describir el alcance y los servicios sintéticos.
2. **Enumeración:** identificar rutas, roles, eventos o entradas relevantes.
3. **Análisis:** explicar el riesgo con una referencia OWASP o MITRE.
4. **Remediación:** proponer una corrección verificable.
5. **Evidencia:** registrar los criterios de verificación y canjear las flags ficticias.

Esta estructura permite usar los mismos blueprints en una clase, un laboratorio local o una sesión de revisión sin depender de una plataforma externa ni de una VM concreta.

# VulnLab Practice Environment

Entorno interactivo de práctica de ciberseguridad con catálogo base de VulnHub y entornos públicos de Hack The Box, TryHackMe y PortSwigger Web Security Academy.

La interfaz incluye una terminal de práctica con comandos reales allowlisted (`pwd`, `ls`, `find`, `cat`, `head`, `grep`, `whoami`, `id`) ejecutados en un workspace aislado por laboratorio. No hay shell arbitraria, sudo ni red; las flags siguen siendo ficticias. El backend añade un sincronizador periódico que extrae únicamente catálogos públicos con Scrapling y persiste los resultados en la base de datos.

## Fuentes sincronizadas

- [VulnHub Timeline](https://www.vulnhub.com/timeline/)
- [Hack The Box](https://www.hackthebox.com/)
- [TryHackMe](https://tryhackme.com/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)

La extracción no inicia sesión, no sortea CAPTCHA o controles de acceso, no descarga máquinas virtuales y no ejecuta exploits, payloads o credenciales. Cuando una fuente dinámica limita el inventario público, el sincronizador usa enlaces públicos curados y marca el registro como `curated-fallback`.

## Arquitectura

```text
Heartbeat HTTP cron (UTC, 06:00)
              |
              v
POST /api/scheduled/sync-catalog
              |
              v
server/scraplingSync.ts
              |
              v
python3 scripts/scrapling_sync.py
              |
              v
practice_environments + catalog_sync_runs
              |
              v
trpc.catalog.list / trpc.catalog.status
              |
              v
React Home.tsx + simulador de laboratorio
```

El job se ejecuta como callback HTTP administrado por la plataforma. No se usan `setInterval`, `node-cron` ni procesos residentes dentro del contenedor.

## Desarrollo local

Requisitos: Node.js 22, pnpm 10 y Python 3.11 o superior.

```bash
pnpm install
python3 -m pip install --break-system-packages -r requirements.txt
pnpm check
pnpm test
pnpm run build
pnpm dev
```

El catálogo se prueba directamente con:

```bash
python3 scripts/scrapling_sync.py > /tmp/catalog.json
```

El backend ejecuta el mismo script mediante `server/scraplingSync.ts`. La consulta pública del catálogo está disponible en `catalog.list` y su última ejecución en `catalog.status`.

## Job periódico

El callback es:

```text
POST /api/scheduled/sync-catalog
```

La autenticación exige una identidad cron válida. El handler comprueba `user.isCron` y `user.taskUid`, busca la fila de configuración por `scheduleCronTaskUid`, y responde `2xx` sin trabajo si el job está huérfano o deshabilitado.

Después de desplegar la aplicación, se crea un Heartbeat de proyecto con una expresión de seis campos UTC, por ejemplo:

```text
0 0 6 * * *
```

La configuración persistente se almacena en `catalog_sync_settings`; las ejecuciones se registran en `catalog_sync_runs`.

## Producción

El `Dockerfile` instala Python 3 y Scrapling en la imagen Node 22. El servidor escucha en `process.env.PORT` y sirve tanto el frontend compilado como el backend Express.

Antes de crear el job periódico, la aplicación debe estar desplegada en una URL de producción alcanzable por la plataforma. El preview local del sandbox sirve para validar, pero no debe usarse como callback permanente.

## Estructura principal

```text
client/src/pages/Home.tsx       UI y catálogo combinado
scripts/scrapling_sync.py       extracción pública y normalización
server/scraplingSync.ts         puente Node → Python → DB
server/scheduled.ts              callback Heartbeat protegido
server/db.ts                     helpers de persistencia
server/routers.ts                consultas tRPC catalog.list/status
server/_core/index.ts            montaje de /api/scheduled/*
drizzle/schema.ts                tablas del catálogo y jobs
Dockerfile                       Node + Python + Scrapling
```

## Seguridad y alcance

El proyecto ofrece **ejecución real de comandos seguros dentro de un workspace efímero y sin red**. No conecta el navegador a máquinas vulnerables reales, no acepta operadores de shell, no permite salir del workspace y no ejecuta instrucciones recibidas desde el catálogo externo. Los flags son ficticios y se generan localmente a partir del identificador del entorno. Cualquier laboratorio con vulnerabilidades reales debe ejecutarse en infraestructura aislada independiente, únicamente con autorización explícita y respetando los términos de cada plataforma.

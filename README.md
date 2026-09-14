# VulnLab Control Center

Centro de control web para explorar laboratorios de ciberseguridad, practicar con entornos aislados y consultar el estado general de la plataforma.

## Funciones de la página

### Resumen ejecutivo

- Muestra el estado operativo de la plataforma.
- Presenta el número de entornos disponibles.
- Indica laboratorios completados y porcentaje de avance.
- Contabiliza banderas capturadas y puntos XP.
- Muestra métricas observadas de rendimiento: LCP, TTFB, recursos cargados y transferencia inicial.
- Resume la cobertura de laboratorios por plataforma.
- Informa el estado de sincronización y aislamiento del workspace.

### Catálogo de laboratorios

- Lista laboratorios procedentes de VulnHub y fuentes públicas.
- Permite buscar por nombre, serie, categoría o habilidad.
- Permite filtrar por categoría y dificultad.
- Muestra fecha, plataforma, dificultad, categoría, habilidades y puntos XP.
- Permite seleccionar un laboratorio para abrir su espacio de trabajo.
- Identifica visualmente los laboratorios con progreso parcial o completo.

### Ficha del laboratorio

- Presenta el objetivo activo y su nivel de dificultad.
- Muestra la descripción y las habilidades asociadas.
- Incluye referencias externas del laboratorio cuando están disponibles.
- Expone el contexto de práctica y los criterios de avance.

### Consola ejecutable

- Ejecuta comandos permitidos dentro del workspace aislado del laboratorio.
- Permite consultar archivos y evidencias con `pwd`, `ls`, `find`, `cat`, `head`, `grep`, `whoami` e `id`.
- Incluye ayuda integrada y salida de comandos.
- Permite enviar flags de práctica y registrar objetivos completados.
- Bloquea comandos no permitidos, acceso de red y salida del workspace.

### Pistas y objetivos

- Muestra pistas metodológicas por laboratorio.
- Organiza los objetivos de usuario y root.
- Indica el estado de cada flag.
- Actualiza la puntuación de la sesión al completar objetivos.

### Auditoría Web-Perf

- Permite revisar métricas de carga y estabilidad de la página.
- Presenta LCP, FCP, CLS, TTFB, tiempo de carga, nodos DOM y recursos.
- Permite volver a ejecutar la auditoría desde la interfaz.
- Clasifica las métricas según umbrales de rendimiento.

### Revisión de diseño

- Permite revisar accesibilidad, responsive, contraste y consistencia visual.
- Organiza hallazgos por severidad.
- Muestra recomendaciones de mejora para la interfaz.

### Estado de sesión

- Muestra la sesión activa y la puntuación acumulada.
- Conserva el progreso durante la interacción actual con la página.
- Permite consultar el estado general desde el encabezado del centro de control.

## Estructura de carpetas

```text
client/
├── public/                 Recursos públicos pequeños
└── src/
    ├── components/         Consola, auditorías, logo y componentes visuales
    ├── contexts/           Contextos globales de la interfaz
    ├── data/               Catálogos y blueprints de laboratorios
    ├── hooks/              Hooks reutilizables
    ├── lib/                Cliente de comunicación de la aplicación
    └── pages/              Pantallas principales, incluida Home.tsx

docs/                       Documentación complementaria
scripts/                    Utilidades de catálogo y validación
server/                     Servicios de la aplicación
shared/                     Tipos y constantes compartidas
drizzle/                    Esquema y migraciones de datos
```

## Plataformas representadas

- VulnHub
- Hack The Box
- TryHackMe
- PortSwigger Web Security Academy

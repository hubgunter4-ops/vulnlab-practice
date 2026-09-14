# Sandbox de laboratorios sintéticos

Este directorio contiene una base reproducible para ejecutar laboratorios educativos ficticios en un host autorizado con Docker. No utiliza máquinas vulnerables reales ni publica puertos hacia Internet.

## Controles aplicados

El compose crea una red Docker `internal: true`, sin puertos publicados en el host. El contenedor usa un usuario sin privilegios, filesystem de solo lectura, `/tmp` temporal con `noexec` y `nosuid`, `cap_drop: ALL`, `no-new-privileges`, límite de 128 MB de memoria, 0.25 CPU, máximo de 64 procesos y reinicio desactivado.

El servicio solo expone evidencia sintética y un endpoint de salud dentro de la red interna. El entorno debe destruirse al terminar la sesión.

## Uso en un host Docker autorizado

```bash
docker compose -f sandbox/docker-compose.synthetic.yml up --build -d
docker compose -f sandbox/docker-compose.synthetic.yml ps
docker compose -f sandbox/docker-compose.synthetic.yml down --volumes --remove-orphans
```

No se debe añadir `ports:` al compose ni conectar esta red a redes de producción. Para una práctica con varios servicios sintéticos, se deben añadir servicios al mismo archivo y conservar la red `internal` y los límites por servicio.

## Relación con el agente LLM

El agente del centro de control genera únicamente un blueprint estructurado. El blueprint no puede ejecutar código ni desplegar por sí mismo. En el WebDev público, la ejecución continúa en el sandbox allowlistado sin red porque el runtime administrado no dispone de Docker. En un host Docker autorizado, el blueprint puede convertirse en evidencia sintética y servicios declarativos, después de una revisión humana.

Las API keys de un proveedor configurable se utilizan únicamente durante la solicitud de generación y no se almacenan en la base de datos ni en el navegador.

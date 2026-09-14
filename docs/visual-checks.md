# Verificaciones visuales y funcionales

El preview de escritorio muestra el contador actualizado a **66 entornos**: 36 de VulnHub, 21 sincronizados y 9 blueprints reproducibles. El estado de sincronización aparece como **ACTIVO** y la navegación conserva el catálogo, el logo 3D y los paneles de práctica.

La terminal fue validada por HTTP con el procedimiento `lab.execute`: `cat README.md` devuelve contenido real del workspace `ps-sql-injection` con `exitCode: 0`; `nmap -sV academy-sqli.lab` devuelve `exitCode: 126` y explica que la red está deshabilitada. Esto confirma ejecución real de comandos allowlisted y bloqueo deliberado de escaneo externo.

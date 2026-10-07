# Recursos visuales de Warcraft

`source/` conserva los 38 PNG originales extraídos del ZIP que proporcionó el usuario. Incluye atlas de objetos/equipo, habilidades, mapas, objetos del mundo, monedas, emblemas y elementos de interfaz. Los originales se mantienen intactos.

`generated/` contiene recortes listos para adjuntar en WhatsApp y mostrar en la web: emblemas ilustrados de clase, iconos de armas y armaduras con borde por rareza, imágenes de inventario/oro/hermandad y 36 miniaturas de mapa. Daga, arco y colmillo tienen sprites propios; el catálogo clasifica primero el tipo de arma para evitar que palabras como «sombra» cambien su imagen. Los emblemas de clase provienen de arte de habilidades; el ZIP no incluye retratos completos independientes para las trece clases.

Para reconstruir los recortes y `manifest.json` desde los originales, ejecutar desde la raíz del repositorio:

```sh
node scripts/build-warcraft-assets.js
```

Estos PNG son recursos estáticos del juego. **No contienen ni sustituyen el estado, las cuentas, el progreso o las sesiones del bot**, que siguen guardándose fuera del repositorio según la configuración de persistencia existente.

## Procedencia y licencia

Los originales fueron suministrados por el usuario desde un enlace público de MediaFire. El archivo no incluía una licencia o atribución verificable para las imágenes. La licencia MIT del código del repositorio no debe interpretarse como una licencia de redistribución de estos gráficos; quien mantenga/publica el repositorio debe comprobar que tiene derecho a redistribuirlos.

# Integración HuTao → JK-Bot-MD

## Estado

El proyecto adjunto `HuTao-Proyect-master.zip` está incluido en:

```text
legacy/HuTao-Proyect-master/
```

Se conserva completo como referencia y fuente de módulos. No se reemplazaron los archivos activos de JK-Bot-MD.

## Motivo del aislamiento

Los proyectos usan arquitecturas diferentes:

- JK-Bot-MD usa `commands/`, `index.js`, `settings.js` y la web integrada con Express/Socket.IO.
- HuTao usa `cmds/`, otro `index.js`, otro `handler.js`, otro `settings.js`, otra configuración de imports y una base de datos diferente.
- Existen comandos con el mismo nombre pero implementaciones incompatibles; por ejemplo `antilink`, `status`, `restart`, `sticker`, `tiktok` y `translate`.

Sobrescribir esos archivos habría cambiado el bot que actualmente funciona y podría invalidar sesiones, configuración, permisos y APIs.

## Inventario inicial

- 168 archivos importados.
- 163 archivos JavaScript en el ZIP.
- 125 nombres de comandos HuTao que no existen actualmente en `commands/` de JK-Bot-MD.
- 28 nombres de comandos con colisión de nombre.

## Siguiente fase

Los comandos exclusivos se deben adaptar uno a uno al contrato de JK-Bot-MD antes de moverlos a `commands/`. Los comandos con colisión deben conservar la versión actual hasta comparar comportamiento, dependencias, permisos, mensajes y persistencia.

La personalización de canales y la adaptación visual de la web para Railway se hará mediante configuración centralizada, usando únicamente los enlaces oficiales que proporcione el propietario.

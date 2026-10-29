# WATCHER

WATCHER es un visualizador musical gratuito y estático que se ejecuta en el navegador. Abre los archivos elegidos con el selector del sistema y procesa el audio localmente mediante Web Audio API. No sube audio ni requiere cuentas, analítica, backend, API de pago o secretos de despliegue. Los ajustes se guardan en este navegador; la lista y el contenido de audio no se guardan al cerrar la página.

## Uso

1. Abre WATCHER y selecciona uno o más archivos locales MP3 o WAV.
2. Elige una pista de la lista y pulsa **Play**.
3. Selecciona Waveform, Spectrum, Radial, Particle o Psychedelic. Cambia sensibilidad, enfoque de frecuencia, color, movimiento e intensidad de efectos, o aplica un preset de paleta.
4. Usa los controles para pausar, buscar una posición y ajustar el volumen. Pulsa **Remove** para quitar una pista de la sesión actual.

El navegador debe poder decodificar el archivo. Los demás formatos dependen del soporte del navegador. Al volver a abrir WATCHER debes seleccionar otra vez los archivos. Si el dispositivo prefiere movimiento reducido, la animación del Canvas se atenúa y las formas siguen respondiendo al audio.

## Ejecución local

Requisitos: Node.js `24.22.1` (versión de [.nvmrc](.nvmrc)) y npm 11.

Desde la carpeta del repositorio, en PowerShell:

```powershell
npm ci
npm run dev
```

Abre la URL que imprime Vite, normalmente `http://127.0.0.1:5173/`. Selecciona un archivo de audio local para empezar. Detén el servidor con `Ctrl+C`.

Para crear y previsualizar el build de producción:

```powershell
npm run build
npm run preview
```

Para simular localmente la ruta de un sitio de proyecto de GitHub Pages, cambia `WATCHER` por el nombre real del repositorio:

```powershell
$env:VITE_BASE_PATH = "/WATCHER/"
npm run build
npm run preview
Remove-Item Env:VITE_BASE_PATH
```

Abre `http://127.0.0.1:4173/WATCHER/` para revisar esa compilación.

## GitHub Pages

El repositorio [drake158/watcher](https://github.com/drake158/watcher) contiene `.github/workflows/deploy.yml`. La acción instala las dependencias del lockfile, genera `dist/` con la ruta del repositorio y publica ese artefacto estático. Un `push` a la rama predeterminada despliega automáticamente. `workflow_dispatch` desde otra rama puede compilar, pero no puede desplegar. Las acciones externas están fijadas a SHA completos y el workflow usa permisos temporales de `GITHUB_TOKEN`; no necesita tokens personales ni secretos del repositorio.

Configura el repositorio una vez:

1. Usa un repositorio público elegible para GitHub Pages gratuito.
2. En **Settings → Pages**, selecciona **GitHub Actions** como origen de publicación.
3. En **Settings → Environments → github-pages → Deployment branches and tags**, limita los despliegues a la rama predeterminada.
4. Sube el workflow y la aplicación a esa rama. Revisa la ejecución en **Actions**. Cuando termine correctamente, el sitio estará en `https://drake158.github.io/watcher/`.

El workflow detecta automáticamente un repositorio `OWNER.github.io` y usa `/` para sitios de usuario u organización; los repositorios de proyecto usan `/<nombre-del-repositorio>/`. La publicación y el uso de WATCHER no requieren un servidor propio.

## Comandos del proyecto

- `npm run typecheck`: comprueba los tipos estrictos de la aplicación.
- `npm run build`: ejecuta el typecheck y genera el sitio estático en `dist/`.
- `npm run test:unit`: ejecuta pruebas unitarias y de integración.
- `npm run test:browser`: ejecuta pruebas de navegador.
- `npm run test:visual`: ejecuta la suite visual del navegador.

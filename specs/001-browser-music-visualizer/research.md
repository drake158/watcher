# Investigación de diseño: WATCHER

**Rama**: `001-browser-music-visualizer`  
**Fecha de consulta**: 2026-10-26  
**Propósito**: justificar decisiones técnicas del plan; esto no es evidencia de aceptación del producto.

## Decisión: TypeScript + Vite, sin framework de UI

**Elegido**: módulos TypeScript estrictos, HTML/CSS semántico, Vite 8 para desarrollo y build estático; Node.js 24 LTS y npm/lockfile para tooling.

**Razones**:

- El proyecto es una página sin rutas ni backend. DOM nativo y módulos TS evitan costo de runtime y complejidad de framework.
- Vite genera assets estáticos y documenta `base` para sitios de proyecto en subruta y deploy con GitHub Actions.
- Node 24 es LTS a la fecha de esta investigación y supera el mínimo declarado por Vite 8 (Node 20.19+ o 22.12+). Fijar el parche exacto en CI/archivo de versión al implementar.

**Alternativas consideradas**: React/Vue añaden runtime y abstracciones que no se justifican por una única vista; Webpack/roll-your-own requieren más configuración; un servidor backend contradice la constitución.

**Fuentes**: [Guía de inicio de Vite](https://vite.dev/guide/), [despliegue estático de Vite](https://vite.dev/guide/static-deploy), [Node.js releases](https://nodejs.org/en/about/previous-releases).

## Decisión: elemento de audio local + Web Audio API

**Elegido**: `File`/`Blob` escogido por el usuario; object URL solo para la pista activa; `HTMLAudioElement` para reproducción/seek/duración/eventos; grafo único `MediaElementAudioSourceNode → AnalyserNode → GainNode → destination` para datos de frecuencia/tiempo y control de volumen.

**Razones**:

- El navegador gestiona códecs soportados y el ciclo de reproducción sin que la aplicación copie/decodifique toda la lista en buffers.
- Web Audio expone datos de waveform/espectro sin modificar intencionalmente la señal. Un solo grafo y un solo medio activo minimizan recursos.
- Las políticas de autoplay pueden suspender contexto o rechazar `play()`, por lo que ambas operaciones se inician en el gesto del usuario y se manejan con estado/eventos observables.
- `canPlayType()` es solo indicativo. La aceptación requiere pruebas MP3/WAV con la matriz de navegador, no una promesa universal.

**Alternativas consideradas**: `decodeAudioData()` de archivos completos elevaría memoria y coste en archivos grandes; librerías de codecs amplían la superficie de dependencias y pueden contradecir la política de usar capacidades nativas. `AudioWorklet` no se justifica para solo analizar muestras.

**Fuentes**: [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), [visualizaciones con Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API), [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/fftSize), [createMediaElementSource](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource), [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API), [autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay), [compatibilidad de audio/video](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/Cross-browser_audio_basics).

## Decisión: Canvas 2D compartido, rAF único, métricas de draw completado

**Elegido**: un canvas Canvas 2D para cinco funciones de dibujo modulares y un `requestAnimationFrame` mientras hay audio/visual activo y la página visible. Reusar arrays/buffers, registrar timestamp monotónico y secuencia después de completar los comandos de dibujo.

**Razones**: los visuales son gráficos 2D y pueden compartir superficie, dimensiones y muestras. Canvas evita DOM masivo; WebGL añadiría complejidad, context/resource lifecycle y shaders sin benchmark que lo justifique. SVG tampoco conviene para mutar miles de partículas por frame. El recuento de SC-003 es de salida de renderer terminada, no de callbacks agendados ni de captura de pantalla.

**Limitación**: `requestAnimationFrame` es pre-repaint, puede reducir frecuencia en pestañas en segundo plano y no prueba que el compositor haya presentado el frame físicamente. `performance.now()` al terminar el dibujo define una métrica reproducible de aplicación; no equivale a latencia de fotón.

**SC-013**: una señal de diagnóstico in-memory se programa con `AudioBufferSourceNode` y sample index conocido hacia el mismo analizador/render loop del producto. Pares locales de `AudioContext.currentTime` y `performance.now()` calibran el reloj fuente; `getOutputTimestamp()` queda como observación secundaria porque reporta timing de salida de audio. Cada renderer emite una firma de valores realmente entregados a dibujo. Oráculos y evidencia por modo están detallados en `plan.md`/`data-model.md`; son propuestas no validadas.

**Fuentes**: [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [getOutputTimestamp](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp).

## Decisión: GitHub Pages por Actions y ruta base explícita

**Elegido**: build `dist/`, Pages source = GitHub Actions; definir `base` como `/<repo>/` en repositorio de proyecto y `/` en sitio de usuario/org. Workflow con build y deploy jobs, artifact estático y permisos restringidos por job. Acciones fijadas a SHA revisado; solo `GITHUB_TOKEN` integrado, sin PAT ni secretos.

**Razones**: Vite documenta que el sitio de proyecto necesita base subpath y un workflow para construir el sitio. El flujo oficial de Pages publica artifacts estáticos usando `configure-pages`, `upload-pages-artifact` y `deploy-pages`. GitHub describe los permisos `pages: write`/`id-token: write` para deploy, y los permisos deben concederse solo al trabajo que los necesita. GitHub Free ofrece Pages gratis para repositorios públicos; esta condición de visibilidad debe confirmarse.

**Alternativas consideradas**: publicar `dist` por token personal a una rama `gh-pages` aumenta privilegios y requiere secreto; usar Netlify/Vercel u otro host cambia el requisito de Pages y puede introducir límites/tier; dominio propio es opcional y no es necesario.

**Fuentes**: [Vite: Deploying a Static Site](https://vite.dev/guide/static-deploy), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [custom GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [workflow permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Actions usage/billing](https://docs.github.com/en/actions/concepts/billing-and-usage).

## Decisión: accesibilidad del movimiento en motor, no solo CSS

**Elegido**: preferencias `prefers-reduced-motion` y ajuste WATCHER confluyen en settings del renderer. Se reducen desplazamiento, partículas, transiciones y overlays animados mientras permanecen visibles progreso y respuesta de audio.

**Razones**: silenciar solamente animaciones CSS no afecta un renderer Canvas. La preferencia debe cambiar parámetros del loop y seguir ofreciendo una salida reactiva perceptible. El estado esencial se comunica con HTML y no depende de color/animación solamente.

**Fuente**: [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility).

## Decisión: revisión explícita de dependencias y assets locales

**Elegido**: ninguna dependencia de runtime; dependencias de tooling limitadas a build, tipos y pruebas justificadas. Revisar versiones/licencias, supply chain, CVEs, dependencias transitivas y tamaño. Tipografía local o autoalojada con licencia comprobada; no importar CDN, métricas o trackers.

**Razones**: reduce fuga de red, costo de bundle y dependencia externa. El lockfile y `npm ci` fijan el grafo usado por CI.

## Resumen de investigación no resuelto

- Aprobación del umbral de contraste propuesto en spec; no sustituirlo con una decisión técnica implícita.
- Confirmación de que el repositorio puede ser público y por tanto elegible para GitHub Pages sin costo en GitHub Free.
- Validación real de los oráculos SC-013 y medición de costos/overhead de instrumentación; las fuentes confirman API disponible, no su validez en WATCHER.
- La compatibilidad móvil debe verificarse en Safari/Chrome reales; WebKit automatizado no demuestra Safari.

# Plan de implementación: WATCHER

**Rama**: `001-browser-music-visualizer` | **Fecha**: 2026-10-26 | **Especificación**: [spec.md](spec.md)

## Resumen

WATCHER será una aplicación estática de una sola página, escrita en TypeScript y compilada con Vite. La interfaz usará HTML semántico y CSS; un elemento de audio nativo reproducirá directamente el `File` elegido por el usuario mediante un object URL temporal. Web Audio API analizará la señal sin decodificar la biblioteca completa. Un único renderizador Canvas 2D reutilizable entregará los cinco modos visuales. No habrá backend, cuentas, analítica, APIs de pago, catálogo, almacenamiento de audio ni service worker.

La decisión privilegia la ruta más pequeña que satisface la experiencia reactiva: navegador para selección, reproducción y análisis; módulos TypeScript separados por dominio; HTML para controles accesibles; Canvas 2D para las formas visuales. Vite y TypeScript serán dependencias de desarrollo/compilación, no servicios de ejecución. Los tests pueden añadir dependencias de desarrollo justificadas, sin dependencias de ejecución del producto.

## Contexto técnico

**Lenguaje/versión**: TypeScript en modo estricto. Para herramientas: Node.js 24 LTS y npm con lockfile; seleccionar y fijar el parche LTS soportado al iniciar implementación. La documentación consultada de Vite 8 declara soporte para Node 20.19+ y 22.12+; Node 24 LTS satisface ese requisito.

**Dependencias principales**: Vite 8 para servidor local y compilación estática; TypeScript. Sin framework de interfaz, librería de visualización ni librería de audio en runtime. Vitest y Playwright son candidatos como dependencias solo de desarrollo: Vitest para lógica pura y Playwright para automatización Chromium/Firefox/WebKit; Safari real y la matriz móvil requieren navegadores/dispositivos reales. Confirmar versiones y licencias al instalarlas y registrar justificación, mantenimiento, vulnerabilidades y tamaño.

**Persistencia**: `localStorage` contiene solo valores validados de ajustes visuales, el preset seleccionado y versión de esquema. `File`, Blob, object URL, nombre del archivo y contenido no se guardan. No se requiere base de datos.

**Pruebas**: pruebas unitarias de reducers, normalización/validación de ajustes y extracción de firmas visuales; pruebas de integración de importación, reproducción, errores y liberación de recursos; navegadores de automatización para flujos compatibles; matriz manual con versiones reales exigidas por la especificación; auditoría manual de teclado/lector de pantalla y revisión visual; instrumentación de performance y privacidad para SC-003, SC-008, SC-010 y SC-013. Ningún umbral se considera aprobado antes de registrar los resultados y evidencias.

**Plataforma**: navegadores web compatibles con la política móvil y de escritorio de la especificación. Chrome 157.0.8103.15 o .16, Windows 11 x64, CPU de 4 núcleos, 16 GB RAM, gráficos integrados y viewport 1920×1080 se usan únicamente para benchmark de rendimiento y latencia. La política de compatibilidad es móvil y evolutiva; no se sustituye por Chrome 157.

**Tipo de proyecto**: aplicación web estática de cliente único.

**Objetivos de rendimiento**: SC-003: al menos 30 frames de renderizado completado en 57 de 60 intervalos de un segundo, por cada modo, con 10 s de calentamiento y 60 s de medición. SC-010: fallback luego de tres intervalos consecutivos por debajo de 30. SC-013: al menos 19/20 cambios por modo en ≤250 ms, pendiente del oráculo e instrumentación de este plan; no es un resultado actual.

**Restricciones**: audio solo local; no límites numéricos fijos de tamaño de archivo o playlist sin evidencia medida; solo el track activo se prepara para reproducirse; liberar URLs y nodos asociados al cambiar o retirar recursos; funcionar en la sesión ya cargada si cae la red; no se exige recargar offline. Visuales y controles no deben bloquear audio ni controles esenciales.

**Escala/alcance**: una sesión de reproducción activa; selección múltiple; cinco modos, cinco grupos de ajustes y cuatro presets; una página estática. Sin reproducción simultánea, biblioteca remota, cuentas, sincronización o analítica.

## Revisión constitucional

| Principio | Evaluación del diseño |
|---|---|
| Especificación primero y trazabilidad | Pasa: FR y SC se conservan; el mapa de verificaciones de `quickstart.md` los enlaza con pruebas y evidencia. |
| TypeScript y modularidad mantenible | Pasa: TypeScript estricto, módulos por responsabilidad, Vite, sin framework ni dependencia de audio/visualización. Toda nueva dependencia debe superar revisión de licencia, mantenimiento, seguridad y bundle. |
| Procesamiento local y titularidad de datos | Pasa: `File` seleccionado, URL temporal, reproducción/análisis en el navegador, solo ajustes inocuos locales. Sin upload, backend, analítica o API paga. |
| Seguridad y privacidad | Pasa por diseño: picker explícito, no escaneo del dispositivo, archivos tratados como datos, texto del usuario en `textContent`, entradas validadas, recursos liberados y permisos mínimos. |
| Accesibilidad, responsividad y estética auténtica | Pasa por diseño: controles HTML semánticos y teclado, contraste objetivo WCAG 2.2 aprobado (4.5:1 texto normal, 3:1 texto grande y no-texto relevante donde aplica), `prefers-reduced-motion`, Canvas separado de controles, tamaños 360×800 y 1280×800, criterios visuales humanos preservados. |
| Sitio cliente y GitHub Pages sin costo | Pasa por decisión aprobada: repositorio público; Pages estático sin costo, sin backend, cuentas, analítica, APIs de pago ni secretos. La elegibilidad del tier se verifica al desplegar. |
| Aceptación y verificación | Pasa en diseño, no en resultados: SC trae método y umbral; deben guardarse evidencias. Ningún criterio se reportará como completado sin ejecución. |

**Gate previo a implementación**: no hay violaciones constitucionales conocidas ni decisiones pendientes sobre visibilidad del repositorio, contraste objetivo o valores iniciales de controles; esas decisiones fueron aprobadas y ya están registradas en spec. El oráculo SC-013 y su overhead de diagnóstico siguen pendientes de verificación empírica; no se afirma que el umbral esté validado.

## Decisiones técnicas

### Stack y forma de la aplicación

- Usar TypeScript estricto, módulos ECMAScript, HTML semántico y CSS moderno; Vite compila a `dist/`. No adoptar React/Vue: no hay necesidad de UI dinámica que justifique una dependencia y el estado del producto cabe en controladores/módulos pequeños.
- Vite 8 como herramienta de desarrollo/build, TypeScript como única dependencia base de aplicación. npm y `package-lock.json` permiten instalaciones reproducibles mediante `npm ci`.
- Fijar `build.target` al baseline de sintaxis de los navegadores más antiguos admitidos por la política móvil/escritorio al release, y revisarlo al actualizar la matriz. No añadir plugin/polyfills legacy salvo que una prueba de esa matriz demuestre que hacen falta; APIs nativas se validan por separado y degradan de forma explícita.
- Sin router: WATCHER tiene una sola página y no define rutas profundas. No añadir PWA/service worker, almacenamiento offline ni polifills sin necesidad demostrada; offline reload no pertenece al alcance.
- Añadir Vitest/Playwright solo en `devDependencies` si la implementación confirma que cubren pruebas que no pueden realizarse razonablemente con APIs nativas. WebKit en Playwright no sustituye la validación en Safari oficial.

### Audio local y ciclo de vida

1. Un `<input type="file" multiple accept="audio/*,.mp3,.wav">` inicia la selección explícita. Extensión y `File.type` son pistas, no prueba de decodificación; `canPlayType()` también es orientativo. Antes de crear una URL o iniciar el grafo, tratar `File.size === 0` como `invalid/unreadable audio`; no definir un tamaño mínimo positivo. Se conserva cada ocurrencia con un ID nuevo, incluso si el mismo archivo se vuelve a elegir.
2. Las entradas inactivas conservan referencias `File` en memoria; no se crean object URLs ni se decodifican buffers para toda la playlist. Solo al activar una entrada se crea un URL temporal y se asigna al único `HTMLAudioElement`, con carga diferida.
3. El elemento nativo es autoridad para estado, eventos, tiempo, duración, seek y fallos. Desde una acción explícita del usuario se inicializa/reanuda `AudioContext` y se conecta una sola vez `MediaElementAudioSourceNode → AnalyserNode → GainNode → destination`. El volumen del control se expresa por GainNode. El `AnalyserNode` entrega datos de waveform y espectro sin cambiar intencionalmente la señal.
4. Play espera/resuelve `AudioContext.resume()` y `HTMLMediaElement.play()`; rechazos y eventos `error`, `stalled`, `ended`, falta de metadata y recursos agotados se convierten en estados de producto. No se compara el texto nativo del navegador. El mensaje incluye nombre de archivo y categoría, conserva entradas sanas y ofrece retry/remove.
5. Al cambiar de pista: detener el elemento, desconectar/reutilizar nodos de forma segura, revocar el URL anterior después de que deje de usarse y liberar referencias del track retirado. Al cerrar/remover el track activo se detiene inmediatamente. Al limpiar la sesión se cierran nodos/AudioContext si ya no son necesarios. Los errores de memoria no disparan una cuota fija: se informa la operación/archivo, se mantiene la playlist existente y solo se reintenta a solicitud.

**Formato**: prometer únicamente MP3/WAV según la matriz mínima definida en spec. Actualizar/registrar la matriz en la fecha de release. El soporte de MP3/WAV depende del navegador/plataforma; SC-001 lo demuestra con las seis fixtures en versiones objetivo. Otros tipos son best-effort. Una extensión engañosa se debe rechazar o categorizar según resultado del elemento/decodificador, sin analizar manualmente códecs.

### Renderizado y fallback

- Un `CanvasRenderingContext2D` con un render loop común consume buffers de frecuencia y tiempo reutilizados (typed arrays), dimensiones y settings; cinco renderers puros de modo generan dibujo/firma sin construir árboles DOM por frame. Controles y texto permanecen en HTML, fuera del canvas.
- Ejecutar un solo `requestAnimationFrame` por visualización activa y visible. Registrar `performance.now()` monotónico y secuencia **al completar todas las llamadas de dibujo del frame** (definición operativa de “application-rendered” para este plan); nunca contar callbacks programados como frames renderizados ni usar el conteo de una grabación. Ocultar/pausar visuales cuando la pestaña se oculte y reanudar al volver. El análisis distingue draw completado de presentación física/compositor: el navegador no ofrece un timestamp interoperable de fotón/pantalla para esta matriz.
- Reutilizar superficies y arrays, reducir backing resolution en pantallas de alto DPR bajo presión, limitar partículas en función del área del canvas y reciclarlas; evitar filtros costosos por pixel y `getImageData()` en el loop de producción. El overlay CRT será estático/ligero, con scanline animada desactivada en movimiento reducido.
- SC-003: iniciar perfil limpio y defaults documentados, warm-up de 10 s, medir 60 s posteriores por modo en foreground en Chrome 157 exacto; guardar log por frame y 60 contadores de segundo. Si fallback aparece, dejarlo activo y reportar el cambio; no ocultar sus frames. Umbral: 57/60 intervalos con ≥30 frames. Los logs de draw completo añaden un costo pequeño; se mide la aplicación con la instrumentación activa y no se afirma que eso mida presentación física.
- SC-010 reproducible: incluir solo en build de test un `FrameStressHarness` (no se publica en `dist`). Antes de cada render, inyectar 45 ms de carga determinista en el hilo de UI. El límite de 4 s es un timeout de seguridad para activar el fallback: si no se alcanzan tres ventanas consecutivas <30 fps antes de T+4 s, registrar fallo y retirar la carga inmediatamente. Cuando el fallback se activa dentro del plazo, mantener la misma carga artificial durante los 10 s completos de verificación de pause/resume/seek/volume/mode; retirarla solo al completar esos 10 s o al abortar por pestaña oculta/error del harness. Registrar cada frame completado, ventanas, inicio/fin de carga, timestamp/estado del fallback y cada acción/resultado. Repetir cinco corridas por modo; la pestaña debe permanecer visible. Es una simulación repetible de la condición del umbral, no representa todas las cargas reales.

### SC-013: alineación y oráculos de respuesta propuestos

**Instrumentación solo en test/diagnóstico, sin subir datos**:

- Para SC-013, generar el sweep de calentamiento y luego el buffer PCM diagnóstico en memoria. Programar cada `AudioBufferSourceNode` test-only a tiempos de contexto conocidos y conectarlos al mismo `AnalyserNode` y render loop que usa el producto. Antes de la prueba, detener/desconectar el `MediaElementAudioSourceNode` y confirmar que ninguna otra fuente alimenta el analizador; entre warm-up y diagnóstico detener y desconectar la fuente sweep. No usar archivo ni `HTMLMediaElement.currentTime` como reloj de eventos. El tiempo fuente de cada cambio es `startContextTime + sampleIndex / 44100`.
- En el diagnóstico fijar `AnalyserNode.fftSize = 8192` y `smoothingTimeConstant = 0`; registrar `AudioContext.sampleRate` y la duración efectiva de la ventana. Reservar el buffer de tiempo completo y calcular la ventana de los últimos 100 ms sobre las muestras disponibles. Si el `sampleRate` impide representar 100 ms con esos 8192 samples, invalidar/explicar esa corrida en vez de reportar un umbral.
- Calentar el mismo analizador/render loop durante 10 segundos con el sweep, detenerlo, aislarlo y reproducir la señal de cambios una sola vez. Para mapear tiempo de AudioContext a `performance.now()`, guardar pares simultáneos alrededor y durante la corrida, ajustar relación local y registrar residuales; residual máximo >5 ms, suspensión de contexto, pérdida de visibilidad o cambio de velocidad invalidan la corrida.
- Calibrar el reloj de AudioContext al reloj monotónico con pares simultáneos `{audioContext.currentTime, performance.now()}` capturados repetidamente alrededor del inicio y durante la señal; ajustar la relación local y registrar residuales. `getOutputTimestamp()` puede ser comprobación secundaria, pero su latencia de salida no reemplaza el tiempo del evento que alimenta el analizador. Invalidar la corrida si el residual máximo es >5 ms, el contexto se suspende o la velocidad cambia.
- Cada draw completado escribe una fila compacta: frame sequence, `performance.now()` al completar comandos Canvas, modo, settings efectivos, id del último evento fuente vigente y firma del modo. Tras registrar draw-complete, leer por `getImageData()` la ROI diagnóstica del canvas de salida en la ejecución SC-013; guardar métrica/ROI/pixel hash o los píxeles de evidencia en buffer local exportable. Nada se envía por red ni persiste entre sesiones.
- Mantener separadas dos pruebas: la **firma de comandos** mide los valores geométricos/cromáticos entregados al dibujo; la **verificación raster** mide el resultado real de esos comandos en el backing canvas. Un evento solo califica cuando ambas verificaciones pasan y el siguiente frame confirma persistencia. Latencia se atribuye al `drawCompletedAt` del primer frame, nunca al tiempo posterior que toma `getImageData()`.
- Overhead diagnóstico: correr en el mismo perfil y señal pruebas A/B idénticas con y sin raster readback/log de firmas; registrar duración de readback por frame (p50/p95/máximo), frames por segundo e impacto en el instante del primer frame que califica. El overhead **está pendiente de medir**; hasta registrar y revisar esta comparación, SC-013 permanece `pending` y no se afirma que 250 ms esté validado.

| Modo | Señal/observable dibujado | Oráculo de primera respuesta (dos frames consecutivos; primer frame es el timestamp) |
|---|---|---|
| Waveform | Firma: puntos/trazo y cruces por cero. Raster: píxeles de primer plano del trazo en el ROI de waveform. | Firma: estimación de frecuencia del trazo en los últimos 100 ms dentro de ±15% de 220/880 Hz, con ≥3 ciclos representados. Raster: línea visible dentro del ROI y el mismo conteo de cruces obtenido del trazo rasterizado dentro de ±15%. |
| Spectrum | Firma: alturas de bins/barras. Raster: columnas de píxeles dibujadas para las bandas objetivo y anterior. | Banda nueva (±10% de frecuencia esperada) tiene altura/energía ≥1.5× la banda anterior tanto en la firma como en columnas rasterizadas no vacías del canvas. |
| Radial | Firma: radios de spokes. Raster: longitud de los píxeles visibles de spokes de las bandas objetivo/anterior. | Media del radio nuevo ≥1.25× el anterior y cambia en sentido esperado; el recorrido raster de spokes muestra la misma relación dentro de ±10% de la medición geométrica. |
| Particle | Firma: cohorte/impulso/velocidad. Raster: píxeles no-background de la salida real dentro de ROI visible y solapados con la partícula identificada por la máscara determinista de test. | Driver nuevo cambia ≥25% y al menos una partícula de esa cohorte aparece en la lista de draw. El canvas de salida contiene píxeles de primer plano dentro del límite de esa partícula; la máscara solo identifica posición/cohorte y no sustituye la lectura del canvas real. |
| Psychedelic | Firma: hue del comando. Raster: muestras de color de píxeles de primer plano en ROI psicodélica. | Cambio circular de hue de la firma ≥30° hacia el valor de banda; hue circular medio de píxeles rasterizados de primer plano cambia ≥30° en el mismo sentido, con palette/settings fijos. |

Los criterios ROI usan canvas CSS normalizado (misma zona relativa por modo) y capturan píxeles del backing canvas justo después de draw-complete. Los límites/segmentación deben fijarse para fondo y forma reales; un hash diferente por sí solo no basta. Validar cada modo con respuestas conocidas 220↔880, control sin cambio de frecuencia y eventos falsos; validar que firmas y raster concuerdan; registrar falsos positivos/negativos, error del reloj y costo A/B de instrumentación. Si una ROI no separa fondo y figura o firma no predice píxeles, ajustar el oráculo antes de reportar. El overhead A/B está pendiente; no se declara resultado de 250 ms.

**Limitación SC-013**: Canvas draw completion no prueba el instante en que el compositor presenta los píxeles en un monitor. Con APIs web interoperables se medirá respuesta en la salida del renderer; si el requisito significa latencia física hasta pantalla, Clarify debe cambiar el criterio o acotar dispositivos/instrumentación externa antes de declararlo medido.

### Diseño visual, ajustes y accesibilidad

- Layout CSS responsivo, controles nativos `button`, `input range`/select con `<label>`, nombres accesibles, `aria-pressed` o estado equivalente, valores anunciados sin anuncios por frame, foco visible y orden lógico de teclado. Canvas no será el único portador de estado ni recibirá foco; anunciar modo, play state y progreso en elementos HTML.
- `prefers-reduced-motion: reduce` y control de movimiento limitan desplazamientos, partículas y transiciones; conservar cambios de amplitud/frecuencia legibles. No usar parpadeo estroboscópico. El loop se detiene al pausar o esconder pestaña y no altera reproducción.
- Diseño Y2K propio: tipografía display autoalojada/licencia revisada o stacks locales, tipografía de controles legible, marcos cromados/bevel, textura CRT de bajo costo, cuatro presets modificables y estructuras visuales distintas. No copiar logos/assets de Winamp/WMP. El overlay visual nunca cubrir controles ni degradar contraste.
- Medir WCAG para cada preset y viewport. La spec aprueba al menos 4,5:1 para texto normal y 3:1 para texto grande y elementos no textuales relevantes donde aplica WCAG 2.2; verificar esos objetivos con informe automatizado y revisión manual.

### Privacidad, seguridad y dependencias

- No usar `innerHTML` con nombres/metadatos de archivo; insertar mediante `textContent`. No cargar rutas/URLs obtenidas del nombre; un object URL solo viene de la selección y se revoca. No inspeccionar directorios, no usar File System Access API, no pedir permisos adicionales.
- Limitar los datos persistidos a JSON versionado de visual settings; validar tipo, enum y rango al leerlo, ignorar JSON corrupto/versión futura y volver a defaults. Nunca guardar nombre, `File`, Blob, object URL o contenido.
- No incluir fuentes remotas, trackers, telemetría, CDNs runtime, endpoints de analítica ni peticiones no necesarias. El test de red debe distinguir entrega inicial de assets estáticos de cualquier transferencia de audio/analítica. GitHub Pages puede registrar metadatos de solicitudes del sitio como proveedor; WATCHER no controla logs de infraestructura del host y no añadirá sus propios registros.
- Revisar licencias, mantenimiento, CVEs, versiones transitivas y tamaño de dependencias en instalación y actualizaciones; preferir APIs nativas. Commit de lockfile, automatizar auditoría de dependencia en CI con salida revisada; no convertir un scanner remoto/pago en dependencia runtime.

### GitHub Pages y GitHub Actions

- Construir `/dist` y desplegar por GitHub Actions a Pages; no usar backend ni secretos personales/PAT. Para un sitio de proyecto, `base` debe ser `/${REPOSITORY_NAME}/`; para un sitio raíz de usuario/org, `/`. La configuración Vite consume `VITE_BASE_PATH` durante build. En Actions derivarlo del nombre del repositorio (`GITHUB_REPOSITORY` después de `/`); en desarrollo local, base `/`. Recursos estáticos internos se referencian con `import.meta.env.BASE_URL`; probar importación de assets y refresh de `/` del sitio publicado.
- Configurar GitHub Pages source como GitHub Actions. Flujo: push a rama por defecto + `workflow_dispatch`; checkout; configurar Node LTS; `npm ci`; lint/typecheck/tests/build; subir únicamente `dist`; deploy al entorno `github-pages`. El job de deploy tendrá una condición que exige `github.ref_name == github.event.repository.default_branch`; una ejecución manual desde otra rama puede compilar, pero nunca publicar. Congelar acciones de terceros por SHA de commit revisado y actualizar por PR. No guardar `secrets.*`, PAT ni claves en el repositorio.
- Aplicar permisos por job: build `contents: read` y sin permisos de Pages/OIDC; deploy solo `pages: write` e `id-token: write`, sin checkout del repo si los artifacts son suficientes. Usar `concurrency` del grupo Pages para evitar despliegues concurrentes. En Settings → Environments → `github-pages`, restringir deployment branches/tags a la rama predeterminada; la condición del job y el environment son ambas barreras. Mantener el `GITHUB_TOKEN` efímero de Actions como mecanismo de publicación, nunca guardarlo como secreto de usuario.
- El repositorio público está aprobado para cumplir el objetivo de Pages gratuito en GitHub Free. Verificar el tier vigente al publicar; no introducir proveedor pago ni cambiar hosting.
- No es necesario un dominio propio. El hostname `github.io` y la URL del proyecto satisfacen el alcance. GitHub Actions/Pages no implican un servicio pago para un repositorio público elegible; comprobar la política vigente y el tier del repo al publicar.

## Estructura propuesta del proyecto

```text
index.html
vite.config.ts
tsconfig.json
package.json
package-lock.json
.github/
└── workflows/
    └── deploy.yml
src/
├── main.ts
├── app/
│   ├── AppController.ts
│   └── appState.ts
├── domain/
│   ├── models.ts
│   ├── settings.ts
│   └── audioFeatures.ts
├── audio/
│   ├── AudioLibrary.ts
│   ├── PlaybackEngine.ts
│   └── AudioGraph.ts
├── visual/
│   ├── CanvasRenderer.ts
│   ├── FrameMonitor.ts
│   ├── features.ts
│   └── modes/
│       ├── waveform.ts
│       ├── spectrum.ts
│       ├── radial.ts
│       ├── particle.ts
│       └── psychedelic.ts
├── persistence/
│   └── SettingsRepository.ts
├── ui/
│   ├── PlayerView.ts
│   ├── TrackListView.ts
│   └── SettingsView.ts
└── styles/
    ├── tokens.css
    ├── layout.css
    └── visualizer.css
tests/
├── unit/
├── integration/
├── browser/
├── visual/
├── performance/
├── fixtures/
│   ├── audio/
│   └── manifest.json
└── support/
    ├── FrameStressHarness.ts
    └── VisualResponseProbe.ts
scripts/
└── generate-audio-fixtures.mjs
```

La estructura separa la administración de `File`/URLs, la sesión de reproducción, configuración/persistencia, dibujo y vistas accesibles. Evita un backend, una capa genérica de servicios y una arquitectura de paquetes múltiple. `contracts/` se omite porque no hay endpoint ni contrato público para sistemas externos; los contratos de módulos internos se documentan en `data-model.md`.

## Decisiones, contradicciones y preguntas pendientes

1. **SC-013 y overhead**: los oráculos de firmas+salida raster están definidos como protocolo pero faltan implementación, A/B de overhead y validación de falsos positivos/negativos. 250 ms sigue siendo umbral objetivo, no resultado medido.
2. **Salida raster vs. pantalla**: `getImageData()` verifica píxeles del backing canvas, no cuándo el compositor los presenta físicamente. SC-013/SC-003 miden renderer completado.
3. **Carga SC-010**: la carga sintética es repetible, no representa todos los perfiles reales. La corrida se invalida si la pestaña se oculta; el resultado no demuestra recuperación general en dispositivos no medidos.
4. **Política móvil**: la matriz exige Safari/Chrome móviles reales; Playwright/WebKit no los reemplaza. Registrar dispositivo/versión en evidencia, sin usar Chrome 157 de escritorio como sustituto.
5. **Bandas y sensibilidad**: valores iniciales aprobados; bordes exactos bass/mid/treble y la transformación de sensibilidad 0–100 deben fijarse y congelarse en la implementación, conservando balanced con pesos iguales.

No hay decisiones de producto pendientes sobre visibilidad del repo, contraste o valores iniciales. El overhead diagnóstico y el resultado empírico de SC-013 permanecen pendientes; tampoco se presume rendimiento de SC-003/010.

## Verificación y criterios de salida del diseño

- Mantener una fila de evidencia por SC de la spec; registrar browser/build/hash de fixtures/hardware/viewport/defaults/ajustes/test output y veredicto. Los resultados que no se midieron quedan “pendientes”, no “pass”.
- Reproducir fixtures deterministas WAV/MP3, guardar licencia/receta, encoder/versión y SHA-256; ejecutar matriz de seis fixtures separada del Chrome 157 benchmark.
- Confirmar importación y playback, HTML media state, volumen/seek, modos, presets y ajuste de controles; manejar cancelación, file errors, browser decode errors, playback rejection, faltante de duración y agotamiento de recursos.
- Verificar SC-003 con logs por draw completado; SC-010 con harness test-only y log de fallback; SC-013 solo después de validar los cinco oráculos y el reloj. No usar screen recordings como contador de frames o cronómetro de latencia.
- Revisar contraste automatizado por preset contra los objetivos WCAG 2.2 aprobados (4,5:1 para texto normal; 3:1 para texto grande y elementos no textuales relevantes donde aplica), y revisar foco, teclado, lector de pantalla, reducción de movimiento y legibilidad manual. Mantener los resultados de verificación pendientes hasta medirlos.
- Auditar solicitudes de red/permisos con el sitio cargado, archivos locales, conexión desconectada y refresco/reapertura separados; demostrar que audio nunca se envía y que no hay analítica/cuentas. No requerir offline reload.
- Compilar la salida bajo el subpath del repo, inspeccionar asset URLs, abrir URL HTTPS limpia, recargar la página de entrada y revisar Actions permissions/artifact/tier. Confirmar que el repositorio es elegible para Pages gratuito.
- Revisión visual humana debe documentar pass/revise con capturas para cada fila del checklist; ningún análisis automatizado sustituye autenticidad Y2K ni identidad de los cinco modos.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación/verificación |
|---|---|---|
| MP3/WAV varían por navegador, SO y encoder | Fallos de import/reproducción incompatibles | Fixtures reproducibles y seis entradas; validar cada versión de soporte con categorías propias, no mensajes nativos. |
| `AudioContext` suspendido por autoplay policy | Audio/visual no inicia | Construir/reanudar ante gesto explícito; manejar promesa rechazada y estado fiel. |
| Media source conectada incorrectamente puede silenciar audio | Core feature inutilizable | Una sola fuente por media element y ruta explícita a destination; prueba de audio audible antes de optimizar. |
| Archivos/playlists grandes consumen memoria y URLs | Tab bloqueada o memoria agotada | Preparar solo activo, no `decodeAudioData` de todo el archivo, sin URLs para inactivos, revocar recursos, manejo de error sin límites arbitrarios. |
| Reloj/firma de SC-013 produce falsos positivos o altera tiempo | Afirmación inválida de 250 ms | Firmas solo diagnóstico, reloj monotónico calibrado, estado retenido de dos frames, pruebas negativas y control de overhead; SC-013 no se declara hasta validar. |
| Stress sintético no representa carga real | Fallback pasa trigger pero no UX real | Separar prueba de umbral reproducible de los 60s por modo y de una pasada de usability bajo carga real; dejar explícita limitación. |
| Canvas draw completion se confunde con pantalla presentada | Resultado de latencia sobreprometido | Etiquetar medida como respuesta del renderer, no fotón; revisar especificación si exige presentación física. |
| Ruta base incorrecta en Pages | JS/CSS/assets 404 al usar URL `/repo/` | Calcular `base` de repo en build, usar `BASE_URL`, validar build bajo subpath y URL publicada. |
| Acción de tercero/permiso amplio en CI | Riesgo supply chain o escritura accidental | SHA pin revisado, permisos a nivel job, sin PAT/secrets, artifact `dist` solamente, environment `github-pages`. |
| `workflow_dispatch` apunta a otra rama | Despliegue de código no predeterminado | Guard explícito en job y environment de Pages limitado a la rama por defecto; ejecución manual en otra rama nunca despliega. |
| Dependencia de fuentes/servicios externos filtra requests | Privacidad y render inconsistente offline | Fuentes locales/autoalojadas con licencia, cero CDN o analítica; auditoría de red. |
| Efectos decorativos afectan legibilidad o bajo movimiento | Exclusión, pérdida de contenido | Separar UI/canvas, contrastes por palette, CRT no obstruye, movimiento reducido y revisión humana. |
| Pages gratuito requiere repo público | Bloquea despliegue sin costo si repo debe quedar privado | Confirmar visibilidad. No ocultar el costo ni adoptar host alterno sin aprobación. |

## Costos esperados

- **Runtime/hosting**: USD 0 para URL `github.io` y GitHub Pages en el repo público aprobado y elegible en GitHub Free; sin backend, dominio pagado ni API externa. Sin costo de cuenta de WATCHER ni servicio runtime. Verificar tier vigente al publicar.
- **CI**: workflow con GitHub Actions y `GITHUB_TOKEN` integrado; para repo público elegible, build estático y deploy no requieren secretos personales ni un proveedor externo. Revisar límites de uso/política al crear el workflow.
- **Dependencias**: Vite, TypeScript y tooling test open-source sin costo de licencia previsto; revisar términos/versiones al adoptarlos. Ninguna suscripción requerida.
- **Costos de usuario**: dispositivo/navegador y acceso a Internet para la primera carga; la sesión ya abierta puede continuar tras desconexión. El plan no requiere equipo pago especial excepto que el perfil Chrome 157 se encuentre disponible para benchmark.
- **Opcional y fuera de requisito**: dominio propio, hosting alternativo, servicios de monitoreo o API paga no se incluyen.

## Investigación

Las decisiones y fuentes oficiales se desarrollan en [research.md](research.md). El modelo de dominio, firmas SC-013 y ciclo de vida están en [data-model.md](data-model.md); pasos de validación y criterios de evidencia están en [quickstart.md](quickstart.md).

## Estructura de documentación Spec Kit

```text
specs/001-browser-music-visualizer/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── checklists/requirements.md
```

`tasks.md` no se crea en este flujo. No se generó código.

## Revisión constitucional posterior al diseño

La arquitectura propuesta sigue procesamiento local, TypeScript modular, dependencias runtime mínimas, controles accesibles, degradación segura, privacidad, revisión de dependencias y publicación estática. No aparece excepción de constitución. El cumplimiento de calidad queda sin resultado hasta ejecución: faltan pruebas de compatibilidad y performance, revisión de contraste y visual, medidas reales de SC-013, verificación de costos/visibilidad GitHub y evidencia de privacidad/accessibilidad. No se afirma que WATCHER ni ningún SC esté terminado.

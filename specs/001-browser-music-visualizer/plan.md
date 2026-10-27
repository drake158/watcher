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
| Accesibilidad, responsividad y estética auténtica | Pasa por diseño: controles HTML semánticos y teclado, contraste sujeto al umbral propuesto y pendiente de aprobación, `prefers-reduced-motion`, Canvas separado de controles, tamaños 360×800 y 1280×800, criterios visuales humanos preservados. |
| Sitio cliente y GitHub Pages sin costo | Condicional: Pages gratuito para proyecto depende de la elegibilidad/visibilidad del repositorio. Confirmar si el repositorio puede ser público bajo GitHub Free antes de dar por cerrado costo y despliegue. |
| Aceptación y verificación | Pasa en diseño, no en resultados: SC trae método y umbral; deben guardarse evidencias. Ningún criterio se reportará como completado sin ejecución. |

**Gate previo a implementación**: no hay violaciones arquitectónicas conocidas. Dos decisiones explícitamente no ratificadas permanecen abiertas: (1) confirmar los umbrales de contraste propuestos WCAG que la propia especificación marca “confirmar antes de finalizar”; (2) confirmar la visibilidad pública requerida para usar Pages sin costo en GitHub Free. El diseño no trata ambas como decisiones aprobadas. SC-013 queda además condicionado al oráculo y validación descritos abajo; la incertidumbre de implementación se resuelve como trabajo de diseño técnico, no como resultado medido.

## Decisiones técnicas

### Stack y forma de la aplicación

- Usar TypeScript estricto, módulos ECMAScript, HTML semántico y CSS moderno; Vite compila a `dist/`. No adoptar React/Vue: no hay necesidad de UI dinámica que justifique una dependencia y el estado del producto cabe en controladores/módulos pequeños.
- Vite 8 como herramienta de desarrollo/build, TypeScript como única dependencia base de aplicación. npm y `package-lock.json` permiten instalaciones reproducibles mediante `npm ci`.
- Fijar `build.target` al baseline de sintaxis de los navegadores más antiguos admitidos por la política móvil/escritorio al release, y revisarlo al actualizar la matriz. No añadir plugin/polyfills legacy salvo que una prueba de esa matriz demuestre que hacen falta; APIs nativas se validan por separado y degradan de forma explícita.
- Sin router: WATCHER tiene una sola página y no define rutas profundas. No añadir PWA/service worker, almacenamiento offline ni polifills sin necesidad demostrada; offline reload no pertenece al alcance.
- Añadir Vitest/Playwright solo en `devDependencies` si la implementación confirma que cubren pruebas que no pueden realizarse razonablemente con APIs nativas. WebKit en Playwright no sustituye la validación en Safari oficial.

### Audio local y ciclo de vida

1. Un `<input type="file" multiple accept="audio/*,.mp3,.wav">` inicia la selección explícita. Extensión y `File.type` son pistas, no prueba de decodificación; `canPlayType()` también es orientativo. Se conserva cada ocurrencia con un ID nuevo, incluso si el mismo archivo se vuelve a elegir.
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
- SC-010 reproducible: incluir solo en build de test un `FrameStressHarness` accesible por prueba automatizada (no se publica en `dist`). Antes de cada render durante 4 s, el harness ejecuta una carga determinista de 45 ms en el hilo de UI; la medición real sigue siendo los timestamps al terminar cada draw. Correr en cada modo/perfil de referencia, loguear cada ventana de 1 s, los tres intervalos <30 fps y el instante/estado del fallback. La carga se desactiva al terminar el tercer intervalo; observar fallback visible y operar pause/resume/seek/volume/mode durante 10 s. Repetir cinco corridas por modo; todas deben activar antes/final del tercer intervalo, mostrar la reducción/aviso y superar las operaciones. Esto fuerza el umbral de forma reproducible, no prueba que la carga represente todo dispositivo real.

### SC-013: alineación y oráculos de respuesta propuestos

**Instrumentación solo en test/diagnóstico, sin subir datos**:

- Para SC-013, generar el buffer PCM diagnóstico en memoria y programar un `AudioBufferSourceNode` test-only a un tiempo de contexto futuro conocido. Conectarlo al mismo `AnalyserNode` y render loop que usa el producto; no usar archivos ni `HTMLMediaElement.currentTime` para marcar eventos. El tiempo fuente de cada cambio es `startContextTime + sampleIndex / 44100`.
- Calibrar el reloj de AudioContext al reloj monotónico con pares simultáneos `{audioContext.currentTime, performance.now()}` capturados repetidamente alrededor del inicio y durante la señal; ajustar la relación local y registrar residuales. `getOutputTimestamp()` puede ser comprobación secundaria, pero su latencia de salida no reemplaza el tiempo del evento que alimenta el analizador. Invalidar la corrida si el residual máximo es >5 ms, el contexto se suspende o la velocidad cambia.
- Cada draw completado escribe una fila compacta: frame sequence, `performance.now()` al completar dibujo, modo, settings efectivos, id del último evento fuente vigente y firma del modo. Mantener ring buffer en memoria exportable por el tester; nada se envía por red ni queda en almacenamiento entre sesiones.
- Los renderers emiten en modo test una firma derivada de los mismos valores que dibujan (puntos/trazos, alturas/radios, parámetros de partículas o color). El timestamp de respuesta es el timestamp de fin del primer draw cuya firma cumple el oráculo y cuyo frame siguiente también lo cumple; para latencia se asigna el timestamp del primer frame, no el del frame confirmatorio. Esto evita lectura de píxeles por frame, que modificaría el rendimiento.

| Modo | Señal/observable dibujado | Oráculo de primera respuesta (dos frames consecutivos; primer frame es el timestamp) |
|---|---|---|
| Waveform | Puntos/segmentos de la forma temporal que se dibujaron en el canvas | Medir cruces por cero en los últimos 100 ms de muestras representados por el trazo. Firma corresponde a la nueva frecuencia esperada (220 u 880 Hz) con error relativo ≤15%; exigir al menos tres ciclos representados y tamaño de canvas no inferior al viewport de prueba. |
| Spectrum | Altura de bins/barras en bandas dibujadas | Energía media del grupo de bins alrededor de frecuencia nueva, dentro de ±10%, queda ≥1.5× la energía de la banda anterior; firma usa las alturas realmente entregadas al dibujo. |
| Radial | Radio/desplazamiento de spokes asociados a bins | Media de desplazamiento radial de spokes de banda nueva queda ≥1.25× banda anterior y cambia al sentido esperado; firma usa radios ya preparados para el dibujo. |
| Particle | Velocidad/impulso de partículas producidas por la energía espectral | El atributo dibujado de impulso/velocidad esperado pasa el umbral de cambio relativo ≥25% entre bandas y al menos una partícula de esa cohorte aparece en la lista de draw del frame. El renderer debe asociar explícitamente el driver a la energía de banda que se alterna. |
| Psychedelic | Parámetro cromático derivado de banda (hue) usado por los comandos de dibujo | La firma cromática del frame avanza ≥30° en hue hacia el valor predefinido para la banda nueva, con la diferencia calculada en el círculo HSL más corto; palette/setting de benchmark permanece fija. |

Los umbrales de firma son **propuesta de plan**, deben validarse antes de medir SC-013: verificar respuesta positiva con 220↔880, verificar ausencia de respuesta al repetir frecuencia sin cambio y al insertar eventos falsos, revisar el vector/firma contra los comandos Canvas de ese frame y cuantificar error de alineación y costo del logger. Si una firma no representa el efecto visible o produce falsos positivos, corregirla y documentar el oráculo antes de reportar cualquier resultado. La señal diagnóstica tiene 20 cambios; aprobar SC-013 requiere ≤250 ms en al menos 19/20 por modo. No afirmamos que el umbral ni los oráculos estén validados.

**Limitación SC-013**: Canvas draw completion no prueba el instante en que el compositor presenta los píxeles en un monitor. Con APIs web interoperables se medirá respuesta en la salida del renderer; si el requisito significa latencia física hasta pantalla, Clarify debe cambiar el criterio o acotar dispositivos/instrumentación externa antes de declararlo medido.

### Diseño visual, ajustes y accesibilidad

- Layout CSS responsivo, controles nativos `button`, `input range`/select con `<label>`, nombres accesibles, `aria-pressed` o estado equivalente, valores anunciados sin anuncios por frame, foco visible y orden lógico de teclado. Canvas no será el único portador de estado ni recibirá foco; anunciar modo, play state y progreso en elementos HTML.
- `prefers-reduced-motion: reduce` y control de movimiento limitan desplazamientos, partículas y transiciones; conservar cambios de amplitud/frecuencia legibles. No usar parpadeo estroboscópico. El loop se detiene al pausar o esconder pestaña y no altera reproducción.
- Diseño Y2K propio: tipografía display autoalojada/licencia revisada o stacks locales, tipografía de controles legible, marcos cromados/bevel, textura CRT de bajo costo, cuatro presets modificables y estructuras visuales distintas. No copiar logos/assets de Winamp/WMP. El overlay visual nunca cubrir controles ni degradar contraste.
- Medir WCAG para cada preset y viewport. La spec propone 4.5:1 texto normal, 3:1 texto grande/no-texto; no se tratan como acuerdo final mientras la clarificación está pendiente.

### Privacidad, seguridad y dependencias

- No usar `innerHTML` con nombres/metadatos de archivo; insertar mediante `textContent`. No cargar rutas/URLs obtenidas del nombre; un object URL solo viene de la selección y se revoca. No inspeccionar directorios, no usar File System Access API, no pedir permisos adicionales.
- Limitar los datos persistidos a JSON versionado de visual settings; validar tipo, enum y rango al leerlo, ignorar JSON corrupto/versión futura y volver a defaults. Nunca guardar nombre, `File`, Blob, object URL o contenido.
- No incluir fuentes remotas, trackers, telemetría, CDNs runtime, endpoints de analítica ni peticiones no necesarias. El test de red debe distinguir entrega inicial de assets estáticos de cualquier transferencia de audio/analítica. GitHub Pages puede registrar metadatos de solicitudes del sitio como proveedor; WATCHER no controla logs de infraestructura del host y no añadirá sus propios registros.
- Revisar licencias, mantenimiento, CVEs, versiones transitivas y tamaño de dependencias en instalación y actualizaciones; preferir APIs nativas. Commit de lockfile, automatizar auditoría de dependencia en CI con salida revisada; no convertir un scanner remoto/pago en dependencia runtime.

### GitHub Pages y GitHub Actions

- Construir `/dist` y desplegar por GitHub Actions a Pages; no usar backend ni secretos personales/PAT. Para un sitio de proyecto, `base` debe ser `/${REPOSITORY_NAME}/`; para un sitio raíz de usuario/org, `/`. La configuración Vite consume `VITE_BASE_PATH` durante build. En Actions derivarlo del nombre del repositorio (`GITHUB_REPOSITORY` después de `/`); en desarrollo local, base `/`. Recursos estáticos internos se referencian con `import.meta.env.BASE_URL`; probar importación de assets y refresh de `/` del sitio publicado.
- Configurar GitHub Pages source como GitHub Actions. Flujo: push a rama por defecto + dispatch manual; checkout; configurar Node LTS; `npm ci`; lint/typecheck/tests/build; subir únicamente `dist`; deploy al entorno `github-pages`. Congelar acciones de terceros por SHA de commit revisado y actualizar por PR. Sin `secrets.*`, token personal ni claves de deploy.
- Aplicar permisos por job: build `contents: read` y sin permisos de Pages/OIDC; deploy solo `pages: write` e `id-token: write`, sin checkout del repo si los artifacts son suficientes. Usar `concurrency` del grupo Pages para evitar despliegues concurrentes. Rama y environment limitan el origen del deploy.
- El hosting sin costo con GitHub Free para Pages exige un repositorio público. Confirmar que la visibilidad pública está permitida. Si se necesita repositorio privado bajo un plan pago, chocaría con el requisito “sin costo”; no sustituirlo silenciosamente por otro host.
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

1. **Visibilidad del repositorio**: ¿puede ser público? La ruta gratuita de GitHub Pages presupone repo público en GitHub Free. La especificación no define privacidad del repositorio.
2. **Contraste**: los ratios WCAG indicados en la checklist de spec se llaman “propuestos” y solicitan confirmación. Plan los usa para diseño preliminar, pero la aceptación final queda pendiente de aprobación.
3. **Definición de frame**: SC pide frame application-rendered; este plan fija operacionalmente el fin del dibujo Canvas 2D. No mide cuándo el compositor lo presenta físicamente. Si la intención era latencia de pantalla, hay que ajustar SC-003/013.
4. **Oráculos SC-013**: hay métricas y umbrales propuestos por modo, aún no implementados ni validados. El resultado de latencia seguirá “no medido” hasta superar pruebas positivas/negativas y corroborar las firmas con el dibujo real.
5. **Política de navegadores móvil**: SC-001/005/006/008 usan la última versión estable móvil de Safari/Chrome, mientras Playwright solo ayuda con motores y no reemplaza móviles reales. La matriz de hardware/dispositivos móviles de prueba debe quedar registrada en quickstart y reportes, sin convertir Chrome 157 de escritorio en sustituto.
6. **Default visual**: SC-003 menciona defaults, pero spec no asigna números a sensibilidad, bandas, color, motion o intensidad. Se debe elegir y documentar un default neutral, al igual que rangos/step de sliders, durante diseño visual; el valor debe permanecer fijo para pruebas comparables.
7. **Carga SC-010**: el harness de 45 ms será un estímulo sintético, no una descripción de jank de todo hardware real. Es repetible y valida detección/reacción, pero no demuestra que toda degradación real se detecte/recupere en igual tiempo.

No se cambia la spec para resolver estos puntos. Las respuestas que alteren alcance, privacidad, visibilidad o criterios requieren actualización explícita de `spec.md` antes de implementation. Las definiciones de instrumentación/medición dentro de este plan son propuestas técnicas y tampoco significan aprobación del resultado.

## Verificación y criterios de salida del diseño

- Mantener una fila de evidencia por SC de la spec; registrar browser/build/hash de fixtures/hardware/viewport/defaults/ajustes/test output y veredicto. Los resultados que no se midieron quedan “pendientes”, no “pass”.
- Reproducir fixtures deterministas WAV/MP3, guardar licencia/receta, encoder/versión y SHA-256; ejecutar matriz de seis fixtures separada del Chrome 157 benchmark.
- Confirmar importación y playback, HTML media state, volumen/seek, modos, presets y ajuste de controles; manejar cancelación, file errors, browser decode errors, playback rejection, faltante de duración y agotamiento de recursos.
- Verificar SC-003 con logs por draw completado; SC-010 con harness test-only y log de fallback; SC-013 solo después de validar los cinco oráculos y el reloj. No usar screen recordings como contador de frames o cronómetro de latencia.
- Revisar contraste automatizado por preset y revisar foco, teclado, lector de pantalla, reducción de movimiento y legibilidad manual. Resolver la ratificación WCAG antes de cerrar requisito.
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
| Dependencia de fuentes/servicios externos filtra requests | Privacidad y render inconsistente offline | Fuentes locales/autoalojadas con licencia, cero CDN o analítica; auditoría de red. |
| Efectos decorativos afectan legibilidad o bajo movimiento | Exclusión, pérdida de contenido | Separar UI/canvas, contrastes por palette, CRT no obstruye, movimiento reducido y revisión humana. |
| Pages gratuito requiere repo público | Bloquea despliegue sin costo si repo debe quedar privado | Confirmar visibilidad. No ocultar el costo ni adoptar host alterno sin aprobación. |

## Costos esperados

- **Runtime/hosting**: USD 0 para URL `github.io` y GitHub Pages en un repo público elegible de GitHub Free; sin backend, dominio pagado ni API externa. Sin costo de cuenta de WATCHER ni servicio runtime. Condicionado a verificar la política/tier vigente al publicar.
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

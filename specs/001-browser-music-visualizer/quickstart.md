# Guía de validación de diseño: WATCHER

Esta guía indica cómo implementar y verificar los criterios cuando exista código. Los comandos son el contrato propuesto de los scripts futuros; **no se ejecutaron en esta fase** porque aún no hay aplicación ni `package.json`. No se incluyen tareas de implementación.

## Prerrequisitos previstos

- Node.js 24 LTS (parche fijado en `.nvmrc`/CI al iniciar implementación) y npm compatible.
- Navegadores cubiertos por la política: latest two stable major versions desktop Chrome, Edge, Firefox y Safari; latest stable mobile Safari/Chrome.
- Para performance/latencia: Windows 11 x64, CPU 4-core, RAM 16 GB, GPU integrada, viewport 1920×1080 y Chrome 157.0.8103.15 o .16. Este equipo es solo benchmark, no una sustitución de la matriz mínima.
- Acceso local a fixtures legales sintéticas; reporte con browser/build/hardware, versiones de encoder, hashes, settings, viewport y evidencia.

## Arranque/build previstos

```powershell
npm ci
npm run dev
npm run check
npm run test
npm run build
```

Esperado después de implementación: instalación reproducible; servidor local sirve aplicación estática; `check` cubre typecheck/lint; `test` ejecuta unitarias y suites de navegador indicadas; build genera únicamente `dist/`. Estos comandos quedan por crear. No comprobar rutas de backend porque no existe una.

## Fixtures de audio

La tabla normativa de los seis archivos, tolerancias de duración, codecs y recetas está en [SC-001 de spec.md](spec.md#measurable-outcomes). La generación futura debe:

1. Crear PCM sintético de tono 440 Hz y sweep 110–880 Hz, stereo 44.1 kHz, 16-bit, 10 s y -12 dBFS con fórmula de spec.
2. Guardar WAV y codificar MP3 MPEG-1 Layer III, 128 kbps CBR, 44.1 kHz; registrar versión del encoder y SHA-256 en `manifest.json`.
3. Derivar `truncated.wav` reteniendo 20 bytes de `tone.wav`; crear `unsupported.txt` como define spec.
4. No usar grabaciones, composiciones ni música con copyright. Los cuatro válidos y los dos inválidos son pequeños archivos de test; no se entregan en producción, salvo que se apruebe otra distribución.
5. Crear por separado un `File` vacío de cero bytes y probarlo junto con audio válido. Es un caso de error suplementario, no una séptima fixture del corpus de compatibilidad; debe recibir categoría `invalid/unreadable audio` con nombre, retry/remove y sin impedir reproducir las demás entradas.

El benchmark SC-003 se genera a partir de siete sweeps concatenados (10 s warm-up + 60 s medidos). La señal diagnóstica SC-013 separada es el tono alternante de 10.5 s descrito en spec. No agregar ambas señales a la matriz de seis compatibilidad.

## Validación por criterio

| Spec | Escenario/ejecución prevista | Condición y evidencia que se conserva |
|---|---|---|
| FR-001–005 / SC-001–002 | Importar cada fixture; seleccionar pistas; reproducir, pausar, seek, volumen, medir duración/progreso y completar track; participant task de SC-002. | Una fila por navegador/fixture; resultado de decode/play, categoría propia, nombre, acción retry/remove, duración, log de controles; 10 tareas de usuario con tiempos para SC-002. |
| FR-006–009 / SC-004 | En `sweep.wav`, recorrer cinco modos, cinco ajustes y cuatro presets; capturas a 360×800 y 1280×800. | Resultado por control/preset y checklist humano `pass/revise` con screenshot para cada fila visual. Comparar modos manteniendo paleta/settings salvo modo. |
| FR-010–011 / AS-006–009 | Importar las seis fixtures junto con archivo válido y el caso suplementario de cero bytes; probar picker cancelado, track vacío, playback rechazado, duración desconocida y removal/retry. | El cero bytes falla antes de URL/grafo como `invalid/unreadable audio`, muestra nombre y retry/remove; audio válido continúa. No se impone mínimo positivo. |
| FR-003 / FR-022 | Seleccionar el mismo archivo dos veces, dos archivos de igual nombre y una playlist grande; alternar/quitar. | IDs distintos por selección; una sola entrada quitada; activa se detiene y URL revoca. Reportar errores de memoria, preservar resto; inspección confirma sin caps arbitrarios ni preparar todas las pistas. |
| FR-012–014 / SC-005–007 | Completar core tasks con teclado y lector de pantalla; viewports 360×800/1280×800; activar reduced motion antes de abrir. | Registro por browser y viewport; foco/label/state/keyboard trap, scroll/clipping/overlap; review de los cinco modos y continuidad de audio/progreso. Contrast reports quedan separados del juicio visual. |
| FR-015–016 / SC-008 | DevTools/proxy: cargar sitio, importar/reproducir fixtures y revisar tráfico y prompts; desconectar red durante playback. | Network log permite verificar que no salen bytes de audio ni analytics/account request y que no aparecen permisos extra. Distinguir peticiones iniciales de assets estáticos del host. |
| FR-017 / SC-009 | Compilar con base de proyecto, publicar a Pages, abrir URL HTTPS en sesión limpia, acceso directo y refresh. | URL, build artifact, Actions run, tier y permisos workflow. Verificar assets en `/<repo>/`; revisar que workflow no lea secrets ni use PAT. |
| FR-018 / SC-010 | Ejecutar `FrameStressHarness` en test build en Chrome 157, por modo; inyectar 45 ms deterministas por render y usar 4 s como deadline de trigger. Si activa, mantener carga por los 10 s de controles; si no activa al deadline, registrar fallo y retirarla. | Log de frames completados, ventanas, inicio/fin de carga, 3 consecutivas `<30`, timestamp de aviso/fallback, estados antes/después y cada control. Repetir 5 veces por modo; retirar al completar 10 s post-trigger o al abortar por pestaña oculta/error. |
| SC-003 | Restaurar defaults congelados; correr 10 s de calentamiento + 60 s medidos por modo en perfil exacto y foreground, sin stress harness. | Tabla de 60 contadores por modo derivada de timestamps `drawCompletedAt`; secuencia/timestamp por frame; fallback anotado/activo; pass solo ≥57 intervalos con ≥30 frames en cada modo. Sin grabación de pantalla como contador. |
| SC-011 / FR-020 | Ajustar todos los controles, seleccionar preset, cerrar y abrir mismo origen/browser/profile. | Registro before/after de settings y `localStorage`; settings/preset coinciden, lista/archivo no vuelve. Probar JSON corrupto, storage bloqueado/cuota y fallback a defaults. |
| SC-012 / FR-021 | Cargar online, importar/play local, quitar red y usar pause/seek/volume/mode. Separar de reload. | Resultado del control en sesión ya iniciada; no se exige reload o reopen offline. |
| SC-013 | Correr el signal diagnostic por modo y capture de eventos + respuesta; usar dos frames para confirmar persistencia, atribuir tiempo al primer frame. | Registro por 20 eventos, reloj y error de alineación, firma/métrica de cada modo, primer frame cualificador, cálculo de latency y controles negativos. **No evaluar SC-013 hasta validar el oráculo de cada modo**; pass exigirá 19/20 ≤250 ms por modo. |

### Protocolo SC-003 y SC-010

Instrumentar fin de dibujo con `performance.now()` después de que Canvas termina de emitir comandos, guardando secuencia en memoria sin `console.log` por frame. Para SC-003, medir cada intervalo `[T, T+1s)` tras warm-up. La pestaña permanece visible/foreground. Una grabación puede acompañar revisión humana, pero nunca sustituye el log. Para SC-010, el harness de test bloquea 45 ms deterministas pre-render; el contador procede de timestamps de fin de draw. El resultado es una prueba del detector/reacción, no una prueba representativa de toda carga de campo.

### Protocolo SC-013 y límite

Calentar el mismo `AnalyserNode`/renderer 10 s con el sweep; detener y desconectar toda fuente, confirmando aislamiento. Diagnóstico: PCM en memoria por `AudioBufferSourceNode` como única entrada al mismo analizador/render, sin pasar por decoder de archivo. Fijar `fftSize=8192`, `smoothingTimeConstant=0`, registrar sampleRate y ventana efectiva. Pares simultáneos `{AudioContext.currentTime, performance.now()}` calibran el reloj; residual máximo >5 ms invalida. Eventos se marcan por `startContextTime + sampleIndex/44100` y se registra índice, frecuencia y timestamps. Registrar cada draw-complete/sequence/signature; luego leer raster ROI del canvas verdadero mediante `getImageData()` en modo diagnóstico. Evaluar firma de comandos **y** pixels rasterizados con oráculo de cada modo de `plan.md`/`data-model.md`; firma sola no pasa. Confirmar en dos frames y asignar tiempo al primero. Ejecutar controles sin cambio/eventos falsos y positivos 220↔880. Exportar evidencia local por los 20 eventos.

El overhead de lectura raster y firmas se mide en A/B con y sin readback, registrando p50/p95/máximo por frame, frames/segundo e impacto temporal; permanece `pending` hasta ejecutarlo y documentarlo. Este método no incluye carga/latencia de decoder MP3/WAV y los timestamps son de renderer/backing canvas, no de presentación física por el compositor. **El umbral de 250 ms no se afirma validado** hasta validar todos los oráculos y registrar overhead.

## Despliegue manual posterior

1. Configurar Pages con origen GitHub Actions y confirmar elegibilidad pública/tier gratuito.
2. Revisar workflow: build job `contents: read`, deploy job `pages: write` + `id-token: write`, sin secrets/PAT, acciones por SHA revisado, artifact `dist` únicamente. Condicionar deploy a `github.ref_name == github.event.repository.default_branch`; restringir el environment `github-pages` a la rama por defecto. `workflow_dispatch` desde otra rama no despliega.
3. Confirmar `base` `/REPO/` para proyecto o `/` para user/org y que imágenes/fuentes/scripts usan asset base correctamente.
4. Inspeccionar Action logs y URL publicada: HTTPS, carga directa, refresh, assets no 404; guardar URL/commit/run/tier y revisión de seguridad.

## Evidencias y estado de cierre

El reporte por SC debe guardar fecha, build/commit, sistema/browser/version, dispositivo/viewport, fixture/hash, valores de ajustes, método, resultado cuantitativo/cualitativo, artifacts y limitaciones. Etiquetas permitidas: `pass`, `fail`, `pending`, `not applicable` con justificación. SC-013 queda `pending` hasta validar el oráculo; ningún resultado de performance, compatibilidad, privacidad, accesibilidad o Pages se presume por tener el plan escrito.

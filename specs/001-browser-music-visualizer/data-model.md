# Modelo de datos y contratos internos: WATCHER

Este modelo describe datos en memoria y persistencia local prevista. No introduce endpoints, backend ni almacenamiento de contenido. Los nombres de tipos son conceptuales para el diseño TypeScript; no son código de implementación.

## Entidades

### TrackEntry

| Campo | Tipo conceptual | Regla |
|---|---|---|
| `id` | ID opaco único por selección | Generar por ocurrencia; nunca derivarlo solo de nombre, tamaño o hash de contenido. Reseleccionar el mismo `File` crea una entrada distinta. |
| `file` | referencia `File` de solo sesión | Obligatoria en memoria mientras la entrada esté disponible; nunca serializar a `localStorage` ni enviar por red. |
| `displayName` | string | Tomado de `File.name`; tratar siempre como texto, no HTML ni ruta. |
| `sizeBytes` | entero no negativo | Solo informativo/diagnóstico; no se usa como límite fijo de producto. |
| `declaredType` | string opcional | `File.type`, es indicio no confiable; el navegador determina decodificación. |
| `state` | `ready / active / unsupported / unreadable / resource-error` | Estado de UI; un error no elimina las otras pistas. |
| `durationSeconds` | número finito positivo o `null` | Llenar solo cuando media element informa duración válida; no mostrar NaN/Infinity/valores obsoletos. |
| `objectUrl` | string o `null` | Solo para entrada activa; URL temporal del `File`. Revocar y vaciar al cambiar/remover/limpiar. No persistir. |

**Relación**: muchas entradas `TrackEntry` pertenecen a una `AudioLibrary` de sesión; a lo sumo una se asocia al `PlaybackSession` activo. Entradas con idénticos nombre/contenido mantienen distintos IDs y acciones de remover.

**Ciclo**: `selected → ready → active → ready`; `selected → unsupported|unreadable|resource-error`; cualquier entrada se puede quitar; quitar activa primero detiene playback y libera URL/nodos asociados. Cancelar picker no muta biblioteca ni error.

### AudioLibrary

`entries: TrackEntry[]`, `activeTrackId: TrackId | null`. La selección añade una entrada por ocurrencia. Solo al seleccionar para reproducción prepara URL y media element. No mantiene buffers decodificados por cada elemento. Un fallo para una entrada no altera otras entradas sanas.

### PlaybackSession

| Campo | Tipo conceptual | Regla |
|---|---|---|
| `trackId` | `TrackId | null` | Máximo uno; referencia a una entrada disponible. |
| `state` | `empty / loading / paused / playing / ended / error` | Derivado principalmente de media events y promesas de play, no solo de la intención de UI. |
| `currentTimeSeconds` | número finito ≥0 | Actualizado por media element; si no está disponible mostrar estado sin valor temporal engañoso. |
| `durationSeconds` | número finito >0 o `null` | Puede desconocerse en archivos/decoders; seek solo habilitado si duración es válida. |
| `volume` | número en `[0,1]` | Aplicado al `GainNode`; leído de la sesión, no guardado como audio/archivo. |

Transiciones esperadas: `empty → loading → playing|paused|error`; `playing ↔ paused`; `playing → ended`; cambio de pista pasa por `loading`; quitar pista activa pasa a `empty` y detiene audio. Rechazos por autoplay/transporte entran en `error` con acción útil.

### AudioGraph y AudioFeatures

Un `PlaybackEngine` posee un único `HTMLAudioElement`, contexto, source node, analyser y gain node. No crear un segundo `MediaElementAudioSourceNode` para el mismo elemento. Cerrar/reutilizar contexto de acuerdo con ciclo del motor y liberar listeners al dispose.

`AudioFeatures` por frame contiene buffers reutilizables de muestras temporales y espectrales, rate/ventana efectiva y `capturedAt`. No contiene el archivo ni se guarda. `AnalyserNode` es la fuente; las vistas de waveform/spectrum reciben copias referenciadas con vida de un frame y no las retienen.

### VisualSettings y Preset

| Campo | Tipo conceptual | Validación prevista |
|---|---|---|
| `sensitivity` | número normalizado | rango UI 0–100, transformado a escala de ganancia interna documentada; default sigue pendiente. |
| `frequencyFocus` | `bass / mid / treble / balanced` | Enum; determina peso de banda, no filtro de audio audible. |
| `colorIntensity` | número 0–100 | Clamp al cargar y aplicar. |
| `motion` | número 0–100 | Clamp y además limitado por `prefers-reduced-motion`. |
| `effectIntensity` | número 0–100 | Clamp; partículas/efectos derivados no crecen sin límite. |
| `selectedPresetId` | `monochrome / ambient / neon / psychedelic / custom` | Preset identificado aunque sus valores luego se ajusten. Ajustar no restablece otros controles. |
| `schemaVersion` | entero positivo | Requerido en persistencia; versión desconocida/corrupta se ignora de forma segura. |

Los presets establecen un starting point reconocible, no bloquean personalización. Defaults, steps y escala de sensibilidad exactos no se aprobaron en la spec: definirlos y congelarlos antes de SC-003 para que las corridas sean comparables. Cada ajuste persistido es un valor primitivo pequeño; no se guardan archivos ni historial de pistas.

### VisualizationFrame

`sequence`, `mode`, `startedAt`, `drawCompletedAt`, viewport CSS, backing size, estado de fallback y `signature`. `drawCompletedAt` se toma con reloj monotónico después de que el renderer completa comandos Canvas 2D; no se etiqueta como presentación física. `FrameMonitor` usa diferencias de `drawCompletedAt` para ventanas de 1 segundo mientras la página está visible.

### FallbackEvent

`mode`, tres intervalos de entrada (`start/end/count`), `triggeredAt`, `stateBefore/After`, razón `three-consecutive-windows-under-30`, y texto/estado de aviso. Activar al terminar el tercero consecutivo con `<30` frames. En SC-010 el harness se retira al activarse; se comprueba que la reducción y controles permanecen. La restauración automática no está en alcance.

### DiagnosticSourceEvent / RenderEvidence

**Source event**: índice 1–20, sample index `22050 × k`, frecuencia anterior/nueva, posición diagnosticada, timestamp AudioContext, timestamp monotónico alineado y error de alineación.

En SC-013 el evento lo produce un `AudioBufferSourceNode` habilitado solo en test, programado en `startContextTime` con el buffer sintético a 44.1 kHz; alimenta el mismo `AnalyserNode` y renderer. Los pares de reloj para el ajuste local se capturan simultáneamente y su residual máximo queda en el registro; residual >5 ms invalida la corrida. Esta medición aísla respuesta del analizador/renderizador: no mide carga/latencia del lector de archivo o demultiplexado MP3/WAV.

**Render evidence**: frame sequence/timestamp completado, modo, id del último source event activo, firma del renderer, valor esperado/observado y si la firma confirmó el siguiente frame. Latencia = timestamp del primer frame que luego confirma el frame siguiente menos timestamp monotónico del source event. Registrar cada uno de los 20 eventos, también los que no respondan antes de 250 ms.

| Modo | Campos de firma medibles en test | Regla propuesta para primer frame calificador |
|---|---|---|
| Waveform | buffer/segmentos efectivamente dibujados, cruces por cero en últimos 100 ms, cantidad de ciclos disponibles | Frecuencia estimada en el trazo dentro de ±15% de la nueva 220/880 Hz; mínimo tres ciclos representados. |
| Spectrum | alturas por bin/barra que se enviaron a Canvas, índice de máximo por banda | Promedio de energía dibujada en banda nueva (±10%) ≥1.5× promedio en banda previa. |
| Radial | radios por spoke/banda enviados a Canvas | Media de radio de nueva banda ≥1.25× radio de banda previa y cambio en dirección esperada. |
| Particle | cohorte, existencia en draw list, driver de spawn/velocidad/impulso derivado de banda | Driver de nueva banda cambia ≥25% relativo y aparece al menos una partícula de esa cohorte en el frame dibujado. |
| Psychedelic | hue cromático aplicado en comandos de dibujo, paleta/settings estables | Cambio de hue por arco corto ≥30° hacia el valor predefinido de la nueva banda. |

Un frame queda calificado si supera su regla; la confirmación del frame consecutivo valida persistencia, pero se asigna el tiempo del primero. Estos umbrales son diseño propuesto para operacionalizar “primera respuesta”; faltan calibración/validación positiva y negativa, y por eso no constituyen resultado SC-013.

## Persistencia local

Un solo objeto JSON versionado bajo una clave namespaced puede guardar valores de `VisualSettings`. Al leer, validar schema, enums, números finitos/rangos y aplicar defaults si está corrupto. Errores/cuota de `localStorage` se capturan; app sigue con estado de sesión. La serialización no admite `TrackEntry`, `File`, Blob, object URL, `AudioFeatures`, historial ni `PlaybackSession`.

## Contratos internos principales

Estos son límites de módulos, no contratos HTTP:

- `AudioLibrary.addFiles(files) -> TrackId[]`: agrega una entrada por ocurrencia y devuelve IDs nuevos.
- `AudioLibrary.remove(trackId)`: si está activa, solicita stop/release al engine antes de borrar la entrada.
- `PlaybackEngine.load(trackId, File)`: activa una fuente local y prepara URL; resuelve metadata o error tipado.
- `PlaybackEngine.playFromUserAction()` / `pause()` / `seek(seconds)` / `setVolume(0..1)`: estado observacional procede de media events.
- `AudioFeatureSource.readInto(reusableBuffers) -> AudioFeatures`: devuelve análisis de un frame, sin retenerlo.
- `ModeRenderer.render(ctx, features, settings, dimensions, frameClock) -> RenderSignature`: dibuja y devuelve métricas del mismo modelo usado para dibujar; firma activada solo en test.
- `FrameMonitor.completedFrame(record)`: agrega timestamp, calcula ventanas y emite un único `FallbackEvent` al cruzar criterio.
- `SettingsRepository.load()` / `save(validSettings)`: solo valores versionados; falla sin bloquear app.

## Invariantes

1. Una selección siempre obtiene ID único, incluso repetida; retirar un track no elimina otro de igual nombre.
2. No más de un track activo y preparado; solo un URL en uso por playback session.
3. Cada URL de objeto y sus listeners tienen responsable/ciclo de revocación explícito.
4. El estado que comunica UI coincide con estado observado del medio; tiempos inválidos no se dibujan.
5. Todo valor persistido pasa validación; ningún dato de audio/track se serializa.
6. Fallback observa renders completados, no scheduled frames o frames grabados; audio/controles no dependen de Canvas.
7. Los logs diagnósticos son efímeros y locales al test, nunca se transmiten ni se conservan entre sesiones.

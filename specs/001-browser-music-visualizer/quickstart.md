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

El benchmark SC-003 se genera a partir de siete sweeps concatenados (10 s warm-up + 60 s medidos). La señal diagnóstica SC-013 separada es el tono alternante de 10.5 s descrito en spec. No agregar ambas señales a la matriz de seis compatibilidad.

## Validación por criterio

| Spec | Escenario/ejecución prevista | Condición y evidencia que se conserva |
|---|---|---|
| FR-001–005 / SC-001–002 | Importar cada fixture; seleccionar pistas; reproducir, pausar, seek, volumen, medir duración/progreso y completar track; participant task de SC-002. | Una fila por navegador/fixture; resultado de decode/play, categoría propia, nombre, acción retry/remove, duración, log de controles; 10 tareas de usuario con tiempos para SC-002. |
| FR-006–009 / SC-004 | En `sweep.wav`, recorrer cinco modos, cinco ajustes y cuatro presets; capturas a 360×800 y 1280×800. | Resultado por control/preset y checklist humano `pass/revise` con screenshot para cada fila visual. Comparar modos manteniendo paleta/settings salvo modo. |
| FR-010–011 / AS-006–009 | Importar seis fixtures junto con archivos válidos; probar picker cancelado, track vacío, playback rechazado, duración desconocida y removal/retry. | Estado UI y error categorizado sin depender de texto browser; otras pistas sanas continúan. |
| FR-003 / FR-022 | Seleccionar el mismo archivo dos veces, dos archivos de igual nombre y una playlist grande; alternar/quitar. | IDs distintos por selección; una sola entrada quitada; activa se detiene y URL revoca. Reportar errores de memoria, preservar resto; inspección confirma sin caps arbitrarios ni preparar todas las pistas. |
| FR-012–014 / SC-005–007 | Completar core tasks con teclado y lector de pantalla; viewports 360×800/1280×800; activar reduced motion antes de abrir. | Registro por browser y viewport; foco/label/state/keyboard trap, scroll/clipping/overlap; review de los cinco modos y continuidad de audio/progreso. Contrast reports quedan separados del juicio visual. |
| FR-015–016 / SC-008 | DevTools/proxy: cargar sitio, importar/reproducir fixtures y revisar tráfico y prompts; desconectar red durante playback. | Network log permite verificar que no salen bytes de audio ni analytics/account request y que no aparecen permisos extra. Distinguir peticiones iniciales de assets estáticos del host. |
| FR-017 / SC-009 | Compilar con base de proyecto, publicar a Pages, abrir URL HTTPS en sesión limpia, acceso directo y refresh. | URL, build artifact, Actions run, tier y permisos workflow. Verificar assets en `/<repo>/`; revisar que workflow no lea secrets ni use PAT. |
| FR-018 / SC-010 | Ejecutar `FrameStressHarness` en test build en Chrome 157, por modo; 45 ms deterministas por render durante 4 s. Retirar harness en trigger. | Log de frames terminados y 1 s windows; 3 consecutivas `<30`, timestamp de aviso/fallback, estados antes/después, capturas y resultado de controles durante 10 s. Repetir 5 veces por modo. |
| SC-003 | Restaurar defaults congelados; correr 10 s de calentamiento + 60 s medidos por modo en perfil exacto y foreground, sin stress harness. | Tabla de 60 contadores por modo derivada de timestamps `drawCompletedAt`; secuencia/timestamp por frame; fallback anotado/activo; pass solo ≥57 intervalos con ≥30 frames en cada modo. Sin grabación de pantalla como contador. |
| SC-011 / FR-020 | Ajustar todos los controles, seleccionar preset, cerrar y abrir mismo origen/browser/profile. | Registro before/after de settings y `localStorage`; settings/preset coinciden, lista/archivo no vuelve. Probar JSON corrupto, storage bloqueado/cuota y fallback a defaults. |
| SC-012 / FR-021 | Cargar online, importar/play local, quitar red y usar pause/seek/volume/mode. Separar de reload. | Resultado del control en sesión ya iniciada; no se exige reload o reopen offline. |
| SC-013 | Correr el signal diagnostic por modo y capture de eventos + respuesta; usar dos frames para confirmar persistencia, atribuir tiempo al primer frame. | Registro por 20 eventos, reloj y error de alineación, firma/métrica de cada modo, primer frame cualificador, cálculo de latency y controles negativos. **No evaluar SC-013 hasta validar el oráculo de cada modo**; pass exigirá 19/20 ≤250 ms por modo. |

### Protocolo SC-003 y SC-010

Instrumentar fin de dibujo con `performance.now()` después de que Canvas termina de emitir comandos, guardando secuencia en memoria sin `console.log` por frame. Para SC-003, medir cada intervalo `[T, T+1s)` tras warm-up. La pestaña permanece visible/foreground. Una grabación puede acompañar revisión humana, pero nunca sustituye el log. Para SC-010, el harness de test bloquea 45 ms deterministas pre-render; el contador procede de timestamps de fin de draw. El resultado es una prueba del detector/reacción, no una prueba representativa de toda carga de campo.

### Protocolo SC-013 y límite

Crear el buffer PCM de diagnóstico en memoria; programar un `AudioBufferSourceNode` test-only en `startContextTime` hacia el mismo `AnalyserNode` y renderizador, sin pasar por el decoder del archivo. Muestrear simultáneamente `{AudioContext.currentTime, performance.now()}` antes/durante prueba y ajustar el mapeo local; invalidar si residual máximo >5 ms. `getOutputTimestamp()` puede registrarse como observación secundaria de salida, no como timestamp de evento fuente. Anotar todos los eventos y draws. Para cada evento, comparar firma antes/después con el oráculo de waveform, spectrum, radial, particle o psychedelic en `plan.md` y `data-model.md`. Exportar CSV/JSON local con evento, tiempo fuente, frame de respuesta, tiempo final, latencia, modo y resultado. Ejecutar controles sin cambio de frecuencia para falsos positivos; probar cambios conocidos para sensibilidad. Medir overhead de instrumentation. Los oráculos aún son candidatos de diseño; 250 ms no está probado. Esta medida no incluye carga/latencia del decoder MP3/WAV. Si el usuario exige presentación física en pantalla y no solo respuesta del renderer, el método debe reabrirse antes de emitir pass.

## Despliegue manual posterior

1. Configurar Pages con origen GitHub Actions y confirmar elegibilidad pública/tier gratuito.
2. Revisar workflow: build job `contents: read`, deploy job `pages: write` + `id-token: write`, sin secrets/PAT, acciones por SHA revisado, artifact `dist` únicamente.
3. Confirmar `base` `/REPO/` para proyecto o `/` para user/org y que imágenes/fuentes/scripts usan asset base correctamente.
4. Inspeccionar Action logs y URL publicada: HTTPS, carga directa, refresh, assets no 404; guardar URL/commit/run/tier y revisión de seguridad.

## Evidencias y estado de cierre

El reporte por SC debe guardar fecha, build/commit, sistema/browser/version, dispositivo/viewport, fixture/hash, valores de ajustes, método, resultado cuantitativo/cualitativo, artifacts y limitaciones. Etiquetas permitidas: `pass`, `fail`, `pending`, `not applicable` con justificación. SC-013 queda `pending` hasta validar el oráculo; ningún resultado de performance, compatibilidad, privacidad, accesibilidad o Pages se presume por tener el plan escrito.

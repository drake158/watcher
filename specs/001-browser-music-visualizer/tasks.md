# Tasks: WATCHER Browser Music Visualizer

**Input**: Design documents in `specs/001-browser-music-visualizer/`  
**Branch**: `001-browser-music-visualizer`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, and `quickstart.md`.

**Organization**: Tasks are grouped by the four prioritized user stories. Acceptance and verification tasks are included because the specification, plan, and constitution require evidence before claiming completion. No backend or external API work is in scope.

## Phase 1: Setup

**Purpose**: Create the smallest reproducible static TypeScript project and its development tooling.

- [ ] T001 Initialize the Vite 8 vanilla TypeScript project with Node.js 24 LTS metadata and npm scripts in `package.json`, `package-lock.json`, `.nvmrc`, and `index.html`.
- [ ] T002 Configure strict TypeScript checking, Vite static output to `dist/`, the browser syntax target for the oldest supported release, and `VITE_BASE_PATH` handling in `tsconfig.json` and `vite.config.ts`.
- [ ] T003 Review licenses, maintenance, security advisories, and bundle impact; then add only approved test-only dependencies and configure Vitest, Playwright, and accessibility checks in `package.json`, `package-lock.json`, `vitest.config.ts`, `playwright.config.ts`, and `tests/setup.ts`.
- [ ] T004 Create the planned source, test, fixture, script, and workflow directories with a minimal application entry point in `src/main.ts` and `src/app/AppController.ts`; leave the user-facing shell to T009.

---

## Phase 2: Foundational

**Purpose**: Establish shared domain state, settings persistence, and reproducible lawful test inputs before story work.

- [ ] T005 [P] Write settings persistence tests for defaults, clamping, invalid JSON, unsupported schema versions, and unavailable storage in `tests/unit/SettingsRepository.spec.ts`; run them and confirm expected failures before implementing the repository.
- [ ] T006 [P] Define shared `TrackEntry`, `PlaybackSession`, `AudioFeatures`, `VisualMode`, settings, and application state types in `src/domain/models.ts`, `src/domain/audioFeatures.ts`, `src/domain/settings.ts`, and `src/app/appState.ts`; track IDs are unique per selection occurrence, durations are finite positive values or null, and track content remains session-local.
- [ ] T007 Implement and persist the approved settings in `src/persistence/SettingsRepository.ts`: sensitivity 50/100, focus `balanced` with equal bass/mid/treble weights, color 60/100, motion 35/100, effect intensity 45/100; numeric controls accept 0–100 and no audio file, track name, Blob, or object URL is persisted.
- [ ] T008 [P] Create the deterministic audio fixture generator and manifest in `scripts/generate-audio-fixtures.mjs` and `tests/fixtures/audio/manifest.json`; generate the six approved fixtures only from the documented synthetic recipes, record encoder/version and SHA-256, and keep the supplemental zero-byte input separate from the six-file corpus.
- [ ] T009 Implement the semantic application shell, live status region, and shared control layout in `src/ui/AppView.ts`, `src/styles/layout.css`, and `src/styles/visualizer.css`; keep playback and status controls outside the canvas.

**Checkpoint**: Project builds as a static site, shared state/settings types are stable, and the six compatibility fixtures can be generated without copyrighted audio.

---

## Phase 3: User Story 1 — Listen and Visualize Local Music (Priority: P1) 🎯 MVP

**Goal**: Import local tracks and play one active track with controls, progress, safe errors, and a baseline waveform response.

**Independent Test**: With local MP3/WAV inputs, verify selection, distinct track entries, playback, pause, seek, volume, duration/progress, an audio-reactive waveform, invalid-file handling, and session use after the network is disconnected.

**Requirements**: FR-001–006, FR-010–011, FR-022; AS-001–009; SC-001–002.

- [ ] T010 [P] [US1] Write import/library tests for repeated selection IDs, same-name entries, removal of only one duplicate, zero-byte categorization, cancellation, and preservation of valid tracks in `tests/unit/AudioLibrary.spec.ts`; run them and confirm expected failures before implementation.
- [ ] T011 [P] [US1] Write playback tests for play/pause/seek/volume, ended state, unknown duration, rejected play, decode failure, active-track removal, and object URL release in `tests/integration/PlaybackEngine.spec.ts`; run them and confirm expected failures before implementation.
- [ ] T012 [US1] Implement `AudioLibrary` in `src/audio/AudioLibrary.ts`; add one `TrackEntry` per selection occurrence, reject `File.size === 0` as `invalid/unreadable audio` before allocating playback resources, and never impose a positive minimum file size or fixed playlist cap.
- [ ] T013 [US1] Implement the single-active-track media graph in `src/audio/PlaybackEngine.ts` and `src/audio/AudioGraph.ts`; use one `HTMLAudioElement`, connect `MediaElementAudioSourceNode → AnalyserNode → GainNode → destination`, handle user-gesture resume/play failures, and revoke the active object URL on switch/removal/dispose.
- [ ] T014 [US1] Implement the file picker, track list, distinct entry actions, and application-defined unsupported/unreadable error messages in `src/ui/TrackListView.ts`; render file names as text and preserve usable entries when another file fails.
- [ ] T015 [US1] Implement play, pause, seek, volume, playback state, elapsed time, duration, progress, ended state, and safe unknown-duration behavior in `src/ui/PlayerView.ts` and `src/audio/PlaybackEngine.ts`.
- [ ] T016 [US1] Implement reusable time-domain audio features and the baseline waveform renderer in `src/visual/features.ts`, `src/visual/CanvasRenderer.ts`, and `src/visual/modes/waveform.ts`; reuse typed arrays and keep controls/status in semantic HTML.
- [ ] T017 [US1] Connect library, playback engine, waveform renderer, player controls, and empty/error states in `src/app/AppController.ts` and `src/main.ts`; prepare only the active track and keep other entries when browser resources fail.
- [ ] T018 [US1] Run SC-001 with the six fixtures plus a separately generated zero-byte WAV across the specified desktop/mobile browser matrix; record per-browser/per-input outcome, filename/category, retry/remove, playback, and retained valid entries in `test-results/SC-001-browser-matrix.md`.
- [ ] T019 [US1] Conduct SC-002 with 10 first-time participants using the identical tone import/play task and record each duration and assistance outcome in `test-results/SC-002-participant-records.md`; do not claim the 9/10 threshold without records.

**Checkpoint**: Story 1 works independently and all nine AS-001–AS-009 flows have reproducible evidence or an explicit pending result.

---

## Phase 4: User Story 2 — Shape the Visual Experience (Priority: P2)

**Goal**: Provide five distinct audio-reactive modes, configurable controls, presets, settings persistence, performance fallback, and measurable diagnostic instrumentation.

**Independent Test**: Play a local track, switch all five modes, adjust all five settings, apply all four presets, reopen to verify settings persistence, and run performance/fallback/latency protocols without claiming unmeasured outcomes.

**Requirements**: FR-006–009, FR-018–020; AS-010–015; SC-003–004, SC-010–011, SC-013.

- [ ] T020 [P] [US2] Write tests for mode identity, five adjustment effects, four editable presets, persistence of the approved defaults, and raster response checks in `tests/visual/modes.spec.ts` and `tests/unit/visual-settings.spec.ts`; run them and confirm expected failures before implementing the remaining modes.
- [ ] T021 [P] [US2] Write SC-013 diagnostic tests for 20 sample-indexed events, clock residual rejection above 5 ms, isolated source input, two-frame confirmation, command-signature plus raster-oracle gating, and local evidence export in `tests/performance/SC-013.spec.ts`; run them and confirm expected failures before implementing the probe.
- [ ] T022 [P] [US2] Write SC-010 tests for three consecutive one-second windows below 30 completed frames, fallback notification, four-second trigger deadline, ten seconds of sustained artificial load after trigger, and load removal on timeout/abort in `tests/performance/SC-010.spec.ts`; run them and confirm expected failures before implementing the harness.
- [ ] T023 [US2] Implement frequency/time feature extraction and documented bass/mid/treble boundaries in `src/visual/features.ts`; use the approved balanced focus weights equally across the three bands and document the sensitivity 0–100 mapping in the same module.
- [ ] T024 [P] [US2] Implement the spectrum and radial renderers in `src/visual/modes/spectrum.ts` and `src/visual/modes/radial.ts`; derive visible geometry from current analyser data and reuse renderer buffers.
- [ ] T025 [P] [US2] Implement the particle and psychedelic renderers in `src/visual/modes/particle.ts` and `src/visual/modes/psychedelic.ts`; bound/recycle particles by canvas area and make audio-derived motion/color effects adjustable.
- [ ] T026 [US2] Implement shared mode selection, five setting controls, four editable palette presets, and persistence wiring in `src/ui/SettingsView.ts`, `src/visual/CanvasRenderer.ts`, and `src/app/AppController.ts`; preserve the approved defaults and expose accessible values/states.
- [ ] T027 [US2] Implement completed-draw timestamps, one-second rolling counters, three-window fallback activation, reduced visual detail, and user notice in `src/visual/FrameMonitor.ts` and `src/visual/CanvasRenderer.ts`; keep the monitor out of hidden-tab measurements.
- [ ] T028 [US2] Implement the test-only 45 ms-per-render stress harness with a four-second trigger deadline and ten-second post-trigger hold in `tests/support/FrameStressHarness.ts`; stop the load immediately if no trigger occurs by the deadline and after the control interval completes.
- [ ] T029 [US2] Implement the SC-013 test-only source isolation, 10-second sweep warm-up, 8192-sample analysis window, zero temporal smoothing, clock calibration, raster ROI readback, per-mode oracle evidence, and A/B overhead capture in `tests/support/VisualResponseProbe.ts`; keep logs local and diagnostic-only.
- [ ] T030 [US2] Run SC-003 for five modes with 10-second warm-up plus 60-second measurement, SC-004 visual review with screenshots, SC-010 five repetitions per mode, and SC-013 positive/negative raster-oracle runs; save evidence and A/B overhead in `test-results/SC-003-004-010-013.md`, leaving unmeasured thresholds pending.
- [ ] T031 [US2] Run SC-011 by changing every setting and preset, reopening the same browser profile, and verifying values restore without track/file content in `test-results/SC-011-settings-persistence.md`.

**Checkpoint**: All five modes and settings are usable, all presets remain editable, fallback behavior is evidenced, and SC-013 is reported only with validated oracles and measured overhead.

---

## Phase 5: User Story 3 — Use WATCHER Across Devices and Preferences (Priority: P3)

**Goal**: Make the complete player responsive, keyboard/assistive-technology operable, reduced-motion aware, private, and usable in an already-loaded offline session.

**Independent Test**: Complete core tasks by keyboard at both target viewports, test every mode with reduced motion, audit network/permissions, and disconnect the network after loading while playback continues.

**Requirements**: FR-012–016, FR-020–021; AS-016–020; SC-005–008, SC-012.

- [ ] T032 [P] [US3] Write keyboard, accessible-name, visible-focus, state/value announcement, and viewport-overflow tests in `tests/browser/accessibility.spec.ts`; run them and confirm expected failures before adjusting the shared UI.
- [ ] T033 [P] [US3] Write reduced-motion tests for all five modes and essential progress/control behavior in `tests/browser/reduced-motion.spec.ts`; run them and confirm expected failures before implementing renderer motion overrides.
- [ ] T034 [P] [US3] Write network/permission and current-session-offline scenarios in `tests/browser/privacy-offline.spec.ts`; assert zero audio-content transfer, no analytics/account requests, no extra permission prompts, and no offline-reload requirement, then confirm expected failures before implementation.
- [ ] T035 [US3] Implement responsive player, track list, and settings layouts at 360×800 and 1280×800 without unintended horizontal scrolling, clipping, or overlaps in `src/styles/layout.css` and `src/styles/visualizer.css`.
- [ ] T036 [US3] Complete keyboard operation, accessible names, visible focus, announced values/states, and non-color-only status for all controls in `src/ui/AppView.ts`, `src/ui/PlayerView.ts`, `src/ui/TrackListView.ts`, and `src/ui/SettingsView.ts`.
- [ ] T037 [US3] Apply the device reduced-motion preference and user motion setting to Canvas animation/effects while preserving perceivable audio-reactive information in `src/visual/CanvasRenderer.ts`, `src/visual/modes/particle.ts`, `src/visual/modes/psychedelic.ts`, and `src/styles/visualizer.css`.
- [ ] T038 [US3] Verify local-only processing, picker-only file access, text-safe file-name rendering, settings-only persistence, and absence of analytics/CDN/remote font calls in `src/audio/`, `src/persistence/`, `src/ui/`, `package.json`, and `test-results/SC-008-network-permission-audit.md`.
- [ ] T039 [US3] Run SC-005–SC-008 and SC-012 across the required browser matrix, viewports, reduced-motion setting, fresh sessions, and disconnected-current-session conditions; record keyboard/assistive technology, contrast reports, network logs, permissions, and offline controls in `test-results/SC-005-008-012-accessibility-privacy.md`.

**Checkpoint**: Core interactions remain usable on mobile/desktop and with reduced motion; local privacy and accessibility claims have recorded evidence rather than assumptions.

---

## Phase 6: User Story 4 — Publish WATCHER for Free (Priority: P3)

**Goal**: Build and publish the static app to the approved public GitHub repository’s Pages site with a correct project base path and minimum workflow permissions.

**Independent Test**: Build with the project-site base, publish by Actions from the default branch, then open and refresh the HTTPS Pages URL and confirm no paid service/backend/API is used.

**Requirements**: FR-017; AS-021; SC-009.

- [ ] T040 [P] [US4] Document the Pages workflow security checks and assertions for repository base path, branch guard, environment branch restriction, job permissions, action SHA pins, and absence of PAT/secrets in `tests/manual/SC-009-pages-deployment.md` before creating the deploy workflow.
- [ ] T041 [US4] Create `.github/workflows/deploy.yml` to build `dist/` on default-branch push and manual dispatch; allow deployment only when `github.ref_name == github.event.repository.default_branch`, restrict the `github-pages` environment to that branch, give build only `contents: read`, give deploy only `pages: write` and `id-token: write`, pin actions to reviewed SHAs, and use no repository secrets/PAT.
- [ ] T042 [US4] Configure project-site `VITE_BASE_PATH` from the repository name and use `import.meta.env.BASE_URL` for static assets in `vite.config.ts`, `src/`, and `index.html`; verify a manual dispatch from a non-default branch cannot deploy.
- [ ] T043 [US4] Publish from the public default branch, inspect the Actions artifact/permissions/environment, and run SC-009 clean-session HTTPS direct-load and refresh checks; record URL, run, tier, asset results, and evidence in `test-results/SC-009-github-pages.md`.

**Checkpoint**: Only the default branch can publish the static site; Pages loads directly over HTTPS under the project path and uses the approved free hosting configuration.

---

## Phase 7: Polish & Cross-Cutting Verification

**Purpose**: Close traceability, security, and evidence gaps across all stories without expanding release scope.

- [ ] T044 [P] Review the locked dependency tree, licenses, maintenance, vulnerabilities, and bundle impact; update findings and approved versions in `package.json`, `package-lock.json`, and `test-results/dependency-review.md`.
- [ ] T045 Reconcile every FR-001–FR-022 and SC-001–SC-013 with implementation and evidence links in `test-results/acceptance-index.md`; mark unrun or unmeasured criteria pending and do not report SC-013’s 250 ms target as validated without its oracle and overhead evidence.
- [ ] T046 Run the documented local/build/browser validation steps from `specs/001-browser-music-visualizer/quickstart.md` and save the exact commands, environment, outputs, and remaining failures in `test-results/quickstart-run.md`.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies; T001 precedes build/test configuration and source skeleton tasks.
- **Foundational (Phase 2)**: depends on project setup. Shared state, settings, and test fixtures block story implementation; independent foundation tasks can run in parallel after setup.
- **User Story 1 (Phase 3)**: depends on Foundation; delivers the first usable MVP with a baseline waveform.
- **User Story 2 (Phase 4)**: depends on US1 playback and analyser path; expands the visual experience and performance instrumentation.
- **User Story 3 (Phase 5)**: depends on the player and all user-facing controls from US1/US2 so accessibility and reduced-motion coverage is complete.
- **User Story 4 (Phase 6)**: workflow authoring can proceed after Setup, in parallel with story work; live Pages acceptance depends on a buildable app from US1–US3.
- **Polish (Phase 7)**: depends on all four stories and their test evidence.

### User story dependencies

- **US1 (P1)**: after Foundation; no dependency on other user stories.
- **US2 (P2)**: after US1 because modes consume the active playback/analyser stream.
- **US3 (P3)**: after US1 and US2 because keyboard and reduced-motion checks include playback, mode, preset, and adjustment controls.
- **US4 (P3)**: workflow can be built after Setup; final deployment and SC-009 depend on a successful app build.

### Parallel opportunities

- After T001–T003, the source entry skeleton (T004) can proceed. After setup, settings tests (T005), shared types (T006), and fixture generation (T008) can proceed independently; settings persistence (T007) follows T005 and T006, and the app shell (T009) follows T004.
- In US1, library tests (T010) and playback tests (T011) can be authored in parallel; library and playback implementation should wait for their corresponding tests and shared models.
- In US2, visual mode tests (T020), diagnostic tests (T021), and fallback tests (T022) touch separate files and can be authored in parallel. Spectrum/radial (T024) and particle/psychedelic (T025) also use separate renderer files after the feature contract is established.
- In US3, accessibility (T032), reduced-motion (T033), and privacy/offline (T034) test files can be authored in parallel.
- The Pages workflow assertion/protocol (T040) and workflow implementation (T041) can proceed after Setup independently of the visual story work; publishing acceptance waits for the app build.
- Dependency review (T044) can run alongside final acceptance evidence gathering once the lockfile exists.

## Parallel Example: User Story 1

```text
Task T010: Write tests/unit/AudioLibrary.spec.ts for duplicate selection, removal, empty files, and retained valid tracks.
Task T011: Write tests/integration/PlaybackEngine.spec.ts for media state, controls, failures, and resource release.
Task T008: Generate tests/fixtures/audio/manifest.json and deterministic synthetic fixtures.
```

## Implementation Strategy

### MVP first: User Story 1

1. Complete Setup and Foundation.
2. Complete US1: local import, single-track playback, controls, error states, resource release, and baseline waveform.
3. Validate AS-001–AS-009 and SC-001–SC-002 independently; report all unrun browser/user checks as pending.

### Incremental delivery

1. Add US2’s five modes, presets/settings, fallback, and SC-003/004/010/011/013 measurement support.
2. Add US3’s responsive/accessibility/reduced-motion/privacy/offline verification.
3. Add US4’s protected GitHub Pages deployment and SC-009 evidence.
4. Run cross-cutting audits and update the acceptance evidence index.

## Format validation

All implementation tasks use `- [ ] T###`, story tasks include `[US1]` through `[US4]`, `[P]` appears only where separate files and dependencies permit parallel work, and every task names its target file path. Manual verification tasks name the evidence record they must create.

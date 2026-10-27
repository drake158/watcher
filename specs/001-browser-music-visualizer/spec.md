# Feature Specification: Browser Music Visualizer

**Feature Branch**: `001-browser-music-visualizer`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Create a free, browser-based music visualizer with authentic early-2000s/Y2K aesthetics, local audio import and playback, audio-reactive visual modes and controls, accessibility, privacy, and free GitHub Pages deployment."

## Clarifications

### Session 2026-10-26

- Q: Which browser and audio-format support target should WATCHER promise for its first release? → A: Support MP3 and WAV in the latest two stable major versions of desktop Chrome, Edge, Firefox, and Safari, plus the latest stable mobile Safari and Chrome; treat other formats as best-effort.
- Q: When visuals can’t keep up on a device, should WATCHER automatically simplify effects to preserve smooth playback? → A: Automatically reduce visual detail when performance stays below 30 frames per second for 3 seconds, keep playback and controls responsive, and notify the user that effects were simplified.
- Q: Should WATCHER remember visual settings and the selected preset when the user returns later? → A: Remember visual settings and the selected preset between visits on the same device and browser; do not retain audio files or track contents.
- Q: After WATCHER has loaded once, should users be able to close or refresh it and reopen it without an internet connection? → A: The site must load online; if the connection drops after it loads, users can continue the current session with local audio. Offline reload or reopening is not required.
- Q: Should the first release include every capability already listed in the spec, including all five visual modes, controls, and presets? → A: All specified requirements are required for the first release; no additional features are implied.
- Q: Is a target of at least 30 frames per second in 95% of one-second intervals during a 60-second run in each visual mode acceptable for the stated reference profile? → A: Require at least 30 frames per second in at least 95% of one-second intervals over 60 seconds per mode; separately require visual response latency of at most 250 ms for at least 95% of measured audio changes.
- Q: Should the audio test corpus use two 10-second synthetic signals in both WAV and MP3, plus a truncated WAV and a plain-text unsupported file? → A: Use a 440 Hz steady tone and a 110–880 Hz sweep, each stereo at 44.1 kHz; encode WAV as 16-bit PCM and MP3 as 128 kbps CBR. Add a truncated WAV as the corrupt fixture and a .txt file as the unsupported fixture. Generate all fixtures from documented deterministic signal recipes without copyrighted audio.
- Q: Should WATCHER support the latest two stable major versions of desktop Chrome, Edge, Firefox, and Safari, while keeping Chrome 157.0.8103.15/.16 as a separate fixed performance benchmark? → A: Support the latest two stable major versions of desktop Chrome, Edge, Firefox, and Safari, plus the latest stable mobile Safari and Chrome; use the exact Chrome 157 reference profile for performance benchmarking only.
- Q: Is this track and resource policy acceptable: distinct entries for every selected file occurrence, no fixed size or playlist-count cap, and only the active track prepared for playback? → A: Each selected file occurrence is a distinct entry, including reselecting the same file; do not impose fixed numeric file-size or playlist-count caps; prepare only the active track, report browser resource failures clearly, and release a track's associated resources when it is removed.
- Q: Should visual acceptance use a documented human review checklist at desktop and mobile sizes, with each listed visual criterion marked pass or revise and screenshots as evidence? → A: Use screenshot evidence and pass/revise human review for layout, retro typography, beveled controls, chrome-like gradients, CRT texture, palette presets, legibility, and distinct visual modes; assess artistic judgments separately from automated checks, without pixel-perfect image matching.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Listen and Visualize Local Music (Priority: P1)

A listener opens WATCHER, selects one or more audio files from their device, chooses a track, and plays it with visuals that react to its sound. They can pause, seek, adjust volume, and see track duration and playback progress.

**Why this priority**: Local playback tied to audio-reactive output is the core value of WATCHER; visual styling alone does not deliver it.

**Independent Test**: With supported local audio files, verify import, track selection, playback, pause, seeking, volume, duration/progress display, and visible visual response without a network connection after the site is loaded.

**Acceptance Scenarios**:

1. **AS-001:** **Given** the player has no tracks in a browser covered by the minimum-support policy, **When** the listener selects multiple supported MP3 or WAV files, **Then** each selection occurrence is added to a visible track list with a usable title and can be selected for playback.
2. **AS-002:** **Given** a supported track is selected, **When** the listener starts playback, **Then** audio is heard, elapsed time and progress advance, and the visualization visibly responds to changes in audio amplitude and frequency.
3. **AS-003:** **Given** a track is playing, **When** the listener pauses, seeks to a new position, or changes volume, **Then** playback state, position, or loudness changes accordingly and the controls display the current state.
4. **AS-004:** **Given** playback reaches the end of a track, **When** the track ends, **Then** progress reaches completion and the player enters a clear ended or stopped state without showing stale progress.
5. **AS-005:** **Given** two selected files have the same filename, or the same file is selected more than once, **When** they are imported, **Then** each selection occurrence remains a distinct list entry. Removing an entry removes only that entry; removing the active entry stops its playback and releases its associated resources.
6. **AS-006:** **Given** a batch contains supported, corrupt, and unsupported files, **When** the listener imports it, **Then** valid files remain playable and each invalid file is identified by filename and an application-defined category (`unsupported file` or `invalid/unreadable audio`) with a retry or removal action. Browser-native error text may vary and is not compared verbatim; an invalid file does not block other entries.
7. **AS-007:** **Given** no track has been imported, **When** the listener opens WATCHER or cancels the file picker, **Then** WATCHER shows instructions for choosing a local file, shows no false active-playback state, and treats cancellation as a normal action.
8. **AS-008:** **Given** the listener selects a large file or playlist that may exceed browser resources, **When** they play one track, **Then** only the active track is prepared for playback; if the browser cannot handle it, WATCHER identifies the affected file or operation and keeps other usable entries available. Acceptance review also checks that no fixed numeric file-size or playlist-count cap exists unless documented benchmark evidence justifies it.
9. **AS-009:** **Given** duration information is unavailable or playback fails, **When** the listener views or operates the player, **Then** WATCHER avoids invalid time values, reports the failure, and offers an appropriate retry or removal action.

---

### User Story 2 - Shape the Visual Experience (Priority: P2)

A listener selects a visual mode and adjusts audio sensitivity, bass/mid/treble focus, color intensity, motion, and effect intensity. They can quickly apply a preset ranging from monochrome or ambient to saturated neon or psychedelic.

**Why this priority**: Meaningful visual choice and control make WATCHER personal while building on the working playback experience.

**Independent Test**: Play a track, switch among every visual mode, adjust each control, and apply each preset; confirm that each action produces a discernible and appropriate change without interrupting playback.

**Acceptance Scenarios**:

1. **AS-010:** **Given** a track is playing, **When** the listener selects waveform, spectrum, radial, particle, or psychedelic mode, **Then** the selected mode is shown and its animation reflects changes in the audio.
2. **AS-011:** **Given** a visual mode is active, **When** the listener changes sensitivity, frequency focus, color intensity, motion, or effect intensity, **Then** the corresponding visual behavior changes and the selected setting is communicated accessibly.
3. **AS-012:** **Given** any visual mode is active, **When** the listener applies a monochrome, ambient, neon, or psychedelic preset, **Then** the visual settings update to a recognizable preset and remain adjustable afterward.
4. **AS-013:** **Given** the listener has changed visual settings or selected a preset, **When** they return to WATCHER later in the same browser, **Then** their latest visual settings and selected preset are restored without restoring an audio file or track contents.
5. **AS-014:** **Given** application-rendered timestamps show fewer than 30 frames in each of 3 consecutive one-second windows, **When** the third window ends, **Then** WATCHER automatically reduces visual detail, notifies the listener, and keeps audio playback and essential controls usable.
6. **AS-015:** **Given** the same synthetic audio, settings, and viewport are used for screenshots, **When** a reviewer checks all five modes and four palette presets, **Then** every item in the visual review checklist below is marked pass with screenshot evidence; artistic review remains separate from automated checks.
  **Visual review checklist (human review with screenshots; not pixel-perfect image comparison):**

  | Criterion | Pass condition | Evidence |
  |-----------|----------------|----------|
  | Layout | At 360×800 and 1280×800 viewports, the visualizer and playback/control areas have a clear hierarchy; no essential control is clipped, covered, or overlapped. | Screenshot at each viewport. |
  | Retro typography | Early-2000s/Y2K display typography is visibly used for branded or display text; track names, labels, and playback information remain easy to read. | Screenshot showing display and body/control text. |
  | Beveled controls | Primary playback and mode controls visibly use a raised or recessed edge treatment; focus, selected, and pressed states remain distinguishable. | Screenshot of normal and focused/selected states. |
  | Chrome-like gradients | At least one decorative frame or panel uses a recognizable reflective metallic gradient without reducing the contrast of text or controls. | Screenshot of the visualizer frame or panel. |
  | CRT-inspired texture | A CRT-inspired texture is visible in the visualizer or background, but does not obscure text, controls, or essential audio information. | Screenshot at both viewports. |
  | Palette presets | Monochrome is grayscale; ambient is muted; neon is strongly saturated; psychedelic uses multiple vivid hues. Each preset is recognizable and remains adjustable. | Screenshot for each named preset. |
  | Legibility | Track information and controls are readable in every preset. Text contrast is at least 4.5:1 for normal text and 3:1 for large text; meaningful control boundaries, focus/state indicators, and graphics meet 3:1 against adjacent colors. | Automated contrast report for every preset plus screenshot review. This proposed legibility threshold follows [WCAG 2.2 Success Criterion 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) for text and [Success Criterion 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) for meaningful controls and graphics; confirm this threshold before finalizing. |
  | Mode identity | With the same sweep signal and palette, waveform, spectrum, radial, particle, and psychedelic modes each have a recognizable visual structure; differences are not conveyed by color alone. | Paired screenshots for all five modes; reviewer records pass or revise for each. |

  The reviewer records pass or revise for every row and attaches the indicated evidence. All rows must pass before visual acceptance. Automated checks cover measurable contrast, viewport dimensions, control states, and keyboard behavior; they do not replace judgments about visual authenticity or mode identity.

---

### User Story 3 - Use WATCHER Across Devices and Preferences (Priority: P3)

A listener uses WATCHER on a desktop or mobile device, operates controls by keyboard or assistive technology, and can reduce motion while retaining access to essential playback and track information.

**Why this priority**: Responsive and accessible interaction makes the core experience usable across devices and motion preferences.

**Independent Test**: Complete import and playback using keyboard-only navigation at desktop and mobile viewport sizes, then enable reduced-motion preference and verify essential controls and information remain available.

**Acceptance Scenarios**:

1. **AS-016:** **Given** WATCHER is open at desktop or mobile size, **When** the listener navigates its controls, **Then** controls remain visible, usable, and non-overlapping, and content does not require unintended horizontal scrolling.
2. **AS-017:** **Given** the listener uses only a keyboard, **When** they navigate and activate import, track, playback, mode, preset, and adjustment controls, **Then** each control has an understandable accessible name, visible focus, and operable keyboard behavior.
3. **AS-018:** **Given** reduced motion is enabled on the device, **When** audio plays and visuals are active, **Then** WATCHER limits nonessential movement while preserving playback, progress, and a perceivable audio-reactive visual state.
4. **AS-019:** **Given** a listener imports and plays a local track, **When** the session's network requests and permission prompts are reviewed, **Then** no audio content is transmitted, no analytics or account requests occur, and no permission beyond user-selected file access and browser playback is requested.
5. **AS-020:** **Given** WATCHER has loaded and a local track is playing, **When** network access is disconnected, **Then** current-session playback and visual controls continue to work; offline reload or reopening is not required.

---

### User Story 4 - Publish WATCHER for Free (Priority: P3)

A project maintainer publishes WATCHER as a static site on GitHub Pages without adding a paid hosting service or backend.

**Why this priority**: Free static deployment is a release requirement and keeps WATCHER available without accounts or server-side processing.

**Independent Test**: Open the published HTTPS address in a clean browser session, load the main page directly, refresh it, and verify the hosting setup uses no paid service.

**Acceptance Scenarios**:

1. **AS-021:** **Given** WATCHER has been published on GitHub Pages, **When** a listener opens or refreshes the published entry page over HTTPS, **Then** the site loads without a paid hosting service, backend, or paid API.

---
### Edge Cases

- With no tracks imported, WATCHER presents a useful empty state that explains how to choose local audio and does not show active playback controls as if a track were loaded.
- If a selected file is unsupported, corrupt, empty, or cannot be decoded, WATCHER identifies the affected filename and classifies the problem as unsupported or invalid/unreadable audio, keeps other imported tracks usable, and offers a way to remove or retry the failed track. The exact browser-native error wording is not part of acceptance. Each selection occurrence remains a distinct entry even when filenames or file contents match.
- If playback is blocked by browser policy, unavailable, or fails after starting, WATCHER communicates the failure and a useful next action; controls must not falsely indicate active playback.
- If a browser cannot decode a particular format, WATCHER reports that limitation for the affected file. The supported set is based on formats the current browser can decode, not a promise that every browser supports every format.
- If the user cancels the file picker, the current track and visual settings remain unchanged and no error is shown for a normal cancellation.
- If a track has missing or invalid duration metadata, WATCHER still communicates playback state and provides a usable progress behavior when the browser exposes one; it does not display invalid time values.
- If application-rendered timestamps show fewer than 30 frames in each of 3 consecutive one-second windows, WATCHER automatically reduces visual detail and notifies the user; audio playback and essential controls remain usable. If a large file or playlist exceeds available browser resources, WATCHER reports the affected track or operation, preserves other usable entries, and does not attempt to prepare the whole playlist simultaneously.
- If the browser or device does not support a visual capability, WATCHER falls back to a simpler perceivable mode and explains unavailable options without preventing audio playback.
- When reduced motion is active, high-motion modes and effects are subdued without hiding track state or making controls unusable.
- If network access drops after WATCHER has loaded, the current session remains usable for local import and playback to the extent supported by the browser. Offline refresh or reopening is not required.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to choose one or more local audio files using a file picker without creating an account.
- **FR-002**: WATCHER MUST support MP3 and WAV playback in the latest two stable major versions of desktop Chrome, Edge, Firefox, and Safari, and in the latest stable mobile Safari and Chrome. Other formats MAY be supported on a best-effort basis when the browser can decode them. WATCHER MUST communicate when a selected file is unsupported or cannot be decoded.
- **FR-003**: WATCHER MUST display each file selection occurrence as a distinct selectable track entry with a readable track name, including entries whose filenames or contents match. Users MUST be able to remove one entry without removing other entries with matching names or contents; removing the active entry MUST stop its playback.
- **FR-004**: Users MUST be able to play, pause, seek within a track when duration is available, and adjust playback volume.
- **FR-005**: WATCHER MUST display the selected track's playback state, elapsed time, duration when available, and current progress without displaying invalid or stale values.
- **FR-006**: While a track plays, WATCHER MUST produce real-time visuals that respond to audio amplitude and frequency changes.
- **FR-007**: WATCHER MUST provide waveform, spectrum, radial, particle, and psychedelic visual modes.
- **FR-008**: Users MUST be able to adjust audio sensitivity, bass/mid/treble focus, color intensity, motion, and effect intensity; each control MUST cause a perceptible change in the relevant visual behavior.
- **FR-009**: WATCHER MUST provide presets with recognizable monochrome, ambient, saturated neon, and psychedelic appearances; users MUST be able to adjust settings after choosing a preset.
- **FR-010**: WATCHER MUST show an informative empty state before any track is imported and actionable, non-disruptive file, decoding, and playback errors. For file errors, WATCHER MUST provide an application-defined category and affected filename; acceptance MUST NOT depend on browser-native error wording.
- **FR-011**: WATCHER MUST keep available tracks usable when another selected file fails to load or decode.
- **FR-012**: WATCHER MUST remain usable at desktop and mobile viewport sizes, with playback and visualization controls available without overlapping or requiring unintended horizontal scrolling.
- **FR-013**: All interactive controls MUST be operable by keyboard, have accessible names, and show a visible keyboard focus indicator. Current values and playback state MUST be conveyed to assistive technology.
- **FR-014**: WATCHER MUST respect the device's reduced-motion preference and provide a low-motion experience that preserves access to audio-reactive information and essential controls.
- **FR-015**: Audio files MUST be processed locally on the user's device. WATCHER MUST NOT upload or transmit audio, require accounts, include analytics, require a backend, or depend on paid APIs.
- **FR-016**: WATCHER MUST NOT request permissions beyond those needed for user-selected local file access and browser playback.
- **FR-017**: WATCHER MUST be deployable as a static website on GitHub Pages at no hosting cost.
- **FR-018**: If application-rendered frame timestamps show fewer than 30 rendered frames in each of 3 consecutive one-second windows, WATCHER MUST automatically reduce visual detail and notify the user. Audio playback and essential controls MUST remain usable.
- **FR-019**: The interface MUST use a distinctive Y2K/early-2000s visual language informed by Winamp, Windows Media Player visualizers, early web graphics, chrome, CRTs, and retro typography while keeping functional controls legible and operable.
- **FR-020**: WATCHER MUST remember the user's latest visual settings and selected preset between visits in the same browser on the same device. WATCHER MUST NOT retain audio files or track contents between visits.
- **FR-021**: After the site has loaded, WATCHER MUST allow the current session to continue using locally selected audio if network access is lost. WATCHER is not required to load or reload offline.
- **FR-022**: WATCHER MUST NOT impose fixed numeric caps on file size or playlist count without measured justification. It MUST prepare only the active track for playback, handle browser resource exhaustion with a clear message, preserve other usable entries, and release a track's associated resources when that entry is removed.
**Requirement-to-scenario traceability** (each reference points to an observable scenario above):

| Requirement | Acceptance scenario(s) |
|-------------|------------------------|
| FR-001 | AS-001 |
| FR-002 | AS-001, AS-006 |
| FR-003 | AS-001, AS-005 |
| FR-004 | AS-002, AS-003, AS-004 |
| FR-005 | AS-002, AS-004, AS-009 |
| FR-006 | AS-002, AS-010 |
| FR-007 | AS-010 |
| FR-008 | AS-011 |
| FR-009 | AS-012, AS-013 |
| FR-010 | AS-006, AS-007, AS-009 |
| FR-011 | AS-006, AS-008 |
| FR-012 | AS-016 |
| FR-013 | AS-017 |
| FR-014 | AS-018 |
| FR-015 | AS-019, AS-020 |
| FR-016 | AS-019 |
| FR-017 | AS-021 |
| FR-018 | AS-014 |
| FR-019 | AS-015 |
| FR-020 | AS-013 |
| FR-021 | AS-020 |
| FR-022 | AS-005, AS-008 |

### Key Entities

- **Track**: One occurrence of a user-selected local audio file, including its distinct list identity, display name, availability or error state, and playback position and duration when available. Matching filenames or contents do not merge entries. The audio content remains on the user's device.
- **Playback Session**: The active track's current playback state, position, duration, and volume.
- **Visual Mode**: One of the waveform, spectrum, radial, particle, or psychedelic presentations that responds to the active audio.
- **Visual Settings**: User-adjustable sensitivity, frequency focus, color intensity, motion, and effect intensity.
- **Preset**: A named starting combination of visual settings, including monochrome, ambient, saturated neon, and psychedelic styles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Method: run every fixture in the corpus table through file selection, import, and full playback while recording the app's result by browser and fixture. Conditions: each of the latest two stable major releases of desktop Chrome, Edge, Firefox, and Safari, plus the latest stable mobile Safari and Chrome; do not substitute the Chrome 157 benchmark for this matrix. Pass threshold: all four valid MP3/WAV fixtures import and play to completion in every target browser; `truncated.wav` is not playable and is categorized as invalid/unreadable audio; `unsupported.txt` is not playable and is categorized as unsupported; each invalid result identifies its filename and provides a retry or removal action; valid tracks remain playable. Do not compare literal browser error strings.

  | Fixture | Duration | Encoding and sample rate | Expected result | Obtain or generate |
  |---------|----------|--------------------------|-----------------|--------------------|
  | `tone.wav` | 10 seconds | Stereo, 44.1 kHz, signed 16-bit PCM WAV | Imports, reports 10 seconds ± 0.02 seconds, plays to completion | Generate a 440 Hz sine tone at -12 dBFS; place the same signal in both channels. |
  | `sweep.wav` | 10 seconds | Stereo, 44.1 kHz, signed 16-bit PCM WAV | Imports, reports 10 seconds ± 0.02 seconds, plays to completion | Generate a linear sine sweep from 110 Hz to 880 Hz at -12 dBFS; use identical channels. |
  | `tone.mp3` | 10 seconds ± 0.2 seconds | Stereo, 44.1 kHz, MPEG-1 Layer III, 128 kbps CBR | Imports, reports duration within tolerance, plays to completion | Encode the `tone.wav` signal using a locally installed MP3 encoder. |
  | `sweep.mp3` | 10 seconds ± 0.2 seconds | Stereo, 44.1 kHz, MPEG-1 Layer III, 128 kbps CBR | Imports, reports duration within tolerance, plays to completion | Encode the `sweep.wav` signal using a locally installed MP3 encoder. |
  | `truncated.wav` | Nominal source: 10 seconds; playable duration unavailable | Derived from stereo 44.1 kHz signed 16-bit PCM WAV; truncate to 20 bytes | Not playable; app reports the invalid/unreadable audio category and affected filename; valid tracks remain usable | Generate from `tone.wav` and retain only its first 20 bytes. |
  | `unsupported.txt` | Not applicable | UTF-8 plain text; sample rate not applicable | Not playable; app reports the unsupported-file category and affected filename | Create a short text file containing `WATCHER unsupported audio fixture`; select it using the file picker’s all-files option. |

  The tone and sweep are deterministic synthetic signals, not recordings or compositions. At 44,100 samples per second, use 441,000 samples per channel and duplicate the same signal in both channels. For the tone, sample `x[n] = 10^(-12/20) × sin(2π × 440 × n/44100)`. For the sweep, with `t = n/44100`, sample `x[n] = 10^(-12/20) × sin(2π × (110t + 38.5t²))`; this sweeps linearly from 110 Hz to 880 Hz over 10 seconds. Encode the WAV as signed 16-bit PCM. Derive each MP3 from its WAV at 128 kbps constant bitrate and 44.1 kHz; record the encoder name/version in the test report. Do not obtain the fixtures from copyrighted music. These generated test files are fixtures, not application code. For SC-003 only, form a 70-second benchmark signal by concatenating seven copies of the sweep signal; use the first 10 seconds as warm-up and the following 60 seconds for measurement. This derived signal is not an additional compatibility fixture.
- **SC-002**: Method: give each participant the same unassisted task to import and play `tone.wav`, timing from the loaded player screen to audible playback. Conditions: 10 first-time participants, the latest stable desktop Chrome version included in the minimum-support policy, and a clean WATCHER session with no tracks imported. Pass threshold: at least 9 participants complete the task within 60 seconds without help.
- **SC-003**: Method: restore the documented default settings, select one visual mode, and start the 70-second benchmark signal. Warm up for 10 seconds, then measure the next 60 seconds. The application records a monotonic timestamp and sequence number for each visual frame after its output is rendered; derive each one-second frame count from these application-rendered timestamps. Scheduled callbacks and screen-recording frame counts MUST NOT be counted as rendered frames. Repeat for all five modes, retaining the timestamp log and per-second counts. Conditions: Windows 11 x64, 4-core CPU, 16 GB RAM, integrated graphics, 1920×1080 viewport, Chrome 157.0.8103.15 or 157.0.8103.16, and the defined 70-second synthetic signal. If fallback activates during warm-up or measurement, log its timestamp and keep it active; do not disable it to improve the result. Pass threshold: at least 57 of the 60 measured one-second intervals in each mode contain at least 30 application-rendered frames. The Chrome 157 profile is a benchmark condition only, not the minimum-browser support policy or a claim of measured performance.
- **SC-004**: Method: exercise each mode, each of the five adjustment categories, and each preset; capture screenshots and complete the visual review checklist above. Conditions: same `sweep.wav` input and viewport sizes of 360×800 and 1280×800; test all five modes and all four presets, with the mode comparison holding the palette constant. Pass threshold: every mode and adjustment produces its specified visible change, all four presets meet their named palette descriptions, and every visual review checklist row is marked pass with evidence.
- **SC-005**: Method: complete the core task sequence using keyboard only and audit every interactive control for an accessible name, visible focus, and an announced current value/state. Conditions: every browser in the minimum-supported matrix, with supported audio imported. Pass threshold: every core task completes in every tested browser without a keyboard trap, and 100% of interactive controls pass the name, focus, and state audit.
- **SC-006**: Method: inspect and operate the player at the stated viewport sizes while playing a supported track. Conditions: 360×800 and 1280×800 CSS pixel viewports in every browser in the minimum-supported matrix. Pass threshold: all essential controls and track information remain visible and operable, with zero unintended horizontal page scrolling, clipped controls, or overlaps.
- **SC-007**: Method: repeat the playback and mode-selection task with the device reduced-motion preference enabled, reviewing each mode. Conditions: supported track playing in every browser in the minimum-supported matrix, all five visual modes, and the reduced-motion preference changed before opening WATCHER. Pass threshold: every mode uses its defined low-motion behavior, audio and progress continue, essential controls remain operable, and an audio-reactive visual state remains perceivable.
- **SC-008**: Method: record all network traffic and permission prompts from page load through local import and playback, then repeat with network access disconnected after playback starts. Conditions: every browser in the minimum-supported matrix, the local fixture corpus, and a fresh browser session. Pass threshold: zero audio-content bytes are sent off-device, zero analytics/account requests occur, no permission beyond user-selected file access and browser playback is requested, and current-session playback continues after disconnection.
- **SC-009**: Method: open the published GitHub Pages URL in a clean browser session, load the entry page directly, and refresh it; verify the deployment uses the free hosting tier and no paid API or backend. Conditions: a production-like public GitHub Pages deployment over HTTPS. Pass threshold: direct load and refresh both show the usable entry experience over HTTPS, with no paid hosting, backend, or paid API dependency.
- **SC-010**: Method: use application-rendered frame timestamps to produce three consecutive one-second windows with fewer than 30 frames in each, then exercise pause, resume, seek, volume, and mode controls. Conditions: each visual mode on the Chrome 157 reference profile with a controlled workload that reproduces the threshold; do not use screen-recording counts to establish the trigger. Pass threshold: fallback activates by the end of the third low-rate window, reduces visual detail, displays a user-visible notice, and leaves audio playback and essential controls usable for the next 10 seconds. Evidence: frame timestamp log with trigger and fallback state, before/after visual output evidence, notice text, and control-operation results. Automatic restoration from fallback is not specified for this release.
- **SC-011**: Method: set non-default values for all five adjustment categories, choose a preset, close and reopen WATCHER in the same browser, and inspect the restored controls and track list. Conditions: same device and browser profile; no track is selected at the time of reopening. Pass threshold: all five values and the selected preset match their saved values, and no file or track content is restored.
- **SC-012**: Method: load WATCHER online, import and play a local fixture, then disconnect network access while playback continues and operate pause, seek, volume, and visual controls. Conditions: current loaded page and selected local file; no page refresh or reopening. Pass threshold: playback and every exercised control continue to work after disconnection; offline reload/reopening is not required.
- **SC-013**: Method: let `T0` be the monotonic timestamp logged when diagnostic playback position zero begins at normal playback speed. The signal's 20 source changes occur at `T0 + k/2` seconds for `k = 1…20`; their source sample indices are `22,050 × k` at 44.1 kHz. For each mode, calculate latency from the logged source-change timestamp to the application-rendered timestamp of the first qualifying response frame. Conditions: each mode on the Chrome 157 reference profile; allow 10 seconds of warm-up with the sweep signal, then play the diagnostic signal once without pausing or seeking. Pass threshold: at least 19 of 20 changes per mode have measured latency of 250 milliseconds or less. This criterion cannot yet be scored objectively: the first qualifying response is mode-specific and cannot be determined consistently from a human review of screenshots alone. Before implementation verification, the Plan MUST define and validate a per-mode response oracle and the instrumentation below; until then, no SC-013 result may be claimed.

  **Latency diagnostic signal (not part of the six-file compatibility corpus):** Generate a 10.5-second stereo, 44.1 kHz, signed 16-bit PCM signal at -12 dBFS. It contains 21 consecutive 0.5-second segments; segment `j` uses 220 Hz when `j` is even and 880 Hz when `j` is odd, for `j = 0…20`. For sample time `t` in segment `j`, use `x(t) = 10^(-12/20) × sin(2π × f_j × (t - j/2))` in both channels. This yields 20 known changes at playback offsets `k/2` seconds, for `k = 1…20`, with a full 0.5-second observation window after the final change. It is generated from synthetic tones and contains no copyrighted audio.

  **Minimum Plan instrumentation for SC-013:** The Plan MUST specify (1) a monotonic clock alignment between diagnostic playback position and application-render timestamps; (2) a source-event log with event index, sample index, expected frequency, and timestamp; (3) a completed-render log with frame sequence, timestamp, and active visual mode; (4) a mode-specific, machine-checkable response oracle defining the first qualifying rendered response for waveform, spectrum, radial, particle, and psychedelic modes; and (5) an evidence record mapping each source event to its first qualifying frame and calculated latency. Screen recordings MAY accompany this log for human review but MUST NOT determine the latency. The Plan MUST describe how each oracle is validated before reporting any SC-013 result.

**SC measurement traceability:** SC-001 → browser/fixture import-and-play log; SC-002 → timed participant task records; SC-003 → application-rendered timestamp log and 60 per-second counts per mode; SC-004 → control-change results and visual review evidence; SC-005 → keyboard and assistive-technology audit; SC-006 → viewport inspection results; SC-007 → reduced-motion mode review; SC-008 → network and permission audit; SC-009 → deployment URL and hosting-tier check; SC-010 → low-frame trigger, fallback, and usability log; SC-011 → before/after settings record; SC-012 → offline-session control record; SC-013 → known-signal event table, validated per-mode response-oracle record, and application-rendered response timestamps. SC-013 evidence remains pending the Plan instrumentation.

## Assumptions

- Users may select multiple tracks at once. The first-release browser policy is the latest two stable major versions of desktop Chrome, Edge, Firefox, and Safari, plus the latest stable mobile Safari and Chrome. MP3 and WAV are required formats; other formats are best-effort and may vary by browser. Chrome 157.0.8103.15 or 157.0.8103.16 on Windows 11 x64 with the stated hardware profile is reserved for performance benchmarking.
- WATCHER's first release supports one active playback session at a time; importing multiple tracks provides a selectable track list, not simultaneous mixing.
- The site is free to access and does not require login, user accounts, subscriptions, or server-side storage. It must load while online; offline reopening and offline reload are out of scope for the first release.
- Users provide audio files they have access to; WATCHER does not provide a music catalog or download service.
- The minimum desktop browser policy is the latest two stable major versions of Chrome, Edge, Firefox, and Safari at release; the mobile target is the latest stable Safari and Chrome. This compatibility policy is separate from the fixed Chrome 157 performance benchmark profile. The reference profile is Windows 11 x64, a 4-core CPU, 16 GB RAM, integrated graphics, and a 1920×1080 viewport; it is a target test profile, not proof of performance.
- The visual experience may simplify effects on constrained devices or when reduced motion is requested, while preserving audio playback and essential interaction. Visual settings and the selected preset persist between visits in the same browser on the same device; audio files and track contents do not. All requirements in this specification are in first-release scope; additional features are out of scope unless separately specified.
- The Y2K references are visual direction rather than requirements to reproduce third-party logos, interface assets, or proprietary branding.
- Users choose files explicitly through a file picker; the feature does not scan the device or access files outside the chosen selection.














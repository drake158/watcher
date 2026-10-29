import type { PlaybackSession } from "../domain/models";

export interface PlayerActions {
  readonly onTogglePlayback: () => void;
  readonly onSeek: (seconds: number) => void;
  readonly onVolume: (volume: number) => void;
}

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className !== undefined) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "--:--";
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

/** Native, keyboard-operable playback controls kept outside the canvas. */
export class PlayerView {
  private readonly playButton = make("button", "transport-button", "Play");
  private readonly seekInput = make("input", "range-input");
  private readonly seekOutput = make("output", "time-readout", "00:00 / --:--");
  private readonly volumeInput = make("input", "range-input");
  private readonly trackName = make("p", "now-playing-name", "No track selected");
  private readonly status: HTMLElement | null;

  constructor(
    private readonly host: HTMLElement,
    private readonly actions: PlayerActions,
  ) {
    this.status = document.querySelector("#playback-status");
  }

  mount(): void {
    this.playButton.type = "button";
    this.playButton.setAttribute("aria-label", "Play");
    this.playButton.disabled = true;
    this.playButton.addEventListener("click", this.actions.onTogglePlayback);

    this.seekInput.type = "range";
    this.seekInput.min = "0";
    this.seekInput.max = "0";
    this.seekInput.step = "0.01";
    this.seekInput.value = "0";
    this.seekInput.disabled = true;
    this.seekInput.setAttribute("aria-label", "Playback position");
    this.seekInput.addEventListener("input", () => {
      this.actions.onSeek(Number(this.seekInput.value));
    });

    this.volumeInput.type = "range";
    this.volumeInput.min = "0";
    this.volumeInput.max = "1";
    this.volumeInput.step = "0.01";
    this.volumeInput.value = "1";
    this.volumeInput.setAttribute("aria-label", "Volume");
    this.volumeInput.addEventListener("input", () => {
      this.actions.onVolume(Number(this.volumeInput.value));
    });

    const transport = make("div", "transport-row");
    transport.append(this.playButton, this.seekOutput);
    const seekLabel = make("label", "range-label", "Track position");
    seekLabel.append(this.seekInput);
    const volumeLabel = make("label", "range-label", "Volume");
    volumeLabel.append(this.volumeInput);
    const controls = make("div", "playback-controls");
    controls.append(this.trackName, transport, seekLabel, volumeLabel);
    this.host.replaceChildren(controls);
  }

  render(
    session: PlaybackSession,
    name: string | null,
    statusMessage: string,
  ): void {
    const hasTrack = session.trackId !== null;
    const playing = session.state === "playing";
    this.playButton.disabled = !hasTrack;
    this.playButton.textContent = playing ? "Pause" : "Play";
    this.playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
    this.seekInput.disabled = !hasTrack || session.durationSeconds === null;
    this.seekInput.max = String(session.durationSeconds ?? 0);
    this.seekInput.value = String(
      Math.min(session.currentTimeSeconds, session.durationSeconds ?? 0),
    );
    this.seekOutput.textContent = `${formatTime(session.currentTimeSeconds)} / ${formatTime(session.durationSeconds)}`;
    this.seekInput.setAttribute(
      "aria-valuetext",
      `${formatTime(session.currentTimeSeconds)} of ${formatTime(session.durationSeconds)}`,
    );
    this.volumeInput.value = String(session.volume);
    this.volumeInput.setAttribute("aria-valuetext", `${Math.round(session.volume * 100)}%`);
    this.trackName.textContent = name ?? "No track selected";
    if (this.status !== null) this.status.textContent = statusMessage;
  }
}

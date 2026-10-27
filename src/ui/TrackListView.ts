import type { TrackEntry, TrackId } from "../domain/models";

export interface TrackListActions {
  readonly onFilesSelected: (files: readonly File[]) => void;
  readonly onSelectTrack: (id: TrackId) => void;
  readonly onRemoveTrack: (id: TrackId) => void;
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

function stateLabel(entry: TrackEntry): string {
  switch (entry.state) {
    case "ready":
      return "Ready";
    case "active":
      return "Loaded";
    case "unsupported":
      return "Unsupported file";
    case "unreadable":
      return "Invalid or unreadable audio";
    case "resource-error":
      return "Could not play";
  }
}

/** Semantic picker and session-only track list. Names are always inserted as text. */
export class TrackListView {
  private readonly list = make("ul", "track-list");
  private readonly counter: HTMLElement | null;
  private readonly emptyState: HTMLElement | null;
  private activeTrackId: TrackId | null = null;
  private entries: readonly TrackEntry[] = [];

  constructor(
    private readonly host: HTMLElement,
    private readonly actions: TrackListActions,
  ) {
    const panel = host.closest(".player-panel");
    this.counter = panel?.querySelector("#track-counter") ?? null;
    this.emptyState = panel?.querySelector("#empty-state") ?? null;
  }

  mount(): void {
    const section = make("section", "track-library");
    section.setAttribute("aria-labelledby", "track-list-title");
    const title = make("h3", "subsection-title", "Local audio");
    title.id = "track-list-title";

    const label = make("label", "file-picker-label");
    label.htmlFor = "audio-file-picker";
    label.textContent = "Choose audio files";
    const input = make("input", "file-picker-input");
    input.id = "audio-file-picker";
    input.type = "file";
    input.multiple = true;
    input.addEventListener("change", () => {
      const files = input.files === null ? [] : Array.from(input.files);
      if (files.length > 0) this.actions.onFilesSelected(files);
      input.value = "";
    });

    this.list.setAttribute("aria-label", "Selected local audio tracks");
    const hint = make(
      "p",
      "file-picker-hint",
      "MP3 and WAV are supported. Other selected files are identified and can be removed.",
    );
    section.append(title, label, input, hint, this.list);
    this.host.replaceChildren(section);
    this.render(this.entries, this.activeTrackId);
  }

  render(entries: readonly TrackEntry[], activeTrackId: TrackId | null): void {
    this.entries = entries;
    this.activeTrackId = activeTrackId;
    const fragment = document.createDocumentFragment();
    for (const entry of entries) fragment.append(this.createTrack(entry));
    this.list.replaceChildren(fragment);

    if (this.counter !== null) {
      const activeIndex = entries.findIndex(({ id }) => id === activeTrackId);
      this.counter.textContent = `TRACK ${activeIndex < 0 ? "00" : String(activeIndex + 1).padStart(2, "0")} / ${String(entries.length).padStart(2, "0")}`;
    }
    if (this.emptyState !== null) {
      this.emptyState.hidden = entries.length > 0;
    }
  }

  private createTrack(entry: TrackEntry): HTMLLIElement {
    const item = make("li", "track-entry");
    if (entry.id === this.activeTrackId) item.dataset.active = "true";

    const select = make("button", "track-select");
    select.type = "button";
    select.disabled =
      entry.state !== "ready" &&
      entry.state !== "active" &&
      entry.state !== "resource-error";
    select.setAttribute("aria-pressed", String(entry.id === this.activeTrackId));
    select.setAttribute("aria-label", `Load ${entry.displayName}`);
    const name = make("span", "track-name", entry.displayName);
    const metadata = make("span", "track-meta", `${formatBytes(entry.sizeBytes)} · ${stateLabel(entry)}`);
    select.append(name, metadata);
    select.addEventListener("click", () => this.actions.onSelectTrack(entry.id));

    const remove = make("button", "track-remove", "Remove");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${entry.displayName}`);
    remove.addEventListener("click", () => this.actions.onRemoveTrack(entry.id));

    item.append(select, remove);
    return item;
  }
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

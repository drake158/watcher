import type { TrackEntry, TrackEntryState, TrackId } from "../domain/models";

type TrackUpdate = Partial<
  Pick<TrackEntry, "state" | "durationSeconds" | "objectUrl">
>;

const AUDIO_EXTENSIONS = new Set(["mp3", "wav"]);
const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",
]);

let fallbackId = 0;

function isSupportedAudio(file: File): boolean {
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  return AUDIO_EXTENSIONS.has(extension) || AUDIO_TYPES.has(file.type.toLowerCase());
}

function initialState(file: File): TrackEntryState {
  if (file.size === 0) return "unreadable";
  return isSupportedAudio(file) ? "ready" : "unsupported";
}

function defaultIdFactory(): string {
  const id = globalThis.crypto?.randomUUID?.();
  return id ?? `watcher-track-${++fallbackId}`;
}

/** Session-local library. Files and object URLs are never persisted here. */
export class AudioLibrary {
  private entries: TrackEntry[] = [];
  private readonly usedIds = new Set<TrackId>();

  constructor(private readonly createId: () => TrackId = defaultIdFactory) {}

  /** `null`/empty means the picker was cancelled; existing entries are unchanged. */
  importFiles(files: Iterable<File> | null | undefined): TrackEntry[] {
    if (files === null || files === undefined) return [];

    const imported: TrackEntry[] = [];
    for (const file of files) {
      const entry: TrackEntry = {
        id: this.nextId(),
        file,
        displayName: file.name,
        sizeBytes: file.size,
        ...(file.type.length > 0 ? { declaredType: file.type } : {}),
        state: initialState(file),
        durationSeconds: null,
        objectUrl: null,
      };
      this.entries.push(entry);
      imported.push(entry);
    }
    return imported;
  }

  getEntries(): readonly TrackEntry[] {
    return this.entries.slice();
  }

  find(id: TrackId): TrackEntry | undefined {
    return this.entries.find((entry) => entry.id === id);
  }

  update(id: TrackId, patch: TrackUpdate): TrackEntry | undefined {
    const index = this.entries.findIndex((entry) => entry.id === id);
    if (index < 0) return undefined;
    const updated = { ...this.entries[index]!, ...patch };
    this.entries[index] = updated;
    return updated;
  }

  remove(id: TrackId): boolean {
    const index = this.entries.findIndex((entry) => entry.id === id);
    if (index < 0) return false;
    this.entries.splice(index, 1);
    return true;
  }

  private nextId(): TrackId {
    let candidate = this.createId();
    while (this.usedIds.has(candidate)) candidate = this.createId();
    this.usedIds.add(candidate);
    return candidate;
  }
}

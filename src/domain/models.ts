/** A new ID is assigned to every file-selection occurrence. */
export type TrackId = string;

export type TrackEntryState =
  | "ready"
  | "active"
  | "unsupported"
  | "unreadable"
  | "resource-error";

/**
 * A session-only reference to a user-selected file. File contents and object
 * URLs must never be serialized or sent over the network.
 */
export interface TrackEntry {
  readonly id: TrackId;
  readonly file: File;
  readonly displayName: string;
  readonly sizeBytes: number;
  readonly declaredType?: string;
  readonly state: TrackEntryState;
  /** Positive finite media duration when known, otherwise null. */
  readonly durationSeconds: number | null;
  /** Only allocated for the active track; revoke when it is no longer used. */
  readonly objectUrl: string | null;
}

export type PlaybackState =
  | "empty"
  | "loading"
  | "playing"
  | "paused"
  | "ended"
  | "error";

export interface PlaybackSession {
  readonly trackId: TrackId | null;
  readonly state: PlaybackState;
  readonly currentTimeSeconds: number;
  readonly durationSeconds: number | null;
  readonly volume: number;
}

export type VisualMode =
  | "waveform"
  | "spectrum"
  | "radial"
  | "particle"
  | "psychedelic";

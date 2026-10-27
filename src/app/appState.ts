import type { AudioFeatures } from "../domain/audioFeatures";
import type { VisualSettings } from "../domain/settings";
import type {
  PlaybackSession,
  TrackEntry,
  VisualMode,
} from "../domain/models";

export interface AppState {
  readonly tracks: readonly TrackEntry[];
  readonly playback: PlaybackSession;
  readonly visualMode: VisualMode;
  readonly visualSettings: VisualSettings;
  /** Latest analyser output; absent until playback analysis starts. */
  readonly audioFeatures: AudioFeatures | null;
  /** User-facing status text, kept separate from canvas output. */
  readonly statusMessage: string;
}

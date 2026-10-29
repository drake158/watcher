/** One media element feeds analysis and the audible output through a gain node. */
export class AudioGraph {
  readonly analyser: AnalyserNode;
  readonly gain: GainNode;
  private readonly source: MediaElementAudioSourceNode;
  private mediaSourceConnected = true;

  constructor(
    audioElement: HTMLAudioElement,
    readonly context: AudioContext,
  ) {
    this.source = context.createMediaElementSource(audioElement);
    this.analyser = context.createAnalyser();
    this.gain = context.createGain();
    this.source.connect(this.analyser);
    this.analyser.connect(this.gain);
    this.gain.connect(context.destination);
  }

  disconnectMediaSource(): void {
    if (!this.mediaSourceConnected) return;
    this.source.disconnect(this.analyser);
    this.mediaSourceConnected = false;
  }

  reconnectMediaSource(): void {
    if (this.mediaSourceConnected) return;
    this.source.connect(this.analyser);
    this.mediaSourceConnected = true;
  }

  isMediaSourceConnected(): boolean {
    return this.mediaSourceConnected;
  }

  dispose(): void {
    if (this.mediaSourceConnected) this.source.disconnect();
    this.mediaSourceConnected = false;
    this.analyser.disconnect();
    this.gain.disconnect();
  }
}

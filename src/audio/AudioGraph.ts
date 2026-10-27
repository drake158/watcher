/** One media element feeds analysis and the audible output through a gain node. */
export class AudioGraph {
  readonly analyser: AnalyserNode;
  readonly gain: GainNode;
  private readonly source: MediaElementAudioSourceNode;

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

  dispose(): void {
    this.source.disconnect();
    this.analyser.disconnect();
    this.gain.disconnect();
  }
}

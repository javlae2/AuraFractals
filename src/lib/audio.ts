/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class AudioEngine {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private audio: HTMLAudioElement | null = null;

  async init(audioElement?: HTMLAudioElement) {
    if (this.context) return;

    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    if (audioElement) {
      this.audio = audioElement;
      this.source = this.context.createMediaElementSource(audioElement);
      this.source.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    }
  }

  async loadTrack(file: File) {
    if (!this.context || !this.audio) return;
    const url = URL.createObjectURL(file);
    this.audio.src = url;
    this.audio.load();
  }

  async loadUrl(url: string) {
    if (!this.context || !this.audio) return;
    this.audio.src = url;
    this.audio.load();
    this.resume();
  }

  getFrequencyData() {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate simple bins
    const bins = {
      bass: 0,
      mid: 0,
      treble: 0,
      avg: 0
    };

    const len = this.dataArray.length;
    for (let i = 0; i < len; i++) {
        const val = this.dataArray[i] / 255;
        bins.avg += val;
        if (i < len * 0.2) bins.bass += val;
        else if (i < len * 0.6) bins.mid += val;
        else bins.treble += val;
    }

    bins.avg /= len;
    bins.bass /= (len * 0.2);
    bins.mid /= (len * 0.4);
    bins.treble /= (len * 0.4);

    return bins;
  }

  resume() {
    this.context?.resume();
  }
}

export const audioEngine = new AudioEngine();

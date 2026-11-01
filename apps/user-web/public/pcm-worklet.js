/**
 * Runs on the browser's audio thread. Turns microphone audio (usually 44.1
 * or 48 kHz floats) into 16 kHz 16-bit mono, the format Muse Voice wants,
 * and posts it in ~40 ms chunks.
 */
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / 16000; // input samples per output sample
    this.acc = 0;
    this.count = 0;
    this.phase = 0;
    this.out = new Int16Array(640); // 40 ms at 16 kHz
    this.n = 0;
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    for (let i = 0; i < input.length; i++) {
      // Average the input samples that fall into each output sample.
      this.acc += input[i];
      this.count++;
      this.phase += 1;
      if (this.phase >= this.step) {
        this.phase -= this.step;
        const v = Math.max(-1, Math.min(1, this.acc / this.count));
        this.out[this.n++] = v < 0 ? v * 0x8000 : v * 0x7fff;
        this.acc = 0;
        this.count = 0;
        if (this.n === this.out.length) {
          this.port.postMessage(this.out.buffer, [this.out.buffer]);
          this.out = new Int16Array(640);
          this.n = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor("pcm-capture", PcmCapture);

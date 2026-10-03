const CAP = 48000;

class PlayerProcessor extends AudioWorkletProcessor {
  left = new Float32Array(CAP);
  right = new Float32Array(CAP);
  write = 0;
  read = 0;
  filled = 0;

  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent) => {
      const data = event.data as { left: Float32Array; right: Float32Array };
      this.push(data.left, data.right);
    };
  }

  push(left: Float32Array, right: Float32Array) {
    const n = left.length;
    for (let i = 0; i < n; i++) {
      if (this.filled >= CAP) {
        this.read = (this.read + 1) % CAP;
        this.filled -= 1;
      }
      this.left[this.write] = left[i] ?? 0;
      this.right[this.write] = right[i] ?? 0;
      this.write = (this.write + 1) % CAP;
      this.filled += 1;
    }
  }

  process(_inputs: never, outputs: Array<Array<Float32Array>>) {
    const out = outputs[0];
    if (!out || !out[0]) {
      return true;
    }
    const frames = out[0].length;
    for (let i = 0; i < frames; i++) {
      if (this.filled === 0) {
        out[0][i] = 0;
        if (out[1]) {
          out[1][i] = 0;
        }
        continue;
      }
      out[0][i] = this.left[this.read] ?? 0;
      if (out[1]) {
        out[1][i] = this.right[this.read] ?? 0;
      }
      this.read = (this.read + 1) % CAP;
      this.filled -= 1;
    }
    return true;
  }
}

registerProcessor("audire-player", PlayerProcessor);

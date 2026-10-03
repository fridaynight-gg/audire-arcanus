export const splitPcm = (buffer: Uint8Array): { frames: Array<Uint8Array>; rest: Uint8Array } => {
  const frames: Array<Uint8Array> = [];
  let offset = 0;
  while (offset + 4 <= buffer.length) {
    const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4);
    const length = view.getUint32(0, true);
    if (offset + 4 + length > buffer.length) {
      break;
    }
    frames.push(buffer.slice(offset + 4, offset + 4 + length));
    offset += 4 + length;
  }
  return { frames, rest: buffer.slice(offset) };
};

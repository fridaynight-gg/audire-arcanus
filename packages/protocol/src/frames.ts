export const FrameType = {
  streamStart: 0x01,
  opus: 0x02,
  streamStop: 0x03,
  control: 0x10,
} as const;

export const encodeFrame = (type: number, payload: Uint8Array): Uint8Array => {
  const out = new Uint8Array(5 + payload.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, payload.length, true);
  out[4] = type;
  out.set(payload, 5);
  return out;
};

export const decodeFrame = (
  bytes: Uint8Array,
): { type: number; payload: Uint8Array } | undefined => {
  if (bytes.length < 5) {
    return undefined;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint32(0, true);
  const type = bytes[4] ?? 0;
  if (bytes.length < 5 + length) {
    return undefined;
  }
  return { type, payload: bytes.subarray(5, 5 + length) };
};

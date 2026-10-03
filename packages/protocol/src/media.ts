export const encodeMediaPayload = (seq: number, pts: number, data: Uint8Array): Uint8Array => {
  const payload = new Uint8Array(8 + data.length);
  const view = new DataView(payload.buffer);
  view.setUint32(0, seq, true);
  view.setUint32(4, pts, true);
  payload.set(data, 8);
  return payload;
};

export const decodeMediaPayload = (
  payload: Uint8Array,
): { seq: number; pts: number; data: Uint8Array } | undefined => {
  if (payload.length < 8) {
    return undefined;
  }
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  return {
    seq: view.getUint32(0, true),
    pts: view.getUint32(4, true),
    data: payload.subarray(8),
  };
};

import { startCapture } from "./capture.ts";

export const startFixtureSine = (
  signal: AbortSignal,
  onFrame: (pcm: Uint8Array) => Promise<void>,
): Promise<void> => startCapture(["--fixture", "sine"], signal, onFrame);

export const startMic = (
  id: string,
  signal: AbortSignal,
  onFrame: (pcm: Uint8Array) => Promise<void>,
): Promise<void> => startCapture(["--mic", id], signal, onFrame);

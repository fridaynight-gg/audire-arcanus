import { join } from "node:path";
import { CaptureUnavailable } from "@audire/domain";
import { splitPcm } from "./pcm.ts";

const captureBin = (): string =>
  join(import.meta.dirname, "../../../crates/audire-capture/target/release/audire-capture");

export const startFixtureSine = (
  signal: AbortSignal,
  onFrame: (pcm: Uint8Array) => Promise<void>,
): Promise<void> => {
  const bin = captureBin();
  const proc = Bun.spawn([bin, "--fixture", "sine"], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const abort = () => {
    proc.kill();
  };
  signal.addEventListener("abort", abort);
  const reader = proc.stdout.getReader();
  let rest = new Uint8Array(0);
  const loop = async () => {
    while (!signal.aborted) {
      const next = await reader.read();
      if (next.done || !next.value) {
        break;
      }
      const chunk = new Uint8Array(next.value);
      const joined = new Uint8Array(rest.length + chunk.length);
      joined.set(rest);
      joined.set(chunk, rest.length);
      const split = splitPcm(joined);
      rest = new Uint8Array(split.rest);
      for (const frame of split.frames) {
        await onFrame(frame);
      }
    }
    abort();
  };
  return loop().catch((cause: unknown) => {
    throw new CaptureUnavailable({ reason: String(cause) });
  });
};

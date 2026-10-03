import { spawn } from "node:child_process";
import { join } from "node:path";
import { CaptureUnavailable } from "@audire/domain";
import { splitPcm } from "./pcm.ts";

export const captureBin = (): string =>
  join(import.meta.dirname, "../../../crates/audire-capture/target/release/audire-capture");

export const listSources = async (): Promise<unknown> => {
  const proc = spawn(captureBin(), ["--list"]);
  const chunks: Array<Buffer> = [];
  proc.stdout.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
  });
  const code = await new Promise<number | null>((resolve, reject) => {
    proc.on("error", reject);
    proc.on("close", resolve);
  });
  if (code !== 0) {
    throw new CaptureUnavailable({ reason: `list exit ${String(code)}` });
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(text) as unknown;
};

export const startCapture = (
  args: Array<string>,
  signal: AbortSignal,
  onFrame: (pcm: Uint8Array) => Promise<void>,
): Promise<void> => {
  const proc = spawn(captureBin(), args, { stdio: ["ignore", "pipe", "ignore"] });
  const abort = () => {
    proc.kill();
  };
  signal.addEventListener("abort", abort);
  let rest = new Uint8Array(0);
  const loop = async () => {
    if (!proc.stdout) {
      return;
    }
    for await (const chunk of proc.stdout) {
      if (signal.aborted) {
        break;
      }
      const bytes = new Uint8Array(chunk);
      const joined = new Uint8Array(rest.length + bytes.length);
      joined.set(rest);
      joined.set(bytes, rest.length);
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

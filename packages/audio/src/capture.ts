import { spawn } from "node:child_process";
import { join } from "node:path";
import { CaptureUnavailable, PermissionDenied } from "@audire/domain";
import { splitPcm } from "./pcm.ts";

export const captureBin = (): string =>
  join(import.meta.dirname, "../../../crates/audire-capture/target/release/audire-capture");

export const parseHelperEvent = (
  text: string,
): { readonly tag: string; readonly message: string } | undefined => {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed) as { tag?: unknown; message?: unknown };
      if (typeof parsed.tag === "string") {
        return {
          tag: parsed.tag,
          message: typeof parsed.message === "string" ? parsed.message : "",
        };
      }
    } catch {
      continue;
    }
  }
  return undefined;
};

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
  const proc = spawn(captureBin(), args, { stdio: ["ignore", "pipe", "pipe"] });
  const abort = () => {
    proc.kill();
  };
  signal.addEventListener("abort", abort);
  const errChunks: Array<Buffer> = [];
  proc.stderr?.on("data", (chunk: Buffer) => {
    errChunks.push(chunk);
  });
  const closed = new Promise<number | null>((resolve, reject) => {
    proc.on("error", reject);
    proc.on("close", resolve);
  });
  let rest = new Uint8Array(0);
  const loop = async () => {
    if (proc.stdout) {
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
    }
    abort();
    const code = await closed;
    if (signal.aborted) {
      return;
    }
    const event = parseHelperEvent(Buffer.concat(errChunks).toString("utf8"));
    if (event?.tag === "PermissionDenied") {
      throw new PermissionDenied({ source: event.message });
    }
    if (code !== 0 && code !== null) {
      throw new CaptureUnavailable({ reason: event?.message ?? `exit ${String(code)}` });
    }
  };
  return loop();
};

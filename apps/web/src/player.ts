import { createDecoder } from "libopus-wasm";
import { decodeFrame, decodeMediaPayload, encodeFrame, FrameType } from "@audire/protocol";
import workletUrl from "./player-worklet.ts?url";

export type PlayerState = "idle" | "live";

const deinterleave = (pcm: Int16Array): { left: Float32Array; right: Float32Array } => {
  const frames = pcm.length / 2;
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    left[i] = (pcm[i * 2] ?? 0) / 32768;
    right[i] = (pcm[i * 2 + 1] ?? 0) / 32768;
  }
  return { left, right };
};

export const startPlayback = async (
  joinCode: string,
  username: string,
  onState: (state: PlayerState) => void,
  onJoined: (lobbyName: string, joinCode: string, lobbyId: string) => void,
): Promise<() => void> => {
  const decoder = await createDecoder({ sampleRate: 48000, channels: 2 });
  const ctx = new AudioContext({ sampleRate: 48000 });
  await ctx.audioWorklet.addModule(workletUrl);
  await ctx.resume();
  const node = new AudioWorkletNode(ctx, "audire-player", {
    outputChannelCount: [2],
  });
  node.connect(ctx.destination);

  const ws = new WebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
  );
  ws.binaryType = "arraybuffer";

  ws.addEventListener("open", () => {
    const payload = new TextEncoder().encode(JSON.stringify({ _tag: "join", joinCode, username }));
    ws.send(encodeFrame(FrameType.control, payload).slice());
  });

  ws.addEventListener("message", (event) => {
    if (!(event.data instanceof ArrayBuffer)) {
      return;
    }
    const frame = decodeFrame(new Uint8Array(event.data));
    if (!frame) {
      return;
    }
    if (frame.type === FrameType.control) {
      const msg = JSON.parse(new TextDecoder().decode(frame.payload)) as {
        _tag?: string;
        lobby?: { name: string; joinCode: string; id: string };
      };
      if (msg._tag === "joined" && msg.lobby) {
        onJoined(msg.lobby.name, msg.lobby.joinCode, msg.lobby.id);
      }
      return;
    }
    if (frame.type === FrameType.opus) {
      const media = decodeMediaPayload(frame.payload);
      if (!media) {
        return;
      }
      const pcm = decoder.decode(media.data);
      node.port.postMessage(deinterleave(pcm));
      onState("live");
    }
  });

  return () => {
    ws.close();
    void ctx.close();
    decoder.free();
  };
};

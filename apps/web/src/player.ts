import { createDecoder } from "libopus-wasm";
import { decodeFrame, decodeMediaPayload, encodeFrame, FrameType } from "@audire/protocol";

export type PlayerState = "idle" | "live";

const frameDuration = 960 / 48000;

const toBuffer = (ctx: AudioContext, pcm: Int16Array): AudioBuffer => {
  const frames = Math.floor(pcm.length / 2);
  const buffer = ctx.createBuffer(2, Math.max(frames, 1), 48000);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  for (let i = 0; i < frames; i++) {
    left[i] = (pcm[i * 2] ?? 0) / 32768;
    right[i] = (pcm[i * 2 + 1] ?? 0) / 32768;
  }
  return buffer;
};

export const startPlayback = async (
  joinCode: string,
  username: string,
  avatar: string,
  pet: string,
  onState: (state: PlayerState) => void,
  onJoined: (lobbyName: string, joinCode: string, lobbyId: string) => void,
): Promise<() => void> => {
  const decoder = await createDecoder({ sampleRate: 48000, channels: 2 });
  const ctx = new AudioContext({ sampleRate: 48000 });
  await ctx.resume();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  let next = 0;
  let live = false;

  const ws = new WebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
  );
  ws.binaryType = "arraybuffer";

  ws.addEventListener("open", () => {
    const payload = new TextEncoder().encode(
      JSON.stringify({ _tag: "join", joinCode, username, avatar, pet }),
    );
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
    if (frame.type === FrameType.streamStart) {
      next = 0;
      return;
    }
    if (frame.type === FrameType.streamStop) {
      next = 0;
      live = false;
      onState("idle");
      return;
    }
    if (frame.type === FrameType.opus) {
      const media = decodeMediaPayload(frame.payload);
      if (!media) {
        return;
      }
      const pcm = decoder.decode(media.data, { frameSize: 960 });
      const now = ctx.currentTime;
      if (next === 0 || next < now - 0.05) {
        next = now + 0.08;
      }
      const src = ctx.createBufferSource();
      src.buffer = toBuffer(ctx, pcm);
      src.connect(gain);
      src.start(next);
      next += frameDuration;
      if (!live) {
        live = true;
        onState("live");
      }
    }
  });

  return () => {
    ws.close();
    void ctx.close();
    decoder.free();
  };
};

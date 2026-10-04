import { createDecoder } from "libopus-wasm";
import { decodeFrame, decodeMediaPayload, encodeFrame, FrameType } from "@audire/protocol";

export type PlayerState = "idle" | "live";

export type ControlNote = {
  readonly _tag: string;
  readonly listenerId?: string;
  readonly username?: string;
  readonly avatar?: string;
  readonly pet?: string;
  readonly x?: number;
  readonly y?: number;
  readonly dir?: "down" | "left" | "right" | "up";
  readonly anim?: "idle" | "walk";
  readonly text?: string;
  readonly value?: number;
  readonly lobby?: { name: string; joinCode: string; id: string };
  readonly listener?: { id: string };
};

export type Playback = {
  readonly stop: () => void;
  readonly send: (msg: { readonly _tag: string } & Record<string, unknown>) => void;
};

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
  onJoined: (lobbyName: string, joinCode: string, lobbyId: string, listenerId: string) => void,
  onControl: (note: ControlNote) => void,
): Promise<Playback> => {
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

  const send = (msg: { readonly _tag: string } & Record<string, unknown>) => {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const payload = new TextEncoder().encode(JSON.stringify(msg));
    ws.send(encodeFrame(FrameType.control, payload).slice());
  };

  ws.addEventListener("open", () => {
    send({ _tag: "join", joinCode, username, avatar, pet });
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
      const msg = JSON.parse(new TextDecoder().decode(frame.payload)) as ControlNote;

      if (msg._tag === "joined" && msg.lobby && msg.listener) {
        onJoined(msg.lobby.name, msg.lobby.joinCode, msg.lobby.id, msg.listener.id);
      }

      onControl(msg);
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

  return {
    stop: () => {
      ws.close();
      void ctx.close();
      decoder.free();
    },
    send,
  };
};

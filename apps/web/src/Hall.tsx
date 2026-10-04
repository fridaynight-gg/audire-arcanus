import { useEffect, useRef, useState } from "react";
import { type Anim, type Dir, drawFamiliar, drawPatron } from "./draw.ts";
import { drawTavern } from "./draw-room.ts";
import { cols, moveBody, rows, spawnX, spawnY, tile } from "./tavern-map.ts";
import type { ControlNote } from "./player.ts";

type Peer = {
  id: string;
  username: string;
  avatar: string;
  pet: string;
  x: number;
  y: number;
  dir: Dir;
  anim: Anim;
};

type Bubble = {
  id: string;
  text: string;
  until: number;
};

const speed = 90;

const keys = new Set<string>();

export function Hall({
  selfId,
  selfName,
  avatar,
  pet,
  send,
  note,
}: {
  readonly selfId: string;
  readonly selfName: string;
  readonly avatar: string;
  readonly pet: string;
  readonly send: (msg: { readonly _tag: string } & Record<string, unknown>) => void;
  readonly note: ControlNote | undefined;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const self = useRef({ x: spawnX, y: spawnY, dir: "down" as Dir, anim: "idle" as Anim });
  const peers = useRef(new Map<string, Peer>());
  const bubbles = useRef(new Map<string, Bubble>());
  const frame = useRef(0);
  const [draft, setDraft] = useState("");
  const chatting = useRef(false);

  useEffect(() => {
    if (note === undefined) {
      return;
    }

    if (note._tag === "posed" && note.listenerId && note.listenerId !== selfId) {
      peers.current.set(note.listenerId, {
        id: note.listenerId,
        username: note.username ?? "guest",
        avatar: note.avatar ?? "wizard",
        pet: note.pet ?? "none",
        x: note.x ?? spawnX,
        y: note.y ?? spawnY,
        dir: note.dir ?? "down",
        anim: note.anim ?? "idle",
      });
    }

    if (note._tag === "said" && note.listenerId && note.text) {
      bubbles.current.set(note.listenerId, {
        id: note.listenerId,
        text: note.text,
        until: performance.now() + 4000,
      });
    }

    if (note._tag === "rolled" && note.listenerId && note.value !== undefined) {
      bubbles.current.set(`${note.listenerId}-roll`, {
        id: `${note.listenerId}-roll`,
        text: `d20 ${String(note.value)}`,
        until: performance.now() + 4000,
      });
    }
  }, [note, selfId]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) {
        return;
      }

      if (event.key === "Enter") {
        chatting.current = true;
        event.preventDefault();
        return;
      }

      if (event.key === "r" || event.key === "R") {
        send({ _tag: "roll", sides: 20 });
        event.preventDefault();
        return;
      }

      keys.add(event.key);
    };

    const up = (event: KeyboardEvent) => {
      keys.delete(event.key);
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [send]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    canvas.focus();
    let last = performance.now();
    let poseAt = 0;
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frame.current += 1;

      let dx = 0;
      let dy = 0;

      if (!chatting.current) {
        if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) {
          dx -= 1;
        }

        if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) {
          dx += 1;
        }

        if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) {
          dy -= 1;
        }

        if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) {
          dy += 1;
        }
      }

      const moving = dx !== 0 || dy !== 0;

      if (dx < 0) {
        self.current.dir = "left";
      } else if (dx > 0) {
        self.current.dir = "right";
      } else if (dy < 0) {
        self.current.dir = "up";
      } else if (dy > 0) {
        self.current.dir = "down";
      }

      self.current.anim = moving ? "walk" : "idle";

      if (moving) {
        const len = Math.hypot(dx, dy);
        const next = moveBody(
          self.current.x,
          self.current.y,
          (dx / len) * speed * dt,
          (dy / len) * speed * dt,
        );
        self.current.x = next.x;
        self.current.y = next.y;
      }

      if (now - poseAt > 80) {
        poseAt = now;
        send({
          _tag: "pose",
          x: self.current.x,
          y: self.current.y,
          dir: self.current.dir,
          anim: self.current.anim,
        });
      }

      ctx.imageSmoothingEnabled = false;
      drawTavern(ctx, now);

      const bob = Math.floor(now / 180);

      const paint = (who: Peer) => {
        drawPatron(ctx, who.x, who.y, who.avatar, who.dir, who.anim, bob);
        const behind = who.dir === "left" ? 18 : who.dir === "right" ? -18 : 0;
        const back = who.dir === "up" ? 16 : 12;
        drawFamiliar(ctx, who.x + behind, who.y + back, who.pet, bob);
        ctx.fillStyle = "#efe6c9";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(who.username, who.x, who.y - 28);
        const bubble = bubbles.current.get(who.id) ?? bubbles.current.get(`${who.id}-roll`);

        if (bubble && bubble.until > now) {
          ctx.fillStyle = "#efe6c9";
          ctx.fillRect(who.x - 40, who.y - 52, 80, 16);
          ctx.fillStyle = "#2a1810";
          ctx.fillText(bubble.text, who.x, who.y - 40);
        }
      };

      const crowd: Array<Peer> = [
        {
          id: selfId,
          username: selfName,
          avatar,
          pet,
          x: self.current.x,
          y: self.current.y,
          dir: self.current.dir,
          anim: self.current.anim,
        },
        ...peers.current.values(),
      ];

      crowd.sort((a, b) => a.y - b.y);

      for (const who of crowd) {
        paint(who);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [avatar, pet, selfId, selfName, send]);

  return (
    <div className="relative mx-auto w-[min(768px,96vw)]">
      <canvas
        ref={canvasRef}
        width={cols * tile}
        height={rows * tile}
        tabIndex={0}
        className="w-full border-4 border-beam [image-rendering:pixelated] outline-none"
      />
      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 border-2 border-oak bg-parchment px-3 py-2 font-pixel text-ink"
          value={draft}
          placeholder={chatting.current ? "Speak…" : "Enter to speak · R to roll"}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }

            event.preventDefault();
            const text = draft.trim().slice(0, 80);

            if (text.length > 0) {
              send({ _tag: "say", text });
            }

            setDraft("");
            chatting.current = false;
          }}
          onFocus={() => {
            chatting.current = true;
          }}
          onBlur={() => {
            chatting.current = false;
          }}
          maxLength={80}
          aria-label="say"
        />
        <button
          type="button"
          className="border-2 border-soot bg-ember px-4 py-2 font-display text-parchment uppercase"
          onClick={() => send({ _tag: "roll", sides: 20 })}
        >
          d20
        </button>
      </div>
    </div>
  );
}

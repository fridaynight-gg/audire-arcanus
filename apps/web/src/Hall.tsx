import { useEffect, useRef, useState } from "react";
import { DiceToss } from "./DiceToss.tsx";
import { type Anim, type Dir, drawFamiliar, drawPatron } from "./draw.ts";
import { drawTavern } from "./draw-room.ts";
import { atDoor, cols, moveBody, rows, spawnX, spawnY, tile } from "./tavern-map.ts";
import { routeHallKey } from "./hall-keys.ts";
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

export function Hall({
  selfId,
  selfName,
  avatar,
  pet,
  send,
  unlock,
  inbox,
  listeners,
  onLeave,
}: {
  readonly selfId: string;
  readonly selfName: string;
  readonly avatar: string;
  readonly pet: string;
  readonly send: (msg: { readonly _tag: string } & Record<string, unknown>) => void;
  readonly unlock: () => void;
  readonly inbox: { current: Array<ControlNote> };
  readonly listeners: ReadonlyArray<{
    readonly id: string;
    readonly username: string;
    readonly avatar?: string;
    readonly pet?: string;
  }>;
  readonly onLeave: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sayRef = useRef<HTMLInputElement>(null);
  const keys = useRef(new Set<string>());
  const self = useRef({ x: spawnX, y: spawnY, dir: "down" as Dir, anim: "idle" as Anim });
  const peers = useRef(new Map<string, Peer>());
  const bubbles = useRef(new Map<string, Bubble>());
  const frame = useRef(0);
  const [draft, setDraft] = useState("");
  const [dice, setDice] = useState<{ readonly value: number | undefined } | undefined>(undefined);
  const [banner, setBanner] = useState("");
  const chatting = useRef(false);

  useEffect(() => {
    for (const item of listeners) {
      if (item.id === selfId || peers.current.has(item.id)) {
        continue;
      }

      peers.current.set(item.id, {
        id: item.id,
        username: item.username,
        avatar: item.avatar ?? "wizard",
        pet: item.pet ?? "none",
        x: spawnX + 24,
        y: spawnY,
        dir: "down",
        anim: "idle",
      });
    }
  }, [listeners, selfId]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      unlock();
      const action = routeHallKey(event.key, event.target instanceof HTMLInputElement);

      if (action === "ignore") {
        return;
      }

      if (action === "focus-say") {
        event.preventDefault();
        sayRef.current?.focus();
        return;
      }

      if (action === "roll") {
        event.preventDefault();
        setDice({ value: undefined });
        send({ _tag: "roll", sides: 20 });
        return;
      }

      event.preventDefault();
      keys.current.add(event.key);
    };

    const up = (event: KeyboardEvent) => {
      keys.current.delete(event.key);
    };

    const blur = () => {
      keys.current.clear();
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      keys.current.clear();
    };
  }, [send, unlock]);

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

      const incoming = inbox.current.splice(0);

      for (const note of incoming) {
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
            until: now + 5000,
          });
          setBanner(`${note.username ?? "someone"}: ${note.text}`);
        }

        if (note._tag === "rolled" && note.listenerId && note.value !== undefined) {
          bubbles.current.set(`${note.listenerId}-roll`, {
            id: `${note.listenerId}-roll`,
            text: `d20 ${String(note.value)}`,
            until: now + 5000,
          });
          setDice({ value: note.value });
          setBanner(`${note.username ?? "someone"} rolled ${String(note.value)}`);
        }
      }

      let dx = 0;
      let dy = 0;

      if (!chatting.current) {
        if (keys.current.has("ArrowLeft") || keys.current.has("a") || keys.current.has("A")) {
          dx -= 1;
        }

        if (keys.current.has("ArrowRight") || keys.current.has("d") || keys.current.has("D")) {
          dx += 1;
        }

        if (keys.current.has("ArrowUp") || keys.current.has("w") || keys.current.has("W")) {
          dy -= 1;
        }

        if (keys.current.has("ArrowDown") || keys.current.has("s") || keys.current.has("S")) {
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
          ctx.font = "16px sans-serif";
          const label = bubble.text;
          const wide = Math.min(220, Math.max(72, ctx.measureText(label).width + 16));
          ctx.fillStyle = "#efe6c9";
          ctx.fillRect(who.x - wide / 2, who.y - 58, wide, 22);
          ctx.strokeStyle = "#2a1810";
          ctx.strokeRect(who.x - wide / 2, who.y - 58, wide, 22);
          ctx.fillStyle = "#2a1810";
          ctx.fillText(label, who.x, who.y - 42);
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
  }, [avatar, pet, inbox, selfId, selfName, send]);

  return (
    <div className="relative mx-auto w-[min(768px,96vw)]">
      {dice ? <DiceToss value={dice.value} onDone={() => setDice(undefined)} /> : null}
      <canvas
        ref={canvasRef}
        width={cols * tile}
        height={rows * tile}
        tabIndex={0}
        className="w-full border-4 border-beam [image-rendering:pixelated] outline-none"
        onPointerDown={() => unlock()}
        onMouseMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - box.left) / box.width) * event.currentTarget.width;
          const y = ((event.clientY - box.top) / box.height) * event.currentTarget.height;
          event.currentTarget.style.cursor = atDoor(x, y) ? "pointer" : "default";
        }}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - box.left) / box.width) * event.currentTarget.width;
          const y = ((event.clientY - box.top) / box.height) * event.currentTarget.height;

          if (atDoor(x, y)) {
            onLeave();
          }
        }}
      />
      <div className="mt-3 flex gap-2">
        <input
          ref={sayRef}
          className="flex-1 border-2 border-oak bg-parchment px-3 py-2 font-pixel text-ink"
          value={draft}
          placeholder="Enter to speak · R to roll"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }

            event.preventDefault();
            const text = draft.trim().slice(0, 80);

            if (text.length > 0) {
              bubbles.current.set(selfId, {
                id: selfId,
                text,
                until: performance.now() + 5000,
              });
              setBanner(`${selfName}: ${text}`);
              send({ _tag: "say", text });
            }

            setDraft("");
            chatting.current = false;
            canvasRef.current?.focus();
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
          onClick={() => {
            setDice({ value: undefined });
            send({ _tag: "roll", sides: 20 });
          }}
        >
          d20
        </button>
        <button
          type="button"
          aria-label="leave lobby"
          title="Leave the hall"
          className="relative h-[2.75rem] w-12 shrink-0 border-4 border-soot bg-oak shadow-[4px_4px_0_#120b08] hover:bg-wine"
          onClick={onLeave}
        >
          <span className="pointer-events-none absolute inset-1 border-2 border-beam bg-[#6b3a1c]" />
          <span className="pointer-events-none absolute left-1/2 top-1.5 h-5 w-0.5 -translate-x-1/2 bg-soot" />
          <span className="pointer-events-none absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-candle" />
        </button>
      </div>
      {banner ? <p className="mt-3 text-center font-pixel text-glow">{banner}</p> : null}
    </div>
  );
}

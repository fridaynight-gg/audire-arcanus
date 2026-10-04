import { useEffect, useRef } from "react";
import { drawFamiliar, drawPatron } from "./draw.ts";

export function Sprite({ id }: { readonly id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) {
      return;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPatron(ctx, 24, 36, id, "down", "idle", 0);
  }, [id]);

  return (
    <canvas
      ref={ref}
      width={48}
      height={48}
      className="h-16 w-16 [image-rendering:pixelated]"
      aria-hidden="true"
    />
  );
}

export function Familiar({ id }: { readonly id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) {
      return;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFamiliar(ctx, 16, 20, id, 0);
  }, [id]);

  return (
    <canvas
      ref={ref}
      width={32}
      height={32}
      className="h-8 w-8 [image-rendering:pixelated]"
      aria-hidden="true"
    />
  );
}

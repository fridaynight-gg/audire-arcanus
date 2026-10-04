import { useEffect, useRef } from "react";
import * as THREE from "three";

export function DiceToss({
  value,
  onDone,
}: {
  readonly value: number | undefined;
  readonly onDone: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const root = host.current;

    if (!root) {
      return;
    }

    const width = root.clientWidth || window.innerWidth;
    const height = 220;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    root.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 40);
    camera.position.set(0, 1.4, 8);
    scene.add(new THREE.AmbientLight(0xffe6b0, 1.1));
    const lamp = new THREE.DirectionalLight(0xffc36a, 2);
    lamp.position.set(3, 6, 4);
    scene.add(lamp);

    const die = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({
        color: 0x8b1e3f,
        metalness: 0.25,
        roughness: 0.35,
        emissive: 0x3a0c12,
      }),
    );
    scene.add(die);
    die.add(
      new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.02, 0),
        new THREE.MeshBasicMaterial({ color: 0xf0c36a, wireframe: true }),
      ),
    );

    const started = performance.now();
    let raf = 0;
    let finished = false;

    const tick = (now: number) => {
      const t = (now - started) / 1000;
      const settled = valueRef.current !== undefined && t > 1.4;

      if (!settled) {
        die.rotation.x += 0.18;
        die.rotation.y += 0.24;
        die.position.x = -6 + t * 8;
        die.position.y = Math.abs(Math.sin(t * 6)) * 1.2;
      } else {
        die.rotation.set(0.4, 0.8, 0.2);
        die.position.set(0, 0.2, 0);
      }

      if (!finished && ((t > 2.8 && valueRef.current !== undefined) || t > 4.5)) {
        finished = true;
        done.current();
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      root.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-30 flex flex-col items-center">
      <div ref={host} className="h-56 w-full max-w-3xl" />
      {value === undefined ? (
        <p className="font-display text-2xl tracking-[0.3em] text-candle uppercase">
          The die is cast
        </p>
      ) : (
        <p className="border-4 border-oak bg-parchment px-8 py-3 font-display text-4xl text-wine shadow-[8px_8px_0_#120b08]">
          {value}
        </p>
      )}
    </div>
  );
}

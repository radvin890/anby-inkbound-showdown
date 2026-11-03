import { useEffect, useRef, useState } from "react";
import { H, W, type Game } from "@/game/engine";
import type { Sfx } from "@/game/audio";
import type { DialogueLine } from "@/game/prologue";

export function PrologueDialogue({ game, sfx, lines, onDone }: { game: Game | null; sfx: Sfx | null; lines: DialogueLine[]; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [i, setI] = useState(0);
  const line = lines[i] ?? lines[lines.length - 1]!;

  useEffect(() => {
    const canvas = ref.current, c = canvas?.getContext("2d");
    if (!canvas || !c || !game) return;
    let raf = 0; const t0 = performance.now();
    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.round(r.width * dpr), ph = Math.round(r.height * dpr);
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      c.setTransform(pw / W, 0, 0, ph / H, 0, 0);
      c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
      const s = line.scene;
      if (s === "peace") game.paintTrailerScene(c, 120 + t * 8, t, [{ character: "anby", x: 400, face: 1 }, { character: "nicole", x: 520, face: -1 }]);
      else if (s === "incident" || s === "witness") {
        game.paintTrailerScene(c, 600, t, [{ character: "anby", x: 380, face: 1 }, { character: "nicole", x: 480, face: 1 }]);
        c.fillStyle = `rgba(140,30,20,${0.22 + 0.06 * Math.sin(t * 5)})`; c.fillRect(0, 0, W, H);
        for (let k = 0; k < 6; k++) { const x = 100 + k * 160, rise = (t * 30 + k * 40) % 160; c.beginPath(); c.arc(x, 360 - rise, 28 + rise * 0.25, 0, Math.PI * 2); c.fillStyle = `rgba(29,22,18,${0.55 - rise / 400})`; c.fill(); }
      } else {
        game.paintTrailerScene(c, 1500, t, []);
        c.fillStyle = "rgba(15,22,40,0.8)"; c.fillRect(0, 0, W, H);
        c.fillStyle = `rgba(224,160,50,${0.5 + 0.5 * Math.sin(t * 3)})`; c.beginPath(); c.arc(660, 362, 4, 0, Math.PI * 2); c.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [game, line.scene]);

  const next = () => { sfx?.click(); if (i + 1 >= lines.length) onDone(); else setI(i + 1); };
  const skip = () => { sfx?.click(); onDone(); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === "Escape") { e.preventDefault(); skip(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  return (
    <div className="story-trailer" role="dialog" aria-label="Story Mode prologue">
      <canvas ref={ref} className="h-full w-full block" aria-hidden="true" />
      <button className="ink-btn ink-btn-alt story-skip" onClick={skip}>SKIP ▸▸</button>
      <div className="absolute inset-x-3 bottom-3 ink-card text-left">
        {line.speaker && <p className="ink-kicker">{line.speaker}</p>}
        <p className="mt-1">{line.text}</p>
        <div className="mt-3 flex justify-end"><button className="ink-btn" onClick={next} autoFocus>Continue ▸</button></div>
      </div>
    </div>
  );
}

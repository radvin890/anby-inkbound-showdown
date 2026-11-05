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
      } else if (s === "site") {
        game.paintTrailerScene(c, 600, t, [{ character: "nicole", x: 420, face: 1 }, { character: "anby", x: 540, face: -1 }]);
        c.fillStyle = "rgba(60,50,40,0.25)"; c.fillRect(0, 0, W, H);
        for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(150 + k * 220, 462, 60, 10, 0, 0, Math.PI * 2); c.fillStyle = "rgba(29,22,18,0.55)"; c.fill(); }
        c.fillStyle = `rgba(150,220,255,${0.3 + 0.2 * Math.sin(t * 6)})`; c.beginPath(); c.arc(370, 455, 8, 0, Math.PI * 2); c.fill();
      } else if (s === "facility" || s === "monitor") {
        game.paintTrailerScene(c, 900, t, s === "facility" ? [{ character: "anby", x: 380, face: 1 }, { character: "nicole", x: 290, face: 1 }] : [{ character: "anby", x: 300, face: 1 }, { character: "nicole", x: 210, face: 1 }]);
        c.fillStyle = "rgba(30,36,46,0.72)"; c.fillRect(0, 0, W, H);
        for (let x = 40; x < W; x += 220) { c.fillStyle = "#3b4048"; c.fillRect(x, 40, 34, 416); }
        c.fillStyle = Math.sin(t * 9) > -0.5 ? "rgba(214,232,150,0.8)" : "rgba(80,90,70,0.5)"; c.fillRect(120, 46, 90, 8); c.fillRect(560, 46, 90, 8);
        if (s === "monitor") {
          c.fillStyle = "#1d1612"; c.fillRect(560, 170, 230, 170);
          c.fillStyle = `rgba(150,200,190,${0.55 + 0.25 * Math.sin(t * 13)})`; c.fillRect(575, 185, 200, 140);
          for (let y = 185; y < 325; y += 6) { c.fillStyle = "rgba(20,30,30,0.25)"; c.fillRect(575, y + ((t * 40) % 6), 200, 2); }
          const amp = 6 + 14 * Math.abs(Math.sin(t * 8));
          c.strokeStyle = "#1d3330"; c.lineWidth = 3; c.beginPath();
          for (let x = 0; x <= 200; x += 8) c.lineTo(575 + x, 255 + Math.sin(x * 0.2 + t * 12) * amp * Math.sin((x / 200) * Math.PI));
          c.stroke();
        }
      } else if (s === "static") {
        const on = t < 0.6;
        c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
        if (on) for (let k = 0; k < 900; k++) { c.fillStyle = Math.random() < 0.5 ? "#ddd" : "#555"; c.fillRect(Math.random() * W, Math.random() * H, 4, 3); }
        else { c.fillStyle = "#ddd"; c.fillRect(W / 2 - Math.max(0, 200 - (t - 0.6) * 600), H / 2 - 1, Math.max(0, 400 - (t - 0.6) * 1200), 2); }
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

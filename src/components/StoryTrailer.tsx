import { useEffect, useRef, useState } from "react";
import { H, W, type Game } from "@/game/engine";
import type { Sfx } from "@/game/audio";
import { TRAILER_SCENES, TRAILER_LENGTH, sceneAt } from "@/game/trailer";

const INK = "#1d1612";
const GROUND_Y = 456;

function caption(c: CanvasRenderingContext2D, text: string, y: number, size: number, alpha: number, color = "#f4e4bf") {
  c.save(); c.globalAlpha = alpha; c.textAlign = "center"; c.textBaseline = "middle";
  c.font = `${size}px Rye, serif`; c.lineJoin = "round";
  const lines = text.split("\n");
  lines.forEach((ln, i) => {
    const ly = y + (i - (lines.length - 1) / 2) * size * 1.15;
    c.lineWidth = Math.max(4, size / 6); c.strokeStyle = INK; c.strokeText(ln, W / 2, ly);
    c.fillStyle = color; c.fillText(ln, W / 2, ly);
  });
  c.restore();
}

function subtitle(c: CanvasRenderingContext2D, text: string, alpha: number) {
  c.save(); c.globalAlpha = alpha;
  c.fillStyle = "rgba(29,22,18,0.78)"; c.fillRect(0, H - 92, W, 64);
  c.font = "22px 'Special Elite', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillStyle = "#f4e4bf"; c.fillText(text, W / 2, H - 60);
  c.restore();
}

export function StoryTrailer({ game, sfx, onExit }: { game: Game | null; sfx: Sfx | null; onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [run, setRun] = useState(0);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c || !game) return;
    const off = document.createElement("canvas"); off.width = W; off.height = H;
    const o = off.getContext("2d")!;
    let raf = 0, lastScene = -1;
    const t0 = performance.now();
    const frame = (now: number) => {
      const t = Math.min((now - t0) / 1000, TRAILER_LENGTH);
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.round(rect.width * dpr), ph = Math.round(rect.height * dpr);
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      c.setTransform(pw / W, 0, 0, ph / H, 0, 0);
      const { index, local, scene } = sceneAt(t);
      if (index !== lastScene) {
        lastScene = index;
        if (scene.id === "incidents") sfx?.boom(); else if (scene.id === "witnesses") sfx?.tele();
        else if (scene.id === "squad") sfx?.whistle(); else if (scene.id === "reveal") { sfx?.boom(); sfx?.phase(); }
        else if (scene.id === "end") sfx?.victory();
      }
      const d = scene.duration;
      const fade = Math.min(1, local / 0.7, (d - local) / 0.7);
      const p = local / d;
      c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
      const paint = (cam: number, actors: Parameters<Game["paintTrailerScene"]>[3]) => game.paintTrailerScene(c, cam, t, actors);

      if (scene.id === "peace") {
        paint(100 + p * 160, [{ character: "anby", x: 400, face: 1 }, { character: "nicole", x: 520, face: -1 }]);
        c.fillStyle = "rgba(244,228,191,0.12)"; c.fillRect(0, 0, W, H);
        caption(c, "NEW ERIDU.\nPEACE, AT LAST.", 150, 50, Math.min(1, Math.max(0, (local - 0.8) / 0.8)));
      } else if (scene.id === "incidents") {
        paint(600 + p * 120 + Math.sin(t * 40) * (local < 0.6 ? 6 : 0), []);
        c.fillStyle = `rgba(140,30,20,${0.25 + 0.1 * Math.sin(t * 6)})`; c.fillRect(0, 0, W, H);
        for (let i = 0; i < 6; i++) { // ink smoke plumes
          const x = 120 + i * 150, rise = (t * 30 + i * 40) % 160;
          c.beginPath(); c.arc(x, 380 - rise, 30 + rise * 0.25, 0, Math.PI * 2);
          c.fillStyle = `rgba(29,22,18,${0.55 - rise / 400})`; c.fill();
        }
        subtitle(c, "Strange incidents and destruction spread through the city.", Math.min(1, local / 0.8));
      } else if (scene.id === "witnesses") {
        paint(900, [{ character: "anby", x: W / 2, face: 1 }]);
        c.fillStyle = "rgba(29,22,18,0.5)"; c.fillRect(0, 0, W, H);
        const g = c.createRadialGradient(W / 2, 380, 40, W / 2, 380, 260);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.85)");
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.font = "64px Rye, serif"; c.textAlign = "center"; c.fillStyle = "#f3cf72"; c.strokeStyle = INK; c.lineWidth = 5;
        [[-140, 260], [150, 230], [0, 200]].forEach(([dx, y], i) => {
          const a = Math.min(1, Math.max(0, local - 0.6 - i * 0.6)); c.globalAlpha = a;
          c.strokeText("?", W / 2 + dx!, y! + Math.sin(t * 3 + i) * 6); c.fillText("?", W / 2 + dx!, y! + Math.sin(t * 3 + i) * 6);
        });
        c.globalAlpha = 1;
        subtitle(c, "Witnesses insist the culprit looks exactly like Anby.", Math.min(1, local / 0.8));
      } else if (scene.id === "black") {
        // pure cut to black
      } else if (scene.id === "squad") {
        const sx = 640 - p * 30;
        game.paintTrailerScene(c, 1500 - p * 80, t, []);
        c.fillStyle = "rgba(15,22,40,0.75)"; c.fillRect(0, 0, W, H);
        // silhouette: character art filled with solid ink, identity hidden
        o.clearRect(0, 0, W, H);
        game.paintTrailerScene(o, 0, t, [{ character: "twiggy", x: sx, face: -1 }], false);
        o.globalCompositeOperation = "source-in"; o.fillStyle = "#05060a"; o.fillRect(0, 0, W, H); o.globalCompositeOperation = "source-over";
        c.drawImage(off, 0, 0);
        // glowing eyes hint
        c.fillStyle = `rgba(224,160,50,${0.5 + 0.5 * Math.sin(t * 4)})`;
        c.beginPath(); c.arc(sx - 7, GROUND_Y - 94, 3.5, 0, Math.PI * 2); c.fill(); // single amber eye
        c.fillStyle = "rgba(201,212,220,0.9)"; c.font = "18px serif"; c.textAlign = "center"; c.fillText("★", sx + 4, GROUND_Y - 89);
        caption(c, "SILVER SQUAD", 90, 34, Math.min(1, local / 1.2), "#c9d4dc");
      } else if (scene.id === "reveal") {
        const flash = Math.max(0, 1 - local / 0.4);
        o.clearRect(0, 0, W, H);
        game.paintTrailerScene(o, 1200, t, [{ character: "anby", x: 340, face: 1 }, { character: "twiggy", x: 620, face: -1 }]);
        c.drawImage(off, 0, 0);
        // right half: Twiggy under a cold silver-violet wash
        c.save(); c.beginPath(); c.rect(W / 2, 0, W / 2, H); c.clip();
        c.fillStyle = "rgba(70,60,110,0.35)"; c.fillRect(W / 2, 0, W / 2, H);
        c.restore();
        c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.stroke();
        caption(c, "TWIGGY", 110, 60, Math.min(1, Math.max(0, (local - 0.6) / 0.6)), "#e8604c");
        caption(c, "ONE FACE. TWO IDENTITIES.", 200, 38, Math.min(1, Math.max(0, (local - 1.6) / 0.8)));
        if (flash > 0) { c.fillStyle = `rgba(255,250,235,${flash})`; c.fillRect(0, 0, W, H); }
      } else {
        c.fillStyle = "#e9d6ac"; c.fillRect(0, 0, W, H);
        c.strokeStyle = INK; c.lineWidth = 10; c.strokeRect(24, 24, W - 48, H - 48);
        caption(c, "ANBY", 200, 110 + Math.sin(t * 2) * 2, Math.min(1, local / 0.8), "#b5503a");
        caption(c, "INKBOUND SHOWDOWN", 300, 44, Math.min(1, local / 0.8), "#b5503a");
        caption(c, "THE FINAL SHOWDOWN IS COMING.", 400, 28, Math.min(1, Math.max(0, (local - 1.2) / 0.8)));
      }
      // fade, letterbox, film grain flicker
      c.fillStyle = `rgba(0,0,0,${1 - Math.max(0, fade)})`; c.fillRect(0, 0, W, H);
      c.fillStyle = "#000"; c.fillRect(0, 0, W, 26); c.fillRect(0, H - 26, W, 26);
      c.fillStyle = `rgba(244,228,191,${0.03 + Math.random() * 0.03})`; c.fillRect(0, 0, W, H);
      if (t >= TRAILER_LENGTH) { setEnded(true); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [game, sfx, run]);

  const skip = () => { sfx?.click(); setEnded(true); };
  const replay = () => { sfx?.click(); setEnded(false); setRun((r) => r + 1); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") { e.preventDefault(); if (ended) onExit(); else skip(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="story-trailer" role="dialog" aria-label="Story Mode trailer">
      {!ended && <canvas ref={canvasRef} className="h-full w-full block" aria-label={TRAILER_SCENES.map((s) => s.caption).join(" ")} />}
      {!ended && <button className="ink-btn ink-btn-alt story-skip" onClick={skip} autoFocus>SKIP ▸▸</button>}
      {ended && (
        <div className="ink-overlay">
          <div className="ink-card">
            <h2 className="ink-title text-[clamp(1.8rem,5vw,3.2rem)]">ANBY<span className="block text-[0.5em]">Inkbound Showdown</span></h2>
            <p className="mt-2 font-semibold">THE FINAL SHOWDOWN IS COMING.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button className="ink-btn" onClick={replay} autoFocus>REPLAY TRAILER</button>
              <button className="ink-btn ink-btn-alt" onClick={() => { sfx?.click(); onExit(); }}>BACK TO MENU</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

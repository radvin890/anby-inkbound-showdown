import { useEffect, useRef, useState, type ReactNode } from "react";
import { Game, type GameState, type GameStats, type InputState } from "@/game/engine";
import { Sfx } from "@/game/audio";
import { characterForKey, type CharacterId } from "@/game/characters";
import { Button } from "@/components/ui/button";

type Key = keyof InputState;
const KEYMAP: Record<string, Key> = {
  KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
  Space: "jump", ArrowUp: "jump", KeyW: "jump", KeyJ: "shoot", KeyK: "dash", ShiftLeft: "dash",
};

const CONTROLS: [string, string][] = [
  ["A / D or ← →", "Move"],
  ["Space", "Jump (hold for higher)"],
  ["J", "Anby: sword / Nicole: ether cannon"],
  ["1 / 2", "Switch to Anby / Nicole"],
  ["K", "Dash — invincible for a moment"],
  ["Esc", "Pause"],
];

export function InkboundGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const inputRef = useRef<InputState>({ left: false, right: false, jump: false, shoot: false, dash: false });
  const [state, setState] = useState<GameState>("menu");
  const [stats, setStats] = useState<GameStats | null>(null);
  const [tutorial, setTutorial] = useState(false);
  const [seenTutorial, setSeenTutorial] = useState(false);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [activeCharacter, setActiveCharacter] = useState<CharacterId>("anby");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sfx = new Sfx();
    sfxRef.current = sfx;
    const g = new Game(canvas, inputRef.current, sfx, (s, st) => {
      setState(s);
      setActiveCharacter(g.activeCharacter);
      if (st) setStats(st);
    });
    gameRef.current = g;
    g.run();
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const onBlur = () => { Object.assign(inputRef.current, { left: false, right: false, jump: false, shoot: false, dash: false }); g.pause(); };
    window.addEventListener("blur", onBlur);
    return () => { g.destroy(); window.removeEventListener("blur", onBlur); };
  }, []);

  const begin = () => {
    sfxRef.current?.ensure(); sfxRef.current?.click();
    if (!seenTutorial) { setTutorial(true); return; }
    gameRef.current?.start();
  };
  const closeTutorialAndPlay = () => {
    setTutorial(false); setSeenTutorial(true);
    sfxRef.current?.click();
    gameRef.current?.start();
  };
  const switchTo = (character: CharacterId) => {
    if (gameRef.current?.switchCharacter(character)) setActiveCharacter(character);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const g = gameRef.current;
      const character = characterForKey(e.code, e.target);
      if (character) {
        if (g?.state === "playing") { e.preventDefault(); switchTo(character); }
        return;
      }
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.closest("input, textarea, select, [role='textbox']"))) return;
      if (e.code === "Escape") {
        if (g?.state === "playing") g.pause(); else if (g?.state === "paused") g.resume();
        return;
      }
      if (e.code === "Enter" && !e.repeat) {
        if (tutorial) closeTutorialAndPlay();
        else if (g && (g.state === "menu" || g.state === "victory" || g.state === "defeat")) begin();
        return;
      }
      const k = KEYMAP[e.code];
      if (k) { inputRef.current[k] = true; if (g?.state === "playing") e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => { const k = KEYMAP[e.code]; if (k) inputRef.current[k] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  });

  const toggleMute = () => {
    const m = !muted; setMuted(m); sfxRef.current?.setMuted(m);
  };

  return (
    <div className="game-frame">
      <canvas ref={canvasRef} className="h-full w-full block" aria-label="Anby: Inkbound Showdown game canvas" />

      {(state === "playing" || state === "paused") && (
        <div className="character-switch" role="group" aria-label="Active character">
          <Button variant="ghost" className="character-key" aria-pressed={activeCharacter === "anby"} disabled={state !== "playing"} onClick={() => switchTo("anby")}><kbd>1</kbd> Anby</Button>
          <Button variant="ghost" className="character-key" aria-pressed={activeCharacter === "nicole"} disabled={state !== "playing"} onClick={() => switchTo("nicole")}><kbd>2</kbd> Nicole</Button>
        </div>
      )}

      {(state === "playing" || state === "paused") && (
        <div className="absolute right-3 top-3 flex gap-2">
          <button className="ink-chip" onClick={toggleMute} aria-label={muted ? "Unmute sound" : "Mute sound"}>{muted ? "🔇" : "🔊"}</button>
          <button className="ink-chip" onClick={() => (state === "paused" ? gameRef.current?.resume() : gameRef.current?.pause())} aria-label="Pause">{state === "paused" ? "▶" : "❚❚"}</button>
        </div>
      )}

      {state === "menu" && !tutorial && (
        <Overlay>
          <p className="ink-kicker">An original rubber-hose boss bout</p>
          <h1 className="ink-title">ANBY<span className="block text-[0.55em]">Inkbound Showdown</span></h1>
          <p className="persian" dir="rtl" lang="fa">انبی: نبرد جوهری</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button className="ink-btn" onClick={begin} autoFocus>Start Fight</button>
            <button className="ink-btn ink-btn-alt" onClick={() => { sfxRef.current?.click(); setTutorial(true); }}>How to Play</button>
            <button className="ink-btn ink-btn-alt" onClick={toggleMute}>Sound: {muted ? "Off" : "On"}</button>
          </div>
          <p className="mt-4 text-xs opacity-70">Fan-made tribute. Original art, enemy and sound. Press Enter to start.</p>
        </Overlay>
      )}

      {tutorial && (
        <Overlay>
          <h2 className="ink-heading">How to Play</h2>
          <ul className="ink-legend">
            {CONTROLS.map(([k, v]) => (<li key={k}><kbd>{k}</kbd><span>{v}</span></li>))}
          </ul>
          <p className="mt-3 max-w-md text-sm">Watch for the red <b>!</b> above Maestro Kettlewind — every attack is telegraphed. Jump gears, dodge falling sugar under the shadows, and read the beam warnings. Dash through danger!</p>
          {touch && <p className="mt-2 text-sm">On touch screens, use the on-screen buttons.</p>}
          <button className="ink-btn mt-4" onClick={closeTutorialAndPlay} autoFocus>Got it — Fight!</button>
        </Overlay>
      )}

      {state === "paused" && (
        <Overlay>
          <h2 className="ink-heading">Paused</h2>
          <ul className="ink-legend">
            {CONTROLS.map(([k, v]) => (<li key={k}><kbd>{k}</kbd><span>{v}</span></li>))}
          </ul>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button className="ink-btn" onClick={() => gameRef.current?.resume()} autoFocus>Resume</button>
            <button className="ink-btn ink-btn-alt" onClick={() => gameRef.current?.start()}>Restart</button>
            <button className="ink-btn ink-btn-alt" onClick={() => gameRef.current?.toMenu()}>Main Menu</button>
          </div>
        </Overlay>
      )}

      {(state === "victory" || state === "defeat") && stats && (
        <Overlay>
          <h2 className="ink-title text-[clamp(2rem,6vw,4rem)]">{state === "victory" ? "Knockout!" : "Out of Ink…"}</h2>
          <p className="persian" dir="rtl" lang="fa">{state === "victory" ? "پیروزی!" : "دوباره تلاش کن"}</p>
          <div className="ink-stats">
            <div><span>Time</span><b>{stats.time.toFixed(1)}s</b></div>
            <div><span>Hits taken</span><b>{stats.hitsTaken}</b></div>
            {state === "victory" ? <div><span>Grade</span><b>{stats.grade}</b></div> : <div><span>Boss damaged</span><b>{stats.bossPct}%</b></div>}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button className="ink-btn" onClick={() => gameRef.current?.start()} autoFocus>{state === "victory" ? "Fight Again" : "Restart"}</button>
            <button className="ink-btn ink-btn-alt" onClick={() => gameRef.current?.toMenu()}>Main Menu</button>
          </div>
        </Overlay>
      )}

      {touch && state === "playing" && (
        <div className="touch-layer">
          <div className="flex gap-2">
            <TouchBtn k="left" input={inputRef}>◀</TouchBtn>
            <TouchBtn k="right" input={inputRef}>▶</TouchBtn>
          </div>
          <div className="flex items-end gap-2">
            <TouchBtn k="dash" input={inputRef}>DASH</TouchBtn>
            <TouchBtn k="shoot" input={inputRef}>{activeCharacter === "anby" ? "SLASH" : "FIRE"}</TouchBtn>
            <TouchBtn k="jump" input={inputRef} big>JUMP</TouchBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return <div className="ink-overlay"><div className="ink-card">{children}</div></div>;
}

function TouchBtn({ k, input, children, big }: { k: Key; input: React.MutableRefObject<InputState>; children: ReactNode; big?: boolean }) {
  const set = (v: boolean) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (v) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    input.current[k] = v;
  };
  return (
    <button
      className={big ? "touch-btn touch-btn-big" : "touch-btn"}
      onPointerDown={set(true)} onPointerUp={set(false)} onPointerCancel={set(false)} onLostPointerCapture={() => { input.current[k] = false; }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={String(children)}
    >{children}</button>
  );
}

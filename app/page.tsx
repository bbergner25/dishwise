"use client";
import { useEffect, useRef, useState } from "react";
import App from "../components/App";
import Splash, { SPLASH_KEY } from "../components/Splash";

// On a fresh open the opening screen plays its whole animation (about 2 seconds) and then fades,
// or waits for the app if it's still loading. Reopening within 15 minutes skips it (see Splash).
const PLAY_MS = 2000, FADE_MS = 400;

export default function Page() {
  const [splash, setSplash] = useState<"on" | "leaving" | "gone">("on");
  const ready = useRef(false), played = useRef(false), leaving = useRef(false);
  const leave = () => {
    if (leaving.current || !ready.current || !played.current) return;
    leaving.current = true;
    setSplash("leaving");
    setTimeout(() => setSplash("gone"), FADE_MS);
  };
  useEffect(() => {
    if (document.documentElement.classList.contains("ecs-skip")) { setSplash("gone"); return; }
    try { localStorage.setItem(SPLASH_KEY, String(Date.now())); } catch {}
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => { played.current = true; leave(); }, Math.max(0, (reduce ? 900 : PLAY_MS) - performance.now()));
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onReady = () => { ready.current = true; leave(); };
  return (
    <>
      <App onReady={onReady} />
      {splash !== "gone" && <Splash leaving={splash === "leaving"} />}
    </>
  );
}

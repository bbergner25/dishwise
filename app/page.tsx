"use client";
import { useState } from "react";
import App from "../components/App";
import Splash from "../components/Splash";

// The opening screen waits 0.4s before showing (see Splash). If the app is ready by then, it never
// appears. Once it has appeared, it stays at least ~0.8s so it never blinks on and off.
const SHOW_AFTER = 400, MIN_VISIBLE = 800;

export default function Page() {
  const [splash, setSplash] = useState<"on" | "leaving" | "gone">("on");
  const onReady = () => {
    if (splash !== "on") return;
    const t = typeof performance !== "undefined" ? performance.now() : SHOW_AFTER + MIN_VISIBLE;
    if (t < SHOW_AFTER) { setSplash("gone"); return; }
    const wait = Math.max(0, MIN_VISIBLE - (t - SHOW_AFTER));
    setTimeout(() => { setSplash("leaving"); setTimeout(() => setSplash("gone"), 400); }, wait);
  };
  return (
    <>
      <App onReady={onReady} />
      {splash !== "gone" && <Splash leaving={splash === "leaving"} />}
    </>
  );
}

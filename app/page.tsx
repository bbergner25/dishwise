"use client";
import { useState } from "react";
import App from "../components/App";
import Splash from "../components/Splash";

export default function Page() {
  const [splash, setSplash] = useState<"on" | "leaving" | "gone">("on");
  return (
    <>
      <App onReady={() => { if (splash !== "on") return; setSplash("leaving"); setTimeout(() => setSplash("gone"), 450); }} />
      {splash !== "gone" && <Splash leaving={splash === "leaving"} />}
    </>
  );
}

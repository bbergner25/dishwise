"use client";
// "Report this recipe" on the public share page.
import { useState } from "react";

const REASONS = ["Offensive or inappropriate", "Not a real recipe", "Unsafe or wrong instructions", "Copied without permission", "Something else"];

export default function ShareReport({ slug, title }: { slug: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  if (state === "sent") return <p style={{ marginTop: 10 }}>Thanks, we'll take a look.</p>;
  return (
    <div style={{ marginTop: 10 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#6E635F", textDecoration: "underline", fontSize: 13, cursor: "pointer", fontFamily: "inherit", minHeight: 44 }}>
          Report this recipe
        </button>
      ) : (
        <div role="group" aria-label="Why are you reporting this recipe?" style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 520, margin: "0 auto" }}>
          {REASONS.map((reason) => (
            <button key={reason} disabled={state === "sending"} style={{ minHeight: 40, padding: "0 14px", borderRadius: 20, border: "1px solid #DDD3C5", background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#151210", cursor: "pointer" }}
              onClick={async () => {
                setState("sending");
                await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "share", target: slug, title, reason }) }).catch(() => {});
                setState("sent");
              }}>{reason}</button>
          ))}
        </div>
      )}
    </div>
  );
}

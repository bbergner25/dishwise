"use client";
// The screen behind a household invite link: see who invited you, sign in if needed, join.
import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";

const CSS = `
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#FDFAF5;font-family:'Figtree',sans-serif;color:#151210;-webkit-font-smoothing:antialiased;}
.jh-header{background:#1A1F2E;height:calc(64px + env(safe-area-inset-top,0px));padding-top:env(safe-area-inset-top,0px);display:flex;align-items:center;justify-content:center;}
.jh-wordmark{font-family:'Fraunces',serif;font-size:26px;font-weight:700;letter-spacing:-0.5px;text-decoration:none;}
.jh-wordmark span:first-child{color:#FDFAF5;}
.jh-wordmark span:last-child{color:#F4A021;font-style:italic;margin-left:2px;}
.jh-main{max-width:460px;margin:0 auto;padding:40px 20px 80px;display:flex;flex-direction:column;gap:16px;text-align:center;}
.jh-avatars{display:flex;justify-content:center;margin-bottom:4px;}
.jh-av{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#FDFAF5;font-family:'Fraunces',serif;font-size:28px;font-weight:700;box-shadow:0 0 0 3px #FDFAF5;}
.jh-av+.jh-av{margin-left:-14px;}
h1{font-family:'Fraunces',serif;font-size:28px;line-height:1.15;letter-spacing:-.5px;}
.jh-text{font-size:16px;line-height:1.55;color:#4F4744;}
.jh-card{text-align:left;background:#fff;border:1px solid #ECE6DD;border-radius:18px;padding:16px;font-size:15px;line-height:1.5;color:#4F4744;}
.jh-card b{color:#151210;}
.jh-btn{min-height:52px;border:none;border-radius:26px;background:#F4A021;color:#151210;font-family:'Figtree',sans-serif;font-size:17px;font-weight:600;cursor:pointer;width:100%;}
.jh-btn:disabled{opacity:.6;cursor:progress;}
.jh-btn:focus-visible,.jh-link:focus-visible{outline:3px solid #1A1F2E;outline-offset:2px;}
.jh-link{color:#1A1F2E;font-size:15px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;}
.jh-err{padding:12px 14px;border-radius:14px;background:#FDECE6;border:1px solid #F3C3B3;color:#8A2A0E;font-size:15px;text-align:left;}
`;
const COLORS = ["#1A1F2E", "#B5651D", "#2F6B3A", "#6B4E9B", "#B03A48"];

export default function JoinHousehold({ token }: { token: string }) {
  const { user, isLoaded } = useUser();
  const { openSignIn } = useClerk();
  const [info, setInfo] = useState<{ valid: boolean; inviter?: string; members?: string[]; full?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    // remember the invite, so it still goes through if signing up lands them somewhere else
    try { localStorage.setItem("dw-pending-invite", token); } catch {}
    fetch(`/api/household?invite=${encodeURIComponent(token)}`).then((r) => r.json()).then(setInfo).catch(() => setInfo({ valid: false }));
  }, [token]);

  const join = async () => {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/household", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join", token }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't join just now.");
      try { sessionStorage.setItem("dw-open-tab", "week"); localStorage.removeItem("dw-pending-invite"); } catch {}
      window.location.href = "/";
    } catch (e: any) { setErr(e.message || "Couldn't join just now. Try again."); setBusy(false); }
  };

  const inviter = info?.inviter || "Someone";
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="jh-header"><a href="/" className="jh-wordmark" aria-label="Every Chef home"><span>every</span><span>chef</span></a></header>
      <main className="jh-main">
        {!info ? <p className="jh-text" aria-live="polite">Loading your invite…</p> : !info.valid ? (
          <>
            <h1>This invite has expired</h1>
            <p className="jh-text">Invite links last two weeks. Ask whoever sent it for a new one.</p>
            <a className="jh-link" href="/">Go to Every Chef</a>
          </>
        ) : (
          <>
            <div className="jh-avatars" aria-hidden="true">
              {(info.members || []).slice(0, 4).map((m, i) => <span key={i} className="jh-av" style={{ background: COLORS[i % COLORS.length] }}>{m[0]?.toUpperCase()}</span>)}
            </div>
            <h1>{inviter} invited you to plan meals together</h1>
            <p className="jh-text">You'll share a meal plan and a grocery list{(info.members || []).length > 1 ? ` with ${(info.members || []).join(", ")}` : ` with ${inviter}`}. Your saved recipes stay yours, and you'll see each other's in Library under Household.</p>
            <div className="jh-card"><b>Already have meals planned?</b> They come with you. If someone already has a meal on that day, yours is added as a side so nothing gets lost.</div>
            {err && <p className="jh-err" role="alert">{err}</p>}
            {info.full ? <p className="jh-err">This household is full.</p> : !isLoaded ? null : user ? (
              <button className="jh-btn" onClick={join} disabled={busy}>{busy ? "Joining…" : `Join ${inviter}'s household`}</button>
            ) : (
              <>
                <button className="jh-btn" onClick={() => { const back = typeof window !== "undefined" ? window.location.href : undefined; openSignIn({ forceRedirectUrl: back, signUpForceRedirectUrl: back }); }}>Sign in or create an account</button>
                <p className="jh-text" style={{ fontSize: 14 }}>It's free. You need an account so only your household can see your plan.</p>
              </>
            )}
            <a className="jh-link" href="/">Not now</a>
          </>
        )}
      </main>
    </>
  );
}

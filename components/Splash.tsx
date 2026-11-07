// Opening screen, like a native app's: on a fresh open it plays once (tiles pop in, then the
// logo, about 2.4 seconds) and then fades into the app. Coming back to the app within 15 minutes
// skips it, since nothing needs to load.
export const SPLASH_KEY = "ec-splash-at";
export const SPLASH_SKIP_MS = 15 * 60 * 1000;

const CSS = `
#ec-splash{position:fixed;inset:0;z-index:10000;background:#1A1F2E;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;transition:opacity .4s ease;}
.ecs-skip #ec-splash{display:none}
#ec-splash.out{opacity:0;pointer-events:none;}
.ecs-grid{display:grid;grid-template-columns:repeat(2,min(38vw,170px));gap:14px;}
.ecs-tile{width:min(38vw,170px);height:min(38vw,170px);border-radius:24px;overflow:hidden;background:#2A3042;box-shadow:0 10px 30px rgba(0,0,0,.35);opacity:0;animation:ecs-pop .55s cubic-bezier(.2,.8,.3,1.2) forwards;}
.ecs-tile{animation-delay:.15s}.ecs-tile:nth-child(2){animation-delay:.3s}.ecs-tile:nth-child(3){animation-delay:.45s}.ecs-tile:nth-child(4){animation-delay:.6s}
.ecs-tile img{width:100%;height:100%;object-fit:cover;display:block}
.ecs-wm{width:244px;height:auto;opacity:0;animation:ecs-rise .55s .85s ease-out forwards}
@keyframes ecs-pop{from{opacity:0;transform:scale(.8) rotate(-4deg)}to{opacity:1;transform:none}}
@keyframes ecs-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.ecs-tile,.ecs-wm{animation:none;opacity:1}}`;

// Runs before the page paints: skip the opening screen if it played in the last 15 minutes
const SKIP = `try{var t=+localStorage.getItem("${SPLASH_KEY}")||0;if(Date.now()-t<${SPLASH_SKIP_MS})document.documentElement.classList.add("ecs-skip")}catch(e){}`;

export default function Splash({ leaving }: { leaving: boolean }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SKIP }} />
      <div id="ec-splash" className={leaving ? "out" : ""} role="status" aria-label="Every Chef is loading">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="ecs-grid" aria-hidden="true">
          <div className="ecs-tile"><img src="/splash/dish1.webp" alt="" width={170} height={170} /></div>
          <div className="ecs-tile"><img src="/splash/dish2.webp" alt="" width={170} height={170} /></div>
          <div className="ecs-tile"><img src="/splash/dish3.webp" alt="" width={170} height={170} /></div>
          <div className="ecs-tile"><img src="/splash/e.webp" alt="" width={170} height={170} /></div>
        </div>
        <img className="ecs-wm" src="/splash/wordmark.webp" alt="Every Chef" width={244} height={70} />
      </div>
    </>
  );
}

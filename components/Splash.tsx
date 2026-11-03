// Opening screen: shown instantly (it's in the first HTML the phone receives) while the app loads,
// then fades away the moment the app is ready. It never makes anyone wait longer than loading takes.
const CSS = `
#ec-splash{position:fixed;inset:0;z-index:10000;background:#1A1F2E;opacity:0;animation:ecs-in .25s .4s forwards;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;transition:opacity .4s ease;}
#ec-splash.out{opacity:0!important;animation:none;pointer-events:none;}
.ecs-grid{display:grid;grid-template-columns:repeat(2,min(38vw,170px));gap:14px;}
.ecs-tile{width:min(38vw,170px);height:min(38vw,170px);border-radius:24px;overflow:hidden;background:#2A3042;box-shadow:0 10px 30px rgba(0,0,0,.35);opacity:0;animation:ecs-pop .55s cubic-bezier(.2,.8,.3,1.2) forwards;}
.ecs-tile{animation-delay:.45s}.ecs-tile:nth-child(2){animation-delay:.57s}.ecs-tile:nth-child(3){animation-delay:.69s}.ecs-tile:nth-child(4){animation-delay:.81s}
.ecs-tile img{width:100%;height:100%;object-fit:cover;display:block}
.ecs-wm{width:244px;height:auto;opacity:0;animation:ecs-rise .5s .95s ease-out forwards}
.ecs-lines{position:relative;height:20px;width:100%;opacity:0;animation:ecs-in .4s 1.9s forwards;font-family:'Figtree',system-ui,sans-serif;font-size:14px;color:#8F8A84;text-align:center}
.ecs-lines span{position:absolute;left:0;right:0;opacity:0;animation:ecs-line 9s 1.9s infinite}
.ecs-lines span:nth-child(2){animation-delay:4.9s}.ecs-lines span:nth-child(3){animation-delay:7.9s}
@keyframes ecs-pop{from{opacity:0;transform:scale(.8) rotate(-4deg)}to{opacity:1;transform:none}}
@keyframes ecs-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes ecs-in{to{opacity:1}}
@keyframes ecs-line{0%{opacity:0;transform:translateY(6px)}6%,28%{opacity:1;transform:none}34%,100%{opacity:0;transform:translateY(-6px)}}
@media (prefers-reduced-motion:reduce){#ec-splash{animation:ecs-in .01s .4s forwards}.ecs-tile,.ecs-wm{animation:none;opacity:1}.ecs-lines span{animation:none}.ecs-lines span:first-child{opacity:1}}
`;

export default function Splash({ leaving }: { leaving: boolean }) {
  return (
    <div id="ec-splash" className={leaving ? "out" : ""} role="status" aria-label="Every Chef is loading">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ecs-grid" aria-hidden="true">
        <div className="ecs-tile"><img src="/splash/dish1.webp" alt="" width={170} height={170} /></div>
        <div className="ecs-tile"><img src="/splash/dish2.webp" alt="" width={170} height={170} /></div>
        <div className="ecs-tile"><img src="/splash/dish3.webp" alt="" width={170} height={170} /></div>
        <div className="ecs-tile"><img src="/splash/e.webp" alt="" width={170} height={170} /></div>
      </div>
      <img className="ecs-wm" src="/splash/wordmark.webp" alt="Every Chef" width={244} height={70} />
      <div className="ecs-lines" aria-hidden="true"><span>Preheating the oven…</span><span>Sharpening the knives…</span><span>Tasting for salt…</span></div>
    </div>
  );
}

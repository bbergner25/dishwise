// Shared look for the simple text pages (privacy, terms, support).
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "";

export function Contact() {
  return SUPPORT_EMAIL
    ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
    : <span>the contact email on our App Store listing</span>;
}

export default function InfoPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html:`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#FDFAF5;font-family:'Figtree',sans-serif;color:#151210;-webkit-font-smoothing:antialiased;}
        .ip-header{background:#1A1F2E;height:calc(64px + env(safe-area-inset-top,0px));padding-top:env(safe-area-inset-top,0px);display:flex;align-items:center;justify-content:center;}
        .ip-wordmark{font-family:'Fraunces',serif;font-size:26px;font-weight:700;letter-spacing:-0.5px;line-height:1;text-decoration:none;}
        .ip-wordmark span:first-child{color:#FDFAF5;}
        .ip-wordmark span:last-child{color:#F4A021;font-style:italic;margin-left:2px;}
        .ip-main{max-width:720px;margin:0 auto;padding:32px 20px 80px;}
        .ip-main h1{font-family:'Fraunces',serif;font-size:36px;line-height:1.08;letter-spacing:-.6px;margin-bottom:6px;}
        .ip-updated{font-size:14px;color:#6E635F;margin-bottom:28px;}
        .ip-main h2{font-family:'Fraunces',serif;font-size:22px;margin:30px 0 8px;}
        .ip-main p,.ip-main li{font-size:16px;line-height:1.6;color:#2E2926;}
        .ip-main p{margin-bottom:12px;}
        .ip-main ul{margin:0 0 12px 22px;}
        .ip-main li{margin-bottom:6px;}
        .ip-main a{color:#1A1F2E;}
        .ip-back{display:inline-flex;align-items:center;min-height:44px;margin-top:28px;font-weight:600;}
      `}}/>
      <header className="ip-header"><a href="/" className="ip-wordmark" aria-label="Every Chef home"><span>every</span><span>chef</span></a></header>
      <main className="ip-main">
        <h1>{title}</h1>
        {updated && <p className="ip-updated">Last updated {updated}</p>}
        {children}
        <a className="ip-back" href="/">← Back to Every Chef</a>
      </main>
    </>
  );
}

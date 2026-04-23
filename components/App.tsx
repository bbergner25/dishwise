"use client";
import { useState, useEffect, useRef } from "react";

const C = {
  cream:"#FDFAF5",parchment:"#FFF0D4",brown:"#151210",
  terra:"#F4A021",sage:"#1E3A2F",muted:"#7A6E6A",
  white:"#FFFFFF",border:"#EDE8E0",overlay:"rgba(61,43,31,0.45)",
  green:"#4a6040",greenLight:"#F0F5EE",greenBorder:"#b5c9a8",
};

// Thin-stroke SVG outline icons — 1.5px stroke, no fill
const Ic = {
  search:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  inspire:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  heart:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  heartFill:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  calendar:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  family:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  leaf:(s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
  camera:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  printer:(s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  cart:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  target:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  home:(s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  arrowLeft:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  pin:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  link:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  photo:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Outfit',sans-serif;background:#FDFAF5;color:#151210;min-height:100vh;padding-bottom:80px;}
  @media(min-width:768px){body{padding-bottom:0;}}

  /* ── TOP NAV (desktop) ── */
  .nav{display:none;}
  @media(min-width:768px){
    .nav{display:flex;align-items:center;justify-content:space-between;padding:0 32px;height:60px;border-bottom:1px solid #EDE8E0;background:#FDFAF5;position:sticky;top:0;z-index:100;}
    .nav-brand{background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:0;}
    .nav-brand-text{display:flex;flex-direction:column;line-height:1.1;align-items:flex-start;}
    .nav-brand-name{font-family:'Fraunces',serif;font-size:17px;font-weight:700;color:#151210;letter-spacing:-0.3px;line-height:1.1;}
    .nav-brand-sub{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#7A6E6A;font-family:'Outfit',sans-serif;font-weight:400;margin-top:2px;}
    .nav-tabs{display:flex;gap:4px;}
    .nav-tab{padding:7px 16px;border-radius:100px;border:none;background:transparent;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;color:#7A6E6A;cursor:pointer;transition:all .15s;position:relative;}
    .nav-tab.active{background:#151210;color:#fff;}
    .nav-tab:not(.active):hover{background:#FFF0D4;color:#151210;}
    .nav-badge{position:absolute;top:3px;right:5px;background:#F4A021;color:#fff;font-size:9px;font-weight:700;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
  }

  /* ── BOTTOM NAV (mobile) ── */
  .bottom-nav{
    display:flex;position:fixed;bottom:0;left:0;right:0;z-index:100;
    background:#fff;border-top:2px solid #151210;
    padding:0 16px env(safe-area-inset-bottom,0px);
    height:68px;align-items:stretch;
  }
  @media(min-width:768px){.bottom-nav{display:none;}}
  .bottom-nav-brand{
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:6px 8px 4px;background:none;border:none;cursor:pointer;
    font-family:'Outfit',sans-serif;font-size:9px;font-weight:500;
    letter-spacing:1.5px;text-transform:uppercase;color:#151210;flex:1.2;gap:3px;
  }
  .bottom-nav-brand .bnb-icon{display:flex;align-items:center;}
  .bottom-tab{
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:8px 4px 4px;background:none;border:none;cursor:pointer;
    font-family:'Outfit',sans-serif;font-size:10px;font-weight:500;
    color:#7A6E6A;flex:1;gap:3px;position:relative;transition:color .15s;
  }
  .bottom-tab.active{color:#151210;}
  .bottom-tab .bt-icon{font-size:20px;line-height:1;}
  .bottom-tab .bt-label{font-size:10px;line-height:1;}
  .bottom-tab .nav-badge{position:absolute;top:6px;right:calc(50% - 18px);background:#F4A021;color:#fff;font-size:8px;font-weight:700;width:13px;height:13px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
  .nav-badge{position:absolute;top:3px;right:5px;background:#F4A021;color:#fff;font-size:9px;font-weight:700;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;}

  /* ── HERO — Every Chef ── */
  .hero{position:relative;overflow:hidden;padding:56px 24px 44px;text-align:center;background:#fff;border-bottom:1px solid #EDE8E0;}
  @media(max-width:640px){.hero{padding:44px 20px 36px;}}
  .hero-particles{position:absolute;inset:0;pointer-events:none;overflow:hidden;}
  .hero-particle{position:absolute;border-radius:50%;animation:particleRise linear infinite;}
  @keyframes particleRise{
    0%{transform:translateY(0) translateX(0);opacity:0;}
    10%{opacity:1;}
    90%{opacity:.6;}
    100%{transform:translateY(-340px) translateX(var(--pdrift,0px));opacity:0;}
  }
  .hero-smoke{position:absolute;border-radius:50%;animation:smokeRise ease-out infinite;}
  @keyframes smokeRise{
    0%{transform:translateY(0) scale(.6);opacity:.18;}
    40%{opacity:.1;}
    100%{transform:translateY(-220px) scale(2.8);opacity:0;}
  }
  .hero-content{position:relative;z-index:2;max-width:560px;margin:0 auto;}
  .hero-eyebrow{display:inline-flex;align-items:center;gap:8px;background:#FFF0D4;border:1px solid #F4A021;border-radius:100px;padding:5px 14px;font-size:11px;font-weight:600;color:#151210;letter-spacing:.5px;margin-bottom:20px;text-transform:none;}
  .hero-eyebrow::before{content:"";width:6px;height:6px;border-radius:50%;background:#F4A021;animation:eyebrowPulse 2s ease-in-out infinite;}
  @keyframes eyebrowPulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.4);opacity:.6;}}
  .hero-title{font-family:'Fraunces',serif;font-size:clamp(34px,6vw,56px);line-height:1.05;margin-bottom:0;color:#151210;font-weight:700;letter-spacing:-0.5px;}
  .hero-title em{color:#F4A021;font-style:italic;position:relative;}
  .hero-rule-wrap{display:none;}
  .hero-sub{font-size:15px;color:#7A6E6A;font-weight:300;line-height:1.6;max-width:480px;margin:16px auto 24px;}
  .hero-sub strong{color:#151210;font-weight:600;}
  .search-wrap{max-width:520px;margin:0 auto;}
  .search-bar{display:flex;background:#fff;border:1px solid #EDE8E0;border-radius:100px;overflow:hidden;box-shadow:0 2px 16px rgba(61,43,31,.06);transition:box-shadow .2s,border-color .2s;}
  .search-bar:focus-within{box-shadow:0 4px 24px rgba(61,43,31,.12);border-color:#151210;}
  .search-input{flex:1;border:none;outline:none;padding:14px 22px;font-family:'Outfit',sans-serif;font-size:15px;color:#151210;background:transparent;}
  .search-input::placeholder{color:#7A6E6A;}
  .search-btn{margin:5px;padding:10px 22px;background:#151210;color:#FDFAF5;border:none;border-radius:100px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:background .15s;white-space:nowrap;}
  .search-btn:hover:not(:disabled){background:#2D5A42;}
  .search-btn:disabled{background:#7A6E6A;cursor:not-allowed;}

  /* Filters */
  .filter-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7A6E6A;margin:16px 0 8px;text-align:center;}
  .diet-filters{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;}
  .diet-chip{padding:5px 13px;border-radius:100px;border:1px solid #EDE8E0;background:transparent;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;color:#7A6E6A;cursor:pointer;transition:all .15s;}
  .diet-chip.on{background:#1E3A2F;border-color:#1E3A2F;color:#fff;}
  .seasonal-row{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px;flex-wrap:wrap;}
  .seasonal-chip{padding:5px 13px;border-radius:100px;border:1.5px solid #1E3A2F;background:transparent;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;color:#1E3A2F;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px;}
  .seasonal-chip.on{background:#1E3A2F;color:#fff;}
  .location-wrap{display:flex;align-items:center;gap:6px;}
  .location-input{padding:5px 12px;border:1px solid #EDE8E0;border-radius:100px;font-family:'Outfit',sans-serif;font-size:12px;color:#151210;outline:none;width:160px;}
  .location-input:focus{border-color:#1E3A2F;}
  .location-detect{padding:5px 10px;border:1px solid #EDE8E0;border-radius:100px;background:transparent;font-size:11px;cursor:pointer;color:#7A6E6A;white-space:nowrap;}

  /* ── MOSAIC CARDS ── */
  .mosaic-section{padding:20px 20px 8px;max-width:900px;margin:0 auto;}
  @media(min-width:768px){.mosaic-section{padding:24px 28px 8px;}}
  .mosaic-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#7A6E6A;margin-bottom:12px;text-align:center;}
  .mosaic-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
  @media(max-width:640px){.mosaic-grid{grid-template-columns:repeat(2,1fr);gap:8px;}}
  .mosaic-card{border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .15s,box-shadow .15s;border:1px solid transparent;}
  .mosaic-card.card-light{border-color:#EDE8E0;}
  .mosaic-card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(61,43,31,.14);}
  .mosaic-card-inner{padding:16px 14px 14px;}
  .mosaic-card-eyebrow-dark{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(196,149,106,.65);margin-bottom:6px;}
  .mosaic-card-eyebrow-light{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#7A6E6A;margin-bottom:6px;}
  .mosaic-card-title-dark{font-family:'Fraunces',serif;font-size:14px;line-height:1.25;color:#FFF0D4;margin-bottom:4px;font-weight:700;}
  .mosaic-card-title-light{font-family:'Fraunces',serif;font-size:14px;line-height:1.25;color:#151210;margin-bottom:4px;font-weight:700;}
  .mosaic-card-desc-dark{font-size:10px;color:rgba(245,237,216,.5);line-height:1.4;margin-bottom:6px;}
  .mosaic-card-desc-light{font-size:10px;color:#7A6E6A;line-height:1.4;margin-bottom:6px;}
  .mosaic-card-time-dark{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:rgba(196,149,106,.55);}
  .mosaic-card-time-light{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#B8A898;}

  .suggestions{display:none;}
  .suggestion-chip{display:none;}

  /* URL import */
  .url-area{max-width:560px;margin:12px auto 0;background:#fff;border:1px solid #EDE8E0;border-radius:16px;padding:20px;}
  .url-label{font-family:'Fraunces',serif;font-size:16px;margin-bottom:5px;color:#151210;}
  .url-sub{font-size:12px;color:#7A6E6A;margin-bottom:14px;line-height:1.5;}
  .url-row{display:flex;gap:8px;}
  .url-input{flex:1;padding:10px 16px;border:1px solid #EDE8E0;border-radius:100px;font-family:'Outfit',sans-serif;font-size:13px;color:#151210;outline:none;transition:border-color .15s;}
  .url-input:focus{border-color:#151210;}
  .url-input::placeholder{color:#7A6E6A;}
  .url-btn{padding:10px 18px;background:#151210;color:#FDFAF5;border:none;border-radius:100px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background .15s;}
  .url-btn:hover:not(:disabled){background:#2D5A42;}
  .url-btn:disabled{background:#7A6E6A;cursor:not-allowed;}
  .url-note{font-size:11px;color:#7A6E6A;margin-top:10px;line-height:1.5;}
  .url-success{padding:10px 14px;background:#F0F5EE;border:1px solid #1E3A2F;border-radius:10px;font-size:13px;color:#4a6040;margin-top:10px;}
  .url-error{font-size:12px;color:#F4A021;margin-top:8px;}

  /* Scan */
  .scan-divider{display:flex;align-items:center;gap:12px;margin:24px auto 0;max-width:560px;}
  .scan-divider-line{flex:1;height:1px;background:#EDE8E0;}
  .scan-divider-text{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7A6E6A;white-space:nowrap;}
  .scan-area{max-width:560px;margin:12px auto 0;background:#fff;border:1.5px dashed #EDE8E0;border-radius:16px;padding:20px;text-align:center;}
  .scan-icon{font-size:28px;margin-bottom:8px;}
  .scan-label{font-family:'Fraunces',serif;font-size:16px;margin-bottom:6px;}
  .scan-sub{font-size:12px;color:#7A6E6A;margin-bottom:14px;}
  .scan-upload-btn{padding:8px 20px;background:#151210;color:#fff;border:none;border-radius:100px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;}
  .scan-preview{width:100%;max-height:200px;object-fit:contain;border-radius:10px;margin-bottom:12px;border:1px solid #EDE8E0;}
  .scan-actions{display:flex;gap:10px;justify-content:center;}
  .scan-go-btn{padding:8px 22px;background:#F4A021;color:#fff;border:none;border-radius:100px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;}
  .scan-go-btn:disabled{background:#7A6E6A;cursor:not-allowed;}
  .scan-clear-btn{padding:8px 16px;background:none;color:#7A6E6A;border:1px solid #EDE8E0;border-radius:100px;font-family:'Outfit',sans-serif;font-size:13px;cursor:pointer;}
  .scan-success{padding:10px 14px;background:#F0F5EE;border:1px solid #1E3A2F;border-radius:10px;font-size:13px;color:#4a6040;margin-top:10px;}

  /* Loading */
  .loading-wrap{text-align:center;padding:80px 24px;}
  .spinner{width:36px;height:36px;border:2.5px solid #EDE8E0;border-top-color:#F4A021;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 20px;}
  @keyframes spin{to{transform:rotate(360deg);}}
  .loading-text{font-family:'Fraunces',serif;font-size:17px;font-style:italic;}
  .loading-sub{font-size:13px;color:#7A6E6A;margin-top:8px;}

  /* ── PREMIUM RECIPE PAGE ── */
  .recipe-page{max-width:860px;margin:0 auto;padding:0 0 80px;}

  /* Recipe banner — forest green */
  .recipe-banner{
    background:#1E3A2F;
    padding:28px 36px 22px;
    text-align:center;
    position:relative;
    border-radius:20px;
    overflow:hidden;
    margin:20px auto 0;
    max-width:920px;
  }
  .recipe-banner::before{content:"";position:absolute;top:-60px;right:-60px;width:240px;height:240px;border-radius:50%;background:rgba(244,160,33,.08);pointer-events:none;}
  .recipe-banner::after{content:"";position:absolute;bottom:-40px;left:120px;width:160px;height:160px;border-radius:50%;background:rgba(244,160,33,.05);pointer-events:none;}
  .recipe-banner > *{position:relative;z-index:1;}
  @media(max-width:640px){.recipe-banner{padding:22px 22px 18px;margin:12px 12px 0;border-radius:16px;}}
  .recipe-banner-eyebrow{
    font-size:9px;letter-spacing:3px;text-transform:uppercase;
    color:#F4A021;margin-bottom:8px;font-weight:500;opacity:.7;
  }
  .recipe-banner-title{
    font-family:'Fraunces',serif;
    font-size:clamp(22px,3.5vw,34px);
    line-height:1.15;
    color:#FFF0D4;
    margin-bottom:8px;
    font-weight:700;
  }
  .recipe-banner-title em{color:#F4A021;font-style:italic;}
  .recipe-banner-desc{
    font-size:13px;color:rgba(245,237,216,.55);
    line-height:1.6;max-width:480px;margin:0 auto 16px;font-weight:300;
  }
  .recipe-banner-meta{
    display:flex;gap:0;justify-content:center;flex-wrap:wrap;
    border-top:1px solid rgba(196,149,106,.2);
    padding-top:14px;margin-top:4px;
  }
  .recipe-banner-meta-item{
    text-align:center;padding:0 24px;
    border-right:1px solid rgba(196,149,106,.2);
  }
  .recipe-banner-meta-item:last-child{border-right:none;}
  .recipe-banner-meta-label{
    font-size:9px;letter-spacing:2px;text-transform:uppercase;
    color:rgba(196,149,106,.7);margin-bottom:5px;font-weight:500;
  }
  .recipe-banner-meta-value{
    font-family:'Fraunces',serif;font-size:16px;color:#FFF0D4;
  }
  .recipe-banner-actions{
    position:absolute;top:20px;right:20px;display:flex;gap:8px;
  }
  .save-btn{background:rgba(255,255,255,.1);border:1px solid rgba(196,149,106,.4);border-radius:100px;padding:6px 14px;font-family:'Outfit',sans-serif;font-size:12px;cursor:pointer;color:#F4A021;display:flex;align-items:center;gap:5px;transition:all .15s;backdrop-filter:blur(4px);}
  .save-btn:hover{background:rgba(196,149,106,.2);border-color:#F4A021;}
  .save-btn.saved{background:#F4A021;border-color:#F4A021;color:#fff;}
  .print-btn{background:rgba(255,255,255,.1);border:1px solid rgba(196,149,106,.4);border-radius:100px;padding:6px 14px;font-family:'Outfit',sans-serif;font-size:12px;cursor:pointer;color:#F4A021;display:flex;align-items:center;gap:5px;transition:all .15s;backdrop-filter:blur(4px);}
  .print-btn:hover{background:rgba(196,149,106,.2);}
  .seasonal-note{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;background:rgba(122,140,110,.2);border:1px solid rgba(122,140,110,.4);border-radius:100px;font-size:12px;color:#a8c49a;margin-bottom:16px;}

  /* Serving scaler — on banner */
  .scaler{display:inline-flex;align-items:center;border:1px solid rgba(196,149,106,.3);border-radius:100px;overflow:hidden;margin:0 auto;}
  .scaler-btn{width:32px;height:32px;border:none;background:rgba(255,255,255,.08);font-size:15px;cursor:pointer;color:#F4A021;display:flex;align-items:center;justify-content:center;transition:background .12s;}
  .scaler-btn:hover{background:rgba(196,149,106,.2);}
  .scaler-val{padding:0 12px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;color:#FFF0D4;white-space:nowrap;}
  .scaler-wrap{display:flex;flex-direction:column;align-items:center;gap:5px;}
  .scaler-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(196,149,106,.7);font-weight:500;}

  /* Recipe body */
  .recipe-body{padding:36px 32px 0;}
  @media(max-width:640px){.recipe-body{padding:28px 20px 0;}}

  /* Ingredients */
  .two-col{display:grid;grid-template-columns:260px 1fr;gap:48px;align-items:start;}
  @media(max-width:640px){.two-col{grid-template-columns:1fr;gap:32px;}}
  .section-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#F4A021;margin-bottom:16px;font-weight:500;}
  .ing-group{margin-bottom:20px;}
  .ing-group:last-child{margin-bottom:0;}
  .ing-group-label{
    font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;
    letter-spacing:1.5px;text-transform:uppercase;
    color:#151210;padding:7px 0 6px;
    border-bottom:2px solid #151210;margin-bottom:2px;
  }
  .ing-list{list-style:none;}
  .ing-item{display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #EDE8E0;font-size:14px;line-height:1.4;}
  .ing-item:last-child{border-bottom:none;}
  .ing-dot{width:4px;height:4px;border-radius:50%;background:#F4A021;flex-shrink:0;}
  .ing-text{flex:1;}
  .ing-amount{font-weight:600;color:#151210;}
  .ing-name{color:#6B5A4E;}
  .ing-shop-links{display:flex;gap:4px;flex-shrink:0;}
  .ing-shop-link{font-size:10px;padding:2px 7px;border-radius:100px;text-decoration:none;border:1px solid #EDE8E0;color:#7A6E6A;transition:all .12s;}
  .ing-shop-link:hover{border-color:#0071CE;color:#0071CE;}
  .ing-shop-link.tg:hover{border-color:#CC0000;color:#CC0000;}

  /* Steps — premium numbered */
  .steps-list{list-style:none;}
  .step-item{display:flex;gap:20px;margin-bottom:28px;align-items:flex-start;}
  .step-num{
    font-family:'Fraunces',serif;
    font-size:13px;font-weight:700;
    color:#FDFAF5;background:#151210;
    width:28px;height:28px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    flex-shrink:0;margin-top:2px;letter-spacing:0;
  }
  .step-text{font-size:15px;line-height:1.75;font-weight:300;color:#151210;padding-top:3px;}

  /* Grocery */
  .grocery-section{margin-top:40px;padding-top:32px;border-top:1px solid #EDE8E0;}
  .grocery-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
  .grocery-title{font-family:'Fraunces',serif;font-size:20px;}
  .shop-btns{display:flex;gap:8px;flex-wrap:wrap;}
  .shop-btn{padding:7px 14px;border-radius:100px;border:none;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;cursor:pointer;text-decoration:none;transition:all .12s;display:inline-flex;align-items:center;gap:4px;color:#fff;}
  .btn-wm{background:#0071CE;}.btn-wm:hover{background:#005AA6;}
  .btn-tg{background:#CC0000;}.btn-tg:hover{background:#AA0000;}
  .grocery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;}
  .grocery-card{background:#fff;border:1px solid #EDE8E0;border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:8px;}
  .grocery-check{width:15px;height:15px;border-radius:4px;border:1.5px solid #EDE8E0;background:#fff;flex-shrink:0;cursor:pointer;appearance:none;transition:all .12s;}
  .grocery-check:checked{background:#1E3A2F;border-color:#1E3A2F;}
  .grocery-item-wrap{flex:1;min-width:0;}
  .grocery-name{font-size:12px;line-height:1.3;}
  .grocery-shop-links{display:flex;gap:4px;margin-top:3px;}
  .grocery-shop-link{font-size:10px;padding:1px 6px;border-radius:100px;text-decoration:none;border:1px solid #EDE8E0;color:#7A6E6A;transition:all .12s;}
  .grocery-shop-link:hover{border-color:#0071CE;color:#0071CE;}
  .grocery-shop-link.tg:hover{border-color:#CC0000;color:#CC0000;}

  /* Remix — saffron card */
  .remix-section{margin:20px auto 0;max-width:920px;padding:18px 22px 20px;background:#FFF0D4;border:1.5px solid #F4A021;border-radius:16px;}
  @media(max-width:640px){.remix-section{margin:12px 12px 0;padding:16px 18px 18px;border-radius:14px;}}
  .remix-label{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#3D3330;margin-bottom:12px;font-weight:700;display:flex;align-items:center;gap:8px;}
  .remix-chips{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-bottom:14px;}
  .remix-chip{padding:6px 14px;border-radius:100px;border:1.5px solid #D4CCC0;background:#fff;font-family:'Outfit',sans-serif;font-size:12px;color:#3D3330;font-weight:500;cursor:pointer;transition:all .15s;}
  .remix-chip:hover{border-color:#151210;color:#151210;}
  .remix-chip.active{background:#151210;border-color:#151210;color:#fff;}
  .remix-go{padding:9px 24px;background:#E8431A;color:#fff;border:none;border-radius:100px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;display:block;margin:0 auto;}
  .remix-go:hover:not(:disabled){background:#C63714;}
  .remix-go:disabled{background:#D4CCC0;cursor:not-allowed;color:#7A6E6A;}
  .remix-loading{font-size:13px;color:#7A6E6A;font-style:italic;margin-top:10px;text-align:center;}

  /* Retailer picker */
  .retailer-wrap{position:relative;display:inline-block;}
  .retailer-btn{padding:7px 14px;border-radius:100px;border:none;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#151210;color:#FDFAF5;transition:background .15s;}
  .retailer-btn:hover{background:#2D5A42;}
  .retailer-dropdown{position:absolute;top:calc(100% + 6px);right:0;background:#fff;border:1px solid #EDE8E0;border-radius:12px;padding:6px;min-width:180px;box-shadow:0 8px 24px rgba(61,43,31,.12);z-index:50;}
  .retailer-option{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;color:#151210;transition:background .12s;border:none;background:transparent;width:100%;text-align:left;}
  .retailer-option:hover{background:#FFF0D4;}
  .retailer-option.active{background:#FDFAF5;font-weight:500;}
  .retailer-option-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

  /* Sources */
  .source-section{margin-top:28px;padding-top:24px;border-top:1px solid #EDE8E0;}
  .source-section-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7A6E6A;margin-bottom:10px;font-weight:500;}
  .source-links{display:flex;flex-wrap:wrap;gap:8px;}
  .source-link{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border:1px solid #EDE8E0;border-radius:100px;font-family:'Outfit',sans-serif;font-size:12px;color:#7A6E6A;text-decoration:none;transition:all .15s;background:#fff;}
  .source-link:hover{border-color:#F4A021;color:#F4A021;}
  .source-note{margin-top:12px;font-size:12px;color:#7A6E6A;line-height:1.6;font-style:italic;}
  .back-btn{display:inline-flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;color:#F4A021;padding:0;margin:32px 0 0;text-decoration:underline;text-underline-offset:3px;}

  /* Pages */
  .page{max-width:900px;margin:0 auto;padding:36px 24px 40px;}
  .page-title{font-family:'Fraunces',serif;font-size:clamp(22px,4vw,34px);margin-bottom:8px;}
  .page-sub{font-size:14px;color:#7A6E6A;margin-bottom:28px;}
  .empty-state{text-align:center;padding:60px 24px;color:#7A6E6A;font-size:15px;line-height:1.6;}
  .empty-state h3{font-family:'Fraunces',serif;color:#151210;font-size:22px;margin-bottom:10px;}
  .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;}
  .recipe-card{background:#fff;border:1px solid #EDE8E0;border-radius:14px;padding:18px;cursor:pointer;transition:all .15s;}
  .recipe-card:hover{box-shadow:0 6px 24px rgba(61,43,31,.1);transform:translateY(-2px);border-color:#F4A021;}
  .card-tag{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#1E3A2F;margin-bottom:7px;}
  .card-title{font-family:'Fraunces',serif;font-size:16px;line-height:1.3;margin-bottom:7px;}
  .card-desc{font-size:12px;color:#7A6E6A;line-height:1.5;margin-bottom:12px;}
  .card-meta{display:flex;gap:10px;font-size:11px;color:#7A6E6A;flex-wrap:wrap;}
  .card-actions{display:flex;gap:7px;margin-top:12px;padding-top:12px;border-top:1px solid #EDE8E0;}
  .card-btn{flex:1;padding:6px;border-radius:8px;border:1px solid #EDE8E0;background:transparent;font-family:'Outfit',sans-serif;font-size:11px;font-weight:500;cursor:pointer;transition:all .12s;color:#7A6E6A;}
  .card-btn:hover{background:#FFF0D4;color:#151210;}
  .card-btn.danger:hover{background:#FEE;color:#C00;border-color:#C00;}

  /* Week */
  .week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;}
  @media(max-width:700px){.week-grid{grid-template-columns:repeat(2,1fr);}}
  .day-card{border:1px solid #EDE8E0;border-radius:12px;background:#fff;min-height:130px;display:flex;flex-direction:column;overflow:hidden;}
  .day-head{padding:8px 10px;border-bottom:1px solid #EDE8E0;background:#FDFAF5;}
  .day-name{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7A6E6A;font-weight:500;}
  .day-body{flex:1;padding:8px 10px;display:flex;flex-direction:column;}
  .day-recipe-title{font-family:'Fraunces',serif;font-size:12px;line-height:1.3;margin-bottom:4px;}
  .day-recipe-meta{font-size:10px;color:#7A6E6A;}
  .day-actions{display:flex;gap:5px;margin-top:8px;}
  .day-btn{flex:1;padding:4px;border-radius:6px;border:1px solid #EDE8E0;background:transparent;font-size:10px;font-family:'Outfit',sans-serif;cursor:pointer;color:#7A6E6A;}
  .day-btn.add{border-style:dashed;color:#F4A021;width:100%;margin-top:auto;}
  .day-btn.add:hover{background:#FFF5F2;border-color:#F4A021;}
  .day-btn:not(.add):hover{background:#FFF0D4;color:#151210;}
  .consol-section{margin-top:40px;padding-top:32px;border-top:1px solid #EDE8E0;}
  .consol-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px;}
  .consol-title{font-family:'Fraunces',serif;font-size:20px;}

  /* Inspire */
  .inspire-wrap{max-width:680px;margin:0 auto;padding:40px 24px 40px;}
  .inspire-title{font-family:'Fraunces',serif;font-size:clamp(26px,5vw,42px);text-align:center;margin-bottom:10px;}
  .inspire-sub{font-size:14px;color:#7A6E6A;text-align:center;margin-bottom:32px;line-height:1.6;}
  .inspire-section{margin-bottom:24px;}
  .inspire-section-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7A6E6A;margin-bottom:12px;font-weight:500;}
  .inspire-chips{display:flex;flex-wrap:wrap;gap:8px;}
  .inspire-chip{padding:9px 18px;border-radius:100px;border:1.5px solid #EDE8E0;background:#fff;font-family:'Outfit',sans-serif;font-size:13px;color:#7A6E6A;cursor:pointer;transition:all .15s;}
  .inspire-chip.on{background:#151210;border-color:#151210;color:#fff;}
  .inspire-chip:not(.on):hover{border-color:#151210;color:#151210;}
  .inspire-go-btn{width:100%;padding:15px;background:#F4A021;color:#fff;border:none;border-radius:100px;font-family:'Outfit',sans-serif;font-size:15px;font-weight:500;cursor:pointer;transition:background .15s;margin-top:8px;}
  .inspire-go-btn:hover:not(:disabled){background:#D88815;}
  .inspire-go-btn:disabled{background:#7A6E6A;cursor:not-allowed;}
  .inspire-results{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:28px;}
  .inspire-card{background:#fff;border:1px solid #EDE8E0;border-radius:14px;padding:20px;cursor:pointer;transition:all .15s;border-left:4px solid #F4A021;}
  .inspire-card:hover{box-shadow:0 6px 24px rgba(61,43,31,.1);transform:translateY(-2px);}
  .inspire-card-title{font-family:'Fraunces',serif;font-size:18px;margin-bottom:6px;}
  .inspire-card-desc{font-size:13px;color:#7A6E6A;line-height:1.5;margin-bottom:10px;}
  .inspire-card-meta{display:flex;gap:12px;font-size:11px;color:#7A6E6A;flex-wrap:wrap;margin-bottom:10px;}
  .inspire-card-btn{width:100%;padding:8px;background:#151210;color:#fff;border:none;border-radius:8px;font-family:'Outfit',sans-serif;font-size:13px;cursor:pointer;}
  .inspire-card-btn:hover{background:#2D5A42;}
  .inspire-reset{background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;color:#F4A021;text-decoration:underline;text-underline-offset:3px;display:block;margin:24px auto 0;}

  /* Family */
  .family-wrap{max-width:560px;margin:0 auto;padding:40px 24px 40px;}
  .family-title{font-family:'Fraunces',serif;font-size:clamp(24px,4vw,36px);margin-bottom:8px;}
  .family-sub{font-size:14px;color:#7A6E6A;margin-bottom:28px;line-height:1.6;}
  .family-current{background:#fff;border:1px solid #EDE8E0;border-radius:14px;padding:20px;margin-bottom:22px;}
  .family-code-display{font-family:'Fraunces',serif;font-size:32px;letter-spacing:4px;color:#F4A021;margin:8px 0;}
  .family-code-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7A6E6A;font-weight:500;}
  .family-code-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;}
  .family-code-btn{padding:8px 18px;border-radius:100px;border:1px solid #EDE8E0;background:transparent;font-family:'Outfit',sans-serif;font-size:12px;cursor:pointer;color:#7A6E6A;transition:all .15s;}
  .family-code-btn:hover{border-color:#151210;color:#151210;}
  .family-code-btn.primary{background:#151210;border-color:#151210;color:#fff;}
  .family-code-btn.primary:hover{background:#2D5A42;}
  .family-divider{display:flex;align-items:center;gap:12px;margin:22px 0;}
  .family-divider-line{flex:1;height:1px;background:#EDE8E0;}
  .family-divider-text{font-size:11px;color:#7A6E6A;text-transform:uppercase;letter-spacing:1.5px;}
  .family-join-wrap{background:#fff;border:1px solid #EDE8E0;border-radius:14px;padding:20px;}
  .family-join-label{font-size:13px;color:#151210;margin-bottom:10px;font-weight:500;}
  .family-join-row{display:flex;gap:8px;}
  .family-join-input{flex:1;padding:10px 16px;border:1.5px solid #EDE8E0;border-radius:100px;font-family:'Outfit',sans-serif;font-size:14px;color:#151210;outline:none;text-transform:uppercase;letter-spacing:2px;}
  .family-join-input:focus{border-color:#F4A021;}
  .family-join-btn{padding:10px 20px;background:#F4A021;color:#fff;border:none;border-radius:100px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;}
  .family-shared-recipes{margin-top:28px;}
  .family-shared-title{font-family:'Fraunces',serif;font-size:20px;margin-bottom:6px;}
  .family-shared-sub{font-size:13px;color:#7A6E6A;margin-bottom:16px;}
  .family-status{padding:10px 14px;border-radius:10px;font-size:13px;margin-top:12px;}
  .family-status.ok{background:#F0F5EE;border:1px solid #b5c9a8;color:#4a6040;}
  .family-status.err{background:#FEE;border:1px solid #fcc;color:#900;}

  /* Modal */
  .modal-overlay{position:fixed;inset:0;background:rgba(61,43,31,.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;}
  .modal{background:#FDFAF5;border-radius:18px;padding:26px;width:100%;max-width:480px;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);}
  .modal-title{font-family:'Fraunces',serif;font-size:20px;margin-bottom:16px;flex-shrink:0;}
  .modal-list{overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:8px;}
  .modal-item{background:#fff;border:1px solid #EDE8E0;border-radius:10px;padding:12px 14px;cursor:pointer;transition:all .12s;}
  .modal-item:hover{border-color:#F4A021;background:#FFF8F5;}
  .modal-item-title{font-family:'Fraunces',serif;font-size:15px;}
  .modal-item-meta{font-size:11px;color:#7A6E6A;margin-top:3px;}
  .modal-close{margin-top:14px;flex-shrink:0;background:none;border:1px solid #EDE8E0;border-radius:100px;padding:8px 20px;font-family:'Outfit',sans-serif;font-size:13px;cursor:pointer;color:#7A6E6A;}
  .error-box{text-align:center;padding:60px 24px;color:#7A6E6A;}
  .error-box h3{font-family:'Fraunces',serif;color:#151210;margin-bottom:8px;}

  /* History */
  .history-empty{text-align:center;padding:40px 24px;color:#7A6E6A;font-size:14px;line-height:1.6;}
  .history-empty h3{font-family:'Fraunces',serif;color:#151210;font-size:20px;margin-bottom:8px;}
  .history-list{display:flex;flex-direction:column;gap:10px;margin-top:8px;}
  .history-item{background:#fff;border:1px solid #EDE8E0;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:14px;transition:all .15s;}
  .history-item:hover{border-color:#F4A021;box-shadow:0 3px 12px rgba(61,43,31,.07);}
  .history-item-main{flex:1;cursor:pointer;min-width:0;}
  .history-item-title{font-family:'Fraunces',serif;font-size:16px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .history-item-meta{font-size:11px;color:#7A6E6A;display:flex;gap:10px;flex-wrap:wrap;}
  .history-item-time{font-size:11px;color:#7A6E6A;white-space:nowrap;}
  .history-item-save{padding:5px 14px;border-radius:100px;border:1.5px solid #EDE8E0;background:transparent;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;cursor:pointer;color:#7A6E6A;transition:all .15s;white-space:nowrap;flex-shrink:0;}
  .history-item-save:hover{border-color:#F4A021;color:#F4A021;}
  .history-item-save.saved{background:#F4A021;border-color:#F4A021;color:#fff;}
  .history-clear{background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:12px;color:#7A6E6A;text-decoration:underline;text-underline-offset:3px;margin-top:16px;display:block;}
  .history-tabs{display:flex;gap:0;border-bottom:1px solid #EDE8E0;margin-bottom:24px;}
  .history-tab{padding:8px 20px;border:none;background:transparent;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;color:#7A6E6A;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;}
  .history-tab.active{color:#151210;border-bottom-color:#F4A021;}

  @media print{
    .nav,.bottom-nav,.recipe-banner-actions,.scaler,.shop-btns,.back-btn,
    .source-links,.card-actions,.grocery-section,.scan-divider,.scan-area{display:none !important;}
    body{background:#fff;padding-bottom:0;}
    .recipe-page{max-width:100%;padding:0;}
    .recipe-banner{background:#1E3A2F;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .two-col{grid-template-columns:200px 1fr;gap:24px;}
  }
`;

/* ── CONSTANTS ── */
const SUGGESTIONS = ["Miso Glazed Salmon","Birria Tacos","Shakshuka","Mushroom Risotto","Korean BBQ Bowl","Coconut Curry Noodles","French Onion Soup","Smash Burgers"];
type Stroke = "squiggle"|"zigzag"|"wave"|"dashed"|"loop"|"steps"|"tight"|"bold";
const SUGGESTION_CARDS: {title:string;desc:string;time:string;category:string;bg:string;catColor:string;stroke:Stroke;strokeColor:string}[] = [
  {title:"Miso Glazed Salmon",    desc:"Rich umami glaze, crispy skin",    time:"25 min · 4 servings", category:"Staff Pick",      bg:"#FFF4E0", catColor:"#F4A021", stroke:"squiggle", strokeColor:"#F4A021"},
  {title:"Shakshuka",             desc:"Eggs in spiced tomato sauce",      time:"20 min · 2 servings", category:"Quick & Easy",    bg:"#FFF0EB", catColor:"#E8431A", stroke:"zigzag",   strokeColor:"#E8431A"},
  {title:"Mushroom Risotto",      desc:"Creamy, earthy, indulgent",        time:"40 min · 4 servings", category:"Seasonal",        bg:"#EDF4EF", catColor:"#1E3A2F", stroke:"wave",     strokeColor:"#1E3A2F"},
  {title:"Birria Tacos",          desc:"Slow-braised beef, consommé dip",  time:"3 hrs · 6 servings",  category:"Weekend Project", bg:"#FFF4E0", catColor:"#F4A021", stroke:"dashed",   strokeColor:"#F4A021"},
  {title:"French Onion Soup",     desc:"Classic bistro, melted gruyère",   time:"50 min · 4 servings", category:"Comfort Food",    bg:"#FFF0EB", catColor:"#E8431A", stroke:"loop",     strokeColor:"#E8431A"},
  {title:"Korean BBQ Bowl",       desc:"Gochujang beef, pickled veg",      time:"30 min · 2 servings", category:"Bold & Spicy",    bg:"#EDF4EF", catColor:"#1E3A2F", stroke:"steps",    strokeColor:"#1E3A2F"},
  {title:"Coconut Curry Noodles", desc:"Fragrant, creamy, satisfying",     time:"35 min · 4 servings", category:"Fan Favourite",   bg:"#FFF4E0", catColor:"#F4A021", stroke:"tight",    strokeColor:"#F4A021"},
  {title:"Smash Burgers",         desc:"Crispy edges, secret sauce",       time:"20 min · 4 servings", category:"Under 30 Mins",   bg:"#FFF0EB", catColor:"#E8431A", stroke:"bold",     strokeColor:"#E8431A"},
];

const StrokeSVG = ({kind,color}:{kind:Stroke;color:string}) => {
  const paths: Record<Stroke,string> = {
    squiggle: "M5 20 Q20 5, 35 20 T65 20 T95 20 T125 20 T135 20",
    zigzag:   "M5 18 L20 8 L35 28 L50 8 L65 28 L80 8 L95 28 L115 18",
    wave:     "M5 18 C20 4, 30 32, 45 18 S70 4, 85 18 S110 32, 125 18 S135 12, 140 18",
    dashed:   "M5 30 L30 14 M42 26 L62 10 M74 26 L94 10 M106 26 L126 14",
    loop:     "M5 22 C15 22, 15 8, 30 8 S45 22, 55 22 C65 22, 65 8, 80 8 S95 22, 105 22 C115 22, 115 8, 130 8",
    steps:    "M5 28 L20 28 L20 14 L40 14 L40 24 L60 24 L60 10 L80 10 L80 22 L100 22 L100 14 L125 14",
    tight:    "M5 20 Q12 8, 20 20 T35 20 T50 20 T65 20 T80 20 T95 20 T110 20 T125 20",
    bold:     "M5 18 L25 6 L45 30 L65 6 L85 30 L105 6 L125 18",
  };
  return (
    <svg width="140" height="40" viewBox="0 0 140 40" fill="none" style={{overflow:"visible"}}>
      <path d={paths[kind]} stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
};
const DIETS    = ["Vegetarian","Vegan","Gluten-Free","Dairy-Free","Keto","Low-Carb"];
const DAYS     = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAY_KEYS = ["mon","tue","wed","thu","fri","sat","sun"];
const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const INSPIRE_OPTIONS = {
  time:    ["Under 20 mins","Under 30 mins","Under 45 mins","1 hour+","I've got all day"],
  vibe:    ["Comfort food","Light & fresh","Bold & spicy","Something new","Family favorite","Date night"],
  serves:  ["Just me","2 people","Family of 4","Big group"],
};

const RETAILERS = [
  {id:"walmart",   name:"Walmart",      color:"#0071CE", url:(q:string)=>`https://www.walmart.com/search?q=${encodeURIComponent(q)}`},
  {id:"target",    name:"Target",       color:"#CC0000", url:(q:string)=>`https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`},
  {id:"kroger",    name:"Kroger",       color:"#004990", url:(q:string)=>`https://www.kroger.com/search?query=${encodeURIComponent(q)}`},
  {id:"instacart", name:"Instacart",    color:"#43A726", url:(q:string)=>`https://www.instacart.com/store/s?k=${encodeURIComponent(q)}`},
  {id:"amazon",    name:"Amazon Fresh", color:"#FF9900", url:(q:string)=>`https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=amazonfresh`},
  {id:"wholefoods",name:"Whole Foods",  color:"#00674B", url:(q:string)=>`https://www.wholefoodsmarket.com/search?text=${encodeURIComponent(q)}`},
];

const REMIX_OPTIONS = [
  "Fewer ingredients",
  "Simpler steps",
  "Quicker cook time",
  "Make it spicier",
  "Lighter & healthier",
  "More indulgent",
  "Vegetarian version",
  "Surprise me",
];

const SITE_URLS: Record<string,string> = {
  "allrecipes":"https://www.allrecipes.com/search?q=",
  "food network":"https://www.foodnetwork.com/search/",
  "serious eats":"https://www.seriouseats.com/search?q=",
  "nyt cooking":"https://cooking.nytimes.com/search?q=",
  "bon appétit":"https://www.bonappetit.com/search?q=",
  "bonappetit":"https://www.bonappetit.com/search?q=",
  "epicurious":"https://www.epicurious.com/search/",
  "taste of home":"https://www.tasteofhome.com/search/results/?q=",
  "simply recipes":"https://www.simplyrecipes.com/search?q=",
  "food52":"https://food52.com/recipes/search?q=",
  "delish":"https://www.delish.com/search/?q=",
};
function getSiteUrl(name: string, dish: string){
  const k=name.toLowerCase().trim();
  return (SITE_URLS[k]||`https://www.google.com/search?q=${encodeURIComponent(name+" recipe ")}`)+encodeURIComponent(dish);
}
function wmUrl(item: string){ return `https://www.walmart.com/search?q=${encodeURIComponent(item)}`; }
function tgUrl(item: string){ return `https://www.target.com/s?searchTerm=${encodeURIComponent(item)}`; }

/* ── UTILS ── */
function parseNum(s: string): number|null{
  const t=s.trim();
  const mx=t.match(/^(\d+)\s+(\d+)\/(\d+)$/);if(mx)return+mx[1]+ +mx[2]/+mx[3];
  const fx=t.match(/^(\d+)\/(\d+)$/);if(fx)return+fx[1]/+fx[2];
  const n=parseFloat(t);return isNaN(n)?null:n;
}
function formatNum(n: number): string{
  const w=Math.floor(n),r=n-w;
  const fs:Array<[number,string]>=[[.125,"⅛"],[.25,"¼"],[.333,"⅓"],[.375,"⅜"],[.5,"½"],[.625,"⅝"],[.667,"⅔"],[.75,"¾"],[.875,"⅞"]];
  for(const[v,sym]of fs)if(Math.abs(r-v)<.06)return w>0?`${w} ${sym}`:sym;
  if(r<.05||r>.95)return String(Math.round(n));
  return n.toFixed(1).replace(/\.0$/,"");
}
function scaleAmt(str: string,ratio: number): string{
  if(!str)return str;
  const m=str.match(/^([\d\s\/\.]+)(.*)/);if(!m)return str;
  const n=parseNum(m[1]);if(n===null)return str;
  return formatNum(n*ratio)+m[2];
}
function consolidate(plan: Record<string,any>){
  const map: Record<string,{name:string;recipes:string[]}> = {};
  for(const k of DAY_KEYS){
    const r=plan[k];if(!r)continue;
    for(const item of(r.grocery_items||[])){
      const key=item.toLowerCase().trim();
      if(!map[key])map[key]={name:item,recipes:[]};
      if(!map[key].recipes.includes(r.title))map[key].recipes.push(r.title);
    }
  }
  return Object.values(map).sort((a,b)=>a.name.localeCompare(b.name));
}
function randomCode(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
}

function buildPrompt(dish: string,diets: string[],seasonal: boolean,location: string): string{
  const d=diets.length?" Dietary needs: "+diets.join(", ")+".":"";
  const now=new Date();
  const monthYear=MONTHS[now.getMonth()]+" "+now.getFullYear();
  const s=seasonal&&location
    ?` Seasonal recipe for ${location} in ${monthYear}. Prioritize peak produce. Include a seasonal_note (one sentence).`
    :seasonal?` Prioritize ingredients in season (${monthYear}). Include a seasonal_note.`:"";
  return `Create a recipe for "${dish}".${d}${s}
Reply with ONLY valid JSON, no other text:
{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","servings":"4","ingredient_groups":[{"label":"For the Marinade","items":[{"amount":"2 tbsp","name":"soy sauce"}]},{"label":"","items":[{"amount":"1 cup","name":"rice"}]}],"steps":["Step one."],"grocery_items":["soy sauce","rice"],"sources":["AllRecipes","Serious Eats"],"source_note":"...","seasonal_note":"..."}
Rules: group ingredients by component when useful; single group with empty label for simple recipes. 6-10 steps. grocery_items: flat names only. sources: 2-3 real sites. seasonal_note only if seasonal requested.`;
}

function buildInspirePrompt(time: string,vibe: string,serves: string,diets: string[]): string{
  const d=diets.length?" Dietary restrictions: "+diets.join(", ")+".":"";
  return `Suggest 3 distinct recipe ideas for someone who wants: time available: "${time}", vibe: "${vibe}", serving size: "${serves}".${d}
Reply with ONLY valid JSON, no other text:
{"suggestions":[{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","servings":"2","why":"One sentence on why this fits their request perfectly."},{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","servings":"2","why":"..."},{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","servings":"2","why":"..."}]}
Make each suggestion meaningfully different from the others. Keep titles concise and appetizing.`;
}

function buildScanPrompt(): string{
  return `Extract the recipe from this image. Reply with ONLY valid JSON:
{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","servings":"4","ingredient_groups":[{"label":"","items":[{"amount":"2 tbsp","name":"olive oil"}]}],"steps":["Full step."],"grocery_items":["olive oil"],"sources":[],"source_note":"Digitized from a recipe card."}`;
}

function buildRemixPrompt(dish: string, diets: string[], seasonal: boolean, location: string, tweaks: string[]): string{
  const base = buildPrompt(dish, diets, seasonal, location);
  const tweak = tweaks.includes("Surprise me")
    ? " Make it meaningfully different from a typical version — surprise the cook."
    : ` Adjust the recipe with these preferences: ${tweaks.join(", ")}. Keep the same dish but incorporate these changes throughout the ingredients and method.`;
  return base + tweak;
}

function buildUrlPrompt(): string{
  return `Extract the recipe from the text content of this webpage. Ignore navigation, ads, comments, and all other non-recipe content. Reply with ONLY valid JSON:
{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","servings":"4","ingredient_groups":[{"label":"","items":[{"amount":"2 tbsp","name":"olive oil"}]}],"steps":["Full detailed step."],"grocery_items":["olive oil"],"sources":[],"source_note":"Extracted from [site name]."}
Group ingredients by component if applicable. Write full clear steps.`;
}

const LogoMark = ({size=32}:{size?:number}) => (
  <div style={{
    width:size,height:size,
    background:"#F4A021",
    borderRadius:Math.round(size*0.25),
    display:"flex",alignItems:"center",justifyContent:"center",
    fontFamily:"'Fraunces',serif",fontSize:Math.round(size*0.5),fontWeight:700,
    color:"#151210",letterSpacing:"-1px",lineHeight:1,
  }}>
    EC
  </div>
);

async function callAPI(messages: any[]): Promise<any>{
  const res=await fetch("/api/recipe",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:2048,messages}),
  });
  const raw=await res.text();
  if(!res.ok)throw new Error("HTTP "+res.status+": "+raw.slice(0,300));
  let data:any;try{data=JSON.parse(raw);}catch{throw new Error("Not JSON: "+raw.slice(0,200));}
  if(data.error)throw new Error("API: "+JSON.stringify(data.error).slice(0,200));
  const text=(data.content||[]).filter((b:any)=>b.type==="text").map((b:any)=>b.text).join("");
  if(!text.trim())throw new Error("Empty response");
  const s=text.indexOf("{"),e=text.lastIndexOf("}");
  if(s===-1)throw new Error("No JSON: "+text.slice(0,200));
  return JSON.parse(text.slice(s,e+1));
}

/* ── MAIN APP ── */
export default function App(){
  const [tab,setTab]             = useState("search");
  const [query,setQuery]         = useState("");
  const [diets,setDiets]         = useState<string[]>([]);
  const [seasonal,setSeasonal]   = useState(false);
  const [location,setLocation]   = useState("");
  const [detecting,setDetecting] = useState(false);
  const [status,setStatus]       = useState("idle");
  const [recipe,setRecipe]       = useState<any>(null);
  const [servings,setServings]   = useState<number|null>(null);
  const [errorMsg,setErrorMsg]   = useState("");
  const [saved,setSaved]         = useState<any[]>([]);
  const [history,setHistory]     = useState<any[]>([]);
  const [savedTab,setSavedTab]   = useState("saved");
  const [plan,setPlan]           = useState<Record<string,any>>({});
  const [assignDay,setAssignDay] = useState<string|null>(null);
  const [scanPreview,setScanPreview] = useState<string|null>(null);
  const [scanMime,setScanMime]   = useState("image/jpeg");
  const [scanStatus,setScanStatus] = useState("idle");
  const [scanMsg,setScanMsg]     = useState("");
  const [ready,setReady]         = useState(false);
  const [urlInput,setUrlInput]   = useState("");
  const [urlStatus,setUrlStatus] = useState("idle"); // idle|loading|done|error
  const [urlMsg,setUrlMsg]       = useState("");
  const [remixChips,setRemixChips] = useState<string[]>([]);
  const [remixStatus,setRemixStatus] = useState("idle");
  const [retailer,setRetailer] = useState<string>("");
  const [retailerOpen,setRetailerOpen] = useState(false);

  // Inspire Me
  const [inspireTime,setInspireTime]   = useState("");
  const [inspireVibe,setInspireVibe]   = useState("");
  const [inspireServes,setInspireServes] = useState("");
  const [inspireStatus,setInspireStatus] = useState("idle");
  const [inspireSuggestions,setInspireSuggestions] = useState<any[]>([]);

  // Family Codes
  const [familyCode,setFamilyCode]     = useState("");
  const [joinInput,setJoinInput]       = useState("");
  const [sharedRecipes,setSharedRecipes] = useState<any[]>([]);
  const [familyStatus,setFamilyStatus] = useState("");
  const [familyStatusType,setFamilyStatusType] = useState("ok");

  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  /* storage load */
  useEffect(()=>{
    function load(){
      try{const s=localStorage.getItem("dw-saved");if(s)setSaved(JSON.parse(s));}catch{}
      try{const m=localStorage.getItem("dw-plan");if(m)setPlan(JSON.parse(m));}catch{}
      try{const l=localStorage.getItem("dw-location");if(l)setLocation(l);}catch{}
      try{const fc=localStorage.getItem("dw-family-code");if(fc){setFamilyCode(fc);loadShared(fc);}}catch{}
      try{const h=localStorage.getItem("dw-history");if(h)setHistory(JSON.parse(h));}catch{}
      try{const rt=localStorage.getItem("dw-retailer");if(rt)setRetailer(rt);}catch{}
      setReady(true);
    }
    load();
  },[]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-saved",JSON.stringify(saved));}catch{};},[saved,ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-history",JSON.stringify(history.slice(0,30)));}catch{};},[history,ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-plan",JSON.stringify(plan));}catch{};},[plan,ready]);
  useEffect(()=>{if(ready&&location)try{localStorage.setItem("dw-location",location);}catch{};},[location,ready]);
  useEffect(()=>{if(ready&&retailer)try{localStorage.setItem("dw-retailer",retailer);}catch{};},[retailer,ready]);

  /* family code helpers */
  const loadShared=async(code: string)=>{
    if(!code)return;
    try{
      const res=await fetch(`/api/family?code=${code}`);
      if(!res.ok){setSharedRecipes([]);return;}
      const data=await res.json();
      if(data.found)setSharedRecipes(data.recipes||[]);
      else setSharedRecipes([]);
    }catch{setSharedRecipes([]);}
  };

  const syncToFamily=async(recipes: any[],code: string)=>{
    if(!code)return;
    try{
      await fetch("/api/family",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({code,recipes}),
      });
    }catch{}
  };

  const createFamilyCode=async()=>{
    const code=randomCode();
    setFamilyCode(code);
    try{localStorage.setItem("dw-family-code",code);}catch{}
    setFamilyStatus("Creating code...");
    setFamilyStatusType("ok");
    try{
      const res=await fetch("/api/family",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({code,recipes:saved}),
      });
      const data=await res.json();
      if(!res.ok)throw new Error(JSON.stringify(data));
      setFamilyStatus("Code created! Share "+code+" with family or friends to link collections.");
      setFamilyStatusType("ok");
    }catch(e:any){
      setFamilyStatus("Save error: "+e.message);
      setFamilyStatusType("err");
    }
  };

  const joinFamilyCode=async()=>{
    const code=joinInput.trim().toUpperCase();
    if(code.length<4){setFamilyStatus("Please enter a valid code.");setFamilyStatusType("err");return;}
    try{
      const res=await fetch(`/api/family?code=${code}`);
      const data=await res.json();
      if(!res.ok||!data.found){
        setFamilyStatus("Code not found. Double-check and try again.");
        setFamilyStatusType("err");
        return;
      }
      setFamilyCode(code);
      try{localStorage.setItem("dw-family-code",code);}catch{}
      await syncToFamily(saved,code);
      setSharedRecipes(data.recipes||[]);
      setJoinInput("");
      setFamilyStatus(`Joined! You now have access to the shared collection for code ${code}.`);
      setFamilyStatusType("ok");
    }catch(e:any){setFamilyStatus("Error: "+e.message);setFamilyStatusType("err");}
  };

  const leaveFamilyCode=()=>{
    setFamilyCode("");setSharedRecipes([]);setFamilyStatus("");
    try{localStorage.removeItem("dw-family-code");}catch{}
  };

  /* keep shared in sync when saved changes */
  useEffect(()=>{
    if(ready&&familyCode)syncToFamily(saved,familyCode);
  },[saved,ready]); // eslint-disable-line react-hooks/exhaustive-deps

  /* detect location */
  const detectLocation=()=>{
    if(!navigator.geolocation){setLocation("Location unavailable");return;}
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(async(pos)=>{
      try{
        const{latitude:lat,longitude:lon}=pos.coords;
        const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const d=await r.json();
        const city=d.address?.city||d.address?.town||d.address?.village||"";
        const state=d.address?.state||d.address?.country||"";
        setLocation(city&&state?`${city}, ${state}`:state||city||`${lat.toFixed(1)}, ${lon.toFixed(1)}`);
      }catch{setLocation("Location detected");}
      setDetecting(false);
    },()=>{setDetecting(false);setLocation("Could not detect");});
  };

  /* search */
  const doSearch=async(dish?: string)=>{
    const q=(dish||query).trim();if(!q)return;
    setStatus("loading");setRecipe(null);setServings(null);setErrorMsg("");
    try{
      const parsed=await callAPI([{role:"user",content:buildPrompt(q,diets,seasonal,location)}]);
      const r={...parsed,id:Date.now(),_dish:q,_ts:Date.now()};
      setRecipe(r);setStatus("done");
      setHistory(h=>[r,...h.filter((x:any)=>x.id!==r.id)].slice(0,30));
    }catch(e:any){setErrorMsg(e.message||String(e));setStatus("error");}
  };

  /* inspire */
  const doInspire=async()=>{
    if(!inspireTime||!inspireVibe||!inspireServes)return;
    setInspireStatus("loading");setInspireSuggestions([]);
    try{
      const parsed=await callAPI([{role:"user",content:buildInspirePrompt(inspireTime,inspireVibe,inspireServes,diets)}]);
      setInspireSuggestions(parsed.suggestions||[]);setInspireStatus("done");
    }catch(e:any){setInspireStatus("error");}
  };

  const pickInspiredRecipe=async(suggestion: any)=>{
    setTab("search");setQuery(suggestion.title);
    setStatus("loading");setRecipe(null);setServings(null);setErrorMsg("");
    try{
      const parsed=await callAPI([{role:"user",content:buildPrompt(suggestion.title,diets,seasonal,location)}]);
      const r={...parsed,id:Date.now(),_dish:suggestion.title,_ts:Date.now()};
      setRecipe(r);setStatus("done");
      setHistory(h=>[r,...h.filter((x:any)=>x.id!==r.id)].slice(0,30));
    }catch(e:any){setErrorMsg(e.message||String(e));setStatus("error");}
  };

  /* scan */
  const onFileChange=(e: React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];if(!file)return;
    setScanMime(file.type||"image/jpeg");setScanStatus("idle");setScanMsg("");
    const reader=new FileReader();
    reader.onload=(ev)=>setScanPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  const doScan=async()=>{
    if(!scanPreview)return;setScanStatus("scanning");setScanMsg("");
    try{
      const b64=scanPreview.split(",")[1];
      const parsed=await callAPI([{role:"user",content:[
        {type:"image",source:{type:"base64",media_type:scanMime,data:b64}},
        {type:"text",text:buildScanPrompt()},
      ]}]);
      const r={...parsed,id:Date.now(),_dish:parsed.title||"Scanned Recipe",_scanned:true};
      setSaved(l=>[r,...l]);setScanStatus("done");setScanMsg(`"${r.title}" saved!`);
      setScanPreview(null);if(fileRef.current)fileRef.current.value="";
    }catch(e:any){setScanStatus("error");setScanMsg(e.message||String(e));}
  };
  const clearScan=()=>{setScanPreview(null);setScanStatus("idle");setScanMsg("");if(fileRef.current)fileRef.current.value="";};

  const doFetchUrl=async()=>{
    const url=urlInput.trim();
    if(!url||!url.startsWith("http")){setUrlMsg("Please enter a valid URL starting with http");setUrlStatus("error");return;}
    setUrlStatus("loading");setUrlMsg("");
    try{
      // Fetch via our server-side proxy to avoid CORS
      const res=await fetch("/api/fetch-url",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({url}),
      });
      const {text,error}=await res.json();
      if(error||!text)throw new Error(error||"Could not fetch page");
      // Now send text to Claude to extract the recipe
      const parsed=await callAPI([{role:"user",content:[
        {type:"text",text:buildUrlPrompt()+"\n\nPage content:\n"+text.slice(0,12000)},
      ]}]);
      const r={...parsed,id:Date.now(),_dish:parsed.title||"Imported Recipe",_imported:true,_sourceUrl:url};
      setSaved(l=>[r,...l]);
      setUrlStatus("done");setUrlMsg(`"${r.title}" saved to your collection!`);
      setUrlInput("");
    }catch(e:any){setUrlStatus("error");setUrlMsg(e.message||"Could not import recipe. The site may be paywalled or unsupported.");}
  };

  const doRemix=async()=>{
    if(!recipe||remixStatus==="loading")return;
    setRemixStatus("loading");
    try{
      const q=recipe._dish||recipe.title||"";
      const parsed=await callAPI([{role:"user",content:buildRemixPrompt(q,diets,seasonal,location,remixChips)}]);
      const r={...parsed,id:Date.now(),_dish:q,_ts:Date.now()};
      setRecipe(r);setServings(null);
      setHistory((h:any[])=>[r,...h.filter((x:any)=>x.id!==r.id)].slice(0,30));
      setRemixChips([]);
    }catch(e:any){console.error(e);}
    finally{setRemixStatus("idle");}
  };

  const toggleRemixChip=(chip: string)=>{
    if(chip==="Surprise me"){setRemixChips(["Surprise me"]);return;}
    setRemixChips(prev=>{
      const without=prev.filter(c=>c!=="Surprise me");
      return without.includes(chip)?without.filter(c=>c!==chip):[...without,chip];
    });
  };

  const toggleDiet=(d: string)=>setDiets(f=>f.includes(d)?f.filter(x=>x!==d):[...f,d]);
  const isSaved=(r: any)=>r&&saved.some((s:any)=>s.id===r.id);
  const toggleSave=(r: any)=>{if(!r)return;isSaved(r)?setSaved(l=>l.filter((s:any)=>s.id!==r.id)):setSaved(l=>[r,...l]);};
  const baseS=recipe?(parseInt(recipe.servings)||4):4;
  const curS=servings||baseS;
  const ratio=curS/baseS;
  const consolidated=consolidate(plan);
  const mealsPlanned=DAY_KEYS.filter(k=>plan[k]).length;

  /* ── SEARCH VIEW ── */
  function SearchView(){
    return(
      <>
        {status!=="done"&&(
          <div>
          {/* ── Particle + smoke hero ── */}
          <div className="hero">
            {/* Particles */}
            <div className="hero-particles">
              {[
                {s:4, l:"18%", d:"6.5s", dl:"0s",   drift:"12px",  color:"rgba(196,94,62,.35)"},
                {s:3, l:"31%", d:"8s",   dl:"1.2s",  drift:"-8px",  color:"rgba(196,149,106,.4)"},
                {s:5, l:"44%", d:"7s",   dl:"0.4s",  drift:"6px",   color:"rgba(122,140,110,.35)"},
                {s:3, l:"57%", d:"9s",   dl:"2.1s",  drift:"-14px", color:"rgba(196,94,62,.3)"},
                {s:4, l:"68%", d:"6s",   dl:"0.8s",  drift:"10px",  color:"rgba(196,149,106,.35)"},
                {s:5, l:"82%", d:"7.5s", dl:"3s",    drift:"-6px",  color:"rgba(122,140,110,.3)"},
                {s:3, l:"24%", d:"10s",  dl:"1.6s",  drift:"8px",   color:"rgba(196,149,106,.3)"},
                {s:4, l:"72%", d:"8.5s", dl:"2.8s",  drift:"-10px", color:"rgba(196,94,62,.25)"},
                {s:3, l:"50%", d:"7s",   dl:"4s",    drift:"14px",  color:"rgba(122,140,110,.25)"},
                {s:5, l:"38%", d:"9.5s", dl:"1s",    drift:"-8px",  color:"rgba(196,149,106,.35)"},
                {s:3, l:"62%", d:"6.5s", dl:"3.5s",  drift:"6px",   color:"rgba(196,94,62,.3)"},
                {s:4, l:"88%", d:"8s",   dl:"0.6s",  drift:"-12px", color:"rgba(122,140,110,.3)"},
              ].map((p,i)=>(
                <div key={i} className="hero-particle" style={{
                  width:p.s,height:p.s,
                  left:p.l,bottom:"5%",
                  background:p.color,
                  animationDuration:p.d,
                  animationDelay:p.dl,
                  ["--pdrift" as any]:p.drift,
                }}/>
              ))}
              {/* Smoke wisps */}
              {[
                {w:60, h:60, l:"20%", d:"9s",  dl:"0s",   op:.14},
                {w:80, h:80, l:"45%", d:"12s", dl:"2s",   op:.1},
                {w:50, h:50, l:"70%", d:"10s", dl:"1s",   op:.12},
                {w:70, h:70, l:"35%", d:"11s", dl:"3.5s", op:.09},
                {w:55, h:55, l:"80%", d:"9.5s",dl:"1.8s", op:.11},
                {w:90, h:90, l:"60%", d:"13s", dl:"4s",   op:.08},
              ].map((s,i)=>(
                <div key={"s"+i} className="hero-smoke" style={{
                  width:s.w,height:s.h,
                  left:s.l,bottom:"8%",
                  background:`rgba(155,140,126,${s.op})`,
                  animationDuration:s.d,
                  animationDelay:s.dl,
                }}/>
              ))}
            </div>
            {/* Content */}
            <div className="hero-content">
              <div className="hero-eyebrow">Every Chef</div>
              <h1 className="hero-title">What would you<br/><em>like to cook?</em></h1>
              <div className="hero-rule-wrap"><div className="hero-rule"/><div className="hero-diamond"/><div className="hero-rule"/></div>
              <p className="hero-sub">The <strong>best recipes on the internet</strong> — synthesized into one, without the ads, the scroll, or the life story.</p>
              <div className="search-wrap">
                <div className="search-bar">
                  <input ref={inputRef} className="search-input" placeholder="e.g. Miso Glazed Salmon, Birria Tacos…"
                    value={query} onChange={e=>setQuery(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&doSearch()} disabled={status==="loading"}/>
                  <button className="search-btn" onClick={()=>doSearch()} disabled={status==="loading"||!query.trim()}>
                    {status==="loading"?"Searching…":"Find Recipe →"}
                  </button>
                </div>
                <div className="filter-label">Dietary Filters</div>
                <div className="diet-filters">
                  {DIETS.map(d=>(
                    <button key={d} className={`diet-chip${diets.includes(d)?" on":""}`} onClick={()=>toggleDiet(d)}>{d}</button>
                  ))}
                </div>
                <div className="seasonal-row">
                  <button className={`seasonal-chip${seasonal?" on":""}`} onClick={()=>setSeasonal(v=>!v)}>
                    <span style={{display:"flex",alignItems:"center"}}>{Ic.leaf(14)}</span>{" "}{seasonal?"In Season — On":"In Season"}
                  </button>
                  {seasonal&&(
                    <div className="location-wrap">
                      <input className="location-input" placeholder="City, State…" value={location} onChange={e=>setLocation(e.target.value)}/>
                      <button className="location-detect" onClick={detectLocation} disabled={detecting} style={{display:"flex",alignItems:"center",gap:4}}>{detecting?"…":<>{Ic.pin(12)} Detect</>}</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Mosaic suggestion cards ── */}
          <div className="mosaic-section">
            <div className="mosaic-header">
              <div className="mosaic-title">Or try <em>one of these</em></div>
            </div>
            <div className="mosaic-grid">
              {SUGGESTION_CARDS.map((card)=>(
                <div key={card.title}
                  className="mosaic-card"
                  onClick={()=>{setQuery(card.title);doSearch(card.title);}}>
                  <div className="mosaic-card-stroke" style={{background:card.bg}}>
                    <StrokeSVG kind={card.stroke} color={card.strokeColor}/>
                  </div>
                  <div className="mosaic-card-body">
                    <div className="mosaic-card-category" style={{color:card.catColor}}>{card.category}</div>
                    <div className="mosaic-card-name">{card.title}</div>
                    <div className="mosaic-card-meta">{card.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scan + URL — scan first, then URL, extra bottom padding for mobile nav */}
          <div style={{maxWidth:860,margin:"0 auto",padding:"0 20px 100px"}}>

          <div className="scan-divider" style={{marginTop:24}}><div className="scan-divider-line"/><div className="scan-divider-text">or scan a recipe card</div><div className="scan-divider-line"/></div>
            <div className="scan-area">
              {!scanPreview?(
                <>
                  <div className="scan-icon" style={{color:"#151210"}}>{Ic.camera(28)}</div>
                  <div className="scan-label">From Paper to Plate</div>
                  <div className="scan-sub">Snap or upload any handwritten or printed recipe card</div>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={onFileChange}/>
                  <button className="scan-upload-btn" onClick={()=>fileRef.current?.click()}>Choose Photo</button>
                </>
              ):(
                <>
                  <img src={scanPreview} className="scan-preview" alt="Recipe preview"/>
                  <div className="scan-actions">
                    <button className="scan-go-btn" onClick={doScan} disabled={scanStatus==="scanning"}>{scanStatus==="scanning"?"Extracting…":"Digitize Recipe"}</button>
                    <button className="scan-clear-btn" onClick={clearScan}>Clear</button>
                  </div>
                </>
              )}
              {scanStatus==="done"&&scanMsg&&(
                <div className="scan-success">✓ {scanMsg}{" "}
                  <button onClick={()=>setTab("saved")} style={{background:"none",border:"none",cursor:"pointer",color:"#4a6040",textDecoration:"underline",fontSize:13}}>View in Saved →</button>
                </div>
              )}
              {scanStatus==="error"&&<div style={{marginTop:10,fontSize:12,color:"#F4A021"}}>{scanMsg}</div>}
            </div>

          <div className="scan-divider" style={{marginTop:24}}><div className="scan-divider-line"/><div className="scan-divider-text">or import from a url</div><div className="scan-divider-line"/></div>
            <div className="url-area">
              <div className="url-label" style={{display:"flex",alignItems:"center",gap:8}}>{Ic.link(16)} Paste a Recipe URL</div>
              <div className="url-sub">Paste any recipe link and we'll strip the ads and noise — returning only the clean recipe.</div>
              <div className="url-row">
                <input className="url-input" placeholder="https://www.allrecipes.com/recipe/..."
                  value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&doFetchUrl()}
                  disabled={urlStatus==="loading"}/>
                <button className="url-btn" onClick={doFetchUrl} disabled={urlStatus==="loading"||!urlInput.trim()}>
                  {urlStatus==="loading"?"Importing…":"Import"}
                </button>
              </div>
              {urlStatus==="done"&&urlMsg&&(
                <div className="url-success">✓ {urlMsg}{" "}
                  <button onClick={()=>setTab("saved")} style={{background:"none",border:"none",cursor:"pointer",color:"#4a6040",textDecoration:"underline",fontSize:13}}>View in Saved →</button>
                </div>
              )}
              {urlStatus==="error"&&<div className="url-error">{urlMsg}</div>}
              <div className="url-note">Works with most open recipe sites. Paywalled sites (NYT Cooking, etc.) won't work.</div>
            </div>

          </div>
          </div>
        )}
        {status==="loading"&&(
          <div className="loading-wrap"><div className="spinner"/>
            <div className="loading-text">{seasonal?"Finding what's fresh near you…":"Gathering the finest recipes…"}</div>
            <div className="loading-sub">Synthesizing techniques from top sources</div>
          </div>
        )}
        {status==="error"&&(
          <div className="error-box"><h3>Something went wrong</h3>
            <p style={{fontSize:12,fontFamily:"monospace",background:"#f5f5f5",padding:"8px 12px",borderRadius:6,marginTop:8,textAlign:"left",wordBreak:"break-all",color:"#555"}}>{errorMsg}</p>
            <button className="back-btn" onClick={()=>setStatus("idle")}>← Try again</button>
          </div>
        )}
        {status==="done"&&recipe&&RecipeView()}
      </>
    );
  }

  /* ── RECIPE VIEW ── */
  function RecipeView(){
    const sv=isSaved(recipe);
    const dish=recipe._dish||recipe.title||"";
    const sources=recipe.sources||[];
    const groups=recipe.ingredient_groups||(recipe.ingredients?[{label:"",items:recipe.ingredients}]:[]);
    const firstItem=(recipe.grocery_items||[])[0]||"";
    return(
      <div className="recipe-page">
        {/* Premium dark banner */}
        <div className="recipe-banner">
          <div className="recipe-banner-actions">
            <button className="print-btn" onClick={()=>window.print()} style={{display:"flex",alignItems:"center",gap:6}}>{Ic.printer(14)} Print</button>
            <button className={`save-btn${sv?" saved":""}`} onClick={()=>toggleSave(recipe)} style={{display:"flex",alignItems:"center",gap:5}}>{sv?Ic.heartFill(14):Ic.heart(14)} {sv?"Saved":"Save"}</button>
          </div>
          <div className="recipe-banner-eyebrow">{recipe._scanned?"Scanned Card":"· Every Chef ·"}</div>
          <h2 className="recipe-banner-title">{recipe.title}</h2>
          <p className="recipe-banner-desc">{recipe.tagline}</p>
          {recipe.seasonal_note&&<div className="seasonal-note"><span style={{display:"flex",alignItems:"center"}}>{Ic.leaf(12)}</span> {recipe.seasonal_note}</div>}
          <div className="recipe-banner-meta">
            <div className="recipe-banner-meta-item">
              <div className="recipe-banner-meta-label">Prep</div>
              <div className="recipe-banner-meta-value">{recipe.prep_time}</div>
            </div>
            <div className="recipe-banner-meta-item">
              <div className="recipe-banner-meta-label">Cook</div>
              <div className="recipe-banner-meta-value">{recipe.cook_time}</div>
            </div>
            <div className="recipe-banner-meta-item">
              <div className="scaler-label">Servings</div>
              <div className="scaler">
                <button className="scaler-btn" onClick={()=>setServings(Math.max(1,curS-1))}>−</button>
                <span className="scaler-val">{curS}</span>
                <button className="scaler-btn" onClick={()=>setServings(curS+1)}>+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Remix section — inside dark banner */}
        {!recipe._scanned&&!recipe._imported&&(
          <div className="remix-section">
            <div className="remix-label">Not quite right? Remix it</div>
            <div className="remix-chips">
              {REMIX_OPTIONS.map(chip=>(
                <button key={chip} className={`remix-chip${remixChips.includes(chip)?" active":""}`}
                  onClick={()=>toggleRemixChip(chip)}>
                  {chip}
                </button>
              ))}
            </div>
            {remixStatus==="loading"?(
              <div className="remix-loading">Remixing your recipe…</div>
            ):(
              <button className="remix-go" onClick={doRemix}
                disabled={remixChips.length===0}>
                {remixChips.length===0?"Select a preference above":"Remix →"}
              </button>
            )}
          </div>
        )}

        <div className="recipe-body">
        <div className="two-col">
          <div>
            <div className="section-label">Ingredients</div>
            {groups.map((g:any,gi:number)=>(
              <div key={gi} className="ing-group">
                {g.label&&<div className="ing-group-label">{g.label}</div>}
                <ul className="ing-list">
                  {(g.items||[]).map((ing:any,ii:number)=>(
                    <li key={ii} className="ing-item">
                      <span className="ing-dot"/>
                      <span className="ing-text">
                        <span className="ing-amount">{scaleAmt(ing.amount,ratio)}</span>{" "}
                        <span className="ing-name">{ing.name}</span>
                      </span>
                      {retailer&&(
                        <span className="ing-shop-links">
                          <a href={RETAILERS.find(r=>r.id===retailer)?.url(ing.name)||"#"}
                            target="_blank" rel="noopener noreferrer" className="ing-shop-link"
                            style={{borderColor:RETAILERS.find(r=>r.id===retailer)?.color+"44",color:RETAILERS.find(r=>r.id===retailer)?.color}}>
                            {(RETAILERS.find(r=>r.id===retailer)?.name||"").split(" ")[0]}
                          </a>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div>
            <div className="section-label">Method</div>
            <ol className="steps-list">
              {(recipe.steps||[]).map((step:string,i:number)=>(
                <li key={i} className="step-item">
                  <span className="step-num">{String(i+1).padStart(2,"0")}</span>
                  <span className="step-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="grocery-section">
          <div className="grocery-hdr">
            <h3 className="grocery-title">Grocery List</h3>
            <div className="retailer-wrap">
              <button className="retailer-btn" onClick={()=>setRetailerOpen(o=>!o)}>
                {Ic.cart(13)}
                {retailer?(RETAILERS.find(r=>r.id===retailer)?.name||"Shop"):"Shop at…"}
                <span style={{fontSize:9,opacity:.7}}>▾</span>
              </button>
              {retailerOpen&&(
                <div className="retailer-dropdown">
                  {RETAILERS.map(r=>(
                    <button key={r.id} className={`retailer-option${retailer===r.id?" active":""}`}
                      onClick={()=>{setRetailer(r.id);setRetailerOpen(false);}}>
                      <span className="retailer-option-dot" style={{background:r.color}}/>
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grocery-grid">
            {(recipe.grocery_items||[]).map((item:string,i:number)=>(
              <div key={i} className="grocery-card">
                <input type="checkbox" className="grocery-check"/>
                <div className="grocery-item-wrap">
                  <div className="grocery-name">{item}</div>
                  {retailer&&(
                    <div className="grocery-shop-links">
                      <a href={RETAILERS.find(r=>r.id===retailer)?.url(item)||"#"}
                        target="_blank" rel="noopener noreferrer" className="grocery-shop-link">
                        {RETAILERS.find(r=>r.id===retailer)?.name}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {sources.length>0&&(
          <div className="source-section">
            <div className="source-section-label">Explore more on</div>
            <div className="source-links">
              {sources.map((s:string,i:number)=>(
                <a key={i} href={getSiteUrl(s,dish)} target="_blank" rel="noopener noreferrer" className="source-link">{s} ↗</a>
              ))}
            </div>
            {recipe.source_note&&<div className="source-note">{recipe.source_note}</div>}
          </div>
        )}
        <button className="back-btn" onClick={()=>{setStatus("idle");setRecipe(null);setQuery("");}} style={{display:"flex",alignItems:"center",gap:6}}>{Ic.arrowLeft(14)} Search another recipe</button>
        </div>{/* recipe-body */}
      </div>
    );
  }

  /* ── INSPIRE ME VIEW ── */
  function InspireView(){
    const canGo=inspireTime&&inspireVibe&&inspireServes;
    return(
      <div className="inspire-wrap">
        <h2 className="inspire-title"><em>Inspire</em> me</h2>
        <p className="inspire-sub">Not sure what to make? Answer three quick questions and we'll serve up ideas tailored to your night.</p>

        {inspireStatus!=="done"&&(
          <>
            <div className="inspire-section">
              <div className="inspire-section-label">How much time do you have?</div>
              <div className="inspire-chips">
                {INSPIRE_OPTIONS.time.map(o=>(
                  <button key={o} className={`inspire-chip${inspireTime===o?" on":""}`} onClick={()=>setInspireTime(o)}>{o}</button>
                ))}
              </div>
            </div>
            <div className="inspire-section">
              <div className="inspire-section-label">What's the vibe?</div>
              <div className="inspire-chips">
                {INSPIRE_OPTIONS.vibe.map(o=>(
                  <button key={o} className={`inspire-chip${inspireVibe===o?" on":""}`} onClick={()=>setInspireVibe(o)}>{o}</button>
                ))}
              </div>
            </div>
            <div className="inspire-section">
              <div className="inspire-section-label">How many are you feeding?</div>
              <div className="inspire-chips">
                {INSPIRE_OPTIONS.serves.map(o=>(
                  <button key={o} className={`inspire-chip${inspireServes===o?" on":""}`} onClick={()=>setInspireServes(o)}>{o}</button>
                ))}
              </div>
            </div>
            {diets.length>0&&(
              <div style={{fontSize:12,color:C.muted,marginBottom:16,textAlign:"center"}}>
                Using your dietary filters: {diets.join(", ")}
              </div>
            )}
            <button className="inspire-go-btn" onClick={doInspire} disabled={!canGo||inspireStatus==="loading"}>
              {inspireStatus==="loading"?"Finding ideas…":"Show me ideas →"}
            </button>
          </>
        )}

        {inspireStatus==="loading"&&(
          <div className="loading-wrap"><div className="spinner"/>
            <div className="loading-text">Thinking about tonight's dinner…</div>
            <div className="loading-sub">Matching ideas to your mood</div>
          </div>
        )}

        {inspireStatus==="done"&&inspireSuggestions.length>0&&(
          <>
            <div style={{textAlign:"center",marginBottom:8}}>
              <div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",color:C.muted,fontWeight:500}}>
                {inspireTime} · {inspireVibe} · {inspireServes}
              </div>
            </div>
            <div className="inspire-results">
              {inspireSuggestions.map((s:any,i:number)=>(
                <div key={i} className="inspire-card">
                  <div className="inspire-card-title">{s.title}</div>
                  <div className="inspire-card-desc">{s.tagline}</div>
                  <div className="inspire-card-meta">
                    <span>{s.prep_time} prep</span>
                    <span>{s.cook_time} cook</span>
                    <span>{s.servings} servings</span>
                  </div>
                  <div style={{fontSize:12,color:C.sage,fontStyle:"italic",marginBottom:12}}>"{s.why}"</div>
                  <button className="inspire-card-btn" onClick={()=>pickInspiredRecipe(s)}>Get Full Recipe →</button>
                </div>
              ))}
            </div>
            <button className="inspire-reset" onClick={()=>{setInspireStatus("idle");setInspireSuggestions([]);}}>← Start over</button>
          </>
        )}
      </div>
    );
  }

  /* ── SAVED VIEW ── */
  function timeAgo(ts:number):string{
    const diff=Date.now()-ts;
    const mins=Math.floor(diff/60000);
    const hrs=Math.floor(diff/3600000);
    const days=Math.floor(diff/86400000);
    if(mins<1)return"Just now";
    if(mins<60)return`${mins}m ago`;
    if(hrs<24)return`${hrs}h ago`;
    return`${days}d ago`;
  }

  function SavedView(){
    const allRecipes=[...saved,...sharedRecipes.filter(r=>!saved.some(s=>s.id===r.id))];
    return(
      <div className="page">
        <div className="page-title">{savedTab==="saved"?"Saved Recipes":"Recipe History"}</div>
        <div className="page-sub">{savedTab==="saved"?`Your collection${familyCode?` + shared with code ${familyCode}`:""} — tap any card to view.`:"Every recipe you've generated — tap to view, save to keep permanently."}</div>
        <div className="history-tabs">
          <button className={`history-tab${savedTab==="saved"?" active":""}`} onClick={()=>setSavedTab("saved")}>Saved {saved.length>0?`(${saved.length})`:""}</button>
          <button className={`history-tab${savedTab==="history"?" active":""}`} onClick={()=>setSavedTab("history")}>History {history.length>0?`(${history.length})`:""}</button>
        </div>
        {savedTab==="history"?(
          history.length===0?(
            <div className="history-empty"><h3>No history yet</h3><p>Every recipe you generate will appear here automatically — no need to save first.</p></div>
          ):(
            <>
              <div className="history-list">
                {history.map((r:any)=>{
                  const sv=isSaved(r);
                  return(
                    <div key={r.id} className="history-item">
                      <div className="history-item-main" onClick={()=>{setRecipe(r);setServings(null);setStatus("done");setTab("search");}}>
                        <div className="history-item-title">{r.title}</div>
                        <div className="history-item-meta">
                          <span>{r.prep_time} prep</span>
                          <span>{r.cook_time} cook</span>
                          <span>{r.servings} servings</span>
                        </div>
                      </div>
                      <div className="history-item-time">{r._ts?timeAgo(r._ts):""}</div>
                      <button className={`history-item-save${sv?" saved":""}`} onClick={()=>toggleSave(r)}>
                        {sv?"♥ Saved":"♡ Save"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <button className="history-clear" onClick={()=>{if(window.confirm("Clear all history?"))setHistory([]);}}>Clear history</button>
            </>
          )
        ):(
        allRecipes.length===0?(
          <div className="empty-state"><h3>Nothing saved yet</h3><p>Search for a recipe and Save it, or scan a recipe card.</p></div>
        ):(
          <div className="cards-grid">
            {allRecipes.map((r:any)=>{
              const isSharedOnly=!saved.some(s=>s.id===r.id);
              return(
                <div key={r.id} className="recipe-card" onClick={()=>{setRecipe(r);setServings(null);setStatus("done");setTab("search");}}>
                  <div className="card-tag">{r._scanned?"Scanned Card":r._imported?"Imported":isSharedOnly?"Shared":r.seasonal_note?"Seasonal":"Saved Recipe"}</div>
                  <div className="card-title">{r.title}</div>
                  <div className="card-desc">{r.tagline}</div>
                  <div className="card-meta"><span>{r.prep_time} prep</span><span>{r.cook_time} cook</span><span>{r.servings} servings</span></div>
                  <div className="card-actions" onClick={e=>e.stopPropagation()}>
                    <button className="card-btn" onClick={()=>{setAssignDay("fromSaved_"+r.id);setTab("week");}}>+ Week</button>
                    {!isSharedOnly&&<button className="card-btn danger" onClick={()=>setSaved(l=>l.filter((s:any)=>s.id!==r.id))}>Remove</button>}
                    {isSharedOnly&&<button className="card-btn" onClick={()=>setSaved(l=>[r,...l])}>Save Mine</button>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  /* ── WEEK VIEW ── */
  function WeekView(){
    return(
      <div className="page">
        <div className="page-title">My Week</div>
        <div className="page-sub">Assign saved recipes to days. A combined grocery list appears below.</div>
        <div className="week-grid">
          {DAY_KEYS.map((key,i)=>{
            const r=plan[key];
            return(
              <div key={key} className="day-card">
                <div className="day-head"><div className="day-name">{DAYS[i].slice(0,3)}</div></div>
                <div className="day-body">
                  {r?(
                    <>
                      <div className="day-recipe-title">{r.title}</div>
                      <div className="day-recipe-meta">{r.cook_time}</div>
                      <div className="day-actions">
                        <button className="day-btn" onClick={()=>{setRecipe(r);setServings(null);setStatus("done");setTab("search");}}>View</button>
                        <button className="day-btn" onClick={()=>setPlan(p=>{const n={...p};delete n[key];return n;})}>✕</button>
                      </div>
                    </>
                  ):(
                    <button className="day-btn add" onClick={()=>setAssignDay(key)}>+ Add</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {mealsPlanned>0&&(
          <div className="consol-section">
            <div className="consol-hdr">
              <div>
                <div className="consol-title">Combined Grocery List</div>
                <p style={{fontSize:13,color:C.muted,marginTop:4}}>{consolidated.length} items across {mealsPlanned} meal{mealsPlanned!==1?"s":""}</p>
              </div>
              <div className="shop-btns">
                {retailer?(
                  <a href={RETAILERS.find(r=>r.id===retailer)?.url(consolidated[0]?.name||"")||"#"}
                    target="_blank" rel="noopener noreferrer" className="shop-btn"
                    style={{background:RETAILERS.find(r=>r.id===retailer)?.color,display:"flex",alignItems:"center",gap:5}}>
                    {Ic.cart(13)} {RETAILERS.find(r=>r.id===retailer)?.name}
                  </a>
                ):(
                  <>
                    <a href={wmUrl(consolidated[0]?.name||"")} target="_blank" rel="noopener noreferrer" className="shop-btn btn-wm" style={{display:"flex",alignItems:"center",gap:5}}>{Ic.cart(13)} Walmart</a>
                    <a href={tgUrl(consolidated[0]?.name||"")} target="_blank" rel="noopener noreferrer" className="shop-btn btn-tg" style={{display:"flex",alignItems:"center",gap:5}}>{Ic.target(13)} Target</a>
                  </>
                )}
              </div>
            </div>
            <div className="grocery-grid">
              {consolidated.map((item,i)=>(
                <div key={i} className="grocery-card">
                  <input type="checkbox" className="grocery-check"/>
                  <div className="grocery-item-wrap">
                    <div className="grocery-name">{item.name}</div>
                    {item.recipes.length>1&&<div style={{fontSize:10,color:C.muted,marginTop:1}}>{item.recipes.length} meals</div>}
                    {retailer&&(
                      <div className="grocery-shop-links">
                        <a href={RETAILERS.find(r=>r.id===retailer)?.url(item.name)||"#"}
                          target="_blank" rel="noopener noreferrer" className="grocery-shop-link">
                          {RETAILERS.find(r=>r.id===retailer)?.name}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {mealsPlanned===0&&(
          <div className="empty-state" style={{marginTop:36}}>
            <h3>Your week is open</h3>
            <p>Save some recipes, then click <strong>+ Add</strong> on any day.</p>
          </div>
        )}
      </div>
    );
  }

  /* ── FAMILY VIEW ── */
  function FamilyView(){
    return(
      <div className="family-wrap">
        <div className="page-title">Family Code</div>
        <div className="family-sub">Link your recipe collection with family or friends. Anyone with the same code sees your saved recipes and can add theirs too.</div>

        {familyCode?(
          <div className="family-current">
            <div className="family-code-label">Your Family Code</div>
            <div className="family-code-display">{familyCode}</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:10}}>Share this code with anyone you want to connect with. They enter it on their Every Chef app to join your collection.</div>
            <div className="family-code-actions">
              <button className="family-code-btn primary" onClick={()=>{navigator.clipboard?.writeText(familyCode);setFamilyStatus("Code copied to clipboard!");setFamilyStatusType("ok");}}>Copy Code</button>
              <button className="family-code-btn" onClick={()=>{syncToFamily(saved,familyCode);setFamilyStatus("Synced! Your recipes are up to date.");setFamilyStatusType("ok");}}>Sync Now</button>
              <button className="family-code-btn" onClick={leaveFamilyCode}>Leave</button>
            </div>
            {familyStatus&&<div className={`family-status ${familyStatusType}`}>{familyStatus}</div>}
          </div>
        ):(
          <div className="family-current">
            <div style={{fontSize:14,color:C.muted,marginBottom:14,lineHeight:1.6}}>You don't have a family code yet. Create one to share your recipes, or enter a code from someone else to join their collection.</div>
            <button className="family-code-btn primary" onClick={createFamilyCode}>Create a Family Code</button>
            {familyStatus&&<div className={`family-status ${familyStatusType}`} style={{marginTop:12}}>{familyStatus}</div>}
          </div>
        )}

        <div className="family-divider"><div className="family-divider-line"/><div className="family-divider-text">Join an existing code</div><div className="family-divider-line"/></div>

        <div className="family-join-wrap">
          <div className="family-join-label">Enter a code shared with you</div>
          <div className="family-join-row">
            <input className="family-join-input" placeholder="ABC123" maxLength={8}
              value={joinInput} onChange={e=>setJoinInput(e.target.value.toUpperCase())}/>
            <button className="family-join-btn" onClick={joinFamilyCode}>Join</button>
          </div>
          {!familyCode&&familyStatus&&<div className={`family-status ${familyStatusType}`} style={{marginTop:10}}>{familyStatus}</div>}
        </div>

        {sharedRecipes.length>0&&(
          <div className="family-shared-recipes">
            <div className="family-shared-title">Shared Collection</div>
            <div className="family-shared-sub">{sharedRecipes.length} recipe{sharedRecipes.length!==1?"s":""} shared under code {familyCode}</div>
            <div className="cards-grid">
              {sharedRecipes.map((r:any)=>(
                <div key={r.id} className="recipe-card" onClick={()=>{setRecipe(r);setServings(null);setStatus("done");setTab("search");}}>
                  <div className="card-tag">Shared Recipe</div>
                  <div className="card-title">{r.title}</div>
                  <div className="card-desc">{r.tagline}</div>
                  <div className="card-meta"><span>{r.prep_time} prep</span><span>{r.cook_time} cook</span></div>
                  <div className="card-actions" onClick={e=>e.stopPropagation()}>
                    <button className="card-btn" onClick={()=>setSaved(l=>[r,...l.filter((s:any)=>s.id!==r.id)])}>Save to Mine</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── MODAL ── */
  function Modal(){
    if(!assignDay)return null;
    const isRedirect=assignDay.startsWith("fromSaved_");
    const dayKey=isRedirect?null:assignDay;
    const allRecipes=[...saved,...sharedRecipes.filter(r=>!saved.some(s=>s.id===r.id))];
    return(
      <div className="modal-overlay" onClick={()=>setAssignDay(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-title">{dayKey?`Add recipe to ${DAYS[DAY_KEYS.indexOf(dayKey)]}`:"Choose a day"}</div>
          {isRedirect?(
            <div className="modal-list">
              {DAY_KEYS.map((k,i)=>{
                const rid=assignDay.replace("fromSaved_","");
                const r=allRecipes.find(s=>String(s.id)===rid);
                return(
                  <div key={k} className="modal-item" onClick={()=>{if(r){setPlan(p=>({...p,[k]:r}));setAssignDay(null);}}}>
                    <div className="modal-item-title">{DAYS[i]}</div>
                    {plan[k]&&<div className="modal-item-meta">Currently: {plan[k].title}</div>}
                  </div>
                );
              })}
            </div>
          ):(
            allRecipes.length===0?<p style={{color:C.muted,fontSize:14}}>No saved recipes yet.</p>:(
              <div className="modal-list">
                {allRecipes.map((r:any)=>(
                  <div key={r.id} className="modal-item" onClick={()=>{setPlan(p=>({...p,[dayKey!]:r}));setAssignDay(null);}}>
                    <div className="modal-item-title">{r.title}</div>
                    <div className="modal-item-meta">{r.prep_time} prep · {r.cook_time} cook</div>
                  </div>
                ))}
              </div>
            )
          )}
          <button className="modal-close" onClick={()=>setAssignDay(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  return(
    <>
      <style>{CSS}</style>
      {/* Desktop top nav */}
      <nav className="nav">
        <button className="nav-brand" onClick={()=>{setTab("search");setStatus("idle");setRecipe(null);setQuery("");}}>
          <LogoMark size={32}/>
          <div className="nav-brand-text">
            <span className="nav-brand-name">Every Chef</span>
            <span className="nav-brand-sub">The Recipe Synthesizer</span>
          </div>
        </button>
        <div className="nav-tabs">
          {([
            {key:"search",icon:Ic.search(14),label:"Search"},
            {key:"inspire",icon:Ic.inspire(14),label:"Inspire"},
            {key:"saved",icon:tab==="saved"?Ic.heartFill(14):Ic.heart(14),label:"Saved",badge:saved.length||null},
            {key:"week",icon:Ic.calendar(14),label:"Week",badge:mealsPlanned||null},
            {key:"family",icon:Ic.family(14),label:"Family",badge:familyCode?1:null},
          ] as any[]).map(({key,icon,label,badge}:any)=>(
            <button key={key} className={`nav-tab${tab===key?" active":""}`} onClick={()=>setTab(key)} style={{display:"flex",alignItems:"center",gap:5}}>
              {icon}{label}{badge?<span className="nav-badge">{badge}</span>:null}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="bottom-nav">
        <button className="bottom-nav-brand" onClick={()=>{setTab("search");setStatus("idle");setRecipe(null);setQuery("");}}>
          <span className="bnb-icon">{LogoMark({size:20})}</span>
          <span>Every Chef</span>
        </button>
        {([
          {key:"search",icon:Ic.search(20),label:"Search"},
          {key:"inspire",icon:Ic.inspire(20),label:"Inspire"},
          {key:"saved",icon:tab==="saved"?Ic.heartFill(20):Ic.heart(20),label:"Saved",badge:saved.length||null},
          {key:"week",icon:Ic.calendar(20),label:"Week",badge:mealsPlanned||null},
          {key:"family",icon:Ic.family(20),label:"Family",badge:familyCode?1:null},
        ] as any[]).map(({key,icon,label,badge}:any)=>(
          <button key={key} className={`bottom-tab${tab===key?" active":""}`} onClick={()=>setTab(key)}>
            <span className="bt-icon">{icon}</span>
            <span className="bt-label">{label}</span>
            {badge?<span className="nav-badge">{badge}</span>:null}
          </button>
        ))}
      </div>
      {tab==="search"&&SearchView()}
      {tab==="inspire"&&InspireView()}
      {tab==="saved"&&SavedView()}
      {tab==="week"&&WeekView()}
      {tab==="family"&&FamilyView()}
      {Modal()}
    </>
  );
}

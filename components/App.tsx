"use client";
import { useState, useEffect, useRef } from "react";
import { suggestSides, rankSides, SideDish } from "../lib/sides";
import { useUser, useClerk } from "@clerk/nextjs";
import { CARD_POOL, SUGGESTIONS, type CardDef } from "../lib/dishes";
import { buildPrompt } from "../lib/prompts";
import jsQR from "jsqr";

const C = {
  cream:"#FDFAF5",parchment:"#FFF0D4",brown:"#151210",
  terra:"#F4A021",sage:"#1E3A2F",muted:"#7A6E6A",
  white:"#FFFFFF",border:"#EDE8E0",overlay:"rgba(61,43,31,0.45)",
  green:"#4a6040",greenLight:"#F0F5EE",greenBorder:"#b5c9a8",
};

// Thin-stroke SVG outline icons — 1.5px stroke, no fill
const Ic = {
  search:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  refresh:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
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
  grid:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  lock:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  share:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  cook:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13h12v4a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z"/><path d="M4 13h16"/><path d="M9 9c0-2 2-2 2-4M13 9c0-2 2-2 2-4"/></svg>,
  library:(s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4v16H5zM10 4h4v16h-4z"/><path d="m15.5 5 3.8-1 2.7 15.5-3.8 1z"/></svg>,
  qrscan:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V4a1 1 0 0 1 1-1h3"/><path d="M17 3h3a1 1 0 0 1 1 1v3"/><path d="M21 17v3a1 1 0 0 1-1 1h-3"/><path d="M7 21H4a1 1 0 0 1-1-1v-3"/><rect x="7" y="7" width="4" height="4" rx="0.5"/><rect x="13" y="7" width="4" height="4" rx="0.5"/><rect x="7" y="13" width="4" height="4" rx="0.5"/><line x1="14" y1="14" x2="14" y2="14.01"/><line x1="17" y1="14" x2="17" y2="17"/><line x1="14" y1="17" x2="15.5" y2="17"/></svg>,
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9,700;1,9,700&family=Outfit:wght@300;400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  *{font-variation-settings:'opsz' 9,'WONK' 1;}
  html{background:#1A1F2E;}
  body{font-family:'Outfit',sans-serif;background:#FDFAF5;color:#151210;min-height:100vh;padding-bottom:80px;}
  @media(min-width:768px){body{padding-bottom:0;}}

  /* ── TOP NAV (desktop) — midnight ribbon ── */
  .nav{display:none;}
  @media(min-width:768px){
    .nav{
      display:grid;grid-template-columns:1fr auto 1fr;
      align-items:center;padding:0 32px;height:68px;
      background:#1A1F2E;position:sticky;top:0;z-index:100;
      border-bottom:2px solid rgba(244,160,33,.15);
    }
    .nav-brand{
      background:none;border:none;cursor:pointer;
      display:flex;align-items:baseline;gap:0.18em;
      justify-content:center;padding:0;
    }
    .nav-brand-upright{
      font-family:'Fraunces',serif;font-size:28px;font-weight:700;
      font-variation-settings:'opsz' 9,'WONK' 1;
      color:#FDFAF5;font-style:normal;letter-spacing:-0.5px;line-height:1;
    }
    .nav-brand-italic{
      font-family:'Fraunces',serif;font-size:28px;font-weight:700;
      font-variation-settings:'opsz' 9,'WONK' 1;
      color:#F4A021;font-style:italic;letter-spacing:-0.5px;line-height:1;
    }
    .nav-brand-text{display:none;}
    .nav-left{display:flex;align-items:center;}
    .nav-tabs{display:flex;gap:4px;justify-content:flex-end;}
    .nav-tab{
      padding:7px 16px;border-radius:100px;border:none;background:transparent;
      font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;
      color:rgba(253,250,245,.6);cursor:pointer;transition:all .15s;position:relative;
    }
    .nav-tab.active{background:#F4A021;color:#151210;font-weight:600;}
    .nav-tab:not(.active):hover{background:rgba(244,160,33,.15);color:#FDFAF5;}
    .nav-badge{position:absolute;top:3px;right:5px;background:#E8431A;color:#fff;font-size:9px;font-weight:700;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
  }

  /* ── MOBILE TOP HEADER ── */
  .mobile-header{
    display:flex;align-items:center;justify-content:center;
    background:#1A1F2E;height:52px;
    position:sticky;top:0;z-index:100;
    border-bottom:1px solid rgba(244,160,33,.15);
    padding:0 16px;
    box-shadow:0 -100vh 0 100vh #1A1F2E;
  }
  @media(min-width:768px){.mobile-header{display:none;}}
  .mobile-header-brand{
    background:none;border:none;cursor:pointer;
    display:flex;align-items:baseline;gap:0.18em;padding:0;
  }
  .mobile-header-upright{
    font-family:'Fraunces',serif;font-weight:700;
    font-variation-settings:'opsz' 9,'WONK' 1;
    font-size:26px;color:#FDFAF5;font-style:normal;letter-spacing:-0.5px;line-height:1;
  }
  .mobile-header-italic{
    font-family:'Fraunces',serif;font-weight:700;
    font-variation-settings:'opsz' 9,'WONK' 1;
    font-size:26px;color:#F4A021;font-style:italic;letter-spacing:-0.5px;line-height:1;
  }
  .mobile-header-auth{position:absolute;right:16px;background:none;border:none;cursor:pointer;padding:0;display:flex;align-items:center;}
  .mobile-signin-btn{font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;color:rgba(253,250,245,.7);border:1.5px solid rgba(244,160,33,.4);border-radius:100px;padding:5px 14px;background:transparent;cursor:pointer;transition:all .15s;}
  .mobile-signin-btn:hover{background:rgba(244,160,33,.15);color:#FDFAF5;}

  /* ── BOTTOM NAV (mobile) ── */
  .bottom-nav{
    display:flex;position:fixed;bottom:0;left:0;right:0;z-index:100;
    background:#fff;border-top:1px solid #EDE8E0;
    padding:0 8px;
    padding-bottom:max(env(safe-area-inset-bottom,0px),12px);
    height:calc(72px + max(env(safe-area-inset-bottom,0px),12px));
    align-items:flex-start;
    padding-top:10px;
    transition:transform .25s ease;
  }
  .bottom-nav.hidden{transform:translateY(100%);}
  @media(min-width:768px){.bottom-nav{display:none;}}
  .bottom-nav-brand{
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:4px 8px 4px;background:none;border:none;cursor:pointer;
    flex:1.2;gap:2px;
  }
  .bnb-app-icon{
    width:32px;height:32px;background:#1A1F2E;border-radius:8px;
    display:flex;align-items:center;justify-content:center;
    font-family:'Fraunces',serif;font-weight:700;font-style:italic;
    font-variation-settings:'opsz' 9,'WONK' 1;
    font-size:20px;color:#F4A021;line-height:1;
    letter-spacing:-1px;
  }
  .bnb-label{
    font-family:'Outfit',sans-serif;font-size:9px;font-weight:500;
    letter-spacing:1px;text-transform:uppercase;color:#151210;line-height:1;
  }
  .bottom-nav-brand .bnb-icon{display:none;}
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

  /* ── AUTH ── */
  .auth-btn{padding:6px 16px;border-radius:100px;border:1.5px solid rgba(244,160,33,.4);background:transparent;font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;color:rgba(253,250,245,.8);cursor:pointer;transition:all .15s;white-space:nowrap;}
  .auth-btn:hover{background:rgba(244,160,33,.15);border-color:#F4A021;color:#FDFAF5;}
  .auth-user{display:flex;align-items:center;gap:8px;}
  .auth-avatar{width:30px;height:30px;border-radius:50%;border:2px solid #F4A021;object-fit:cover;cursor:pointer;}
  .auth-avatar-placeholder{width:30px;height:30px;border-radius:50%;background:#F4A021;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:13px;font-weight:700;color:#1A1F2E;cursor:pointer;flex-shrink:0;}
  .account-wrap{position:relative;}
  .account-dropdown{position:absolute;top:calc(100% + 10px);left:0;background:#fff;border:1px solid #EDE8E0;border-radius:14px;padding:6px;min-width:220px;box-shadow:0 8px 32px rgba(26,31,46,.18);z-index:200;}
  .account-dropdown-user{padding:12px 14px 10px;border-bottom:1px solid #EDE8E0;margin-bottom:6px;}
  .account-dropdown-name{font-family:'Fraunces',serif;font-size:15px;font-weight:700;color:#151210;margin-bottom:2px;}
  .account-dropdown-email{font-size:12px;color:#7A6E6A;}
  .account-dropdown-item{display:flex;align-items:center;gap:10px;width:100%;padding:9px 14px;border:none;background:transparent;font-family:'Outfit',sans-serif;font-size:13px;color:#151210;cursor:pointer;border-radius:8px;text-align:left;transition:background .12s;}
  .account-dropdown-item:hover{background:#FFF8F2;}
  .account-dropdown-item.danger{color:#E8431A;}
  .account-dropdown-item.danger:hover{background:#FEF2F0;}
  .account-sheet-overlay{position:fixed;inset:0;background:rgba(26,31,46,.5);z-index:300;display:flex;align-items:flex-end;}
  .account-sheet{background:#FDFAF5;border-radius:24px 24px 0 0;padding:0 0 max(env(safe-area-inset-bottom,0px),24px);width:100%;box-shadow:0 -8px 40px rgba(26,31,46,.2);}
  .account-sheet-handle{width:36px;height:4px;background:#EDE8E0;border-radius:2px;margin:14px auto 0;}
  .account-sheet-user{padding:20px 24px 16px;border-bottom:1px solid #EDE8E0;display:flex;align-items:center;gap:14px;}
  .account-sheet-avatar{width:44px;height:44px;border-radius:50%;border:2px solid #F4A021;object-fit:cover;flex-shrink:0;}
  .account-sheet-avatar-placeholder{width:44px;height:44px;border-radius:50%;background:#F4A021;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:20px;font-weight:700;color:#1A1F2E;flex-shrink:0;}
  .account-sheet-name{font-family:'Fraunces',serif;font-size:18px;font-weight:700;color:#151210;}
  .account-sheet-email{font-size:13px;color:#7A6E6A;margin-top:2px;}
  .account-sheet-actions{padding:10px 16px;}
  .account-sheet-btn{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;border:none;background:transparent;font-family:'Outfit',sans-serif;font-size:15px;color:#151210;cursor:pointer;border-radius:12px;text-align:left;transition:background .12s;}
  .account-sheet-btn:hover{background:#F5F0EA;}
  .account-sheet-btn.danger{color:#E8431A;}
  .account-sheet-btn.danger:hover{background:#FEF2F0;}
  .account-sheet-cancel{width:calc(100% - 32px);margin:0 16px 8px;padding:14px;background:#fff;border:1.5px solid #EDE8E0;border-radius:12px;font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;color:#151210;cursor:pointer;text-align:center;}
  .signout-confirm-overlay{position:fixed;inset:0;background:rgba(26,31,46,.6);z-index:400;display:flex;align-items:center;justify-content:center;padding:24px;}
  .signout-confirm{background:#FDFAF5;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;}
  .signout-confirm-title{font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:#151210;margin-bottom:8px;}
  .signout-confirm-sub{font-size:14px;color:#7A6E6A;line-height:1.5;margin-bottom:24px;}
  .signout-confirm-btns{display:flex;gap:10px;}
  .signout-confirm-cancel{flex:1;padding:12px;background:#fff;border:1.5px solid #EDE8E0;border-radius:10px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;color:#151210;cursor:pointer;}
  .signout-confirm-go{flex:1;padding:12px;background:#E8431A;border:none;border-radius:10px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;color:#fff;cursor:pointer;}
  /* Save prompt modal */
  .save-prompt-overlay{position:fixed;inset:0;background:rgba(26,31,46,.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;}
  .save-prompt{background:#FDFAF5;border-radius:24px;padding:32px 28px;max-width:380px;width:100%;text-align:center;}
  .save-prompt-icon{font-size:40px;margin-bottom:16px;}
  .save-prompt-title{font-family:'Fraunces',serif;font-size:24px;font-weight:700;color:#1A1F2E;margin-bottom:8px;letter-spacing:-0.5px;}
  .save-prompt-sub{font-size:14px;color:#7A6E6A;line-height:1.5;margin-bottom:24px;}
  .save-prompt-btn{width:100%;padding:13px;background:#F4A021;color:#151210;border:none;border-radius:12px;font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;}
  .save-prompt-skip{background:none;border:none;font-family:'Outfit',sans-serif;font-size:13px;color:#7A6E6A;cursor:pointer;text-decoration:underline;text-underline-offset:3px;}

  /* ── HERO — Every Chef ── */
  .hero{position:relative;overflow:hidden;padding:32px 24px 28px;text-align:center;background:#FDFAF5;border-bottom:1px solid #EDE8E0;}
  @media(max-width:640px){.hero{padding:28px 20px 24px;}}
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
  .hero-eyebrow{display:none;}
  .hero-eyebrow-pre{display:none;}
  .hero-eyebrow-name{font-family:'Fraunces',serif;font-size:40px;font-weight:700;font-variation-settings:'opsz' 9,'WONK' 1;letter-spacing:-1px;line-height:1;display:flex;align-items:baseline;gap:0.18em;}
  .hero-eyebrow-name .wm-upright{color:#1A1F2E;font-style:normal;}
  .hero-eyebrow-name .wm-italic{color:#F4A021;font-style:italic;}
  .hero-eyebrow-sub{font-family:'Outfit',sans-serif;font-size:10px;font-weight:500;color:#7A6E6A;letter-spacing:2px;text-transform:uppercase;}
  .hero-title{font-family:'Fraunces',serif;font-size:clamp(30px,6vw,52px);line-height:1.05;margin-bottom:0;color:#151210;font-weight:700;font-variation-settings:'opsz' 9,'WONK' 1;letter-spacing:-0.5px;}
  @media(max-width:767px){.hero-title{margin-top:4px;}}
  .hero-title em{color:#F4A021;font-style:italic;position:relative;}
  .hero-rule-wrap{display:none;}
  .hero-sub{font-size:14px;color:#7A6E6A;font-weight:300;line-height:1.6;max-width:480px;margin:10px auto 20px;text-align:center;}
  .hero-sub strong{color:#151210;font-weight:600;}
  .hero-mode-desc{font-size:12px;color:#B8B0A8;text-align:center;margin:8px auto 0;max-width:340px;line-height:1.5;}
  /* Trending strip */
  .trending-strip{padding:20px 20px 0;max-width:960px;margin:0 auto;}
  .trending-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7A6E6A;font-weight:600;display:flex;align-items:center;gap:6px;margin-bottom:10px;}
  .trending-scroll{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;padding-right:28px;-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 28px),transparent);}
  .trending-scroll::-webkit-scrollbar{display:none;}
  .trending-card{flex-shrink:0;width:150px;display:flex;flex-direction:column;justify-content:space-between;background:#fff;border:1.5px solid #EDE8E0;border-radius:14px;padding:10px 14px;cursor:pointer;transition:all .15s;}
  .trending-card:hover{border-color:#E8431A;box-shadow:0 4px 12px rgba(232,67,26,.1);}
  .side-toggle-wrap{max-width:960px;margin:0 auto;padding:0 24px;}
  .side-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;background:#fff;border:1.5px solid #EDE8E0;border-radius:14px;padding:14px 18px;margin-top:16px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;color:#151210;cursor:pointer;transition:border-color .15s;}
  .side-toggle:hover{border-color:#1E3A2F;}
  .side-toggle-chevron{display:flex;color:#7A6E6A;transition:transform .2s ease;}
  .side-toggle-chevron.open{transform:rotate(180deg);}
  .side-panel{padding:14px 0 4px;}
  .side-panel-row{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;}
  .side-card{flex:1 1 0;min-width:170px;max-width:260px;background:#fff;border:1.5px solid #EDE8E0;border-radius:14px;padding:12px 14px;cursor:pointer;transition:all .15s;}
  .side-card:hover{border-color:#1E3A2F;box-shadow:0 4px 12px rgba(30,58,47,.08);}
  .side-card-title{font-family:'Fraunces',serif;font-weight:700;font-size:13.5px;color:#151210;margin-bottom:3px;}
  .side-card-tagline{font-size:12px;color:#7A6E6A;line-height:1.4;}
  .side-panel-more{display:block;margin:10px auto 0;background:none;border:none;color:#1E3A2F;text-decoration:underline;font-size:12.5px;cursor:pointer;font-family:'Outfit',sans-serif;}
  .side-panel-more:hover{color:#E8431A;}

  /* Swipeable main-dish / paired-side pane */
  .dish-swipe-outer{overflow:hidden;}
  .dish-switcher{display:flex;gap:6px;max-width:960px;margin:0 auto;padding:16px 24px 0;}
  .dish-switch-btn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:6px;font-family:'Outfit',sans-serif;font-size:12.5px;font-weight:600;padding:9px 14px;border-radius:100px;border:1.5px solid #EDE8E0;background:#fff;color:#7A6E6A;cursor:pointer;transition:all .15s;}
  .dish-switch-btn.active{background:#1A1F2E;border-color:#1A1F2E;color:#FDFAF5;}
  .dish-switch-add{flex-shrink:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1;font-weight:600;border-radius:100px;border:1.5px dashed #B8B0A8;background:#fff;color:#7A6E6A;cursor:pointer;transition:all .15s;}
  .dish-switch-add:hover{border-color:#E8431A;border-style:solid;color:#E8431A;}
  .add-side-panel{max-width:960px;margin:10px auto 0;padding:0 24px;}
  .add-side-tabs{display:flex;gap:6px;margin-bottom:10px;}
  .add-side-tab{background:none;border:none;border-bottom:2px solid transparent;padding:4px 2px 8px;font-family:'Outfit',sans-serif;font-size:12.5px;font-weight:600;color:#B8B0A8;cursor:pointer;}
  .add-side-tab.active{color:#151210;border-bottom-color:#F4A021;}
  .add-side-empty{font-size:12.5px;color:#B8B0A8;padding:10px 2px;}
  .add-side-search-input{width:100%;padding:10px 14px;border:2px solid #151210;border-radius:10px;font-family:'Outfit',sans-serif;font-size:13px;color:#151210;outline:none;background:#fff;box-sizing:border-box;}
  .add-side-results{display:flex;flex-direction:column;gap:4px;margin-top:10px;max-height:220px;overflow-y:auto;}
  .add-side-result{display:flex;align-items:center;gap:8px;text-align:left;background:#fff;border:1px solid #EDE8E0;border-radius:10px;padding:9px 12px;font-family:'Outfit',sans-serif;font-size:13px;color:#151210;cursor:pointer;transition:border-color .15s;}
  .add-side-result:hover{border-color:#1E3A2F;}
  .dish-swipe-hint{text-align:center;font-size:11px;color:#B8B0A8;padding:8px 24px 0;}
  @media(min-width:768px){.dish-swipe-hint{display:none;}}
  .dish-swipe-track{display:flex;align-items:flex-start;width:200%;transition:transform .28s cubic-bezier(.4,0,.2,1);touch-action:pan-y;}
  .dish-swipe-pane{width:50%;flex-shrink:0;}
  .side-pane-page{padding-bottom:40px;}
  .side-pane-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:80px 24px;text-align:center;}
  .side-pane-fullpage{display:block;margin:16px 0 0;background:none;border:none;color:#7A6E6A;text-decoration:underline;font-size:12.5px;cursor:pointer;font-family:'Outfit',sans-serif;}
  .side-pane-fullpage:hover{color:#1E3A2F;}
  .trending-card-title{font-family:'Fraunces',serif;font-size:13px;font-weight:700;color:#151210;line-height:1.2;text-wrap:balance;overflow-wrap:break-word;}
  .trending-card-badge{font-size:9px;color:#E8431A;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:3px;}
  .search-wrap{max-width:560px;margin:0 auto;}
  .home-mode-toggle{position:relative;display:flex;background:#F0ECE6;border-radius:100px;padding:3px;gap:2px;max-width:340px;margin:0 auto 18px;}
  .home-mode-slider{position:absolute;top:3px;left:3px;width:calc((100% - 10px) / 3);height:calc(100% - 6px);background:#1A1F2E;border-radius:100px;transition:transform .22s cubic-bezier(.4,0,.2,1);pointer-events:none;z-index:0;}
  .home-mode-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 10px;border-radius:100px;border:none;background:transparent;font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;color:#7A6E6A;cursor:pointer;transition:color .15s;white-space:nowrap;position:relative;z-index:1;}
  .home-mode-btn.active{color:#FDFAF5;}
  .home-mode-btn:not(.active):hover{color:#151210;}
  .home-inspire-wrap{width:100%;max-width:680px;margin:0 auto;text-align:left;}
  .search-bar{display:flex;background:#fff;border:1.5px solid #EDE8E0;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(21,18,16,.05);}
  .search-bar:focus-within{border-color:#1A1F2E;box-shadow:0 2px 12px rgba(21,18,16,.1);}
  .search-input{flex:1;border:none;outline:none;padding:14px 16px;font-family:'Outfit',sans-serif;font-size:14px;color:#151210;background:transparent;font-weight:400;}
  .search-input::placeholder{color:#B8B0A8;}
  .search-btn{margin:6px;padding:10px 20px;background:#F4A021;color:#151210;border:none;border-radius:10px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s;white-space:nowrap;display:flex;align-items:center;gap:6px;}
  .search-btn:hover:not(:disabled){background:#D88815;}
  .search-btn:disabled{opacity:.5;cursor:not-allowed;}

  /* Filters — cream background */
  .filter-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7A6E6A;margin:14px 0 8px;text-align:center;}
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
  /* ── EVERY CHEF MOSAIC CARDS ── */
  .fl-wrap{width:100%;max-width:960px;margin:0 auto;text-align:left;padding-bottom:120px;}
  .fl-lede{margin:6px 0 16px;font-size:16px;line-height:1.5;color:#4F4744;}
  .fl-bar{margin:0 -20px 16px;}
  .fl-cats{display:flex;gap:8px;overflow-x:auto;padding:0 20px 2px;scrollbar-width:none;}
  .fl-cats::-webkit-scrollbar{display:none;}
  @media(min-width:768px){.fl-bar{margin:0 0 18px;}.fl-cats{flex-wrap:wrap;overflow:visible;padding:0;}}
  .fl-grid{display:grid;grid-template-columns:1fr;gap:10px;}
  @media(min-width:640px){.fl-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}}
  .fl-card{position:relative;display:flex;flex-direction:column;gap:4px;text-align:left;padding:16px 48px 16px 18px;background:#fff;border:1px solid #ECE6DD;border-radius:18px;cursor:pointer;font-family:'Outfit',sans-serif;transition:border-color .15s,box-shadow .15s;}
  .fl-card:hover{border-color:#CFC6B8;box-shadow:0 4px 16px rgba(26,31,46,.08);}
  .fl-card:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .fl-card-cat{font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#8A5A0B;}
  .fl-card-title{font-family:'Fraunces',serif;font-size:20px;font-weight:600;line-height:1.2;color:#151210;}
  .fl-card-desc{font-size:15px;line-height:1.45;color:#4F4744;}
  .fl-card-go{position:absolute;right:16px;top:50%;transform:translateY(-50%);color:#9A8F88;display:flex;}
  .fl-shuffle{margin:18px auto 0;min-height:48px;padding:0 22px;border-radius:24px;border:1px solid #CFC6B8;background:#fff;color:#151210;font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer;}
  .fl-shuffle:hover{border-color:#1A1F2E;}
  .mosaic-section{padding:32px 20px 8px;max-width:960px;margin:0 auto;}
  @media(min-width:768px){.mosaic-section{padding:32px 28px 8px;}}
  .mosaic-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
  .mosaic-title{font-family:'Fraunces',serif;font-size:20px;color:#151210;font-weight:700;}
  .mosaic-title em{color:#F4A021;font-style:italic;}
  .mosaic-cat-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-bottom:14px;scrollbar-width:none;}
  .mosaic-cat-tabs::-webkit-scrollbar{display:none;}
  .mosaic-cat-tab{padding:5px 14px;border-radius:100px;border:1.5px solid #EDE8E0;background:#fff;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;color:#7A6E6A;cursor:pointer;transition:all .15s;white-space:nowrap;flex-shrink:0;}
  .mosaic-cat-tab.active{background:#1A1F2E;border-color:#1A1F2E;color:#FDFAF5;}
  .mosaic-cat-tab:not(.active):hover{border-color:#151210;color:#151210;}
  .mosaic-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
  @media(max-width:640px){.mosaic-grid{grid-template-columns:repeat(2,1fr);gap:10px;}}
  .mosaic-card{border-radius:16px;overflow:hidden;cursor:pointer;background:#fff;box-shadow:0 2px 8px rgba(21,18,16,.07),0 1px 2px rgba(21,18,16,.04);transition:transform .15s,box-shadow .15s;}
  .mosaic-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(21,18,16,.13);}
  .mosaic-card-header{padding:14px 14px 12px;display:flex;flex-direction:column;justify-content:flex-end;border-bottom:1px solid #F0ECE6;}
  .mosaic-card-header-title{font-family:'Fraunces',serif;font-size:15px;font-weight:700;line-height:1.2;margin-bottom:4px;color:#151210;}
  .mosaic-card-header-desc{font-size:10px;font-weight:400;line-height:1.3;color:#7A6E6A;}
  .mosaic-card-body{padding:8px 14px 12px;display:flex;align-items:center;justify-content:space-between;}
  .mosaic-card-category{font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:0;}
  .mosaic-card-meta{font-size:10px;color:#7A6E6A;margin-top:2px;}

  .suggestions{display:none;}
  .suggestion-chip{display:none;}

  /* ── IMPORT PAIR (scan + url) ── */
  .import-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:860px;margin:0 auto;}
  @media(max-width:640px){.import-pair{grid-template-columns:1fr;}}
  .import-card{background:#fff;border:2px solid #EDE8E0;border-radius:18px;padding:24px;display:flex;flex-direction:column;gap:0;transition:border-color .15s,box-shadow .15s;text-align:center;align-items:center;}
  .import-card-action{margin-top:auto;width:100%;}
  .import-card:hover{border-color:#F4A021;box-shadow:4px 4px 0 #F4A021;}
  .import-card-eyebrow{font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#7A6E6A;margin-bottom:12px;}
  .import-card-icon{width:40px;height:40px;background:#1A1F2E;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#F4A021;margin-bottom:14px;flex-shrink:0;}
  .import-card-title{font-family:'Fraunces',serif;font-size:20px;font-weight:700;color:#151210;margin-bottom:6px;line-height:1.15;}
  .import-card-title em{color:#F4A021;font-style:italic;}
  .import-card-desc{font-size:13px;color:#7A6E6A;line-height:1.6;margin-bottom:18px;flex:1;}
  /* Scan specific */
  .import-scan-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;background:#151210;color:#FDFAF5;border:none;border-radius:100px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;}
  .import-scan-btn:hover{background:#1E3A2F;}
  .import-scan-btn-ghost{background:transparent;color:#151210;border:1.5px solid #151210;}
  .import-scan-btn-ghost:hover{background:#151210;color:#FDFAF5;}
  .scan-preview{width:100%;max-height:180px;object-fit:contain;border-radius:10px;margin-bottom:12px;border:1px solid #EDE8E0;}
  .scan-actions{display:flex;gap:8px;}
  .scan-go-btn{padding:9px 22px;background:#F4A021;color:#151210;border:none;border-radius:100px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;}
  .scan-go-btn:hover:not(:disabled){background:#D88815;}
  .scan-go-btn:disabled{opacity:.5;cursor:not-allowed;}
  .scan-clear-btn{padding:9px 16px;background:transparent;border:1.5px solid #EDE8E0;border-radius:100px;font-family:'Outfit',sans-serif;font-size:13px;color:#7A6E6A;cursor:pointer;}
  .scan-success{padding:10px 14px;background:#F0F5EE;border:1px solid #1E3A2F;border-radius:10px;font-size:13px;color:#4a6040;margin-top:10px;}
  /* URL specific */
  .import-url-row{display:flex;gap:8px;margin-bottom:0;}
  .import-url-input{flex:1;padding:10px 14px;border:2px solid #151210;border-radius:10px;font-family:'Outfit',sans-serif;font-size:13px;color:#151210;outline:none;background:#fff;transition:border-color .15s,box-shadow .15s;box-shadow:2px 2px 0 #151210;min-width:0;}
  .import-url-input:focus{border-color:#F4A021;box-shadow:2px 2px 0 #F4A021;}
  .import-url-input::placeholder{color:#7A6E6A;}
  .import-url-btn{padding:10px 18px;background:#F4A021;color:#151210;border:none;border-radius:10px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .15s;flex-shrink:0;}
  .import-url-btn:hover:not(:disabled){background:#D88815;}
  .import-url-btn:disabled{opacity:.5;cursor:not-allowed;}
  .import-status-ok{padding:9px 12px;background:#F0F5EE;border:1px solid #b5c9a8;border-radius:8px;font-size:12px;color:#4a6040;margin-top:10px;}
  .import-status-err{font-size:12px;color:#E8431A;margin-top:8px;}

  /* Loading overlay */
  .loading-overlay{position:fixed;inset:0;z-index:200;background:rgba(253,250,245,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;}
  .loading-card{background:#fff;border:1px solid #EDE8E0;border-radius:20px;padding:36px 48px;text-align:center;box-shadow:0 8px 40px rgba(26,31,46,.1);min-width:240px;}
  .loading-icon-wrap{width:72px;height:72px;margin:0 auto 20px;position:relative;}
  .loading-icon{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;animation:iconFade 8s ease-in-out infinite;}
  .loading-icon img{width:72px;height:72px;object-fit:contain;}
  .loading-icon:nth-child(1){animation-delay:0s;}
  .loading-icon:nth-child(2){animation-delay:2s;}
  .loading-icon:nth-child(3){animation-delay:4s;}
  .loading-icon:nth-child(4){animation-delay:6s;}
  @keyframes iconFade{
    0%{opacity:0;transform:scale(.88);}
    6%{opacity:1;transform:scale(1);}
    19%{opacity:1;transform:scale(1);}
    25%{opacity:0;transform:scale(.88);}
    100%{opacity:0;transform:scale(.88);}
  }
  .spinner{width:36px;height:36px;border:2.5px solid #EDE8E0;border-top-color:#F4A021;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 20px;}
  @keyframes spin{to{transform:rotate(360deg);}}
  .loading-text{font-family:'Fraunces',serif;font-size:18px;font-style:italic;color:#151210;}
  .loading-sub{font-size:13px;color:#7A6E6A;margin-top:6px;}

  /* ── PREMIUM RECIPE PAGE ── */
  .recipe-page{max-width:860px;margin:0 auto;padding:0 0 80px;}
  .recipe-top-back{display:inline-flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;color:#7A6E6A;padding:16px 20px 0;margin:0;}
  .recipe-top-back:hover{color:#E8431A;}
  @media(min-width:640px){.recipe-top-back{padding:16px 0 0;max-width:920px;margin:0 auto;display:flex;}}

  /* Recipe banner — warm dark */
  .recipe-banner{
    background:#1A1F2E;
    padding:20px 28px 0;
    border-radius:16px;
    overflow:hidden;
    margin:16px auto 0;
    max-width:920px;
    position:relative;
    display:grid;
    grid-template-columns:1fr auto;
    gap:12px;
    align-items:start;
  }
  .recipe-banner::before{content:"";position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(244,160,33,.07) 0%,transparent 70%);pointer-events:none;}
  .recipe-banner::after{content:none;}
  .recipe-banner > *{position:relative;z-index:1;}
  @media(max-width:640px){
    .recipe-banner{grid-template-columns:1fr;padding:16px 16px 0;margin:10px 10px 0;border-radius:14px;gap:10px;}
  }
  .recipe-banner-eyebrow{
    font-size:9px;letter-spacing:3px;text-transform:uppercase;
    color:#F4A021;margin-bottom:6px;font-weight:500;opacity:.7;
  }
  .recipe-banner-title{
    font-family:'Fraunces',serif;
    font-size:clamp(18px,3vw,28px);
    line-height:1.1;
    color:#fff;
    margin-bottom:4px;
    font-weight:700;
  }
  .recipe-banner-title em{color:#F4A021;font-style:italic;}
  .recipe-banner-desc{
    font-size:12px;color:rgba(255,255,255,.45);
    line-height:1.5;margin-bottom:0;font-weight:300;max-width:480px;
  }
  .recipe-banner-meta{
    display:flex;gap:0;
    border-top:1px solid rgba(255,255,255,.08);
    padding:12px 0;margin-top:14px;
    grid-column:1 / -1;
  }
  .recipe-banner-meta-item{
    flex:1;text-align:center;padding:0 12px;
    border-right:1px solid rgba(255,255,255,.06);
  }
  .recipe-banner-meta-item:last-child{border-right:none;}
  .recipe-banner-meta-label{
    font-size:9px;letter-spacing:2px;text-transform:uppercase;
    color:rgba(255,255,255,.3);margin-bottom:3px;font-weight:500;
  }
  .recipe-banner-meta-value{
    font-family:'Fraunces',serif;font-size:16px;color:#fff;font-weight:700;
  }
  .recipe-banner-actions{display:flex;gap:8px;padding-top:2px;flex-shrink:0;}
  .save-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:100px;padding:7px 14px;font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;cursor:pointer;color:rgba(255,255,255,.75);display:flex;align-items:center;gap:5px;transition:all .15s;}
  .save-btn:hover{background:rgba(255,255,255,.18);}
  .save-btn.saved{background:#F4A021;border-color:#F4A021;color:#151210;}
  .print-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:100px;padding:7px 14px;font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;cursor:pointer;color:rgba(255,255,255,.75);display:flex;align-items:center;gap:5px;transition:all .15s;}
  .print-btn:hover{background:rgba(255,255,255,.18);}
  .icon-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:100px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(255,255,255,.75);transition:all .15s;flex-shrink:0;}
  .icon-btn:hover{background:rgba(255,255,255,.2);}
  /* Recipe photo hero */
  .recipe-banner-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35;border-radius:16px;}
  /* Edit recipe panel */
  .edit-panel-overlay{position:fixed;inset:0;background:rgba(26,31,46,.6);z-index:300;display:flex;align-items:flex-end;}
  @media(min-width:768px){.edit-panel-overlay{align-items:center;justify-content:center;}}
  .edit-panel{background:#FDFAF5;border-radius:24px 24px 0 0;width:100%;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;}
  @media(min-width:768px){.edit-panel{border-radius:20px;max-width:600px;max-height:80vh;}}
  .edit-panel-handle{width:36px;height:4px;background:#EDE8E0;border-radius:2px;margin:14px auto 0;flex-shrink:0;}
  .edit-panel-header{padding:16px 20px 12px;border-bottom:1px solid #EDE8E0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
  .edit-panel-title{font-family:'Fraunces',serif;font-size:18px;color:#151210;}
  .edit-panel-close{background:none;border:none;cursor:pointer;font-size:20px;color:#7A6E6A;padding:0;line-height:1;}
  .edit-panel-body{overflow-y:auto;flex:1;padding:16px 20px;}
  .edit-section-label{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#E8431A;margin-bottom:10px;margin-top:16px;}
  .edit-section-label:first-child{margin-top:0;}
  .edit-ing-row{display:flex;gap:8px;align-items:center;margin-bottom:8px;}
  .edit-ing-amt{width:104px;padding:8px 10px;border:1.5px solid #EDE8E0;border-radius:8px;font-family:'Outfit',sans-serif;font-size:13px;color:#151210;outline:none;flex-shrink:0;}
  .edit-ing-amt:focus{border-color:#F4A021;}
  .edit-ing-name{flex:1;padding:8px 10px;border:1.5px solid #EDE8E0;border-radius:8px;font-family:'Outfit',sans-serif;font-size:13px;color:#151210;outline:none;}
  .edit-ing-name:focus{border-color:#F4A021;}
  .edit-delete-btn{width:28px;height:28px;border:none;background:none;cursor:pointer;color:#D4CCC0;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:color .12s;}
  .edit-delete-btn:hover{color:#E8431A;}
  .edit-add-btn{display:flex;align-items:center;gap:6px;background:none;border:1.5px dashed #EDE8E0;border-radius:8px;padding:8px 14px;font-family:'Outfit',sans-serif;font-size:13px;color:#7A6E6A;cursor:pointer;width:100%;justify-content:center;margin-top:4px;transition:all .15s;}
  .edit-add-btn:hover{border-color:#F4A021;color:#F4A021;}
  .edit-step-row{display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;}
  .edit-step-num{width:24px;height:24px;border-radius:50%;background:#151210;color:#FDFAF5;font-family:'Fraunces',serif;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:8px;}
  .edit-step-text{flex:1;padding:8px 10px;border:1.5px solid #EDE8E0;border-radius:8px;font-family:'Outfit',sans-serif;font-size:13px;color:#151210;outline:none;resize:vertical;min-height:60px;line-height:1.5;}
  .edit-step-text:focus{border-color:#F4A021;}
  .edit-panel-footer{padding:14px 20px;border-top:1px solid #EDE8E0;flex-shrink:0;}
  .edit-save-btn{width:100%;padding:13px;background:#F4A021;color:#151210;border:none;border-radius:12px;font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;cursor:pointer;}
  /* Text size toggle */
  .text-size-btn{background:none;border:1.5px solid #EDE8E0;border-radius:100px;padding:4px 10px;font-family:'Outfit',sans-serif;font-size:11px;font-weight:600;color:#7A6E6A;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:4px;}
  .text-size-btn:hover{border-color:#151210;color:#151210;}
  .seasonal-note{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:rgba(244,160,33,.1);border:1px solid rgba(244,160,33,.25);border-radius:100px;font-size:11px;color:rgba(244,160,33,.8);margin-bottom:10px;}

  /* Serving scaler — on banner */
  .scaler{display:inline-flex;align-items:center;border:1px solid rgba(255,255,255,.15);border-radius:100px;overflow:hidden;margin:0 auto;}
  .scaler-btn{width:28px;height:28px;border:none;background:rgba(255,255,255,.08);font-size:14px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;transition:background .12s;font-family:'Outfit',sans-serif;}
  .scaler-btn:hover{background:rgba(244,160,33,.2);}
  .scaler-val{padding:0 10px;font-family:'Fraunces',serif;font-size:16px;font-weight:700;color:#fff;white-space:nowrap;}
  .scaler-wrap{display:flex;flex-direction:column;align-items:center;gap:4px;}
  .scaler-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(244,160,33,.6);font-weight:500;}

  /* Recipe body */
  .recipe-body{padding:36px 32px 0;}
  @media(max-width:640px){.recipe-body{padding:28px 20px 0;}}

  /* Ingredients */
  .two-col{display:grid;grid-template-columns:260px 1fr;gap:48px;align-items:start;}
  @media(max-width:640px){.two-col{grid-template-columns:1fr;gap:32px;}}
  .section-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#E8431A;margin-bottom:16px;font-weight:700;}
  .ing-group{margin-bottom:20px;}
  .ing-group:last-child{margin-bottom:0;}
  .ing-group-label{
    font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;
    letter-spacing:1.5px;text-transform:uppercase;
    color:#151210;padding:7px 0 6px;
    border-bottom:2px solid #F4A021;margin-bottom:2px;display:inline-block;
  }
  .ing-list{list-style:none;}
  .ing-item{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #EDE8E0;font-size:14px;line-height:1.4;}
  .ing-item:last-child{border-bottom:none;}
  .ing-dot{width:6px;height:6px;border-radius:50%;background:#F4A021;flex-shrink:0;}
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
  .grocery-name{font-size:13px;font-weight:600;line-height:1.3;color:#151210;}
  .grocery-entries{margin-top:5px;display:flex;flex-direction:column;gap:3px;}
  .grocery-entry{font-size:11px;color:#7A6E6A;line-height:1.3;display:flex;align-items:baseline;gap:4px;}
  .grocery-entry-amount{color:#F4A021;font-weight:600;flex-shrink:0;}
  .grocery-entry-recipe{color:#B8B0A8;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .grocery-shop-link{font-size:10px;padding:1px 6px;border-radius:100px;text-decoration:none;border:1px solid #EDE8E0;color:#7A6E6A;transition:all .12s;}
  .grocery-shop-link:hover{border-color:#0071CE;color:#0071CE;}
  .grocery-shop-link.tg:hover{border-color:#CC0000;color:#CC0000;}

  /* Remix — saffron card */
  .remix-section{padding:18px 22px 20px;background:#FFF0D4;border:1.5px solid #F4A021;border-radius:16px;}
  @media(max-width:640px){.remix-section{padding:16px 18px 18px;border-radius:14px;}}
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
  /* Saved search + category */
  .saved-search-wrap{position:relative;margin-bottom:20px;}
  .saved-search-input{width:100%;padding:11px 16px 11px 42px;border:2px solid #EDE8E0;border-radius:12px;font-family:'Outfit',sans-serif;font-size:14px;color:#151210;outline:none;background:#fff;transition:border-color .15s;box-sizing:border-box;}
  .saved-search-input:focus{border-color:#F4A021;}
  .saved-search-input::placeholder{color:#7A6E6A;}
  .saved-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#7A6E6A;pointer-events:none;}
  .saved-category-section{margin-bottom:24px;}
  .saved-category-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#E8431A;margin-bottom:12px;display:flex;align-items:center;gap:10px;}
  .saved-category-label::after{content:"";flex:1;height:1px;background:#EDE8E0;}
  /* Category override */
  .cat-edit-btn{font-size:10px;color:#7A6E6A;background:none;border:none;cursor:pointer;text-decoration:underline;margin-left:8px;font-family:'Outfit',sans-serif;}
  .cat-select{font-size:11px;font-family:'Outfit',sans-serif;border:1.5px solid #F4A021;border-radius:6px;padding:2px 6px;color:#151210;background:#fff;cursor:pointer;outline:none;}
  .cat-badge{display:flex;align-items:center;gap:4px;font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:#7A6E6A;background:#F0ECE6;border:none;border-radius:100px;padding:4px 10px;cursor:pointer;font-family:'Outfit',sans-serif;transition:background .12s;}
  .cat-badge:hover{background:#E8E2D8;}
  .cat-badge.is-side{color:#1E3A2F;background:#F0F5EE;}
  .cat-badge.is-side:hover{background:#DCEAD4;}
  .side-quicktag{display:block;margin-top:6px;background:none;border:none;color:#1E3A2F;font-size:11px;font-weight:600;text-decoration:underline;cursor:pointer;padding:0;font-family:'Outfit',sans-serif;}
  .side-quicktag:hover{color:#E8431A;}
  /* Star rating */
  .star-row{display:flex;gap:2px;margin-top:5px;}
  .star{font-size:15px;cursor:pointer;color:#EDE8E0;transition:color .1s;line-height:1;background:none;border:none;padding:0;}
  .star.filled{color:#F4A021;}
  /* Confirm remove */
  .confirm-remove{display:flex;align-items:center;gap:8px;margin-top:8px;background:#FFF8F2;border:1.5px solid #E8431A;border-radius:10px;padding:8px 12px;}
  .confirm-remove-text{font-size:12px;color:#151210;font-weight:500;flex:1;}
  .confirm-remove-yes{padding:4px 12px;background:#E8431A;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;}
  .confirm-remove-no{padding:4px 12px;background:transparent;border:1.5px solid #D4CCC0;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;color:#151210;font-family:'Outfit',sans-serif;}
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
  .day-sides{display:flex;flex-direction:column;gap:2px;margin-top:5px;}
  .day-side-chip{display:flex;align-items:center;gap:3px;font-size:9.5px;color:#1E3A2F;background:#F0F5EE;border-radius:5px;padding:2px 5px;line-height:1.4;}
  .day-side-chip.loading{color:#B8B0A8;background:#F5F2ED;}
  .day-side-chip.error{color:#E8431A;background:#FFF0ED;}
  .day-side-chip-remove{margin-left:auto;cursor:pointer;opacity:.55;font-size:11px;flex-shrink:0;}
  .day-side-chip-remove:hover{opacity:1;}
  .day-add-side{align-self:flex-start;background:none;border:none;color:#1E3A2F;font-size:9.5px;text-decoration:underline;cursor:pointer;padding:0;margin-top:4px;font-family:'Outfit',sans-serif;}
  .day-add-side:hover{color:#E8431A;}
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
  .inspire-lede{margin:6px 0 22px;font-size:16px;line-height:1.5;color:#4F4744;}
  .inspire-section{margin:0 0 22px;border:none;padding:0;min-width:0;}
  .inspire-section-label{display:block;padding:0;margin:0 0 10px;font-size:15px;font-weight:600;color:#151210;}
  .inspire-optional{font-weight:400;color:#6E635F;}
  .inspire-chips{display:flex;flex-wrap:wrap;gap:8px;}
  .inspire-chip{min-height:44px;padding:0 16px;border-radius:22px;border:1px solid #E3DCD0;background:#fff;font-family:'Outfit',sans-serif;font-size:15px;color:#151210;cursor:pointer;transition:background .15s,border-color .15s;}
  .inspire-chip:hover{border-color:#B8AFA3;}
  .inspire-chip.on{background:#1A1F2E;border-color:#1A1F2E;color:#FDFAF5;font-weight:600;}
  .inspire-chip:focus-visible,.inspire-go-btn:focus-visible,.inspire-card-btn:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .inspire-fridge-input{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #E3DCD0;border-radius:14px;font-family:'Outfit',sans-serif;font-size:16px;color:#151210;outline:none;background:#fff;resize:none;line-height:1.45;}
  .inspire-fridge-input:focus{border-color:#1A1F2E;box-shadow:0 0 0 3px rgba(244,160,33,.35);}
  .inspire-fridge-input::placeholder{color:#9A8F88;}
  .inspire-diets{margin:-8px 0 16px;font-size:14px;color:#6E635F;}
  .inspire-go-btn{width:100%;min-height:52px;background:#F4A021;color:#151210;border:none;border-radius:26px;font-family:'Outfit',sans-serif;font-size:17px;font-weight:600;cursor:pointer;transition:background .15s;}
  .inspire-go-btn:hover:not(:disabled){background:#E8941A;}
  .inspire-go-btn:disabled{background:#EDE6DA;color:#9A8F88;cursor:not-allowed;}
  .inspire-hint{margin:10px 0 0;font-size:14px;color:#6E635F;text-align:center;}
  .inspire-error{margin:0 0 18px;padding:12px 14px;border-radius:14px;background:#FDECE6;border:1px solid #F3C3B3;color:#8A2A0E;font-size:15px;line-height:1.45;}
  .inspire-picks{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 18px;}
  .inspire-pick{height:30px;padding:0 12px;border-radius:15px;background:#F5EFE4;color:#4F4744;font-size:13px;display:inline-flex;align-items:center;}
  .inspire-results{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;}
  .inspire-card{background:#fff;border:1px solid #ECE6DD;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:8px;}
  .inspire-card-title{margin:0;font-family:'Fraunces',serif;font-size:21px;font-weight:600;line-height:1.2;color:#151210;}
  .inspire-card-desc{margin:0;font-size:15px;color:#4F4744;line-height:1.5;}
  .inspire-card-meta{display:flex;gap:6px 14px;font-size:14px;color:#6E635F;flex-wrap:wrap;}
  .inspire-card-why{margin:2px 0 4px;padding-left:12px;border-left:3px solid #F4A021;font-size:15px;line-height:1.45;color:#1E3A2F;}
  .inspire-card-btn{align-self:stretch;min-height:46px;background:#1A1F2E;color:#FDFAF5;border:none;border-radius:23px;font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;cursor:pointer;}
  .inspire-card-btn:hover{background:#2A3042;}
  .inspire-again{display:flex;gap:18px;justify-content:center;margin:18px 0 120px;flex-wrap:wrap;}
  .community-wrap{max-width:960px;margin:0 auto;padding:40px 20px 120px;}
  @media(min-width:768px){.community-wrap{padding:40px 28px 120px;}}
  .community-header{text-align:center;margin-bottom:28px;}
  .community-title{font-family:'Fraunces',serif;font-size:clamp(26px,5vw,38px);margin-bottom:8px;}
  .community-title em{color:#F4A021;font-style:italic;}
  .community-sub{font-size:14px;color:#7A6E6A;line-height:1.6;}
  .community-gate{display:flex;align-items:center;gap:16px;background:#1A1F2E;border-radius:18px;padding:20px 24px;margin-bottom:28px;flex-wrap:wrap;}
  .community-gate-icon{color:#F4A021;flex-shrink:0;display:flex;align-items:center;}
  .community-gate-text{flex:1;min-width:200px;}
  .community-gate-title{font-family:'Fraunces',serif;font-size:16px;color:#FDFAF5;font-weight:700;margin-bottom:4px;}
  .community-gate-desc{font-size:13px;color:rgba(253,250,245,.7);line-height:1.5;}
  .community-gate-btn{background:#F4A021;border:none;border-radius:100px;padding:10px 22px;font-family:'Outfit',sans-serif;font-weight:600;font-size:13px;color:#151210;cursor:pointer;white-space:nowrap;flex-shrink:0;}
  .community-grid{grid-template-columns:repeat(4,1fr);}
  @media(max-width:640px){.community-grid{grid-template-columns:repeat(2,1fr);}}
  .community-list{display:flex;flex-direction:column;gap:0;}
  .community-list-item{display:flex;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid #EDE8E0;cursor:pointer;transition:background .12s;}
  .community-list-item:first-child{border-top:1px solid #EDE8E0;}
  .community-list-item:hover{background:#F8F4EE;margin:0 -8px;padding:14px 8px;border-radius:10px;border-color:transparent;}
  .community-list-item:hover+.community-list-item{border-top-color:transparent;}
  .community-list-swatch{width:6px;height:48px;border-radius:3px;flex-shrink:0;}
  .community-list-text{flex:1;min-width:0;}
  .community-list-title{font-family:'Fraunces',serif;font-size:16px;font-weight:700;color:#151210;line-height:1.2;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .community-list-tagline{font-size:12px;color:#7A6E6A;line-height:1.4;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;}
  .community-list-cat{font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;}
  .community-list-arrow{color:#C8C0B8;flex-shrink:0;}
  .community-search-wrap{position:relative;margin-bottom:16px;}
  .community-search-input{width:100%;padding:11px 16px 11px 40px;border-radius:12px;border:1.5px solid #EDE8E0;background:#fff;font-family:'Outfit',sans-serif;font-size:14px;color:#151210;outline:none;transition:border-color .15s;box-sizing:border-box;}
  .community-search-input:focus{border-color:#1A1F2E;}
  .community-search-input::placeholder{color:#B8B0A8;}
  .community-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#B8B0A8;pointer-events:none;}
  .community-search-clear{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#B8B0A8;font-size:16px;line-height:1;padding:0;}
  .community-result-count{font-size:12px;color:#7A6E6A;margin-bottom:12px;}
  .community-cat-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-bottom:20px;scrollbar-width:none;}
  .community-cat-tabs::-webkit-scrollbar{display:none;}
  .community-cat-tab{padding:7px 18px;border-radius:100px;border:1.5px solid #EDE8E0;background:#fff;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;color:#7A6E6A;cursor:pointer;transition:all .15s;white-space:nowrap;flex-shrink:0;}
  .community-cat-tab.active{background:#1A1F2E;border-color:#1A1F2E;color:#FDFAF5;}
  .community-cat-tab:not(.active):hover{border-color:#151210;color:#151210;}
  /* ── Share sheet ── */
  .share-overlay{position:fixed;inset:0;background:rgba(21,18,16,.5);z-index:200;display:flex;align-items:flex-end;justify-content:center;}
  @media(min-width:640px){.share-overlay{align-items:center;}}
  .share-sheet{background:#FDFAF5;border-radius:24px 24px 0 0;padding:28px 24px 40px;width:100%;max-width:480px;position:relative;}
  @media(min-width:640px){.share-sheet{border-radius:24px;padding:32px;}}
  .share-sheet-title{font-family:'Fraunces',serif;font-size:20px;font-weight:700;margin-bottom:4px;}
  .share-sheet-dish{font-size:13px;color:#7A6E6A;margin-bottom:24px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .share-url-row{display:flex;align-items:center;gap:8px;background:#F0ECE6;border-radius:12px;padding:12px 14px;margin-bottom:20px;}
  .share-url-text{flex:1;font-size:12px;color:#151210;font-family:'Outfit',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .share-copy-btn{background:#1A1F2E;color:#FDFAF5;border:none;border-radius:8px;padding:7px 14px;font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0;transition:background .15s;}
  .share-copy-btn.copied{background:#1E3A2F;}
  .share-qr{display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:24px;}
  .share-qr img{width:160px;height:160px;border-radius:12px;border:4px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.08);}
  .share-qr-label{font-size:11px;color:#7A6E6A;letter-spacing:1px;text-transform:uppercase;}
  .share-native-btn{width:100%;background:#F4A021;border:none;border-radius:100px;padding:13px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;color:#151210;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;}
  .share-close{position:absolute;top:20px;right:20px;background:none;border:none;cursor:pointer;color:#7A6E6A;font-size:22px;line-height:1;}
  /* ── QR scanner ── */
  .qr-scan-overlay{position:fixed;inset:0;background:rgba(21,18,16,.5);z-index:200;display:flex;align-items:flex-end;justify-content:center;}
  @media(min-width:640px){.qr-scan-overlay{align-items:center;}}
  .qr-scan-sheet{background:#1A1F2E;border-radius:24px 24px 0 0;padding:28px 24px 40px;width:100%;max-width:420px;position:relative;}
  @media(min-width:640px){.qr-scan-sheet{border-radius:24px;padding:32px;}}
  .qr-scan-title{font-family:'Fraunces',serif;font-size:20px;font-weight:700;margin-bottom:4px;color:#FDFAF5;}
  .qr-scan-sub{font-size:13px;color:#B8B0A8;margin-bottom:20px;}
  .qr-scan-close{position:absolute;top:20px;right:20px;background:none;border:none;cursor:pointer;color:#B8B0A8;font-size:22px;line-height:1;}
  .qr-scan-frame{position:relative;width:100%;aspect-ratio:1/1;background:#000;border-radius:16px;overflow:hidden;margin-bottom:16px;}
  .qr-scan-frame video{width:100%;height:100%;object-fit:cover;}
  .qr-scan-reticle{position:absolute;inset:14%;border:2.5px solid #F4A021;border-radius:16px;box-shadow:0 0 0 2000px rgba(0,0,0,.25);pointer-events:none;}
  .qr-scan-status{display:flex;align-items:center;justify-content:center;height:100%;color:#B8B0A8;font-size:13px;text-align:center;padding:24px;}
  .qr-scan-err{background:rgba(232,67,26,.12);border:1px solid #E8431A;border-radius:10px;padding:12px 14px;font-size:13px;color:#F4A021;margin-bottom:12px;}
  .qr-scan-retry{width:100%;background:#F4A021;border:none;border-radius:100px;padding:12px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;color:#151210;cursor:pointer;}

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
  .modal{background:#FDFAF5;border-radius:18px;padding:26px;width:100%;max-width:480px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);}
  /* search-style modals sit at the top on phones so the on-screen keyboard can't cover the results */
  @media (max-width:640px){
    .modal-overlay.modal-top{align-items:flex-start;padding:calc(env(safe-area-inset-top,0px) + 12px) 12px 12px;}
    .modal-overlay.modal-top .modal{max-height:calc(var(--vvh,100vh) - 24px - env(safe-area-inset-top,0px));padding:20px;}
  }
  .modal-title{font-family:'Fraunces',serif;font-size:20px;margin-bottom:12px;flex-shrink:0;}
  .modal-search{width:100%;padding:10px 14px;border:1.5px solid #EDE8E0;border-radius:10px;font-family:'Outfit',sans-serif;font-size:14px;color:#151210;outline:none;background:#fff;margin-bottom:14px;flex-shrink:0;transition:border-color .15s;box-sizing:border-box;}
  .modal-search:focus{border-color:#F4A021;}
  .modal-search::placeholder{color:#7A6E6A;}
  .modal-list{overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:4px;}
  .modal-cat-label{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#E8431A;padding:10px 0 4px;display:flex;align-items:center;gap:8px;flex-shrink:0;}
  .modal-cat-label::after{content:'';flex:1;height:1px;background:#EDE8E0;}
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

  /* ── RECIPE PAGE (redesign) ── */
  .rx-shell{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px));}
  .rx-topbar{max-width:820px;margin:0 auto;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;}
  .rx-back{height:44px;padding:0 12px;display:flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:15px;font-weight:500;color:#151210;border-radius:22px;}
  .rx-back:hover{background:#F5EFE4;}
  .rx-menu-wrap{position:relative;}
  .rx-icon-btn{width:44px;height:44px;border:none;background:transparent;border-radius:22px;display:flex;align-items:center;justify-content:center;color:#151210;cursor:pointer;}
  .rx-icon-btn:hover{background:#F5EFE4;}
  .rx-menu-scrim{position:fixed;inset:0;z-index:140;}
  .rx-menu{position:absolute;right:4px;top:48px;z-index:150;min-width:232px;background:#fff;border-radius:16px;padding:6px;box-shadow:0 12px 32px rgba(26,31,46,.18),0 0 0 1px rgba(26,31,46,.06);}
  .rx-menu-item{width:100%;min-height:46px;display:flex;align-items:center;gap:12px;padding:0 14px;background:none;border:none;border-radius:10px;font-family:'Outfit',sans-serif;font-size:15px;color:#151210;cursor:pointer;text-align:left;}
  .rx-menu-item:hover{background:#F5EFE4;}
  .rx-menu-danger{color:#B8340F;}
  .rx-menu-aa{font-family:'Fraunces',serif;font-weight:700;font-size:15px;width:17px;text-align:center;}

  .rx-tabs{max-width:820px;margin:0 auto;display:flex;gap:6px;padding:4px 20px 2px;overflow-x:auto;scrollbar-width:none;}
  .rx-tabs::-webkit-scrollbar{display:none;}
  .rx-tab{flex-shrink:0;max-width:220px;height:40px;padding:0 16px;border-radius:20px;border:1px solid #E3DCD0;background:#fff;color:#4F4744;font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background .15s,color .15s,border-color .15s;}
  .rx-tab-side{color:#1E3A2F;}
  .rx-tab.active{background:#1A1F2E;border-color:#1A1F2E;color:#FDFAF5;font-weight:600;}
  .rx-tab-label{overflow:hidden;text-overflow:ellipsis;}
  .rx-tab-dot{width:6px;height:6px;border-radius:3px;background:#F4A021;flex-shrink:0;animation:rxPulse 1s ease-in-out infinite;}
  @keyframes rxPulse{0%,100%{opacity:.3}50%{opacity:1}}
  .rx-tab-add{flex-shrink:0;height:40px;padding:0 16px;border-radius:20px;border:1.5px dashed #B8AFA3;background:transparent;color:#4F4744;font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;}
  .rx-tab-add:hover,.rx-tab-add.open{border-style:solid;border-color:#1E3A2F;color:#1E3A2F;background:#EEF3EC;}
  .rx-add-side{max-width:820px;padding:12px 20px 4px;}
  .rx-add-side .side-card{display:flex;flex-direction:column;gap:3px;text-align:left;font-family:'Outfit',sans-serif;min-height:72px;}

  .rx-page{padding-bottom:24px;}
  .rx-photo{display:block;width:calc(100% - 40px);max-width:820px;height:220px;object-fit:cover;border-radius:18px;margin:14px auto 0;}
  .rx-head{max-width:820px;margin:0 auto;padding:22px 20px 0;display:flex;flex-direction:column;gap:10px;}
  .rx-eyebrow{font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6E635F;}
  .rx-title{margin:0;font-family:'Fraunces',serif;font-size:34px;line-height:1.06;font-weight:700;letter-spacing:-.6px;color:#151210;}
  @media(min-width:768px){.rx-title{font-size:44px;}}
  .rx-tagline{margin:0;font-size:16px;line-height:1.5;color:#4F4744;max-width:620px;}
  .rx-seasonal{display:flex;align-items:center;gap:6px;font-size:14px;color:#1E3A2F;}
  .rx-meta{margin-top:8px;display:flex;align-items:center;background:#fff;border-radius:16px;padding:4px;box-shadow:0 1px 3px rgba(26,31,46,.08);max-width:520px;}
  .rx-meta-item{flex:1;padding:8px 12px;display:flex;flex-direction:column;gap:2px;min-width:0;}
  .rx-meta-serves{flex:1.4;flex-direction:row;align-items:center;justify-content:space-between;padding:4px 4px 4px 12px;}
  .rx-meta-label{font-size:12px;color:#6E635F;}
  .rx-meta-value{font-size:16px;font-weight:600;color:#151210;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .rx-meta-div{width:1px;height:32px;background:#ECE6DD;flex-shrink:0;}
  .rx-stepper{display:flex;gap:2px;}
  .rx-stepper button{width:38px;height:44px;border:none;background:#F5EFE4;font-size:19px;color:#151210;cursor:pointer;font-family:'Outfit',sans-serif;}
  .rx-stepper button:first-child{border-radius:10px 0 0 10px;}
  .rx-stepper button:last-child{border-radius:0 10px 10px 0;}
  .rx-stepper button:hover{background:#EDE3D2;}

  .rx-page .recipe-body{max-width:820px;margin:0 auto;padding:28px 20px 0;}
  .rx-page .two-col{grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:48px;}
  @media(max-width:760px){.rx-page .two-col{grid-template-columns:1fr;gap:32px;}}
  .rx-page .section-label{font-size:13px;letter-spacing:1.5px;color:#6E635F;font-weight:600;margin-bottom:6px;}
  .rx-page .ing-group-label{font-size:12px;border-bottom:none;color:#1E3A2F;padding:14px 0 2px;}
  .rx-ing{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:baseline;padding:11px 0;border-bottom:1px solid #ECE6DD;font-size:17px;line-height:1.4;}
  .rx-ing.no-prep{grid-template-columns:minmax(0,1fr);}
  .rx-ing-main{color:#151210;font-weight:500;}
  .rx-ing-prep{color:#6E635F;}
  .rx-ing:last-child{border-bottom:none;}
  .rx-ing-amt{font-weight:700;color:#151210;margin-right:.3em;}
  .rx-ing-name{color:#2A2422;}
  .rx-ing-name .ing-shop-links{display:inline-flex;margin-left:8px;vertical-align:middle;}
  .rx-page .step-item{gap:16px;margin-bottom:24px;}
  .rx-page .step-num{width:30px;height:30px;font-size:14px;background:#1A1F2E;}
  .rx-page .step-text{font-size:17px;line-height:1.6;font-weight:400;padding-top:2px;}

  .rx-shop{margin-top:6px;display:flex;flex-direction:column;gap:6px;max-width:520px;}
  .rx-shop-label{font-size:14px;font-weight:500;color:#4F4744;}
  .rx-shop-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
  .rx-shop-row .ck-textlink{padding:0;align-self:center;}
  .rx-shop-select-wrap{position:relative;display:flex;align-items:center;}
  .rx-shop-select{appearance:none;-webkit-appearance:none;height:46px;min-width:200px;padding:0 40px 0 34px;border:1px solid #E3DCD0;border-radius:14px;background:#fff;font-family:'Outfit',sans-serif;font-size:16px;color:#151210;cursor:pointer;}
  .rx-shop-select:focus{outline:none;border-color:#1A1F2E;box-shadow:0 0 0 3px rgba(244,160,33,.25);}
  .rx-shop-dot{position:absolute;left:14px;width:10px;height:10px;border-radius:5px;pointer-events:none;}
  .rx-shop-chev{position:absolute;right:14px;pointer-events:none;color:#6E635F;}
  .rx-shop-note{font-size:13px;color:#6E635F;}
  .grocery-section{scroll-margin-top:16px;}
  .rx-groceries{max-width:820px;margin:8px auto 0;padding:28px 20px 0;border-top:1px solid #ECE6DD;scroll-margin-top:16px;}
  .rx-gro-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;}
  .rx-gro-title{margin:0;font-family:'Fraunces',serif;font-size:24px;font-weight:700;color:#151210;}
  .rx-gro-sub{font-size:14px;color:#6E635F;}
  .rx-gro-note{margin:8px 0 0;font-size:14px;color:#4F4744;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .rx-gro-swatch{width:12px;height:12px;border-radius:3px;background:#FFF0D4;border:1px solid #F4A021;flex-shrink:0;}
  .rx-gro-list{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;}
  .rx-gro-item{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-height:52px;padding:6px 12px;border-radius:12px;border:1px solid transparent;opacity:.5;transition:opacity .2s,background .2s,border-color .2s;}
  .rx-gro-item.on{opacity:1;background:#FFF8EA;border-color:#F6DCA6;}
  .rx-gro-check{flex:1;min-width:0;display:flex;align-items:center;gap:12px;cursor:pointer;min-height:40px;}
  .rx-gro-check input{width:22px;height:22px;accent-color:#1E3A2F;margin:0;flex-shrink:0;}
  .rx-gro-check input:checked + .rx-gro-name{text-decoration:line-through;color:#9A8F88;}
  .rx-gro-name{font-size:17px;color:#151210;}
  .rx-gro-dishes{display:flex;gap:4px;flex-wrap:wrap;}
  .rx-gro-dish{font-size:12px;padding:3px 8px;border-radius:10px;background:#F1EBE2;color:#4F4744;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;}
  .rx-gro-dish.side{background:#EEF3EC;color:#1E3A2F;}
  .rx-gro-shop{font-size:13px;padding:6px 10px;border-radius:14px;border:1px solid #E3DCD0;color:#4F4744;text-decoration:none;background:#fff;white-space:nowrap;}
  .rx-gro-shop:hover{border-color:#1A1F2E;color:#151210;}
  .edit-steps-notice{background:#FFF6E6;border:1px solid #F1D9A8;border-radius:12px;padding:12px 14px;margin:0 0 12px;font-size:14px;color:#4F4744;line-height:1.5;display:flex;flex-direction:column;gap:10px;}
  .edit-steps-notice strong{color:#151210;}
  .edit-steps-notice-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
  .edit-steps-rewrite{min-height:40px;padding:0 16px;border-radius:20px;border:none;background:#1A1F2E;color:#FDFAF5;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;cursor:pointer;}
  .edit-steps-rewrite:disabled{opacity:.6;cursor:wait;}
  .edit-steps-or{font-size:13px;color:#6E635F;}
  .edit-steps-err{font-size:13px;color:#B8340F;}
  .edit-step-row.flagged .edit-step-text{border-color:#F4A021;background:#FFFBF2;}
  .rx-actionbar{position:fixed;left:0;right:0;bottom:0;z-index:90;background:rgba(253,250,245,.96);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-top:1px solid #ECE6DD;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));}
  .rx-actionbar-inner{max-width:780px;margin:0 auto;display:flex;gap:10px;}
  .rx-save{height:52px;padding:0 20px;border-radius:26px;border:1.5px solid #1A1F2E;background:#fff;color:#151210;font-family:'Outfit',sans-serif;font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;}
  .rx-save.saved{background:#FFF4E0;border-color:#C97A0A;color:#7A4A06;}
  .rx-save:disabled,.rx-cook:disabled{opacity:.45;cursor:not-allowed;}
  .rx-cook{flex:1;height:52px;border-radius:26px;border:none;background:#F4A021;color:#151210;font-family:'Outfit',sans-serif;font-size:16px;font-weight:600;cursor:pointer;transition:background .15s;}
  .rx-cook:hover:not(:disabled){background:#E8931A;}

  /* ── COOKING MODE ── */
  .cook-overlay{position:fixed;inset:0;z-index:300;background:#FDFAF5;display:flex;flex-direction:column;color:#151210;font-family:'Outfit',sans-serif;}
  .cook-top{display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top,0px)) 12px 8px;max-width:760px;width:100%;margin:0 auto;box-sizing:border-box;}
  .cook-close{width:44px;height:44px;border:none;background:#F5EFE4;border-radius:22px;display:flex;align-items:center;justify-content:center;color:#151210;cursor:pointer;flex-shrink:0;}
  .cook-title{flex:1;min-width:0;font-family:'Fraunces',serif;font-weight:600;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;}
  .cook-count{width:72px;text-align:right;font-size:14px;font-weight:600;color:#6E635F;flex-shrink:0;}
  .cook-progress{height:4px;background:#EFE8DC;max-width:760px;width:calc(100% - 24px);margin:0 auto;border-radius:2px;overflow:hidden;flex-shrink:0;}
  .cook-progress div{height:4px;background:#F4A021;border-radius:2px;transition:width .3s ease;}
  .cook-timer-strip{display:flex;gap:6px;flex-wrap:wrap;max-width:760px;width:100%;margin:12px auto 0;padding:0 20px;box-sizing:border-box;}
  .cook-timer-pill{height:36px;padding:0 14px;border-radius:18px;border:none;background:#1A1F2E;color:#FDFAF5;font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;cursor:pointer;font-variant-numeric:tabular-nums;}
  .cook-timer-pill.done{background:#E8431A;}
  .cook-body{flex:1;overflow-y:auto;max-width:760px;width:100%;margin:0 auto;padding:28px 24px 24px;box-sizing:border-box;display:flex;flex-direction:column;gap:20px;}
  .cook-eyebrow{font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6E635F;}
  .cook-step-text{margin:0;font-size:26px;line-height:1.45;font-weight:400;color:#151210;}
  h2.cook-step-text{font-family:'Fraunces',serif;font-weight:700;font-size:30px;line-height:1.15;}
  @media(min-width:768px){.cook-step-text{font-size:32px;}}
  .cook-gather{list-style:none;margin:0;padding:0;}
  .cook-gather label{display:grid;grid-template-columns:28px 92px minmax(0,1fr);align-items:center;gap:8px;min-height:52px;border-bottom:1px solid #ECE6DD;font-size:18px;cursor:pointer;}
  .cook-gather input{width:22px;height:22px;accent-color:#1E3A2F;margin:0;}
  .cook-gather input:checked ~ span{color:#9A8F88;text-decoration:line-through;}
  .cook-ing-amt{font-weight:600;}
  .cook-ings{background:#fff;border-radius:16px;padding:14px 18px;box-shadow:0 1px 3px rgba(26,31,46,.08);}
  .cook-ings-label{font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#1E3A2F;margin-bottom:4px;}
  .cook-ings ul{list-style:none;margin:0;padding:0;}
  .cook-ings li{display:grid;grid-template-columns:92px minmax(0,1fr);gap:8px;padding:8px 0;font-size:18px;border-bottom:1px solid #F1EBE2;}
  .cook-ings li:last-child{border-bottom:none;}
  .cook-timer-start{align-self:flex-start;height:52px;padding:0 20px;border-radius:26px;border:1.5px solid #1A1F2E;background:#fff;color:#151210;font-family:'Outfit',sans-serif;font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer;}
  .cook-timer{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#1A1F2E;color:#FDFAF5;border-radius:18px;padding:14px 14px 14px 22px;}
  .cook-timer.done{background:#E8431A;animation:rxPulse 1.2s ease-in-out infinite;}
  .cook-timer-time{font-size:34px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.5px;}
  .cook-timer-btn{height:44px;padding:0 16px;border-radius:22px;border:none;background:rgba(253,250,245,.16);color:#FDFAF5;font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;cursor:pointer;}
  .cook-nav{display:flex;gap:10px;max-width:760px;width:100%;margin:0 auto;padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px));box-sizing:border-box;border-top:1px solid #ECE6DD;}
  .cook-prev{height:56px;padding:0 24px;border-radius:28px;border:1.5px solid #1A1F2E;background:#fff;color:#151210;font-family:'Outfit',sans-serif;font-size:17px;font-weight:600;cursor:pointer;}
  .cook-prev:disabled{opacity:.35;cursor:not-allowed;}
  .cook-next{flex:1;height:56px;border-radius:28px;border:none;background:#F4A021;color:#151210;font-family:'Outfit',sans-serif;font-size:17px;font-weight:600;cursor:pointer;}

  /* ── NAV (three tabs) ── */
  .nav-tab .nav-badge{position:static;margin-left:2px;width:18px;height:18px;font-size:10px;color:#151210;}
  .bottom-nav .bottom-tab{flex:1;position:relative;}
  .bottom-tab.active .bt-label{font-weight:600;color:#151210;}
  .bottom-tab.active::after{content:"";position:absolute;top:-10px;left:50%;width:32px;height:3px;margin-left:-16px;border-radius:0 0 3px 3px;background:#F4A021;}

  /* ── COOK (home) ── */
  .ck-page{max-width:640px;margin:0 auto;padding:24px 20px 120px;display:flex;flex-direction:column;gap:18px;}
  .ck-title{margin:0;font-family:'Fraunces',serif;font-size:34px;line-height:1.08;font-weight:700;letter-spacing:-.6px;color:#151210;}
  @media(min-width:768px){.ck-title{font-size:44px;}.ck-page{padding-top:40px;}}
  .ck-search{display:flex;align-items:center;gap:8px;height:58px;padding:0 7px 0 18px;background:#fff;border:1.5px solid #1A1F2E;border-radius:16px;box-shadow:0 2px 0 #1A1F2E;}
  .ck-search:focus-within{box-shadow:0 2px 0 #1A1F2E,0 0 0 4px rgba(244,160,33,.25);}
  .ck-search-icon{display:flex;color:#151210;}
  .ck-search-input{flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:'Outfit',sans-serif;font-size:17px;color:#151210;}
  .ck-search-input::placeholder{color:#8A7F79;}
  .ck-search-scan{width:44px;height:44px;border:none;border-radius:12px;background:#F5EFE4;color:#151210;display:flex;align-items:center;justify-content:center;cursor:pointer;}
  .ck-search-go{height:44px;padding:0 18px;border:none;border-radius:12px;background:#F4A021;color:#151210;font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;cursor:pointer;}
  .ck-chips{display:flex;flex-wrap:wrap;gap:8px;}
  .ck-chip{height:38px;padding:0 15px;border-radius:19px;border:1px solid #E3DCD0;background:#fff;color:#151210;font-family:'Outfit',sans-serif;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;}
  .ck-chip:hover{border-color:#B8AFA3;}
  .ck-chip.on{border-color:#1E3A2F;background:#EEF3EC;color:#1E3A2F;font-weight:500;}
  .ck-chip.on-dark{border-color:#1A1F2E;background:#1A1F2E;color:#FDFAF5;font-weight:600;}
  .ck-chip-season{color:#1E3A2F;}
  .ck-location{display:flex;gap:8px;flex-wrap:wrap;margin-top:-6px;}
  .ck-location-input{flex:1;min-width:180px;height:44px;padding:0 14px;border:1px solid #E3DCD0;border-radius:12px;font-family:'Outfit',sans-serif;font-size:15px;background:#fff;outline:none;}
  .ck-location-btn{height:44px;padding:0 14px;border:1px solid #E3DCD0;border-radius:12px;background:#fff;font-family:'Outfit',sans-serif;font-size:14px;color:#1E3A2F;display:flex;align-items:center;gap:6px;cursor:pointer;}
  .ck-inspire{display:flex;align-items:center;gap:14px;padding:16px 16px 16px 20px;margin-top:6px;background:#1A1F2E;border:none;border-radius:18px;text-align:left;cursor:pointer;width:100%;}
  .ck-inspire-text{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0;}
  .ck-inspire-title{font-family:'Fraunces',serif;font-size:19px;font-weight:600;color:#FDFAF5;}
  .ck-inspire-sub{font-family:'Outfit',sans-serif;font-size:14px;color:#C9C3BA;}
  .ck-inspire-cta{flex-shrink:0;height:44px;padding:0 16px;border-radius:22px;background:#F4A021;color:#151210;font-family:'Outfit',sans-serif;font-weight:600;font-size:14px;display:flex;align-items:center;}
  .ck-textlink{align-self:flex-start;background:none;border:none;padding:6px 0;font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;color:#1E3A2F;cursor:pointer;text-decoration:underline;text-underline-offset:3px;}
  .ck-textlink:hover{color:#151210;}
  .ck-inline-link{background:none;border:none;cursor:pointer;color:#1E3A2F;text-decoration:underline;font-size:13px;font-family:'Outfit',sans-serif;padding:0;}
  .ck-section{display:flex;flex-direction:column;gap:10px;margin-top:10px;}
  .ck-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;}
  .ck-section-head .ck-textlink{padding:0;}
  .ck-section-label{margin:0;font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6E635F;}
  .ck-trending{display:flex;gap:10px;overflow-x:auto;margin:0 -20px;padding:2px 20px 6px;scrollbar-width:none;}
  .ck-trending::-webkit-scrollbar{display:none;}
  .ck-trend-card{flex:0 0 156px;height:108px;padding:14px;background:#fff;border:none;border-radius:16px;box-shadow:0 1px 3px rgba(26,31,46,.08);display:flex;flex-direction:column;justify-content:space-between;text-align:left;cursor:pointer;}
  .ck-trend-card:hover{box-shadow:0 4px 14px rgba(26,31,46,.12);}
  .ck-trend-title{font-family:'Fraunces',serif;font-size:17px;font-weight:600;line-height:1.2;color:#151210;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
  .ck-trend-more{background:#EEF3EC;box-shadow:none;}
  .ck-trend-more .ck-trend-title{color:#1E3A2F;}
  .ck-trend-more-arrow{font-size:22px;color:#1E3A2F;line-height:1;}
  .ck-trend-tag{font-family:'Outfit',sans-serif;font-size:12px;color:#B8340F;font-weight:500;}
  .ck-rows{display:flex;flex-direction:column;}
  .ck-row{display:flex;align-items:center;gap:14px;min-height:60px;padding:8px 0;background:none;border:none;border-bottom:1px solid #ECE6DD;text-align:left;cursor:pointer;width:100%;color:#151210;}
  .ck-row:last-child{border-bottom:none;}
  .ck-row-icon{display:flex;color:#1E3A2F;flex-shrink:0;}
  .ck-row-text{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}
  .ck-row-title{font-family:'Outfit',sans-serif;font-size:16px;}
  .ck-row-sub{font-family:'Outfit',sans-serif;font-size:13px;color:#6E635F;}
  .ck-row-chev{font-size:22px;color:#8A7F79;transition:transform .15s;line-height:1;}
  .ck-row-panel{padding:4px 0 14px;border-bottom:1px solid #ECE6DD;}
  .ck-mode-back{align-self:flex-start;margin:-12px 0 -6px -12px;}

  /* ── GENERATING ── */
  .gen-page{padding-bottom:120px;}
  .gen-body{max-width:820px;margin:0 auto;padding:22px 20px 0;display:flex;flex-direction:column;gap:10px;}
  .gen-skel{height:14px;border-radius:7px;background:linear-gradient(90deg,#EFE8DC 25%,#F7F2EA 50%,#EFE8DC 75%);background-size:200% 100%;animation:genShimmer 1.4s linear infinite;}
  @keyframes genShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .gen-card{margin:14px 0 10px;padding:16px 18px;background:#1A1F2E;border-radius:18px;display:flex;flex-direction:column;gap:10px;max-width:520px;}
  .gen-card-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;}
  .gen-card-title{font-family:'Fraunces',serif;font-size:18px;font-weight:600;color:#FDFAF5;}
  .gen-card-time{font-size:13px;color:#C9C3BA;}
  .gen-bar{height:6px;border-radius:3px;background:rgba(253,250,245,.15);overflow:hidden;}
  .gen-bar div{height:6px;border-radius:3px;background:#F4A021;transition:width .5s ease;}
  .gen-steps{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;}
  .gen-steps li{display:flex;align-items:center;gap:8px;font-size:14px;color:#8F8A85;}
  .gen-steps li.done{color:#C9C3BA;}
  .gen-steps li.now{color:#FDFAF5;font-weight:500;}
  .gen-step-mark{width:16px;height:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .gen-dot{width:8px;height:8px;border-radius:4px;background:#F4A021;animation:rxPulse 1s ease-in-out infinite;}
  .gen-label{font-size:13px;letter-spacing:1.5px;color:#6E635F;font-weight:600;margin:10px 0 0;}
  .gen-row{display:grid;grid-template-columns:88px 1fr;align-items:center;min-height:46px;border-bottom:1px solid #ECE6DD;}
  .gen-note{margin:14px 0 0;font-size:14px;line-height:1.5;color:#6E635F;}

  /* ── PLAN ── */
  .pl-page{max-width:720px;margin:0 auto;padding:24px 20px 120px;}
  .pl-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:12px;}
  .pl-range{font-size:14px;color:#6E635F;margin-bottom:2px;}
  .pl-groceries{height:44px;padding:0 16px;border-radius:22px;border:none;background:#1A1F2E;color:#FDFAF5;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;}
  .pl-groceries svg{color:#F4A021;}
  .pl-hint{font-size:15px;color:#4F4744;margin:0 0 6px;}
  .pl-days{list-style:none;margin:0;padding:0;}
  .pl-day{display:grid;grid-template-columns:52px minmax(0,1fr);gap:12px;padding:14px 0;border-bottom:1px solid #ECE6DD;}
  .pl-date{display:flex;flex-direction:column;align-items:center;padding-top:2px;}
  .pl-dow{font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6E635F;}
  .pl-dnum{font-family:'Fraunces',serif;font-size:22px;font-weight:600;color:#151210;}
  .pl-day.today .pl-dnum{width:36px;height:36px;border-radius:18px;background:#F4A021;display:flex;align-items:center;justify-content:center;font-size:19px;margin-top:2px;}
  .pl-meal{display:flex;flex-direction:column;gap:6px;min-width:0;}
  .pl-meal-top{display:flex;align-items:flex-start;gap:8px;}
  .pl-meal-title{flex:1;min-width:0;background:none;border:none;padding:6px 0 0;text-align:left;font-family:'Fraunces',serif;font-size:19px;font-weight:600;line-height:1.25;color:#151210;cursor:pointer;}
  .pl-meal-title:hover{text-decoration:underline;text-underline-offset:3px;}
  .pl-remove{width:40px;height:40px;flex-shrink:0;border:none;background:none;border-radius:20px;color:#8A7F79;display:flex;align-items:center;justify-content:center;cursor:pointer;}
  .pl-remove:hover{background:#F5EFE4;color:#151210;}
  .pl-meal-meta{font-size:14px;color:#6E635F;margin-top:-4px;}
  .pl-sides{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
  .pl-side{height:34px;padding:0 4px 0 12px;border-radius:17px;background:#EEF3EC;color:#1E3A2F;font-size:14px;display:inline-flex;align-items:center;gap:6px;max-width:100%;}
  .pl-side.loading{background:#F5F2ED;color:#8A7F79;}
  .pl-side.error{background:#FFF0ED;color:#B8340F;}
  .pl-side-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .pl-side-x{width:28px;height:28px;border:none;background:none;border-radius:14px;color:inherit;opacity:.65;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .pl-side-x:hover{opacity:1;background:rgba(30,58,47,.1);}
  .pl-add-side{height:34px;padding:0 10px;border:none;background:none;color:#1E3A2F;font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;cursor:pointer;}
  .pl-add-meal{height:48px;border-radius:14px;border:1.5px dashed #CFC6B8;background:transparent;color:#4F4744;font-family:'Outfit',sans-serif;font-size:15px;font-weight:500;text-align:left;padding:0 16px;cursor:pointer;}
  .pl-add-meal:hover{border-color:#1E3A2F;color:#1E3A2F;background:#EEF3EC;}
  .pl-page .consol-section{scroll-margin-top:16px;}
  .pl-rel{font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6E635F;}
  .pl-rel.today{color:#B8340F;}
  .pl-week{list-style:none;display:flex;align-items:center;gap:10px;padding:18px 0 2px;}
  .pl-week span{font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6E635F;white-space:nowrap;}
  .pl-week::after{content:"";flex:1;height:1px;background:#E3DCD0;}
  .pl-earlier{align-self:center;display:flex;width:fit-content;align-items:center;gap:6px;height:36px;padding:0 14px;margin:0 auto 8px;border-radius:18px;border:1px solid #E3DCD0;background:#fff;font-family:'Outfit',sans-serif;font-size:13px;color:#4F4744;cursor:pointer;}
  .pl-earlier.has-missed{border-color:#F1D9A8;background:#FFF6E6;color:#8A5A0B;font-weight:500;}
  .pl-earlier svg{transition:transform .15s;}
  .pl-earlier-list{border-bottom:2px solid #ECE6DD;margin-bottom:6px;}
  .pl-day.past .pl-dow,.pl-day.past .pl-dnum{color:#9A8F88;}
  .pl-empty-past{font-size:15px;color:#9A8F88;padding-top:8px;}
  .pl-made-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:4px;}
  .pl-past-title{color:#6E635F;font-size:18px;}
  .pl-made{flex-shrink:0;height:34px;padding:0 10px;border:none;background:none;border-radius:17px;color:#1E3A2F;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;display:flex;align-items:center;gap:4px;cursor:pointer;}
  .pl-made:hover{background:#EEF3EC;}
  .pl-missed{display:flex;flex-direction:column;gap:8px;padding:12px 14px;background:#FFF6E6;border:1px solid #F1D9A8;border-radius:14px;}
  .pl-missed .pl-meal-title{padding:0;}
  .pl-missed-label{font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#8A5A0B;}
  .pl-missed-sides{font-size:13px;color:#6E635F;margin-top:-4px;}
  .pl-missed-move{display:flex;flex-direction:column;gap:6px;}
  .pl-missed-move-label{font-size:13px;color:#4F4744;}
  .pl-missed-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
  .pl-chip{height:36px;padding:0 14px;border-radius:18px;border:1px solid #E3DCD0;background:#fff;color:#151210;font-family:'Outfit',sans-serif;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;}
  .pl-chip-primary{border-color:#1A1F2E;background:#1A1F2E;color:#FDFAF5;font-weight:600;}
  .pl-chip-ok{border-color:#B9CFB4;color:#1E3A2F;}
  .pl-chip-text{height:36px;padding:0 10px;border:none;background:none;color:#8A5A0B;font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;cursor:pointer;}
  .pl-more{display:block;margin:16px auto 0;height:44px;padding:0 18px;border-radius:22px;border:1px solid #E3DCD0;background:#fff;font-family:'Outfit',sans-serif;font-size:14px;color:#1E3A2F;font-weight:500;cursor:pointer;}

  /* ── LIBRARY ── */
  .lib-page{max-width:960px;margin:0 auto;padding:24px 20px 120px;}
  .lib-search{display:flex;align-items:center;gap:10px;height:48px;padding:0 16px;background:#fff;border:1px solid #E3DCD0;border-radius:14px;margin-bottom:12px;}
  .lib-search input{flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:'Outfit',sans-serif;font-size:16px;color:#151210;}
  .lib-filters{display:flex;gap:6px;overflow-x:auto;margin:0 -20px 18px;padding:0 20px;scrollbar-width:none;}
  .lib-filters::-webkit-scrollbar{display:none;}
  .lib-page .saved-category-label{font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6E635F;}
  .lib-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
  @media(min-width:700px){.lib-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}}
  .lib-grid .recipe-card{border:none;border-radius:16px;box-shadow:0 1px 3px rgba(26,31,46,.08);padding:14px;}
  .lib-grid .recipe-card:hover{box-shadow:0 4px 14px rgba(26,31,46,.12);transform:none;}
  .lib-grid .card-title{font-size:17px;line-height:1.2;font-weight:600;margin-top:6px;}
  .lib-grid .card-desc{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
  @media(max-width:520px){
    .lib-grid .card-desc,.lib-grid .star-row,.lib-grid .card-tag{display:none;}
    .lib-grid .card-meta span:nth-child(n+2){display:none;}
    .lib-grid .card-actions{flex-wrap:wrap;}
  }
  .lib-page .family-wrap{padding:0;max-width:none;}

  @media print{
    .nav,.bottom-nav,.recipe-banner-actions,.scaler,.shop-btns,.back-btn,.recipe-top-back,
    .rx-topbar,.rx-tabs,.rx-actionbar,.rx-add-side,.cook-overlay,.rx-stepper,
    .dish-switcher,.add-side-panel,.dish-swipe-hint,
    .source-links,.card-actions,.grocery-section,.scan-divider,.scan-area{display:none !important;}
    body{background:#fff;padding-bottom:0;}
    .recipe-page{max-width:100%;padding:0;}
    .recipe-banner{background:#1A1F2E;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .two-col{grid-template-columns:200px 1fr;gap:24px;}
  }
`;

/* ── CONSTANTS (card pool + suggestions now live in lib/dishes.ts) ── */

function seededShuffle<T>(arr: T[], seed: number): T[]{
  const a=[...arr];
  let s=seed;
  for(let i=a.length-1;i>0;i--){s=(s*1664525+1013904223)&0xffffffff;const j=Math.abs(s)%(i+1);[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
// Monthly seed — same 6 cards all month, new set each month, no repeats for a full year
const _now=new Date();
const daySeed=Math.floor((Date.now()-new Date(_now.getFullYear(),0,0).getTime())/86400000)+_now.getFullYear()*1000;
const SUGGESTION_CARDS=seededShuffle(CARD_POOL,daySeed).slice(0,8);
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
  {id:"coborns",   name:"Coborn's",     color:"#C8102E", url:(q:string)=>`https://shop.coborns.com/store/coborns-marketplace/s?k=${encodeURIComponent(q)}`},
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
const RECIPE_CATEGORIES = ["Breakfast","Salads","Soups","Pasta","Seafood","Poultry","Meat","Vegetarian","Sides","Desserts","Snacks","Drinks","Other"];

function guessCategory(recipe: any): string {
  const title = (recipe.title||"").toLowerCase();
  if(/salmon|shrimp|prawn|tuna|cod|halibut|scallop|crab|lobster|clam|mussel|anchovy|sea bass|snapper|tilapia|mahi|fish\b/.test(title)) return "Seafood";
  if(/chicken|turkey|duck|hen|poultry|rotisserie/.test(title)) return "Poultry";
  if(/beef|steak|brisket|burger|hamburger|meatball|bolognese|short rib|prime rib|pot roast|lamb|pork\b|pulled pork|bacon\b|sausage|chorizo|prosciutto|pancetta|ribs\b|osso|kofta|shawarma|gyro/.test(title)) return "Meat";
  if(/ramen|pho|udon|soba|pad thai|lo mein|chow mein|yakisoba/.test(title)) return "Pasta";
  if(/pasta|spaghetti|linguine|penne|fettuccine|tagliatelle|rigatoni|gnocchi|lasagna|carbonara|cacio|amatriciana|arrabbiata|risotto|paella/.test(title)) return "Pasta";
  if(/soup|bisque|chowder|gazpacho|minestrone|bouillabaisse|stew|braise|cassoulet|tagine|goulash/.test(title)) return "Soups";
  if(/salad|slaw|coleslaw|niçoise|nicoise|caprese/.test(title)) return "Salads";
  if(/pancake|waffle|french toast|omelette|frittata|shakshuka|eggs benedict|breakfast burrito|granola/.test(title)) return "Breakfast";
  if(/cake|cookie|brownie|pie|tart|crumble|pudding|mousse|cheesecake|tiramisu|panna cotta|creme brulee|crème|gelato|ice cream|sorbet|macaron|baklava|sticky rice/.test(title)) return "Desserts";
  if(/smoothie|juice|lemonade|cocktail|mocktail|sangria|margarita|daiquiri|mojito/.test(title)) return "Drinks";
  if(/hummus|guacamole|salsa|bruschetta|crostini|dip\b|baba/.test(title)) return "Snacks";
  if(/rice|potato|fries|bread|roll|biscuit|naan|focaccia|cornbread|pizza|flatbread|stuffing|dressing\b|casserole|mashed|gratin|pilaf|coleslaw|slaw\b|green bean|brussels sprout|baked bean|mac and cheese|cheesy|dinner roll|applesauce|cranberry sauce|glazed carrot|roasted vegetable|roasted carrot|roasted broccoli|sauteed|sautéed|side dish/.test(title)) return "Sides";
  if(/tofu|tempeh|lentil|chickpea|falafel|veggie burger|black bean|cauliflower|eggplant|jackfruit/.test(title)) return "Vegetarian";
  return "Other";
}

function getSiteUrl(name: string, dish: string){
  const k=name.toLowerCase().trim();
  return (SITE_URLS[k]||`https://www.google.com/search?q=${encodeURIComponent(name+" recipe ")}`)+encodeURIComponent(dish);
}
function wmUrl(item: string){ return `https://www.walmart.com/search?q=${encodeURIComponent(item)}`; }
function tgUrl(item: string){ return `https://www.target.com/s?searchTerm=${encodeURIComponent(item)}`; }

/* ── UTILS ── */
const UNI_FRAC: Record<string,string> = {"½":"1/2","¼":"1/4","¾":"3/4","⅓":"1/3","⅔":"2/3","⅛":"1/8","⅜":"3/8","⅝":"5/8","⅞":"7/8","⅕":"1/5","⅖":"2/5","⅗":"3/5","⅘":"4/5","⅙":"1/6","⅚":"5/6"};
// Some recipes put part of the ingredient in the amount ("1 red bell pepper" | "cored and cut…").
// Keep only the quantity, unit and size words in the amount and move the rest to the name.
const AMT_WORDS=new Set("cup cups c tbsp tbs tbl tablespoon tablespoons tsp teaspoon teaspoons oz ounce ounces fl lb lbs pound pounds g gram grams kg ml milliliter milliliters l liter liters litre litres pinch pinches dash dashes clove cloves can cans jar jars package packages pkg pkgs bag bags box boxes stick sticks slice slices sprig sprigs bunch bunches head heads handful handfuls quart quarts qt pint pints pt gallon gallons inch inches piece pieces small medium large extra x and or to of heaping scant level about approx approximately few couple dozen".split(" "));
function splitIng(ing: any){
  const amount=String(ing?.amount||"").trim(), name=String(ing?.name||"").trim();
  if(amount&&/^[\d\/½⅓⅔¼¾⅛⅜⅝⅞.\-–\s]+$/.test(amount)){
    const m=name.match(/^(cups?|tablespoons?|tbsps?|teaspoons?|tsps?|ounces?|oz|pounds?|lbs?|cloves?|cans?|sticks?|slices?|sprigs?|pinch(?:es)?|dash(?:es)?|grams?|g|ml)\b\.?\s+(?:of\s+)?/i);
    if(m){
      const u=m[1].toLowerCase();
      const short=/^tablespoons?$/.test(u)?"tbsp":/^teaspoons?$/.test(u)?"tsp":/^pounds?$/.test(u)?"lbs":/^ounces?$/.test(u)?"oz":m[1];
      return {...ing,amount:`${amount} ${short}`,name:name.slice(m[0].length)};
    }
  }
  if(!amount||amount.length<12)return ing;
  const toks=amount.split(/\s+/);
  let cut=toks.length;
  for(let i=0;i<toks.length;i++){
    const w=toks[i].toLowerCase().replace(/[.,()]/g,"");
    if(/^[\d\/½⅓⅔¼¾⅛⅜⅝⅞.\-–~]+$/.test(w)||AMT_WORDS.has(w)||/^\d/.test(w))continue;
    cut=i;break;
  }
  if(cut===toks.length||cut===0)return ing;
  const keep=toks.slice(0,cut).join(" ").replace(/\s+(and|or|of|to|x)$/i,"");
  const moved=toks.slice(cut).join(" ").replace(/,$/,"");
  const joiner=!name?"":/^[,(]/.test(name)?"":/^([a-z]+ed|cut|chopped|sliced|diced|minced|peeled|trimmed|halved|about|for|to|plus|divided|optional|at|from|cubed|grated|shredded)\b/i.test(name)?", ":" ";
  return {...ing,amount:keep,name:moved+joiner+name};
}

// "red bell pepper, cored and diced" -> item "red bell pepper", prep "cored and diced"
function ingParts(ing: any){
  const sp=splitIng(ing); const name=String(sp.name||"");
  let depth=0, cut=-1;
  for(let i=0;i<name.length;i++){const c=name[i];if(c==="(")depth++;else if(c===")")depth=Math.max(0,depth-1);else if(c===","&&depth===0){cut=i;break;}}
  const item=(cut<0?name:name.slice(0,cut)).trim();
  const prep=(cut<0?"":name.slice(cut+1)).trim();
  return {amount:String(sp.amount||""),item,prep};
}

function normalizeAmount(s: string): string {
  if(!s) return s;
  // "½" -> "1/2", "1½" -> "1 1/2" (plain fractions stay legible at any weight/size)
  let t=s.replace(/(\d)?([½¼¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚])/g,(_m:string,d:string|undefined,f:string)=>(d?d+" ":"")+UNI_FRAC[f]);
  // always a space between a number/fraction and the unit: "1/2tsp" -> "1/2 tsp", "1medium" -> "1 medium"
  t=t.replace(/(\d)([a-zA-Z])/g,"$1 $2");
  return t.replace(/\s{2,}/g," ").trim();
}
function parseNum(s: string): number|null{
  const t=s.trim();
  const mx=t.match(/^(\d+)\s+(\d+)\/(\d+)$/);if(mx)return+mx[1]+ +mx[2]/+mx[3];
  const fx=t.match(/^(\d+)\/(\d+)$/);if(fx)return+fx[1]/+fx[2];
  const n=parseFloat(t);return isNaN(n)?null:n;
}
function formatNum(n: number): string{
  const w=Math.floor(n),r=n-w;
  const fs:Array<[number,string]>=[[.125,"1/8"],[.25,"1/4"],[.333,"1/3"],[.375,"3/8"],[.5,"1/2"],[.625,"5/8"],[.667,"2/3"],[.75,"3/4"],[.875,"7/8"]];
  for(const[v,sym]of fs)if(Math.abs(r-v)<.06)return w>0?`${w} ${sym}`:sym;
  if(r<.05||r>.95)return String(Math.round(n));
  return n.toFixed(1).replace(/\.0$/,"");
}
function scaleAmt(str: string,ratio: number): string{
  if(!str)return str;
  const src=normalizeAmount(str);
  const m=src.match(/^([\d\s\/\.]+)(.*)/);if(!m)return src;
  const n=parseNum(m[1]);if(n===null)return src;
  const rest=m[2];
  // group 1 swallows the space before the unit, so put it back
  return formatNum(n*ratio)+(rest&&!/^[\s,.;)\-–]/.test(rest)?" ":"")+rest;
}
// Mixed numbers like "1 1/2 lbs": widen the gap between the whole number and the fraction
function renderAmount(s: string){
  const m=s.match(/^(\d+) (\d+\/\d+)(.*)$/);
  if(!m) return s;
  return <>{m[1]}<span style={{marginLeft:"0.34em"}}>{m[2]}</span>{m[3]}</>;
}
/* ── Cooking mode helpers ── */
// Finds the first duration in a step ("simmer for 10 minutes", "bake 1 hour") and returns seconds.
// Ignores the "/2" half of fractions like "1 1/2 hours" by skipping matches preceded by "/".
function stepTimerSeconds(step: string): number|null{
  const re=/(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*\d+(?:\.\d+)?)?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;
  let m: RegExpExecArray|null;
  while((m=re.exec(step))){
    if(m.index>0&&step[m.index-1]==="/")continue;
    const n=parseFloat(m[1]);
    const unit=m[2].toLowerCase();
    const mult=unit.startsWith("h")?3600:unit.startsWith("m")?60:1;
    const secs=Math.round(n*mult);
    if(secs>=10&&secs<=12*3600)return secs;
  }
  return null;
}
function fmtClock(total: number): string{
  const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
  const ss=String(s).padStart(2,"0");
  return h>0?`${h}:${String(m).padStart(2,"0")}:${ss}`:`${m}:${ss}`;
}
function fmtDuration(total: number): string{
  const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
  if(h>0)return m>0?`${h} hr ${m} min`:`${h} hr`;
  if(m>0)return s>0?`${m} min ${s} sec`:`${m} min`;
  return `${s} sec`;
}
const COOK_STOP=new Set(["fresh","freshly","chopped","minced","large","small","medium","ground","dried","whole","sliced","diced","finely","roughly","thinly","divided","optional","plus","more","for","serving","taste","and","the","cup","cups","extra","virgin","unsalted","salted","kosher","cracked","boneless","skinless","about","into","pieces","peeled","packed","light","dark","room","temperature","melted","softened","cold","warm","hot","trimmed","halved","cut","inch","lbs","tsp","tbsp","can","cans","bunch","head","cloves","clove","sprigs","pinch","dash","each","from","with","juiced","zested"]);
function ingKeywords(name: string): string[]{
  const base=(name||"").toLowerCase().split(/[,(]/)[0];
  return base.split(/[^a-z]+/).filter(w=>w.length>=3&&!COOK_STOP.has(w)).map(w=>w.replace(/(?:es|s)$/,"")).filter(w=>w.length>=3);
}
// Ingredients whose key words appear in the step text (word-start match, so "oil" doesn't match "boil").
function ingredientsForStep(step: string, ings: any[]): any[]{
  const t=(step||"").toLowerCase();
  return ings.filter(i=>ingKeywords(i.name).some(k=>new RegExp(`\\b${k}`).test(t)));
}
/* ── Editing: keep steps and grocery list in line with the ingredient list ── */
function flatIngs(r: any): any[]{
  const groups=r?.ingredient_groups||(r?.ingredients?[{items:r.ingredients}]:[]);
  return groups.flatMap((g:any)=>g.items||[]).filter((i:any)=>(i?.name||"").trim());
}
const normIng=(n: string)=>(n||"").toLowerCase().trim();
// Ingredients in `before` that are gone from `after` (compared by name).
function removedIngs(before: any, after: any): any[]{
  const keep=new Set(flatIngs(after).map((i:any)=>normIng(i.name)));
  return flatIngs(before).filter((i:any)=>!keep.has(normIng(i.name)));
}
// Words that identify a removed ingredient, minus any word a remaining ingredient also uses
// (so removing "chicken broth" doesn't flag every step that says "chicken").
function removedTerms(before: any, after: any): {name:string;terms:string[]}[]{
  const kept=new Set(flatIngs(after).flatMap((i:any)=>ingKeywords(i.name)));
  return removedIngs(before,after).map((i:any)=>({name:i.name,terms:ingKeywords(i.name).filter(k=>!kept.has(k))})).filter(x=>x.terms.length);
}
// Step indexes that still mention a removed ingredient.
function stepsMentioning(steps: string[], removed: {terms:string[]}[]): number[]{
  const terms=removed.flatMap(r=>r.terms);
  if(!terms.length)return [];
  return (steps||[]).map((st,i)=>terms.some(t=>new RegExp(`\\b${t}`,"i").test(st||""))?i:-1).filter(i=>i>=0);
}
// Rebuild grocery_items after an edit: drop items whose best-matching ingredient was removed,
// and add ingredients that are new and not already covered.
function syncGroceries(before: any, after: any): string[]{
  const oldIngs=flatIngs(before), newIngs=flatIngs(after);
  const newNames=new Set(newIngs.map((i:any)=>normIng(i.name)));
  const pool=[...oldIngs.map((i:any)=>({name:i.name,gone:!newNames.has(normIng(i.name))})),
              ...newIngs.map((i:any)=>({name:i.name,gone:false}))];
  const overlap=(a:string,b:string)=>{const kb=new Set(ingKeywords(b));return ingKeywords(a).filter(k=>kb.has(k)).length;};
  const kept=(before?.grocery_items||[]).filter((item:string)=>{
    let best=0,gone=false;
    for(const p of pool){
      const o=overlap(item,p.name);
      if(o>best||(o===best&&o>0&&!p.gone)){best=o;gone=p.gone;}
    }
    return !(best>0&&gone);
  });
  const oldNames=new Set(oldIngs.map((i:any)=>normIng(i.name)));
  for(const ing of newIngs){
    if(oldNames.has(normIng(ing.name)))continue;
    if(kept.some((g:string)=>overlap(g,ing.name)>0))continue;
    const base=(ing.name||"").split(/[,(]/)[0].trim();
    if(base)kept.push(base);
  }
  return kept;
}

// Ask the AI to rewrite a recipe's steps (and its one-line description) without the removed ingredients.
async function rewriteStepsWithout(edited: any, removedNames: string[]): Promise<{steps:string[];tagline?:string}>{
  const kept=flatIngs(edited).map((i:any)=>`${i.amount||""} ${i.name}`.trim());
  const out=await callAPI([{role:"user",content:
`You are editing a home recipe. The cook removed these ingredients: ${removedNames.join(", ")}.
Rewrite the method steps so they no longer use or mention the removed ingredients. Keep everything else the same: same order, same voice, same times and temperatures. Only merge or drop a step if it no longer makes sense without the removed ingredients. If no step uses them, return the steps unchanged.
Also rewrite the short description so it no longer mentions the removed ingredients. Keep its length, tone and wording otherwise; if it doesn't mention them, return it unchanged.
Recipe title: ${edited.title||""}
Current description: ${JSON.stringify(edited.tagline||"")}
Ingredients the recipe still has: ${kept.join("; ")}
Current steps (JSON array): ${JSON.stringify(edited.steps||[])}
Reply with only JSON in this shape: {"tagline":"...","steps":["step one","step two"]}`}]);
  if(!Array.isArray(out?.steps)||!out.steps.length)throw new Error("no steps");
  const tagline=typeof out.tagline==="string"&&out.tagline.trim()&&edited.tagline?out.tagline.trim():undefined;
  return {steps:out.steps.map((x:any)=>String(x)),tagline};
}

function playChime(ctx: any){
  try{
    if(!ctx)return;
    if(ctx.state==="suspended")ctx.resume();
    [0,0.35,0.7].forEach(t=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type="sine";o.frequency.value=880;
      g.gain.setValueAtTime(0.0001,ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(0.3,ctx.currentTime+t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+t+0.3);
      o.connect(g);g.connect(ctx.destination);
      o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+0.32);
    });
  }catch{}
}

/* ── Plan dates ── */
// Plans are keyed by local date ("2026-10-12"). Older plans used weekday keys ("mon").
const PLAN_PAST_DAYS=14;   // how far back Earlier goes; older entries are pruned
const PLAN_MAX_AHEAD=42;   // how far ahead you can scroll
function dateKey(d: Date): string{return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function addDays(d: Date, n: number): Date{const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function startOfToday(): Date{const d=new Date();d.setHours(0,0,0,0);return d;}
function keyToDate(k: string): Date{const [y,m,d]=k.split("-").map(Number);return new Date(y,(m||1)-1,d||1);}
function fmtPlanDay(k: string): string{return keyToDate(k).toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});}
// Moves weekday-keyed entries onto their next date (today included) and drops entries older than PLAN_PAST_DAYS.
function migratePlanKeys<T>(obj: Record<string,T>): Record<string,T>{
  const WD=["mon","tue","wed","thu","fri","sat","sun"];
  const today=startOfToday();
  const todayIdx=(today.getDay()+6)%7;
  const oldest=dateKey(addDays(today,-PLAN_PAST_DAYS));
  const out: Record<string,T>={};
  for(const [k,v] of Object.entries(obj||{})){
    const wi=WD.indexOf(k);
    if(wi!==-1){out[dateKey(addDays(today,(wi-todayIdx+7)%7))]=v;continue;}
    if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&k>=oldest)out[k]=v;
  }
  return out;
}

function consolidate(plan: Record<string,any>, planSides: Record<string,{title:string;status:string;recipe:any}[]>|undefined, keys: string[]){
  const map: Record<string,{name:string;entries:{recipe:string;amount:string}[]}> = {};
  for(const k of keys){
    const dayRecipes: any[] = [];
    if(plan[k])dayRecipes.push(plan[k]);
    for(const s of (planSides?.[k]||[])){ if(s.recipe)dayRecipes.push(s.recipe); }
    for(const r of dayRecipes){
      // Build a lookup of ingredient name → amount from ingredient_groups
      const amountLookup: Record<string,string> = {};
      for(const group of(r.ingredient_groups||[])){
        for(const item of(group.items||[])){
          const key=(item.name||"").toLowerCase().trim();
          if(key)amountLookup[key]=item.amount||"";
        }
      }
      for(const item of(r.grocery_items||[])){
        const key=item.toLowerCase().trim();
        if(!map[key])map[key]={name:item,entries:[]};
        const alreadyAdded=map[key].entries.some(e=>e.recipe===r.title);
        if(!alreadyAdded){
          const amount=amountLookup[key]||"";
          map[key].entries.push({recipe:r.title,amount});
        }
      }
    }
  }
  return Object.values(map).sort((a,b)=>a.name.localeCompare(b.name));
}
function randomCode(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
}

function buildInspirePrompt(time: string,vibe: string,serves: string,diets: string[],fridge?: string,exclude: string[]=[]): string{
  const d=diets.length?" Dietary restrictions: "+diets.join(", ")+".":"";
  const f=fridge?.trim()?` Try to incorporate some or all of these ingredients the user already has: ${fridge.trim()}.`:"";
  const x=exclude.length?` Don't suggest any of these again: ${exclude.join("; ")}.`:"";
  return `Suggest 3 distinct recipe ideas for someone who wants: time available: "${time}", vibe: "${vibe}", serving size: "${serves}".${d}${f}${x}
Reply with ONLY valid JSON, no other text:
{"suggestions":[{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","servings":"2","why":"One sentence on why this fits their request perfectly."},{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","servings":"2","why":"..."},{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","servings":"2","why":"..."}]}
Make each suggestion meaningfully different from the others. Keep titles concise and appetizing.`;
}

function buildScanPrompt(): string{
  return `Extract the recipe from this image. Use US imperial measurements only (cups, tbsp, tsp, oz, lbs, °F). Each ingredient's "amount" holds only the quantity, unit and size (e.g. "1", "2 cups", "1 large"); the ingredient itself and any prep notes go in "name" (amount "1", name "red bell pepper, cored and diced"). Reply with ONLY valid JSON:
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
  return `Extract the recipe from the text content of this webpage. Ignore navigation, ads, comments, and all other non-recipe content. Use US imperial measurements only (cups, tbsp, tsp, oz, lbs, °F) — convert any metric amounts. Each ingredient's "amount" holds only the quantity, unit and size (e.g. "1", "2 cups", "1 large"); the ingredient itself and any prep notes go in "name" (amount "1", name "red bell pepper, cored and diced"). Reply with ONLY valid JSON:
{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","servings":"4","ingredient_groups":[{"label":"","items":[{"amount":"2 tbsp","name":"olive oil"}]}],"steps":["Full detailed step."],"grocery_items":["olive oil"],"sources":[],"source_note":"Extracted from [site name]."}
Group ingredients by component if applicable. Write full clear steps.`;
}

// Parse JSON-LD Recipe schema — the legal, structured data sites publish for Google
function parseJsonLd(html: string, sourceUrl: string): any|null {
  try {
    const matches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if(!matches) return null;
    for(const tag of matches){
      const json=tag.replace(/<script[^>]*>/i,"").replace(/<\/script>/i,"").trim();
      let data: any;
      try{data=JSON.parse(json);}catch{continue;}
      // Handle @graph arrays
      const items=Array.isArray(data["@graph"])?data["@graph"]:[data];
      for(const item of items){
        if(!item["@type"])continue;
        const type=Array.isArray(item["@type"])?item["@type"]:([item["@type"]] as string[]);
        if(!type.some((t:string)=>t.toLowerCase().includes("recipe")))continue;
        // Found a Recipe — map to our format
        const getName=(v:any):string=>typeof v==="string"?v:(v?.name||v?.text||"");
        const rawIngredients:string[]=item.recipeIngredient||item.ingredients||[];
        // Group as single group since JSON-LD rarely has groups
        const items2=rawIngredients.map((ing:string)=>{
          const m=ing.match(/^([\d\/\s\.]+(?:cups?|tbsp|tsp|oz|lbs?|pounds?|ounces?|teaspoons?|tablespoons?|inches?|cloves?|slices?|cans?|packages?|bunches?|sprigs?|pinch|dash|pieces?|fillets?|sticks?|jars?|bags?|boxes?|quarts?|pints?|gallons?)?\b)?[.,]?\s*(.*)/i);
          if(m&&m[1]&&m[2])return{amount:m[1].trim(),name:m[2].trim()};
          return{amount:"",name:ing};
        });
        const rawSteps:any[]=item.recipeInstructions||[];
        const steps=rawSteps.map((s:any)=>typeof s==="string"?s:(s?.text||s?.name||"")).filter(Boolean);
        const prepTime=parseDuration(item.prepTime||"");
        const cookTime=parseDuration(item.cookTime||item.totalTime||"");
        const siteName=new URL(sourceUrl).hostname.replace("www.","");
        return {
          title:item.name||"Imported Recipe",
          tagline:item.description?.replace(/<[^>]+>/g,"").slice(0,120)||`From ${siteName}`,
          prep_time:prepTime||"—",
          cook_time:cookTime||"—",
          servings:String(item.recipeYield?.[0]||item.recipeYield||4).replace(/[^\d]/g,"")||"4",
          ingredient_groups:[{label:"",items:items2}],
          steps,
          grocery_items:rawIngredients.map((ing:string)=>ing.replace(/^[\d\/\s\.]+(?:cups?|tbsp|tsp|oz|lbs?|pounds?|ounces?|teaspoons?|tablespoons?)?\b[.,]?\s*/i,"").split(",")[0].trim()).filter(Boolean),
          sources:[siteName],
          source_note:`Imported from ${siteName}`,
          _sourceUrl:sourceUrl,
        };
      }
    }
  }catch{}
  return null;
}

function parseDuration(iso: string): string {
  if(!iso)return"";
  const m=iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if(!m)return iso;
  const h=parseInt(m[1]||"0"),min=parseInt(m[2]||"0");
  if(h&&min)return`${h} hr ${min} mins`;
  if(h)return`${h} hr`;
  if(min)return`${min} mins`;
  return"";
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
  const {user,isLoaded}          = useUser();
  const {signOut,openSignIn}     = useClerk();
  const [tab,setTab]             = useState("search");
  const [homeMode,setHomeMode]   = useState<"search"|"inspire"|"tryme">("search");
  const [communityRecipes,setCommunityRecipes] = useState<any[]>([]);
  const [communityStatus,setCommunityStatus]   = useState("idle");
  const [communityAuthed,setCommunityAuthed]   = useState(false);
  const [communityTab,setCommunityTab]         = useState("All");
  const [communitySearch,setCommunitySearch]   = useState("");
  const [showShare,setShowShare]               = useState(false);
  const [shareUrl,setShareUrl]                 = useState<string|null>(null);
  const [shareLoading,setShareLoading]         = useState(false);
  const [trendingDishes,setTrendingDishes]     = useState<string[]>([]);
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
  const [savedSearch,setSavedSearch] = useState("");
  const [cardSeed,setCardSeed]       = useState(daySeed);
  const [activeCardCat,setActiveCardCat] = useState("All");
  const [showSavePrompt,setShowSavePrompt] = useState(false);
  const [pendingSave,setPendingSave]   = useState<any>(null);
  const [confirmRemove,setConfirmRemove] = useState<number|null>(null);
  const [ratings,setRatings]     = useState<Record<number,number>>({});
  const [categoryOverrides,setCategoryOverrides] = useState<Record<number,string>>({});
  const [editingCategory,setEditingCategory] = useState<number|null>(null);
  const [plan,setPlan]           = useState<Record<string,any>>({});
  const [planSides,setPlanSides] = useState<Record<string,{title:string;status:string;recipe:any}[]>>({}); // sides paired to each day's main dish
  const [planMade,setPlanMade]   = useState<Record<string,boolean>>({}); // dates whose planned meal was made
  const [showEarlier,setShowEarlier] = useState(false);  // Plan: earlier days expanded
  const [planAhead,setPlanAhead] = useState(14);         // Plan: how many days ahead are shown
  const [assignDay,setAssignDay] = useState<string|null>(null);
  const [modalSearch,setModalSearch] = useState("");
  const [scanPreview,setScanPreview] = useState<string|null>(null);
  const [scanMime,setScanMime]   = useState("image/jpeg");
  const [scanStatus,setScanStatus] = useState("idle");
  const [scanMsg,setScanMsg]     = useState("");
  const [showQrScanner,setShowQrScanner] = useState(false);
  const [qrStatus,setQrStatus]   = useState("idle"); // idle|starting|scanning|error
  const [qrErr,setQrErr]         = useState("");
  const [ready,setReady]         = useState(false);
  const [cloudSynced,setCloudSynced] = useState(false); // true only after the cloud copy has been read
  const [planCloud,setPlanCloud] = useState(false);       // plan: true once this device has read the account copy
  const planLastSent=useRef("");                          // last plan payload sent to / read from the account
  const planPushTimer=useRef<any>(null);
  const [justAdded,setJustAdded]     = useState<any>(null); // most recent scanned/imported recipe, so "View" can open it directly
  const [showSidePanel,setShowSidePanel] = useState(false); // "Pair it with a side" panel on the recipe page
  const [returnTab,setReturnTab]     = useState<string|null>(null); // tab to return to when leaving a recipe opened from Saved/Community/Week/Family
  const [returnDayKey,setReturnDayKey] = useState<string|null>(null); // which day's sides to sync pairedSides back into, when returnTab is "week"
  const [pairedSides,setPairedSides] = useState<{title:string;status:string;recipe:any}[]>([]); // every side dish paired alongside the main dish (loading|done|error)
  const [activePane,setActivePane]   = useState(0); // 0 = main dish, 1..N = pairedSides[n-1]
  const swipeStartX = useRef<number|null>(null);
  const [sidePage,setSidePage]       = useState(0); // which batch of 3 sides "Show more" has paged to
  const [showAddSide,setShowAddSide] = useState(false);      // "Add another side" popover
  const [addSideMode,setAddSideMode] = useState<"suggest"|"search">("suggest");
  const [addSideQuery,setAddSideQuery] = useState("");
  const [libFilter,setLibFilter]   = useState<"all"|"mine"|"family"|"sides"|"recent">("all"); // Library filter chip
  const [showScanMenu,setShowScanMenu] = useState(false); // scan menu on the Cook search bar
  const [showUrlRow,setShowUrlRow]   = useState(false);   // "Paste a link" row expanded
  const [loadingDish,setLoadingDish] = useState("");      // dish name shown while a recipe generates
  const [genStart,setGenStart]       = useState(0);       // when generation started, for timed progress
  const [,setGenTick]                = useState(0);
  const searchSeq = useRef(0);                           // bumps on each search/cancel so stale results are ignored
  const [showRecipeMenu,setShowRecipeMenu] = useState(false); // the ⋯ menu on the recipe page
  const [stepRewrite,setStepRewrite] = useState<"idle"|"loading"|"error">("idle"); // edit panel: AI step rewrite
  const [stepsSyncedFor,setStepsSyncedFor] = useState("");  // removal set the steps were last rewritten for
  const [shareTarget,setShareTarget] = useState<any>(null);     // the recipe the share sheet is for (main dish or a side)
  const [cookRecipe,setCookRecipe]   = useState<any>(null);     // recipe open in cooking mode
  const [cookStep,setCookStep]       = useState(0);             // 0 = gather ingredients, 1..N = steps
  const [cookTimers,setCookTimers]   = useState<Record<number,{end:number;dur:number;done?:boolean}>>({});
  const [,setCookTick]               = useState(0);             // forces a re-render each second while a timer runs
  const cookSwipeX = useRef<number|null>(null);
  const audioCtxRef = useRef<any>(null);
  const [urlInput,setUrlInput]   = useState("");
  const [urlStatus,setUrlStatus] = useState("idle"); // idle|loading|done|error
  const [urlMsg,setUrlMsg]       = useState("");
  const [remixChips,setRemixChips] = useState<string[]>([]);
  const [remixStatus,setRemixStatus] = useState("idle");
  const [retailer,setRetailer] = useState<string>("");
  const [retailerOpen,setRetailerOpen] = useState(false);
  const [showEditPanel,setShowEditPanel] = useState(false);
  const [editRecipe,setEditRecipe] = useState<any>(null);
  const [ingTextSize,setIngTextSize] = useState<"normal"|"large"|"xl">("normal");
  const [recipePhotos,setRecipePhotos] = useState<Record<number,string>>({});
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Inspire Me
  const [inspireTime,setInspireTime]   = useState("");
  const [inspireVibe,setInspireVibe]   = useState("");
  const [inspireServes,setInspireServes] = useState("");
  const [inspireFridge,setInspireFridge] = useState("");
  const [inspireStatus,setInspireStatus] = useState("idle");
  const inspireStart=useRef(0);
  const [inspireSuggestions,setInspireSuggestions] = useState<any[]>([]);

  // Family Codes
  const [familyCode,setFamilyCode]     = useState("");
  const [joinInput,setJoinInput]       = useState("");
  const [sharedRecipes,setSharedRecipes] = useState<any[]>([]);
  const [familyStatus,setFamilyStatus] = useState("");
  const [familyStatusType,setFamilyStatusType] = useState("ok");

  // Auth UI
  const [showAccountDropdown,setShowAccountDropdown] = useState(false);
  const [showAccountSheet,setShowAccountSheet]       = useState(false);
  const [showSignOutConfirm,setShowSignOutConfirm]   = useState(false);
  const [navHidden,setNavHidden]                     = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);
  const qrVideoRef  = useRef<HTMLVideoElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const qrStreamRef = useRef<MediaStream|null>(null);
  const qrRafRef    = useRef<number|null>(null);

  /* stop the camera if the component unmounts while the scanner is open */
  // Deep link from a public share page: /?open=<slug> loads that shared recipe right in the app.
  useEffect(()=>{
    let slug="";
    try{slug=new URLSearchParams(window.location.search).get("open")||"";}catch{}
    if(!slug)return;
    try{const u=new URL(window.location.href);u.searchParams.delete("open");window.history.replaceState(null,"",u.pathname+u.search+u.hash);}catch{}
    (async()=>{
      try{
        const res=await fetch(`/api/share?slug=${encodeURIComponent(slug)}`);
        const data=await res.json().catch(()=>({found:false}));
        if(!data?.found||!data.recipe)return;
        const r={...data.recipe,id:Date.now(),_dish:data.recipe.title||slug,_ts:Date.now(),_fromCache:true};
        setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);
        setRecipe(r);setServings(null);setStatus("done");setTab("search");
        window.scrollTo({top:0});
      }catch{}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  // Track the visible viewport height (shrinks when the phone keyboard opens) so top-anchored sheets can fit above it.
  useEffect(()=>{
    const vv=(window as any).visualViewport; if(!vv)return;
    const set=()=>document.documentElement.style.setProperty("--vvh",`${Math.round(vv.height)}px`);
    set(); vv.addEventListener("resize",set);
    return()=>vv.removeEventListener("resize",set);
  },[]);
  useEffect(()=>{
    return ()=>{
      if(qrRafRef.current!=null)cancelAnimationFrame(qrRafRef.current);
      if(qrStreamRef.current)qrStreamRef.current.getTracks().forEach(t=>t.stop());
    };
  },[]);

  /* cooking mode: keep the screen awake and lock page scroll while open */
  useEffect(()=>{
    if(!cookRecipe)return;
    let lock:any=null; let active=true;
    const request=async()=>{
      try{ const wl=(navigator as any).wakeLock; if(wl&&active){ lock=await wl.request("screen"); } }catch{}
    };
    request();
    const onVis=()=>{ if(document.visibilityState==="visible")request(); };
    document.addEventListener("visibilitychange",onVis);
    const prevOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{
      active=false;
      document.removeEventListener("visibilitychange",onVis);
      document.body.style.overflow=prevOverflow;
      try{ lock&&lock.release(); }catch{}
    };
  },[cookRecipe]);

  /* cooking mode: tick running timers; chime + vibrate when one finishes */
  useEffect(()=>{
    if(!Object.values(cookTimers).some(t=>!t.done))return;
    const id=setInterval(()=>{
      const now=Date.now();
      let finished=false;
      const next:Record<number,{end:number;dur:number;done?:boolean}>={};
      for(const [k,t] of Object.entries(cookTimers)){
        if(!t.done&&now>=t.end){ next[Number(k)]={...t,done:true}; finished=true; }
        else next[Number(k)]=t;
      }
      if(finished){
        setCookTimers(next);
        try{ navigator.vibrate&&navigator.vibrate([300,150,300]); }catch{}
        playChime(audioCtxRef.current);
      }else setCookTick(x=>x+1);
    },1000);
    return()=>clearInterval(id);
  },[cookTimers]);

  /* old tab names land in Library with the matching filter */
  useEffect(()=>{
    if(tab==="saved"){setLibFilter("mine");setTab("library");}
    else if(tab==="family"){setLibFilter("family");setTab("library");}
  },[tab]);
  /* re-render the generating screen while a recipe is loading */
  useEffect(()=>{
    if(status!=="loading"&&inspireStatus!=="loading")return;
    const id=setInterval(()=>setGenTick(x=>x+1),500);
    return()=>clearInterval(id);
  },[status,inspireStatus]);

  /* storage load */
  useEffect(()=>{
    function load(){
      try{const s=localStorage.getItem("dw-saved");if(s)setSaved(JSON.parse(s));}catch{}
      try{const m=localStorage.getItem("dw-plan");if(m)setPlan(migratePlanKeys(JSON.parse(m)));}catch{}
      try{const ps=localStorage.getItem("dw-plan-sides");if(ps)setPlanSides(migratePlanKeys(JSON.parse(ps)));}catch{}
      try{const pm=localStorage.getItem("dw-plan-made");if(pm)setPlanMade(migratePlanKeys(JSON.parse(pm)));}catch{}
      try{const l=localStorage.getItem("dw-location");if(l)setLocation(l);}catch{}
      try{const fc=localStorage.getItem("dw-family-code");if(fc){setFamilyCode(fc);loadShared(fc);}}catch{}
      try{const h=localStorage.getItem("dw-history");if(h)setHistory(JSON.parse(h));}catch{}
      try{const rt=localStorage.getItem("dw-retailer");if(rt)setRetailer(rt);}catch{}
      try{const rg=localStorage.getItem("dw-ratings");if(rg)setRatings(JSON.parse(rg));}catch{}
      try{const co=localStorage.getItem("dw-cat-overrides");if(co)setCategoryOverrides(JSON.parse(co));}catch{}
      setReady(true);
    }
    load();
  },[]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-saved",JSON.stringify(saved));}catch{};},[saved,ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-history",JSON.stringify(history.slice(0,30)));}catch{};},[history,ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-plan",JSON.stringify(plan));}catch{};},[plan,ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-plan-sides",JSON.stringify(planSides));}catch{};},[planSides,ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-plan-made",JSON.stringify(planMade));}catch{};},[planMade,ready]);
  useEffect(()=>{if(ready&&location)try{localStorage.setItem("dw-location",location);}catch{};},[location,ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-retailer",retailer);}catch{};},[retailer,ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-ratings",JSON.stringify(ratings));}catch{};},[ratings,ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-cat-overrides",JSON.stringify(categoryOverrides));}catch{};},[categoryOverrides,ready]);
  useEffect(()=>{if(tab==="community"&&communityStatus==="idle")loadCommunity();},[tab,communityStatus]);
  useEffect(()=>{
    fetch("/api/trending").then(r=>r.json()).then(d=>{
      if(d.dishes?.length)setTrendingDishes(d.dishes);
    }).catch(()=>{});
  },[]);

  /* cloud sync — load on sign-in, then (and only then) allow pushing.
     Pushing before the cloud copy has been read would overwrite it with this
     device's (possibly empty) local list. */
  useEffect(()=>{
    if(!isLoaded||!user||!ready)return;
    setCloudSynced(false);
    let cancelled=false;
    (async()=>{
      try{
        const res=await fetch("/api/recipes");
        if(!res.ok)return; // stay un-synced: never overwrite the cloud copy after a failed read
        const data=await res.json();
        const cloud:any[]=data.recipes||[];
        if(cancelled)return;
        if(cloud.length){
          setSaved(local=>{
            const merged=[...local];
            for(const r of cloud){if(!merged.some(x=>x.id===r.id))merged.push(r);}
            return merged;
          });
        }
        setCloudSynced(true);
      }catch{}
    })();
    return()=>{cancelled=true;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isLoaded,user?.id,ready]);

  /* cloud sync — push on save change (only after the initial cloud read) */
  useEffect(()=>{
    if(!ready||!user||!cloudSynced)return;
    fetch("/api/recipes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recipes:saved})}).catch(()=>{});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[saved,ready,user?.id,cloudSynced]);

  /* plan sync — the meal plan lives on the account so every signed-in device sees it.
     First time on a device: merge (account wins on a clash, this device's extra days are kept),
     so an empty device can't wipe the plan. After that the account copy is the source of truth,
     re-read whenever the app comes back to the foreground. */
  const planPayload=(p:any,ps:any,pm:any)=>{
    const cutoff=dateKey(addDays(startOfToday(),-PLAN_PAST_DAYS));
    const keep=(o:any)=>{const n:any={};for(const k in o||{})if(k>=cutoff)n[k]=o[k];return n;};
    const sides:any={};
    for(const [k,arr] of Object.entries(keep(ps))){
      const done=(arr as any[]).filter(x=>x&&x.status!=="loading");
      if(done.length)sides[k]=done;
    }
    return {plan:keep(p),sides,made:keep(pm)};
  };
  const pullPlan=async(firstTime:boolean)=>{
    const res=await fetch("/api/plan");
    if(!res.ok)throw new Error("plan read failed");
    const d=await res.json();
    if(!d.found){ // nothing on the account yet: this device's plan becomes the account's
      planLastSent.current="";
      return;
    }
    const cp=d.plan||{}, cs=d.sides||{}, cm=d.made||{};
    if(firstTime){
      setPlan((l:any)=>({...l,...cp}));
      setPlanSides((l:any)=>{const n={...l};for(const k in cs)n[k]=cs[k];for(const k in cp)if(!cs[k])delete n[k];return n;});
      setPlanMade((l:any)=>({...l,...cm}));
    }else{
      // keep any side still being generated on this device
      setPlan(cp);
      setPlanSides((l:any)=>{const n:any={...cs};for(const k in l){const loading=(l[k]||[]).filter((x:any)=>x?.status==="loading");if(loading.length&&cp[k])n[k]=[...(n[k]||[]),...loading.filter((x:any)=>!(n[k]||[]).some((y:any)=>y.title===x.title))];}return n;});
      setPlanMade(cm);
    }
    planLastSent.current=JSON.stringify({plan:cp,sides:cs,made:cm});
  };
  useEffect(()=>{
    if(!isLoaded||!user||!ready)return;
    setPlanCloud(false);
    let cancelled=false;
    const flag=`dw-plan-synced:${user.id}`;
    let first=true;
    try{first=!localStorage.getItem(flag);}catch{}
    (async()=>{
      try{
        await pullPlan(first);
        if(cancelled)return;
        try{localStorage.setItem(flag,"1");}catch{}
        setPlanCloud(true);
      }catch{} // stay un-synced: never push after a failed read
    })();
    const onVisible=()=>{
      if(document.visibilityState!=="visible"||planPushTimer.current)return; // don't clobber an unsent edit
      pullPlan(false).catch(()=>{});
    };
    document.addEventListener("visibilitychange",onVisible);
    return()=>{cancelled=true;document.removeEventListener("visibilitychange",onVisible);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isLoaded,user?.id,ready]);
  useEffect(()=>{
    if(!ready||!user||!planCloud)return;
    const body=JSON.stringify(planPayload(plan,planSides,planMade));
    if(body===planLastSent.current)return;
    if(planPushTimer.current)clearTimeout(planPushTimer.current);
    planPushTimer.current=setTimeout(()=>{
      planPushTimer.current=null;
      fetch("/api/plan",{method:"POST",headers:{"Content-Type":"application/json"},body})
        .then(r=>{if(r.ok)planLastSent.current=body;}).catch(()=>{});
    },700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[plan,planSides,planMade,ready,user?.id,planCloud]);

  /* scroll-hide bottom nav */
  useEffect(()=>{
    // Hide on a deliberate scroll down, show on a deliberate scroll up, and always
    // show it at the very top or bottom. The scroll position is clamped so iOS's
    // rubber-band bounce at either end doesn't read as a direction change.
    let travel=0; // distance moved in the current direction since it last flipped
    const onScroll=()=>{
      const max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
      const y=Math.min(Math.max(window.scrollY,0),max);
      const dy=y-lastScrollY.current;
      lastScrollY.current=y;
      if(y<40||y>=max-48){setNavHidden(false);travel=0;return;}
      if(dy===0)return;
      travel=(Math.sign(dy)===Math.sign(travel))?travel+dy:dy;
      if(travel>32)setNavHidden(true);
      else if(travel<-24)setNavHidden(false);
    };
    window.addEventListener("scroll",onScroll,{passive:true});
    return()=>window.removeEventListener("scroll",onScroll);
  },[]);

  /* auth helpers */
  const userInitial=user?(user.firstName||user.emailAddresses?.[0]?.emailAddress||"U")[0].toUpperCase():"";
  const doSignOut=()=>{setShowSignOutConfirm(true);setShowAccountDropdown(false);setShowAccountSheet(false);};
  const confirmSignOut=()=>{signOut();setShowSignOutConfirm(false);};

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
    const mySeq=++searchSeq.current;
    setLoadingDish(q);setGenStart(Date.now());setShowScanMenu(false);
    setStatus("loading");setRecipe(null);setServings(null);setErrorMsg("");window.scrollTo({top:0});
    setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);
    try{
      const canCache=diets.length===0&&!seasonal;
      let parsed:any=null;
      let fromCache=false;

      if(canCache){
        const cacheData=await fetch(`/api/cache?q=${encodeURIComponent(q)}`)
          .then(r=>r.json()).catch(()=>({found:false}));
        if(cacheData.found&&cacheData.recipe){
          parsed=cacheData.recipe;
          fromCache=true;
        }else{
          parsed=await callAPI([{role:"user",content:buildPrompt(q,diets,seasonal,location)}]);
          fetch("/api/cache",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dish:q,recipe:parsed})}).catch(()=>{});
        }
      }else{
        parsed=await callAPI([{role:"user",content:buildPrompt(q,diets,seasonal,location)}]);
      }

      if(mySeq!==searchSeq.current)return; // cancelled or superseded
      const r={...parsed,id:Date.now(),_dish:q,_ts:Date.now(),_fromCache:fromCache};
      setRecipe(r);setStatus("done");
      setHistory(h=>[r,...h.filter((x:any)=>x.id!==r.id)].slice(0,30));
    }catch(e:any){if(mySeq!==searchSeq.current)return;setErrorMsg(e.message||String(e));setStatus("error");window.scrollTo({top:0,behavior:"smooth"});}
  };
  const cancelSearch=()=>{searchSeq.current++;setStatus("idle");};
  // Leave an open recipe (e.g. from the nav), keeping any side edits made from a Plan day.
  const leaveRecipe=()=>{
    if(returnDayKey)setPlanSides(p=>({...p,[returnDayKey]:pairedSides}));
    setReturnTab(null);setStatus("idle");setRecipe(null);setQuery("");closePairedSide();setShowRecipeMenu(false);setShowAddSide(false);
  };

  // Adds a side dish alongside the main dish. If it's already paired, just switches to it.
  // If `recipeOverride` is given (a recipe picked from Saved/Community search) it's used
  // directly — no AI call. Otherwise the side is generated/cached by title, same as the
  // "Pair it with a side" suggestions.
  const openPairedSide=async(sideTitle: string, recipeOverride?: any)=>{
    const existingIdx=pairedSides.findIndex(p=>p.title.toLowerCase()===sideTitle.toLowerCase());
    if(existingIdx!==-1){setActivePane(existingIdx+1);setShowAddSide(false);return;}
    const newIdx=pairedSides.length;
    if(recipeOverride){
      const r={...recipeOverride,id:Date.now(),_dish:sideTitle,_ts:Date.now(),_fromCache:true};
      setPairedSides(p=>[...p,{title:sideTitle,status:"done",recipe:r}]);
      setActivePane(newIdx+1);setShowAddSide(false);
      return;
    }
    setPairedSides(p=>[...p,{title:sideTitle,status:"loading",recipe:null}]);
    setActivePane(newIdx+1);setShowAddSide(false);
    try{
      const cacheData=await fetch(`/api/cache?q=${encodeURIComponent(sideTitle)}`).then(r=>r.json()).catch(()=>({found:false}));
      let parsed:any; let fromCache=false;
      if(cacheData.found&&cacheData.recipe){
        parsed=cacheData.recipe; fromCache=true;
      }else{
        parsed=await callAPI([{role:"user",content:buildPrompt(sideTitle,[],false,"")}]);
        fetch("/api/cache",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dish:sideTitle,recipe:parsed})}).catch(()=>{});
      }
      const r={...parsed,id:Date.now(),_dish:sideTitle,_ts:Date.now(),_fromCache:fromCache};
      setPairedSides(p=>p.map((x,i)=>i===newIdx?{...x,status:"done",recipe:r}:x));
    }catch(e:any){
      setPairedSides(p=>p.map((x,i)=>i===newIdx?{...x,status:"error"}:x));
    }
  };
  const retryPairedSide=(idx:number)=>{
    const title=pairedSides[idx]?.title; if(!title)return;
    setPairedSides(p=>p.map((x,i)=>i===idx?{...x,status:"loading"}:x));
    (async()=>{
      try{
        const cacheData=await fetch(`/api/cache?q=${encodeURIComponent(title)}`).then(r=>r.json()).catch(()=>({found:false}));
        let parsed:any; let fromCache=false;
        if(cacheData.found&&cacheData.recipe){parsed=cacheData.recipe; fromCache=true;}
        else{
          parsed=await callAPI([{role:"user",content:buildPrompt(title,[],false,"")}]);
          fetch("/api/cache",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dish:title,recipe:parsed})}).catch(()=>{});
        }
        const r={...parsed,id:Date.now(),_dish:title,_ts:Date.now(),_fromCache:fromCache};
        setPairedSides(p=>p.map((x,i)=>i===idx?{...x,status:"done",recipe:r}:x));
      }catch{
        setPairedSides(p=>p.map((x,i)=>i===idx?{...x,status:"error"}:x));
      }
    })();
  };
  const removePairedSide=(idx:number)=>{
    setPairedSides(p=>p.filter((_,i)=>i!==idx));
    setActivePane(cur=>{
      if(cur===idx+1)return 0;
      if(cur>idx+1)return cur-1;
      return cur;
    });
  };
  const closePairedSide=()=>{setPairedSides([]);setActivePane(0);setReturnDayKey(null);};

  /* share — works for the main dish or a paired side */
  const shareRecipe=async(r:any)=>{
    setShareTarget(r);setShowShare(true);setShareUrl(null);setShareLoading(true);
    try{
      const {_scanned,_imported,_fromCache,_ts,id,_sourceUrl,...shareable}=r as any;
      const res=await fetch("/api/share",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recipe:shareable})});
      const data=await res.json();
      setShareUrl(data.url||null);
    }catch{
      const slug=(r.title||"recipe").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
      setShareUrl(`https://everychef.app/r/${slug}`);
    }finally{setShareLoading(false);}
  };

  /* cooking mode */
  const openCookMode=(r:any)=>{setCookRecipe(r);setCookStep(0);setCookTimers({});setShowRecipeMenu(false);};
  const closeCookMode=()=>{setCookRecipe(null);setCookTimers({});};
  const finishCookMode=()=>{
    if(returnDayKey&&cookRecipe===recipe&&returnDayKey<=dateKey(startOfToday()))
      setPlanMade(p=>({...p,[returnDayKey]:true}));
    closeCookMode();
  };
  const startCookTimer=(step:number,secs:number)=>{
    // Create/resume audio on this tap so the chime is allowed to play later (iOS needs a user gesture).
    try{
      if(!audioCtxRef.current){
        const AC=(window as any).AudioContext||(window as any).webkitAudioContext;
        if(AC)audioCtxRef.current=new AC();
      }
      audioCtxRef.current?.resume?.();
    }catch{}
    setCookTimers(t=>({...t,[step]:{end:Date.now()+secs*1000,dur:secs}}));
  };
  const clearCookTimer=(step:number)=>setCookTimers(t=>{const n={...t};delete n[step];return n;});

  /* week plan — sides paired to a specific day's main dish */
  const addPlanSide=async(dayKey: string, sideTitle: string, recipeOverride?: any)=>{
    const already=(planSides[dayKey]||[]).some(p=>p.title.toLowerCase()===sideTitle.toLowerCase());
    if(already)return;
    if(recipeOverride){
      const r={...recipeOverride,id:Date.now(),_dish:sideTitle,_ts:Date.now(),_fromCache:true};
      setPlanSides(p=>({...p,[dayKey]:[...(p[dayKey]||[]),{title:sideTitle,status:"done",recipe:r}]}));
      return;
    }
    setPlanSides(p=>({...p,[dayKey]:[...(p[dayKey]||[]),{title:sideTitle,status:"loading",recipe:null}]}));
    try{
      const cacheData=await fetch(`/api/cache?q=${encodeURIComponent(sideTitle)}`).then(r=>r.json()).catch(()=>({found:false}));
      let parsed:any; let fromCache=false;
      if(cacheData.found&&cacheData.recipe){parsed=cacheData.recipe; fromCache=true;}
      else{
        parsed=await callAPI([{role:"user",content:buildPrompt(sideTitle,[],false,"")}]);
        fetch("/api/cache",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dish:sideTitle,recipe:parsed})}).catch(()=>{});
      }
      const r={...parsed,id:Date.now(),_dish:sideTitle,_ts:Date.now(),_fromCache:fromCache};
      setPlanSides(p=>({...p,[dayKey]:(p[dayKey]||[]).map(x=>x.title===sideTitle?{...x,status:"done",recipe:r}:x)}));
    }catch{
      setPlanSides(p=>({...p,[dayKey]:(p[dayKey]||[]).map(x=>x.title===sideTitle?{...x,status:"error"}:x)}));
    }
  };
  const retryPlanSide=(dayKey: string, title: string)=>{
    setPlanSides(p=>({...p,[dayKey]:(p[dayKey]||[]).map(x=>x.title===title?{...x,status:"loading"}:x)}));
    (async()=>{
      try{
        const cacheData=await fetch(`/api/cache?q=${encodeURIComponent(title)}`).then(r=>r.json()).catch(()=>({found:false}));
        let parsed:any; let fromCache=false;
        if(cacheData.found&&cacheData.recipe){parsed=cacheData.recipe; fromCache=true;}
        else{
          parsed=await callAPI([{role:"user",content:buildPrompt(title,[],false,"")}]);
          fetch("/api/cache",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dish:title,recipe:parsed})}).catch(()=>{});
        }
        const r={...parsed,id:Date.now(),_dish:title,_ts:Date.now(),_fromCache:fromCache};
        setPlanSides(p=>({...p,[dayKey]:(p[dayKey]||[]).map(x=>x.title===title?{...x,status:"done",recipe:r}:x)}));
      }catch{
        setPlanSides(p=>({...p,[dayKey]:(p[dayKey]||[]).map(x=>x.title===title?{...x,status:"error"}:x)}));
      }
    })();
  };
  // Put a main dish on a date; it starts out not made.
  const assignMain=(k: string, r: any)=>{
    setPlan(p=>({...p,[k]:r}));
    setPlanMade(p=>{const n={...p};delete n[k];return n;});
  };
  const removePlanSide=(dayKey: string, title: string)=>{
    setPlanSides(p=>({...p,[dayKey]:(p[dayKey]||[]).filter(x=>x.title!==title)}));
  };

  /* inspire */
  const doInspire=async()=>{
    if(!inspireTime||!inspireVibe||!inspireServes)return;
    // "Show three more" passes the current ideas so the next batch is different
    const exclude=inspireStatus==="done"?inspireSuggestions.map((x:any)=>x.title).filter(Boolean):[];
    setInspireStatus("loading");setInspireSuggestions([]);inspireStart.current=Date.now();window.scrollTo({top:0});
    try{
      const parsed=await callAPI([{role:"user",content:buildInspirePrompt(inspireTime,inspireVibe,inspireServes,diets,inspireFridge,exclude)}]);
      setInspireSuggestions(parsed.suggestions||[]);setInspireStatus("done");
    }catch(e:any){setInspireStatus("error");}
  };

  const loadCommunity=async()=>{
    setCommunityStatus("loading");
    try{
      const res=await fetch("/api/community");
      const data=await res.json();
      setCommunityRecipes(data.recipes||[]);
      setCommunityAuthed(!!data.authenticated);
      setCommunityStatus("done");
    }catch{setCommunityStatus("error");}
  };

  const openCommunityRecipe=(r:any)=>{
    const full={...r,id:Date.now(),_dish:r.title,_ts:Date.now(),_fromCache:true};
    setReturnTab("community");setPairedSides([]);setActivePane(0);setReturnDayKey(null);setRecipe(full);setServings(null);setStatus("done");setTab("search");
  };

  function communityCategory(title:string):string{
    const t=title.toLowerCase();
    if(/cake|cookie|brownie|pie|tart|crumble|pudding|mousse|cheesecake|tiramisu|panna cotta|cr[eè]me|brûlée|brulee|gelato|ice cream|sorbet|macaron|baklava|mochi|churro|financier|pavlova|profiterole|toffee|banana foster|tres leches|galette|île flottante|lemon tart|chocolate lava|mango sticky|earl grey pear|cardamom rice|hazelnut|sticky toffee|banana bread|blueberry muffin|peach cobbler|bread pudding|apple pie|crème caramel|tarte tatin|churro/.test(t)) return "Desserts";
    if(/soup|bisque|chowder|gazpacho|broth|consommé|bouillabaisse|minestrone|ribollita|borscht|tom kha|tom yum|pho|ramen|goulash|chili|chilli|dal|lentil soup|congee|stew|tagine|kimchi jjigae|smoky black bean|carrot ginger|corn chowder|pea and mint|leek/.test(t)) return "Soups & Stews";
    if(/salad|slaw|niçoise|caprese|tabboul|fattoush|panzanella|waldorf|caesar|kale|watermelon feta|beet.*goat|peach burrata|smashed cucumber|laab|gado|soba noodle|green goddess|ceviche|fattoush|poke/.test(t)) return "Salads";
    if(/pancake|waffle|eggs? benedict|eggs? florentine|shakshuka|frittata|quiche|french toast|huevos|smoked salmon bagel|biscuit and gravy|granola|breakfast burrito|monte cristo|chilaquiles|dutch baby|smorgasbord|croque|avocado toast|avocado smash|acai bowl|zucchini fritter|arepas|ful medames|dosa|chorizo hash|churro waffle/.test(t)) return "Brunch";
    if(/crab cake|devilled egg|baked brie|patatas bravas|spinach artichoke|baba ganoush|spring roll|tempura|arancini|empanada|prawn cocktail|tapenade|bruschetta|falafel|hummus|muhammara|spicy tuna crispy rice|doubles|pork dumpling|gyoza|edamame|nachos/.test(t)) return "Appetizers & Snacks";
    return "Mains";
  }

  const pickInspiredRecipe=async(suggestion: any)=>{
    setTab("search");setQuery(suggestion.title);
    const mySeq=++searchSeq.current;
    setLoadingDish(suggestion.title);setGenStart(Date.now());window.scrollTo({top:0});
    setStatus("loading");setRecipe(null);setServings(null);setErrorMsg("");
    setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);
    try{
      const parsed=await callAPI([{role:"user",content:buildPrompt(suggestion.title,diets,seasonal,location)}]);
      if(mySeq!==searchSeq.current)return;
      const r={...parsed,id:Date.now(),_dish:suggestion.title,_ts:Date.now()};
      setRecipe(r);setStatus("done");
      setHistory(h=>[r,...h.filter((x:any)=>x.id!==r.id)].slice(0,30));
    }catch(e:any){if(mySeq!==searchSeq.current)return;setErrorMsg(e.message||String(e));setStatus("error");}
  };

  /* scan */
  const onFileChange=(e: React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];if(!file)return;
    setScanStatus("idle");setScanMsg("");
    if(file.size>10*1024*1024){
      setScanStatus("error");setScanMsg("Image too large — please use a photo under 10MB.");
      if(fileRef.current)fileRef.current.value="";return;
    }
    const objectUrl=URL.createObjectURL(file);
    const img=new window.Image();
    img.onload=()=>{
      URL.revokeObjectURL(objectUrl);
      const MAX=1600;
      let w=img.width,h=img.height;
      if(w>MAX||h>MAX){if(w>h){h=Math.round(h*(MAX/w));w=MAX;}else{w=Math.round(w*(MAX/h));h=MAX;}}
      const canvas=document.createElement("canvas");
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext("2d");
      if(!ctx){setScanStatus("error");setScanMsg("Could not process image. Try a different file.");return;}
      ctx.drawImage(img,0,0,w,h);
      setScanMime("image/jpeg");
      setScanPreview(canvas.toDataURL("image/jpeg",0.85));
    };
    img.onerror=()=>{
      URL.revokeObjectURL(objectUrl);
      setScanStatus("error");setScanMsg("Could not read this image. Try a screenshot or different photo.");
    };
    img.src=objectUrl;
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
      setSaved(l=>[r,...l]);setJustAdded(r);setScanStatus("done");setScanMsg(`"${r.title}" saved!`);
      setScanPreview(null);if(fileRef.current)fileRef.current.value="";
    }catch(e:any){setScanStatus("error");setScanMsg(e.message||String(e));}
  };
  const clearScan=()=>{setScanPreview(null);setScanStatus("idle");setScanMsg("");if(fileRef.current)fileRef.current.value="";};

  /* QR scanner — lets a signed-in user scan an Every Chef share code with their
     own camera, inside the app, instead of relying on the phone's native camera
     app (which can open the link in a different, signed-out browser). */
  const stopQrScanner=()=>{
    if(qrRafRef.current!=null){cancelAnimationFrame(qrRafRef.current);qrRafRef.current=null;}
    if(qrStreamRef.current){qrStreamRef.current.getTracks().forEach(t=>t.stop());qrStreamRef.current=null;}
    setShowQrScanner(false);setQrStatus("idle");setQrErr("");
  };
  const handleQrResult=async(text: string)=>{
    // stop the camera, but keep the sheet open while we resolve the link so
    // we can load an Every Chef recipe straight into the signed-in app
    // instead of bouncing out to the public (signed-out-looking) share page
    if(qrRafRef.current!=null){cancelAnimationFrame(qrRafRef.current);qrRafRef.current=null;}
    if(qrStreamRef.current){qrStreamRef.current.getTracks().forEach(t=>t.stop());qrStreamRef.current=null;}
    setQrStatus("loading");setQrErr("");
    try{
      const url=new URL(text, window.location.origin);
      const isEveryChef=url.origin===window.location.origin||/(^|\.)everychef\.app$/.test(url.hostname);
      const slugMatch=isEveryChef?url.pathname.match(/^\/r\/([^/]+)\/?$/):null;
      if(slugMatch){
        const slug=slugMatch[1];
        const res=await fetch(`/api/share?slug=${encodeURIComponent(slug)}`);
        const data=await res.json().catch(()=>({found:false}));
        if(data&&data.found&&data.recipe){
          const r={...data.recipe,id:Date.now(),_dish:data.recipe.title||slug,_ts:Date.now(),_fromCache:true};
          setShowQrScanner(false);setQrStatus("idle");
          setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);
          setRecipe(r);setServings(null);setStatus("done");setTab("search");
          window.scrollTo({top:0,behavior:"smooth"});
          return;
        }
        // not found (expired or bad code) — fall back to the public share page
        window.location.href=url.pathname+url.search;
        return;
      }
      if(url.origin===window.location.origin){
        window.location.href=url.pathname+url.search;
      }else{
        window.location.href=url.href;
      }
    }catch{
      setShowQrScanner(true);setQrStatus("error");
      setQrErr("That doesn't look like an Every Chef recipe link.");
    }
  };
  const openQrScanner=async()=>{
    setShowQrScanner(true);setQrStatus("starting");setQrErr("");
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
      qrStreamRef.current=stream;
      if(qrVideoRef.current){
        qrVideoRef.current.srcObject=stream;
        await qrVideoRef.current.play();
      }
      setQrStatus("scanning");
      const tick=()=>{
        const video=qrVideoRef.current,canvas=qrCanvasRef.current;
        if(video&&canvas&&video.readyState===video.HAVE_ENOUGH_DATA){
          const ctx=canvas.getContext("2d");
          if(ctx){
            canvas.width=video.videoWidth;canvas.height=video.videoHeight;
            ctx.drawImage(video,0,0,canvas.width,canvas.height);
            const img=ctx.getImageData(0,0,canvas.width,canvas.height);
            const code=jsQR(img.data,img.width,img.height);
            if(code&&code.data){handleQrResult(code.data);return;}
          }
        }
        qrRafRef.current=requestAnimationFrame(tick);
      };
      qrRafRef.current=requestAnimationFrame(tick);
    }catch(e:any){
      setQrStatus("error");
      setQrErr(e&&e.name==="NotAllowedError"?"Camera access was denied. Allow camera access in your browser settings and try again.":"Couldn't access the camera on this device.");
    }
  };

  const doFetchUrl=async()=>{
    const url=urlInput.trim();
    if(!url||!url.startsWith("http")){setUrlMsg("Please enter a valid URL starting with http");setUrlStatus("error");return;}
    setUrlStatus("loading");setUrlMsg("");
    try{
      // Step 1: fetch the page HTML — try client-side first, fall back to server proxy.
      // TikTok always goes through the server, which reads the video caption.
      const isTikTok=(()=>{try{return /(^|\.)tiktok\.com$/.test(new URL(url).hostname);}catch{return false;}})();
      let html="";
      let tiktok:any=null;
      try{
        if(isTikTok)throw new Error("use server");
        const res=await fetch(url,{headers:{"Accept":"text/html","Accept-Language":"en-US,en;q=0.9"}});
        if(!res.ok)throw new Error("HTTP "+res.status);
        html=await res.text();
      }catch{
        // CORS blocked — use server proxy
        const res=await fetch("/api/fetch-url",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({url}),
        });
        const data=await res.json();
        if(data.error||!data.text)throw new Error(data.error||"Could not fetch this page.");
        if(data.source==="tiktok")tiktok=data;
        html=data.text;
      }

      if(tiktok){
        const parsed=await callAPI([{role:"user",content:buildUrlPrompt()+`

This text is the caption of a social media cooking video, not a web page. Use only what the caption says: don't invent ingredients. If an amount isn't given, leave "amount" empty. If the caption lists ingredients but no method, write short, plain steps using only those ingredients and set "source_note" to "Steps written from the caption's ingredient list." If the caption does not contain a recipe at all, reply with only {"error":"no_recipe"}.

${tiktok.text}`}]);
        const hasIngs=(parsed?.ingredient_groups||[]).some((g:any)=>(g.items||[]).length);
        if(parsed?.error||!parsed?.title||!hasIngs)throw new Error("This TikTok's caption doesn't include a full recipe. If the recipe is shown in the video, take a screenshot and use Photograph a recipe card.");
        const r={...parsed,id:Date.now(),_dish:parsed.title,_imported:true,_sourceUrl:tiktok.videoUrl||url,_author:tiktok.author||"",
          source_note:parsed.source_note||(tiktok.author?`From @${tiktok.author} on TikTok.`:"From TikTok.")};
        setSaved(l=>[r,...l]);setJustAdded(r);
        setUrlStatus("done");setUrlMsg(`"${r.title}" saved to your collection!`);
        setUrlInput("");
        return;
      }
      if(!html||html.length<200)throw new Error("This site didn't return content. It may be paywalled or require a login.");

      // Step 2: try JSON-LD first — fast, legal, no Claude needed
      const jsonLd=parseJsonLd(html,url);
      if(jsonLd){
        const r={...jsonLd,id:Date.now(),_imported:true};
        setSaved(l=>[r,...l]);setJustAdded(r);
        setUrlStatus("done");setUrlMsg(`"${r.title}" saved to your collection!`);
        setUrlInput("");
        return;
      }

      // Step 3: JSON-LD not found — fall back to Claude text extraction
      const text=html
        .replace(/<script[\s\S]*?<\/script>/gi,"")
        .replace(/<style[\s\S]*?<\/style>/gi,"")
        .replace(/<[^>]+>/g," ")
        .replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
        .replace(/\s{3,}/g,"\n\n").trim();
      if(text.length<200)throw new Error("Not enough content found. This site may be paywalled or unsupported.");
      const parsed=await callAPI([{role:"user",content:[
        {type:"text",text:buildUrlPrompt()+"\n\nPage content:\n"+text.slice(0,12000)},
      ]}]);
      const r={...parsed,id:Date.now(),_dish:parsed.title||"Imported Recipe",_imported:true,_sourceUrl:url};
      setSaved(l=>[r,...l]);setJustAdded(r);
      setUrlStatus("done");setUrlMsg(`"${r.title}" saved to your collection!`);
      setUrlInput("");
    }catch(e:any){
      setUrlStatus("error");
      setUrlMsg(e.message||"Could not import recipe. This site may be paywalled or unsupported.");
    }
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
  const next7Keys=Array.from({length:7},(_,i)=>dateKey(addDays(startOfToday(),i)));
  const consolidated=consolidate(plan,planSides,next7Keys);
  const mealsPlanned=next7Keys.filter(k=>plan[k]).length;

  /* ── SEARCH VIEW ── */
  function SearchView(){
    return(
      <>
        {status==="error"&&(
          <div className="error-box" style={{margin:"20px auto 0",maxWidth:560}}>
            <h3>We couldn't build that recipe</h3>
            <p style={{fontSize:13,color:"#7A6E6A",marginTop:6,lineHeight:1.5}}>
              {/credit balance|billing|insufficient|overloaded|429|529/i.test(errorMsg)
                ?"We can't generate brand-new recipes right now. Recipes in Community and Saved still work — please check back soon."
                :/timed? ?out|timeout|504/i.test(errorMsg)
                  ?"That one took too long to generate. Give it another try."
                  :"Something went wrong on our end. Please try again."}
            </p>
            {!/credit balance|billing/i.test(errorMsg)&&(
              <p style={{fontSize:11,fontFamily:"monospace",background:"#f5f5f5",padding:"8px 12px",borderRadius:6,marginTop:8,textAlign:"left",wordBreak:"break-all",color:"#555"}}>{errorMsg}</p>
            )}
            <button className="back-btn" onClick={()=>doSearch()}>Try again</button>
            <button className="back-btn" style={{marginLeft:8}} onClick={()=>setStatus("idle")}>Dismiss</button>
          </div>
        )}
        {status==="loading"&&GeneratingView()}
        {status!=="done"&&status!=="loading"&&(
          <div className="ck-page">
          {homeMode==="search"&&(
            <>
              <h1 className="ck-title">What are we<br/>cooking tonight?</h1>

              <div className="ck-search">
                <span className="ck-search-icon" aria-hidden="true">{Ic.search(20)}</span>
                <input ref={inputRef} className="ck-search-input" placeholder="Search any dish" aria-label="Search any dish"
                  value={query} onChange={e=>setQuery(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&doSearch()}/>
                {query.trim()?(
                  <button className="ck-search-go" onClick={()=>doSearch()}>Find</button>
                ):(
                  <div className="rx-menu-wrap">
                    <button className="ck-search-scan" aria-label="Scan a recipe card or QR code" aria-expanded={showScanMenu} onClick={()=>setShowScanMenu(v=>!v)}>
                      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3"/><path d="M16 4h3a1 1 0 0 1 1 1v3"/><path d="M20 16v3a1 1 0 0 1-1 1h-3"/><path d="M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    {showScanMenu&&(
                      <>
                        <div className="rx-menu-scrim" onClick={()=>setShowScanMenu(false)}/>
                        <div className="rx-menu" role="menu">
                          <button role="menuitem" className="rx-menu-item" onClick={()=>{setShowScanMenu(false);fileRef.current?.click();}}>{Ic.camera(17)} Photograph a recipe card</button>
                          <button role="menuitem" className="rx-menu-item" onClick={()=>{setShowScanMenu(false);openQrScanner();}}>{Ic.qrscan(17)} Scan an Every Chef QR code</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="ck-chips" role="group" aria-label="Dietary filters">
                {DIETS.map(d=>(
                  <button key={d} aria-pressed={diets.includes(d)} className={`ck-chip${diets.includes(d)?" on":""}`} onClick={()=>toggleDiet(d)}>{d}</button>
                ))}
                <button aria-pressed={seasonal} className={`ck-chip ck-chip-season${seasonal?" on":""}`} onClick={()=>setSeasonal(v=>!v)}>
                  <span style={{display:"flex"}}>{Ic.leaf(13)}</span> In season
                </button>
              </div>
              {seasonal&&(
                <div className="ck-location">
                  <input className="ck-location-input" placeholder="Your city, for what's in season" aria-label="Your city" value={location} onChange={e=>setLocation(e.target.value)}/>
                  <button className="ck-location-btn" onClick={detectLocation} disabled={detecting}>{detecting?"Finding…":<>{Ic.pin(14)} Use my location</>}</button>
                </div>
              )}

              <button className="ck-inspire" onClick={()=>{setHomeMode("inspire");window.scrollTo({top:0});}}>
                <span className="ck-inspire-text">
                  <span className="ck-inspire-title">Not sure what to make?</span>
                  <span className="ck-inspire-sub">Tell us your time and mood. We'll pick three.</span>
                </span>
                <span className="ck-inspire-cta">Inspire me</span>
              </button>
              <button className="ck-textlink" onClick={()=>{setHomeMode("tryme");window.scrollTo({top:0});}}>Or flip through ideas →</button>

              {trendingDishes.length>0&&(
                <section className="ck-section">
                  <h2 className="ck-section-label">Trending now</h2>
                  <div className="ck-trending">
                    {(()=>{
                      // lead with a different dish each day; the list itself refreshes twice a month
                      const n=trendingDishes.length;
                      const off=Math.floor(Date.now()/86400000)%n;
                      return [...trendingDishes.slice(off),...trendingDishes.slice(0,off)];
                    })().map((dish,i)=>(
                      <button key={dish} className="ck-trend-card" onClick={()=>{setQuery(dish);doSearch(dish);}}>
                        <span className="ck-trend-title">{dish}</span>
                        <span className="ck-trend-tag">Trending</span>
                      </button>
                    ))}
                    <button className="ck-trend-card ck-trend-more" onClick={()=>{setTab("community");window.scrollTo({top:0});}}>
                      <span className="ck-trend-title">See all community recipes</span>
                      <span className="ck-trend-more-arrow" aria-hidden="true">→</span>
                    </button>
                  </div>
                </section>
              )}
              {trendingDishes.length===0&&(
                <div className="ck-section">
                  <button className="ck-textlink" onClick={()=>setTab("community")}>Browse community recipes →</button>
                </div>
              )}

              <section className="ck-section">
                <h2 className="ck-section-label">Bring a recipe in</h2>
                <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={onFileChange}/>
                <div className="ck-rows">
                  <button className="ck-row" onClick={()=>fileRef.current?.click()}>
                    <span className="ck-row-icon" aria-hidden="true">{Ic.camera(22)}</span>
                    <span className="ck-row-text"><span className="ck-row-title">Photograph a recipe card</span><span className="ck-row-sub">Grandma's card or a magazine page</span></span>
                    <span className="ck-row-chev" aria-hidden="true">›</span>
                  </button>
                  {scanPreview&&(
                    <div className="ck-row-panel">
                      <img src={scanPreview} className="scan-preview" alt="Recipe card to digitize"/>
                      <div className="scan-actions">
                        <button className="scan-go-btn" onClick={doScan} disabled={scanStatus==="scanning"}>{scanStatus==="scanning"?"Reading…":"Digitize recipe"}</button>
                        <button className="scan-clear-btn" onClick={clearScan}>Clear</button>
                      </div>
                    </div>
                  )}
                  {scanStatus==="done"&&scanMsg&&(
                    <div className="ck-row-panel scan-success">✓ {scanMsg}{" "}
                      <button className="ck-inline-link" onClick={()=>{if(justAdded){setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);setRecipe(justAdded);setServings(null);setStatus("done");setTab("search");}else setTab("library");}}>View recipe →</button>
                    </div>
                  )}
                  {scanStatus==="error"&&<div className="ck-row-panel import-status-err">{scanMsg}</div>}

                  <button className="ck-row" aria-expanded={showUrlRow} onClick={()=>setShowUrlRow(v=>!v)}>
                    <span className="ck-row-icon" aria-hidden="true">{Ic.link(22)}</span>
                    <span className="ck-row-text"><span className="ck-row-title">Paste a link</span><span className="ck-row-sub">We strip the ads and the life story</span></span>
                    <span className="ck-row-chev" aria-hidden="true" style={{transform:showUrlRow?"rotate(90deg)":"none"}}>›</span>
                  </button>
                  {(showUrlRow||urlStatus!=="idle")&&(
                    <div className="ck-row-panel">
                      <div className="import-url-row">
                        <input className="import-url-input" placeholder="https://www.seriouseats.com/recipe/…" aria-label="Recipe link"
                          value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                          onKeyDown={e=>e.key==="Enter"&&doFetchUrl()}
                          disabled={urlStatus==="loading"}/>
                        <button className="import-url-btn" onClick={doFetchUrl} disabled={urlStatus==="loading"||!urlInput.trim()}>
                          {urlStatus==="loading"?"…":"Import"}
                        </button>
                      </div>
                      {urlStatus==="done"&&urlMsg&&(
                        <div className="import-status-ok">✓ {urlMsg}{" "}
                          <button className="ck-inline-link" onClick={()=>{if(justAdded){setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);setRecipe(justAdded);setServings(null);setStatus("done");setTab("search");}else setTab("library");}}>View recipe →</button>
                        </div>
                      )}
                      {urlStatus==="error"&&<div className="import-status-err">{urlMsg}</div>}
                    </div>
                  )}

                  <button className="ck-row" onClick={openQrScanner}>
                    <span className="ck-row-icon" aria-hidden="true">{Ic.qrscan(22)}</span>
                    <span className="ck-row-text"><span className="ck-row-title">Scan an Every Chef QR code</span><span className="ck-row-sub">Opens a shared recipe right here</span></span>
                    <span className="ck-row-chev" aria-hidden="true">›</span>
                  </button>
                </div>
              </section>
            </>
          )}

          {homeMode!=="search"&&(
            <>
              <button className="rx-back ck-mode-back" onClick={()=>setHomeMode("search")}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg>
                Cook
              </button>
              <h1 className="ck-title">{homeMode==="inspire"?"Inspire me":"Flip through ideas"}</h1>
            </>
          )}
              {homeMode==="tryme"&&(
              <div className="fl-wrap">
                <p className="fl-lede">Tap any dish to get the full recipe.</p>
                <div className="fl-bar">
                  <div className="fl-cats" role="group" aria-label="Filter by category">
                    {["All","Quick & Easy","Comfort Food","Date Night","Weekend Project","Bold & Spicy","Light & Fresh","Brunch","Crowd Pleaser","Dessert","Showstopper","Staff Pick","Seasonal"].map(cat=>(
                      <button key={cat} className={`ck-chip${activeCardCat===cat?" on-dark":""}`} aria-pressed={activeCardCat===cat} onClick={()=>setActiveCardCat(cat)}>{cat}</button>
                    ))}
                  </div>
                </div>
                <div className="fl-grid">
                  {(()=>{
                    const pool=activeCardCat==="All"?CARD_POOL:CARD_POOL.filter(c=>c.category===activeCardCat);
                    return seededShuffle(pool,cardSeed).slice(0,8).map((card)=>(
                      <button key={card.title+cardSeed} className="fl-card" onClick={()=>{setQuery(card.title);doSearch(card.title);}}>
                        <span className="fl-card-cat">{card.category}</span>
                        <span className="fl-card-title">{card.title}</span>
                        <span className="fl-card-desc">{card.desc}</span>
                        <span className="fl-card-go" aria-hidden="true">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>
                        </span>
                      </button>
                    ));
                  })()}
                </div>
                <button className="fl-shuffle" onClick={()=>{setCardSeed(x=>x+1);window.scrollTo({top:0,behavior:"smooth"});}}>
                  {Ic.refresh(17)} Shuffle for new ideas
                </button>
              </div>
              )}
              {homeMode==="inspire"&&(
              <div className="home-inspire-wrap">
                {(inspireStatus==="idle"||inspireStatus==="error")&&(
                  <>
                    <p className="inspire-lede">Answer three quick questions and we'll suggest three dishes.</p>
                    {inspireStatus==="error"&&<p className="inspire-error" role="alert">We couldn't come up with ideas just now. Check your connection and try again.</p>}
                    {([["How much time do you have?",INSPIRE_OPTIONS.time,inspireTime,setInspireTime],["What's the vibe?",INSPIRE_OPTIONS.vibe,inspireVibe,setInspireVibe],["How many are you feeding?",INSPIRE_OPTIONS.serves,inspireServes,setInspireServes]] as [string,string[],string,(v:string)=>void][]).map(([label,opts,val,set])=>(
                      <fieldset key={label} className="inspire-section">
                        <legend className="inspire-section-label">{label}</legend>
                        <div className="inspire-chips">
                          {opts.map(o=>(
                            <button key={o} type="button" className={`inspire-chip${val===o?" on":""}`} aria-pressed={val===o} onClick={()=>set(o)}>{o}</button>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                    <div className="inspire-section">
                      <label htmlFor="inspire-fridge" className="inspire-section-label">Anything in the fridge to use up? <span className="inspire-optional">Optional</span></label>
                      <textarea
                        id="inspire-fridge"
                        className="inspire-fridge-input"
                        rows={2}
                        placeholder="e.g. chicken thighs, half a lemon, spinach"
                        value={inspireFridge}
                        onChange={e=>setInspireFridge(e.target.value)}
                      />
                    </div>
                    {diets.length>0&&<p className="inspire-diets">Using your dietary filters: {diets.join(", ")}</p>}
                    <button className="inspire-go-btn" onClick={doInspire} disabled={!(inspireTime&&inspireVibe&&inspireServes)}>
                      {inspireStatus==="error"?"Try again":"Show me ideas"}
                    </button>
                    {!(inspireTime&&inspireVibe&&inspireServes)&&<p className="inspire-hint">Pick a time, a vibe and how many to continue.</p>}
                  </>
                )}

                {inspireStatus==="loading"&&(()=>{
                  const elapsed=Math.max(0,(Date.now()-inspireStart.current)/1000);
                  const pct=Math.round(95*(1-Math.exp(-elapsed/6)));
                  const STEPS=["Reading your answers","Checking what's in season","Matching ideas to your mood","Picking the best three"];
                  const at=elapsed<2?0:elapsed<5?1:elapsed<9?2:3;
                  return(
                    <>
                      <div className="inspire-picks" aria-label="Your answers">
                        {[inspireTime,inspireVibe,inspireServes].map(x=><span key={x} className="inspire-pick">{x}</span>)}
                      </div>
                      <div className="gen-card" aria-live="polite">
                        <div className="gen-card-head">
                          <span className="gen-card-title">Finding ideas</span>
                          <span className="gen-card-time">usually 5–15 sec</span>
                        </div>
                        <div className="gen-bar" role="progressbar" aria-label="Progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div style={{width:`${pct}%`}}/></div>
                        <ul className="gen-steps">
                          {STEPS.map((st,i)=>(
                            <li key={i} className={i<at?"done":i===at?"now":""}>
                              <span className="gen-step-mark" aria-hidden="true">
                                {i<at?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4A021" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>:i===at?<span className="gen-dot"/>:null}
                              </span>
                              {st}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {[0,1,2].map(i=>(
                        <div key={i} className="inspire-card" style={{marginTop:12,opacity:1-i*0.2}} aria-hidden="true">
                          <div className="gen-skel" style={{width:"62%",height:18}}/>
                          <div className="gen-skel" style={{width:"90%"}}/>
                          <div className="gen-skel" style={{width:"40%"}}/>
                        </div>
                      ))}
                    </>
                  );
                })()}

                {inspireStatus==="done"&&(
                  <>
                    <div className="inspire-picks" aria-label="Your answers">
                      {[inspireTime,inspireVibe,inspireServes].map(x=><span key={x} className="inspire-pick">{x}</span>)}
                    </div>
                    {inspireSuggestions.length>0?(
                      <div className="inspire-results">
                        {inspireSuggestions.map((sg:any,i:number)=>(
                          <article key={i} className="inspire-card">
                            <h2 className="inspire-card-title">{sg.title}</h2>
                            {sg.tagline&&<p className="inspire-card-desc">{sg.tagline}</p>}
                            <div className="inspire-card-meta">
                              {sg.prep_time&&<span>{sg.prep_time} prep</span>}
                              {sg.cook_time&&<span>{sg.cook_time} cook</span>}
                              {sg.servings&&<span>Serves {sg.servings}</span>}
                            </div>
                            {sg.why&&<p className="inspire-card-why">{sg.why}</p>}
                            <button className="inspire-card-btn" onClick={()=>pickInspiredRecipe(sg)}>Get the recipe</button>
                          </article>
                        ))}
                      </div>
                    ):(
                      <p className="inspire-error" role="alert">No ideas came back that time. Try again, or change your answers.</p>
                    )}
                    <div className="inspire-again">
                      <button className="ck-textlink" style={{alignSelf:"auto"}} onClick={doInspire}>Show three more</button>
                      <button className="ck-textlink" style={{alignSelf:"auto"}} onClick={()=>{setInspireStatus("idle");setInspireSuggestions([]);}}>Change my answers</button>
                    </div>
                  </>
                )}
              </div>
              )}
          </div>
        )}
        {status==="done"&&recipe&&(()=>{
          const paneCount=pairedSides.length+1;
          const paneWidthPct=100/paneCount;
          const savedTitles=new Set(saved.map((s:any)=>(s.title||"").toLowerCase()));
          const addSideSuggestions=rankSides(recipe).filter(s=>
            s.title.toLowerCase()!==recipe.title.toLowerCase()&&
            !pairedSides.some(p=>p.title.toLowerCase()===s.title.toLowerCase())
          ).slice(0,8);
          const q=addSideQuery.trim().toLowerCase();
          const searchPool=[...saved,...communityRecipes];
          const seen=new Set<string>();
          const addSideResults=q?searchPool.filter((r:any)=>{
            const t=(r.title||"").toLowerCase();
            if(!t||t===recipe.title.toLowerCase()||pairedSides.some(p=>p.title.toLowerCase()===t))return false;
            if(!t.includes(q))return false;
            if(seen.has(t))return false;
            seen.add(t);return true;
          }).slice(0,12):[];
          const activeSide=activePane>0?pairedSides[activePane-1]:null;
          const activeRecipe=activePane===0?recipe:(activeSide&&activeSide.status==="done"?activeSide.recipe:null);
          const asv=activeRecipe?isSaved(activeRecipe):false;
          const backLabel=returnTab==="library"?"Library":returnTab==="saved"?"Saved":returnTab==="community"?"Community":returnTab==="week"?"This week":returnTab==="family"?"Family":"Search";
          const goBack=()=>{
            const dest=returnTab;
            if(returnDayKey)setPlanSides(p=>({...p,[returnDayKey]:pairedSides}));
            setReturnTab(null);setReturnDayKey(null);setStatus("idle");setRecipe(null);setQuery("");
            closePairedSide();setShowRecipeMenu(false);setShowAddSide(false);
            if(dest)setTab(dest);
          };
          const toggleAddSide=()=>{
            setShowAddSide(v=>!v);setAddSideMode("suggest");setAddSideQuery("");
            if(communityStatus==="idle")loadCommunity();
          };
          return(
          <div className="rx-shell">
            <div className="rx-topbar">
              <button className="rx-back" onClick={goBack}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg>
                {backLabel}
              </button>
              <div className="rx-menu-wrap">
                <button className="rx-icon-btn" aria-label="More options" aria-expanded={showRecipeMenu} onClick={()=>setShowRecipeMenu(v=>!v)}>
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
                </button>
                {showRecipeMenu&&(
                  <>
                    <div className="rx-menu-scrim" onClick={()=>setShowRecipeMenu(false)}/>
                    <div className="rx-menu" role="menu">
                      {activeRecipe&&(
                        <button role="menuitem" className="rx-menu-item" onClick={()=>{setShowRecipeMenu(false);shareRecipe(activeRecipe);}}>{Ic.share(17)} Share</button>
                      )}
                      {activePane===0?(
                        <>
                          <button role="menuitem" className="rx-menu-item" onClick={()=>{setShowRecipeMenu(false);setTimeout(()=>window.print(),60);}}>{Ic.printer(17)} Print</button>
                          <button role="menuitem" className="rx-menu-item" onClick={()=>{setShowRecipeMenu(false);photoInputRef.current?.click();}}>{Ic.camera(17)} Add a photo</button>
                          <button role="menuitem" className="rx-menu-item" onClick={()=>{setShowRecipeMenu(false);setEditRecipe(JSON.parse(JSON.stringify(recipe)));setStepRewrite("idle");setStepsSyncedFor("");setShowEditPanel(true);}}>
                            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit recipe
                          </button>
                          {!recipe._scanned&&!recipe._imported&&(
                            <button role="menuitem" className="rx-menu-item" onClick={()=>{setShowRecipeMenu(false);setTimeout(()=>document.getElementById("rx-remix")?.scrollIntoView({behavior:"smooth",block:"start"}),60);}}>{Ic.refresh(17)} Remix</button>
                          )}
                          <button role="menuitem" className="rx-menu-item" onClick={()=>setIngTextSize(s=>s==="normal"?"large":s==="large"?"xl":"normal")}>
                            <span className="rx-menu-aa" aria-hidden="true">Aa</span>
                            Text size: {ingTextSize==="normal"?"Regular":ingTextSize==="large"?"Large":"Extra large"}
                          </button>
                        </>
                      ):(
                        <>
                          {activeRecipe&&(
                            <button role="menuitem" className="rx-menu-item" onClick={()=>{setShowRecipeMenu(false);setReturnTab(null);setReturnDayKey(null);setRecipe(activeRecipe);setServings(null);setStatus("done");closePairedSide();window.scrollTo({top:0});}}>
                              {Ic.arrowLeft(17)} Open as its own recipe
                            </button>
                          )}
                          <button role="menuitem" className="rx-menu-item rx-menu-danger" onClick={()=>{setShowRecipeMenu(false);removePairedSide(activePane-1);}}>
                            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                            Remove this side
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="rx-tabs" role="tablist" aria-label="Dishes in this meal">
              <button role="tab" aria-selected={activePane===0} className={`rx-tab${activePane===0?" active":""}`} onClick={()=>setActivePane(0)}>{recipe.title}</button>
              {pairedSides.map((p,i)=>(
                <button key={i} role="tab" aria-selected={activePane===i+1} className={`rx-tab rx-tab-side${activePane===i+1?" active":""}`} onClick={()=>setActivePane(i+1)}>
                  <span style={{display:"flex",flexShrink:0}}>{Ic.leaf(13)}</span>
                  <span className="rx-tab-label">{p.title}</span>
                  {p.status==="loading"&&<span className="rx-tab-dot" aria-label="loading"/>}
                  {p.status==="error"&&<span aria-label="failed to load"> !</span>}
                </button>
              ))}
              <button className={`rx-tab-add${showAddSide?" open":""}`} aria-expanded={showAddSide} onClick={toggleAddSide}>
                {pairedSides.length===0?"+ Add a side":"+ Side"}
              </button>
            </div>

            {showAddSide&&(
              <div className="add-side-panel rx-add-side">
                <div className="add-side-tabs">
                  <button className={`add-side-tab${addSideMode==="suggest"?" active":""}`} onClick={()=>setAddSideMode("suggest")}>Suggested for this dish</button>
                  <button className={`add-side-tab${addSideMode==="search"?" active":""}`} onClick={()=>setAddSideMode("search")}>Search your recipes</button>
                </div>
                {addSideMode==="suggest"?(
                  addSideSuggestions.length>0?(
                    <div className="side-panel-row">
                      {addSideSuggestions.map((s,i)=>(
                        <button key={i} className="side-card" onClick={()=>openPairedSide(s.title)}>
                          <span className="side-card-title">{s.title}</span>
                          <span className="side-card-tagline">{s.tagline}</span>
                        </button>
                      ))}
                    </div>
                  ):(
                    <div className="add-side-empty">You've added all the suggested sides for this dish.</div>
                  )
                ):(
                  <>
                    <input
                      className="add-side-search-input"
                      placeholder="Search saved & community recipes"
                      aria-label="Search saved and community recipes"
                      value={addSideQuery}
                      onChange={e=>setAddSideQuery(e.target.value)}
                      autoFocus
                    />
                    {q&&(
                      addSideResults.length>0?(
                        <div className="add-side-results">
                          {addSideResults.map((r:any,i:number)=>(
                            <button key={i} className="add-side-result" onClick={()=>openPairedSide(r.title,r)}>
                              {savedTitles.has((r.title||"").toLowerCase())?Ic.heartFill(13):Ic.search(13)} {r.title}
                            </button>
                          ))}
                        </div>
                      ):(
                        <div className="add-side-empty">No matches in Saved or Community.</div>
                      )
                    )}
                  </>
                )}
              </div>
            )}

            <div className="dish-swipe-outer">
              <div
                className="dish-swipe-track"
                style={{width:`${paneCount*100}%`,transform:`translateX(-${activePane*paneWidthPct}%)`}}
                onTouchStart={(e)=>{swipeStartX.current=e.touches[0].clientX;}}
                onTouchEnd={(e)=>{
                  if(swipeStartX.current==null)return;
                  const dx=e.changedTouches[0].clientX-swipeStartX.current;
                  swipeStartX.current=null;
                  if(dx<-60)setActivePane(p=>Math.min(p+1,paneCount-1));
                  else if(dx>60)setActivePane(p=>Math.max(p-1,0));
                }}
              >
                <div className="dish-swipe-pane" style={{width:`${paneWidthPct}%`,...(activePane===0?{}:{height:0,overflow:"visible"})}} aria-hidden={activePane!==0}>{RecipeView()}</div>
                {pairedSides.map((p,i)=>(
                  <div key={i} className="dish-swipe-pane" style={{width:`${paneWidthPct}%`,...(activePane===i+1?{}:{height:0,overflow:"visible"})}} aria-hidden={activePane!==i+1}>{SidePaneView(p,i)}</div>
                ))}
              </div>
            </div>

            {(()=>{
              // One grocery list for the whole meal: the main dish plus every loaded side.
              // It stays put while you swipe; the dish on screen has its items highlighted.
              const dishes=[{title:recipe.title,r:recipe},...pairedSides.filter(p=>p.status==="done"&&p.recipe).map(p=>({title:p.title,r:p.recipe}))];
              const activeTitle=activePane===0?recipe.title:pairedSides[activePane-1]?.title;
              const gmap:Record<string,{name:string;dishes:string[]}>={};
              for(const d of dishes){
                for(const item of (d.r.grocery_items||[])){
                  const k=String(item).toLowerCase().trim();
                  if(!k)continue;
                  if(!gmap[k])gmap[k]={name:item,dishes:[]};
                  if(!gmap[k].dishes.includes(d.title))gmap[k].dishes.push(d.title);
                }
              }
              const items=Object.entries(gmap);
              if(!items.length)return null;
              const store=RETAILERS.find(r=>r.id===retailer);
              const multi=dishes.length>1;
              const activeCount=items.filter(([,it])=>it.dishes.includes(activeTitle)).length;
              return(
                <section className="rx-groceries" id="rx-groceries" aria-label="Grocery list">
                  <div className="rx-gro-head">
                    <h2 className="rx-gro-title">Grocery list</h2>
                    <span className="rx-gro-sub">{items.length} item{items.length===1?"":"s"}{multi?` for ${dishes.length} dishes`:""}</span>
                  </div>
                  {multi&&<p className="rx-gro-note"><span className="rx-gro-swatch" aria-hidden="true"/>Highlighted: the {activeCount} item{activeCount===1?"":"s"} for <strong>{activeTitle}</strong></p>}
                  {!store&&<p className="rx-gro-note">Choose a store under the main dish's details to get shopping links.</p>}
                  <ul className="rx-gro-list">
                    {items.map(([k,it])=>{
                      const on=!multi||it.dishes.includes(activeTitle);
                      return(
                        <li key={k} className={`rx-gro-item${on?" on":""}`}>
                          <label className="rx-gro-check">
                            <input type="checkbox"/>
                            <span className="rx-gro-name">{it.name}</span>
                          </label>
                          {multi&&(
                            <span className="rx-gro-dishes">
                              {it.dishes.map(d=><span key={d} className={`rx-gro-dish${d===recipe.title?"":" side"}`}>{d===recipe.title?"Main":d}</span>)}
                            </span>
                          )}
                          {store&&<a className="rx-gro-shop" href={store.url(it.name)} target="_blank" rel="noopener noreferrer" aria-label={`Find ${it.name} at ${store.name}`}>{store.name}</a>}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })()}

            <div className="rx-actionbar">
              <div className="rx-actionbar-inner">
                <button className={`rx-save${asv?" saved":""}`} disabled={!activeRecipe} onClick={()=>activeRecipe&&toggleSave(activeRecipe)}>
                  {asv?Ic.heartFill(18):Ic.heart(18)} {asv?"Saved":"Save"}
                </button>
                <button className="rx-cook" disabled={!activeRecipe||!(activeRecipe.steps||[]).length} onClick={()=>activeRecipe&&openCookMode(activeRecipe)}>
                  Start cooking
                </button>
              </div>
            </div>
          </div>
          );
        })()}
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
    const photo=recipe?.id?recipePhotos[recipe.id]:null;
    const ingFontSize=ingTextSize==="xl"?21:ingTextSize==="large"?19:17;

    const handlePhotoUpload=(e:React.ChangeEvent<HTMLInputElement>)=>{
      const file=e.target.files?.[0];
      if(!file||!recipe?.id)return;
      const reader=new FileReader();
      reader.onload=()=>{
        if(typeof reader.result==="string"){
          setRecipePhotos(prev=>({...prev,[recipe.id]:reader.result as string}));
        }
      };
      reader.readAsDataURL(file);
    };

    const openEdit=()=>{
      setEditRecipe(JSON.parse(JSON.stringify(recipe)));
      setShowEditPanel(true);
    };

    return(
      <div className="recipe-page rx-page">
        <input ref={photoInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhotoUpload}/>
        {photo&&<img src={photo} className="rx-photo" alt={recipe.title}/>}
        <header className="rx-head">
          <div className="rx-eyebrow">{recipe._author?`From @${recipe._author} on TikTok`:recipe._scanned?"Scanned recipe":recipe._imported?"Imported recipe":recipe._fromCache?"Community recipe":"Every Chef original"}</div>
          <h1 className="rx-title">{recipe.title}</h1>
          {recipe.tagline&&<p className="rx-tagline">{recipe.tagline}</p>}
          {recipe.seasonal_note&&<div className="rx-seasonal"><span style={{display:"flex"}}>{Ic.leaf(13)}</span> {recipe.seasonal_note}</div>}
          <div className="rx-meta">
            <div className="rx-meta-item"><span className="rx-meta-label">Prep</span><span className="rx-meta-value">{recipe.prep_time}</span></div>
            <div className="rx-meta-div"/>
            <div className="rx-meta-item"><span className="rx-meta-label">Cook</span><span className="rx-meta-value">{recipe.cook_time}</span></div>
            <div className="rx-meta-div"/>
            <div className="rx-meta-item rx-meta-serves">
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                <span className="rx-meta-label">Serves</span>
                <span className="rx-meta-value">{curS}</span>
              </div>
              <div className="rx-stepper">
                <button aria-label="Fewer servings" onClick={()=>setServings(Math.max(1,curS-1))}>−</button>
                <button aria-label="More servings" onClick={()=>setServings(curS+1)}>+</button>
              </div>
            </div>
          </div>
          <div className="rx-shop">
            <label className="rx-shop-label" htmlFor="rx-shop-select">Where are you shopping?</label>
            <div className="rx-shop-row">
              <div className="rx-shop-select-wrap">
                <span className="rx-shop-dot" style={{background:RETAILERS.find(r=>r.id===retailer)?.color||"#CFC6B8"}} aria-hidden="true"/>
                <select id="rx-shop-select" className="rx-shop-select" value={retailer} onChange={e=>setRetailer(e.target.value)}>
                  <option value="">Choose a store</option>
                  {RETAILERS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <svg className="rx-shop-chev" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
              <button className="ck-textlink" onClick={()=>document.getElementById("rx-groceries")?.scrollIntoView({behavior:"smooth",block:"start"})}>Grocery list ↓</button>
            </div>
          </div>
        </header>

        <div className="recipe-body">
        <div className="two-col">
          <div>
            <h2 className="section-label">Ingredients</h2>
            {groups.map((g:any,gi:number)=>(
              <div key={gi} className="ing-group">
                {g.label&&<div className="ing-group-label">{g.label}</div>}
                <ul className="ing-list">
                  {(g.items||[]).map((ing:any,ii:number)=>(
                    (()=>{const pt=ingParts(ing);return(
                    <li key={ii} className={`rx-ing${pt.prep?"":" no-prep"}`} style={{fontSize:ingFontSize}}>
                      <span className="rx-ing-main">{pt.amount&&<span className="rx-ing-amt">{renderAmount(normalizeAmount(scaleAmt(pt.amount,ratio)))}</span>}{pt.item}</span>
                      {pt.prep&&<span className="rx-ing-prep">{pt.prep}</span>}
                    </li>);})()
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div>
            <h2 className="section-label">Method</h2>
            <ol className="steps-list">
              {(recipe.steps||[]).map((step:string,i:number)=>(
                <li key={i} className="step-item">
                  <span className="step-num">{i+1}</span>
                  <span className="step-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Star rating */}
        {!recipe._scanned&&!recipe._imported&&(
          <div style={{padding:"28px 0 0",borderTop:"1px solid #EDE8E0",marginTop:32}}>
            <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:"#E8431A",marginBottom:8}}>Rate this recipe</div>
                <div className="star-row">
                  {[1,2,3,4,5].map(n=>{
                    const currentRating=recipe?.id?ratings[recipe.id]||0:0;
                    return(
                      <button key={n} className={`star${currentRating>=n?" filled":""}`}
                        style={{fontSize:24}}
                        onClick={()=>recipe?.id&&setRatings(prev=>({...prev,[recipe.id]:prev[recipe.id]===n?0:n}))}>
                        ★
                      </button>
                    );
                  })}
                  {recipe?.id&&ratings[recipe.id]>0&&(
                    <span style={{fontSize:12,color:"#7A6E6A",marginLeft:8,alignSelf:"center"}}>
                      {["","One star","Two stars","Three stars","Four stars","Five stars"][ratings[recipe.id]]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remix section — after method, before grocery */}
        {!recipe._scanned&&!recipe._imported&&(
          <div id="rx-remix" className="remix-section" style={{margin:"28px 0 0",maxWidth:"100%",scrollMarginTop:16}}>
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
        </div>{/* recipe-body */}
      </div>
    );
  }

  /* ── SIDE DISH PANE (paired alongside the main recipe) ── */
  function SidePaneView(pane:{title:string;status:string;recipe:any}, idx:number){
    if(pane.status==="loading"||!pane.recipe){
      return(
        <div className="side-pane-loading">
          <div className="spinner"/>
          <div className="loading-text" style={{fontSize:15}}>{pane.status==="error"?"Couldn't load that side.":`Making ${pane.title}…`}</div>
          {pane.status==="error"&&(
            <div style={{display:"flex",gap:10}}>
              <button className="back-btn" onClick={()=>retryPairedSide(idx)}>Try again</button>
              <button className="back-btn" onClick={()=>removePairedSide(idx)}>Remove</button>
            </div>
          )}
        </div>
      );
    }
    const r=pane.recipe;
    const groups=r.ingredient_groups||(r.ingredients?[{label:"",items:r.ingredients}]:[]);
    const ingFontSize=ingTextSize==="xl"?21:ingTextSize==="large"?19:17;
    return(
      <div className="recipe-page rx-page side-pane-page">
        <header className="rx-head">
          <div className="rx-eyebrow" style={{color:"#1E3A2F",display:"flex",alignItems:"center",gap:6}}>{Ic.leaf(13)} Side for {recipe.title}</div>
          <h1 className="rx-title">{r.title}</h1>
          {r.tagline&&<p className="rx-tagline">{r.tagline}</p>}
          <div className="rx-meta">
            <div className="rx-meta-item"><span className="rx-meta-label">Prep</span><span className="rx-meta-value">{r.prep_time}</span></div>
            <div className="rx-meta-div"/>
            <div className="rx-meta-item"><span className="rx-meta-label">Cook</span><span className="rx-meta-value">{r.cook_time}</span></div>
            <div className="rx-meta-div"/>
            <div className="rx-meta-item"><span className="rx-meta-label">Serves</span><span className="rx-meta-value">{r.servings}</span></div>
          </div>
        </header>
        <div className="recipe-body">
          <div className="two-col">
            <div>
              <h2 className="section-label">Ingredients</h2>
              {groups.map((g:any,gi:number)=>(
                <div key={gi} className="ing-group">
                  {g.label&&<div className="ing-group-label">{g.label}</div>}
                  <ul className="ing-list">
                    {(g.items||[]).map((ing:any,ii:number)=>(
                      (()=>{const pt=ingParts(ing);return(
                      <li key={ii} className={`rx-ing${pt.prep?"":" no-prep"}`} style={{fontSize:ingFontSize}}>
                        <span className="rx-ing-main">{pt.amount&&<span className="rx-ing-amt">{renderAmount(normalizeAmount(pt.amount))}</span>}{pt.item}</span>
                        {pt.prep&&<span className="rx-ing-prep">{pt.prep}</span>}
                      </li>);})()
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div>
              <h2 className="section-label">Method</h2>
              <ol className="steps-list">
                {(r.steps||[]).map((step:string,i:number)=>(
                  <li key={i} className="step-item">
                    <span className="step-num">{i+1}</span>
                    <span className="step-text">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── COMMUNITY VIEW ── */
  function CommunityView(){
    const COMM_CATS=["All","Appetizers & Snacks","Soups & Stews","Salads","Mains","Brunch","Desserts"];
    const sq=communitySearch.trim().toLowerCase();

    function matchesSearch(r:any):boolean{
      if(!sq) return true;
      if(r.title?.toLowerCase().includes(sq)) return true;
      // Search ingredient names too
      const ingredients=(r.ingredient_groups||[])
        .flatMap((g:any)=>(g.items||[]).map((item:any)=>item.name?.toLowerCase()||""));
      return ingredients.some((ing:string)=>ing.includes(sq));
    }

    const filtered=communityRecipes.filter(r=>{
      const catMatch=communityTab==="All"||communityCategory(r.title)===communityTab;
      return catMatch&&matchesSearch(r);
    });

    return(
      <div className="community-wrap">
        <button className="rx-back" style={{marginLeft:-12}} onClick={()=>{setTab("search");setHomeMode("search");window.scrollTo({top:0});}}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg>
          Cook
        </button>
        <div className="community-header">
          <h2 className="community-title"><em>Community</em> recipes</h2>
          <p className="community-sub">Real dishes, generated by everyone using Every Chef.</p>
        </div>

        {!communityAuthed&&communityStatus==="done"&&(
          <div className="community-gate">
            <div className="community-gate-icon">{Ic.lock(16)}</div>
            <div className="community-gate-text">
              <div className="community-gate-title">Sign up to see the full Community</div>
              <div className="community-gate-desc">You're seeing a few highlights. Create a free account to browse everything that's been generated so far.</div>
            </div>
            <button className="community-gate-btn" onClick={()=>openSignIn()}>Sign up free</button>
          </div>
        )}

        {communityStatus==="loading"&&(
          <div style={{textAlign:"center",padding:"60px 20px",color:C.muted,fontSize:14}}>Loading recipes…</div>
        )}
        {communityStatus==="error"&&(
          <div style={{textAlign:"center",padding:"60px 20px",color:C.muted,fontSize:14}}>Couldn't load Community right now. Try again in a moment.</div>
        )}

        {communityStatus==="done"&&(
          <>
            {/* Search */}
            <div className="community-search-wrap">
              <span className="community-search-icon">{Ic.search(16)}</span>
              <input
                className="community-search-input"
                placeholder="Search by dish or ingredient…"
                value={communitySearch}
                onChange={e=>setCommunitySearch(e.target.value)}
              />
              {communitySearch&&(
                <button className="community-search-clear" onClick={()=>setCommunitySearch("")}>×</button>
              )}
            </div>

            {/* Category tabs — hidden during active search */}
            {!sq&&(
              <div className="community-cat-tabs">
                {COMM_CATS.map(cat=>(
                  <button key={cat} className={`community-cat-tab${communityTab===cat?" active":""}`} onClick={()=>setCommunityTab(cat)}>{cat}</button>
                ))}
              </div>
            )}

            {sq&&(
              <div className="community-result-count">
                {filtered.length===0?"No results":""}
                {filtered.length===1?"1 recipe found":""}
                {filtered.length>1?`${filtered.length} recipes found`:""}
              </div>
            )}

            {filtered.length===0?(
              <div style={{textAlign:"center",padding:"40px 20px",color:C.muted,fontSize:14}}>
                {sq?`No recipes found for "${communitySearch}"`:`No ${communityTab==="All"?"community":communityTab.toLowerCase()} recipes yet — check back soon.`}
              </div>
            ):(
              <div className="community-list">
                {filtered.map((r:any,i:number)=>{
                  const swatchColors=["#F4A021","#E8431A","#1E3A2F"];
                  const swatch=swatchColors[i%3];
                  const cat=communityCategory(r.title);
                  return(
                    <div key={r.title+i} className="community-list-item" onClick={()=>openCommunityRecipe(r)}>
                      <div className="community-list-swatch" style={{background:swatch}}/>
                      <div className="community-list-text">
                        <div className="community-list-title">{r.title}</div>
                        <div className="community-list-tagline">{r.tagline}</div>
                        <div className="community-list-cat" style={{color:swatch}}>{cat}</div>
                      </div>
                      <svg className="community-list-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  );
                })}
              </div>
            )}
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

  /* ── GENERATING (loading a new recipe) ── */
  function GeneratingView(){
    const elapsed=Math.max(0,(Date.now()-genStart)/1000);
    const pct=Math.round(95*(1-Math.exp(-elapsed/14)));
    const STEPS=["Comparing trusted recipes","Balancing the flavors","Writing the method","Building the grocery list"];
    const at=elapsed<5?0:elapsed<12?1:elapsed<20?2:3;
    return(
      <div className="gen-page">
        <div className="rx-topbar">
          <button className="rx-back" onClick={cancelSearch}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg>
            Cancel
          </button>
        </div>
        <div className="gen-body">
          <h1 className="rx-title">{loadingDish||"Your recipe"}</h1>
          <div className="gen-skel" style={{width:"86%"}}/>
          <div className="gen-skel" style={{width:"58%"}}/>
          <div className="gen-card" aria-live="polite">
            <div className="gen-card-head">
              <span className="gen-card-title">Writing your recipe</span>
              <span className="gen-card-time">usually 15–40 sec</span>
            </div>
            <div className="gen-bar" role="progressbar" aria-label="Recipe progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div style={{width:`${pct}%`}}/></div>
            <ul className="gen-steps">
              {STEPS.map((s,i)=>(
                <li key={i} className={i<at?"done":i===at?"now":""}>
                  <span className="gen-step-mark" aria-hidden="true">
                    {i<at?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4A021" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>:i===at?<span className="gen-dot"/>:null}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <h2 className="section-label gen-label">Ingredients</h2>
          {[70,54,78,46,62].map((w,i)=>(
            <div key={i} className="gen-row" style={{opacity:1-i*0.15}}>
              <div className="gen-skel" style={{width:48,margin:0}}/>
              <div className="gen-skel" style={{width:`${w}%`,margin:0}}/>
            </div>
          ))}
          <p className="gen-note">Brand-new recipes take a moment to write. Recipes someone has already made open instantly.</p>
        </div>
      </div>
    );
  }

  /* ── LIBRARY (saved + family + recent) ── */
  function LibraryView(){
    const shared=sharedRecipes.filter(r=>!saved.some(s=>s.id===r.id));
    const allRecipes=[...saved,...shared];
    const sq=savedSearch.trim().toLowerCase();
    const matches=(r:any)=>!sq||(r.title||"").toLowerCase().includes(sq)||(r.tagline||"").toLowerCase().includes(sq);
    const catOf=(r:any)=>categoryOverrides[r.id]||guessCategory(r);
    const base=libFilter==="mine"?saved:libFilter==="sides"?allRecipes.filter((r:any)=>catOf(r)==="Sides"):allRecipes;
    const filtered=base.filter(matches);
    const grouped: Record<string,any[]>={};
    filtered.forEach((r:any)=>{
      const cat=catOf(r);
      if(!grouped[cat])grouped[cat]=[];
      grouped[cat].push(r);
    });
    const sortedCats=RECIPE_CATEGORIES.filter(c=>grouped[c]&&grouped[c].length>0);
    const historyFiltered=history.filter(matches);
    const FILTERS:[string,string][]=[["all","All"],["mine","Mine"],["family","Family"],["sides","Sides"],["recent","Recent"]];
    return(
      <div className="lib-page">
        <div className="pl-head">
          <h1 className="ck-title" style={{margin:0}}>Library</h1>
          <span className="pl-range">{allRecipes.length} recipe{allRecipes.length===1?"":"s"}</span>
        </div>
        {libFilter!=="family"&&(
          <label className="lib-search">
            <span aria-hidden="true" style={{display:"flex",color:"#6E635F"}}>{Ic.search(18)}</span>
            <input placeholder={libFilter==="recent"?"Search recent recipes":"Search your recipes"} aria-label="Search your recipes"
              value={savedSearch} onChange={e=>setSavedSearch(e.target.value)}/>
          </label>
        )}
        <div className="lib-filters" role="tablist" aria-label="Filter recipes">
          {FILTERS.map(([k,l])=>(
            <button key={k} role="tab" aria-selected={libFilter===k} className={`ck-chip${libFilter===k?" on-dark":""}`} onClick={()=>setLibFilter(k as any)}>
              {l}{k==="mine"&&saved.length?` · ${saved.length}`:""}
            </button>
          ))}
        </div>

        {libFilter==="family"?FamilyView():libFilter==="recent"?(

          history.length===0?(
            <div className="history-empty"><h3>No history yet</h3><p>Every recipe you generate appears here automatically.</p></div>
          ):(
            <>
              <div className="history-list">
                {historyFiltered.map((r:any)=>{
                  const sv=isSaved(r);
                  return(
                    <div key={r.id} className="history-item">
                      <div className="history-item-main" onClick={()=>{setReturnTab("library");setPairedSides([]);setActivePane(0);setReturnDayKey(null);setRecipe(r);setServings(null);setStatus("done");setTab("search");}}>
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
            <div className="empty-state"><h3>Nothing saved yet</h3><p>Open any recipe and tap Save, or bring one in from the Cook tab.</p></div>
          ):filtered.length===0?(
            <div className="empty-state">
              {libFilter==="sides"&&!sq
                ?<><h3>No sides yet</h3><p>Recipes tagged as sides show up here. Tap a recipe's category badge to tag it.</p></>
                :<><h3>No matches</h3><p>Try a different search.</p></>}
            </div>
          ):(
            <div className="cards-grid lib-grid">
              {sortedCats.map(cat=>grouped[cat].map((r:any)=>{
                      const isSharedOnly=!saved.some(s=>s.id===r.id);
                      const rating=ratings[r.id]||0;
                      const isConfirming=confirmRemove===r.id;
                      return(
                        <div key={r.id} className="recipe-card" onClick={()=>{setReturnTab("library");setPairedSides([]);setActivePane(0);setReturnDayKey(null);setRecipe(r);setServings(null);setStatus("done");setTab("search");}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            <div className="card-tag">{r._scanned?"Scanned":r._imported?"Imported":isSharedOnly?"Shared":r.seasonal_note?"Seasonal":"Saved"}</div>
                            {!isSharedOnly&&(
                              editingCategory===r.id?(
                                <select className="cat-select"
                                  value={categoryOverrides[r.id]||guessCategory(r)}
                                  onClick={e=>e.stopPropagation()}
                                  onChange={e=>{e.stopPropagation();setCategoryOverrides(p=>({...p,[r.id]:e.target.value}));setEditingCategory(null);}}>
                                  {RECIPE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                                </select>
                              ):(
                                <button className={`cat-badge${cat==="Sides"?" is-side":""}`} onClick={e=>{e.stopPropagation();setEditingCategory(r.id);}}>
                                  {cat==="Sides"&&<span style={{display:"flex"}}>{Ic.leaf(10)}</span>}
                                  {cat}
                                </button>
                              )
                            )}
                          </div>
                          {!isSharedOnly&&!categoryOverrides[r.id]&&cat==="Other"&&(r._scanned||r._imported)&&(
                            <button className="side-quicktag" onClick={e=>{e.stopPropagation();setCategoryOverrides(p=>({...p,[r.id]:"Sides"}));}}>
                              Is this a side dish? Tag it →
                            </button>
                          )}
                          <div className="card-title">{r.title}</div>
                          <div className="card-desc">{r.tagline}</div>
                          <div className="card-meta"><span>{r.prep_time} prep</span><span>{r.cook_time} cook</span><span>{r.servings} srv</span></div>
                          {/* Star rating */}
                          <div className="star-row" onClick={e=>e.stopPropagation()}>
                            {[1,2,3,4,5].map(n=>(
                              <button key={n} className={`star${rating>=n?" filled":""}`}
                                onClick={()=>setRatings(prev=>({...prev,[r.id]:prev[r.id]===n?0:n}))}>
                                ★
                              </button>
                            ))}
                          </div>
                          <div className="card-actions" onClick={e=>e.stopPropagation()}>
                            <button className="card-btn" onClick={()=>{setAssignDay("fromSaved_"+r.id);setTab("week");}}>+ Week</button>
                            {!isSharedOnly&&!isConfirming&&(
                              <button className="card-btn danger" onClick={()=>setConfirmRemove(r.id)}>Remove</button>
                            )}
                            {!isSharedOnly&&isConfirming&&(
                              <div className="confirm-remove" onClick={e=>e.stopPropagation()}>
                                <span className="confirm-remove-text">Remove this recipe?</span>
                                <button className="confirm-remove-no" onClick={()=>setConfirmRemove(null)}>Cancel</button>
                                <button className="confirm-remove-yes" onClick={()=>{setSaved(l=>l.filter((s:any)=>s.id!==r.id));setConfirmRemove(null);}}>Remove</button>
                              </div>
                            )}
                            {isSharedOnly&&<button className="card-btn" onClick={()=>setSaved(l=>[r,...l])}>Save Mine</button>}
                          </div>
                        </div>
                      );
                    }))}
            </div>
          )
        )}
      </div>
    );
  }

  /* ── PLAN (scrolling timeline: today first, earlier days on demand) ── */
  function WeekView(){
    const today=startOfToday();
    const todayKey=dateKey(today);
    const tomorrowKey=dateKey(addDays(today,1));
    const DOW=["SUN","MON","TUE","WED","THU","FRI","SAT"];
    const fmtMD=(d:Date)=>d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    const shortLabel=(k:string)=>k===todayKey?"Today":k===tomorrowKey?"Tomorrow":(()=>{const d=keyToDate(k);const w=DOW[d.getDay()];return `${w[0]}${w.slice(1).toLowerCase()} ${d.getDate()}`;})();
    // past: the last 7 days always, older days (up to PLAN_PAST_DAYS) only if something was planned
    const earlierKeys=Array.from({length:PLAN_PAST_DAYS},(_,i)=>dateKey(addDays(today,i-PLAN_PAST_DAYS)))
      .filter((k,i)=>i>=PLAN_PAST_DAYS-7||plan[k]);
    const aheadKeys=Array.from({length:planAhead},(_,i)=>dateKey(addDays(today,i)));
    const missed=earlierKeys.filter(k=>plan[k]&&!planMade[k]);
    const moveTargets=aheadKeys.filter(k=>!plan[k]).slice(0,4);
    const openMeal=(k:string)=>{const r=plan[k];if(!r)return;setReturnTab("week");setReturnDayKey(k);setPairedSides(planSides[k]||[]);setActivePane(0);setRecipe(r);setServings(null);setStatus("done");setTab("search");window.scrollTo({top:0});};
    const removeMeal=(k:string)=>{
      setPlan(p=>{const n={...p};delete n[k];return n;});
      setPlanSides(p=>{const n={...p};delete n[k];return n;});
      setPlanMade(p=>{const n={...p};delete n[k];return n;});
    };
    const moveMeal=(from:string,to:string)=>{
      setPlan(p=>{const n={...p};n[to]=n[from];delete n[from];return n;});
      setPlanSides(p=>{const n={...p};if(n[from])n[to]=n[from];delete n[from];return n;});
      setPlanMade(p=>{const n={...p};delete n[from];delete n[to];return n;});
    };
    const markMade=(k:string,v:boolean)=>setPlanMade(p=>{const n={...p};if(v)n[k]=true;else delete n[k];return n;});
    const weekDivider=(k:string)=>{const d=keyToDate(k);return d.getDay()===1?<li key={`w-${k}`} className="pl-week" aria-hidden="true"><span>Week of {fmtMD(d)}</span></li>:null;};
    const row=(k:string)=>{
      const d=keyToDate(k);
      const past=k<todayKey, isToday=k===todayKey, isTomorrow=k===tomorrowKey;
      const r=plan[k];
      const sides=planSides[k]||[];
      const made=!!planMade[k];
      return(
        <li key={k} className={`pl-day${isToday?" today":""}${past?" past":""}`}>
          <div className="pl-date" aria-label={d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}>
            <span className="pl-dow">{DOW[d.getDay()]}</span>
            <span className="pl-dnum">{d.getDate()}</span>
          </div>
          <div className="pl-meal">
            {(isToday||isTomorrow)&&<span className={`pl-rel${isToday?" today":""}`}>{isToday?"Today":"Tomorrow"}</span>}
            {past?(
              r?(made?(
                <div className="pl-made-row">
                  <button className="pl-meal-title pl-past-title" onClick={()=>openMeal(k)}>{r.title}</button>
                  <button className="pl-made" onClick={()=>markMade(k,false)} aria-label={`${r.title}: made. Tap to undo`}>
                    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>
                    Made it
                  </button>
                </div>
              ):(
                <div className="pl-missed">
                  <span className="pl-missed-label">Didn't get to it?</span>
                  <button className="pl-meal-title" onClick={()=>openMeal(k)}>{r.title}</button>
                  {sides.length>0&&<span className="pl-missed-sides">with {sides.map(s=>s.title).join(", ")}</span>}
                  <div className="pl-missed-actions">
                    <button className="pl-chip pl-chip-ok" onClick={()=>markMade(k,true)}>
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>
                      Made it
                    </button>
                  </div>
                  {moveTargets.length>0&&(
                    <div className="pl-missed-move">
                      <span className="pl-missed-move-label">Move to</span>
                      <div className="pl-missed-actions">
                        {moveTargets.map((t,ti)=>(
                          <button key={t} className={`pl-chip${ti===0?" pl-chip-primary":""}`} onClick={()=>moveMeal(k,t)}>{shortLabel(t)}</button>
                        ))}
                        <button className="pl-chip-text" onClick={()=>removeMeal(k)}>Remove</button>
                      </div>
                    </div>
                  )}
                  {moveTargets.length===0&&<button className="pl-chip-text" style={{alignSelf:"flex-start"}} onClick={()=>removeMeal(k)}>Remove</button>}
                </div>
              )):(
                <span className="pl-empty-past">Nothing planned</span>
              )
            ):r?(
              <>
                <div className="pl-meal-top">
                  <button className="pl-meal-title" onClick={()=>openMeal(k)}>{r.title}</button>
                  <button className="pl-remove" aria-label={`Remove ${r.title} from ${shortLabel(k)}`} onClick={()=>removeMeal(k)}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                  </button>
                </div>
                {r.cook_time&&<div className="pl-meal-meta">{r.cook_time}</div>}
                <div className="pl-sides">
                  {sides.map((s,si)=>(
                    <span key={si} className={`pl-side${s.status==="loading"?" loading":s.status==="error"?" error":""}`}>
                      <span style={{display:"flex",flexShrink:0}}>{Ic.leaf(12)}</span>
                      <span className="pl-side-name">{s.title}</span>
                      {s.status==="loading"&&<span aria-label="loading">…</span>}
                      {s.status==="error"&&<button className="pl-side-x" aria-label={`Retry ${s.title}`} onClick={()=>retryPlanSide(k,s.title)}>↻</button>}
                      <button className="pl-side-x" aria-label={`Remove ${s.title}`} onClick={()=>removePlanSide(k,s.title)}>×</button>
                    </span>
                  ))}
                  <button className="pl-add-side" onClick={()=>{setAssignDay(`side_${k}`);if(communityStatus==="idle")loadCommunity();}}>+ Side</button>
                </div>
              </>
            ):(
              <button className="pl-add-meal" onClick={()=>setAssignDay(k)}>+ Add a meal</button>
            )}
          </div>
        </li>
      );
    };
    return(
      <div className="pl-page">
        <div className="pl-head">
          <div>
            <div className="pl-range">{today.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</div>
            <h1 className="ck-title" style={{margin:0}}>Plan</h1>
          </div>
          {mealsPlanned>0&&(
            <button className="pl-groceries" onClick={()=>document.getElementById("plan-groceries")?.scrollIntoView({behavior:"smooth",block:"start"})}>
              {Ic.cart(17)} Next 7 days · {consolidated.length}
            </button>
          )}
        </div>

        <button className={`pl-earlier${missed.length?" has-missed":""}`} aria-expanded={showEarlier} onClick={()=>setShowEarlier(v=>!v)}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transform:showEarlier?"rotate(180deg)":"none"}}><path d="m6 15 6-6 6 6"/></svg>
          {showEarlier?"Hide earlier days":missed.length?`Earlier · ${missed.length} meal${missed.length===1?"":"s"} you didn't get to`:"Earlier days"}
        </button>
        {showEarlier&&(
          <ol className="pl-days pl-earlier-list">
            {earlierKeys.flatMap((k,i)=>[i===0?null:weekDivider(k),row(k)])}
          </ol>
        )}

        {mealsPlanned===0&&<p className="pl-hint">Tap <strong>+ Add a meal</strong> on any day to pick from your saved recipes.</p>}
        <ol className="pl-days">
          {aheadKeys.flatMap((k,i)=>[i===0?null:weekDivider(k),row(k)])}
        </ol>
        {planAhead<PLAN_MAX_AHEAD&&(
          <button className="pl-more" onClick={()=>setPlanAhead(n=>Math.min(PLAN_MAX_AHEAD,n+14))}>Show 2 more weeks</button>
        )}
        {mealsPlanned>0&&(
          <div className="consol-section" id="plan-groceries">
            <div className="consol-hdr">
              <div>
                <div className="consol-title">Groceries for the next 7 days</div>
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
                    <div className="grocery-entries">
                      {item.entries.map((e,j)=>(
                        <div key={j} className="grocery-entry">
                          {e.amount&&<span className="grocery-entry-amount">{e.amount}</span>}
                          <span className="grocery-entry-recipe">{e.recipe}</span>
                        </div>
                      ))}
                    </div>
                    {retailer&&(
                      <div className="grocery-shop-links" style={{marginTop:6}}>
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
                <div key={r.id} className="recipe-card" onClick={()=>{setReturnTab("family");setPairedSides([]);setActivePane(0);setReturnDayKey(null);setRecipe(r);setServings(null);setStatus("done");setTab("search");}}>
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
    const isSideMode=assignDay.startsWith("side_");
    const dayKey=isRedirect||isSideMode?null:assignDay;
    const sideDayKey=isSideMode?assignDay.slice(5):null;
    const allRecipes=[...saved,...sharedRecipes.filter(r=>!saved.some(s=>s.id===r.id))];

    // Filter by search
    const filtered=modalSearch.trim()===""?allRecipes:allRecipes.filter((r:any)=>
      (r.title||"").toLowerCase().includes(modalSearch.toLowerCase())
    );

    // Group by category
    const grouped: Record<string,any[]>={};
    filtered.forEach((r:any)=>{
      const cat=categoryOverrides[r.id]||guessCategory(r);
      if(!grouped[cat])grouped[cat]=[];
      grouped[cat].push(r);
    });
    const sortedCats=RECIPE_CATEGORIES.filter(c=>grouped[c]&&grouped[c].length>0);

    // Side-picking mode: suggest from the side library, or search Saved + Community
    const sideMain=sideDayKey?plan[sideDayKey]:null;
    const existingSideTitles=sideDayKey?(planSides[sideDayKey]||[]).map(s=>s.title.toLowerCase()):[];
    const sideSuggestions=sideMain?rankSides(sideMain).filter(s=>!existingSideTitles.includes(s.title.toLowerCase())).slice(0,6):[];
    const sidePool=(()=>{
      if(!isSideMode)return [];
      const pool=[...saved,...communityRecipes];
      const seen=new Set<string>(); const out:any[]=[];
      for(const r of pool){
        const t=(r.title||"").toLowerCase();
        if(!t||seen.has(t))continue;
        seen.add(t);out.push(r);
      }
      return out;
    })();
    const sq=modalSearch.trim().toLowerCase();
    const filteredForSide=isSideMode?sidePool.filter((r:any)=>{
      const t=(r.title||"").toLowerCase();
      if(!t||existingSideTitles.includes(t))return false;
      if(sideMain&&t===(sideMain.title||"").toLowerCase())return false;
      if(sq&&!t.includes(sq))return false;
      return true;
    }):[];

    return(
      <div className="modal-overlay modal-top" onClick={()=>{setAssignDay(null);setModalSearch("");}}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-title">{isSideMode?`Add a side for ${fmtPlanDay(sideDayKey!)}`:dayKey?`Add to ${fmtPlanDay(dayKey)}`:"Choose a day"}</div>
          {isRedirect?(
            <div className="modal-list">
              {Array.from({length:14},(_,i)=>dateKey(addDays(startOfToday(),i))).map((k,i)=>{
                const rid=assignDay.replace("fromSaved_","");
                const r=allRecipes.find(s=>String(s.id)===rid);
                return(
                  <div key={k} className="modal-item" onClick={()=>{if(r){assignMain(k,r);setAssignDay(null);setModalSearch("");}}}>
                    <div className="modal-item-title">{i===0?"Today":i===1?"Tomorrow":fmtPlanDay(k)}</div>
                    {plan[k]&&<div className="modal-item-meta">Currently: {plan[k].title}</div>}
                  </div>
                );
              })}
            </div>
          ):isSideMode?(
            <>
              {sideSuggestions.length>0&&(
                <>
                  <div className="modal-cat-label">Suggested sides</div>
                  <div className="modal-list" style={{marginBottom:12}}>
                    {sideSuggestions.map((s,i)=>(
                      <div key={i} className="modal-item" onClick={()=>{addPlanSide(sideDayKey!,s.title);setAssignDay(null);setModalSearch("");}}>
                        <div className="modal-item-title">{s.title}</div>
                        <div className="modal-item-meta">{s.tagline}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <input
                className="modal-search"
                placeholder="Search Saved & Community…"
                value={modalSearch}
                onChange={e=>setModalSearch(e.target.value)}
                autoFocus
              />
              <div className="modal-list">
                {filteredForSide.length===0?(
                  <p style={{color:"#7A6E6A",fontSize:13,textAlign:"center",padding:"20px 0"}}>{modalSearch?`No recipes match “${modalSearch}”`:"No matches in Saved or Community."}</p>
                ):(
                  filteredForSide.map((r:any,i:number)=>(
                    <div key={i} className="modal-item" onClick={()=>{addPlanSide(sideDayKey!,r.title,r);setAssignDay(null);setModalSearch("");}}>
                      <div className="modal-item-title">{r.title}</div>
                      <div className="modal-item-meta">{r.prep_time} prep · {r.cook_time} cook</div>
                    </div>
                  ))
                )}
              </div>
            </>
          ):(
            allRecipes.length===0?<p style={{color:"#7A6E6A",fontSize:14}}>No saved recipes yet.</p>:(
              <>
                <input
                  className="modal-search"
                  placeholder="Search recipes…"
                  value={modalSearch}
                  onChange={e=>setModalSearch(e.target.value)}
                  autoFocus
                />
                <div className="modal-list">
                  {filtered.length===0?(
                    <p style={{color:"#7A6E6A",fontSize:13,textAlign:"center",padding:"20px 0"}}>No recipes match &ldquo;{modalSearch}&rdquo;</p>
                  ):sortedCats.length>0?sortedCats.map(cat=>(
                    <div key={cat}>
                      <div className="modal-cat-label">{cat}</div>
                      {grouped[cat].map((r:any)=>(
                        <div key={r.id} className="modal-item" onClick={()=>{assignMain(dayKey!,r);setAssignDay(null);setModalSearch("");}}>
                          <div className="modal-item-title">{r.title}</div>
                          <div className="modal-item-meta">{r.prep_time} prep · {r.cook_time} cook</div>
                        </div>
                      ))}
                    </div>
                  )):(
                    filtered.map((r:any)=>(
                      <div key={r.id} className="modal-item" onClick={()=>{assignMain(dayKey!,r);setAssignDay(null);setModalSearch("");}}>
                        <div className="modal-item-title">{r.title}</div>
                        <div className="modal-item-meta">{r.prep_time} prep · {r.cook_time} cook</div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )
          )}
          <button className="modal-close" onClick={()=>{setAssignDay(null);setModalSearch("");}}>Cancel</button>
        </div>
      </div>
    );
  }

  const NAV_ITEMS:{key:string;match:string[];label:string;icon:(n:number)=>any;badge:number|null}[]=[
    {key:"search",match:["search","community"],label:"Cook",icon:(n)=>Ic.cook(n),badge:null},
    {key:"week",match:["week"],label:"Plan",icon:(n)=>Ic.calendar(n),badge:mealsPlanned||null},
    {key:"library",match:["library","saved","family"],label:"Library",icon:(n)=>Ic.library(n),badge:null},
  ];
  const goNav=(key:string)=>{
    if(key==="search"){
      if(tab==="search"&&status==="done")leaveRecipe();
      setHomeMode("search");
    }
    setTab(key);window.scrollTo({top:0});
  };

  return(
    <>
      <style>{CSS}</style>
      {/* Desktop top nav */}
      <nav className="nav">
        <div className="nav-left">
          {isLoaded&&(user?(
            <div className="account-wrap">
              <div className="auth-user" style={{cursor:"pointer"}} onClick={()=>setShowAccountDropdown(o=>!o)}>
                {user.imageUrl?<img className="auth-avatar" src={user.imageUrl} alt=""/>:<div className="auth-avatar-placeholder">{userInitial}</div>}
              </div>
              {showAccountDropdown&&(
                <div className="account-dropdown">
                  <div className="account-dropdown-user">
                    <div className="account-dropdown-name">{user.firstName||"My Account"}</div>
                    <div className="account-dropdown-email">{user.emailAddresses?.[0]?.emailAddress||""}</div>
                  </div>
                  <button className="account-dropdown-item danger" onClick={doSignOut}>Sign out</button>
                </div>
              )}
            </div>
          ):(
            <button className="auth-btn" onClick={()=>openSignIn()}>Sign in</button>
          ))}
        </div>
        <button className="nav-brand" onClick={()=>{setTab("search");setStatus("idle");setRecipe(null);setQuery("");}}>
          <span className="nav-brand-upright">every</span>
          <span className="nav-brand-italic">chef</span>
        </button>
        <div className="nav-tabs">
          {NAV_ITEMS.map(n=>(
            <button key={n.key} className={`nav-tab${n.match.includes(tab)?" active":""}`} aria-current={n.match.includes(tab)?"page":undefined} onClick={()=>goNav(n.key)} style={{display:"flex",alignItems:"center",gap:6}}>
              {n.icon(15)}{n.label}{n.badge?<span className="nav-badge">{n.badge}</span>:null}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile header */}
      <div className="mobile-header">
        <button className="mobile-header-brand" onClick={()=>{setTab("search");setStatus("idle");setRecipe(null);setQuery("");}}>
          <span className="mobile-header-upright">every</span>
          <span className="mobile-header-italic">chef</span>
        </button>
        <div className="mobile-header-auth">
          {isLoaded&&(user?(
            <div onClick={()=>setShowAccountSheet(true)}>
              {user.imageUrl?<img className="auth-avatar" src={user.imageUrl} alt=""/>:<div className="auth-avatar-placeholder">{userInitial}</div>}
            </div>
          ):(
            <button className="mobile-signin-btn" onClick={()=>openSignIn()}>Sign in</button>
          ))}
        </div>
      </div>
      <div className={`bottom-nav${navHidden||(tab==="search"&&status==="done"&&recipe)?" hidden":""}`}>
        {NAV_ITEMS.map(n=>(
          <button key={n.key} className={`bottom-tab${n.match.includes(tab)?" active":""}`} aria-current={n.match.includes(tab)?"page":undefined} onClick={()=>goNav(n.key)}>
            <span className="bt-icon">{n.icon(22)}</span>
            <span className="bt-label">{n.label}</span>
            {n.badge?<span className="nav-badge">{n.badge}</span>:null}
          </button>
        ))}
      </div>
      {tab==="search"&&SearchView()}
      {tab==="community"&&CommunityView()}
      {(tab==="library"||tab==="saved"||tab==="family")&&LibraryView()}
      {tab==="week"&&WeekView()}
      {Modal()}
      {showAccountSheet&&user&&(
        <div className="account-sheet-overlay" onClick={()=>setShowAccountSheet(false)}>
          <div className="account-sheet" onClick={e=>e.stopPropagation()}>
            <div className="account-sheet-handle"/>
            <div className="account-sheet-user">
              {user.imageUrl?<img className="account-sheet-avatar" src={user.imageUrl} alt=""/>:<div className="account-sheet-avatar-placeholder">{userInitial}</div>}
              <div>
                <div className="account-sheet-name">{user.firstName||"My Account"}</div>
                <div className="account-sheet-email">{user.emailAddresses?.[0]?.emailAddress||""}</div>
              </div>
            </div>
            <div className="account-sheet-actions">
              <button className="account-sheet-btn danger" onClick={doSignOut}>Sign out</button>
            </div>
            <button className="account-sheet-cancel" onClick={()=>setShowAccountSheet(false)}>Cancel</button>
          </div>
        </div>
      )}
      {showSignOutConfirm&&(
        <div className="signout-confirm-overlay" onClick={()=>setShowSignOutConfirm(false)}>
          <div className="signout-confirm" onClick={e=>e.stopPropagation()}>
            <div className="signout-confirm-title">Sign out?</div>
            <div className="signout-confirm-sub">Your recipes are saved to your account and will be here when you come back.</div>
            <div className="signout-confirm-btns">
              <button className="signout-confirm-cancel" onClick={()=>setShowSignOutConfirm(false)}>Cancel</button>
              <button className="signout-confirm-go" onClick={confirmSignOut}>Sign out</button>
            </div>
          </div>
        </div>
      )}
      {showAccountDropdown&&(
        <div style={{position:"fixed",inset:0,zIndex:150}} onClick={()=>setShowAccountDropdown(false)}/>
      )}
      {/* Cooking mode */}
      {cookRecipe&&(()=>{
        const r=cookRecipe;
        const steps:string[]=r.steps||[];
        const groups=r.ingredient_groups||(r.ingredients?[{label:"",items:r.ingredients}]:[]);
        const allIngs:any[]=groups.flatMap((g:any)=>g.items||[]);
        const rr=r===recipe?ratio:1;
        const amt=(a:string)=>renderAmount(normalizeAmount(rr===1?(a||""):scaleAmt(a||"",rr)));
        const idx=cookStep;
        const last=steps.length;
        const stepText=idx>0?steps[idx-1]:"";
        const stepIngs=idx>0?ingredientsForStep(stepText,allIngs):[];
        const secs=idx>0?stepTimerSeconds(stepText):null;
        const timer=cookTimers[idx];
        const now=Date.now();
        const remaining=timer?Math.max(0,Math.ceil((timer.end-now)/1000)):0;
        const otherTimers=Object.entries(cookTimers).filter(([k])=>Number(k)!==idx).map(([k,t])=>({step:Number(k),t,left:Math.max(0,Math.ceil((t.end-now)/1000))}));
        const go=(n:number)=>setCookStep(Math.max(0,Math.min(last,n)));
        return(
          <div className="cook-overlay" role="dialog" aria-modal="true" aria-label={`Cooking ${r.title}`}
            onTouchStart={(e)=>{cookSwipeX.current=e.touches[0].clientX;}}
            onTouchEnd={(e)=>{
              if(cookSwipeX.current==null)return;
              const dx=e.changedTouches[0].clientX-cookSwipeX.current;
              cookSwipeX.current=null;
              if(dx<-60)go(idx+1);else if(dx>60)go(idx-1);
            }}>
            <div className="cook-top">
              <button className="cook-close" aria-label="Exit cooking mode" onClick={closeCookMode}>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
              </button>
              <div className="cook-title">{r.title}</div>
              <div className="cook-count">{idx===0?"Get ready":`${idx} / ${last}`}</div>
            </div>
            <div className="cook-progress" aria-hidden="true"><div style={{width:`${last?(idx/last)*100:0}%`}}/></div>

            {otherTimers.length>0&&(
              <div className="cook-timer-strip">
                {otherTimers.map(o=>(
                  <button key={o.step} className={`cook-timer-pill${o.t.done?" done":""}`} onClick={()=>go(o.step)}>
                    {o.t.done?`Step ${o.step}: time's up`:`Step ${o.step} · ${fmtClock(o.left)}`}
                  </button>
                ))}
              </div>
            )}

            <div className="cook-body">
              {idx===0?(
                <>
                  <div className="cook-eyebrow">Before you start</div>
                  <h2 className="cook-step-text">Gather your ingredients</h2>
                  <ul className="cook-gather">
                    {allIngs.map((ing:any,i:number)=>(
                      <li key={i}>
                        <label>
                          <input type="checkbox"/>
                          <span className="cook-ing-amt">{amt(splitIng(ing).amount)}</span>
                          <span>{splitIng(ing).name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </>
              ):(
                <>
                  <div className="cook-eyebrow">Step {idx}</div>
                  <p className="cook-step-text">{stepText}</p>
                  {secs!=null&&(
                    !timer?(
                      <button className="cook-timer-start" onClick={()=>startCookTimer(idx,secs)}>
                        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>
                        Start {fmtDuration(secs)} timer
                      </button>
                    ):timer.done?(
                      <div className="cook-timer done" role="status">
                        <span className="cook-timer-time">Time's up</span>
                        <button className="cook-timer-btn" onClick={()=>clearCookTimer(idx)}>Dismiss</button>
                      </div>
                    ):(
                      <div className="cook-timer" role="timer" aria-live="off">
                        <span className="cook-timer-time">{fmtClock(remaining)}</span>
                        <button className="cook-timer-btn" onClick={()=>clearCookTimer(idx)}>Cancel</button>
                      </div>
                    )
                  )}
                  {stepIngs.length>0&&(
                    <div className="cook-ings">
                      <div className="cook-ings-label">In this step</div>
                      <ul>
                        {stepIngs.map((ing:any,i:number)=>(
                          <li key={i}><span className="cook-ing-amt">{amt(splitIng(ing).amount)}</span><span>{splitIng(ing).name}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="cook-nav">
              <button className="cook-prev" disabled={idx===0} onClick={()=>go(idx-1)}>Back</button>
              <button className="cook-next" onClick={()=>idx>=last?finishCookMode():go(idx+1)}>
                {idx===0?"Start cooking":idx>=last?"Done":"Next step"}
              </button>
            </div>
          </div>
        );
      })()}
      {/* Share Sheet */}
      {showShare&&(shareTarget||recipe)&&(()=>{
        const sr:any=shareTarget||recipe;
        const displayUrl=shareUrl||"Generating link…";
        const qrSrc=shareUrl?`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=1A1F2E&bgcolor=FDFAF5&data=${encodeURIComponent(shareUrl)}`:null;
        const doCopy=()=>{
          if(!shareUrl)return;
          navigator.clipboard.writeText(shareUrl).then(()=>{
            const btn=document.getElementById("share-copy-btn");
            if(btn){btn.textContent="Copied!";btn.classList.add("copied");setTimeout(()=>{btn.textContent="Copy";btn.classList.remove("copied");},2000);}
          }).catch(()=>{});
        };
        const doNativeShare=()=>{
          if(!shareUrl||!navigator.share)return;
          navigator.share({title:sr.title,text:`Check out this recipe on Every Chef: ${sr.title}`,url:shareUrl}).catch(()=>{});
        };
        return(
          <div className="share-overlay" onClick={()=>setShowShare(false)}>
            <div className="share-sheet" onClick={e=>e.stopPropagation()}>
              <button className="share-close" onClick={()=>setShowShare(false)}>×</button>
              <div className="share-sheet-title">Share Recipe</div>
              <div className="share-sheet-dish">{sr.title}</div>
              <div className="share-url-row">
                <div className="share-url-text" style={{color:shareLoading?"#B8B0A8":"#151210"}}>{displayUrl}</div>
                <button id="share-copy-btn" className="share-copy-btn" onClick={doCopy} disabled={!shareUrl||shareLoading}>
                  {shareLoading?"…":"Copy"}
                </button>
              </div>
              {qrSrc?(
                <div className="share-qr">
                  <img src={qrSrc} alt="QR code"/>
                  <div className="share-qr-label">Scan to open</div>
                </div>
              ):(
                <div style={{height:180,display:"flex",alignItems:"center",justifyContent:"center",color:"#B8B0A8",fontSize:13}}>
                  Generating QR code…
                </div>
              )}
              {typeof navigator!=="undefined"&&"share" in navigator&&shareUrl&&(
                <button className="share-native-btn" onClick={doNativeShare}>
                  {Ic.share(16)} Share via…
                </button>
              )}
            </div>
          </div>
        );
      })()}
      {/* QR Scanner */}
      {showQrScanner&&(
        <div className="qr-scan-overlay" onClick={stopQrScanner}>
          <div className="qr-scan-sheet" onClick={e=>e.stopPropagation()}>
            <button className="qr-scan-close" onClick={stopQrScanner}>×</button>
            <div className="qr-scan-title">Scan QR code</div>
            <div className="qr-scan-sub">Point your camera at an Every Chef QR code — it'll open right here, signed in.</div>
            <div className="qr-scan-frame">
              {qrStatus==="error"?(
                <div className="qr-scan-status" style={{flexDirection:"column",gap:12}}>
                  <div>{qrErr}</div>
                  <button className="qr-scan-retry" onClick={openQrScanner} style={{width:"auto",padding:"10px 20px"}}>Try again</button>
                </div>
              ):qrStatus==="starting"?(
                <div className="qr-scan-status">Opening camera…</div>
              ):qrStatus==="loading"?(
                <div className="qr-scan-status" style={{flexDirection:"column",gap:10}}>
                  <div className="spinner"/>
                  Opening recipe…
                </div>
              ):null}
              <video ref={qrVideoRef} playsInline muted style={{display:qrStatus==="scanning"?"block":"none"}}/>
              <canvas ref={qrCanvasRef} style={{display:"none"}}/>
              {qrStatus==="scanning"&&<div className="qr-scan-reticle"/>}
            </div>
          </div>
        </div>
      )}
      {/* Edit Recipe Panel */}
      {showEditPanel&&editRecipe&&(
        <div className="edit-panel-overlay" onClick={()=>setShowEditPanel(false)}>
          <div className="edit-panel" onClick={e=>e.stopPropagation()}>
            <div className="edit-panel-handle"/>
            <div className="edit-panel-header">
              <div className="edit-panel-title">Edit Recipe</div>
              <button className="edit-panel-close" onClick={()=>setShowEditPanel(false)}>×</button>
            </div>
            <div className="edit-panel-body">
              {/* Title */}
              <div className="edit-section-label">Title</div>
              <input
                style={{width:"100%",padding:"8px 10px",border:"1.5px solid #EDE8E0",borderRadius:8,fontFamily:"'Fraunces',serif",fontSize:15,color:"#151210",outline:"none",marginBottom:4,boxSizing:"border-box" as const}}
                value={editRecipe.title||""}
                onChange={e=>setEditRecipe((r:any)=>({...r,title:e.target.value}))}
              />
              {/* Ingredients */}
              <div className="edit-section-label">Ingredients</div>
              {(editRecipe.ingredient_groups||[{label:"",items:editRecipe.ingredients||[]}]).map((g:any,gi:number)=>(
                <div key={gi}>
                  {g.label&&<div style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase" as const,color:"#151210",marginBottom:6,marginTop:4}}>{g.label}</div>}
                  {(g.items||[]).map((ing:any,ii:number)=>(
                    <div key={ii} className="edit-ing-row">
                      <input className="edit-ing-amt" value={ing.amount||""} placeholder="amt"
                        onChange={e=>{
                          const groups=[...(editRecipe.ingredient_groups||[{label:"",items:editRecipe.ingredients||[]}])];
                          groups[gi]={...groups[gi],items:[...groups[gi].items]};
                          groups[gi].items[ii]={...groups[gi].items[ii],amount:e.target.value};
                          setEditRecipe((r:any)=>({...r,ingredient_groups:groups}));
                        }}/>
                      <input className="edit-ing-name" value={ing.name||""} placeholder="ingredient"
                        onChange={e=>{
                          const groups=[...(editRecipe.ingredient_groups||[{label:"",items:editRecipe.ingredients||[]}])];
                          groups[gi]={...groups[gi],items:[...groups[gi].items]};
                          groups[gi].items[ii]={...groups[gi].items[ii],name:e.target.value};
                          setEditRecipe((r:any)=>({...r,ingredient_groups:groups}));
                        }}/>
                      <button className="edit-delete-btn" onClick={()=>{
                        const groups=[...(editRecipe.ingredient_groups||[{label:"",items:editRecipe.ingredients||[]}])];
                        groups[gi]={...groups[gi],items:groups[gi].items.filter((_:any,i:number)=>i!==ii)};
                        setEditRecipe((r:any)=>({...r,ingredient_groups:groups}));
                      }}>×</button>
                    </div>
                  ))}
                  <button className="edit-add-btn" onClick={()=>{
                    const groups=[...(editRecipe.ingredient_groups||[{label:"",items:editRecipe.ingredients||[]}])];
                    groups[gi]={...groups[gi],items:[...groups[gi].items,{amount:"",name:""}]};
                    setEditRecipe((r:any)=>({...r,ingredient_groups:groups}));
                  }}>+ Add ingredient</button>
                </div>
              ))}
              {/* Steps */}
              <div className="edit-section-label">Steps</div>
              {(()=>{
                const removed=removedIngs(recipe,editRecipe);
                if(!removed.length)return null;
                const names=removed.map((r:any)=>(r.name||"").split(/[,(]/)[0].trim()).filter(Boolean);
                const key=names.map(n=>n.toLowerCase()).sort().join("|");
                const flagged=stepsMentioning(editRecipe.steps||[],removedTerms(recipe,editRecipe));
                const synced=stepsSyncedFor===key;
                const rewrite=async()=>{
                  setStepRewrite("loading");
                  try{
                    const res=await rewriteStepsWithout(editRecipe,names);
                    setEditRecipe((r:any)=>({...r,steps:res.steps,...(res.tagline?{tagline:res.tagline}:{})}));
                    setStepsSyncedFor(key);setStepRewrite("idle");
                  }catch{setStepRewrite("error");}
                };
                return(
                  <div className="edit-steps-notice" role="status">
                    <div>
                      {synced?<>Steps updated without <strong>{names.join(", ")}</strong>. Review them below.</>
                        :flagged.length?<><strong>{names.join(", ")}</strong> {names.length===1?"is":"are"} still in step{flagged.length===1?"":"s"} {flagged.map(i=>i+1).join(", ")}. Saving will update {flagged.length===1?"it":"them"}.</>
                        :<>You removed <strong>{names.join(", ")}</strong>. Saving will update the steps if any still use {names.length===1?"it":"them"}.</>}
                    </div>
                    {!synced&&(
                      <div className="edit-steps-notice-actions">
                        <button className="edit-steps-rewrite" onClick={rewrite} disabled={stepRewrite==="loading"}>
                          {stepRewrite==="loading"?"Updating steps…":"Update steps now"}
                        </button>
                        <span className="edit-steps-or">to review them before saving</span>
                      </div>
                    )}
                    {stepRewrite==="error"&&<div className="edit-steps-err">Couldn't update the steps just now. Save again to keep your changes with the steps as they are, or edit them by hand.</div>}
                  </div>
                );
              })()}
              {(editRecipe.steps||[]).map((step:string,si:number)=>(
                <div key={si} className={`edit-step-row${stepsMentioning([step],removedTerms(recipe,editRecipe)).length?" flagged":""}`}>
                  <div className="edit-step-num">{si+1}</div>
                  <textarea className="edit-step-text" value={step}
                    onChange={e=>{
                      const steps=[...(editRecipe.steps||[])];
                      steps[si]=e.target.value;
                      setEditRecipe((r:any)=>({...r,steps}));
                    }}/>
                  <button className="edit-delete-btn" onClick={()=>{
                    const steps=(editRecipe.steps||[]).filter((_:any,i:number)=>i!==si);
                    setEditRecipe((r:any)=>({...r,steps}));
                  }}>×</button>
                </div>
              ))}
              <button className="edit-add-btn" onClick={()=>{
                const steps=[...(editRecipe.steps||[]),""];
                setEditRecipe((r:any)=>({...r,steps}));
              }}>+ Add step</button>
            </div>
            <div className="edit-panel-footer">
              <button className="edit-save-btn" disabled={stepRewrite==="loading"} onClick={async()=>{
                let edited=editRecipe;
                const removed=removedIngs(recipe,editRecipe);
                const names=removed.map((r:any)=>(r.name||"").split(/[,(]/)[0].trim()).filter(Boolean);
                const key=names.map(n=>n.toLowerCase()).sort().join("|");
                // Rewrite the steps on save if something was removed and they haven't been updated yet.
                // After a failed attempt (status "error"), Save keeps the steps as they are.
                if(names.length&&stepsSyncedFor!==key&&stepRewrite!=="error"&&(edited.steps||[]).length){
                  setStepRewrite("loading");
                  try{
                    const res=await rewriteStepsWithout(edited,names);
                    edited={...edited,steps:res.steps,...(res.tagline?{tagline:res.tagline}:{})};
                    setStepRewrite("idle");
                  }catch{setStepRewrite("error");return;}
                }
                const updated={...edited,grocery_items:syncGroceries(recipe,edited)};
                setRecipe(updated);
                if(isSaved(recipe))setSaved((l:any[])=>l.map((r:any)=>r.id===updated.id?updated:r));
                // keep any planned copies of this recipe in step with the edit
                setPlan((p:any)=>{let ch=false;const n={...p};for(const k in n){const r=n[k];if(r&&((updated.id!=null&&r.id===updated.id)||(r.title===recipe.title))){n[k]=updated;ch=true;}}return ch?n:p;});
                setShowEditPanel(false);setStepRewrite("idle");
              }}>{stepRewrite==="loading"?"Updating steps…":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
      {showSavePrompt&&(
        <div className="save-prompt-overlay" onClick={()=>{setShowSavePrompt(false);setPendingSave(null);}}>
          <div className="save-prompt" onClick={e=>e.stopPropagation()}>
            <div className="save-prompt-icon">🔖</div>
            <div className="save-prompt-title">Save your recipes</div>
            <div className="save-prompt-sub">Sign in to save recipes across all your devices. Free, takes 10 seconds.</div>
            <button className="save-prompt-btn" onClick={()=>{
              setShowSavePrompt(false);
              openSignIn();
            }}>Sign in to save</button>
            <button className="save-prompt-skip" onClick={()=>{
              setShowSavePrompt(false);
              if(pendingSave){setSaved((l:any[])=>[{...pendingSave,_savedAt:Date.now(),id:pendingSave.id||Date.now()},...l]);}
              setPendingSave(null);
            }}>Save without account (this device only)</button>
          </div>
        </div>
      )}
    </>
  );
}

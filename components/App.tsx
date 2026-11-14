"use client";
import { useState, useEffect, useRef } from "react";
import { rankSides } from "../lib/sides";
import { useUser, useClerk } from "@clerk/nextjs";
import { CARD_POOL } from "../lib/dishes";
import { buildPrompt } from "../lib/prompts";
import { isRude } from "../lib/guard";
import { TIME_RULE, totalRange, totalShort, toMinutes, fmtMinutes } from "../lib/times";
import { STAPLES_NOTE, ingredientUses } from "../lib/pantry";
import { mergeDocs } from "../lib/planMerge";
import { sharedProduce, levelOf } from "../lib/quickplan";
import { AISLES, aisleOf, groceryKey, displayName, totalAmount, recipeGroceries, isStaple } from "../lib/grocery";

const C = {
  cream:"#FDFAF5",parchment:"#FFF0D4",brown:"#151210",
  terra:"#F4A021",sage:"#1A1F2E",muted:"#7A6E6A",
  white:"#FFFFFF",border:"#EDE8E0",overlay:"rgba(61,43,31,0.45)",
  green:"#4F4744",greenLight:"#F5EFE4",greenBorder:"#E3DCD0",
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
  shuffle:(s=18)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>,
  cart:(s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
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
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9,700;1,9,700&family=Figtree:wght@300;400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  *{font-variation-settings:'opsz' 9,'WONK' 1;}
  html{background:#1A1F2E;}
  html,body{overflow-x:clip;max-width:100%;}
  body{touch-action:manipulation;}
  body{font-family:'Figtree',sans-serif;background:#FDFAF5;color:#151210;min-height:100vh;padding-bottom:80px;}
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
    .nav-left{display:flex;align-items:center;}
    .nav-tabs{display:flex;gap:4px;justify-content:flex-end;}
    .nav-tab{
      padding:7px 16px;border-radius:100px;border:none;background:transparent;
      font-family:'Figtree',sans-serif;font-size:13px;font-weight:500;
      color:rgba(253,250,245,.6);cursor:pointer;transition:all .15s;position:relative;
    }
    .nav-tab.active{background:#F4A021;color:#151210;font-weight:600;}
    .nav-tab:not(.active):hover{background:rgba(244,160,33,.15);color:#FDFAF5;}
    .nav-badge{position:absolute;top:3px;right:5px;background:#B8340F;color:#fff;font-size:11px;font-weight:700;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
  }
  /* ── MOBILE TOP HEADER ── */
  .mobile-header{
    display:flex;align-items:center;justify-content:center;
    background:#1A1F2E;height:calc(52px + env(safe-area-inset-top,0px));padding-top:env(safe-area-inset-top,0px) !important;
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
  .mobile-signin-btn{font-family:'Figtree',sans-serif;font-size:12px;font-weight:600;color:rgba(253,250,245,.7);border:1.5px solid rgba(244,160,33,.4);border-radius:100px;padding:5px 14px;background:transparent;cursor:pointer;transition:all .15s;}
  .mobile-signin-btn:hover{background:rgba(244,160,33,.15);color:#FDFAF5;}
  /* ── BOTTOM NAV (mobile) ── */
  .bottom-nav{
    display:flex;position:fixed;bottom:0;left:0;right:0;z-index:100;
    background:#fff;border-top:1px solid #E8E2D8;
    padding:0 8px;
    padding-bottom:max(env(safe-area-inset-bottom,0px),12px);
    height:calc(72px + max(env(safe-area-inset-bottom,0px),12px));
    align-items:flex-start;
    padding-top:10px;
    transition:transform .25s ease;
  }
  .bottom-nav.hidden{transform:translateY(100%);}
  @media(min-width:768px){.bottom-nav{display:none;}}
  .bottom-tab{
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:8px 4px 4px;background:none;border:none;cursor:pointer;
    font-family:'Figtree',sans-serif;font-size:12px;font-weight:500;
    color:#6E635F;flex:1;gap:3px;position:relative;transition:color .15s;
  }
  .bottom-tab.active{color:#151210;}
  .bottom-tab .bt-icon{font-size:20px;line-height:1;}
  .bottom-tab .bt-label{font-size:12px;line-height:1;}
  .bottom-tab .nav-badge{position:absolute;top:6px;right:calc(50% - 18px);background:#F4A021;color:#fff;font-size:11px;font-weight:700;width:13px;height:13px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
  .nav-badge{position:absolute;top:3px;right:5px;background:#F4A021;color:#fff;font-size:11px;font-weight:700;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
  /* ── AUTH ── */
  .auth-btn{padding:6px 16px;border-radius:100px;border:1.5px solid rgba(244,160,33,.4);background:transparent;font-family:'Figtree',sans-serif;font-size:12px;font-weight:600;color:rgba(253,250,245,.8);cursor:pointer;transition:all .15s;white-space:nowrap;}
  .auth-btn:hover{background:rgba(244,160,33,.15);border-color:#F4A021;color:#FDFAF5;}
  .auth-user{display:flex;align-items:center;gap:8px;}
  .auth-avatar{width:30px;height:30px;border-radius:50%;border:2px solid #F4A021;object-fit:cover;cursor:pointer;}
  .auth-avatar-placeholder{width:30px;height:30px;border-radius:50%;background:#F4A021;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:13px;font-weight:700;color:#1A1F2E;cursor:pointer;flex-shrink:0;}
  .account-wrap{position:relative;}
  .account-dropdown{position:absolute;top:calc(100% + 10px);left:0;background:#fff;border:1px solid #E8E2D8;border-radius:14px;padding:6px;min-width:220px;box-shadow:0 8px 32px rgba(26,31,46,.18);z-index:200;}
  .account-dropdown-user{padding:12px 14px 10px;border-bottom:1px solid #E8E2D8;margin-bottom:6px;}
  .account-dropdown-name{font-family:'Fraunces',serif;font-size:15px;font-weight:700;color:#151210;margin-bottom:2px;}
  .account-dropdown-email{font-size:12px;color:#6E635F;}
  .account-dropdown-item{display:flex;align-items:center;gap:10px;width:100%;padding:9px 14px;border:none;background:transparent;font-family:'Figtree',sans-serif;font-size:13px;color:#151210;cursor:pointer;border-radius:8px;text-align:left;transition:background .12s;}
  .account-dropdown-item:hover{background:#FFF8F2;}
  .account-dropdown-item.danger{color:#B8340F;}
  .account-dropdown-item.danger:hover{background:#FEF2F0;}
  .account-sheet-overlay{position:fixed;inset:0;background:rgba(26,31,46,.5);z-index:300;display:flex;align-items:flex-end;}
  .account-sheet{background:#FDFAF5;border-radius:24px 24px 0 0;padding:0 0 max(env(safe-area-inset-bottom,0px),24px);width:100%;box-shadow:0 -8px 40px rgba(26,31,46,.2);}
  .account-sheet-user{padding:20px 24px 16px;border-bottom:1px solid #E8E2D8;display:flex;align-items:center;gap:14px;}
  .account-sheet-avatar{width:44px;height:44px;border-radius:50%;border:2px solid #F4A021;object-fit:cover;flex-shrink:0;}
  .account-sheet-avatar-placeholder{width:44px;height:44px;border-radius:50%;background:#F4A021;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:20px;font-weight:700;color:#1A1F2E;flex-shrink:0;}
  .account-sheet-name{font-family:'Fraunces',serif;font-size:18px;font-weight:700;color:#151210;}
  .account-sheet-email{font-size:13px;color:#6E635F;margin-top:2px;}
  .account-sheet-actions{padding:10px 16px;}
  .account-sheet-btn{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;border:none;background:transparent;font-family:'Figtree',sans-serif;font-size:15px;color:#151210;cursor:pointer;border-radius:12px;text-align:left;transition:background .12s;}
  .account-sheet-btn:hover{background:#F5F0EA;}
  .account-sheet-btn.danger{color:#B8340F;}
  a.account-sheet-btn,a.account-dropdown-item{text-decoration:none;color:#151210;display:flex;}
  .account-sheet-btn.account-delete{margin-top:6px;border-top:1px solid #E8E2D8;border-radius:0 0 12px 12px;}
  .account-sheet-btn.danger:hover{background:#FEF2F0;}
  .account-sheet-cancel{width:calc(100% - 32px);margin:0 16px 8px;padding:14px;background:#fff;border:1.5px solid #E8E2D8;border-radius:12px;font-family:'Figtree',sans-serif;font-size:15px;font-weight:600;color:#151210;cursor:pointer;text-align:center;}
  .signout-confirm-overlay{position:fixed;inset:0;background:rgba(26,31,46,.6);z-index:400;display:flex;align-items:center;justify-content:center;padding:24px;}
  .signout-confirm{background:#FDFAF5;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;}
  .signout-confirm-title{font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:#151210;margin-bottom:8px;}
  .signout-confirm-sub{font-size:14px;color:#6E635F;line-height:1.5;margin-bottom:24px;}
  .signout-confirm-btns{display:flex;gap:10px;}
  .signout-confirm-cancel{flex:1;padding:12px;background:#fff;border:1.5px solid #E8E2D8;border-radius:10px;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;color:#151210;cursor:pointer;}
  .signout-confirm-go{flex:1;padding:12px;background:#B8340F;border:none;border-radius:10px;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;color:#fff;cursor:pointer;}
  /* Save prompt modal */
  .save-prompt-overlay{position:fixed;inset:0;background:rgba(26,31,46,.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;}
  .save-prompt{background:#FDFAF5;border-radius:24px;padding:32px 28px;max-width:380px;width:100%;text-align:center;}
  .save-prompt-title{font-family:'Fraunces',serif;font-size:24px;font-weight:700;color:#1A1F2E;margin-bottom:8px;letter-spacing:-0.5px;}
  .save-prompt-sub{font-size:14px;color:#6E635F;line-height:1.5;margin-bottom:24px;}
  .save-prompt-btn{width:100%;padding:13px;background:#F4A021;color:#151210;border:none;border-radius:12px;font-family:'Figtree',sans-serif;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;}
  .save-prompt-skip{background:none;border:none;font-family:'Figtree',sans-serif;font-size:13px;color:#6E635F;cursor:pointer;text-decoration:underline;text-underline-offset:3px;}
  @keyframes particleRise{
    0%{transform:translateY(0) translateX(0);opacity:0;}
    10%{opacity:1;}
    90%{opacity:.6;}
    100%{transform:translateY(-340px) translateX(var(--pdrift,0px));opacity:0;}
  }
  @keyframes smokeRise{
    0%{transform:translateY(0) scale(.6);opacity:.18;}
    40%{opacity:.1;}
    100%{transform:translateY(-220px) scale(2.8);opacity:0;}
  }
  .side-panel-row{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;}
  .side-card{flex:1 1 0;min-width:170px;max-width:260px;background:#fff;border:1.5px solid #E8E2D8;border-radius:14px;padding:12px 14px;cursor:pointer;transition:all .15s;}
  .side-card:hover{border-color:#1A1F2E;box-shadow:0 4px 12px rgba(26,31,46,.08);}
  .side-card-title{font-family:'Fraunces',serif;font-weight:700;font-size:14px;color:#151210;margin-bottom:3px;}
  .side-card-tagline{font-size:12px;color:#6E635F;line-height:1.4;}
  /* Swipeable main-dish / paired-side pane */
  .dish-swipe-outer{overflow:hidden;}
  .add-side-panel{max-width:960px;margin:10px auto 0;padding:0 24px;}
  .add-side-tabs{display:flex;gap:6px;margin-bottom:10px;}
  .add-side-tab{background:none;border:none;border-bottom:2px solid transparent;padding:4px 2px 8px;font-family:'Figtree',sans-serif;font-size:12px;font-weight:600;color:#6E635F;cursor:pointer;}
  .add-side-tab.active{color:#151210;border-bottom-color:#F4A021;}
  .add-side-empty{font-size:12px;color:#6E635F;padding:10px 2px;}
  .add-side-search-input{width:100%;padding:10px 14px;border:2px solid #151210;border-radius:10px;font-family:'Figtree',sans-serif;font-size:13px;color:#151210;outline:none;background:#fff;box-sizing:border-box;}
  .add-side-results{display:flex;flex-direction:column;gap:4px;margin-top:10px;max-height:220px;overflow-y:auto;}
  .add-side-result{display:flex;align-items:center;gap:8px;text-align:left;background:#fff;border:1px solid #E8E2D8;border-radius:10px;padding:9px 12px;font-family:'Figtree',sans-serif;font-size:13px;color:#151210;cursor:pointer;transition:border-color .15s;}
  .add-side-result:hover{border-color:#1A1F2E;}
  .dish-swipe-track{display:flex;align-items:flex-start;width:200%;transition:transform .28s cubic-bezier(.4,0,.2,1);touch-action:pan-y;}
  .dish-swipe-pane{width:50%;flex-shrink:0;}
  .side-pane-page{padding-bottom:40px;}
  .home-inspire-wrap{width:100%;max-width:680px;margin:0 auto;text-align:left;}
  /* ── MOSAIC CARDS ── */
  /* ── EVERY CHEF MOSAIC CARDS ── */
  .cm-page{display:flex;flex-direction:column;}
  .cm-page .fl-lede{margin:8px 0 18px;}
  .cm-gate{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:14px 16px;margin:0 0 16px;background:#1A1F2E;border-radius:18px;color:#FDFAF5;}
  .cm-gate-title{font-family:'Fraunces',serif;font-size:18px;font-weight:600;}
  .cm-gate-desc{font-size:14px;color:#C9C3BA;margin-top:2px;}
  .cm-gate-btn{min-height:44px;padding:0 18px;border:none;border-radius:22px;background:#F4A021;color:#151210;font-family:'Figtree',sans-serif;font-size:15px;font-weight:600;cursor:pointer;}
  .cm-clear{width:36px;height:36px;margin-right:-8px;border:none;border-radius:18px;background:#F5EFE4;color:#151210;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
  .cm-count{margin:0 0 12px;font-size:14px;color:#6E635F;}
  /* shared notice + buttons for errors and empty states */
  .ui-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;}
  .ui-details{margin-top:10px;font-size:13px;color:#6E635F;}
  .ui-details summary{cursor:pointer;min-height:32px;display:flex;align-items:center;}
  .ui-details code{display:block;margin-top:6px;padding:8px 10px;background:#F5EFE4;border-radius:8px;font-size:12px;word-break:break-all;color:#4F4744;}
  .ui-notice{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:18px;background:#fff;border:1px solid #E8E2D8;border-radius:18px;}
  .ui-notice-title{font-family:'Fraunces',serif;font-size:20px;font-weight:600;color:#151210;}
  .ui-notice-text{font-size:15px;line-height:1.5;color:#4F4744;}
  .ui-btn-primary{min-height:48px;padding:0 22px;border:none;border-radius:24px;background:#F4A021;color:#151210;font-family:'Figtree',sans-serif;font-size:16px;font-weight:600;cursor:pointer;}
  .ui-btn-primary:hover{background:#E8941A;}
  .ui-btn-secondary{min-height:44px;padding:0 18px;margin-top:6px;border:1px solid #CFC6B8;border-radius:22px;background:#fff;color:#151210;font-family:'Figtree',sans-serif;font-size:15px;font-weight:600;cursor:pointer;}
  .ui-btn-secondary:hover{border-color:#1A1F2E;}
  .ui-btn-primary:focus-visible,.ui-btn-secondary:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .fl-wrap{width:100%;max-width:960px;margin:0 auto;text-align:left;padding-bottom:120px;}
  .fl-lede{margin:6px 0 16px;font-size:16px;line-height:1.5;color:#4F4744;}
  .fl-bar{margin:0 -20px 16px;}
  .fl-cats{display:flex;gap:8px;overflow-x:auto;padding:0 20px 2px;scrollbar-width:none;}
  .fl-cats::-webkit-scrollbar{display:none;}
  @media(min-width:768px){.fl-bar{margin:0 0 18px;}.fl-cats{flex-wrap:wrap;overflow:visible;padding:0;}}
  .fl-grid{display:grid;grid-template-columns:1fr;gap:10px;}
  @media(min-width:640px){.fl-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}}
  .fl-card{position:relative;display:flex;flex-direction:column;gap:4px;text-align:left;padding:16px 48px 16px 18px;background:#fff;border:1px solid #E8E2D8;border-radius:18px;cursor:pointer;font-family:'Figtree',sans-serif;transition:border-color .15s,box-shadow .15s;}
  .fl-card:hover{border-color:#CFC6B8;box-shadow:0 4px 16px rgba(26,31,46,.08);}
  .fl-card:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .fl-card-cat{font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#8A5A0B;}
  .fl-card-title{font-family:'Fraunces',serif;font-size:20px;font-weight:600;line-height:1.2;color:#151210;}
  .fl-card-desc{font-size:15px;line-height:1.45;color:#4F4744;}
  .fl-card-go{position:absolute;right:16px;top:50%;transform:translateY(-50%);color:#6E635F;display:flex;}
  .fl-shuffle{margin:18px auto 0;min-height:48px;padding:0 22px;border-radius:24px;border:1px solid #CFC6B8;background:#fff;color:#151210;font-family:'Figtree',sans-serif;font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer;}
  .fl-shuffle:hover{border-color:#1A1F2E;}
  .suggestions{display:none;}
  .scan-preview{width:100%;max-height:180px;object-fit:contain;border-radius:10px;margin-bottom:12px;border:1px solid #E8E2D8;}
  .scan-actions{display:flex;gap:8px;}
  .scan-go-btn{padding:9px 22px;background:#F4A021;color:#151210;border:none;border-radius:100px;font-family:'Figtree',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;}
  .scan-go-btn:hover:not(:disabled){background:#D88815;}
  .scan-go-btn:disabled{opacity:.5;cursor:not-allowed;}
  .scan-clear-btn{padding:9px 16px;background:transparent;border:1.5px solid #E8E2D8;border-radius:100px;font-family:'Figtree',sans-serif;font-size:13px;color:#6E635F;cursor:pointer;}
  /* URL specific */
  .import-url-row{display:flex;gap:8px;margin-bottom:0;}
  .import-url-input{flex:1;padding:10px 14px;border:2px solid #151210;border-radius:10px;font-family:'Figtree',sans-serif;font-size:13px;color:#151210;outline:none;background:#fff;transition:border-color .15s,box-shadow .15s;box-shadow:2px 2px 0 #151210;min-width:0;}
  .import-url-input:focus{border-color:#F4A021;box-shadow:2px 2px 0 #F4A021;}
  .import-url-input::placeholder{color:#6E635F;}
  .import-url-btn{padding:10px 18px;background:#F4A021;color:#151210;border:none;border-radius:10px;font-family:'Figtree',sans-serif;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .15s;flex-shrink:0;}
  .import-url-btn:hover:not(:disabled){background:#D88815;}
  .import-url-btn:disabled{opacity:.5;cursor:not-allowed;}
  .import-status-ok{padding:9px 12px;background:#F5EFE4;border:1px solid #E8E2D8;border-radius:8px;font-size:12px;color:#4F4744;margin-top:10px;}
  .import-status-err{font-size:12px;color:#B8340F;margin-top:8px;}
  @keyframes iconFade{
    0%{opacity:0;transform:scale(.88);}
    6%{opacity:1;transform:scale(1);}
    19%{opacity:1;transform:scale(1);}
    25%{opacity:0;transform:scale(.88);}
    100%{opacity:0;transform:scale(.88);}
  }
  @keyframes spin{to{transform:rotate(360deg);}}
  /* ── PREMIUM RECIPE PAGE ── */
  .recipe-page{max-width:860px;margin:0 auto;padding:0 0 80px;}
  /* Edit recipe panel */
  .edit-panel-overlay{position:fixed;inset:0;background:rgba(26,31,46,.6);z-index:300;display:flex;align-items:flex-end;}
  @media(min-width:768px){.edit-panel-overlay{align-items:center;justify-content:center;}}
  .edit-panel{background:#FDFAF5;border-radius:24px 24px 0 0;width:100%;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;}
  @media(min-width:768px){.edit-panel{border-radius:20px;max-width:600px;max-height:80vh;}}
  .edit-panel-header{padding:16px 20px 12px;border-bottom:1px solid #E8E2D8;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
  .edit-panel-title{font-family:'Fraunces',serif;font-size:18px;color:#151210;}
  .edit-panel-body{overflow-y:auto;flex:1;padding:16px 20px;}
  .edit-section-label{font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#B8340F;margin-bottom:10px;margin-top:16px;}
  .edit-section-label:first-child{margin-top:0;}
  .edit-ing-row{display:flex;gap:8px;align-items:center;margin-bottom:8px;}
  .edit-ing-amt{width:104px;padding:8px 10px;border:1.5px solid #E8E2D8;border-radius:8px;font-family:'Figtree',sans-serif;font-size:13px;color:#151210;outline:none;flex-shrink:0;}
  .edit-ing-amt:focus{border-color:#F4A021;}
  .edit-ing-name{flex:1;padding:8px 10px;border:1.5px solid #E8E2D8;border-radius:8px;font-family:'Figtree',sans-serif;font-size:13px;color:#151210;outline:none;}
  .edit-ing-name:focus{border-color:#F4A021;}
  .edit-delete-btn{width:28px;height:28px;border:none;background:none;cursor:pointer;color:#D4CCC0;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:color .12s;}
  .edit-delete-btn:hover{color:#B8340F;}
  .edit-add-btn{display:flex;align-items:center;gap:6px;background:none;border:1.5px dashed #E8E2D8;border-radius:8px;padding:8px 14px;font-family:'Figtree',sans-serif;font-size:13px;color:#6E635F;cursor:pointer;width:100%;justify-content:center;margin-top:4px;transition:all .15s;}
  .edit-add-btn:hover{border-color:#F4A021;color:#F4A021;}
  .edit-step-row{display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;}
  .edit-step-num{width:24px;height:24px;border-radius:50%;background:#151210;color:#FDFAF5;font-family:'Fraunces',serif;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:8px;}
  .edit-step-text{flex:1;padding:8px 10px;border:1.5px solid #E8E2D8;border-radius:8px;font-family:'Figtree',sans-serif;font-size:13px;color:#151210;outline:none;resize:vertical;min-height:60px;line-height:1.5;}
  .edit-step-text:focus{border-color:#F4A021;}
  .edit-panel-footer{padding:14px 20px;border-top:1px solid #E8E2D8;flex-shrink:0;}
  .edit-save-btn{width:100%;padding:13px;background:#F4A021;color:#151210;border:none;border-radius:12px;font-family:'Figtree',sans-serif;font-size:15px;font-weight:700;cursor:pointer;}
  /* Recipe body */
  .recipe-body{padding:36px 32px 0;}
  @media(max-width:640px){.recipe-body{padding:28px 20px 0;}}
  /* Ingredients */
  .two-col{display:grid;grid-template-columns:260px 1fr;gap:48px;align-items:start;}
  @media(max-width:640px){.two-col{grid-template-columns:1fr;gap:32px;}}
  .section-label{font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:#B8340F;margin-bottom:16px;font-weight:700;}
  .ing-group{margin-bottom:20px;}
  .ing-group:last-child{margin-bottom:0;}
  .ing-group-label{
    font-family:'Figtree',sans-serif;font-size:12px;font-weight:700;
    letter-spacing:1.2px;text-transform:uppercase;
    color:#151210;padding:7px 0 6px;
    border-bottom:2px solid #F4A021;margin-bottom:2px;display:inline-block;
  }
  .ing-list{list-style:none;}
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
  /* Remix — saffron card */
  .remix-section{padding:18px 22px 20px;background:#FFF0D4;border:1.5px solid #F4A021;border-radius:16px;}
  @media(max-width:640px){.remix-section{padding:16px 18px 18px;border-radius:14px;}}
  .remix-label{font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:#3D3330;margin-bottom:12px;font-weight:700;display:flex;align-items:center;gap:8px;}
  .remix-chips{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-bottom:14px;}
  .remix-chip{padding:6px 14px;border-radius:100px;border:1.5px solid #D4CCC0;background:#fff;font-family:'Figtree',sans-serif;font-size:12px;color:#3D3330;font-weight:500;cursor:pointer;transition:all .15s;}
  .remix-chip:hover{border-color:#151210;color:#151210;}
  .remix-chip.active{background:#151210;border-color:#151210;color:#fff;}
  .remix-go{padding:9px 24px;background:#B8340F;color:#fff;border:none;border-radius:100px;font-family:'Figtree',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;display:block;margin:0 auto;}
  .remix-go:hover:not(:disabled){background:#C63714;}
  .remix-go:disabled{background:#D4CCC0;cursor:not-allowed;color:#6E635F;}
  /* Sources */
  .source-section{margin-top:28px;padding-top:24px;border-top:1px solid #E8E2D8;}
  .source-section-label{font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:#6E635F;margin-bottom:10px;font-weight:500;}
  .source-links{display:flex;flex-wrap:wrap;gap:8px;}
  .source-link{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border:1px solid #E8E2D8;border-radius:100px;font-family:'Figtree',sans-serif;font-size:12px;color:#6E635F;text-decoration:none;transition:all .15s;background:#fff;}
  .source-link:hover{border-color:#F4A021;color:#F4A021;}
  .source-note{margin-top:12px;font-size:12px;color:#6E635F;line-height:1.6;font-style:italic;}
  /* Pages */
  .page{max-width:900px;margin:0 auto;padding:36px 24px 40px;}
  .empty-state{text-align:center;padding:60px 24px;color:#6E635F;font-size:15px;line-height:1.6;}
  .empty-state h3{font-family:'Fraunces',serif;color:#151210;font-size:22px;margin-bottom:10px;}
  .cat-select{font-size:12px;font-family:'Figtree',sans-serif;border:1.5px solid #F4A021;border-radius:6px;padding:2px 6px;color:#151210;background:#fff;cursor:pointer;outline:none;}
  .cat-badge{display:flex;align-items:center;gap:4px;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#6E635F;background:#F0ECE6;border:none;border-radius:100px;padding:4px 10px;cursor:pointer;font-family:'Figtree',sans-serif;transition:background .12s;}
  .cat-badge:hover{background:#E8E2D8;}
  .cat-badge.is-side{color:#1A1F2E;background:#F5EFE4;}
  .cat-badge.is-side:hover{background:#DCEAD4;}
  .side-quicktag{display:block;margin-top:6px;background:none;border:none;color:#1A1F2E;font-size:12px;font-weight:600;text-decoration:underline;cursor:pointer;padding:0;font-family:'Figtree',sans-serif;}
  .side-quicktag:hover{color:#B8340F;}
  /* Star rating */
  .star-row{display:flex;gap:2px;margin-top:5px;}
  .star{font-size:15px;cursor:pointer;color:#E8E2D8;transition:color .1s;line-height:1;background:none;border:none;padding:0;}
  .star.filled{color:#F4A021;}
  /* Confirm remove */
  .confirm-remove{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px;background:#FFF8F2;border:1.5px solid #B8340F;border-radius:10px;padding:8px 12px;}
  .confirm-remove-text{font-size:12px;color:#151210;font-weight:500;flex:1 1 100%;}
  .confirm-remove-yes{padding:4px 12px;background:#B8340F;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Figtree',sans-serif;}
  .confirm-remove-no{padding:4px 12px;background:transparent;border:1.5px solid #D4CCC0;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;color:#151210;font-family:'Figtree',sans-serif;}
  .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;}
  .recipe-card{background:#fff;border:1px solid #E8E2D8;border-radius:14px;padding:18px;cursor:pointer;transition:all .15s;}
  .recipe-card:hover{box-shadow:0 6px 24px rgba(61,43,31,.1);transform:translateY(-2px);border-color:#F4A021;}
  .card-tag{font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:#1A1F2E;margin-bottom:7px;}
  .card-title{font-family:'Fraunces',serif;font-size:16px;line-height:1.3;margin-bottom:7px;}
  .card-desc{font-size:12px;color:#6E635F;line-height:1.5;margin-bottom:12px;}
  .card-meta{display:flex;gap:10px;font-size:12px;color:#6E635F;flex-wrap:wrap;}
  .card-actions{display:flex;gap:7px;margin-top:12px;padding-top:12px;border-top:1px solid #E8E2D8;}
  .card-btn{flex:1;padding:6px;border-radius:8px;border:1px solid #E8E2D8;background:transparent;font-family:'Figtree',sans-serif;font-size:12px;font-weight:500;cursor:pointer;transition:all .12s;color:#6E635F;}
  .card-btn:hover{background:#FFF0D4;color:#151210;}
  .card-btn.danger:hover{background:#FEE;color:#C00;border-color:#C00;}
  .inspire-lede{margin:6px 0 22px;font-size:16px;line-height:1.5;color:#4F4744;}
  .inspire-section{margin:0 0 22px;border:none;padding:0;min-width:0;}
  .inspire-section-label{display:block;padding:0;margin:0 0 10px;font-size:15px;font-weight:600;color:#151210;}
  .inspire-optional{font-weight:400;color:#6E635F;}
  .inspire-chips{display:flex;flex-wrap:wrap;gap:8px;}
  .inspire-chip{min-height:44px;padding:0 16px;border-radius:22px;border:1px solid #E8E2D8;background:#fff;font-family:'Figtree',sans-serif;font-size:15px;color:#151210;cursor:pointer;transition:background .15s,border-color .15s;}
  .inspire-chip:hover{border-color:#B8AFA3;}
  .inspire-chip.on{background:#1A1F2E;border-color:#1A1F2E;color:#FDFAF5;font-weight:600;}
  .inspire-chip:focus-visible,.inspire-go-btn:focus-visible,.inspire-card-btn:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .qp-card{background:#1A1F2E;border-radius:20px;padding:18px;margin:4px 0 14px;display:flex;flex-direction:column;gap:10px;}
  .qp-card-title{margin:0;font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:#FDFAF5;}
  .qp-card-text{margin:0;font-size:15px;line-height:1.45;color:#C9C3BA;}
  .qp-card-btn{min-height:50px;border:none;border-radius:25px;background:#F4A021;color:#151210;font-family:'Figtree',sans-serif;font-size:16px;font-weight:600;cursor:pointer;}
  .qp-card-btn:focus-visible,.qp-slim:focus-visible,.qp-opt:focus-visible,.qp-shuffle:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .qp-slim{width:100%;min-height:46px;margin:0 0 10px;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:23px;border:2px solid #1A1F2E;background:#fff;color:#151210;font-family:'Figtree',sans-serif;font-size:15px;font-weight:600;cursor:pointer;}
  .qp-sheet{max-height:92vh;overflow-y:auto;}
  .qp-sub{margin:0 0 8px;font-size:15px;line-height:1.45;color:#4F4744;}
  .qp-sub svg{vertical-align:-2px;}
  .qp-days{list-style:none;margin:0;padding:0;}
  .qp-day{display:flex;align-items:center;gap:10px;min-height:52px;padding:4px 0;border-bottom:1px solid #E8E2D8;}
  .qp-date{width:38px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;}
  .qp-dow{font-size:12px;font-weight:600;letter-spacing:1px;color:#6E635F;}
  .qp-dnum{font-family:'Fraunces',serif;font-size:19px;font-weight:700;color:#151210;line-height:1.1;}
  .qp-date.today .qp-dow,.qp-date.today .qp-dnum{color:#B36A00;}
  .qp-seg{flex:1;display:flex;gap:2px;background:#F5EFE4;border-radius:19px;padding:2px;min-width:0;}
  .qp-opt{flex:1;min-width:0;height:36px;padding:0 4px;border:none;border-radius:17px;background:transparent;color:#6E635F;font-family:'Figtree',sans-serif;font-size:13px;white-space:nowrap;cursor:pointer;}
  .qp-opt.long{flex:1.5;}
  .qp-opt.on{background:#1A1F2E;color:#FDFAF5;font-weight:600;}
  .qp-opt.on.skip{background:#E3DACB;color:#151210;}
  .qp-planned{flex:1;min-width:0;min-height:42px;display:flex;align-items:center;gap:10px;padding:6px 14px;border-radius:14px;background:#FFF8EA;border:1px solid #F6DCA6;font-size:14px;}
  .qp-planned-t{flex:1;min-width:0;display:flex;flex-direction:column;}
  .qp-planned-t b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .qp-planned-t span{color:#6E635F;font-size:13px;}
  .qp-switched{border-color:#F6DCA6;background:#FFF8EA;}
  .qp-day{flex-direction:column;align-items:stretch;gap:0;}
  .qp-row{display:flex;align-items:center;gap:10px;min-height:52px;}
  .qp-tap{flex:1;min-width:0;display:flex;align-items:center;gap:10px;cursor:pointer;border-radius:10px;}
  .qp-tap:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .qp-skipped.qp-tap{justify-content:space-between;}
  .qp-change{font-size:13px;font-weight:600;color:#1A1F2E;text-decoration:underline;flex-shrink:0;}
  .qp-day.open .qp-pick,.qp-day.open .qp-skipped{border-color:#1A1F2E;}
  .qp-edit{margin:8px 0 6px 48px;display:flex;flex-direction:column;gap:8px;}
  .qp-edit .qp-find{flex:none;height:46px;}
  .qp-hits{list-style:none;margin:0;padding:0;border:1px solid #E8E2D8;border-radius:14px;background:#fff;overflow:hidden;}
  .qp-hits li+li{border-top:1px solid #F1EBE2;}
  .qp-hit{width:100%;min-height:48px;padding:8px 14px;border:none;background:none;text-align:left;display:flex;flex-direction:column;gap:2px;font-family:'Figtree',sans-serif;cursor:pointer;}
  .qp-hit:hover{background:#FFF8EA;}
  .qp-hit-t{font-size:15px;font-weight:600;color:#151210;}
  .qp-hit-m{font-size:13px;color:#6E635F;}
  .qp-nohit{margin:0;font-size:13px;line-height:1.45;color:#6E635F;}
  .qp-week2{display:block;margin:10px 0 0;min-height:40px;padding:0 16px;border-radius:20px;border:1px dashed #B8AFA3;background:#fff;color:#1A1F2E;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;cursor:pointer;}
  .qp-legend{margin:8px 0 12px;font-size:13px;color:#6E635F;}
  .qp-go{width:100%;}
  .qp-pick{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:6px;border-radius:14px;background:#fff;border:1px solid #E8E2D8;}
  .qp-pic{width:42px!important;height:42px!important;border-radius:9px;flex-shrink:0;object-fit:cover;}
  .qp-pick-text{flex:1;min-width:0;display:flex;flex-direction:column;padding-left:4px;}
  .qp-pick-text strong{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .qp-pick-text span{font-size:13px;color:#6E635F;}
  .qp-shuffle{width:42px;height:42px;flex-shrink:0;border-radius:21px;border:1px solid #E8E2D8;background:#fff;color:#1A1F2E;display:flex;align-items:center;justify-content:center;cursor:pointer;}
  .qp-undo{color:#4F4744;}
  .qp-see-pic{flex-shrink:0;padding:0;border:none;background:none;border-radius:9px;cursor:pointer;display:flex;}
  .qp-see{display:block;padding:0;border:none;background:none;text-align:left;font-family:'Figtree',sans-serif;font-size:15px;font-weight:700;color:#151210;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;cursor:pointer;}
  .qp-when{align-self:flex-start;display:inline-flex;align-items:center;gap:4px;margin-top:3px;padding:2px 8px;border:none;border-radius:10px;background:#F5EFE4;font-family:'Figtree',sans-serif;font-size:12px;color:#4F4744;cursor:pointer;max-width:100%;}
  .qp-see:focus-visible,.qp-see-pic:focus-visible,.qp-when:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .qp-view{display:flex;flex-direction:column;}
  .qp-view-back{align-self:flex-start;margin:0 0 10px;}
  .qp-view-pic{width:100%!important;height:200px!important;border-radius:16px;object-fit:cover;}
  .qp-view-tag{margin:4px 0 0;font-size:15px;line-height:1.45;color:#4F4744;}
  .qp-view-meta{margin:6px 0 0;font-size:14px;color:#6E635F;}
  .qp-view-h{margin:18px 0 6px;font-family:'Fraunces',serif;font-size:19px;}
  .qp-view-group{margin:8px 0 2px;font-size:13px;font-weight:700;color:#6E635F;}
  .qp-view-ings{margin:0;padding-left:18px;font-size:15px;line-height:1.6;}
  .qp-view-steps{margin:0;padding-left:20px;font-size:15px;line-height:1.5;display:flex;flex-direction:column;gap:8px;}
  .qp-view-actions{display:flex;gap:8px;margin-top:20px;}
  .qp-view-actions>button{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;}
  .qp-shuffle:disabled{opacity:.4;cursor:progress;}
  .qp-skipped{flex:1;min-height:42px;display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:8px 14px;border-radius:14px;background:#F5EFE4;color:#6E635F;font-size:14px;line-height:1.4;}
  .qp-note{margin:10px 0 12px;font-size:14px;line-height:1.45;color:#4F4744;}
  .pl-hh-mini{display:inline-flex;align-items:center;gap:8px;min-height:40px;margin:0 0 10px;padding:4px 14px 4px 6px;border:1px solid #E8E2D8;border-radius:20px;background:#fff;font-family:'Figtree',sans-serif;font-size:14px;color:#151210;cursor:pointer;max-width:100%;}
  .pl-hh-mini>span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .pl-hh-mini .pl-hh-av{width:26px;height:26px;font-size:12px;}
  .pl-hh-link{display:flex;align-items:center;gap:8px;margin:20px auto 0;min-height:44px;padding:0 6px;border:none;background:none;color:#1A1F2E;font-family:'Figtree',sans-serif;font-size:15px;text-decoration:underline;cursor:pointer;}
  .pl-activity-x{width:32px;height:32px;flex-shrink:0;border:none;background:none;color:#6E635F;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:16px;}
  .pl-hh{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;margin:2px 0 10px;padding:6px 14px 6px 8px;border:1px solid #E8E2D8;border-radius:24px;background:#fff;font-family:'Figtree',sans-serif;font-size:15px;color:#151210;text-align:left;cursor:pointer;}
  .pl-hh.pl-hh-new{padding-left:14px;color:#1A1F2E;}
  .pl-hh>span:nth-child(2){flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .pl-hh-manage{font-size:14px;font-weight:600;color:#1A1F2E;text-decoration:underline;flex-shrink:0;}
  .pl-hh-avs{display:flex;flex-shrink:0;}
  .pl-hh-av{width:28px;height:28px;border-radius:50%;color:#FDFAF5;font-size:13px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 0 2px #fff;}
  .pl-hh-avs .pl-hh-av+.pl-hh-av{margin-left:-8px;}
  .pl-activity{display:flex;align-items:center;gap:10px;margin:0 0 12px;padding:10px 12px;border-radius:14px;background:#FFF8EA;border:1px solid #F6DCA6;font-size:14px;line-height:1.4;color:#4F4744;}
  .pl-activity b{color:#151210;}
  .pl-activity .pl-hh-av{width:24px;height:24px;font-size:12px;box-shadow:none;}
  .pl-by{color:#6E635F;}
  .gl-shopper{display:flex;align-items:center;gap:10px;margin:0 0 12px;padding:10px 14px;border-radius:14px;background:#1A1F2E;color:#FDFAF5;font-size:14px;}
  .gl-shopper-dot{width:8px;height:8px;border-radius:50%;background:#7BD389;flex-shrink:0;}
  .hh-lede{margin:0 0 12px;font-size:15px;line-height:1.5;color:#4F4744;}
  .hh-box{background:#fff;border:1px solid #E8E2D8;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px;margin-bottom:14px;}
  .hh-box-label{font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#6E635F;}
  .hh-row{display:flex;gap:10px;align-items:flex-start;margin:0;font-size:15px;line-height:1.4;color:#151210;}
  .hh-row svg{flex-shrink:0;margin-top:2px;}
  .hh-members{list-style:none;margin:4px 0 14px;padding:0;}
  .hh-member{display:flex;align-items:center;gap:12px;min-height:52px;border-bottom:1px solid #F1EBE2;}
  .hh-av{width:34px;height:34px;font-size:15px;box-shadow:none;}
  .hh-member-name{flex:1;font-size:16px;}
  .hh-owner{color:#6E635F;font-size:14px;}
  .hh-confirm{display:flex;gap:12px;align-items:center;}
  .hh-danger{height:36px;padding:0 14px;border-radius:18px;border:none;background:#B03A1E;color:#fff;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;cursor:pointer;}
  .hh-wide{width:100%;}
  .hh-fine{margin:8px 0 0;font-size:13px;line-height:1.45;color:#6E635F;text-align:center;}
  .hh-invite{display:flex;flex-direction:column;gap:8px;}
  .hh-link-row{display:flex;gap:8px;}
  .hh-leave{display:block;margin:16px auto 0;min-height:44px;border:none;background:none;color:#8A2A0E;font-family:'Figtree',sans-serif;font-size:15px;text-decoration:underline;cursor:pointer;}
  .hh-leave-confirm{margin-top:16px;padding:12px 14px;border-radius:14px;background:#FDECE6;border:1px solid #F3C3B3;}
  .hh-leave-confirm p{margin:0 0 10px;font-size:15px;line-height:1.45;color:#4F4744;}
  .rx-shop-select.gl-store{min-width:0;width:132px;height:42px;font-size:15px;}
  .gl-sheet .ui-btn-primary{width:100%;}
  .gl-ranges{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 12px;}
  .gl-range{height:34px;padding:0 14px;border-radius:17px;border:none;background:#F5EFE4;color:#4F4744;font-family:'Figtree',sans-serif;font-size:14px;cursor:pointer;}
  .gl-range.on{background:#1A1F2E;color:#FDFAF5;font-weight:600;}
  .gl-range:focus-visible,.gl-check input:focus-visible,.rx-gro-add:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .gl-add{display:flex;align-items:center;gap:8px;min-height:50px;padding:0 6px 0 14px;border:1px solid #E8E2D8;border-radius:14px;background:#fff;}
  .gl-add:focus-within{border-color:#1A1F2E;box-shadow:0 0 0 3px rgba(244,160,33,.35);}
  .gl-plus{font-size:22px;line-height:1;color:#1A1F2E;}
  .gl-input{flex:1;min-width:0;height:46px;border:none;outline:none;background:transparent;font-family:'Figtree',sans-serif;font-size:16px;color:#151210;}
  .gl-input::placeholder{color:#6E635F;}
  .gl-add .fr-add-btn{height:38px;}
  .gl-aisle{margin-top:22px;}
  .gl-aisle-name{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 2px;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#6E635F;}
  .gl-aisle-n{font-weight:500;color:#6E635F;letter-spacing:0;}
  .gl-list{list-style:none;margin:0;padding:0;}
  .gl-item{display:flex;align-items:center;gap:10px;min-height:56px;border-bottom:1px solid #F1EBE2;}
  .gl-check{flex:1;min-width:0;display:flex;align-items:center;gap:12px;cursor:pointer;padding:8px 0;}
  .gl-check input{width:22px;height:22px;accent-color:#1A1F2E;margin:0;flex-shrink:0;}
  .gl-text{display:flex;flex-direction:column;gap:1px;min-width:0;}
  .gl-name{font-size:17px;color:#151210;}
  .gl-note{font-size:13px;color:#6E635F;line-height:1.35;}
  .gl-amt{font-size:15px;color:#4F4744;white-space:nowrap;text-align:right;max-width:40%;}
  .gl-shop{font-size:13px;padding:6px 10px;border-radius:14px;border:1px solid #E8E2D8;color:#4F4744;text-decoration:none;background:#fff;white-space:nowrap;}
  .gl-item.done .gl-name{text-decoration:line-through;color:#6E635F;}
  .gl-item.done .gl-amt,.gl-item.done .gl-note{color:#6E635F;}
  .gl-pantry{margin-top:24px;background:#fff;border:1px solid #E8E2D8;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px;}
  .gl-pantry-title{margin:0;font-size:16px;font-weight:600;color:#151210;}
  .gl-pantry-text{margin:0 0 4px;font-size:14px;color:#4F4744;}
  .gl-cart{margin-top:28px;}
  .gl-empty{margin-top:24px;padding:22px 18px;border-radius:16px;background:#fff;border:1px solid #E8E2D8;}
  .gl-empty-title{margin:0 0 6px;font-family:'Fraunces',serif;font-size:20px;font-weight:700;color:#151210;}
  .gl-empty-text{margin:0;font-size:15px;line-height:1.5;color:#4F4744;}
  .rx-gro-add{margin-top:12px;height:44px;padding:0 18px;border-radius:22px;border:2px solid #1A1F2E;background:#fff;color:#151210;font-family:'Figtree',sans-serif;font-size:15px;font-weight:600;display:inline-flex;align-items:center;gap:8px;cursor:pointer;}
  .gl-sheet-note{margin:0 0 8px;font-size:15px;line-height:1.45;color:#4F4744;}
  .gl-sheet-list{list-style:none;margin:0 0 8px;padding:0;max-height:46vh;overflow-y:auto;}
  .gl-sheet-list li{border-bottom:1px solid #F1EBE2;}
  .gl-sheet-amt{color:#6E635F;font-size:15px;}
  .gl-sheet-staples{margin:4px 0 12px;font-size:13px;line-height:1.45;color:#6E635F;}
  .gl-toast{position:fixed;left:50%;bottom:104px;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:14px;padding:12px 14px 12px 18px;border-radius:16px;background:#1A1F2E;color:#FDFAF5;font-size:15px;box-shadow:0 8px 24px rgba(21,18,16,.25);width:max-content;max-width:calc(100vw - 32px);}
  .gl-toast button{border:none;background:none;color:#F4A021;font-family:'Figtree',sans-serif;font-size:15px;font-weight:600;cursor:pointer;padding:4px;}
  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
  .fr-card{background:#fff;border:1px solid #E8E2D8;border-radius:20px;padding:18px;margin:6px 0 22px;display:flex;flex-direction:column;gap:12px;}
  .fr-title{margin:0;font-family:'Fraunces',serif;font-size:24px;font-weight:700;letter-spacing:-.4px;line-height:1.15;color:#151210;}
  .fr-lede{margin:0;font-size:16px;line-height:1.5;color:#4F4744;}
  .fr-snap{min-height:50px;border-radius:25px;border:2px solid #1A1F2E;background:#fff;color:#151210;font-family:'Figtree',sans-serif;font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;}
  .fr-snap:disabled{opacity:.6;cursor:progress;}
  .fr-photo-row{display:flex;align-items:center;gap:12px;}
  .fr-photo{width:64px;height:64px;border-radius:12px;object-fit:cover;flex-shrink:0;}
  .fr-photo-note{font-size:14px;line-height:1.4;color:#4F4744;}
  .fr-add{display:flex;gap:8px;}
  .fr-input{flex:1;min-width:0;height:46px;box-sizing:border-box;padding:0 14px;border:1px solid #E8E2D8;border-radius:14px;font-family:'Figtree',sans-serif;font-size:16px;color:#151210;outline:none;background:#fff;}
  .fr-input:focus{border-color:#1A1F2E;box-shadow:0 0 0 3px rgba(244,160,33,.35);}
  .fr-input::placeholder{color:#6E635F;}
  .fr-add-btn{height:46px;padding:0 18px;border-radius:14px;border:none;background:#1A1F2E;color:#FDFAF5;font-family:'Figtree',sans-serif;font-size:15px;font-weight:600;cursor:pointer;}
  .fr-add-btn:disabled{background:#E8E2D8;color:#6E635F;cursor:default;}
  .fr-chips{display:flex;flex-wrap:wrap;gap:8px;}
  .fr-chip{min-height:40px;padding:0 14px;border-radius:20px;border:1px dashed #B8AFA3;background:#fff;color:#6E635F;font-family:'Figtree',sans-serif;font-size:15px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;}
  .fr-chip.on{border:1px solid #1A1F2E;background:#1A1F2E;color:#FDFAF5;}
  .fr-chip:focus-visible,.fr-snap:focus-visible,.fr-add-btn:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .fr-unsure{font-size:12px;opacity:.85;}
  .fr-staples{margin:0;font-size:14px;line-height:1.45;color:#6E635F;}
  .fr-results-title{margin:4px 0 12px;font-family:'Fraunces',serif;font-size:24px;font-weight:700;color:#151210;}
  .fr-ready{align-self:flex-start;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#1A1F2E;background:#FCEBCB;padding:4px 8px;border-radius:8px;}
  .fr-uses{font-weight:600;color:#151210;}
  .fr-need{margin:0;font-size:15px;line-height:1.45;color:#4F4744;}
  .fr-none{font-weight:600;color:#2F6B3A;}
  .inspire-diets{margin:-8px 0 16px;font-size:14px;color:#6E635F;}
  .inspire-go-btn{width:100%;min-height:52px;background:#F4A021;color:#151210;border:none;border-radius:26px;font-family:'Figtree',sans-serif;font-size:17px;font-weight:600;cursor:pointer;transition:background .15s;}
  .inspire-go-btn:hover:not(:disabled){background:#E8941A;}
  .inspire-go-btn:disabled{background:#E8E2D8;color:#6E635F;cursor:not-allowed;}
  .inspire-hint{margin:10px 0 0;font-size:14px;color:#6E635F;text-align:center;}
  .inspire-error{margin:0 0 18px;padding:12px 14px;border-radius:14px;background:#FDECE6;border:1px solid #F3C3B3;color:#8A2A0E;font-size:15px;line-height:1.45;}
  .inspire-picks{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 18px;}
  .inspire-pick{height:30px;padding:0 12px;border-radius:15px;background:#F5EFE4;color:#4F4744;font-size:13px;display:inline-flex;align-items:center;}
  .inspire-results{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;}
  .inspire-card{background:#fff;border:1px solid #E8E2D8;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:8px;}
  .inspire-card-title{margin:0;font-family:'Fraunces',serif;font-size:21px;font-weight:600;line-height:1.2;color:#151210;}
  .inspire-card-desc{margin:0;font-size:15px;color:#4F4744;line-height:1.5;}
  .inspire-card-meta{display:flex;gap:6px 14px;font-size:14px;color:#6E635F;flex-wrap:wrap;}
  .inspire-card-why{margin:2px 0 4px;padding-left:12px;border-left:3px solid #F4A021;font-size:15px;line-height:1.45;color:#1A1F2E;}
  .inspire-card-btn{align-self:stretch;min-height:46px;background:#1A1F2E;color:#FDFAF5;border:none;border-radius:23px;font-family:'Figtree',sans-serif;font-size:15px;font-weight:600;cursor:pointer;}
  .inspire-card-btn:hover{background:#2A3042;}
  .inspire-again{display:flex;gap:18px;justify-content:center;margin:18px 0 120px;flex-wrap:wrap;}
  /* ── Share sheet ── */
  .share-overlay{position:fixed;inset:0;background:rgba(21,18,16,.5);z-index:200;display:flex;align-items:flex-end;justify-content:center;}
  @media(min-width:640px){.share-overlay{align-items:center;}}
  .share-sheet{background:#FDFAF5;border-radius:24px 24px 0 0;padding:28px 24px 40px;width:100%;max-width:480px;position:relative;}
  @media(min-width:640px){.share-sheet{border-radius:24px;padding:32px;}}
  .share-sheet-title{font-family:'Fraunces',serif;font-size:20px;font-weight:700;margin-bottom:4px;}
  .share-sheet-dish{font-size:13px;color:#6E635F;margin-bottom:24px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .share-url-row{display:flex;align-items:center;gap:8px;background:#F0ECE6;border-radius:12px;padding:12px 14px;margin-bottom:20px;}
  .share-url-text{flex:1;font-size:12px;color:#151210;font-family:'Figtree',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .share-copy-btn{background:#1A1F2E;color:#FDFAF5;border:none;border-radius:8px;padding:7px 14px;font-family:'Figtree',sans-serif;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0;transition:background .15s;}
  .share-copy-btn.copied{background:#1A1F2E;}
  .share-qr{display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:24px;}
  .share-qr img{width:160px;height:160px;border-radius:12px;border:4px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.08);}
  .share-qr-label{font-size:12px;color:#6E635F;letter-spacing:1.2px;text-transform:uppercase;}
  .share-native-btn{width:100%;background:#F4A021;border:none;border-radius:100px;padding:13px;font-family:'Figtree',sans-serif;font-size:14px;font-weight:700;color:#151210;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;}
  /* ── QR scanner ── */
  .qr-scan-overlay{position:fixed;inset:0;background:rgba(21,18,16,.5);z-index:200;display:flex;align-items:flex-end;justify-content:center;}
  @media(min-width:640px){.qr-scan-overlay{align-items:center;}}
  .qr-scan-sheet{background:#1A1F2E;border-radius:24px 24px 0 0;padding:28px 24px 40px;width:100%;max-width:420px;position:relative;}
  @media(min-width:640px){.qr-scan-sheet{border-radius:24px;padding:32px;}}
  .qr-scan-title{font-family:'Fraunces',serif;font-size:20px;font-weight:700;margin-bottom:4px;color:#FDFAF5;}
  .qr-scan-sub{font-size:13px;color:#6E635F;margin-bottom:20px;}
  .qr-scan-frame{position:relative;width:100%;aspect-ratio:1/1;background:#000;border-radius:16px;overflow:hidden;margin-bottom:16px;}
  .qr-scan-frame video{width:100%;height:100%;object-fit:cover;}
  .qr-scan-reticle{position:absolute;inset:14%;border:2.5px solid #F4A021;border-radius:16px;box-shadow:0 0 0 2000px rgba(0,0,0,.25);pointer-events:none;}
  .qr-scan-status{display:flex;align-items:center;justify-content:center;height:100%;color:#6E635F;font-size:13px;text-align:center;padding:24px;}
  .qr-scan-retry{width:100%;background:#F4A021;border:none;border-radius:100px;padding:12px;font-family:'Figtree',sans-serif;font-size:14px;font-weight:700;color:#151210;cursor:pointer;}
  /* Modal */
  .modal-overlay{position:fixed;inset:0;background:rgba(61,43,31,.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;}
  .modal{background:#FDFAF5;border-radius:18px;padding:26px;width:100%;max-width:480px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);}
  /* search-style modals sit at the top on phones so the on-screen keyboard can't cover the results */
  @media (max-width:640px){
    .modal-overlay.modal-top{align-items:flex-start;padding:calc(env(safe-area-inset-top,0px) + 12px) 12px 12px;}
    .modal-overlay.modal-top .modal{max-height:calc(var(--vvh,100vh) - 24px - env(safe-area-inset-top,0px));padding:20px;}
  }
  .modal-title{font-family:'Fraunces',serif;font-size:20px;margin-bottom:12px;flex-shrink:0;}
  .modal-search{width:100%;padding:10px 14px;border:1.5px solid #E8E2D8;border-radius:10px;font-family:'Figtree',sans-serif;font-size:14px;color:#151210;outline:none;background:#fff;margin-bottom:14px;flex-shrink:0;transition:border-color .15s;box-sizing:border-box;}
  .modal-search:focus{border-color:#F4A021;}
  .modal-search::placeholder{color:#6E635F;}
  .modal-list{overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:4px;}
  .modal-cat-label{font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#B8340F;padding:10px 0 4px;display:flex;align-items:center;gap:8px;flex-shrink:0;}
  .modal-cat-label::after{content:'';flex:1;height:1px;background:#E8E2D8;}
  .modal-item{background:#fff;border:1px solid #E8E2D8;border-radius:10px;padding:12px 14px;cursor:pointer;transition:all .12s;}
  .modal-item:hover{border-color:#F4A021;background:#FFF8F5;}
  .modal-item-title{font-family:'Fraunces',serif;font-size:15px;}
  .modal-item-meta{font-size:12px;color:#6E635F;margin-top:3px;}
  .modal-close{margin-top:14px;flex-shrink:0;background:none;border:1px solid #E8E2D8;border-radius:100px;padding:8px 20px;font-family:'Figtree',sans-serif;font-size:13px;cursor:pointer;color:#6E635F;}
  /* History */
  .history-empty{text-align:center;padding:40px 24px;color:#6E635F;font-size:14px;line-height:1.6;}
  .history-empty h3{font-family:'Fraunces',serif;color:#151210;font-size:20px;margin-bottom:8px;}
  .history-list{display:flex;flex-direction:column;gap:10px;margin-top:8px;}
  .history-item{background:#fff;border:1px solid #E8E2D8;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:14px;transition:all .15s;}
  .history-item:hover{border-color:#F4A021;box-shadow:0 3px 12px rgba(61,43,31,.07);}
  .history-item-main{flex:1;cursor:pointer;min-width:0;}
  .history-item-title{font-family:'Fraunces',serif;font-size:16px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .history-item-meta{font-size:12px;color:#6E635F;display:flex;gap:10px;flex-wrap:wrap;}
  .history-item-time{font-size:12px;color:#6E635F;white-space:nowrap;}
  .history-item-save{padding:5px 14px;border-radius:100px;border:1.5px solid #E8E2D8;background:transparent;font-family:'Figtree',sans-serif;font-size:12px;font-weight:500;cursor:pointer;color:#6E635F;transition:all .15s;white-space:nowrap;flex-shrink:0;}
  .history-item-save:hover{border-color:#F4A021;color:#F4A021;}
  .history-item-save.saved{background:#F4A021;border-color:#F4A021;color:#fff;}
  .history-clear{background:none;border:none;cursor:pointer;font-family:'Figtree',sans-serif;font-size:12px;color:#6E635F;text-decoration:underline;text-underline-offset:3px;margin-top:16px;display:block;}
  /* ── RECIPE PAGE (redesign) ── */
  .rx-shell{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px));}
  .rx-topbar{max-width:820px;margin:0 auto;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;}
  .rx-back{height:44px;padding:0 12px;display:flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;font-family:'Figtree',sans-serif;font-size:15px;font-weight:500;color:#151210;border-radius:22px;}
  .rx-back:hover{background:#F5EFE4;}
  .rx-menu-wrap{position:relative;}
  .rx-icon-btn{width:44px;height:44px;border:none;background:transparent;border-radius:22px;display:flex;align-items:center;justify-content:center;color:#151210;cursor:pointer;}
  .rx-icon-btn:hover{background:#F5EFE4;}
  .rx-menu-scrim{position:fixed;inset:0;z-index:140;}
  .rx-menu{position:absolute;right:4px;top:48px;z-index:150;min-width:232px;background:#fff;border-radius:16px;padding:6px;box-shadow:0 12px 32px rgba(26,31,46,.18),0 0 0 1px rgba(26,31,46,.06);}
  .rx-menu-item{width:100%;min-height:46px;display:flex;align-items:center;gap:12px;padding:0 14px;background:none;border:none;border-radius:10px;font-family:'Figtree',sans-serif;font-size:15px;color:#151210;cursor:pointer;text-align:left;}
  .rx-menu-item:hover{background:#F5EFE4;}
  .rx-menu-danger{color:#B8340F;}
  .rx-menu-aa{font-family:'Fraunces',serif;font-weight:700;font-size:15px;width:17px;text-align:center;}
  .rx-tabs{max-width:820px;margin:0 auto;display:flex;gap:6px;padding:4px 32px 2px 20px;overflow-x:auto;scrollbar-width:none;-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 32px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 32px),transparent);}
  .rx-tabs::-webkit-scrollbar{display:none;}
  .rx-tab{flex-shrink:0;max-width:min(240px,62vw);height:40px;padding:0 16px;border-radius:20px;border:1px solid #E8E2D8;background:#fff;color:#4F4744;font-family:'Figtree',sans-serif;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background .15s,color .15s,border-color .15s;}
  .rx-tab-side{color:#1A1F2E;}
  .rx-tab.active{background:#1A1F2E;border-color:#1A1F2E;color:#FDFAF5;font-weight:600;}
  .rx-tab-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .rx-tab-dot{width:6px;height:6px;border-radius:3px;background:#F4A021;flex-shrink:0;animation:rxPulse 1s ease-in-out infinite;}
  @keyframes rxPulse{0%,100%{opacity:.3}50%{opacity:1}}
  .rx-tab-add{flex-shrink:0;height:40px;padding:0 16px;border-radius:20px;border:1.5px dashed #B8AFA3;background:transparent;color:#4F4744;font-family:'Figtree',sans-serif;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;}
  .rx-tab-add:hover,.rx-tab-add.open{border-style:solid;border-color:#1A1F2E;color:#1A1F2E;background:#F5EFE4;}
  .rx-add-side{max-width:820px;padding:12px 20px 4px;}
  .rx-add-side .side-card{display:flex;flex-direction:column;gap:3px;text-align:left;font-family:'Figtree',sans-serif;min-height:72px;}
  .rx-page{padding-bottom:24px;}
  .rx-photo{display:block;width:calc(100% - 40px);max-width:820px;height:220px;object-fit:cover;border-radius:18px;margin:14px auto 0;}
  .rx-head{max-width:820px;margin:0 auto;padding:22px 20px 0;display:flex;flex-direction:column;gap:10px;}
  .rx-eyebrow{font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#6E635F;}
  .rx-title{margin:0;font-family:'Fraunces',serif;font-size:34px;line-height:1.06;font-weight:700;letter-spacing:-.6px;color:#151210;}
  @media(min-width:768px){.rx-title{font-size:44px;}}
  .rx-tagline{margin:0;font-size:16px;line-height:1.5;color:#4F4744;max-width:620px;}
  .rx-seasonal{display:flex;align-items:center;gap:6px;font-size:14px;color:#1A1F2E;}
  .rx-meta{margin-top:8px;display:flex;align-items:center;background:#fff;border-radius:16px;padding:4px;box-shadow:0 1px 3px rgba(26,31,46,.08);max-width:520px;}
  .rx-meta-item{flex:1;padding:8px 12px;display:flex;flex-direction:column;gap:2px;min-width:0;}
  .rx-meta-serves{flex:1.4;flex-direction:row;align-items:center;justify-content:space-between;padding:4px 4px 4px 12px;}
  .rx-meta-label{font-size:12px;color:#6E635F;}
  .rx-meta-value{font-size:16px;font-weight:600;color:#151210;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .rx-meta-total{flex:2.2;}
  .rx-meta-total .rx-meta-value{white-space:normal;line-height:1.25;}
  .rx-meta-sub{margin:8px 2px 0;font-size:13px;color:#6E635F;}
  .rx-meta-div{width:1px;height:32px;background:#E8E2D8;flex-shrink:0;}
  .rx-stepper{display:flex;gap:2px;}
  .rx-stepper button{width:38px;height:44px;border:none;background:#F5EFE4;font-size:19px;color:#151210;cursor:pointer;font-family:'Figtree',sans-serif;}
  .rx-stepper button:first-child{border-radius:10px 0 0 10px;}
  .rx-stepper button:last-child{border-radius:0 10px 10px 0;}
  .rx-stepper button:hover{background:#EDE3D2;}
  .rx-page .recipe-body{max-width:820px;margin:0 auto;padding:28px 20px 0;}
  .rx-page .two-col{grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:48px;}
  @media(max-width:760px){.rx-page .two-col{grid-template-columns:1fr;gap:32px;}}
  .rx-page .section-label{font-size:13px;letter-spacing:1.5px;color:#6E635F;font-weight:600;margin-bottom:6px;}
  .rx-page .ing-group-label{font-size:12px;border-bottom:none;color:#1A1F2E;padding:14px 0 2px;}
  .rx-ing{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:baseline;padding:11px 0;border-bottom:1px solid #E8E2D8;font-size:17px;line-height:1.4;}
  .rx-ing.no-prep{grid-template-columns:minmax(0,1fr);}
  .rx-ing-main{color:#151210;font-weight:500;}
  .rx-ing-prep{color:#6E635F;}
  .rx-ing:last-child{border-bottom:none;}
  .rx-ing-amt{font-weight:700;color:#151210;margin-right:.3em;}
  .rx-page .step-item{gap:16px;margin-bottom:24px;}
  .rx-page .step-num{width:30px;height:30px;font-size:14px;background:#1A1F2E;}
  .rx-page .step-text{font-size:17px;line-height:1.6;font-weight:400;padding-top:2px;}
  .rx-shop{margin-top:6px;display:flex;flex-direction:column;gap:6px;max-width:520px;}
  .rx-shop-label{font-size:14px;font-weight:500;color:#4F4744;}
  .rx-shop-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
  .rx-shop-row .ck-textlink{padding:0;align-self:center;}
  .rx-shop-select-wrap{position:relative;display:flex;align-items:center;}
  .rx-shop-select{appearance:none;-webkit-appearance:none;height:46px;min-width:200px;padding:0 40px 0 34px;border:1px solid #E8E2D8;border-radius:14px;background:#fff;font-family:'Figtree',sans-serif;font-size:16px;color:#151210;cursor:pointer;}
  .rx-shop-select:focus{outline:none;border-color:#1A1F2E;box-shadow:0 0 0 3px rgba(244,160,33,.25);}
  .rx-shop-dot{position:absolute;left:14px;width:10px;height:10px;border-radius:5px;pointer-events:none;}
  .rx-shop-chev{position:absolute;right:14px;pointer-events:none;color:#6E635F;}
  .rx-groceries{max-width:820px;margin:8px auto 0;padding:28px 20px 0;border-top:1px solid #E8E2D8;scroll-margin-top:16px;}
  .rx-gro-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;}
  .rx-gro-title{margin:0;font-family:'Fraunces',serif;font-size:24px;font-weight:700;color:#151210;}
  .rx-gro-sub{font-size:14px;color:#6E635F;}
  .rx-gro-note{margin:8px 0 0;font-size:14px;color:#4F4744;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .rx-gro-swatch{width:12px;height:12px;border-radius:3px;background:#FFF0D4;border:1px solid #F4A021;flex-shrink:0;}
  .rx-gro-list{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;}
  .rx-gro-item{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-height:52px;padding:6px 12px;border-radius:12px;border:1px solid transparent;opacity:.5;transition:opacity .2s,background .2s,border-color .2s;}
  .rx-gro-item.on{opacity:1;background:#FFF8EA;border-color:#F6DCA6;}
  .rx-gro-check{flex:1;min-width:0;display:flex;align-items:center;gap:12px;cursor:pointer;min-height:40px;}
  .rx-gro-check input{width:22px;height:22px;accent-color:#1A1F2E;margin:0;flex-shrink:0;}
  .rx-gro-check input:checked + .rx-gro-name{text-decoration:line-through;color:#6E635F;}
  .rx-gro-name{font-size:17px;color:#151210;}
  .rx-gro-dishes{display:flex;gap:4px;flex-wrap:wrap;}
  .rx-gro-dish{font-size:12px;padding:3px 8px;border-radius:10px;background:#F1EBE2;color:#4F4744;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;}
  .rx-gro-dish.side{background:#F5EFE4;color:#1A1F2E;}
  .rx-gro-shop{font-size:13px;padding:6px 10px;border-radius:14px;border:1px solid #E8E2D8;color:#4F4744;text-decoration:none;background:#fff;white-space:nowrap;}
  .rx-gro-shop:hover{border-color:#1A1F2E;color:#151210;}
  .edit-steps-notice{background:#FFF6E6;border:1px solid #F1D9A8;border-radius:12px;padding:12px 14px;margin:0 0 12px;font-size:14px;color:#4F4744;line-height:1.5;display:flex;flex-direction:column;gap:10px;}
  .edit-steps-notice strong{color:#151210;}
  .edit-steps-notice-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
  .edit-steps-rewrite{min-height:40px;padding:0 16px;border-radius:20px;border:none;background:#1A1F2E;color:#FDFAF5;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;cursor:pointer;}
  .edit-steps-rewrite:disabled{opacity:.6;cursor:wait;}
  .edit-steps-or{font-size:13px;color:#6E635F;}
  .edit-steps-err{font-size:13px;color:#B8340F;}
  .edit-step-row.flagged .edit-step-text{border-color:#F4A021;background:#FFFBF2;}
  .rx-actionbar{position:fixed;left:0;right:0;bottom:0;z-index:90;background:rgba(253,250,245,.96);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-top:1px solid #E8E2D8;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));}
  .rx-actionbar-inner{max-width:780px;margin:0 auto;display:flex;gap:10px;}
  .rx-save{height:52px;padding:0 20px;border-radius:26px;border:1.5px solid #1A1F2E;background:#fff;color:#151210;font-family:'Figtree',sans-serif;font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;}
  .rx-save.saved{background:#FFF4E0;border-color:#C97A0A;color:#7A4A06;}
  .rx-save:disabled,.rx-cook:disabled{opacity:.45;cursor:not-allowed;}
  .rx-cook{flex:1;height:52px;border-radius:26px;border:none;background:#F4A021;color:#151210;font-family:'Figtree',sans-serif;font-size:16px;font-weight:600;cursor:pointer;transition:background .15s;}
  .rx-cook:hover:not(:disabled){background:#E8931A;}
  /* ── COOKING MODE ── */
  .cook-overlay{position:fixed;inset:0;z-index:300;background:#FDFAF5;display:flex;flex-direction:column;color:#151210;font-family:'Figtree',sans-serif;}
  .cook-top{display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top,0px)) 12px 8px;max-width:760px;width:100%;margin:0 auto;box-sizing:border-box;}
  .cook-close{width:44px;height:44px;border:none;background:#F5EFE4;border-radius:22px;display:flex;align-items:center;justify-content:center;color:#151210;cursor:pointer;flex-shrink:0;}
  .cook-title{flex:1;min-width:0;font-family:'Fraunces',serif;font-weight:600;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;}
  .rx-credit{display:inline-flex;align-items:center;gap:8px;margin:8px 0 2px;padding:5px 12px 5px 5px;border:1px solid #E8E2D8;border-radius:18px;background:#fff;font-family:'Figtree',sans-serif;font-size:14px;color:#4F4744;cursor:pointer;text-align:left;max-width:100%;}
  .rx-credit-av.rx-credit-ec{background:#1A1F2E;color:#F4A021;font-family:'Fraunces',serif;font-style:italic;}
  .rx-credit u{color:#151210;text-underline-offset:2px;}
  .rx-credit-av{width:24px;height:24px;border-radius:12px;background:#C2410C;color:#FDFAF5;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .rx-credit:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .edit-credit{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid #E8E2D8;border-radius:12px;background:#fff;font-size:15px;}
  .edit-credit-remove{flex-shrink:0;height:34px;padding:0 12px;border-radius:17px;border:1px solid #E8E2D8;background:#fff;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;color:#B8340F;cursor:pointer;}
  .edit-credit-note{margin:6px 0 4px;font-size:13px;color:#6E635F;}
  .account-toggle{display:flex;align-items:center;gap:14px;margin:4px 20px 8px;padding:12px 14px;border:1px solid #E8E2D8;border-radius:14px;background:#fff;cursor:pointer;}
  .account-toggle>span{flex:1;display:flex;flex-direction:column;gap:3px;font-size:15px;}
  .account-toggle>span>span{font-size:13px;line-height:1.4;color:#6E635F;}
  .account-toggle input{width:22px;height:22px;accent-color:#1A1F2E;flex-shrink:0;}
  .cook-voice{flex-shrink:0;height:40px;padding:0 12px;border-radius:20px;border:1.5px solid #E8E2D8;background:#fff;color:#151210;display:flex;align-items:center;gap:6px;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;cursor:pointer;}
  .cook-voice.on{background:#1A1F2E;border-color:#1A1F2E;color:#FDFAF5;}
  .cook-voice:focus-visible,.cook-again:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .cook-again{align-self:flex-start;display:flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border-radius:20px;border:none;background:#F5EFE4;color:#151210;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;cursor:pointer;margin-top:-6px;}
  .cook-count{width:56px;text-align:right;font-size:14px;font-weight:600;color:#6E635F;flex-shrink:0;}
  .cook-progress{height:4px;background:#EFE8DC;max-width:760px;width:calc(100% - 24px);margin:0 auto;border-radius:2px;overflow:hidden;flex-shrink:0;}
  .cook-progress div{height:4px;background:#F4A021;border-radius:2px;transition:width .3s ease;}
  .cook-timer-strip{display:flex;gap:6px;flex-wrap:wrap;max-width:760px;width:100%;margin:12px auto 0;padding:0 20px;box-sizing:border-box;}
  .cook-timer-pill{height:36px;padding:0 14px;border-radius:18px;border:none;background:#1A1F2E;color:#FDFAF5;font-family:'Figtree',sans-serif;font-size:14px;font-weight:500;cursor:pointer;font-variant-numeric:tabular-nums;}
  .cook-timer-pill.done{background:#B8340F;}
  .cook-body{flex:1;overflow-y:auto;max-width:760px;width:100%;margin:0 auto;padding:28px 24px 24px;box-sizing:border-box;display:flex;flex-direction:column;gap:20px;}
  .cook-eyebrow{font-size:13px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#6E635F;}
  .cook-step-text{margin:0;font-size:26px;line-height:1.45;font-weight:400;color:#151210;}
  h2.cook-step-text{font-family:'Fraunces',serif;font-weight:700;font-size:30px;line-height:1.15;}
  @media(min-width:768px){.cook-step-text{font-size:32px;}}
  .cook-gather{list-style:none;margin:0;padding:0;}
  .cook-gather label{display:grid;grid-template-columns:28px 92px minmax(0,1fr);align-items:center;gap:8px;min-height:52px;border-bottom:1px solid #E8E2D8;font-size:18px;cursor:pointer;}
  .cook-gather input{width:22px;height:22px;accent-color:#1A1F2E;margin:0;}
  .cook-gather input:checked ~ span{color:#6E635F;text-decoration:line-through;}
  .cook-ing-amt{font-weight:600;}
  .cook-ings{background:#fff;border-radius:16px;padding:14px 18px;box-shadow:0 1px 3px rgba(26,31,46,.08);}
  .cook-ings-label{font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#1A1F2E;margin-bottom:4px;}
  .cook-ings ul{list-style:none;margin:0;padding:0;}
  .cook-ings li{display:grid;grid-template-columns:92px minmax(0,1fr);gap:8px;padding:8px 0;font-size:18px;border-bottom:1px solid #F1EBE2;}
  .cook-ings li:last-child{border-bottom:none;}
  .cook-timers{display:flex;flex-direction:column;gap:10px;align-items:flex-start;}
  .cook-timers.stacked{align-items:stretch;}
  .cook-timers.stacked .cook-timer-start{align-self:stretch;height:auto;min-height:56px;padding:10px 18px;border-radius:18px;}
  .cook-timer-text{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;min-width:0;}
  .cook-timer-for{font-size:13px;font-weight:500;opacity:.75;line-height:1.3;}
  .cook-timer-start{align-self:flex-start;height:52px;padding:0 20px;border-radius:26px;border:1.5px solid #1A1F2E;background:#fff;color:#151210;font-family:'Figtree',sans-serif;font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer;}
  .cook-timer{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#1A1F2E;color:#FDFAF5;border-radius:18px;padding:14px 14px 14px 22px;}
  .cook-timer.done{background:#B8340F;animation:rxPulse 1.2s ease-in-out infinite;}
  .cook-timer-time{font-size:34px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.5px;}
  .cook-timer-btn{height:44px;padding:0 16px;border-radius:22px;border:none;background:rgba(253,250,245,.16);color:#FDFAF5;font-family:'Figtree',sans-serif;font-size:15px;font-weight:600;cursor:pointer;}
  .cook-nav{display:flex;gap:10px;max-width:760px;width:100%;margin:0 auto;padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px));box-sizing:border-box;border-top:1px solid #E8E2D8;}
  .cook-prev{height:56px;padding:0 24px;border-radius:28px;border:1.5px solid #1A1F2E;background:#fff;color:#151210;font-family:'Figtree',sans-serif;font-size:17px;font-weight:600;cursor:pointer;}
  .cook-prev:disabled{opacity:.35;cursor:not-allowed;}
  .cook-next{flex:1;height:56px;border-radius:28px;border:none;background:#F4A021;color:#151210;font-family:'Figtree',sans-serif;font-size:17px;font-weight:600;cursor:pointer;}
  /* ── NAV (three tabs) ── */
  .nav-tab .nav-badge{position:static;margin-left:2px;width:18px;height:18px;font-size:11px;color:#151210;}
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
  .ck-search-input{flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:'Figtree',sans-serif;font-size:17px;color:#151210;}
  .ck-search-input::placeholder{color:#6E635F;}
  .ck-search-scan{width:44px;height:44px;border:none;border-radius:12px;background:#F5EFE4;color:#151210;display:flex;align-items:center;justify-content:center;cursor:pointer;}
  .ck-search-go{height:44px;padding:0 18px;border:none;border-radius:12px;background:#F4A021;color:#151210;font-family:'Figtree',sans-serif;font-size:15px;font-weight:600;cursor:pointer;}
  .ck-chips{display:flex;flex-wrap:wrap;gap:8px;}
  .ck-filters{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;}
  .ck-filters .ck-chip-season{padding:0 18px;}
  .ck-filter{justify-content:center;min-width:0;height:44px;border-radius:22px;}
  .ck-filter-text{overflow:hidden;text-overflow:ellipsis;min-width:0;}
  .diet-sub{margin:-4px 0 14px;font-size:15px;line-height:1.45;color:#4F4744;}
  .diet-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .diet-opt{height:48px;border-radius:14px;border:1px solid #E8E2D8;background:#fff;color:#151210;font-family:'Figtree',sans-serif;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;}
  .diet-opt.on{background:#1A1F2E;border-color:#1A1F2E;color:#FDFAF5;font-weight:600;}
  .diet-opt:focus-visible,.ck-filter:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .diet-actions{display:flex;align-items:center;gap:14px;margin-top:16px;}
  .diet-done{flex:1;}
  .ck-chip{height:38px;padding:0 15px;border-radius:19px;border:1px solid #E8E2D8;background:#fff;color:#151210;font-family:'Figtree',sans-serif;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;}
  .ck-chip:hover{border-color:#B8AFA3;}
  .ck-chip.on{border-color:#1A1F2E;background:#F5EFE4;color:#1A1F2E;font-weight:500;}
  .ck-chip.on-dark{border-color:#1A1F2E;background:#1A1F2E;color:#FDFAF5;font-weight:600;}
  .ck-chip-season{color:#1A1F2E;}
  .ck-location{display:flex;gap:8px;flex-wrap:wrap;margin-top:-6px;}
  .ck-location-input{flex:1;min-width:180px;height:44px;padding:0 14px;border:1px solid #E8E2D8;border-radius:12px;font-family:'Figtree',sans-serif;font-size:15px;background:#fff;outline:none;}
  .ck-location-btn{height:44px;padding:0 14px;border:1px solid #E8E2D8;border-radius:12px;background:#fff;font-family:'Figtree',sans-serif;font-size:14px;color:#1A1F2E;display:flex;align-items:center;gap:6px;cursor:pointer;}
  .ck-inspire{display:flex;align-items:center;gap:14px;padding:16px 16px 16px 20px;margin-top:6px;background:#1A1F2E;border:none;border-radius:18px;text-align:left;cursor:pointer;width:100%;}
  .ck-inspire-text{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0;}
  .ck-inspire-title{font-family:'Fraunces',serif;font-size:19px;font-weight:600;color:#FDFAF5;}
  .ck-inspire-sub{font-family:'Figtree',sans-serif;font-size:14px;color:#C9C3BA;}
  .ck-inspire-cta{flex-shrink:0;height:44px;padding:0 16px;border-radius:22px;background:#F4A021;color:#151210;font-family:'Figtree',sans-serif;font-weight:600;font-size:14px;display:flex;align-items:center;}
  .cm-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;}
  .cm-shuffle{flex-shrink:0;height:40px;padding:0 14px;border-radius:20px;border:1px solid #E8E2D8;background:#fff;display:flex;align-items:center;gap:6px;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;color:#151210;cursor:pointer;}
  .cm-shuffle:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .rx-nutri{display:block;width:100%;margin:14px 0 4px;padding:10px 8px 8px;border-radius:18px;background:#fff;border:1px solid rgba(236,230,221,.8);box-shadow:0 1px 2px rgba(21,18,16,.05),0 8px 24px rgba(21,18,16,.07);font-family:'Figtree',sans-serif;color:#151210;cursor:pointer;text-align:left;}
  .rx-nutri:disabled{cursor:default;}
  .rx-nutri:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .rx-nutri-top{display:flex;justify-content:space-between;align-items:center;padding:0 8px;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#6E635F;}
  .rx-nutri-est{display:inline-flex;align-items:center;gap:4px;font-weight:500;letter-spacing:0;text-transform:none;font-size:12px;}
  .rx-nutri-row{display:flex;margin-top:4px;}
  .rx-nutri-cell{flex:1;display:flex;flex-direction:column;align-items:center;padding:4px 2px;}
  .rx-nutri-cell strong{font-family:'Fraunces',serif;font-size:20px;line-height:1.2;}
  .rx-nutri-cell>span{font-size:12px;color:#6E635F;}
  .rx-nutri-alt{display:block;margin:2px 8px 2px;padding-top:8px;border-top:1px solid #F1EBE2;font-size:13px;color:#6E635F;text-align:center;}
  .nu-alt{margin:-8px 0 14px;font-size:14px;color:#4F4744;}
  .nu-sub{margin:-4px 0 12px;font-size:14px;color:#6E635F;}
  .nu-cal{margin:0 0 14px;font-size:16px;color:#4F4744;}
  .nu-cal strong{font-family:'Fraunces',serif;font-size:44px;color:#151210;margin-right:6px;line-height:1;}
  .nu-bar{margin-bottom:12px;}
  .nu-bar-top{display:flex;justify-content:space-between;font-size:15px;margin-bottom:5px;}
  .nu-bar-top span:last-child{color:#6E635F;}
  .nu-track{display:block;height:8px;border-radius:4px;background:#F1EBE2;overflow:hidden;}
  .nu-track>span{display:block;height:100%;border-radius:4px;}
  .nu-more{display:flex;gap:8px;margin:4px 0 12px;}
  .nu-more>span{flex:1;padding:10px 6px;border-radius:14px;background:#F5EFE4;text-align:center;display:flex;flex-direction:column;}
  .nu-more strong{font-size:16px;}
  .nu-more>span>span{font-size:12px;color:#6E635F;}
  .nu-note{margin:0 0 14px;font-size:14px;line-height:1.45;color:#4F4744;}
  .ck-browse{display:flex;align-items:center;gap:14px;width:100%;margin-top:4px;padding:14px 12px 14px 16px;border-radius:20px;background:#fff;border:1px solid rgba(236,230,221,.8);box-shadow:0 1px 2px rgba(21,18,16,.05),0 8px 24px rgba(21,18,16,.07);text-align:left;cursor:pointer;font-family:'Figtree',sans-serif;color:#151210;}
  .ck-browse:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .ck-fan{position:relative;width:96px;height:66px;flex-shrink:0;}
  .ck-fan-img{position:absolute;width:50px;height:60px;object-fit:cover;border-radius:10px;border:2px solid #fff;box-shadow:0 2px 6px rgba(21,18,16,.18);}
  .ck-fan-0{left:0;top:5px;transform:rotate(-7deg);}
  .ck-fan-1{left:23px;top:0;z-index:1;}
  .ck-fan-2{left:46px;top:5px;transform:rotate(7deg);z-index:2;}
  .ck-browse-txt{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}
  .ck-browse-txt strong{font-family:'Fraunces',serif;font-weight:700;font-size:18px;line-height:1.15;}
  .ck-browse-txt span{font-size:14px;line-height:1.35;color:#6E635F;}
  .ck-browse-go{display:flex;color:#6E635F;flex-shrink:0;}
  .ck-textlink{align-self:flex-start;background:none;border:none;padding:6px 0;font-family:'Figtree',sans-serif;font-size:14px;font-weight:500;color:#1A1F2E;cursor:pointer;text-decoration:underline;text-underline-offset:3px;}
  .ck-textlink:hover{color:#151210;}
  .ck-inline-link{background:none;border:none;cursor:pointer;color:#1A1F2E;text-decoration:underline;font-size:13px;font-family:'Figtree',sans-serif;padding:0;}
  .ck-section{display:flex;flex-direction:column;gap:10px;margin-top:10px;}
  .ck-section-label{margin:0;font-size:13px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#6E635F;}
  .ck-trending{display:flex;gap:10px;overflow-x:auto;margin:0 -20px;padding:2px 20px 6px;scrollbar-width:none;}
  .ck-trending::-webkit-scrollbar{display:none;}
  .ck-trend-card{flex:0 0 156px;height:108px;padding:14px;background:#fff;border:none;border-radius:16px;box-shadow:0 1px 3px rgba(26,31,46,.08);display:flex;flex-direction:column;justify-content:space-between;text-align:left;cursor:pointer;}
  .ck-trend-card:hover{box-shadow:0 4px 14px rgba(26,31,46,.12);}
  .ck-trend-title{font-family:'Fraunces',serif;font-size:17px;font-weight:600;line-height:1.2;color:#151210;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
  .ck-trend-more{background:#F5EFE4;box-shadow:none;}
  .ck-trend-more .ck-trend-title{color:#1A1F2E;}
  .ck-trend-more-arrow{font-size:22px;color:#1A1F2E;line-height:1;}
  .ck-trend-tag{font-family:'Figtree',sans-serif;font-size:12px;color:#B8340F;font-weight:500;}
  .ck-rows{display:flex;flex-direction:column;}
  .ck-row{display:flex;align-items:center;gap:14px;min-height:60px;padding:8px 0;background:none;border:none;border-bottom:1px solid #E8E2D8;text-align:left;cursor:pointer;width:100%;color:#151210;}
  .ck-row:last-child{border-bottom:none;}
  .ck-row-icon{display:flex;color:#1A1F2E;flex-shrink:0;}
  .ck-row-text{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}
  .ck-row-title{font-family:'Figtree',sans-serif;font-size:16px;}
  .ck-row-sub{font-family:'Figtree',sans-serif;font-size:13px;color:#6E635F;}
  .ck-row-chev{font-size:22px;color:#6E635F;transition:transform .15s;line-height:1;}
  .ck-row-panel{padding:4px 0 14px;border-bottom:1px solid #E8E2D8;}
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
  .gen-row{display:grid;grid-template-columns:88px 1fr;align-items:center;min-height:46px;border-bottom:1px solid #E8E2D8;}
  .gen-bar-indeterminate div{width:35%!important;height:100%;border-radius:3px;background:#F4A021;animation:genSlide 1.4s ease-in-out infinite;}
  @keyframes genSlide{0%{transform:translateX(-100%)}100%{transform:translateX(290%)}}
  @media (prefers-reduced-motion:reduce){.gen-bar-indeterminate div{animation:none;width:100%!important;opacity:.5;}}
  .gen-note{margin:14px 0 0;font-size:14px;line-height:1.5;color:#6E635F;}
  /* ── PLAN ── */
  .pl-page{max-width:720px;margin:0 auto;padding:24px 20px 120px;}
  .pl-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:12px;}
  .pl-range{font-size:14px;color:#6E635F;margin-bottom:2px;}
  .pl-groceries{height:44px;padding:0 16px;border-radius:22px;border:none;background:#1A1F2E;color:#FDFAF5;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;}
  .pl-groceries svg{color:#F4A021;}
  .pl-hint{font-size:15px;color:#4F4744;margin:0 0 6px;}
  .pl-days{list-style:none;margin:0;padding:0;}
  .pl-day{display:grid;grid-template-columns:52px minmax(0,1fr);gap:12px;padding:14px 0;border-bottom:1px solid #E8E2D8;}
  .pl-date{display:flex;flex-direction:column;align-items:center;padding-top:2px;}
  .pl-dow{font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#6E635F;}
  .pl-dnum{font-family:'Fraunces',serif;font-size:22px;font-weight:600;color:#151210;}
  .pl-day.today .pl-dnum{width:36px;height:36px;border-radius:18px;background:#F4A021;display:flex;align-items:center;justify-content:center;font-size:19px;margin-top:2px;}
  .pl-meal{display:flex;flex-direction:column;gap:6px;min-width:0;}
  .pl-meal-top{display:flex;align-items:flex-start;gap:8px;}
  .pl-meal-title{flex:1;min-width:0;background:none;border:none;padding:6px 0 0;text-align:left;font-family:'Fraunces',serif;font-size:19px;font-weight:600;line-height:1.25;color:#151210;cursor:pointer;}
  .pl-meal-title:hover{text-decoration:underline;text-underline-offset:3px;}
  .pl-remove{width:40px;height:40px;flex-shrink:0;border:none;background:none;border-radius:20px;color:#6E635F;display:flex;align-items:center;justify-content:center;cursor:pointer;}
  .pl-remove:hover{background:#F5EFE4;color:#151210;}
  .pl-meal-meta{font-size:14px;color:#6E635F;margin-top:-4px;}
  .pl-sides{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
  .pl-side{height:34px;padding:0 4px 0 12px;border-radius:17px;background:#F5EFE4;color:#1A1F2E;font-size:14px;display:inline-flex;align-items:center;gap:6px;max-width:100%;}
  .pl-side.loading{background:#F5F2ED;color:#6E635F;}
  .pl-side.error{background:#FFF0ED;color:#B8340F;}
  .pl-side-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .pl-side-x{width:28px;height:28px;border:none;background:none;border-radius:14px;color:inherit;opacity:.65;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .pl-side-x:hover{opacity:1;background:rgba(26,31,46,.1);}
  .pl-add-side{height:34px;padding:0 10px;border:none;background:none;color:#1A1F2E;font-family:'Figtree',sans-serif;font-size:14px;font-weight:500;cursor:pointer;}
  .pl-add-meal{height:48px;border-radius:14px;border:1.5px dashed #CFC6B8;background:transparent;color:#4F4744;font-family:'Figtree',sans-serif;font-size:15px;font-weight:500;text-align:left;padding:0 16px;cursor:pointer;}
  .pl-add-meal:hover{border-color:#1A1F2E;color:#1A1F2E;background:#F5EFE4;}
  .pl-rel{font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#6E635F;}
  .pl-rel.today{color:#B8340F;}
  .pl-week{list-style:none;display:flex;align-items:center;gap:10px;padding:18px 0 2px;}
  .pl-week span{font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#6E635F;white-space:nowrap;}
  .pl-week::after{content:"";flex:1;height:1px;background:#E8E2D8;}
  .pl-earlier{align-self:center;display:flex;width:fit-content;align-items:center;gap:6px;height:36px;padding:0 14px;margin:0 auto 8px;border-radius:18px;border:1px solid #E8E2D8;background:#fff;font-family:'Figtree',sans-serif;font-size:13px;color:#4F4744;cursor:pointer;}
  .pl-earlier.has-missed{border-color:#F1D9A8;background:#FFF6E6;color:#8A5A0B;font-weight:500;}
  .pl-earlier svg{transition:transform .15s;}
  .pl-earlier-list{border-bottom:2px solid #E8E2D8;margin-bottom:6px;}
  .pl-day.past .pl-dow,.pl-day.past .pl-dnum{color:#6E635F;}
  .pl-empty-past{font-size:15px;color:#6E635F;padding-top:8px;}
  .pl-made-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:4px;}
  .pl-past-title{color:#6E635F;font-size:18px;}
  .pl-made{flex-shrink:0;height:34px;padding:0 10px;border:none;background:none;border-radius:17px;color:#1A1F2E;font-family:'Figtree',sans-serif;font-size:13px;font-weight:500;display:flex;align-items:center;gap:4px;cursor:pointer;}
  .pl-made:hover{background:#F5EFE4;}
  .pl-missed{display:flex;flex-direction:column;gap:8px;padding:12px 14px;background:#FFF6E6;border:1px solid #F1D9A8;border-radius:14px;}
  .pl-missed .pl-meal-title{padding:0;}
  .pl-missed-label{font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#8A5A0B;}
  .pl-missed-sides{font-size:13px;color:#6E635F;margin-top:-4px;}
  .pl-missed-move{display:flex;flex-direction:column;gap:6px;}
  .pl-missed-move-label{font-size:13px;color:#4F4744;}
  .pl-missed-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
  .pl-chip{height:36px;padding:0 14px;border-radius:18px;border:1px solid #E8E2D8;background:#fff;color:#151210;font-family:'Figtree',sans-serif;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;}
  .pl-chip-primary{border-color:#1A1F2E;background:#1A1F2E;color:#FDFAF5;font-weight:600;}
  .pl-chip-ok{border-color:#B9CFB4;color:#1A1F2E;}
  .pl-chip-text{height:36px;padding:0 10px;border:none;background:none;color:#8A5A0B;font-family:'Figtree',sans-serif;font-size:14px;font-weight:500;cursor:pointer;}
  .pl-more{display:block;margin:16px auto 0;height:44px;padding:0 18px;border-radius:22px;border:1px solid #E8E2D8;background:#fff;font-family:'Figtree',sans-serif;font-size:14px;color:#1A1F2E;font-weight:500;cursor:pointer;}
  /* ── LIBRARY ── */
  .lib-page{max-width:960px;margin:0 auto;padding:24px 20px 120px;}
  .lib-search{display:flex;align-items:center;gap:10px;height:48px;padding:0 16px;background:#fff;border:1px solid #E8E2D8;border-radius:14px;margin-bottom:12px;}
  .lib-search input{flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:'Figtree',sans-serif;font-size:16px;color:#151210;}
  .lib-filters{display:flex;gap:6px;overflow-x:auto;margin:0 -20px 18px;padding:0 20px;scrollbar-width:none;}
  .lib-filters::-webkit-scrollbar{display:none;}
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
  @media print{
    .nav,.bottom-nav,.gl-shop,.gl-add,.gl-ranges,
    .rx-topbar,.rx-tabs,.rx-actionbar,.rx-add-side,.cook-overlay,.rx-stepper,.add-side-panel,
    .source-links,.card-actions{display:none !important;}
    body{background:#fff;padding-bottom:0;}
    .recipe-page{max-width:100%;padding:0;}
    .two-col{grid-template-columns:200px 1fr;gap:24px;}
  }
  /* ═══ Sheets, dialogs and menus (redesign) ═══ */
  .share-overlay,.qr-scan-overlay,.account-sheet-overlay,.edit-panel-overlay,.modal-overlay,.signout-confirm-overlay,.save-prompt-overlay{background:rgba(26,31,46,.5);}
  .share-sheet,.qr-scan-sheet,.account-sheet,.edit-panel,.modal,.signout-confirm,.save-prompt{background:#FDFAF5;box-shadow:0 -8px 40px rgba(26,31,46,.18);}
  .share-sheet-title,.qr-scan-title,.edit-panel-title,.modal-title,.signout-confirm-title,.save-prompt-title{font-family:'Fraunces',serif;font-size:24px;font-weight:700;letter-spacing:-.3px;line-height:1.15;color:#151210;}
  .share-sheet-dish,.qr-scan-sub,.signout-confirm-sub,.save-prompt-sub{font-size:15px;line-height:1.5;color:#4F4744;}
  .ui-close{position:absolute;top:14px;right:14px;width:44px;height:44px;border:none;border-radius:22px;background:#F5EFE4;color:#151210;display:flex;align-items:center;justify-content:center;cursor:pointer;}
  .ui-close:hover{background:#EDE3D2;}
  .ui-close:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .ui-handle{width:40px;height:5px;border-radius:3px;background:#E8E2D8;margin:10px auto 0;}
  @media(min-width:640px){.ui-handle{display:none;}}
  /* Share */
  .share-sheet{padding:22px 20px calc(24px + env(safe-area-inset-bottom,0px));max-width:460px;border-radius:24px 24px 0 0;}
  @media(min-width:640px){.share-sheet{border-radius:24px;padding:28px;}}
  .share-sheet-title{margin:8px 56px 4px 0;}
  .share-sheet-dish{margin:0 56px 18px 0;white-space:normal;}
  .share-url-row{background:#fff;border:1px solid #E8E2D8;border-radius:14px;padding:6px 6px 6px 14px;margin-bottom:18px;min-height:52px;}
  .share-url-text{font-size:15px;}
  .share-copy-btn{min-height:40px;padding:0 16px;border-radius:20px;font-size:14px;font-weight:600;}
  .share-qr{background:#fff;border:1px solid #E8E2D8;border-radius:18px;padding:16px;margin-bottom:18px;}
  .share-qr img{width:180px;height:180px;display:block;}
  .share-qr-label{font-size:14px;letter-spacing:0;text-transform:none;color:#6E635F;}
  .share-native-btn{min-height:52px;border-radius:26px;font-size:17px;font-weight:600;color:#151210;display:flex;align-items:center;justify-content:center;gap:8px;}
  /* QR scanner */
  .qr-scan-sheet{background:#1A1F2E;padding:22px 20px calc(24px + env(safe-area-inset-bottom,0px));}
  .qr-scan-title{color:#FDFAF5;margin:8px 56px 6px 0;}
  .qr-scan-sub{color:#C9C3BA;margin:0 0 18px;}
  .qr-scan-sheet .ui-close{background:rgba(253,250,245,.12);color:#FDFAF5;}
  .qr-scan-sheet .ui-close:hover{background:rgba(253,250,245,.2);}
  .qr-scan-status{font-size:15px;color:#C9C3BA;line-height:1.5;}
  .qr-scan-retry{min-height:48px;border-radius:24px;font-size:16px;font-weight:600;color:#151210;}
  .qr-scan-sheet .ui-handle{background:rgba(253,250,245,.25);}
  /* Account */
  .account-sheet{border-radius:24px 24px 0 0;padding:0 0 calc(16px + env(safe-area-inset-bottom,0px));}
  .account-sheet-user{padding:18px 20px 16px;border-bottom:1px solid #E8E2D8;}
  .account-sheet-name{font-size:21px;font-weight:600;}
  .account-sheet-email{font-size:15px;color:#6E635F;}
  .account-sheet-actions{padding:8px 12px;}
  .account-sheet-btn{min-height:52px;border-radius:14px;font-size:17px;font-weight:500;}
  .account-sheet-btn.danger{color:#B8340F;}
  .account-sheet-btn:hover{background:#F5EFE4;}
  .account-sheet-cancel{min-height:52px;padding:0;border:1px solid #E8E2D8;border-radius:26px;font-size:17px;font-weight:600;color:#151210;}
  .account-dropdown{border:1px solid #E8E2D8;border-radius:16px;padding:6px;min-width:240px;box-shadow:0 12px 32px rgba(26,31,46,.14);}
  .account-dropdown-name{font-size:17px;font-weight:600;}
  .account-dropdown-email{font-size:14px;color:#6E635F;}
  .account-dropdown-item{min-height:44px;border-radius:10px;font-size:15px;}
  .account-dropdown-item.danger{color:#B8340F;}
  .account-dropdown-item:hover{background:#F5EFE4;}
  .auth-avatar-placeholder,.account-sheet-avatar-placeholder{color:#151210;}
  /* Confirm + save prompt */
  .signout-confirm,.save-prompt{border-radius:24px;padding:26px 22px 22px;max-width:380px;text-align:left;box-shadow:0 20px 60px rgba(26,31,46,.25);}
  .signout-confirm-title,.save-prompt-title{margin:0 0 8px;}
  .signout-confirm-sub,.save-prompt-sub{margin:0 0 20px;}
  .signout-confirm-btns{gap:10px;}
  .signout-confirm-cancel,.signout-confirm-go{min-height:48px;padding:0;border-radius:24px;font-size:16px;font-weight:600;}
  .signout-confirm-cancel{border:1px solid #CFC6B8;background:#fff;color:#151210;}
  .signout-confirm-go{background:#1A1F2E;color:#FDFAF5;}
  .save-prompt-btn{min-height:52px;padding:0;border-radius:26px;font-size:17px;font-weight:600;}
  .save-prompt-skip{display:block;width:100%;min-height:44px;margin-top:8px;font-size:15px;color:#1A1F2E;text-decoration:underline;text-underline-offset:3px;}
  /* Pick-a-recipe modal (Plan) */
  .modal{border-radius:22px;}
  .modal-title{margin-bottom:14px;}
  .modal-search{min-height:48px;padding:0 14px;border:1px solid #E8E2D8;border-radius:14px;font-size:16px;background:#fff;}
  .modal-search:focus{border-color:#1A1F2E;box-shadow:0 0 0 3px rgba(244,160,33,.35);}
  .modal-cat-label{font-size:12px;letter-spacing:1.5px;color:#1A1F2E;padding:14px 0 6px;}
  .modal-item{border:1px solid #E8E2D8;border-radius:14px;padding:14px 16px;}
  .modal-item:hover{border-color:#CFC6B8;}
  .modal-item-title{font-size:18px;font-weight:600;line-height:1.25;}
  .modal-item-meta{font-size:14px;color:#6E635F;margin-top:4px;}
  .modal-close{min-height:48px;border:1px solid #CFC6B8;border-radius:24px;font-size:16px;font-weight:600;color:#151210;background:#fff;}
  /* Edit recipe panel */
  .edit-panel{border-radius:24px 24px 0 0;max-height:90vh;}
  @media(min-width:768px){.edit-panel{border-radius:24px;max-height:85vh;}}
  .edit-panel-header{padding:12px 20px 14px;border-bottom:1px solid #E8E2D8;position:relative;min-height:44px;}
  .edit-panel-header .ui-close{position:static;}
  .edit-panel-body{padding:4px 20px 20px;}
  .edit-section-label{font-size:13px;letter-spacing:1.5px;color:#6E635F;font-weight:600;margin:20px 0 10px;}
  .edit-title-input{width:100%;box-sizing:border-box;min-height:52px;padding:0 14px;border:1px solid #E8E2D8;border-radius:14px;background:#fff;font-family:'Fraunces',serif;font-size:20px;font-weight:600;color:#151210;outline:none;}
  .edit-title-input:focus,.edit-ing-amt:focus,.edit-ing-name:focus,.edit-step-text:focus{border-color:#1A1F2E;box-shadow:0 0 0 3px rgba(244,160,33,.35);}
  .edit-ing-amt,.edit-ing-name{min-height:46px;box-sizing:border-box;border:1px solid #E8E2D8;border-radius:12px;font-size:16px;background:#fff;}
  .edit-step-text{border:1px solid #E8E2D8;border-radius:12px;font-size:16px;line-height:1.5;padding:10px 12px;background:#fff;}
  .edit-step-num{width:28px;height:28px;font-size:13px;background:#1A1F2E;margin-top:8px;}
  .edit-delete-btn{width:44px;height:44px;color:#6E635F;font-size:20px;border-radius:22px;flex-shrink:0;}
  .edit-delete-btn:hover{background:#F5EFE4;color:#B8340F;}
  .edit-add-btn{min-height:44px;border:1px dashed #CFC6B8;border-radius:12px;font-size:15px;color:#1A1F2E;font-weight:500;}
  .edit-panel-footer{padding:12px 20px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid #E8E2D8;}
  .edit-save-btn{min-height:52px;border-radius:26px;font-size:17px;font-weight:600;color:#151210;}
  /* Bring-a-recipe-in panels */
  .ck-row-panel{padding:6px 0 16px;}
  .scan-preview{max-height:220px;border-radius:14px;border:1px solid #E8E2D8;margin-bottom:12px;}
  .scan-actions{gap:10px;flex-wrap:wrap;}
  .scan-go-btn{min-height:48px;padding:0 22px;border-radius:24px;font-size:16px;font-weight:600;}
  .scan-clear-btn{min-height:48px;padding:0 18px;border-radius:24px;border:1px solid #CFC6B8;background:#fff;color:#151210;font-size:15px;font-weight:600;}
  .import-url-row{gap:8px;}
  .import-url-input{min-height:48px;padding:0 14px;border:1px solid #E8E2D8;border-radius:14px;font-size:16px;background:#fff;}
  .import-url-input:focus{border-color:#1A1F2E;box-shadow:0 0 0 3px rgba(244,160,33,.35);}
  .import-url-btn{min-height:48px;padding:0 18px;border-radius:24px;font-size:15px;font-weight:600;white-space:nowrap;}
  .import-url-btn:disabled,.scan-go-btn:disabled{background:#E8E2D8;color:#6E635F;cursor:wait;}
  .import-progress{margin-top:12px;display:flex;flex-direction:column;gap:8px;font-size:14px;line-height:1.45;color:#4F4744;}
  .import-bar{background:#E8E2D8;max-width:320px;}
  .import-status-ok{margin-top:12px;padding:12px 14px;background:#F5EFE4;border:1px solid #E8E2D8;border-radius:14px;font-size:15px;line-height:1.45;color:#1A1F2E;}
  .import-status-err{margin-top:12px;padding:12px 14px;background:#FDECE6;border:1px solid #F3C3B3;border-radius:14px;font-size:15px;line-height:1.45;color:#8A2A0E;}
  .ck-inline-link{font-size:15px;font-weight:600;}
  /* Recipe page: remix + sources */
  .remix-section{padding:18px;background:#fff;border:1px solid #E8E2D8;border-radius:18px;}
  .remix-label{margin:0;font-family:'Fraunces',serif;font-size:21px;font-weight:600;letter-spacing:0;text-transform:none;color:#151210;display:block;}
  .remix-sub{margin:4px 0 14px;font-size:15px;color:#4F4744;}
  .remix-chips{justify-content:flex-start;gap:8px;margin-bottom:16px;}
  .remix-chip{min-height:40px;padding:0 15px;border-radius:20px;border:1px solid #E8E2D8;font-size:14px;color:#151210;font-weight:400;}
  .remix-chip.active{background:#1A1F2E;border-color:#1A1F2E;color:#FDFAF5;font-weight:600;}
  .remix-go{min-height:48px;padding:0 22px;border-radius:24px;background:#1A1F2E;color:#FDFAF5;font-size:16px;font-weight:600;}
  .remix-go:disabled{background:#E8E2D8;color:#6E635F;cursor:not-allowed;}
  .source-section-label{margin:0 0 10px;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;color:#6E635F;font-weight:600;}
  .source-link{min-height:40px;padding:0 15px;border:1px solid #E8E2D8;border-radius:20px;background:#fff;font-size:14px;color:#151210;}
  .source-link:hover{border-color:#1A1F2E;}
  .source-note{font-size:14px;color:#6E635F;font-style:normal;}
  /* Library: Family */
  .fm-wrap{display:flex;flex-direction:column;gap:12px;max-width:620px;}
  .fm-card{gap:8px;}
  .fm-save{margin-top:8px;min-height:40px;padding:0 14px;border:1px solid #CFC6B8;border-radius:20px;background:#fff;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;color:#151210;cursor:pointer;}
  .fm-save:disabled{border-color:transparent;background:#F5EFE4;color:#1A1F2E;cursor:default;}
  /* Library: Recent */
  .history-list{gap:10px;margin-top:0;}
  .history-item{border:1px solid #E8E2D8;border-radius:18px;padding:14px 14px 14px 18px;gap:12px;flex-wrap:wrap;}
  .history-item:hover{border-color:#CFC6B8;box-shadow:0 4px 16px rgba(26,31,46,.08);}
  .history-item-title{font-size:19px;font-weight:600;white-space:normal;line-height:1.25;margin-bottom:4px;}
  .history-item-meta{font-size:14px;color:#6E635F;gap:12px;}
  .history-item-time{font-size:14px;color:#6E635F;}
  .history-item-save{min-height:40px;padding:0 14px;border-radius:20px;border:1px solid #CFC6B8;background:#fff;font-size:14px;font-weight:600;color:#151210;}
  .history-item-save.saved{background:#F5EFE4;border-color:transparent;color:#1A1F2E;}
  .history-item-save:hover{border-color:#1A1F2E;color:#151210;}
  .history-clear{min-height:44px;margin:18px auto 0;display:block;border:none;background:none;font-family:'Figtree',sans-serif;font-size:15px;color:#B8340F;text-decoration:underline;text-underline-offset:3px;cursor:pointer;}
  .history-empty,.empty-state{text-align:left;padding:28px 0;font-size:16px;color:#4F4744;}
  .history-empty h3,.empty-state h3{font-family:'Fraunces',serif;font-size:22px;font-weight:600;color:#151210;margin:0 0 6px;}
  .rx-stars{gap:2px;}
  .rx-stars .star{font-size:30px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:#D9D1C4;}
  .rx-stars .star.filled{color:#F4A021;}
  .edit-ing-name{min-width:0;}
  .edit-ing-row{gap:6px;}
  .edit-ing-amt{width:96px;}
  /* Add to plan (recipe page) */
  .rx-actionbar-inner .rx-save{padding:0 16px;}
  .rx-plan{height:52px;padding:0 16px;border-radius:26px;border:1.5px solid #1A1F2E;background:#fff;color:#151210;font-family:'Figtree',sans-serif;font-size:16px;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;flex-shrink:0;}
  .rx-plan.planned{background:#FFF4E0;border-color:#C97A0A;color:#7A4A06;}
  .rx-plan:disabled{opacity:.5;cursor:not-allowed;}
  .rx-plan:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .pp-sheet{max-height:85vh;display:flex;flex-direction:column;}
  .pp-sheet>*:not(.pp-days){flex-shrink:0;}
  .pp-toast-text{white-space:nowrap;}
  .pp-days{list-style:none;margin:0 -20px;padding:0 20px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;}
  .pp-day{width:100%;display:flex;align-items:center;gap:14px;min-height:60px;padding:10px 14px;background:#fff;border:1px solid #E8E2D8;border-radius:16px;text-align:left;cursor:pointer;font-family:'Figtree',sans-serif;color:#151210;}
  .pp-day:hover:not(:disabled){border-color:#1A1F2E;}
  .pp-day:focus-visible{outline:3px solid #F4A021;outline-offset:2px;}
  .pp-day.same{background:#F5EFE4;border-color:transparent;cursor:default;opacity:.7;}
  .pp-day.taken{background:#F5EFE4;border-color:transparent;}
  .pp-day.taken .pp-dow,.pp-day.taken .pp-dnum{color:#6E635F;}
  .pp-day.open{border:1.5px solid #E7D3AE;}
  .pp-day.open .pp-meta{color:#B36A00;font-weight:600;}
  .pp-text{flex:1;}
  .pp-thumb{width:44px;height:44px;border-radius:12px;overflow:hidden;flex-shrink:0;}
  .pp-pic{width:100%;height:100%;}
  .pp-tag{flex-shrink:0;font-size:13px;font-weight:600;padding:6px 12px;border-radius:14px;white-space:nowrap;}
  .pp-day.open .pp-tag{background:#fff;color:#B36A00;border:1.5px solid #F4A021;}
  .pp-day.open:hover .pp-tag{background:#F4A021;color:#151210;}
  .pp-day.taken .pp-tag{color:#6E635F;border:1px solid #DDD3C5;background:#fff;}
  .pp-day.same .pp-tag{color:#6E635F;}
  .pp-date{width:40px;display:flex;flex-direction:column;align-items:center;flex-shrink:0;}
  .pp-dow{font-size:12px;font-weight:600;letter-spacing:1px;color:#6E635F;}
  .pp-dnum{font-family:'Fraunces',serif;font-size:21px;font-weight:700;line-height:1.1;}
  .pp-text{display:flex;flex-direction:column;gap:2px;min-width:0;}
  .pp-label{font-size:16px;font-weight:600;}
  .pp-meta{font-size:14px;color:#6E635F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .pp-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(92px + env(safe-area-inset-bottom,0px));z-index:250;display:flex;align-items:center;gap:14px;max-width:calc(100% - 32px);padding:10px 10px 10px 18px;background:#1A1F2E;color:#FDFAF5;border-radius:26px;font-family:'Figtree',sans-serif;font-size:15px;box-shadow:0 8px 24px rgba(26,31,46,.25);}
  .pp-toast button{min-height:40px;padding:0 14px;border:none;border-radius:20px;background:#F4A021;color:#151210;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;}
  /* Dish photos (with illustrated fallback underneath) */
  .edit-unused{margin:4px 0 10px;padding:10px 12px;border-radius:12px;background:#FFF6E6;border:1px solid #F1D9A8;font-size:14px;line-height:1.45;color:#5A4630;}
  .scan-thumbs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;}
  .scan-thumb{position:relative;aspect-ratio:3/4;border-radius:10px;overflow:hidden;border:1px solid #E8E2D8;background:#F5EFE4;}
  .scan-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
  .scan-thumb-n{position:absolute;left:5px;bottom:5px;min-width:20px;height:20px;border-radius:10px;background:rgba(26,31,46,.85);color:#FDFAF5;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;}
  .scan-thumb-x{position:absolute;right:3px;top:3px;width:28px;height:28px;border-radius:14px;border:none;background:rgba(253,250,245,.95);font-size:18px;line-height:1;cursor:pointer;color:#151210;}
  .scan-add{display:block;margin:0 0 12px;font-size:15px;}
  .ai-note{margin:18px 0 0;padding:10px 12px;border-radius:12px;background:#F5EFE4;font-size:13px;line-height:1.45;color:#5A504B;}
  .cook-ai-note{margin-top:20px;}
  .ai-source-note{margin-top:10px;}
  .share-ask-sub{font-size:15px;line-height:1.5;color:#4F4744;margin:6px 0 14px;}
  .share-ask{display:flex;flex-direction:column;gap:10px;}
  .share-ask-opt{display:flex;flex-direction:column;gap:3px;text-align:left;padding:14px 16px;border-radius:14px;border:1.5px solid #DDD3C5;background:#fff;cursor:pointer;font-family:'Figtree',sans-serif;color:#151210;min-height:56px;}
  .share-ask-opt:hover{border-color:#1A1F2E;}
  .share-ask-opt strong{font-size:16px;font-weight:600;}
  .share-ask-opt span{font-size:14px;color:#6E635F;}
  .ck-hits{margin-top:12px;background:#fff;border-radius:18px;box-shadow:0 6px 24px rgba(26,31,46,.12);overflow:hidden;max-width:640px;}
  .ck-hits-label{padding:12px 16px 4px;font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#6E635F;}
  .ck-hits-sep{border-top:1px solid #E8E2D8;margin-top:4px;padding-top:14px;}
  .ck-hit{width:100%;display:flex;align-items:center;gap:12px;padding:10px 16px;background:none;border:none;text-align:left;cursor:pointer;font-family:'Figtree',sans-serif;color:#151210;min-height:64px;}
  .ck-hit:hover{background:#FBF7F0;}
  .ck-hit:focus-visible{outline:3px solid #F4A021;outline-offset:-3px;}
  .ck-hit-pic{width:52px;height:52px;border-radius:12px;flex-shrink:0;}
  .ck-hit-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
  .ck-hit-text strong{font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .ck-hit-text span{font-size:14px;color:#6E635F;}
  .ck-hit-free{flex-shrink:0;font-size:13px;font-weight:700;color:#2F6B3A;background:#E7F1E4;padding:5px 10px;border-radius:12px;}
  .ck-hit-new{border-top:1px solid #E8E2D8;padding-top:12px;padding-bottom:12px;}
  .ck-hit-plus{width:52px;height:52px;border-radius:12px;border:1.5px dashed #D6C7B0;display:flex;align-items:center;justify-content:center;font-size:24px;color:#B36A00;flex-shrink:0;}
  .dish-pic{position:relative;overflow:hidden;background:#F5EFE4;container-type:size;}
  .dish-pic-mark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-style:italic;font-weight:700;font-size:44px;font-size:clamp(16px,34cqmin,84px);color:#E5D8C4;user-select:none;}
  .dish-pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .45s ease;}
  .dish-pic img.in{opacity:1;}
  @media (prefers-reduced-motion:reduce){.dish-pic img{transition:none;}}
  .rx-hero{width:calc(100% - 40px);max-width:820px;height:240px;border-radius:20px;margin:14px auto 0;}
  @media(min-width:768px){.rx-hero{height:340px;}}
  .ck-trend-card.has-pic{height:auto;padding:0;overflow:hidden;justify-content:flex-start;}
  .ck-trend-pic{width:100%;height:104px;flex-shrink:0;}
  .ck-trend-card.has-pic .ck-trend-title{padding:10px 12px 0;font-size:16px;-webkit-line-clamp:2;}
  .ck-trend-card.has-pic .ck-trend-tag{padding:4px 12px 12px;}
  .recipe-card.has-pic{padding-top:0 !important;overflow:hidden;}
  .lib-pic{height:124px;margin:0 -14px 10px;}
  .pl-meal-top{align-items:center;}
  .pl-thumb{width:56px;height:56px;flex-shrink:0;padding:0;border:none;border-radius:14px;overflow:hidden;cursor:pointer;background:none;}
  .pl-pic{width:56px;height:56px;}
  .fl-card.has-pic{padding-left:94px;min-height:96px;}
  .fl-pic{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:68px;height:68px;border-radius:14px;}
  /* ═══ Depth: frosted floating layers, lifted cards, glossy primary buttons ═══ */
  /* Text stays on solid surfaces; glass is only for things that float over content. */
  /* solid on purpose: iOS tints the status bar from a solid top bar, and falls back to cream if it's see-through */
  .mobile-header{background:#1A1F2E;border-bottom:1px solid rgba(255,255,255,.08);box-shadow:0 -100vh 0 100vh #1A1F2E,0 6px 20px rgba(21,18,16,.12);}
  @media(max-width:767px){
    body{padding-bottom:calc(104px + env(safe-area-inset-bottom,0px));}
    .bottom-nav{left:14px;right:14px;bottom:calc(max(env(safe-area-inset-bottom,0px) - 10px,10px) + 4px);height:64px;padding:6px;gap:4px;align-items:stretch;border-radius:32px;border:1px solid rgba(255,255,255,.7);
      background:rgba(253,250,245,.66);-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 10px 30px rgba(21,18,16,.16);}
    .bottom-nav.hidden{transform:translateY(calc(100% + 40px));}
    .bottom-nav .bottom-tab{border-radius:26px;padding:4px;gap:2px;font-size:12px;color:#4F4744;transition:background .2s,color .2s,box-shadow .2s;}
    .bottom-nav .bottom-tab.active{background:rgba(255,255,255,.8);box-shadow:0 2px 8px rgba(21,18,16,.08);color:#151210;}
    .bottom-nav .bottom-tab.active::after{display:none;}
    .bottom-nav .bottom-tab .nav-badge{top:2px;right:calc(50% - 22px);}
  }
  .glass-chip{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:18px;font-size:14px;font-weight:600;color:#FDFAF5;
    background:rgba(21,18,16,.3);-webkit-backdrop-filter:blur(16px) saturate(170%);backdrop-filter:blur(16px) saturate(170%);border:1px solid rgba(255,255,255,.28);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 4px 14px rgba(0,0,0,.18);}
  /* sheets: frosted cream panel lifted off the page */
  .share-overlay{background:rgba(21,18,16,.32);}
  .share-sheet{background:rgba(253,250,245,.86);-webkit-backdrop-filter:blur(28px) saturate(180%);backdrop-filter:blur(28px) saturate(180%);border:1px solid rgba(255,255,255,.85);box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 -12px 40px rgba(21,18,16,.2);}
  /* cards: soft two-layer shadow */
  .recipe-card,.inspire-card,.fr-card,.ck-trend-card,.qp-pick,.hh-box,.gl-pantry,.gl-empty,.lib-grid .recipe-card{border-color:rgba(236,230,221,.8);box-shadow:0 1px 2px rgba(21,18,16,.05),0 8px 24px rgba(21,18,16,.07);}
  .pl-day{border-bottom:none;padding:8px 0;}
  .pl-day:has(.pl-meal-top) .pl-meal{background:#fff;border:1px solid rgba(236,230,221,.8);border-radius:18px;padding:10px 12px;box-shadow:0 1px 2px rgba(21,18,16,.05),0 8px 24px rgba(21,18,16,.07);}
  .pl-thumb,.qp-pic{box-shadow:0 4px 12px rgba(21,18,16,.18);}
  .qp-shuffle{background:rgba(255,255,255,.66);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.8);box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 3px 10px rgba(21,18,16,.12);}
  /* primary buttons: glossy saffron */
  .ui-btn-primary,.inspire-go-btn,.qp-card-btn,.rx-cook,.ck-inspire-cta,.qp-slim{background:linear-gradient(180deg,rgba(255,255,255,.30) 0%,rgba(255,255,255,.06) 48%,rgba(255,255,255,0) 52%),linear-gradient(180deg,#F7AF38,#EE9412);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.75),inset 0 0 0 1px rgba(255,255,255,.28),inset 0 -2px 3px rgba(150,80,0,.22),0 1px 2px rgba(21,18,16,.22),0 4px 10px rgba(21,18,16,.12);}
  .qp-slim{border:none;color:#151210;}
  .ui-btn-primary:disabled,.inspire-go-btn:disabled{background:#E8E2D8;box-shadow:none;}
  .pl-groceries{box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 6px 18px rgba(26,31,46,.25);}
  /* recipe page: big photo, glass details on it, recipe panel sliding up over it */
  .rx-hero-wrap{position:relative;max-width:820px;margin:0 auto;}
  .rx-hero-wrap .rx-hero{width:100%;height:320px;border-radius:0;margin:0;}
  @media(min-width:768px){.rx-hero-wrap{padding:0 20px;margin-top:14px;}.rx-hero-wrap .rx-hero{height:380px;border-radius:24px;}}
  .rx-hero-chips{position:absolute;left:16px;bottom:44px;display:flex;gap:8px;flex-wrap:wrap;}
  @media(min-width:768px){.rx-hero-chips{left:36px;bottom:24px;}}
  .rx-head-over{position:relative;margin-top:-28px;background:#FDFAF5;border-radius:26px 26px 0 0;box-shadow:0 -10px 30px rgba(21,18,16,.12);}
  @media(min-width:768px){.rx-head-over{margin-top:0;box-shadow:none;border-radius:0;}}
  /* recipe action bar: a floating glass pill */
  @media(max-width:767px){
    .rx-actionbar{left:12px;right:12px;bottom:calc(max(env(safe-area-inset-bottom,0px),10px) + 4px);padding:7px;border-radius:33px;border:1px solid rgba(255,255,255,.7);
      background:rgba(253,250,245,.66);-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 10px 30px rgba(21,18,16,.18);}
    .rx-actionbar-inner{gap:6px;}
    .rx-actionbar .rx-save,.rx-actionbar .rx-plan{border:none;background:rgba(255,255,255,.75);height:50px;padding:0 13px;font-size:15px;gap:6px;}
    .rx-actionbar .rx-cook{height:50px;min-width:0;padding:0 12px;font-size:15px;white-space:nowrap;}
  }
  @media (prefers-reduced-transparency:reduce){
    .bottom-nav,.rx-actionbar,.share-sheet,.mobile-header{background:#FDFAF5;-webkit-backdrop-filter:none;backdrop-filter:none;}
    .mobile-header{background:#1A1F2E;}
  }

  /* ── design system: one set of colors, sizes and parts for every screen ── */
  :root{--navy:#1A1F2E;--ink:#151210;--ink2:#4F4744;--muted:#6E635F;--cream:#FDFAF5;--sand:#F5EFE4;--line:#E8E2D8;--line2:#F1EBE2;
    --amber:#F4A021;--amber-deep:#8A5200;--amber-tint:#FFF3DC;--green:#2F6B3A;--green-tint:#E5F4E4;--red:#B8340F;--red-tint:#FBEBE6;
    --r-sm:12px;--r-md:16px;--r-lg:24px;--sh1:0 1px 2px rgba(21,18,16,.06);--sh2:0 1px 2px rgba(21,18,16,.05),0 8px 24px rgba(21,18,16,.08);--sh3:0 10px 30px rgba(21,18,16,.16);}
  /* the main button: soft amber, navy text (never black on amber) */
  .ui-btn-primary,.inspire-go-btn,.qp-card-btn,.rx-cook,.ck-inspire-cta,.qp-slim,.ck-search-go,.ck-tonight-cta,.scan-go-btn{background:linear-gradient(180deg,#F6AB2C,#F09914);box-shadow:0 1px 2px rgba(21,18,16,.22);color:var(--navy);border:none;}
  .ui-btn-primary:disabled,.inspire-go-btn:disabled,.scan-go-btn:disabled{background:var(--line);box-shadow:none;color:var(--muted);}
  .nav-badge,.bottom-tab .nav-badge,.nav-tab .nav-badge{color:var(--navy);}
  /* section labels: one look */
  .ck-section-label,.section-label,.edit-section-label,.modal-cat-label,.ck-hits-label{font-size:12px;font-weight:700;letter-spacing:1.2px;color:var(--muted);}
  .ds-section-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;}
  .ds-link{border:none;background:none;padding:0;min-height:44px;margin:-12px 0;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;color:var(--amber-deep);cursor:pointer;}
  .ds-link:focus-visible{outline:3px solid var(--amber);outline-offset:2px;border-radius:6px;}
  .sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
  /* Cook home */
  .ck-page{gap:12px;padding-top:20px;}
  .ck-search{height:56px;padding:0 6px 0 16px;border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--sh1);gap:10px;}
  .ck-search:focus-within{border-color:var(--navy);box-shadow:var(--sh1),0 0 0 3px rgba(244,160,33,.35);}
  .ck-search-icon{color:var(--muted);}
  .ck-search-input{font-size:16px;}
  .ck-search-scan{border-radius:22px;}
  .ck-search-go{border-radius:22px;font-size:14px;}
  .ck-filters{grid-template-columns:minmax(0,1fr) minmax(0,1fr);}
  .ck-chip{font-weight:600;border-color:var(--line);}
  .ck-inspire,.ck-tonight{margin-top:12px;border-radius:var(--r-lg);box-shadow:var(--sh2);}
  .ck-inspire-title{font-size:20px;font-weight:700;line-height:1.15;}
  .ck-tonight{display:flex;align-items:center;gap:14px;padding:14px;background:var(--navy);color:var(--cream);}
  .ck-tonight-open{flex:1;min-width:0;display:flex;align-items:center;gap:14px;border:none;background:none;padding:0;text-align:left;cursor:pointer;color:inherit;font-family:'Figtree',sans-serif;}
  .ck-tonight-pic{width:76px;height:76px;border-radius:var(--r-md);flex-shrink:0;}
  .ck-tonight-txt{flex:1;min-width:0;display:flex;flex-direction:column;}
  .ck-tonight-label{font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--amber);}
  .ck-tonight-title{font-family:'Fraunces',serif;font-weight:700;font-size:20px;line-height:1.15;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
  .ck-tonight-meta{font-size:14px;color:#C9C2B6;}
  .ck-tonight-cta{flex-shrink:0;height:44px;padding:0 18px;border-radius:22px;font-family:'Figtree',sans-serif;font-size:14px;font-weight:600;cursor:pointer;}
  .ck-tonight-open:focus-visible,.ck-tonight-cta:focus-visible{outline:3px solid var(--amber);outline-offset:3px;border-radius:var(--r-md);}
  .ck-idea{display:flex;align-items:center;gap:12px;width:100%;min-height:64px;padding:10px 12px 10px 14px;border:none;border-radius:var(--r-md);background:#fff;box-shadow:var(--sh2);text-align:left;cursor:pointer;font-family:'Figtree',sans-serif;color:var(--ink);}
  .ck-idea-icon{width:36px;height:36px;border-radius:18px;background:var(--amber-tint);color:var(--amber-deep);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .ck-idea-txt{flex:1;min-width:0;display:flex;flex-direction:column;}
  .ck-idea-txt strong{font-size:16px;font-weight:600;line-height:1.25;}
  .ck-idea-txt span{font-size:14px;color:var(--muted);}
  .ck-idea:focus-visible{outline:3px solid var(--amber);outline-offset:2px;}
  .ck-section{gap:12px;margin-top:20px;}
  .ck-trending{gap:12px;padding:0 20px 4px;}
  .ck-trend-card,.ck-trend-card.has-pic{flex:0 0 200px;height:auto;padding:0;background:none;box-shadow:none;border-radius:0;overflow:visible;gap:8px;justify-content:flex-start;}
  .ck-trend-card:hover{box-shadow:none;}
  .ck-trend-pic{height:150px;border-radius:var(--r-md);}
  .ck-trend-title,.ck-trend-card.has-pic .ck-trend-title{padding:0;font-family:'Figtree',sans-serif;font-size:16px;font-weight:600;line-height:1.25;-webkit-line-clamp:2;}
  .ck-trend-meta{font-family:'Figtree',sans-serif;font-size:14px;color:var(--muted);margin-top:-6px;}
  .ck-trend-card:not(.has-pic){flex-basis:156px;min-height:76px;padding:14px;background:#fff;border-radius:var(--r-md);box-shadow:var(--sh2);}
  .ck-trend-card:focus-visible{outline:3px solid var(--amber);outline-offset:3px;border-radius:var(--r-md);}
  .ck-browse{margin-top:0;border:none;border-radius:var(--r-lg);box-shadow:var(--sh2);}
  .ck-browse-txt strong{font-family:'Figtree',sans-serif;font-size:16px;font-weight:600;line-height:1.25;}
  .ck-browse-txt span{font-size:14px;}
  .ck-row{border-bottom-color:var(--line2);}
  .ck-row-icon{width:36px;height:36px;border-radius:18px;background:var(--amber-tint);color:var(--amber-deep);align-items:center;justify-content:center;}
  .ck-row-icon svg{width:20px;height:20px;}
  .ck-row-sub{font-size:14px;}

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
const DIETS    = ["Vegetarian","Vegan","Gluten-Free","Dairy-Free","Keto","Low-Carb"];

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

/* ── Meal art: simple illustrated cards used until (or instead of) a dish photo ── */
// Title matching for the search box (same rules as the Community search)
const normTitle=(s:string)=>(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
function titleScore(title:string,q:string):number{
  const n=normTitle(title);if(!n||!q)return 0;
  if(n===q)return 100;if(n.startsWith(q))return 60;if(n.includes(q))return 40;
  const words=q.split(" ").filter(w=>w.length>1);
  return words.length&&words.every(w=>n.split(" ").some(t=>t.startsWith(w)))?20:0;
}
// Two recipes can share a name (an AI "Chicken Pot Pie" and Grandma's scanned one).
// Your own versions are told apart by id; generic AI/community recipes of one name count as the same dish.
const isOwnRecipe=(r:any)=>!!(r&&(r._scanned||r._imported||r._edited||r._author));
const sameRecipe=(a:any,b:any)=>{
  if(!a||!b)return false;
  if(a.id!=null&&a.id===b.id)return true;
  const ta=(a.title||"").toLowerCase().trim(),tb=(b.title||"").toLowerCase().trim();
  return !!ta&&ta===tb&&!isOwnRecipe(a)&&!isOwnRecipe(b);
};
// A recipe gets its own photo only after an edit that changes how the dish looks (_ownPhoto holds that photo's name);
// everything else shares the photo for the dish name.
const photoName=(r:any)=>r?._ownPhoto?String(r._ownPhoto):(r?.title||"");
const ingNames=(r:any)=>new Set((r?.ingredient_groups||[]).flatMap((g:any)=>(g.items||[]).map((i:any)=>String(i.name||"").toLowerCase().split(/[,(]/)[0].trim())).filter(Boolean));
// would this edit change what the finished dish looks like in a photo?
async function editChangesLook(before:any,after:any):Promise<boolean>{
  // a new name alone never changes how the dish looks, so renames keep their photo
  const a=ingNames(before),b=ingNames(after);
  // sauces, sugar, starch, oils, vinegars, spices, broth: mixed in, invisible in a photo
  const visible=(n:string)=>{const ai=aisleOf(n);return ai!=="Pantry"&&ai!=="Spices & baking";};
  const removed=(Array.from(a) as string[]).filter(x=>!b.has(x)&&visible(x)),added=(Array.from(b) as string[]).filter(x=>!a.has(x)&&visible(x));
  if(!removed.length&&!added.length)return false;   // only amounts, notes, steps or mixed-in ingredients changed
  try{
    const j=await callAPI([{role:"user",content:`A recipe for "${after.title}" was edited.
Ingredients removed: ${removed.join("; ")||"none"}
Ingredients added: ${added.join("; ")||"none"}
Would a photo of the finished dish look noticeably different? Renaming the same ingredient (e.g. "hamburger" to "ground beef"), brand changes, seasoning or spice tweaks, and anything mixed into a sauce or marinade (sugar, honey, starch, garlic, ginger, vinegar, oils) do NOT count. When unsure, answer false. Swapping a main ingredient (e.g. chicken for tofu, rice for noodles) or adding/removing something visible DOES count.
Reply with ONLY valid JSON: {"looks_different":true or false}`}],"claude-haiku-5-5");
    return j?.looks_different===true;
  }catch{return false;}
}

function DishPic({title,src,className}:{title:string;src?:string|null;className:string}){
  // remember WHICH image finished loading, so a cached image that loads instantly is never missed
  const [loadedSrc,setLoadedSrc]=useState<string|null>(null);
  const imgRef=useRef<HTMLImageElement|null>(null);
  useEffect(()=>{const el=imgRef.current;if(src&&el&&el.complete&&el.naturalWidth>0)setLoadedSrc(src);},[src]);
  return(
    <div className={`dish-pic ${className}`}>
      <span className="dish-pic-mark" aria-hidden="true">e</span>
      {src&&<img ref={imgRef} key={src} src={src} alt="" loading="lazy" className={loadedSrc===src?"in":""} onLoad={()=>setLoadedSrc(src)}/>}
    </div>
  );
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
// Every timer in a step, each labeled from the words around it:
// "Cook for 2 minutes, ... simmer for 8–10 minutes until thick" → two timers.
function stepTimers(step: string): {secs:number;label:string}[]{
  // whole numbers, decimals and fractions: "10", "1.5", "1 1/2", "1/2", plus ranges like "8–10"
  const re=/(?:(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?|(\d+)\/(\d+))(?:\s*(?:-|–|to)\s*\d+(?:\.\d+)?(?:\s+\d+\/\d+)?)?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;
  const out:{secs:number;label:string}[]=[];
  let m: RegExpExecArray|null;
  while((m=re.exec(step))){
    const n=m[1]?parseFloat(m[1])+(m[2]?Number(m[2])/Number(m[3]):0):Number(m[4])/Number(m[5]);
    const unit=m[6].toLowerCase();
    const secs=Math.round(n*(unit.startsWith("h")?3600:unit.startsWith("m")?60:1));
    if(secs<10||secs>12*3600)continue;
    // the clause it sits in: back to the last comma/period/semicolon, forward to the next one
    const startCut=Math.max(step.lastIndexOf(",",m.index),step.lastIndexOf(".",m.index-1),step.lastIndexOf(";",m.index))+1;
    const endRel=step.slice(m.index+m[0].length).search(/[,.;]/);
    let clause=step.slice(startCut,endRel<0?step.length:m.index+m[0].length+endRel).trim();
    clause=clause.replace(/^(and|then|and then)\s+/i,"").replace(/\s+/g," ");
    if(clause.length>60)clause=clause.slice(0,58).replace(/\s+\S*$/,"")+"…";
    out.push({secs,label:clause.charAt(0).toUpperCase()+clause.slice(1)});
  }
  return out;
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
// The recipe's ingredients in display order; step_ingredients indexes into this list.
const ingList=(r:any):any[]=>(r?.ingredient_groups||(r?.ingredients?[{items:r.ingredients}]:[])).flatMap((g:any)=>g.items||[]);
// Which ingredients go in at each step, as indexes into ingList. Each ingredient appears once,
// on the step where it's added. Uses the AI's own list when the recipe has a valid one,
// otherwise a careful guess: every key word must match, the more specific ingredient wins,
// and an ingredient only shows the first time it's used.
function stepIngredientMap(r:any):number[][]{
  const steps:string[]=r?.steps||[],ings=ingList(r);
  const given=r?.step_ingredients;
  if(Array.isArray(given)&&given.length===steps.length&&given.every((a:any)=>Array.isArray(a)&&a.every((n:any)=>Number.isInteger(n)&&n>=0&&n<ings.length))){
    const seen=new Set<number>();
    return given.map((a:number[])=>a.filter(n=>!seen.has(n)&&(seen.add(n),true)));
  }
  const kws=ings.map((i:any)=>ingKeywords(i?.name||""));
  const freq=new Map<string,number>();kws.forEach(k=>new Set(k).forEach(w=>freq.set(w,(freq.get(w)||0)+1)));
  const used=new Set<number>();
  return steps.map(st=>{
    const t=(st||"").toLowerCase();
    const has=(w:string)=>new RegExp(`\\b${w}`).test(t);
    // a match needs the main word (usually the last: "onion", "pepper", "stock") or a word no other ingredient uses ("mozzarella")
    const hits=kws.map((k,i)=>({i,k,core:k[k.length-1],score:k.filter(has).length}))
      .filter(h=>!used.has(h.i)&&h.k.length&&(has(h.core)||h.k.some(w=>freq.get(w)===1&&has(w))));
    // ingredients sharing a main word compete: the one with more of its words in the step wins ("bell pepper" vs "black pepper")
    // and a lone word that's part of a fuller match belongs to that match ("tomato" in "tomato paste" isn't the canned tomatoes)
    const keep=hits.filter(a=>!hits.some(b=>b!==a&&((b.core===a.core&&b.score>a.score)||(a.score===1&&b.score>=2&&a.k.some(w=>has(w)&&b.k.includes(w))))));
    keep.forEach(({i})=>used.add(i));
    return keep.map(({i})=>i);
  });
}
// Ask the AI (cheap model) which ingredients go in at each step, for recipes made before it said so itself.
async function tagStepIngredients(r:any):Promise<number[][]|null>{
  const ings=ingList(r),steps:string[]=r?.steps||[];
  if(!ings.length||!steps.length)return null;
  try{
    const out=await callAPI([{role:"user",content:
`For each cooking step, list which ingredients are ADDED or first used in that step, by number.
Each ingredient goes on exactly one step: the step where it actually goes in (not where it's prepped ahead of time unless that's its only mention, and not where it's merely referred to again, like "return the beef to the pot"). A step can have no ingredients.
Ingredients:
${ings.map((i:any,n:number)=>`${n}. ${`${i.amount||""} ${i.name||""}`.trim()}`).join("\n")}
Steps:
${steps.map((st,n)=>`${n}. ${st}`).join("\n")}
Reply with ONLY valid JSON: {"step_ingredients":[[numbers for step 0],[numbers for step 1],...]} with exactly ${steps.length} lists.`}],"claude-haiku-5-5");
    const m=out?.step_ingredients;
    if(!Array.isArray(m)||m.length!==steps.length)return null;
    if(!m.every((a:any)=>Array.isArray(a)&&a.every((n:any)=>Number.isInteger(n)&&n>=0&&n<ings.length)))return null;
    return m;
  }catch{return null;}
}
// Listed ingredients that no step uses (salt/pepper/garnish "to taste" lines are often fine, so this is a hint, not an error).
function unusedIngs(r: any, steps?: string[]): any[]{
  const text=(steps||r?.steps||[]).join(" \n ").toLowerCase();
  return flatIngs(r).filter((i:any)=>{const ks=ingKeywords(i.name);return ks.length&&!ks.some(k=>new RegExp(`\\b${k}`).test(text));});
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
async function rewriteStepsWithout(edited: any, removedNames: string[], addedNames: string[]=[]): Promise<{steps:string[];tagline?:string}>{
  const kept=flatIngs(edited).map((i:any)=>`${i.amount||""} ${i.name}`.trim());
  const out=await callAPI([{role:"user",content:
`You are editing a home recipe. ${removedNames.length?`The cook took these ingredients off the list: ${removedNames.join(", ")}.`:"The cook didn't take any ingredients off the list."}${addedNames.length?`
They added: ${addedNames.join(", ")}.`:""}
First decide, for each ingredient taken off, whether one of the added ingredients replaces it: the same thing under another name (e.g. "hamburger" and "ground beef"), or a swap the cook clearly intended (e.g. chicken thighs for chicken breasts). Where there's a replacement, keep the step exactly as it was and just use the new ingredient's name. Never drop a cooking step (like browning meat) because its ingredient was renamed or swapped.
Only for ingredients that were truly removed with no replacement: rewrite the method steps so they no longer use or mention them. Keep everything else the same: same order, same voice, same times and temperatures. Only merge or drop a step if it no longer makes sense without the removed ingredients. If no step uses them, return the steps unchanged.
Every added ingredient that isn't a replacement must be used in the method: work it into the step where a cook would actually add it (for example, aromatics go in with the other aromatics, a sauce ingredient is whisked in with the sauce, a topping goes on at the end), with its amount if that helps. Change as little else as possible.
Also update the short description the same way (new names for replaced ingredients, no mention of truly removed ones). Keep its length, tone and wording otherwise; if it doesn't mention them, return it unchanged.
Recipe title: ${edited.title||""}
Current description: ${JSON.stringify(edited.tagline||"")}
Ingredients the recipe still has: ${kept.join("; ")}
Current steps (JSON array): ${JSON.stringify(edited.steps||[])}
Reply with only JSON in this shape: {"tagline":"...","steps":["step one","step two"]}`}]);
  if(!Array.isArray(out?.steps)||!out.steps.length)throw new Error("no steps");
  let steps=out.steps.map((x:any)=>String(x));
  // Safety net: every ingredient still on the list that the old steps used must still be used.
  const usedBefore=new Set(flatIngs(edited).filter((i:any)=>!unusedIngs({ingredient_groups:[{items:[i]}]},edited.steps||[]).length).map((i:any)=>i.name));
  const dropped=()=>unusedIngs(edited,steps).filter((i:any)=>usedBefore.has(i.name)||addedNames.some(a=>normIng(a)===normIng((i.name||"").split(/[,(]/)[0])));
  if(dropped().length){
    const again=await callAPI([{role:"user",content:
`These recipe steps no longer use ${dropped().map((i:any)=>i.name).join(", ")}, which are still in the ingredient list. Put them back where they belong (for example, ground meat is browned first, before the onions and garlic go in, and drained if needed), changing nothing else.
Recipe title: ${edited.title||""}
Ingredients: ${kept.join("; ")}
Steps (JSON array): ${JSON.stringify(steps)}
Reply with only JSON: {"steps":["step one","step two"]}`}]);
    if(Array.isArray(again?.steps)&&again.steps.length)steps=again.steps.map((x:any)=>String(x));
    if(dropped().length)throw new Error("rewrite dropped an ingredient"); // Save then keeps the original steps
  }
  const tagline=typeof out.tagline==="string"&&out.tagline.trim()&&edited.tagline?out.tagline.trim():undefined;
  return {steps,tagline};
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


function buildInspirePrompt(time: string,vibe: string,serves: string,diets: string[],exclude: string[]=[]): string{
  const d=diets.length?" Dietary restrictions: "+diets.join(", ")+".":"";
  const x=exclude.length?` Don't suggest any of these again: ${exclude.join("; ")}.`:"";
  return `Suggest 4 distinct recipe ideas for someone who wants: time available: "${time}", vibe: "${vibe}", serving size: "${serves}".${d}${x}
Reply with ONLY valid JSON, no other text:
{"suggestions":[{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","total_time":"X–Y mins","servings":"2","why":"One sentence on why this fits their request perfectly."},{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","total_time":"X–Y mins","servings":"2","why":"..."},{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","total_time":"X–Y mins","servings":"2","why":"..."},{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","total_time":"X–Y mins","servings":"2","why":"..."}]}
Make each suggestion meaningfully different from the others. Keep titles concise and appetizing, with no brand, store, restaurant or creator names. Only suggest dishes whose realistic total_time fits the time available.
${TIME_RULE}`;
}

// "Cook with what you have": four dishes built around what's already in the fridge
function buildFridgePrompt(items: string[],time: string,diets: string[],exclude: string[]=[]): string{
  const d=diets.length?" Dietary restrictions: "+diets.join(", ")+".":"";
  const t=time?` Time available: "${time}". Only suggest dishes whose realistic total_time fits.`:"";
  const x=exclude.length?` Don't suggest any of these: ${exclude.join("; ")}.`:"";
  return `A home cook wants to make dinner mostly from what they already have: ${items.join("; ")}. Assume they also have ${STAPLES_NOTE}.${t}${d}${x}
Suggest 4 distinct dishes that use as many of their ingredients as make a good dish, and keep anything else they'd have to buy to 3 items or fewer. Never build a dish around something they didn't list.
Reply with ONLY valid JSON, no other text, with exactly 4 suggestions shaped like this:
{"suggestions":[{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","total_time":"X–Y mins","servings":"4","uses":["their ingredients this dish uses, written exactly as they gave them"],"need":["anything else to buy, short grocery names, not the staples above"],"why":"One sentence on why this is a good use of what they have."}]}
Keep titles concise and appetizing, with no brand, store, restaurant or creator names.
${TIME_RULE}`;
}

const FRIDGE_SPOT_PROMPT=`This is a photo of someone's fridge, freezer, pantry or counter. List the foods you can see that could go into a meal, using plain grocery names a home cook would use ("chicken thighs", "spinach", "cheddar", "greek yogurt", "bell peppers"). Leave out drinks, condiments, oil, salt, spices and anything you can't identify. Mark "sure": false for anything you're guessing at. At most 20 items.
Reply with ONLY valid JSON: {"items":[{"name":"spinach","sure":true}]}. If there's no food in the photo, reply {"items":[]}.`;

// Shrink a photo before sending it, so uploads are quick and cheap
function downscaleImage(file: File, max=1400): Promise<string|null>{
  return new Promise(res=>{
    if(file.size>15*1024*1024)return res(null);
    const url=URL.createObjectURL(file);
    const img=new window.Image();
    img.onload=()=>{
      URL.revokeObjectURL(url);
      let w=img.width,h=img.height;
      if(w>max||h>max){if(w>h){h=Math.round(h*(max/w));w=max;}else{w=Math.round(w*(max/h));h=max;}}
      const c=document.createElement("canvas");c.width=w;c.height=h;
      const ctx=c.getContext("2d");if(!ctx)return res(null);
      ctx.drawImage(img,0,0,w,h);res(c.toDataURL("image/jpeg",0.8));
    };
    img.onerror=()=>{URL.revokeObjectURL(url);res(null);};
    img.src=url;
  });
}

// What the grocery list keeps: extras, plus checkmarks from the last 30 days
function listPayload(extras:any[],checked:Record<string,number>,cleared:Record<string,number>){
  const cutoff=Date.now()-30*864e5;
  const recent=(o:Record<string,number>)=>{const n:Record<string,number>={};for(const k in o||{})if(o[k]>cutoff)n[k]=o[k];return n;};
  return {extras:(extras||[]).slice(0,300),checked:recent(checked),cleared:recent(cleared)};
}

// "Plan my week": how much time each night. Starts like the last week someone planned.
type QPLevel="quick"|"normal"|"long"|"skip";
const QP_LEVELS:[QPLevel,string][]=[["quick","Quick"],["normal","Normal"],["long","Take my time"],["skip","Skip"]];
const QP_LABEL:Record<QPLevel,string>={quick:"Quick",normal:"Normal",long:"Take my time",skip:"Skip"};
const QP_DEFAULT:Record<number,QPLevel>={0:"long",1:"quick",2:"quick",3:"quick",4:"quick",5:"skip",6:"normal"}; // by weekday, Sunday = 0

const HH_COLORS=["#1A1F2E","#B5651D","#2F6B3A","#6B4E9B","#B03A48","#1F6F8B","#8A6D1E","#4F4744"];

const FRIDGE_TIMES:[string,number][]=[["Under 30 mins",30],["Under 45 mins",45],["1 hour+",0]];

function buildScanPrompt(): string{
  return `Extract the recipe from this image. Use US imperial measurements only (cups, tbsp, tsp, oz, lbs, °F). Each ingredient's "amount" holds only the quantity, unit and size (e.g. "1", "2 cups", "1 large"); the ingredient itself and any prep notes go in "name" (amount "1", name "red bell pepper, cored and diced"). Reply with ONLY valid JSON:
{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","total_time":"X–Y mins","servings":"4","ingredient_groups":[{"label":"","items":[{"amount":"2 tbsp","name":"olive oil"}]}],"steps":["Full step."],"step_ingredients":[[0]],"grocery_items":["olive oil"],"sources":[],"source_note":"Digitized from a recipe card."}\nstep_ingredients: one list per step, in step order, holding the numbers of the ingredients added in that step (count through every ingredient_groups item in order, starting at 0). Each ingredient appears in exactly one list: the step where it goes in, not later steps that mention it again.\nIf the source lists times, keep them unless they are clearly unrealistic for a home cook; total_time is always your own realistic estimate. ${TIME_RULE}`;
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
{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","total_time":"X–Y mins","servings":"4","ingredient_groups":[{"label":"","items":[{"amount":"2 tbsp","name":"olive oil"}]}],"steps":["Full detailed step."],"step_ingredients":[[0]],"grocery_items":["olive oil"],"sources":[],"source_note":"Extracted from [site name]."}
Group ingredients by component if applicable. Write full clear steps.\nstep_ingredients: one list per step, in step order, holding the numbers of the ingredients added in that step (count through every ingredient_groups item in order, starting at 0). Each ingredient appears in exactly one list: the step where it goes in, not later steps that mention it again.\nIf the source lists times, keep them unless they are clearly unrealistic for a home cook; total_time is always your own realistic estimate. ${TIME_RULE}`;
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


async function callAPI(messages: any[], model:string="claude-sonnet-4-6"): Promise<any>{
  const res=await fetch("/api/recipe",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model,max_tokens:2048,messages}),
  });
  const raw=await res.text();
  if(!res.ok)throw new Error("HTTP "+res.status+": "+raw.slice(0,300));
  let data:any;try{data=JSON.parse(raw);}catch{throw new Error("Not JSON: "+raw.slice(0,200));}
  if(data.error)throw new Error("API: "+JSON.stringify(data.error).slice(0,200));
  const text=(data.content||[]).filter((b:any)=>b.type==="text").map((b:any)=>b.text).join("");
  if(!text.trim())throw new Error("Empty response");
  const s=text.indexOf("{"),e=text.lastIndexOf("}");
  if(s===-1)throw new Error("No JSON: "+text.slice(0,200));
  const out=JSON.parse(text.slice(s,e+1));
  if(out?.not_a_dish)throw new Error("NOT_A_DISH");
  return out;
}

// A plain dish search: the server writes the recipe and files it in the Community itself.
async function makeDish(dish:string,opts:{fresh?:boolean;diets?:string[]}={}): Promise<{recipe:any;fromCache:boolean}>{
  const res=await fetch("/api/dish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dish,fresh:!!opts.fresh,diets:opts.diets||[]})});
  const raw=await res.text();
  if(!res.ok)throw new Error("HTTP "+res.status+": "+raw.slice(0,300));
  let data:any;try{data=JSON.parse(raw);}catch{throw new Error("Not JSON: "+raw.slice(0,200));}
  if(data.not_a_dish)throw new Error("NOT_A_DISH");
  if(!data.recipe)throw new Error("Empty response");
  return {recipe:data.recipe,fromCache:!!data.fromCache};
}

/* ── MAIN APP ── */
export default function App({onReady}:{onReady?:()=>void}={}){
  const {user,isLoaded}          = useUser();
  const {signOut,openSignIn}     = useClerk();
  const [tab,setTab]             = useState("search");
  const [homeMode,setHomeMode]   = useState<"search"|"inspire"|"tryme">("search");
  const [communityRecipes,setCommunityRecipes] = useState<any[]>([]);
  const [communityStatus,setCommunityStatus]   = useState("idle");
  const [communityAuthed,setCommunityAuthed]   = useState(false);
  const [communityTab,setCommunityTab]         = useState("All");
  const [commShuffle,setCommShuffle] = useState(0); // 0 = A–Z, otherwise a shuffle seed
  const [communitySearch,setCommunitySearch]   = useState("");
  const [showShare,setShowShare]               = useState(false);
  const [shareUrl,setShareUrl]                 = useState<string|null>(null);
  const [shareLoading,setShareLoading]         = useState(false);
  const [trendingDishes,setTrendingDishes]     = useState<string[]>([]);
  const [query,setQuery]         = useState("");
  const [diets,setDiets]         = useState<string[]>([]);
  const [showDietSheet,setShowDietSheet] = useState(false);
  // diet is a standing choice: remembered on this device
  useEffect(()=>{try{const d=JSON.parse(localStorage.getItem("dw-diets")||"[]");if(Array.isArray(d))setDiets(d.filter((x:any)=>DIETS.includes(x)));}catch{}},[]);
  const dietsLoaded=useRef(false);
  useEffect(()=>{if(!dietsLoaded.current){dietsLoaded.current=true;return;}try{localStorage.setItem("dw-diets",JSON.stringify(diets));}catch{}},[diets]);
  const [seasonal,setSeasonal]   = useState(false);
  const [location,setLocation]   = useState("");
  const [detecting,setDetecting] = useState(false);
  const [status,setStatus]       = useState("idle");
  const [recipe,setRecipe]       = useState<any>(null);
  const [servings,setServings]   = useState<number|null>(null);
  const [errorMsg,setErrorMsg]   = useState("");
  const [saved,setSaved]         = useState<any[]>([]);
  const [history,setHistory]     = useState<any[]>([]);
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
  const qpScroll=useRef(0); // where "Your week" was scrolled to before opening a recipe
  const [qp,setQp] = useState<{stage:"days"|"loading"|"week";days:{key:string;level:QPLevel}[];picks:Record<string,{recipe:any;minutes:number}|null>;matches:Record<string,number>;seen:Record<string,string[]>;shared:string[];replace:Record<string,boolean>;week2:boolean;err?:string;busy?:string;open?:string;view?:string;prev?:Record<string,{pick:{recipe:any;minutes:number}|null;level:QPLevel;replaced:boolean}[]>}|null>(null);
  const [qpQuery,setQpQuery] = useState("");
  const [qpHits,setQpHits] = useState<{title:string;total?:string;key?:string;recipe?:any;from:"mine"|"community"}[]>([]);
  const [planAhead,setPlanAhead] = useState(14);         // Plan: how many days ahead are shown
  const [assignDay,setAssignDay] = useState<string|null>(null);
  const [modalSearch,setModalSearch] = useState("");
  const [scanImages,setScanImages] = useState<string[]>([]);   // up to 4 photos or screenshots of one recipe
  const scanPreview=scanImages[0]||null;
  const [scanStatus,setScanStatus] = useState("idle");
  const [scanMsg,setScanMsg]     = useState("");
  const [showQrScanner,setShowQrScanner] = useState(false);
  const [qrStatus,setQrStatus]   = useState("idle"); // idle|starting|scanning|error
  const [qrErr,setQrErr]         = useState("");
  const [ready,setReady]         = useState(false);
  // let the opening screen know it can fade away (after the first paint with saved data)
  useEffect(()=>{if(ready)requestAnimationFrame(()=>onReady?.());},[ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const [cloudSynced,setCloudSynced] = useState(false); // true only after the cloud copy has been read
  const [planCloud,setPlanCloud] = useState(false);       // plan: true once this device has read the account copy
  const planLastSent=useRef("");                          // last plan payload sent to / read from the account
  const planPushTimer=useRef<any>(null);
  const [justAdded,setJustAdded]     = useState<any>(null); // most recent scanned/imported recipe, so "View" can open it directly
  const [returnTab,setReturnTab]     = useState<string|null>(null); // tab to return to when leaving a recipe opened from Saved/Community/Week/Family
  const [returnDayKey,setReturnDayKey] = useState<string|null>(null); // which day's sides to sync pairedSides back into, when returnTab is "week"
  const [planPick,setPlanPick] = useState<{recipe:any;sides:any[];moveFrom?:string}|null>(null); // recipe being added to the plan from its page
  const [planToast,setPlanToast] = useState<{day:string;title:string}|null>(null);
  const [nameClash,setNameClash] = useState<{id:any;title:string}|null>(null);
  const [communityHits,setCommunityHits] = useState<{q:string;results:{title:string;tagline:string;total:string;key?:string}[]}>({q:"",results:[]}); // free matches while typing   // saved a second recipe with a name you already have
  useEffect(()=>{if(!planToast)return;const id=setTimeout(()=>setPlanToast(null),5000);return()=>clearTimeout(id);},[planToast]);
  const [pairedSides,setPairedSides] = useState<{title:string;status:string;recipe:any}[]>([]); // every side dish paired alongside the main dish (loading|done|error)
  const [activePane,setActivePane]   = useState(0); // 0 = main dish, 1..N = pairedSides[n-1]
  const swipeStartX = useRef<number|null>(null);
  const [showAddSide,setShowAddSide] = useState(false);      // "Add another side" popover
  const [addSideMode,setAddSideMode] = useState<"suggest"|"search">("suggest");
  const [addSideQuery,setAddSideQuery] = useState("");
  const [commFrom,setCommFrom]=useState<"search"|"library">("search"); // where Community was opened from, for Back and the nav
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
  const [shareTarget,setShareTarget] = useState<any>(null);
  const [shareMode,setShareMode] = useState<"link"|"original"|"ask"|"private">("link"); // imports share the original; scans ask first     // the recipe the share sheet is for (main dish or a side)
  const [cookRecipe,setCookRecipe]   = useState<any>(null);     // recipe open in cooking mode
  const [cookStep,setCookStep]       = useState(0);             // 0 = gather ingredients, 1..N = steps
  const [shareName,setShareName]     = useState(true);          // first name on recipes you share
  useEffect(()=>{try{setShareName(localStorage.getItem("dw-share-name")!=="0");}catch{}},[]);
  const [readAloud,setReadAloud]     = useState(false);         // cooking mode reads each step out loud
  const [cookTimers,setCookTimers]   = useState<Record<string,{end:number;dur:number;done?:boolean}>>({}); // key "step.timer"
  const [,setCookTick]               = useState(0);             // forces a re-render each second while a timer runs
  const cookSwipeX = useRef<number|null>(null);
  const audioCtxRef = useRef<any>(null);
  const [urlInput,setUrlInput]   = useState("");
  const [urlStatus,setUrlStatus] = useState("idle"); // idle|loading|done|error
  const [urlMsg,setUrlMsg]       = useState("");
  const [remixChips,setRemixChips] = useState<string[]>([]);
  const [remixStatus,setRemixStatus] = useState("idle");
  const [retailer,setRetailer] = useState<string>("");
  const [showEditPanel,setShowEditPanel] = useState(false);
  const [editRecipe,setEditRecipe] = useState<any>(null);
  const [ingTextSize,setIngTextSize] = useState<"normal"|"large"|"xl">("normal");
  const [recipePhotos,setRecipePhotos] = useState<Record<number,string>>({});
  const [nutri,setNutri] = useState<Record<string,any>>({}); // nutrition per serving, by recipe version ("loading" | "error" | numbers)
  const [showNutri,setShowNutri] = useState(false);
  const [dishPhotos,setDishPhotos] = useState<Record<string,string>>({});   // AI dish photos by normalized title
  const [photosServerOn,setPhotosServerOn] = useState(false);               // photos switched on for everyone
  const [photosPreview,setPhotosPreview] = useState(false);                 // ?photos=1 preview on this device
  const [dishTimes,setDishTimes]       = useState<Record<string,{prep_time:string;cook_time:string;total_time:string}>>({}); // realistic re-estimates for older recipes
  const photoAsked=useRef<Set<string>>(new Set());
  const photoMaking=useRef<Set<string>>(new Set());
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Inspire Me
  const [inspireTime,setInspireTime]   = useState("");
  const [inspireVibe,setInspireVibe]   = useState("");
  const [inspireServes,setInspireServes] = useState("");
  const [inspireKind,setInspireKind]   = useState<"fridge"|"vibe">("fridge");
  const [fridgeItems,setFridgeItems]   = useState<{name:string;on:boolean;unsure?:boolean}[]>([]);
  const [fridgeText,setFridgeText]     = useState("");
  const [fridgePhoto,setFridgePhoto]   = useState<string|null>(null);
  const [fridgeSpot,setFridgeSpot]     = useState<{status:"idle"|"spotting"|"error";msg?:string}>({status:"idle"});
  const [fridgeTime,setFridgeTime]     = useState("");
  const [fridgeCommunity,setFridgeCommunity] = useState<{recipe:any;uses:string[];need:string[]}[]>([]);
  const [fridgeHave,setFridgeHave]     = useState<{id:number;items:string[]}|null>(null); // ticks these off the grocery list
  const fridgeFileRef=useRef<HTMLInputElement>(null);

  // Grocery list: planned meals feed it automatically; extras are things added by hand or from a recipe
  const [listExtras,setListExtras]   = useState<{id:string;name:string;amount?:string;recipe?:string;at:number}[]>([]);
  const [listChecked,setListChecked] = useState<Record<string,number>>({}); // item id → when it went in the cart
  const [listCleared,setListCleared] = useState<Record<string,number>>({}); // planned items cleared from the cart
  const [listRange,setListRange]     = useState<"this"|"next"|"extras">("this");
  const [listInput,setListInput]     = useState("");
  const [addSheet,setAddSheet]       = useState<{recipe:any;items:{name:string;amount:string;on:boolean}[];staples:string[];plannedOn:string|null}|null>(null);
  const [listToast,setListToast]     = useState("");

  // Household: shared plan + list
  type HHMember={id:string;name:string;image?:string};
  const [household,setHousehold]     = useState<{id:string;owner:string;me:string;members:HHMember[]}|null>(null);
  const [planMeta,setPlanMeta]       = useState<{planBy:Record<string,{id:string;name:string;at:number}>;extrasBy:Record<string,{id:string;name:string}>;checkedBy:Record<string,{id:string;name:string;at:number}>;activity:{id:string;name:string;text:string;at:number}[]}|null>(null);
  const [showHousehold,setShowHousehold] = useState(false);
  const [hhInvite,setHhInvite]       = useState<{url:string;copied?:boolean}|null>(null);
  const [hhBusy,setHhBusy]           = useState(false);
  const [hhMsg,setHhMsg]             = useState("");
  const [hhConfirm,setHhConfirm]     = useState<string|null>(null); // "leave" or a member id to remove
  const [hhRecipes,setHhRecipes]     = useState<any[]>([]);
  const planInFlight=useRef(false);
  const [hhSeenAt,setHhSeenAt] = useState(0); // household changes seen up to here
  const markHhSeen=()=>{const t=Date.now();setHhSeenAt(t);try{localStorage.setItem("dw-hh-seen",String(t));}catch{}};
  const latestPlanPayload=useRef("");
  const [inspireStatus,setInspireStatus] = useState("idle");
  const inspireStart=useRef(0);
  const [inspireSuggestions,setInspireSuggestions] = useState<any[]>([]);

  // Family Codes
  const [familyCode,setFamilyCode]     = useState("");
  const [sharedRecipes,setSharedRecipes] = useState<any[]>([]);

  // Auth UI
  const [showAccountDropdown,setShowAccountDropdown] = useState(false);
  const [showAccountSheet,setShowAccountSheet]       = useState(false);
  const [showSignOutConfirm,setShowSignOutConfirm]   = useState(false);
  const [reportFor,setReportFor] = useState<any|null>(null);          // recipe being reported
  const [reportState,setReportState] = useState<"idle"|"sending"|"sent">("idle");
  const [deleteStage,setDeleteStage] = useState<"closed"|"confirm"|"deleting"|"error">("closed"); // delete account
  const [navHidden,setNavHidden]                     = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);
  const progScrollAt = useRef(0);
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
        const r={...data.recipe,id:Date.now(),_dish:data.recipe.title||slug,_ts:Date.now(),_fromCache:true,_shareFrom:slug,_adapt:{slug,title:data.recipe.title||"",by:data.recipe._byName||""}};
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

  /* cooking mode: read steps out loud (the phone's own voice, no cost) */
  useEffect(()=>{try{setReadAloud(localStorage.getItem("dw-read-aloud")==="1");}catch{}},[]);
  // the phone's own voice: the backup when the natural voice can't load
  const deviceSay=(text:string)=>{
    try{
      const ss=window.speechSynthesis;if(!ss||!text)return;
      ss.cancel();
      const u=new SpeechSynthesisUtterance(text);
      // the best natural-sounding English voice the phone has; never the novelty and old robot voices (Albert, Fred, Zarvox…)
      const ROBOT=/albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|fred|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley|compact/i;
      const voices=ss.getVoices().filter(v=>/^en[-_]/i.test(v.lang)&&!ROBOT.test(v.name)&&!ROBOT.test(v.voiceURI||""));
      const us=voices.filter(v=>/^en[-_]US/i.test(v.lang));
      const v=us.find(v=>/premium/i.test(v.name+v.voiceURI))||us.find(v=>/enhanced|siri|natural/i.test(v.name+v.voiceURI))
        ||voices.find(v=>/premium|enhanced|siri|natural/i.test(v.name+v.voiceURI))
        ||us.find(v=>/ava|samantha|allison|zoe|evan|nathan|susan|google us english/i.test(v.name))||us[0]||voices[0];
      if(v)u.voice=v;
      u.lang=v?.lang||"en-US";u.rate=1;
      ss.speak(u);
    }catch{}
  };
  // natural voice (made once per sentence on our server and saved), falling back to the phone's voice
  const ttsAudio=useRef<HTMLAudioElement|null>(null);
  const ttsUrls=useRef<Record<string,Promise<string|null>>>({});
  const ttsTurn=useRef(0);
  const ttsUrl=(text:string)=>{
    if(!ttsUrls.current[text])ttsUrls.current[text]=fetch("/api/speak",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})})
      .then(r=>r.ok?r.json():null).then(d=>d?.url||null).catch(()=>null)
      .then(u=>{if(!u)delete ttsUrls.current[text];return u;});
    return ttsUrls.current[text];
  };
  // iPhone only lets a page play sound it starts from a tap: call this inside the tap
  const unlockAudio=()=>{
    try{
      if(!ttsAudio.current){ttsAudio.current=new Audio();ttsAudio.current.preload="auto";}
      const a=ttsAudio.current;
      if(!a.src||a.src.startsWith("data:")){a.src="data:audio/mpeg;base64,//NAxAAAAANIAAAAAExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80LEAAAAA0gAAAAATEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zQsQAAAADSAAAAABMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zQMQAAAADSAAAAABMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//NCxAAAAANIAAAAAExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";a.play().catch(()=>{});}
    }catch{}
  };
  const stopSpeech=()=>{ttsTurn.current++;try{ttsAudio.current?.pause();}catch{}try{window.speechSynthesis?.cancel();}catch{}};
  const say=(text:string)=>{
    if(!text)return;
    stopSpeech();
    const turn=ttsTurn.current;
    const slow=setTimeout(()=>{if(turn===ttsTurn.current){ttsTurn.current++;deviceSay(text);}},7000);
    ttsUrl(text).then(url=>{
      clearTimeout(slow);
      if(turn!==ttsTurn.current)return;
      const a=ttsAudio.current;
      if(!url||!a){deviceSay(text);return;}
      a.src=url;
      a.play().catch(()=>{if(turn===ttsTurn.current)deviceSay(text);});
    });
  };
  const stepSpeech=(r:any,i:number)=>i===0?"Gather your ingredients. Tap Start cooking when you're ready.":`Step ${i}. ${(r?.steps||[])[i-1]||""}`;
  useEffect(()=>{if(!cookRecipe)stopSpeech();},[cookRecipe]);
  const toggleReadAloud=()=>{
    const on=!readAloud;
    setReadAloud(on);
    try{localStorage.setItem("dw-read-aloud",on?"1":"0");}catch{}
    if(!on)stopSpeech();
    else if(cookRecipe){unlockAudio();say(stepSpeech(cookRecipe,cookStep));ttsUrl(stepSpeech(cookRecipe,cookStep+1));}
  };

  /* cooking mode: tick running timers; chime + vibrate when one finishes */
  useEffect(()=>{
    if(!Object.values(cookTimers).some(t=>!t.done))return;
    const id=setInterval(()=>{
      const now=Date.now();
      let finished=false;
      const next:Record<string,{end:number;dur:number;done?:boolean}>={};
      for(const [k,t] of Object.entries(cookTimers)){
        if(!t.done&&now>=t.end){ next[k]={...t,done:true}; finished=true; }
        else next[k]=t;
      }
      if(finished){
        setCookTimers(next);
        if(readAloud){const steps=Object.keys(next).filter(k=>next[k].done&&!cookTimers[k]?.done).map(k=>k.split(".")[0]);say(`Time's up for step ${Array.from(new Set(steps)).join(" and ")}.`);}
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
      try{const gl=localStorage.getItem("dw-list");if(gl){const d=JSON.parse(gl);setListExtras(Array.isArray(d.extras)?d.extras:[]);setListChecked(d.checked||{});setListCleared(d.cleared||{});}}catch{}
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
  useEffect(()=>{try{setHhSeenAt(+(localStorage.getItem("dw-hh-seen")||0));}catch{}},[]);
  // leaving the Plan screen counts as having seen the latest household change
  useEffect(()=>{if(tab!=="week")return;return()=>{const t=Date.now();setHhSeenAt(t);try{localStorage.setItem("dw-hh-seen",String(t));}catch{}};},[tab]);
  // arriving from a household invite: open the plan
  useEffect(()=>{if(!ready)return;try{const t=sessionStorage.getItem("dw-open-tab");if(t){sessionStorage.removeItem("dw-open-tab");setTab(t);}}catch{}},[ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-list",JSON.stringify(listPayload(listExtras,listChecked,listCleared)));}catch{};},[listExtras,listChecked,listCleared,ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-ratings",JSON.stringify(ratings));}catch{};},[ratings,ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-cat-overrides",JSON.stringify(categoryOverrides));}catch{};},[categoryOverrides,ready]);
  useEffect(()=>{if(tab==="community"&&communityStatus==="idle")loadCommunity();},[tab,communityStatus]);
  useEffect(()=>{
    fetch("/api/trending").then(r=>r.json()).then(d=>{
      if(d.dishes?.length)setTrendingDishes(d.dishes);
    }).catch(()=>{});
  },[]);

  /* library sync: the account holds the saved recipes, and each device sends only what it changed.
     The account remembers deletions, so a recipe removed on one device is removed everywhere, and
     an edit is never overwritten by another device's older copy. Unsent changes are remembered on
     the device and retried. Re-read whenever the app comes back to the foreground. */
  const libSynced=useRef<Record<string,string>>({});   // id → the recipe as the account last had it
  const libPending=useRef<{dirty:Record<string,1>;gone:Record<string,1>}>({dirty:{},gone:{}});
  const libTimer=useRef<any>(null);
  const libTries=useRef(0);
  const savedNow=useRef<any[]>(saved);savedNow.current=saved;
  const libKeep=()=>{try{if(user)localStorage.setItem(`dw-lib-pending:${user.id}`,JSON.stringify(libPending.current));}catch{}};
  const pullLibrary=async()=>{
    const res=await fetch("/api/recipes");
    if(!res.ok)throw new Error("library read failed");
    const d=await res.json();
    const cloud:any[]=Array.isArray(d.recipes)?d.recipes:[];
    const removed=new Set<string>((Array.isArray(d.removed)?d.removed:[]).map(String));
    const P=libPending.current,before=libSynced.current;
    const synced:Record<string,string>={};
    for(const r of cloud)synced[String(r.id)]=JSON.stringify(r);
    libSynced.current=synced;
    setSaved(local=>{
      const cloudBy=new Map<string,any>(cloud.map(r=>[String(r.id),r]));
      const out:any[]=[];const seen=new Set<string>();
      for(const r of local){
        const id=String(r.id);if(seen.has(id))continue;
        if(P.dirty[id]){out.push(r);seen.add(id);continue;}                    // this device's unsent change wins
        if(cloudBy.has(id)){out.push(synced[id]===JSON.stringify(r)?r:cloudBy.get(id));seen.add(id);continue;} // the account's copy
        if(removed.has(id)||before[id]!==undefined)continue;                   // removed on another device
        out.push(r);seen.add(id);                                              // only on this device so far: it gets sent up
      }
      const fresh=cloud.filter(r=>!seen.has(String(r.id))&&!P.gone[String(r.id)]);
      if(!fresh.length&&out.length===local.length&&out.every((r,i)=>r===local[i]))return local;
      return [...fresh,...out];
    });
  };
  const pushLibrary=async()=>{
    libTimer.current=null;
    const P=libPending.current;
    const gone=Object.keys(P.gone);
    const changed=savedNow.current.filter((r:any)=>P.dirty[String(r.id)]);
    if(!changed.length&&!gone.length)return;
    try{
      // a first sync from a device with lots of its own recipes goes up in batches
      for(let i=0;i<Math.max(changed.length,1);i+=40){
        const batch=changed.slice(i,i+40);
        const res=await fetch("/api/recipes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({changed:batch,removed:i===0?gone:[]})});
        if(!res.ok)throw new Error("library save failed");
        for(const r of batch){
          const id=String(r.id),sent=JSON.stringify(r);
          libSynced.current[id]=sent;
          const cur=savedNow.current.find((x:any)=>String(x.id)===id);
          if(!cur||JSON.stringify(cur)===sent)delete P.dirty[id]; // changed again meanwhile? it stays queued
        }
        if(i===0)for(const id of gone){delete libSynced.current[id];delete P.gone[id];}
        libKeep();
      }
      libTries.current=0;
    }catch{
      // not saved to the account yet: keep it queued and try again shortly (and on the next change or reopen)
      if(libTries.current++<5&&!libTimer.current)libTimer.current=setTimeout(pushLibrary,15000);
    }
  };
  useEffect(()=>{
    if(!isLoaded||!user||!ready)return;
    setCloudSynced(false);
    libSynced.current={};
    try{const p=JSON.parse(localStorage.getItem(`dw-lib-pending:${user.id}`)||"null");libPending.current={dirty:p?.dirty||{},gone:p?.gone||{}};}catch{libPending.current={dirty:{},gone:{}};}
    let cancelled=false;
    (async()=>{
      try{
        await pullLibrary();
        if(cancelled)return;
        setCloudSynced(true);
      }catch{} // stay un-synced: never send anything after a failed read
    })();
    const onVisible=()=>{
      if(document.visibilityState!=="visible"||cancelled)return;
      if(libTimer.current)return; // an unsent change is about to go; it reads again next time
      pullLibrary().catch(()=>{});
    };
    document.addEventListener("visibilitychange",onVisible);
    return()=>{cancelled=true;document.removeEventListener("visibilitychange",onVisible);if(libTimer.current){clearTimeout(libTimer.current);libTimer.current=null;}};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isLoaded,user?.id,ready]);

  /* library sync: work out what changed since the account's copy, and send just that */
  useEffect(()=>{
    if(!ready||!user||!cloudSynced)return;
    const P=libPending.current,S=libSynced.current;
    const now=new Set<string>();
    for(const r of saved){
      const id=String(r.id);now.add(id);
      if(S[id]!==JSON.stringify(r)){P.dirty[id]=1;delete P.gone[id];}
    }
    for(const id of Object.keys(S))if(!now.has(id)){P.gone[id]=1;delete P.dirty[id];}
    for(const id of Object.keys(P.dirty))if(!now.has(id))delete P.dirty[id];
    libKeep();
    if(!Object.keys(P.dirty).length&&!Object.keys(P.gone).length)return;
    if(libTimer.current)clearTimeout(libTimer.current);
    libTries.current=0;
    libTimer.current=setTimeout(pushLibrary,600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[saved,ready,user?.id,cloudSynced]);

  /* plan sync — the meal plan lives on the account so every signed-in device sees it.
     First time on a device: merge (account wins on a clash, this device's extra days are kept),
     so an empty device can't wipe the plan. After that the account copy is the source of truth,
     re-read whenever the app comes back to the foreground. */
  const planPayload=(p:any,ps:any,pm:any,l:any)=>{
    const cutoff=dateKey(addDays(startOfToday(),-PLAN_PAST_DAYS));
    const keep=(o:any)=>{const n:any={};for(const k in o||{})if(k>=cutoff)n[k]=o[k];return n;};
    const sides:any={};
    for(const [k,arr] of Object.entries(keep(ps))){
      const done=(arr as any[]).filter(x=>x&&x.status!=="loading");
      if(done.length)sides[k]=done;
    }
    return {plan:keep(p),sides,made:keep(pm),list:l};
  };
  const pullPlan=async(firstTime:boolean)=>{
    const sentBefore=planLastSent.current;
    const res=await fetch("/api/plan");
    if(!res.ok)throw new Error("plan read failed");
    const d=await res.json();
    setHousehold(d.household||null);setPlanMeta(d.meta||null);
    // an edit made on this device while we were asking wins; it's pushed next
    if(!firstTime&&(planPushTimer.current||planInFlight.current||planLastSent.current!==sentBefore||(latestPlanPayload.current&&latestPlanPayload.current!==planLastSent.current)))return;
    if(!d.found){ // nothing on the account yet: this device's plan becomes the account's
      planLastSent.current="";
      return;
    }
    const cp=d.plan||{}, cs=d.sides||{}, cm=d.made||{}, cl=d.list||null;
    if(cl){
      if(firstTime){
        setListExtras(l=>[...(cl.extras||[]),...l.filter(x=>!(cl.extras||[]).some((y:any)=>y.id===x.id))]);
        setListChecked(l=>({...l,...(cl.checked||{})}));setListCleared(l=>({...l,...(cl.cleared||{})}));
      }else{setListExtras(cl.extras||[]);setListChecked(cl.checked||{});setListCleared(cl.cleared||{});}
    }
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
    planLastSent.current=cl&&!firstTime?JSON.stringify(planPayload(cp,cs,cm,listPayload(cl.extras||[],cl.checked||{},cl.cleared||{}))):"";
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
  // Put a merged copy from the account into this device, keeping any side still being written here
  const applyPlanDoc=(d:any)=>{
    const cp=d.plan||{}, cs=d.sides||{}, l=d.list||{};
    setPlan(cp);
    setPlanSides((cur:any)=>{const n:any={...cs};for(const k in cur){const loading=(cur[k]||[]).filter((x:any)=>x?.status==="loading");if(loading.length&&cp[k])n[k]=[...(n[k]||[]),...loading.filter((x:any)=>!(n[k]||[]).some((y:any)=>y.title===x.title))];}return n;});
    setPlanMade(d.made||{});
    setListExtras(Array.isArray(l.extras)?l.extras:[]);setListChecked(l.checked||{});setListCleared(l.cleared||{});
  };
  useEffect(()=>{
    if(!ready||!user||!planCloud)return;
    const next=planPayload(plan,planSides,planMade,listPayload(listExtras,listChecked,listCleared));
    const body=JSON.stringify(next);
    latestPlanPayload.current=body;
    if(body===planLastSent.current)return;
    if(planPushTimer.current)clearTimeout(planPushTimer.current);
    planPushTimer.current=setTimeout(()=>{
      planPushTimer.current=null;
      // send what this device last saw too, so the account applies only what changed here
      const base=planLastSent.current?JSON.parse(planLastSent.current):null;
      planInFlight.current=true;
      fetch("/api/plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({base,next})})
        .then(r=>r.ok?r.json():null).then(d=>{
          if(!d)return;
          setHousehold(d.household||null);setPlanMeta(d.meta||null);
          const merged={plan:d.plan||{},sides:d.sides||{},made:d.made||{},list:d.list||{extras:[],checked:{},cleared:{}}};
          const mergedStr=JSON.stringify(planPayload(merged.plan,merged.sides,merged.made,listPayload(merged.list.extras||[],merged.list.checked||{},merged.list.cleared||{})));
          const now=latestPlanPayload.current;
          planLastSent.current=mergedStr;
          if(now===body){if(mergedStr!==body)applyPlanDoc(merged);}
          else applyPlanDoc(mergeDocs(merged,next,JSON.parse(now)).doc); // edited again while saving: keep those edits on top
        }).catch(()=>{}).finally(()=>{planInFlight.current=false;});
    },700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[plan,planSides,planMade,listExtras,listChecked,listCleared,ready,user?.id,planCloud]);

  /* household: check for the others' changes every few seconds while the plan or list is open */
  useEffect(()=>{
    if(!user||!household||!planCloud||(tab!=="week"&&tab!=="list"))return;
    const id=setInterval(()=>{if(document.visibilityState==="visible")pullPlan(false).catch(()=>{});},5000);
    return()=>clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user?.id,household?.id,planCloud,tab]);
  useEffect(()=>{
    if(!user||!household||!(tab==="library"&&libFilter==="family"))return;
    fetch("/api/household/recipes").then(r=>r.json()).then(d=>setHhRecipes(Array.isArray(d.recipes)?d.recipes:[])).catch(()=>{});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user?.id,household?.id,tab,libFilter]);
  const hhPost=async(payload:any)=>{
    setHhBusy(true);setHhMsg("");
    try{
      const res=await fetch("/api/household",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const d=await res.json();
      if(!res.ok)throw new Error(d.error||"Something went wrong. Try again.");
      if("household" in d)setHousehold(d.household||null);
      return d;
    }catch(e:any){setHhMsg(e.message||"Something went wrong. Try again.");return null;}
    finally{setHhBusy(false);}
  };
  const inviteToHousehold=async()=>{
    if(!user){openSignIn();return;}
    const d=await hhPost({action:"invite"});
    if(!d?.url)return;
    setHhInvite({url:d.url});
    const text=`Join me on Every Chef so we can share a meal plan and grocery list.`;
    try{if(navigator.share){await navigator.share({title:"Plan meals together",text,url:d.url});}}catch{}
  };
  const leaveOrRemove=async(who:string)=>{
    const d=await hhPost(who==="leave"?{action:"leave"}:{action:"remove",userId:who});
    setHhConfirm(null);
    if(d){if(who==="leave"){setShowHousehold(false);setPlanMeta(null);setHhRecipes([]);}pullPlan(false).catch(()=>{});}
  };
  // An invite opened before signing up: join as soon as they're signed in, wherever they landed
  const pendingJoinTried=useRef(false);
  useEffect(()=>{
    if(!ready||!user||!planCloud||pendingJoinTried.current)return;
    let token="";try{token=localStorage.getItem("dw-pending-invite")||"";}catch{}
    if(!token)return;
    pendingJoinTried.current=true;
    (async()=>{
      const d=await hhPost({action:"join",token});
      try{localStorage.removeItem("dw-pending-invite");}catch{}
      if(d?.ok)await pullPlan(false).catch(()=>{});
      setTab("week");setShowHousehold(true); // shows who's in it, or why joining didn't work
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ready,user?.id,planCloud]);
  const hhName=(id?:string,name?:string)=>!id?"":household&&id===household.me?"you":(name||"Someone");
  const ago=(t:number)=>{const m=Math.round((Date.now()-t)/60000);return m<1?"just now":m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} hr ago`:`${Math.round(m/1440)} d ago`;};

  /* Community matches while typing: offer the free, instant recipe before making a new one */
  useEffect(()=>{
    const q=query.trim();
    if(status!=="idle"||homeMode!=="search"||diets.length||seasonal||q.length<3||isRude(q)){setCommunityHits(h=>h.results.length?{q:"",results:[]}:h);return;}
    const t=setTimeout(()=>{
      fetch(`/api/community/search?q=${encodeURIComponent(q)}`).then(r=>r.json()).then(d=>{
        const results=Array.isArray(d?.results)?d.results:[];
        setCommunityHits({q,results});
        if(results.length)fetchPhotos(results.map((r:any)=>r.title));
      }).catch(()=>{});
    },250);
    return()=>clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[query,status,homeMode,diets.length,seasonal]);

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
      // the app moving the page itself (opening a screen, going back) isn't the person scrolling
      if(Date.now()-progScrollAt.current<500||Math.abs(dy)>400){travel=0;return;}
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
  const openDeleteAccount=()=>{setShowAccountSheet(false);setShowAccountDropdown(false);setDeleteStage("confirm");};
  const confirmDeleteAccount=async()=>{
    setDeleteStage("deleting");
    try{
      const res=await fetch("/api/account",{method:"DELETE"});
      if(!res.ok)throw new Error();
      try{Object.keys(localStorage).filter(k=>k.startsWith("dw-")).forEach(k=>localStorage.removeItem(k));}catch{}
      setDeleteStage("closed");
      await signOut();
      window.location.href="/";
    }catch{setDeleteStage("error");}
  };

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







  const leaveFamilyCode=()=>{
    setFamilyCode("");setSharedRecipes([]);
    try{localStorage.removeItem("dw-family-code");}catch{}
  };


  /* detect location */
  const detectLocation=()=>{
    if(!navigator.geolocation){setLocation("Location unavailable");return;}
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(async(pos)=>{
      try{
        const{latitude:lat,longitude:lon}=pos.coords;
        // rounded to about a mile: enough to find the city
        const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&format=json`);
        const d=await r.json();
        const city=d.address?.city||d.address?.town||d.address?.village||"";
        const state=d.address?.state||d.address?.country||"";
        setLocation(city&&state?`${city}, ${state}`:state||city||`${lat.toFixed(1)}, ${lon.toFixed(1)}`);
      }catch{setLocation("Location detected");}
      setDetecting(false);
    },()=>{setDetecting(false);setLocation("Could not detect");});
  };

  /* search */
  const doSearch=async(dish?: string,opts?:{fresh?:boolean})=>{
    const q=(dish||query).trim();if(!q)return;
    setCommunityHits({q:"",results:[]});
    const mySeq=++searchSeq.current;
    if(isRude(q)){setLoadingDish(q);setRecipe(null);setErrorMsg("NOT_A_DISH");setStatus("error");window.scrollTo({top:0});return;}
    setLoadingDish(q);setGenStart(Date.now());setShowScanMenu(false);
    setStatus("loading");setRecipe(null);setServings(null);setErrorMsg("");window.scrollTo({top:0});
    setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);
    try{
      const canCache=diets.length===0&&!seasonal;
      let parsed:any=null;
      let fromCache=false;

      if(canCache){
        const cacheData=opts?.fresh?{found:false}:await fetch(`/api/cache?q=${encodeURIComponent(q)}`)
          .then(r=>r.json()).catch(()=>({found:false}));
        if(cacheData.found&&cacheData.recipe){
          parsed=cacheData.recipe;
          fromCache=true;
        }else{
          parsed=(await makeDish(q,{fresh:opts?.fresh})).recipe;
        }
      }else if(!seasonal){
        // a diet search: the server keeps each diet's version, so a repeat is instant and free
        parsed=(await makeDish(q,{fresh:opts?.fresh,diets})).recipe;
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

  /* ── Nutrition per serving (an estimate, worked out once per version of a recipe) ── */
  // "⅙ of the recipe", and what a smaller piece comes to (people often cut a pan into more pieces)
  const servesOf=(r:any)=>{const n=parseInt(String(r?.servings||""),10);return n>0&&n<=24?n:0;};
  const FRAC:Record<number,string>={2:"½",3:"⅓",4:"¼",5:"⅕",6:"⅙",8:"⅛",10:"1/10",12:"1/12"};
  const fracOf=(n:number)=>FRAC[n]||`1/${n}`;
  const nutriKey=(r:any)=>r?JSON.stringify([String(r.title||"").toLowerCase(),String(r.servings||""),(r.ingredient_groups||[]).flatMap((g:any)=>(g?.items||[]).map((i:any)=>`${i?.amount||""} ${i?.name||""}`.trim()))]):"";
  useEffect(()=>{
    if(status!=="done"||!recipe?.title||!(recipe.ingredient_groups||[]).length)return;
    const k=nutriKey(recipe);
    if(nutri[k])return;
    setNutri(m=>({...m,[k]:"loading"}));
    fetch("/api/nutrition",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recipe:{title:recipe.title,servings:recipe.servings,ingredient_groups:recipe.ingredient_groups}})})
      .then(r=>r.json()).then(d=>setNutri(m=>({...m,[k]:d?.n||"error"}))).catch(()=>setNutri(m=>({...m,[k]:"error"})))
      // a failed estimate is tried again the next time the recipe opens
      .finally(()=>setTimeout(()=>setNutri(m=>m[k]==="error"?(({[k]:_,...rest})=>rest)(m):m),15000));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[status,recipe]);

  /* ── Dish photos ── */
  const photosOn=photosServerOn||photosPreview;
  const dishKey=(t:string)=>(t||"").toLowerCase().trim().replace(/\s+/g," ");
  useEffect(()=>{
    try{
      const q=new URLSearchParams(window.location.search).get("photos");
      if(q==="1")localStorage.setItem("dw-photos","1");
      if(q==="0")localStorage.removeItem("dw-photos");
      setPhotosPreview(localStorage.getItem("dw-photos")==="1");
    }catch{}
  },[]);
  const fetchPhotos=(titles:string[])=>{
    const need=Array.from(new Set(titles.filter(Boolean).map(dishKey))).filter(t=>!photoAsked.current.has(t));
    if(!need.length)return;
    need.forEach(t=>photoAsked.current.add(t));
    for(let i=0;i<need.length;i+=50){
      const qs=need.slice(i,i+50).map(t=>"t="+encodeURIComponent(t)).join("&");
      fetch(`/api/recipe-image?${qs}`).then(r=>r.json()).then(d=>{
        if(d.enabled)setPhotosServerOn(true);
        if(d.preview)setPhotosPreview(true);
        if(d.times&&Object.keys(d.times).length)setDishTimes(p=>({...p,...d.times}));
        if(d.photos&&Object.keys(d.photos).length)setDishPhotos(p=>({...p,...d.photos}));
      }).catch(()=>{});
    }
  };
  // photos preview that follows the signed-in account (set on the admin page)
  useEffect(()=>{
    if(!user?.id)return;
    fetch("/api/recipe-image").then(r=>r.json()).then(d=>{if(d.enabled)setPhotosServerOn(true);if(d.preview)setPhotosPreview(true);}).catch(()=>{});
  },[user?.id]);
  // look up photos for everything currently on screen
  useEffect(()=>{
    const titles=[
      recipe?.title,...pairedSides.map(p=>p.title),...trendingDishes,
      ...saved.map((r:any)=>r.title),...Object.values(plan).map((r:any)=>r?.title),
      ...[recipe,...saved,...Object.values(plan)].filter((r:any)=>r?._ownPhoto).map((r:any)=>photoName(r)),
      ...(tab==="community"?communityRecipes.map((r:any)=>r.title):[]),
      // dinners picked in "Plan my week", Community matches for the fridge, household recipes
      ...(qp?Object.values(qp.picks).map((p:any)=>p?.recipe?.title):[]),
      ...fridgeCommunity.map(m=>m.recipe?.title),
      ...hhRecipes.map((r:any)=>r.title),
    ];
    fetchPhotos(titles as string[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[recipe?.title,pairedSides.length,trendingDishes.length,saved.length,plan,tab,communityRecipes.length,qp?.picks,fridgeCommunity.length,hhRecipes.length]);
  // make a photo for a recipe that doesn't have one yet (only when switched on for everyone)
  const ensureDishPhoto=(r:any)=>{
    if(!r?.title||!photosServerOn||!user)return;
    const name=photoName(r),k=dishKey(name);
    if(dishPhotos[k]||photoMaking.current.has(k))return;
    photoMaking.current.add(k);
    fetch("/api/recipe-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recipe:r,key:name})})
      .then(x=>x.json()).then(d=>{if(d.url)setDishPhotos(p=>({...p,[k]:d.url}));}).catch(()=>{});
  };
  // only for recipes someone keeps: saved, planned or cooked. A search they glance at and leave costs nothing.
  const keeps=(r:any)=>!!r&&(isSaved(r)||Object.values(plan).some((p:any)=>p&&(r.id!=null?p.id===r.id:p.title===r.title)));
  useEffect(()=>{
    if(status!=="done"||!recipe)return;
    if(keeps(recipe))ensureDishPhoto(recipe);
    pairedSides.forEach(p=>p.recipe&&keeps(p.recipe)&&ensureDishPhoto(p.recipe));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[status,recipe?.title,recipe?._ownPhoto,pairedSides.length,photosServerOn,dishPhotos,saved.length,plan]);
  // older recipes get their realistic re-estimated times; new ones already carry total_time
  const withTimes=(r:any)=>{if(!r||r.total_time||isOwnRecipe(r))return r;const f=dishTimes[dishKey(r.title)];return f?{...r,...f}:r;};
  const tt=(r:any)=>totalShort(withTimes(r));
  const photoFor=(x:any,userPhoto?:string|null)=>userPhoto||(typeof x==="string"?dishPhotos[dishKey(x)]:(dishPhotos[dishKey(photoName(x))]||dishPhotos[dishKey(x?.title||"")]))||null;

  /* ── Back navigation ──
     Every screen you move to becomes a browser-history step, so Safari's edge swipe,
     Android's back button and (in the home-screen app) our own left-edge swipe all go
     back to the last place you were (iOS gives home-screen web apps the same native
     edge swipe once screens are history steps). The "writing your recipe" screen is a step too,
     but it's replaced by the recipe once it's ready, and skipped when going forward. */
  const navStack=useRef<any[]>([]);
  const navIdx=useRef(0);
  const navLive=useRef<any>({});
  navLive.current={status,returnDayKey,pairedSides,cookRecipe};
  const screenKey=status==="loading"?"gen"
    :tab==="search"&&(status==="done"||status==="error")?(status==="error"?"err":"r:"+(recipe?.id??recipe?.title??""))
    :`${tab}|${tab==="search"?homeMode:""}`;
  useEffect(()=>{
    if(!ready||typeof window==="undefined")return;
    const snap={key:screenKey,gen:screenKey==="gen",tab,homeMode,recipe:status==="done"?recipe:null,returnTab,returnDayKey,pairedSides,activePane,scrollY:0};
    const st=navStack.current;
    const cur=st[navIdx.current];
    if(!cur){navStack.current=[snap];navIdx.current=0;try{window.history.replaceState({ecNav:0},"");}catch{}return;}
    if(cur.key===screenKey){st[navIdx.current]={...snap,scrollY:cur.scrollY};return;}   // same screen: just refresh it
    if(cur.gen&&!snap.gen){st[navIdx.current]=snap;try{window.history.replaceState({ecNav:navIdx.current},"");}catch{}return;} // recipe replaces its loading screen
    navStack.current=st.slice(0,navIdx.current+1);
    navStack.current.push(snap);
    navIdx.current=navStack.current.length-1;
    try{window.history.pushState({ecNav:navIdx.current},"");}catch{}
    progScrollAt.current=Date.now();setNavHidden(false);
    window.scrollTo(0,0);   // a new screen always opens at the top
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[screenKey,ready,pairedSides,activePane]);
  // remember where each screen was scrolled to
  useEffect(()=>{
    let raf=0;
    const onScroll=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const c=navStack.current[navIdx.current];if(c)c.scrollY=window.scrollY;});};
    window.addEventListener("scroll",onScroll,{passive:true});
    return()=>{window.removeEventListener("scroll",onScroll);cancelAnimationFrame(raf);};
  },[]);
  useEffect(()=>{
    const onPop=(e:PopStateEvent)=>{
      const i=e.state?.ecNav;
      if(typeof i!=="number")return;
      const snap=navStack.current[i];
      if(!snap)return;
      const goingBack=i<navIdx.current;
      if(snap.gen){navIdx.current=i;goingBack?window.history.back():window.history.forward();return;}
      const live=navLive.current;
      if(live.cookRecipe)setCookRecipe(null);
      if(live.status==="loading")searchSeq.current++;
      if(live.status==="done"&&live.returnDayKey){const k=live.returnDayKey,ps=live.pairedSides;setPlanSides((p:any)=>({...p,[k]:ps}));}
      navIdx.current=i;
      setShowShare(false);setShowRecipeMenu(false);setShowAddSide(false);setShowEditPanel(false);setAssignDay(null);setPlanPick(null);
      setTab(snap.tab);setHomeMode(snap.homeMode);
      setReturnTab(snap.returnTab);setReturnDayKey(snap.returnDayKey);
      setPairedSides(snap.pairedSides||[]);setActivePane(snap.activePane||0);
      if(snap.recipe){setRecipe(snap.recipe);setStatus("done");}else{setRecipe(null);setStatus("idle");setQuery("");}
      const y=snap.scrollY||0;
      progScrollAt.current=Date.now();setNavHidden(false);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{progScrollAt.current=Date.now();window.scrollTo(0,y);}));
    };
    window.addEventListener("popstate",onPop);
    return()=>window.removeEventListener("popstate",onPop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

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
        parsed=(await makeDish(sideTitle)).recipe;
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
          parsed=(await makeDish(title)).recipe;
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

  // your edit of a Community / Every Chef recipe: where it came from (older edits fall back to the original search)
  const originOf=(r:any):{q:string;title?:string;off?:boolean}|null=>{
    if(!r?._edited||r._scanned||r._imported||r._author||r._adapt)return null;
    const o=r._origin||(r._dish?{q:r._dish,title:""}:null);
    return o&&!o.off?o:null;
  };
  const openLibraryOriginal=async(o:{q:string;title?:string})=>{
    try{
      const res=await fetch(`/api/cache?q=${encodeURIComponent(o.title||o.q)}`);let d=await res.json();
      if(!d?.found&&o.title){const r2=await fetch(`/api/cache?q=${encodeURIComponent(o.q)}`);d=await r2.json();}
      if(!d?.found||!d.recipe){alert("The original isn't in the Community anymore.");return;}
      const r={...d.recipe,id:Date.now(),_dish:o.q,_ts:Date.now(),_fromCache:true};
      setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);
      setRecipe(r);setServings(null);setStatus("done");setTab("search");window.scrollTo({top:0});
    }catch{}
  };
  // "Adapted from … by Billy": opens the original, in its latest version
  const openOriginal=async(a:{slug:string})=>{
    try{
      const res=await fetch(`/api/share?slug=${encodeURIComponent(a.slug)}`);
      const data=await res.json().catch(()=>({found:false}));
      if(!data?.found||!data.recipe){alert("The original isn't shared anymore.");return;}
      const r={...data.recipe,id:Date.now(),_dish:data.recipe.title||a.slug,_ts:Date.now(),_fromCache:true,_shareFrom:a.slug,_adapt:{slug:a.slug,title:data.recipe.title||"",by:data.recipe._byName||""}};
      setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);
      setRecipe(r);setServings(null);setStatus("done");setTab("search");window.scrollTo({top:0});
    }catch{}
  };

  /* share — works for the main dish or a paired side. One recipe keeps one link; edits update it. */
  const pushShare=async(r:any)=>{
    const {_fromCache,_ts,id,_shareSlug,_shareToken,...shareable}=r as any; // _scanned/_shareOK go along so the server can check them
    const res=await fetch("/api/share",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recipe:shareable,slug:_shareSlug,token:_shareToken,showName:(()=>{try{return localStorage.getItem("dw-share-name")!=="0";}catch{return true;}})()})});
    return await res.json();
  };
  const shareRecipe=async(r:any,opts?:{confirmedOwn?:boolean})=>{
    // making a public link needs an account (imported recipes just pass along the original link)
    if(!user&&!r?._imported){openSignIn();return;}
    setShareTarget(r);setShowShare(true);setShareUrl(null);
    // Recipes imported from a link are someone else's published work: share their original link instead.
    if(r?._imported){setShareMode(r._sourceUrl?"original":"private");setShareUrl(r._sourceUrl||null);setShareLoading(false);return;}
    // Scans could be Grandma's card or a cookbook page: ask once before making a public link.
    if(r?._scanned&&!r._shareOK&&!opts?.confirmedOwn){setShareMode("ask");setShareLoading(false);return;}
    if(r?._scanned&&opts?.confirmedOwn){
      const tag=(x:any)=>x&&r.id!=null&&x.id===r.id?{...x,_shareOK:true}:x;
      r={...r,_shareOK:true};setShareTarget(r);
      setRecipe((x:any)=>tag(x));setSaved((l:any[])=>l.map(tag));
      setPlan((p:any)=>{let ch=false;const m={...p};for(const k in m){if(m[k]?.id===r.id){m[k]=tag(m[k]);ch=true;}}return ch?m:p;});
    }
    setShareMode("link");setShareLoading(true);
    try{
      const data=await pushShare(r);
      if(!data.url){setShareMode("private");return;}
      setShareUrl(data.url);
      // remember this recipe's link so re-sharing and later edits reuse it
      if(data.shareId&&data.token&&r.id!=null&&(r._shareSlug!==data.shareId||r._shareToken!==data.token)){
        const tag=(x:any)=>x&&x.id===r.id?{...x,_shareSlug:data.shareId,_shareToken:data.token}:x;
        setRecipe((x:any)=>tag(x));setSaved((l:any[])=>l.map(tag));
        setPlan((p:any)=>{let ch=false;const m={...p};for(const k in m){if(m[k]?.id===r.id){m[k]=tag(m[k]);ch=true;}}return ch?m:p;});
        setPairedSides(p=>p.map(s=>s.recipe&&s.recipe.id===r.id?{...s,recipe:tag(s.recipe)}:s));
      }
    }catch{
      const slug=(r.title||"recipe").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
      setShareUrl(`https://everychef.app/r/${slug}`);
    }finally{setShareLoading(false);}
  };

  /* cooking mode */
  const openCookMode=(r:any)=>{
    ensureDishPhoto(r); // cooking it counts as keeping it
    setCookRecipe(r);setCookStep(0);setCookTimers({});setShowRecipeMenu(false);if(readAloud){unlockAudio();say(stepSpeech(r,0));ttsUrl(stepSpeech(r,1));}
    // older recipes: ask once which ingredients go in at each step, then keep the answer with the recipe
    const steps=r?.steps||[];
    const valid=Array.isArray(r?.step_ingredients)&&r.step_ingredients.length===steps.length;
    if(!valid&&steps.length)tagStepIngredients(r).then(m=>{
      if(!m)return;
      const tag=(x:any)=>x&&(x===r||(r.id!=null&&x.id===r.id))?{...x,step_ingredients:m}:x;
      setCookRecipe((c:any)=>tag(c));setRecipe((x:any)=>tag(x));setSaved((l:any[])=>l.map(tag));
      setPlan((p:any)=>{let ch=false;const n={...p};for(const k in n){if(r.id!=null&&n[k]?.id===r.id){n[k]=tag(n[k]);ch=true;}}return ch?n:p;});
    });
  };
  const closeCookMode=()=>{setCookRecipe(null);setCookTimers({});};
  const finishCookMode=()=>{
    if(returnDayKey&&(cookRecipe===recipe||(cookRecipe?.id!=null&&cookRecipe.id===recipe?.id))&&returnDayKey<=dateKey(startOfToday()))
      setPlanMade(p=>({...p,[returnDayKey]:true}));
    closeCookMode();
  };
  const startCookTimer=(key:string,secs:number)=>{
    // Create/resume audio on this tap so the chime is allowed to play later (iOS needs a user gesture).
    try{
      if(!audioCtxRef.current){
        const AC=(window as any).AudioContext||(window as any).webkitAudioContext;
        if(AC)audioCtxRef.current=new AC();
      }
      audioCtxRef.current?.resume?.();
    }catch{}
    setCookTimers(t=>({...t,[key]:{end:Date.now()+secs*1000,dur:secs}}));
  };
  const clearCookTimer=(key:string)=>setCookTimers(t=>{const n={...t};delete n[key];return n;});

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
        parsed=(await makeDish(sideTitle)).recipe;
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
          parsed=(await makeDish(title)).recipe;
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
    // "Show four more" passes the current ideas so the next batch is different
    const exclude=inspireStatus==="done"?inspireSuggestions.map((x:any)=>x.title).filter(Boolean):[];
    setInspireStatus("loading");setInspireSuggestions([]);inspireStart.current=Date.now();window.scrollTo({top:0});
    try{
      const parsed=await callAPI([{role:"user",content:buildInspirePrompt(inspireTime,inspireVibe,inspireServes,diets,exclude)}]);
      setInspireSuggestions(parsed.suggestions||[]);setInspireStatus("done");
    }catch(e:any){setInspireStatus("error");}
  };

  /* cook with what you have */
  const fridgeOn=fridgeItems.filter(x=>x.on).map(x=>x.name);
  const addFridgeItems=(names:string[],on=true,unsure=false)=>{
    setFridgeItems(list=>{
      const out=[...list];
      for(const raw of names){
        const name=String(raw||"").trim().replace(/\s+/g," ").slice(0,60);
        if(!name||isRude(name))continue;
        const i=out.findIndex(x=>x.name.toLowerCase()===name.toLowerCase());
        if(i>=0){if(on)out[i]={...out[i],on:true,unsure:false};}
        else out.push({name,on,unsure});
      }
      return out.slice(0,30);
    });
  };
  const addFridgeText=()=>{
    const parts=fridgeText.split(/[,\n;]+/).map(x=>x.trim()).filter(Boolean);
    if(parts.length)addFridgeItems(parts);
    setFridgeText("");
  };
  const onFridgePhoto=async(e:any)=>{
    const file:File|undefined=e.target.files?.[0];
    if(fridgeFileRef.current)fridgeFileRef.current.value="";
    if(!file)return;
    const url=await downscaleImage(file);
    if(!url){setFridgeSpot({status:"error",msg:"We couldn't read that photo. Try another one, under 15MB."});return;}
    setFridgePhoto(url);setFridgeSpot({status:"spotting"});
    try{
      const parsed=await callAPI([{role:"user",content:[
        {type:"image",source:{type:"base64",media_type:"image/jpeg",data:url.split(",")[1]}},
        {type:"text",text:FRIDGE_SPOT_PROMPT},
      ]}]);
      const found=(Array.isArray(parsed.items)?parsed.items:[]).filter((x:any)=>x&&x.name);
      if(!found.length){setFridgeSpot({status:"error",msg:"We couldn't spot any food in that photo. Try one with the shelves in view, or type what you have."});return;}
      addFridgeItems(found.filter((x:any)=>x.sure!==false).map((x:any)=>x.name));
      addFridgeItems(found.filter((x:any)=>x.sure===false).map((x:any)=>x.name),false,true);
      setFridgeSpot({status:"idle"});
    }catch{setFridgeSpot({status:"error",msg:"We couldn't look at that photo just now. Try again, or type what you have."});}
  };
  const doFridge=async(more=false)=>{
    const items=fridgeOn;if(!items.length)return;
    const exclude=more?[...inspireSuggestions.map((x:any)=>x.title),...fridgeCommunity.map(x=>x.recipe.title)].filter(Boolean):[];
    setInspireStatus("loading");setInspireSuggestions([]);if(!more)setFridgeCommunity([]);
    inspireStart.current=Date.now();window.scrollTo({top:0});
    const maxMinutes=FRIDGE_TIMES.find(t=>t[0]===fridgeTime)?.[1]||0;
    const community=more?Promise.resolve(fridgeCommunity):fetch("/api/pantry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items,maxMinutes})})
      .then(r=>r.json()).then(d=>Array.isArray(d.results)?d.results:[]).catch(()=>[]);
    const ideas=callAPI([{role:"user",content:buildFridgePrompt(items,fridgeTime,diets,exclude)}]).then(p=>p.suggestions||[]).catch(()=>null);
    const [found,fresh]=await Promise.all([community,ideas]);
    const taken=new Set(found.map((x:any)=>normTitle(x.recipe.title)));
    const lower=items.map(i=>i.toLowerCase());
    const ai=(fresh||[]).filter((sg:any)=>sg?.title&&!taken.has(normTitle(sg.title))).map((sg:any)=>({...sg,
      uses:(Array.isArray(sg.uses)?sg.uses:[]).filter((u:any)=>lower.includes(String(u).toLowerCase())),
      need:(Array.isArray(sg.need)?sg.need:[]).map(String).slice(0,5)}));
    setFridgeCommunity(found);setInspireSuggestions(ai);
    setInspireStatus(!fresh&&!found.length?"error":"done");
  };
  const openFridgeCommunity=(m:{recipe:any;uses:string[]})=>{
    const full={...m.recipe,id:Date.now(),_dish:m.recipe.title,_ts:Date.now(),_fromCache:true};
    setFridgeHave({id:full.id,items:fridgeOn});
    setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);setRecipe(full);setServings(null);setStatus("done");setTab("search");
    setHistory(h=>[full,...h.filter((x:any)=>!sameRecipe(x,full))].slice(0,30));
    window.scrollTo({top:0});
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

  const pickInspiredRecipe=async(suggestion: any, have?: string[])=>{
    setTab("search");setQuery(suggestion.title);
    const mySeq=++searchSeq.current;
    setLoadingDish(suggestion.title);setGenStart(Date.now());window.scrollTo({top:0});
    setStatus("loading");setRecipe(null);setServings(null);setErrorMsg("");
    setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);
    try{
      const extra=have?.length?` The cook already has ${(suggestion.uses?.length?suggestion.uses:have).join(", ")}, plus ${STAPLES_NOTE}. Build the recipe around those, and keep anything else they'd need to buy to ${suggestion.need?.length?suggestion.need.join(", "):"as little as possible"}.`:"";
      const parsed=await callAPI([{role:"user",content:buildPrompt(suggestion.title,diets,seasonal,location)+extra}]);
      if(mySeq!==searchSeq.current)return;
      const r={...parsed,id:Date.now(),_dish:suggestion.title,_ts:Date.now()};
      if(have?.length)setFridgeHave({id:r.id,items:have});
      setRecipe(r);setStatus("done");
      setHistory(h=>[r,...h.filter((x:any)=>x.id!==r.id)].slice(0,30));
    }catch(e:any){if(mySeq!==searchSeq.current)return;setErrorMsg(e.message||String(e));setStatus("error");}
  };

  /* scan */
  const MAX_SCAN=4;
  const onFileChange=(e: React.ChangeEvent<HTMLInputElement>)=>{
    const files=Array.from(e.target.files||[]);if(!files.length)return;
    if(fileRef.current)fileRef.current.value="";   // so the same file can be picked again
    setScanStatus("idle");setScanMsg("");
    const room=MAX_SCAN-scanImages.length;
    if(room<=0){setScanStatus("error");setScanMsg(`Up to ${MAX_SCAN} images per recipe.`);return;}
    if(files.length>room){setScanStatus("error");setScanMsg(`Up to ${MAX_SCAN} images per recipe, so we kept the first ${room}.`);}
    // read them all, then add in the order they were picked (screenshot order matters)
    const readOne=(file:File)=>new Promise<string|null>(res=>{
      if(file.size>15*1024*1024){setScanStatus("error");setScanMsg("One image was too large. Please use photos under 15MB.");return res(null);}
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
        if(!ctx)return res(null);
        ctx.drawImage(img,0,0,w,h);
        res(canvas.toDataURL("image/jpeg",0.82));
      };
      img.onerror=()=>{URL.revokeObjectURL(objectUrl);setScanStatus("error");setScanMsg("Could not read one of the images. Try a screenshot or a different photo.");res(null);};
      img.src=objectUrl;
    });
    Promise.all(files.slice(0,room).map(readOne)).then(urls=>{
      const ok=urls.filter(Boolean) as string[];
      if(!ok.length)return;
      setScanImages(l=>[...l,...ok].slice(0,MAX_SCAN));
      setTimeout(()=>document.querySelector(".scan-actions")?.scrollIntoView({behavior:"smooth",block:"center"}),80);
    });
  };
  const doScan=async()=>{
    if(!scanImages.length)return;setScanStatus("scanning");setScanMsg("");
    try{
      const many=scanImages.length>1;
      const parsed=await callAPI([{role:"user",content:[
        ...scanImages.map(u=>({type:"image",source:{type:"base64",media_type:"image/jpeg",data:u.split(",")[1]}})),
        {type:"text",text:(many?`These ${scanImages.length} images are parts of ONE recipe (for example screenshots of a long page, in order). Combine them into a single recipe, and don't repeat ingredients or steps that show up on more than one image.\n`:"")+buildScanPrompt()},
      ]}]);
      const r={...parsed,id:Date.now(),_dish:parsed.title||"Scanned Recipe",_scanned:true};
      setSaved(l=>[r,...l]);setJustAdded(r);setScanStatus("done");setScanMsg(`"${r.title}" saved!`);
      setScanImages([]);
    }catch(e:any){setScanStatus("error");setScanMsg(/NOT_A_DISH/.test(e?.message||"")?"We couldn't find a recipe in that. Try a clearer photo or screenshot.":(e.message||String(e)));}
  };
  const clearScan=()=>{setScanImages([]);setScanStatus("idle");setScanMsg("");if(fileRef.current)fileRef.current.value="";};

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
          const r={...data.recipe,id:Date.now(),_dish:data.recipe.title||slug,_ts:Date.now(),_fromCache:true,_shareFrom:slug,_adapt:{slug,title:data.recipe.title||"",by:data.recipe._byName||""}};
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
      // the QR reader is only downloaded when someone opens the scanner
      const [stream,jsQR]=await Promise.all([navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}),import("jsqr").then(m=>m.default)]);
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
      // a remix keeps the original's photo unless it would look different (checked just below)
      const parent=recipe;
      const r:any={...parsed,id:Date.now(),_dish:q,_ts:Date.now(),_ownPhoto:photoName(parent),...(parent._adapt?{_adapt:parent._adapt,_adapted:true}:{})};
      editChangesLook(parent,r).then(looksNew=>{
        if(!looksNew)return;
        const untag=(x:any)=>{if(!x||x.id!==r.id)return x;const {_ownPhoto,...rest}=x;return rest;};
        setRecipe((x:any)=>untag(x));setSaved((l:any[])=>l.map(untag));setHistory((h:any[])=>h.map(untag));
      });
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
  const toggleSave=(r: any)=>{
    if(!r)return;
    if(isSaved(r)){setSaved(l=>l.filter((s:any)=>s.id!==r.id));return;}
    const t=(r.title||"").toLowerCase().trim();
    if(t&&saved.some((s:any)=>s.id!==r.id&&(s.title||"").toLowerCase().trim()===t)){setNameClash({id:r.id,title:r.title});setTimeout(()=>setNameClash(c=>c&&c.id===r.id?null:c),7000);}
    setSaved(l=>[r,...l]);
  };
  const baseS=recipe?(parseInt(recipe.servings)||4):4;
  const curS=servings||baseS;
  const ratio=curS/baseS;
  const next7Keys=Array.from({length:7},(_,i)=>dateKey(addDays(startOfToday(),i)));
  const mealsPlanned=next7Keys.filter(k=>plan[k]).length;

  /* ── grocery list ── */
  type ListEntry={name:string;amount:string;recipe:string;src:string;extraId?:string};
  type ListItem={id:string;plannedId:string;key:string;name:string;amount:string;note:string;aisle:string;checked:boolean;extraIds:string[]};
  const buildList=(range:"this"|"next"|"extras")=>{
    const start=range==="next"?7:0;
    const keys=range==="extras"?[]:Array.from({length:7},(_,i)=>dateKey(addDays(startOfToday(),start+i)));
    const entries:ListEntry[]=[];
    let meals=0;
    for(const k of keys){
      const dishes=[plan[k],...(planSides[k]||[]).filter(x=>x?.status==="done"&&x.recipe).map(x=>x.recipe)].filter(Boolean);
      if(plan[k])meals++;
      for(const r of dishes)for(const g of recipeGroceries(r))entries.push({name:g.name,amount:g.amount,recipe:r.title,src:`${k}:${r.title}`});
    }
    for(const x of listExtras){
      const by=household&&planMeta?.extrasBy?.[x.id];
      const who=by?`Added by ${hhName(by.id,by.name)}`:"";
      entries.push({name:x.name,amount:x.amount||"",recipe:x.recipe?(who&&household!.members.length>1?`${x.recipe} (${who.replace("Added by ","")})`:x.recipe):(household&&household.members.length>1&&who?who:""),src:`x:${x.id}`,extraId:x.id});
    }
    const groups:Record<string,ListEntry[]>={};
    for(const e of entries){const k=groceryKey(e.name);if(!k)continue;(groups[k]=groups[k]||[]).push(e);}
    const items:ListItem[]=[];const staples:string[]=[];
    for(const key of Object.keys(groups)){
      const es=groups[key];
      // pantry staples stay off the list unless you added them yourself
      if(!es.some(e=>e.extraId)&&es.every(e=>isStaple(e.name))){staples.push(displayName(es[0].name).toLowerCase());continue;}
      const id=key+"@"+es.map(e=>e.src).sort().join("|");
      const planned=es.filter(e=>!e.extraId);
      const plannedId=planned.length?key+"@"+planned.map(e=>e.src).sort().join("|"):"";
      if(listCleared[id]||(plannedId&&listCleared[plannedId]))continue;
      const byRecipe:Record<string,string[]>={};
      for(const e of es){const r=e.recipe||"Added by you";byRecipe[r]=byRecipe[r]||[];if(e.amount)byRecipe[r].push(e.amount);}
      const recipes=Object.keys(byRecipe);
      const amounts=es.map(e=>e.amount).filter(Boolean);
      // something you added by name ("olive oil") means a whole one, so don't show a recipe's 1 tbsp
      const amount=es.some(e=>e.extraId&&!e.amount)?"":totalAmount(amounts);
      const note=recipes.length>1&&amounts.length>1?recipes.map(r=>byRecipe[r].length?`${r} ${totalAmount(byRecipe[r])}`:r).join(" · "):recipes.join(" · ");
      items.push({id,plannedId,key,name:displayName(es[0].name),amount,note,aisle:aisleOf(es[0].name),checked:!!listChecked[id],extraIds:es.map(e=>e.extraId).filter(Boolean) as string[]});
    }
    items.sort((a,b)=>a.name.localeCompare(b.name));
    return {items,staples:staples.filter((x,i)=>staples.indexOf(x)===i).sort(),meals};
  };
  const listThisWeek=buildList("this");
  const listLeft=listThisWeek.items.filter(x=>!x.checked).length;
  const addListExtras=(xs:{name:string;amount?:string;recipe?:string}[])=>{
    const now=Date.now();
    setListExtras(l=>[...l,...xs.filter(x=>x.name.trim()&&!isRude(x.name)).map((x,i)=>({id:`${now.toString(36)}${i}${Math.random().toString(36).slice(2,6)}`,name:x.name.trim().slice(0,80),amount:x.amount||"",recipe:x.recipe||"",at:now}))]);
  };
  const toggleListItem=(it:ListItem)=>setListChecked(c=>{const n={...c};if(n[it.id])delete n[it.id];else n[it.id]=Date.now();return n;});
  const clearChecked=(items:ListItem[])=>{
    const done=items.filter(x=>x.checked);
    const xids=new Set(done.flatMap(x=>x.extraIds));
    setListExtras(l=>l.filter(x=>!xids.has(x.id)));
    setListCleared(c=>{const n={...c};for(const x of done)if(x.plannedId)n[x.plannedId]=Date.now();return n;});
    setListChecked(c=>{const n={...c};for(const x of done)delete n[x.id];return n;});
  };
  const openAddSheet=(r:any)=>{
    const have=fridgeHave&&fridgeHave.id===r.id?fridgeHave.items:[];
    const gs=recipeGroceries(r);
    const todayK=dateKey(startOfToday()),endK=dateKey(addDays(startOfToday(),6));
    const plannedK=Object.keys(plan).find(k=>k>=todayK&&k<=endK&&sameRecipe(plan[k],r))||null;
    setAddSheet({recipe:r,
      items:gs.filter(g=>!isStaple(g.name)).map(g=>({...g,on:!have.some(h=>ingredientUses(g.name,h))})),
      staples:gs.filter(g=>isStaple(g.name)).map(g=>g.name),
      plannedOn:plannedK});
  };
  useEffect(()=>{if(!listToast)return;const t=setTimeout(()=>setListToast(""),3200);return()=>clearTimeout(t);},[listToast]);

  /* ── SEARCH VIEW ── */
  function SearchView(){
    return(
      <>
        {status==="error"&&(()=>{
          const notDish=/NOT_A_DISH/.test(errorMsg);
          const limited=/RATE_LIMIT/.test(errorMsg);
          const busy=!limited&&/credit balance|billing|insufficient|overloaded|HTTP 429|HTTP 529/i.test(errorMsg);
          const slow=/timed? ?out|timeout|504/i.test(errorMsg);
          return(
            <div className="gen-page">
              <div className="rx-topbar">
                <button className="rx-back" onClick={()=>{setStatus("idle");window.scrollTo({top:0});}}>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg>
                  Cook
                </button>
              </div>
              <div className="gen-body">
                {loadingDish&&!notDish&&<h1 className="rx-title">{loadingDish}</h1>}
                <div className="ui-notice" role="alert" style={{marginTop:8,maxWidth:560}}>
                  <div className="ui-notice-title">{notDish?"That's not something we can cook":limited?"You're cooking fast":busy?"New recipes are paused for now":slow?"That took too long":"We couldn't make that recipe"}</div>
                  <div className="ui-notice-text">
                    {notDish?"Try the name of a dish, like \u201cchicken tikka masala\u201d or \u201clemon bars.\u201d"
                      :limited?"You've made a lot of new recipes in a short time. Give it a few minutes, then try again. Saved and Community recipes still open as usual."
                      :busy?"We can't write brand-new recipes right now. Your saved recipes and Community recipes still open as usual. Please check back soon."
                      :slow?"Writing this one took longer than usual. Trying again usually works."
                      :"Something went wrong on our end. Trying again usually works."}
                  </div>
                  <div className="ui-actions">
                    {!busy&&!notDish&&<button className="ui-btn-primary" onClick={()=>doSearch()}>Try again</button>}
                    <button className="ui-btn-secondary" style={{marginTop:0}} onClick={()=>{setStatus("idle");setHomeMode("search");window.scrollTo({top:0});setTimeout(()=>inputRef.current?.focus(),50);}}>Search for something else</button>
                  </div>
                  {errorMsg&&!busy&&!notDish&&!limited&&(
                    <details className="ui-details">
                      <summary>Details for support</summary>
                      <code>{errorMsg}</code>
                    </details>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        {status==="loading"&&GeneratingView()}
        {status!=="done"&&status!=="loading"&&status!=="error"&&(
          <div className="ck-page">
          {homeMode==="search"&&(
            <>
              <h1 className="sr-only">What are we cooking tonight?</h1>

              <div className="ck-search">
                <span className="ck-search-icon" aria-hidden="true">{Ic.search(20)}</span>
                <input ref={inputRef} className="ck-search-input" placeholder="What do you want to cook?" aria-label="Search any dish"
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

              {(()=>{
                const q=normTitle(query);
                if(q.length<3||isRude(query))return null;
                // your own recipes first: they're on this phone, so they show instantly
                const mine=saved.map((r:any)=>({r,sc:titleScore(r.title,q)})).filter(x=>x.sc>0).sort((a,b)=>b.sc-a.sc).slice(0,3).map(x=>x.r);
                const mineTitles=new Set(mine.map((r:any)=>normTitle(r.title)));
                const comm=communityHits.q===query.trim()?communityHits.results.filter(h=>!mineTitles.has(normTitle(h.title))):[];
                if(!mine.length&&!comm.length)return null;
                return(
                  <div className="ck-hits" role="region" aria-label="Matching recipes">
                    {mine.length>0&&<div className="ck-hits-label">In your Library</div>}
                    {mine.map((r:any)=>(
                      <button key={"m"+r.id} className="ck-hit" onClick={()=>{setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);setRecipe(r);setServings(null);setStatus("done");setTab("search");setCommunityHits({q:"",results:[]});window.scrollTo({top:0});}}>
                        <DishPic title={r.title} src={photosOn?photoFor(r,recipePhotos[r.id]):null} className="ck-hit-pic"/>
                        <span className="ck-hit-text"><strong>{r.title}</strong><span>{[tt(r),r._scanned?"Scanned":r._imported?"Imported":"Saved"].filter(Boolean).join(" · ")}</span></span>
                      </button>
                    ))}
                    {comm.length>0&&<div className={`ck-hits-label${mine.length?" ck-hits-sep":""}`}>Already in the Community</div>}
                    {comm.map(h=>(
                      <button key={h.title} className="ck-hit" onClick={()=>{setQuery(h.title);doSearch(h.key||h.title);}}>
                        <DishPic title={h.title} src={photosOn?photoFor(h.title):null} className="ck-hit-pic"/>
                        <span className="ck-hit-text"><strong>{h.title}</strong><span>{h.total?`${h.total} · `:""}opens instantly</span></span>
                        <span className="ck-hit-free">Free</span>
                      </button>
                    ))}
                    <button className="ck-hit ck-hit-new" onClick={()=>doSearch(query,{fresh:true})}>
                      <span className="ck-hit-plus" aria-hidden="true">+</span>
                      <span className="ck-hit-text"><strong>Make a new version</strong><span>Written fresh for you, about 30 seconds</span></span>
                    </button>
                  </div>
                );
              })()}

              <div className="ck-filters">
                <button className={`ck-chip ck-filter${diets.length?" on-dark":""}`} aria-haspopup="dialog" onClick={()=>setShowDietSheet(true)}>
                  <span className="ck-filter-text">{diets.length===0?"Diet: Any":diets.length<=2?diets.join(" + "):`${diets.length} diets`}</span>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <button aria-pressed={seasonal} className={`ck-chip ck-filter ck-chip-season${seasonal?" on":""}`} onClick={()=>setSeasonal(v=>!v)}>
                  <span style={{display:"flex"}}>{Ic.leaf(13)}</span> In season
                </button>
              </div>
              {seasonal&&(
                <div className="ck-location">
                  <input className="ck-location-input" placeholder="Your city, for what's in season" aria-label="Your city" value={location} onChange={e=>setLocation(e.target.value)}/>
                  <button className="ck-location-btn" onClick={detectLocation} disabled={detecting}>{detecting?"Finding…":<>{Ic.pin(14)} Use my location</>}</button>
                </div>
              )}

              {(()=>{
                // the navy card holds the thing to do next: tonight's planned dinner, or ideas when nothing is planned
                const tk=dateKey(startOfToday());
                const tonight=plan[tk]&&!planMade[tk]?plan[tk]:null;
                if(!tonight)return(
                  <button className="ck-inspire" onClick={()=>{setHomeMode("inspire");window.scrollTo({top:0});}}>
                    <span className="ck-inspire-text">
                      <span className="ck-inspire-title">Not sure what to make?</span>
                      <span className="ck-inspire-sub">Snap your fridge or type what you have. We'll find dishes.</span>
                    </span>
                    <span className="ck-inspire-cta">Inspire me</span>
                  </button>
                );
                const open=()=>{setReturnTab(null);setReturnDayKey(tk);setPairedSides(planSides[tk]||[]);setActivePane(0);setRecipe(tonight);setServings(null);setStatus("done");setTab("search");window.scrollTo({top:0});};
                const sv=servesOf(tonight);
                return(
                  <>
                    <div className="ck-tonight">
                      <button className="ck-tonight-open" onClick={open}>
                        {photosOn&&<DishPic title={tonight.title} src={photoFor(tonight)} className="ck-tonight-pic"/>}
                        <span className="ck-tonight-txt">
                          <span className="ck-tonight-label">Tonight</span>
                          <span className="ck-tonight-title">{tonight.title}</span>
                          <span className="ck-tonight-meta">{[tt(tonight),sv?`serves ${sv}`:""].filter(Boolean).join(" · ")}</span>
                        </span>
                      </button>
                      <button className="ck-tonight-cta" onClick={()=>{open();openCookMode(tonight);}}>Cook</button>
                    </div>
                    <button className="ck-idea" onClick={()=>{setHomeMode("inspire");window.scrollTo({top:0});}}>
                      <span className="ck-idea-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg></span>
                      <span className="ck-idea-txt"><strong>Inspire me</strong><span>Snap your fridge or type what you have</span></span>
                      <span className="ck-browse-go" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg></span>
                    </button>
                  </>
                );
              })()}

              {trendingDishes.length>0&&(
                <section className="ck-section">
                  <div className="ds-section-head"><h2 className="ck-section-label">Trending now</h2><button className="ds-link" onClick={()=>{setCommFrom("search");setTab("community");window.scrollTo({top:0});}}>See all</button></div>
                  <div className="ck-trending">
                    {(()=>{
                      // lead with a different dish each day; the list itself refreshes twice a month
                      const n=trendingDishes.length;
                      const off=Math.floor(Date.now()/86400000)%n;
                      return [...trendingDishes.slice(off),...trendingDishes.slice(0,off)];
                    })().map((dish,i)=>(
                      <button key={dish} className={`ck-trend-card${photosOn?" has-pic":""}`} onClick={()=>{setQuery(dish);doSearch(dish);}}>
                        {photosOn&&<DishPic title={dish} src={photoFor(dish)} className="ck-trend-pic"/>}
                        <span className="ck-trend-title">{dish}</span>
                        {dishTimes[dishKey(dish)]?.total_time&&<span className="ck-trend-meta">{totalShort(dishTimes[dishKey(dish)])}</span>}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="ck-section">
                <h2 className="ck-section-label">Community</h2>
              {(()=>{
                // a fan of real dish photos (the trending dishes are Community recipes)
                const fan=trendingDishes.filter(t=>photosOn&&photoFor(t)).slice(0,3);
                return(
                  <button className="ck-browse" onClick={()=>{setCommFrom("search");setTab("community");window.scrollTo({top:0});}}>
                    {fan.length===3&&(
                      <span className="ck-fan" aria-hidden="true">
                        {fan.map((t,i)=><img key={t} src={photoFor(t)!} alt="" className={`ck-fan-img ck-fan-${i}`}/>)}
                      </span>
                    )}
                    <span className="ck-browse-txt">
                      <strong>Browse the community</strong>
                      <span>Hundreds of dishes, ready to cook.</span>
                    </span>
                    <span className="ck-browse-go" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>
                    </span>
                  </button>
                );
              })()}
              </section>

              <section className="ck-section">
                <h2 className="ck-section-label">Bring a recipe in</h2>
                <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={onFileChange}/>
                <div className="ck-rows">
                  <button className="ck-row" onClick={()=>fileRef.current?.click()}>
                    <span className="ck-row-icon" aria-hidden="true">{Ic.camera(22)}</span>
                    <span className="ck-row-text"><span className="ck-row-title">Photograph a recipe card</span><span className="ck-row-sub">Grandma's card, a magazine page or screenshots</span></span>
                    <span className="ck-row-chev" aria-hidden="true">›</span>
                  </button>
                  {scanPreview&&(
                    <div className="ck-row-panel">
                      {scanImages.length===1
                        ?<img src={scanPreview} className="scan-preview" alt="Recipe to digitize"/>
                        :<div className="scan-thumbs">{scanImages.map((u,i)=>(
                          <div key={i} className="scan-thumb"><img src={u} alt={`Image ${i+1} of ${scanImages.length}`}/><span className="scan-thumb-n">{i+1}</span>
                            {scanStatus!=="scanning"&&<button className="scan-thumb-x" aria-label={`Remove image ${i+1}`} onClick={()=>setScanImages(l=>l.filter((_,j)=>j!==i))}>×</button>}</div>
                        ))}</div>}
                      {scanImages.length<MAX_SCAN&&scanStatus!=="scanning"&&(
                        <button className="ck-inline-link scan-add" onClick={()=>fileRef.current?.click()}>+ Add another photo or screenshot{scanImages.length===1?" of this recipe":""} ({scanImages.length} of {MAX_SCAN})</button>
                      )}
                      <div className="scan-actions">
                        <button className="scan-go-btn" onClick={doScan} disabled={scanStatus==="scanning"}>{scanStatus==="scanning"?(scanImages.length>1?`Reading ${scanImages.length} images…`:"Reading the card…"):"Turn into a recipe"}</button>
                        <button className="scan-clear-btn" onClick={clearScan} disabled={scanStatus==="scanning"}>Start over</button>
                      </div>
                      {scanStatus==="scanning"&&(
                        <div className="import-progress" role="status">
                          <div className="gen-bar gen-bar-indeterminate import-bar"><div/></div>
                          Reading the handwriting and measurements. Usually 10–30 seconds.
                        </div>
                      )}
                    </div>
                  )}
                  {scanStatus==="done"&&scanMsg&&(
                    <div className="ck-row-panel"><div className="import-status-ok" role="status">{scanMsg}{" "}
                      <button className="ck-inline-link" onClick={()=>{if(justAdded){setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);setRecipe(justAdded);setServings(null);setStatus("done");setTab("search");}else setTab("library");}}>View recipe →</button>
                    </div></div>
                  )}
                  {scanStatus==="error"&&<div className="ck-row-panel"><div className="import-status-err" role="alert">{scanMsg}</div></div>}

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
                          {urlStatus==="loading"?"Importing…":"Import"}
                        </button>
                      </div>
                      {urlStatus==="loading"&&(
                        <div className="import-progress" role="status">
                          <div className="gen-bar gen-bar-indeterminate import-bar"><div/></div>
                          Reading the page and pulling out the recipe. Usually 10–30 seconds.
                        </div>
                      )}
                      {urlStatus==="done"&&urlMsg&&(
                        <div className="import-status-ok" role="status">{urlMsg}{" "}
                          <button className="ck-inline-link" onClick={()=>{if(justAdded){setReturnTab(null);setPairedSides([]);setActivePane(0);setReturnDayKey(null);setRecipe(justAdded);setServings(null);setStatus("done");setTab("search");}else setTab("library");}}>View recipe →</button>
                        </div>
                      )}
                      {urlStatus==="error"&&<div className="import-status-err" role="alert">{urlMsg}</div>}
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
                {inspireKind==="fridge"&&(inspireStatus==="idle"||inspireStatus==="error")&&(
                  <>
                    {inspireStatus==="error"&&<p className="inspire-error" role="alert">We couldn't come up with dishes just now. Check your connection and try again.</p>}
                    <section className="fr-card" aria-labelledby="fr-title">
                      <h2 id="fr-title" className="fr-title">Cook with what you have</h2>
                      <p className="fr-lede">Snap your fridge or pantry, or type a few things. We'll find dishes that use them up.</p>
                      <input ref={fridgeFileRef} type="file" accept="image/*" style={{display:"none"}} onChange={onFridgePhoto}/>
                      <button className="fr-snap" onClick={()=>fridgeFileRef.current?.click()} disabled={fridgeSpot.status==="spotting"}>
                        {Ic.camera(20)} {fridgeSpot.status==="spotting"?"Looking at your photo…":fridgePhoto?"Snap another photo":"Snap your fridge"}
                      </button>
                      {fridgePhoto&&(
                        <div className="fr-photo-row">
                          <img src={fridgePhoto} alt="Your photo" className="fr-photo"/>
                          <span className="fr-photo-note" aria-live="polite">{fridgeSpot.status==="spotting"?"Spotting what's in there…":"Tap anything below that's wrong, or that you're saving for something else."}</span>
                        </div>
                      )}
                      {fridgeSpot.status==="error"&&<p className="inspire-error" role="alert" style={{margin:0}}>{fridgeSpot.msg}</p>}
                      <form className="fr-add" onSubmit={e=>{e.preventDefault();addFridgeText();}}>
                        <label htmlFor="fr-input" className="sr-only">Add an ingredient</label>
                        <input id="fr-input" className="fr-input" value={fridgeText} onChange={e=>setFridgeText(e.target.value)} placeholder={fridgeItems.length?"Add something else":"Type an ingredient"} autoComplete="off" enterKeyHint="done"/>
                        <button type="submit" className="fr-add-btn" disabled={!fridgeText.trim()}>Add</button>
                      </form>
                      {fridgeItems.length>0&&(
                        <>
                          <div className="fr-chips">
                            {fridgeItems.map(it=>(
                              <button key={it.name} type="button" className={`fr-chip${it.on?" on":""}`} aria-pressed={it.on}
                                onClick={()=>setFridgeItems(l=>l.map(x=>x.name===it.name?{...x,on:!x.on,unsure:false}:x))}>
                                {it.on?<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>:<span aria-hidden="true">+</span>}
                                {it.name}{it.unsure&&<span className="fr-unsure"> (not sure)</span>}
                              </button>
                            ))}
                          </div>
                          <p className="fr-staples">We assume you have {STAPLES_NOTE}. <button className="ck-textlink" style={{alignSelf:"auto",fontSize:"inherit"}} onClick={()=>{setFridgeItems([]);setFridgePhoto(null);setFridgeSpot({status:"idle"});}}>Clear all</button></p>
                        </>
                      )}
                    </section>
                    <fieldset className="inspire-section">
                      <legend className="inspire-section-label">How much time do you have? <span className="inspire-optional">Optional</span></legend>
                      <div className="inspire-chips">
                        {FRIDGE_TIMES.map(([o])=>(
                          <button key={o} type="button" className={`inspire-chip${fridgeTime===o?" on":""}`} aria-pressed={fridgeTime===o} onClick={()=>setFridgeTime(t=>t===o?"":o)}>{o}</button>
                        ))}
                      </div>
                    </fieldset>
                    {diets.length>0&&<p className="inspire-diets">Using your dietary filters: {diets.join(", ")}</p>}
                    <button className="inspire-go-btn" onClick={()=>doFridge()} disabled={!fridgeOn.length||fridgeSpot.status==="spotting"}>
                      {fridgeOn.length?`Find dishes · ${fridgeOn.length} ingredient${fridgeOn.length===1?"":"s"}`:"Find dishes"}
                    </button>
                    {!fridgeOn.length&&<p className="inspire-hint">Add at least one ingredient to continue.</p>}
                    <p className="inspire-hint">Rather pick a vibe? <button className="ck-textlink" style={{alignSelf:"auto",fontSize:"inherit"}} onClick={()=>setInspireKind("vibe")}>Answer 3 quick questions</button></p>
                  </>
                )}

                {inspireKind==="vibe"&&(inspireStatus==="idle"||inspireStatus==="error")&&(
                  <>
                    <p className="inspire-lede">Answer three quick questions and we'll suggest four dishes.</p>
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
                    {diets.length>0&&<p className="inspire-diets">Using your dietary filters: {diets.join(", ")}</p>}
                    <button className="inspire-go-btn" onClick={doInspire} disabled={!(inspireTime&&inspireVibe&&inspireServes)}>
                      {inspireStatus==="error"?"Try again":"Show me ideas"}
                    </button>
                    {!(inspireTime&&inspireVibe&&inspireServes)&&<p className="inspire-hint">Pick a time, a vibe and how many to continue.</p>}
                    <p className="inspire-hint"><button className="ck-textlink" style={{alignSelf:"auto"}} onClick={()=>setInspireKind("fridge")}>Cook with what you have instead</button></p>
                  </>
                )}

                {inspireStatus==="loading"&&(()=>{
                  const elapsed=Math.max(0,(Date.now()-inspireStart.current)/1000);
                  const pct=Math.round(95*(1-Math.exp(-elapsed/6)));
                  const STEPS=inspireKind==="fridge"?["Reading your ingredients","Checking Community recipes","Matching dishes to what you have","Picking the best ones"]:["Reading your answers","Checking what's in season","Matching ideas to your mood","Picking the best four"];
                  const at=elapsed<2?0:elapsed<5?1:elapsed<9?2:3;
                  return(
                    <>
                      <div className="inspire-picks" aria-label="Your answers">
                        {(inspireKind==="fridge"?[...fridgeOn,fridgeTime].filter(Boolean):[inspireTime,inspireVibe,inspireServes]).map(x=><span key={x} className="inspire-pick">{x}</span>)}
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
                      {[0,1,2,3].map(i=>(
                        <div key={i} className="inspire-card" style={{marginTop:12,opacity:1-i*0.15}} aria-hidden="true">
                          <div className="gen-skel" style={{width:"62%",height:18}}/>
                          <div className="gen-skel" style={{width:"90%"}}/>
                          <div className="gen-skel" style={{width:"40%"}}/>
                        </div>
                      ))}
                    </>
                  );
                })()}

                {inspireKind==="fridge"&&inspireStatus==="done"&&(()=>{
                  const n=fridgeOn.length;
                  const shown=fridgeOn.slice(0,5);
                  const card=(key:string,title:string,tagline:string,time:string,uses:string[],need:string[],ready:boolean,open:()=>void)=>(
                    <article key={key} className="inspire-card fr-result">
                      {ready&&<span className="fr-ready">Ready now · from the Community</span>}
                      <h3 className="inspire-card-title">{title}</h3>
                      {tagline&&<p className="inspire-card-desc">{tagline}</p>}
                      <div className="inspire-card-meta">
                        {time&&<span>{time}</span>}
                        {uses.length>0&&<span className="fr-uses">Uses {uses.length} of your {n}</span>}
                      </div>
                      {need.length?<p className="fr-need">You'll need: {need.join(", ")}</p>:<p className="fr-need fr-none">Nothing to buy</p>}
                      <button className="inspire-card-btn" onClick={open}>{ready?"Open the recipe":"Get the recipe"}</button>
                    </article>
                  );
                  return(
                    <>
                      <div className="inspire-picks" aria-label="Your ingredients">
                        {shown.map(x=><span key={x} className="inspire-pick">{x}</span>)}
                        {n>shown.length&&<span className="inspire-pick">+{n-shown.length} more</span>}
                        {fridgeTime&&<span className="inspire-pick">{fridgeTime}</span>}
                      </div>
                      <h2 className="fr-results-title">Dishes that use it up</h2>
                      {fridgeCommunity.length+inspireSuggestions.length>0?(
                        <div className="inspire-results">
                          {fridgeCommunity.map((m,i)=>card("c"+i,m.recipe.title,m.recipe.tagline||"",totalRange(m.recipe),m.uses,m.need,true,()=>openFridgeCommunity(m)))}
                          {inspireSuggestions.map((sg:any,i:number)=>card("a"+i,sg.title,sg.tagline||"",tt(sg),sg.uses||[],sg.need||[],false,()=>pickInspiredRecipe(sg,fridgeOn)))}
                        </div>
                      ):(
                        <p className="inspire-error" role="alert">No dishes came back that time. Try again, or add a few more ingredients.</p>
                      )}
                      <div className="inspire-again">
                        <button className="ck-textlink" style={{alignSelf:"auto"}} onClick={()=>doFridge(true)}>Show four more</button>
                        <button className="ck-textlink" style={{alignSelf:"auto"}} onClick={()=>{setInspireStatus("idle");setInspireSuggestions([]);setFridgeCommunity([]);}}>Change ingredients</button>
                      </div>
                    </>
                  );
                })()}

                {inspireKind==="vibe"&&inspireStatus==="done"&&(
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
                              {tt(sg)&&<span>{tt(sg)}</span>}
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
                      <button className="ck-textlink" style={{alignSelf:"auto"}} onClick={doInspire}>Show four more</button>
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
          const backLabel=returnTab==="library"?"Library":returnTab==="saved"?"Saved":returnTab==="community"?"Community":returnTab==="week"?"This week":returnTab==="family"?"Household":"Search";
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
                          {activePane===0&&originOf(recipe)&&recipe._ownPhoto&&(
                            <button role="menuitem" className="rx-menu-item" onClick={()=>{
                              setShowRecipeMenu(false);
                              const o=originOf(recipe)!;const tag=(r:any)=>r&&r.id===recipe.id?{...r,_ownPhoto:o.title||o.q}:r;
                              setRecipe((r:any)=>tag(r));setSaved((l:any[])=>l.map(tag));
                              setPlan((p:any)=>{let ch=false;const m={...p};for(const k in m){if(m[k]?.id===recipe.id){m[k]=tag(m[k]);ch=true;}}return ch?m:p;});
                            }}>{Ic.camera(17)} Use the original's photo</button>
                          )}
                          <button role="menuitem" className="rx-menu-item" onClick={()=>{setShowRecipeMenu(false);setEditRecipe(JSON.parse(JSON.stringify(recipe)));setStepRewrite("idle");setStepsSyncedFor("");setShowEditPanel(true);}}>
                            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit recipe
                          </button>
                          {!recipe._scanned&&!recipe._imported&&(
                            <button role="menuitem" className="rx-menu-item" onClick={()=>{setShowRecipeMenu(false);setTimeout(()=>document.getElementById("rx-remix")?.scrollIntoView({behavior:"smooth",block:"start"}),60);}}>{Ic.refresh(17)} Remix</button>
                          )}
                          {(recipe._fromCache||recipe._shareFrom)&&!recipe._edited&&(
                            <button role="menuitem" className="rx-menu-item rx-menu-danger" onClick={()=>{setShowRecipeMenu(false);setReportState("idle");setReportFor(recipe);}}>
                              <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4h11l-1.5 4L16 12H5"/></svg>
                              Report this recipe
                            </button>
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
              <button role="tab" aria-selected={activePane===0} className={`rx-tab${activePane===0?" active":""}`} onClick={()=>setActivePane(0)} title={recipe.title}><span className="rx-tab-label">{recipe.title}</span></button>
              {pairedSides.map((p,i)=>(
                <button key={i} role="tab" aria-selected={activePane===i+1} className={`rx-tab rx-tab-side${activePane===i+1?" active":""}`} onClick={()=>setActivePane(i+1)} title={p.title}>
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
              // Opened from "Cook with what you have": tick off what they already have
              const have=fridgeHave&&fridgeHave.id===recipe.id?fridgeHave.items:[];
              const hasIt=(name:string)=>have.some(h=>ingredientUses(name,h));
              const haveCount=items.filter(([,it])=>hasIt(it.name)).length;
              return(
                <section className="rx-groceries" id="rx-groceries" aria-label="Grocery list">
                  <div className="rx-gro-head">
                    <h2 className="rx-gro-title">Grocery list</h2>
                    <span className="rx-gro-sub">{items.length} item{items.length===1?"":"s"}{multi?` for ${dishes.length} dishes`:""}</span>
                  </div>
                  <button className="rx-gro-add" onClick={()=>openAddSheet(activePane===0?recipe:(pairedSides[activePane-1]?.recipe||recipe))}>{Ic.cart(17)} Add to my list</button>
                  {multi&&<p className="rx-gro-note"><span className="rx-gro-swatch" aria-hidden="true"/>Highlighted: the {activeCount} item{activeCount===1?"":"s"} for <strong>{activeTitle}</strong></p>}
                  {haveCount>0&&<p className="rx-gro-note">Ticked off: the {haveCount} item{haveCount===1?"":"s"} you already have.</p>}
                  {!store&&<p className="rx-gro-note">Choose a store under the main dish's details to get shopping links.</p>}
                  <ul className="rx-gro-list" key={recipe.id}>
                    {items.map(([k,it])=>{
                      const on=!multi||it.dishes.includes(activeTitle);
                      return(
                        <li key={k} className={`rx-gro-item${on?" on":""}`}>
                          <label className="rx-gro-check">
                            <input type="checkbox" defaultChecked={hasIt(it.name)}/>
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
                {(()=>{
                  const todayK=dateKey(startOfToday());
                  const planned=!!activeRecipe&&Object.entries(plan).some(([k,r]:any)=>k>=todayK&&sameRecipe(r,activeRecipe));
                  return(
                    <button className={`rx-plan${planned?" planned":""}`} disabled={!activeRecipe}
                      aria-label={planned?"Planned. Add to another day":"Add to plan"}
                      onClick={()=>activeRecipe&&setPlanPick({recipe:activeRecipe,sides:activePane===0?pairedSides.filter(x=>x.status==="done"&&x.recipe):[]})}>
                      {planned?<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>:Ic.calendar(18)}
                      {planned?"Planned":"Plan"}
                    </button>
                  );
                })()}
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
    const dish=recipe._dish||recipe.title||"";
    const sources=recipe.sources||[];
    const groups=recipe.ingredient_groups||(recipe.ingredients?[{label:"",items:recipe.ingredients}]:[]);
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

    return(
      <div className="recipe-page rx-page">
        <input ref={photoInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhotoUpload}/>
        {photosOn?(
          <div className="rx-hero-wrap">
            <DishPic title={recipe.title} src={photoFor(recipe,photo)} className="rx-hero"/>
            <div className="rx-hero-chips" aria-hidden="true">
              {totalRange(withTimes(recipe))&&<span className="glass-chip"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>{totalRange(withTimes(recipe))}</span>}
              <span className="glass-chip">Serves {curS}</span>
            </div>
          </div>
        ):photo&&<img src={photo} className="rx-photo" alt={recipe.title}/>}
        <header className={`rx-head${photosOn?" rx-head-over":""}`}>
          <div className="rx-eyebrow">{originOf(recipe)?"Your version":recipe._adapt&&!recipe._adapt.off&&!recipe._author?(recipe._edited||recipe._adapted?"Your version":"Shared recipe"):recipe._author?`From @${recipe._author} on TikTok`:recipe._scanned?"Scanned recipe":recipe._imported?"Imported recipe":recipe._fromCache?"Community recipe":"Every Chef original"}</div>
          <h1 className="rx-title">{recipe.title}</h1>
          {(()=>{const o=originOf(recipe);if(!o)return null;return(
            <button className="rx-credit" onClick={()=>openLibraryOriginal(o)} aria-label="Open the original recipe">
              <span className="rx-credit-av rx-credit-ec" aria-hidden="true">e</span>
              <span>Adapted from {o.title?<u>{o.title}</u>:<u>the original</u>} in the Community</span>
            </button>);})()}
          {recipe._adapt?.slug&&!recipe._adapt.off&&(
            <button className="rx-credit" onClick={()=>openOriginal(recipe._adapt)} aria-label={`Open the original${recipe._adapt.by?` by ${recipe._adapt.by}`:""}`}>
              {recipe._adapt.by&&<span className="rx-credit-av" aria-hidden="true">{recipe._adapt.by[0].toUpperCase()}</span>}
              <span>{recipe._edited||recipe._adapted
                ?<>Adapted from <u>{recipe._adapt.title||"a shared recipe"}</u>{recipe._adapt.by?<> by {recipe._adapt.by}</>:null}</>
                :<>Shared by {recipe._adapt.by||"someone"} · <u>see the original</u></>}</span>
            </button>
          )}
          {recipe.tagline&&<p className="rx-tagline">{recipe.tagline}</p>}
          {recipe.seasonal_note&&<div className="rx-seasonal"><span style={{display:"flex"}}>{Ic.leaf(13)}</span> {recipe.seasonal_note}</div>}
          <div className="rx-meta">
            <div className="rx-meta-item rx-meta-total"><span className="rx-meta-label">Total time</span><span className="rx-meta-value">{totalRange(withTimes(recipe))||"—"}</span></div>
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
          {(()=>{const w=withTimes(recipe);const nice=(t:string)=>{const m=toMinutes(t);return m?fmtMinutes(m):t;};const parts=[w?.prep_time&&w.prep_time!=="—"&&`Prep ${nice(w.prep_time)}`,w?.cook_time&&w.cook_time!=="—"&&`Cook ${nice(w.cook_time)}`].filter(Boolean);return parts.length?<p className="rx-meta-sub">{parts.join(" · ")}</p>:null;})()}
          {(()=>{
            const n=nutri[nutriKey(recipe)];
            if(!n||n==="error")return null;
            const ready=typeof n==="object";
            const cells:[string,string][]=ready?[[String(n.calories),"calories"],[`${n.protein}g`,"protein"],[`${n.carbs}g`,"carbs"],[`${n.fat}g`,"fat"]]:[["","calories"],["","protein"],["","carbs"],["","fat"]];
            return(
              <button className="rx-nutri" disabled={!ready} onClick={()=>setShowNutri(true)} aria-label={ready?`Nutrition per serving, estimated: ${n.calories} calories, ${n.protein} grams protein, ${n.carbs} grams carbs, ${n.fat} grams fat. Tap for details`:"Estimating nutrition"}>
                <span className="rx-nutri-top"><span>Per serving{servesOf(recipe)>1?` · ${fracOf(servesOf(recipe))} of the recipe`:""}</span><span className="rx-nutri-est"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>Estimate</span></span>
                <span className="rx-nutri-row" aria-hidden="true">
                  {cells.map(([v,l])=><span key={l} className="rx-nutri-cell">{ready?<strong>{v}</strong>:<span className="gen-skel" style={{width:36,height:18,margin:"2px auto 4px"}}/>}<span>{l}</span></span>)}
                </span>
                {ready&&(()=>{const sv=servesOf(recipe);if(sv<2||sv>10)return null;const more=sv+2;return <span className="rx-nutri-alt">Cut into {more} instead: about {Math.round(n.calories*sv/more/10)*10} calories each</span>;})()}
              </button>
            );
          })()}
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
                <h2 className="source-section-label" id="rate-label">Rate this recipe</h2>
                <div className="star-row rx-stars" role="group" aria-labelledby="rate-label">
                  {[1,2,3,4,5].map(n=>{
                    const currentRating=recipe?.id?ratings[recipe.id]||0:0;
                    return(
                      <button key={n} className={`star${currentRating>=n?" filled":""}`}
                        aria-label={`${n} star${n>1?"s":""}`} aria-pressed={currentRating>=n}
                        onClick={()=>recipe?.id&&setRatings(prev=>({...prev,[recipe.id]:prev[recipe.id]===n?0:n}))}>
                        ★
                      </button>
                    );
                  })}
                  {recipe?.id&&ratings[recipe.id]>0&&(
                    <span style={{fontSize:15,color:"#4F4744",marginLeft:8,alignSelf:"center"}}>
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
            <h2 className="remix-label">Not quite right? Remix it</h2>
            <p className="remix-sub">Pick what to change and we'll rewrite the recipe.</p>
            <div className="remix-chips">
              {REMIX_OPTIONS.map(chip=>(
                <button key={chip} aria-pressed={remixChips.includes(chip)} className={`remix-chip${remixChips.includes(chip)?" active":""}`}
                  onClick={()=>toggleRemixChip(chip)}>
                  {chip}
                </button>
              ))}
            </div>
            {remixStatus==="loading"?(
              <div className="import-progress" role="status" style={{marginTop:4}}>
                <div className="gen-bar gen-bar-indeterminate import-bar"><div/></div>
                Remixing your recipe. Usually 15–40 seconds.
              </div>
            ):(
              <button className="remix-go" onClick={doRemix}
                disabled={remixChips.length===0}>
                {remixChips.length===0?"Pick at least one change":"Remix this recipe"}
              </button>
            )}
          </div>
        )}

        {sources.length>0&&(
          <div className="source-section">
            <h2 className="source-section-label">Explore more on</h2>
            <div className="source-links">
              {sources.map((s:string,i:number)=>(
                <a key={i} href={getSiteUrl(s,dish)} target="_blank" rel="noopener noreferrer" className="source-link">{s} ↗</a>
              ))}
            </div>
            {recipe.source_note&&!(!recipe._scanned&&!recipe._imported&&!recipe._author&&sources.some((x:string)=>x&&recipe.source_note.toLowerCase().includes(String(x).toLowerCase())))&&<div className="source-note">{recipe.source_note}</div>}
            {!recipe._scanned&&!recipe._imported&&!recipe._author&&<div className="source-note ai-source-note">Written with AI. Check for allergens, and cook meat, poultry, fish and eggs to safe temperatures.</div>}
          </div>
        )}
        {sources.length===0&&!recipe._scanned&&!recipe._imported&&!recipe._author&&(
          <div className="source-section"><div className="source-note ai-source-note">Written with AI. Check for allergens, and cook meat, poultry, fish and eggs to safe temperatures.</div></div>
        )}
        </div>{/* recipe-body */}
      </div>
    );
  }

  /* ── SIDE DISH PANE (paired alongside the main recipe) ── */
  function SidePaneView(pane:{title:string;status:string;recipe:any}, idx:number){
    if(pane.status==="loading"||!pane.recipe){
      return(
        <div className="gen-body" style={{paddingBottom:40}}>
          <h1 className="rx-title">{pane.title}</h1>
          {pane.status==="error"?(
            <div className="ui-notice" role="alert" style={{marginTop:8,maxWidth:560}}>
              <div className="ui-notice-title">We couldn't make this side</div>
              <div className="ui-notice-text">Something went wrong on our end. Trying again usually works.</div>
              <div className="ui-actions">
                <button className="ui-btn-primary" onClick={()=>retryPairedSide(idx)}>Try again</button>
                <button className="ui-btn-secondary" style={{marginTop:0}} onClick={()=>removePairedSide(idx)}>Remove side</button>
              </div>
            </div>
          ):(
            <>
              <div className="gen-skel" style={{width:"80%"}}/>
              <div className="gen-card" aria-live="polite">
                <div className="gen-card-head">
                  <span className="gen-card-title">Writing this side</span>
                  <span className="gen-card-time">usually 15–40 sec</span>
                </div>
                <div className="gen-bar gen-bar-indeterminate" aria-label="Loading"><div/></div>
              </div>
              {[64,48,72].map((w,i)=>(
                <div key={i} className="gen-row" style={{opacity:1-i*0.2}} aria-hidden="true">
                  <div className="gen-skel" style={{width:48,margin:0}}/>
                  <div className="gen-skel" style={{width:`${w}%`,margin:0}}/>
                </div>
              ))}
            </>
          )}
        </div>
      );
    }
    const r=pane.recipe;
    const groups=r.ingredient_groups||(r.ingredients?[{label:"",items:r.ingredients}]:[]);
    const ingFontSize=ingTextSize==="xl"?21:ingTextSize==="large"?19:17;
    return(
      <div className="recipe-page rx-page side-pane-page">
        {photosOn&&<DishPic title={r.title||pane.title} src={photoFor(r.title?r:pane.title)} className="rx-hero"/>}
        <header className="rx-head">
          <div className="rx-eyebrow" style={{color:"#1A1F2E",display:"flex",alignItems:"center",gap:6}}>{Ic.leaf(13)} Side for {recipe.title}</div>
          <h1 className="rx-title">{r.title}</h1>
          {r.tagline&&<p className="rx-tagline">{r.tagline}</p>}
          <div className="rx-meta">
            <div className="rx-meta-item rx-meta-total"><span className="rx-meta-label">Total time</span><span className="rx-meta-value">{totalRange(withTimes(r))||"—"}</span></div>
            <div className="rx-meta-div"/>
            <div className="rx-meta-item"><span className="rx-meta-label">Serves</span><span className="rx-meta-value">{r.servings}</span></div>
          </div>
          {(()=>{const w=withTimes(r);const nice=(t:string)=>{const m=toMinutes(t);return m?fmtMinutes(m):t;};const parts=[w?.prep_time&&w.prep_time!=="—"&&`Prep ${nice(w.prep_time)}`,w?.cook_time&&w.cook_time!=="—"&&`Cook ${nice(w.cook_time)}`].filter(Boolean);return parts.length?<p className="rx-meta-sub">{parts.join(" · ")}</p>:null;})()}
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

    const matched=communityRecipes.filter(r=>{
      const catMatch=communityTab==="All"||communityCategory(r.title)===communityTab;
      return catMatch&&matchesSearch(r);
    });
    const filtered=commShuffle&&!sq?seededShuffle(matched,commShuffle):matched;

    return(
      <div className="lib-page cm-page">
        <button className="rx-back ck-mode-back" onClick={()=>{if(commFrom==="library")setTab("library");else{setTab("search");setHomeMode("search");}window.scrollTo({top:0});}}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg>
          {commFrom==="library"?"Library":"Cook"}
        </button>
        <div className="cm-head">
          <h1 className="ck-title" style={{margin:0}}>Community</h1>
          {communityStatus==="done"&&communityRecipes.length>1&&(
            <button className="cm-shuffle" onClick={()=>setCommShuffle(Date.now()%100000+1)}>{Ic.shuffle(16)} Shuffle</button>
          )}
        </div>
        <p className="fl-lede">Dishes other people have made with Every Chef. Tap one to open it.</p>

        {!communityAuthed&&communityStatus==="done"&&(
          <div className="cm-gate">
            <div>
              <div className="cm-gate-title">You're seeing a few highlights</div>
              <div className="cm-gate-desc">Create a free account to browse every community recipe.</div>
            </div>
            <button className="cm-gate-btn" onClick={()=>openSignIn()}>Sign up free</button>
          </div>
        )}

        {communityStatus==="loading"&&(
          <div className="fl-grid" aria-busy="true" aria-label="Loading community recipes">
            {[0,1,2,3].map(i=>(
              <div key={i} className="fl-card" style={{opacity:1-i*0.18,cursor:"default"}} aria-hidden="true">
                <div className="gen-skel" style={{width:"30%",height:12}}/>
                <div className="gen-skel" style={{width:"70%",height:18}}/>
                <div className="gen-skel" style={{width:"90%"}}/>
              </div>
            ))}
          </div>
        )}
        {communityStatus==="error"&&(
          <div className="ui-notice" role="alert">
            <div className="ui-notice-title">Couldn't load community recipes</div>
            <div className="ui-notice-text">Check your connection and try again.</div>
            <button className="ui-btn-secondary" onClick={loadCommunity}>Try again</button>
          </div>
        )}

        {communityStatus==="done"&&(
          <>
            <label className="lib-search">
              <span aria-hidden="true" style={{display:"flex",color:"#6E635F"}}>{Ic.search(18)}</span>
              <input placeholder="Search by dish or ingredient" aria-label="Search community recipes"
                value={communitySearch} onChange={e=>setCommunitySearch(e.target.value)}/>
              {communitySearch&&(
                <button className="cm-clear" aria-label="Clear search" onClick={()=>setCommunitySearch("")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                </button>
              )}
            </label>

            {!sq?(
              <div className="lib-filters" role="group" aria-label="Filter by category">
                {COMM_CATS.map(cat=>(
                  <button key={cat} className={`ck-chip${communityTab===cat?" on-dark":""}`} aria-pressed={communityTab===cat} onClick={()=>setCommunityTab(cat)}>{cat}</button>
                ))}
              </div>
            ):(
              <p className="cm-count" aria-live="polite">{filtered.length===0?"No matches":filtered.length===1?"1 recipe":`${filtered.length} recipes`}</p>
            )}

            {filtered.length===0?(
              <div className="empty-state">
                {sq?<><h3>No matches for "{communitySearch}"</h3><p>Try another dish or ingredient, or search for it from the Cook tab to make it yourself.</p></>
                  :<><h3>Nothing here yet</h3><p>No {communityTab==="All"?"community":communityTab.toLowerCase()} recipes yet. Check back soon.</p></>}
              </div>
            ):(
              <div className="fl-grid">
                {filtered.map((r:any,i:number)=>(
                  <button key={r.title+i} className={`fl-card${photosOn?" has-pic":""}`} onClick={()=>openCommunityRecipe(r)}>
                    {photosOn&&<DishPic title={r.title} src={photoFor(r.title)} className="fl-pic"/>}
                    <span className="fl-card-cat">{communityCategory(r.title)}</span>
                    <span className="fl-card-title">{r.title}</span>
                    {r.tagline&&<span className="fl-card-desc">{r.tagline}</span>}
                    <span className="fl-card-go" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>
                    </span>
                  </button>
                ))}
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
    const FILTERS:[string,string][]=[["all","All"],["mine","Mine"],["community","Community"],["family","Household"],["sides","Sides"],["recent","Recent"]];
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
            <button key={k} role="tab" aria-selected={libFilter===k} className={`ck-chip${libFilter===k?" on-dark":""}`} onClick={()=>{if(k==="community"){setCommFrom("library");setTab("community");window.scrollTo({top:0});}else setLibFilter(k as any);}}>
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
                          {tt(r)&&<span>{tt(r)}</span>}
                          <span>{r.servings} servings</span>
                        </div>
                      </div>
                      <div className="history-item-time">{r._ts?timeAgo(r._ts):""}</div>
                      <button className={`history-item-save${sv?" saved":""}`} onClick={()=>toggleSave(r)}>
                        {sv?"Saved":"Save"}
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
                        <div key={r.id} className={`recipe-card${photosOn?" has-pic":""}`} onClick={()=>{setReturnTab("library");setPairedSides([]);setActivePane(0);setReturnDayKey(null);setRecipe(r);setServings(null);setStatus("done");setTab("search");}}>
                          {photosOn&&<DishPic title={r.title} src={photoFor(r,recipePhotos[r.id])} className="lib-pic"/>}
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
                          <div className="card-meta">{tt(r)&&<span>{tt(r)}</span>}<span>{r.servings} srv</span></div>
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
  /* ── PLAN MY WEEK ── */
  const qpRhythm=():Record<number,QPLevel>=>{try{const r=JSON.parse(localStorage.getItem("dw-qp-rhythm")||"null");if(r&&typeof r==="object")return {...QP_DEFAULT,...r};}catch{}return {...QP_DEFAULT};};
  // open nights this week, not counting ones they chose to skip
  const qpSkipped=():string[]=>{try{return JSON.parse(localStorage.getItem("dw-qp-skipped")||"[]");}catch{return [];}};
  const qpOpenDays=()=>{const sk=qpSkipped();return next7Keys.filter(k=>!plan[k]&&!sk.includes(k));};
  const qp14=Array.from({length:14},(_,i)=>dateKey(addDays(startOfToday(),i)));
  // Opens straight to a filled week, set up the way they planned last time. Each night can be changed from there.
  const openQuickPlan=()=>{
    const rh=qpRhythm();
    const q={stage:"loading" as const,days:qp14.map(k=>({key:k,level:rh[keyToDate(k).getDay()]||"quick" as QPLevel})),picks:{},matches:{},seen:{},shared:[],replace:{},week2:false};
    setQp(q);qpFill(q);
  };
  // nights the sheet is filling: open ones, plus planned ones they chose to change
  const qpActive=(q:NonNullable<typeof qp>)=>q.days.filter((d,i)=>(i<7||q.week2)&&(!plan[d.key]||q.replace[d.key]));
  const qpRecent=()=>{
    const cutoff=dateKey(addDays(startOfToday(),-14));
    return Object.entries(plan).filter(([k,r]:any)=>k>=cutoff&&r?.title).map(([,r]:any)=>r.title);
  };
  const qpFetch=async(days:{key:string;level:QPLevel}[],avoid:string[],replace:Record<string,boolean>={})=>{
    const fixed:Record<string,any>={};
    for(const k of qp14)if(plan[k]&&!replace[k])fixed[k]=plan[k];
    const res=await fetch("/api/quickplan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({days,diets,avoid,fixed})});
    const d=await res.json();
    if(!res.ok)throw new Error(d.error||"Couldn't plan the week just now.");
    return d;
  };
  const qpFill=async(start?:NonNullable<typeof qp>)=>{
    const cur=start||qp;
    if(!cur)return;
    const days=qpActive(cur);
    setQp(q=>q&&{...q,stage:"loading",err:undefined});
    try{
      const d=await qpFetch(days.filter(x=>x.level!=="skip"),qpRecent(),cur.replace);
      const seen:Record<string,string[]>={};
      for(const [k,p] of Object.entries(d.picks||{}))if(p)seen[k]=[(p as any).recipe.title];
      setQp(q=>q&&{...q,stage:"week",picks:d.picks||{},matches:d.matches||{},shared:d.shared||[],seen});
    }catch(e:any){setQp(q=>q&&{...q,stage:"days",err:e.message||"Couldn't plan the week just now."});}
  };
  const qpShuffle=async(key:string)=>{
    if(!qp)return;
    let day=qp.days.find(d=>d.key===key);if(!day)return;
    const replacing=!!plan[key]&&!qp.replace[key];
    if(replacing){ // switching a night that was already planned: keep it about as long
      const lv=levelOf(withTimes(plan[key]))||day.level;
      day={...day,level:lv==="skip"?"normal":lv as QPLevel};
    }
    if(day.level==="skip")return;
    setQp(q=>q&&{...q,busy:key});
    try{
      const others=Object.entries(qp.picks).filter(([k,p])=>k!==key&&p).map(([,p])=>p!.recipe.title);
      const seenHere=[...(qp.seen[key]||[]),...(plan[key]?[plan[key].title]:[])];
      const rep2={...qp.replace,[key]:true};
      const d=await qpFetch([day],[...qpRecent(),...others,...seenHere],rep2);
      let p=d.picks?.[key]||null;
      // shown them all? start over from the full list for that night
      if(!p&&(qp.seen[key]||[]).length>1){const again=await qpFetch([day],[...qpRecent(),...others,qp.picks[key]?.recipe?.title||""],rep2);p=again.picks?.[key]||null;if(p)setQp(q=>q&&{...q,seen:{...q.seen,[key]:[]}});}
      if(!p){setQp(q=>q&&{...q,busy:undefined});return;}
      const lv=day.level;
      const recipes=[...Object.entries(qp.picks).filter(([k,x])=>k!==key&&x).map(([,x])=>x!.recipe),p.recipe,...qp14.filter(k=>plan[k]&&!rep2[k]).map(k=>plan[k])];
      setQp(q=>q&&{...q,busy:undefined,prev:qpSnap(q,key),replace:rep2,days:q.days.map(x=>x.key===key?{...x,level:lv}:x),picks:{...q.picks,[key]:p},seen:{...q.seen,[key]:[...(q.seen[key]||[]),p.recipe.title]},shared:sharedProduce(recipes).slice(0,4)});
    }catch{setQp(q=>q&&{...q,busy:undefined});}
  };
  // remember what a night had before a change, so it can be put back
  const qpSnap=(q:NonNullable<typeof qp>,key:string)=>({...(q.prev||{}),[key]:[...((q.prev||{})[key]||[]).slice(-9),{pick:q.picks[key]??null,level:(q.days.find(x=>x.key===key)?.level||"normal") as QPLevel,replaced:!!q.replace[key]}]});
  const qpUndo=(key:string)=>setQp(q=>{
    if(!q)return q;
    const stack=(q.prev||{})[key]||[];const last=stack[stack.length-1];if(!last)return q;
    return {...q,open:undefined,picks:{...q.picks,[key]:last.pick},days:q.days.map(x=>x.key===key?{...x,level:last.level}:x),replace:{...q.replace,[key]:last.replaced},prev:{...q.prev,[key]:stack.slice(0,-1)}};
  });
  // tap a night in "Your week": change its time, skip it, or put a specific dish there
  const qpToggleRow=(key:string)=>{setQpQuery("");setQpHits([]);setQp(q=>q&&{...q,open:q.open===key?undefined:key});};
  const qpSetLevel=async(key:string,level:QPLevel)=>{
    if(!qp)return;
    const planned=!!plan[key];
    if(level==="skip"){
      setQp(q=>q&&{...q,open:undefined,prev:qpSnap(q,key),days:q.days.map(x=>x.key===key?{...x,level}:x),picks:{...q.picks,[key]:null},replace:planned?{...q.replace,[key]:true}:q.replace});
      return;
    }
    const day={key,level};
    const rep2=planned?{...qp.replace,[key]:true}:qp.replace;
    setQp(q=>q&&{...q,busy:key,open:undefined,prev:qpSnap(q,key),days:q.days.map(x=>x.key===key?{...x,level}:x),replace:rep2});
    try{
      const others=Object.entries(qp.picks).filter(([k,p])=>k!==key&&p).map(([,p])=>p!.recipe.title);
      const d=await qpFetch([day],[...qpRecent(),...others],rep2);
      const p=d.picks?.[key]||null;
      setQp(q=>q&&{...q,busy:undefined,picks:{...q.picks,[key]:p},seen:{...q.seen,[key]:p?[p.recipe.title]:[]}});
    }catch{setQp(q=>q&&{...q,busy:undefined});}
  };
  const qpChoose=async(key:string,hit:{title:string;key?:string;recipe?:any})=>{
    let r=hit.recipe;
    if(!r){
      try{const res=await fetch(`/api/cache?q=${encodeURIComponent(hit.key||hit.title)}`);const d=await res.json();if(d.found)r=d.recipe;}catch{}
      if(!r)return;
    }
    const planned=!!plan[key];
    setQpQuery("");setQpHits([]);
    setQp(q=>q&&{...q,open:undefined,prev:qpSnap(q,key),picks:{...q.picks,[key]:{recipe:r,minutes:0}},days:q.days.map(x=>x.key===key&&x.level==="skip"?{...x,level:"normal"}:x),replace:planned?{...q.replace,[key]:true}:q.replace});
  };
  // search your recipes and the Community while typing
  useEffect(()=>{
    const q=qpQuery.trim();
    if(!qp?.open||q.length<2){setQpHits([]);return;}
    const mine=saved.map((r:any)=>({r,sc:titleScore(r.title,q)})).filter(x=>x.sc>0).sort((a,b)=>b.sc-a.sc).slice(0,4).map(x=>({title:x.r.title,recipe:x.r,from:"mine" as const}));
    setQpHits(mine);
    if(q.length<3)return;
    const t=setTimeout(()=>{
      fetch(`/api/community/search?q=${encodeURIComponent(q)}`).then(r=>r.json()).then(d=>{
        const com=(Array.isArray(d?.results)?d.results:[]).filter((x:any)=>!mine.some(m=>normTitle(m.title)===normTitle(x.title))).map((x:any)=>({title:x.title,total:x.total,key:x.key,from:"community" as const}));
        setQpHits([...mine,...com]);
      }).catch(()=>{});
    },220);
    return()=>clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[qpQuery,qp?.open]);
  // add next week to a week that's already filled, keeping this week's picks
  const qpFillWeek2=async()=>{
    if(!qp)return;
    const days=qp.days.slice(7).filter(d=>!plan[d.key]&&d.level!=="skip");
    setQp(q=>q&&{...q,busy:"week2"});
    try{
      const others=Object.values(qp.picks).filter(Boolean).map(p=>p!.recipe.title);
      const d=await qpFetch(days,[...qpRecent(),...others],qp.replace);
      const seen:Record<string,string[]>={};
      for(const [k,p] of Object.entries(d.picks||{}))if(p)seen[k]=[(p as any).recipe.title];
      setQp(q=>q&&{...q,busy:undefined,week2:true,picks:{...q.picks,...(d.picks||{})},seen:{...q.seen,...seen}});
    }catch{setQp(q=>q&&{...q,busy:undefined});}
  };
  const qpAdd=()=>{
    if(!qp)return;
    const now=Date.now();
    const add:Record<string,any>={};
    const active=new Set(qpActive(qp).map(d=>d.key));
    Object.entries(qp.picks).forEach(([k,p],i)=>{if(p&&active.has(k))add[k]={...p.recipe,id:now+i,_dish:p.recipe.title,_ts:now,_fromCache:true};});
    setPlan(pl=>({...pl,...add}));
    // planned nights changed to Skip come off the plan
    const cleared=qpActive(qp).filter(d=>d.level==="skip"&&plan[d.key]&&qp.replace[d.key]).map(d=>d.key);
    if(cleared.length)setPlan(pl=>{const n={...pl};for(const k of cleared)delete n[k];return n;});
    // a switched night starts fresh: its old sides and "made it" go with the old dinner
    const switched=[...Object.keys(add).filter(k=>plan[k]),...cleared];
    if(switched.length){
      setPlanSides(ps=>{const n={...ps};for(const k of switched)delete n[k];return n;});
      setPlanMade(pm=>{const n={...pm};for(const k of switched)delete n[k];return n;});
    }
    // next week starts the same way
    try{
      const rh=qpRhythm();for(const d of qpActive(qp))rh[keyToDate(d.key).getDay()]=d.level;localStorage.setItem("dw-qp-rhythm",JSON.stringify(rh));
      const todayK=dateKey(startOfToday());
      const sk=[...qpSkipped().filter(k=>k>=todayK),...qpActive(qp).filter(d=>d.level==="skip").map(d=>d.key)];
      localStorage.setItem("dw-qp-skipped",JSON.stringify(sk.filter((k,i)=>sk.indexOf(k)===i)));
    }catch{}
    const n=Object.keys(add).length+cleared.length;
    setQp(null);
    const nAdd=Object.keys(add).filter(k=>!plan[k]).length, nSwitch=Object.keys(add).filter(k=>plan[k]).length, nOff=cleared.length;
    const parts=[nAdd?`added ${nAdd}`:"",nSwitch?`switched ${nSwitch}`:"",nOff?`skipped ${nOff}`:""].filter(Boolean);
    if(n)setListToast(parts.length===1&&nAdd?`Added ${nAdd} dinner${nAdd===1?"":"s"} to your plan and list`:`Plan updated: ${parts.join(", ")}`);
  };

  /* ── GROCERY LIST VIEW ── */
  function ListView(){
    const {items,staples,meals}=buildList(listRange);
    const nextMeals=buildList("next").meals;
    const todo=items.filter(x=>!x.checked), cart=items.filter(x=>x.checked);
    const store=RETAILERS.find(r=>r.id===retailer);
    const onList=new Set(listExtras.map(x=>groceryKey(x.name)));
    const shared=!!household&&household.members.length>1;
    const row=(it:ListItem)=>{
      const cb=shared&&it.checked?planMeta?.checkedBy?.[it.id]:null;
      return(
      <li key={it.id} className={`gl-item${it.checked?" done":""}`}>
        <label className="gl-check">
          <input type="checkbox" checked={it.checked} onChange={()=>toggleListItem(it)}/>
          <span className="gl-text">
            <span className="gl-name">{it.name}</span>
            {cb?<span className="gl-note">Checked by {hhName(cb.id,cb.name)} · {ago(cb.at)}</span>:it.note&&<span className="gl-note">{it.note}</span>}
          </span>
        </label>
        {it.amount&&<span className="gl-amt">{it.amount}</span>}
        {store&&!it.checked&&<a className="gl-shop" href={store.url(it.name)} target="_blank" rel="noopener noreferrer" aria-label={`Find ${it.name} at ${store.name}`}>{store.name}</a>}
      </li>
      );
    };
    // someone else checking things off in the last 10 minutes = they're at the store
    const shopper=shared?(()=>{
      const recent=Object.values(planMeta?.checkedBy||{}).filter(c=>c.id!==household!.me&&Date.now()-c.at<10*60000);
      if(!recent.length)return null;
      return {name:recent[0].name,n:recent.filter(c=>c.id===recent[0].id).length};
    })():null;
    const withWho=shared?` · shared with ${household!.members.filter(m=>m.id!==household!.me).map(m=>m.name).join(", ")}`:"";
    const sub=!items.length?"":listRange==="extras"?`${todo.length} to get · things you added`:meals?`${todo.length} to get · from ${meals} planned meal${meals===1?"":"s"}${withWho}`:`${todo.length} to get${withWho}`;
    return(
      <div className="pl-page">
        <div className="pl-head">
          <div>
            <h1 className="ck-title" style={{margin:0}}>Groceries</h1>
            <div className="pl-range" aria-live="polite">{sub}</div>
          </div>
          <div className="rx-shop-select-wrap">
            <span className="rx-shop-dot" style={{background:store?.color||"#CFC6B8"}} aria-hidden="true"/>
            <label htmlFor="gl-store" className="sr-only">Where are you shopping?</label>
            <select id="gl-store" className="rx-shop-select gl-store" value={retailer} onChange={e=>setRetailer(e.target.value)}>
              <option value="">Store</option>
              {RETAILERS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <svg className="rx-shop-chev" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        <div className="gl-ranges" role="tablist" aria-label="Which list">
          {([["this",`This week${listThisWeek.meals?` · ${listThisWeek.meals} meal${listThisWeek.meals===1?"":"s"}`:""}`],["next",`Next week${nextMeals?` · ${nextMeals}`:""}`],["extras","Just extras"]] as [typeof listRange,string][]).map(([k,l])=>(
            <button key={k} role="tab" aria-selected={listRange===k} className={`gl-range${listRange===k?" on":""}`} onClick={()=>setListRange(k)}>{l}</button>
          ))}
        </div>
        {shopper&&<p className="gl-shopper" aria-live="polite"><span className="gl-shopper-dot" aria-hidden="true"/><span><b>{shopper.name} is shopping</b> · {shopper.n} checked off so far</span></p>}
        <form className="gl-add" onSubmit={e=>{e.preventDefault();const parts=listInput.split(/[,\n;]+/).map(x=>x.trim()).filter(Boolean);if(parts.length)addListExtras(parts.map(name=>({name})));setListInput("");}}>
          <label htmlFor="gl-input" className="sr-only">Add an item</label>
          <span aria-hidden="true" className="gl-plus">+</span>
          <input id="gl-input" className="gl-input" value={listInput} onChange={e=>setListInput(e.target.value)} placeholder="Add anything: milk, paper towels…" autoComplete="off" enterKeyHint="done"/>
          {listInput.trim()&&<button type="submit" className="fr-add-btn">Add</button>}
        </form>

        {!items.length&&(
          <div className="gl-empty">
            <p className="gl-empty-title">{listRange==="extras"?"Nothing added yet":listRange==="next"?"Nothing planned for next week yet":"Your list is empty"}</p>
            <p className="gl-empty-text">Meals you add to your plan show up here on their own, grouped by aisle. You can also add a recipe's ingredients from its page, or type anything above.</p>
            <button className="ui-btn-secondary" style={{marginTop:12}} onClick={()=>goNav("week")}>Go to your plan</button>
          </div>
        )}

        {AISLES.map(a=>{
          const rows=todo.filter(x=>x.aisle===a);
          if(!rows.length)return null;
          return(
            <section key={a} className="gl-aisle" aria-label={a}>
              <h2 className="gl-aisle-name"><span>{a}</span><span className="gl-aisle-n">{rows.length}</span></h2>
              <ul className="gl-list">{rows.map(row)}</ul>
            </section>
          );
        })}

        {listRange!=="extras"&&staples.filter(st=>!onList.has(groceryKey(st))).length>0&&(
          <section className="gl-pantry" aria-labelledby="gl-pantry-h">
            <h2 id="gl-pantry-h" className="gl-pantry-title">Probably already in your kitchen</h2>
            <p className="gl-pantry-text">Tap anything you're out of to add it to the list.</p>
            <div className="fr-chips">
              {staples.filter(st=>!onList.has(groceryKey(st))).map(st=>(
                <button key={st} className="fr-chip" onClick={()=>addListExtras([{name:st}])}><span aria-hidden="true">+</span> {st}</button>
              ))}
            </div>
          </section>
        )}

        {cart.length>0&&(
          <section className="gl-aisle gl-cart" aria-label="In the cart">
            <h2 className="gl-aisle-name"><span>In the cart · {cart.length}</span><button className="ck-textlink" style={{alignSelf:"auto",fontSize:14,letterSpacing:0,textTransform:"none",fontWeight:500}} onClick={()=>clearChecked(items)}>Clear checked</button></h2>
            <ul className="gl-list">{cart.map(row)}</ul>
          </section>
        )}
      </div>
    );
  }

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
                  {photosOn&&<button className="pl-thumb" tabIndex={-1} aria-hidden="true" onClick={()=>openMeal(k)}><DishPic title={r.title} src={photoFor(r)} className="pl-pic"/></button>}
                  <button className="pl-meal-title" onClick={()=>openMeal(k)}>{r.title}</button>
                  <button className="pl-remove" aria-label={`Remove ${r.title} from ${shortLabel(k)}`} onClick={()=>removeMeal(k)}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                  </button>
                </div>
                {(tt(r)||(household&&planMeta?.planBy?.[k]))&&<div className="pl-meal-meta">{tt(r)}{household&&planMeta?.planBy?.[k]&&<span className="pl-by">{tt(r)?" · ":""}Added by {hhName(planMeta.planBy[k].id,planMeta.planBy[k].name)}</span>}</div>}
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
                  <button className="pl-add-side" onClick={()=>setPlanPick({recipe:r,sides:[],moveFrom:k})}>Move</button>
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
            <button className="pl-groceries" onClick={()=>goNav("list")}>
              {Ic.cart(17)} Groceries · {listLeft}
            </button>
          )}
        </div>
        {household&&household.members.length>1&&(
          <button className="pl-hh-mini" onClick={()=>setShowHousehold(true)} aria-label={`Shared with ${household.members.filter(m=>m.id!==household.me).map(m=>m.name).join(", ")}. Manage household`}>
            <span className="pl-hh-avs" aria-hidden="true">{household.members.slice(0,4).map((m,i)=><span key={m.id} className="pl-hh-av" style={{background:HH_COLORS[i%HH_COLORS.length]}}>{m.name[0]?.toUpperCase()}</span>)}</span>
            <span>Shared with {household.members.filter(m=>m.id!==household.me).map(m=>m.name).join(", ")}</span>
          </button>
        )}
        {(()=>{
          // the latest change someone else made, until you've seen it
          const a=household&&planMeta?.activity?.find(x=>x.id!==household.me);
          if(!a||a.at<=hhSeenAt||Date.now()-a.at>24*36e5)return null;
          return(
            <p className="pl-activity" aria-live="polite">
              <span className="pl-hh-av" style={{background:HH_COLORS[Math.max(0,household!.members.findIndex(m=>m.id===a.id))%HH_COLORS.length]}} aria-hidden="true">{a.name[0]?.toUpperCase()}</span>
              <span style={{flex:1}}><b>{a.name}</b> {a.text} · {ago(a.at)}</span>
              <button className="pl-activity-x" aria-label="Dismiss" onClick={markHhSeen}><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            </p>
          );
        })()}

        {mealsPlanned===0&&qpOpenDays().length>=3?(
          <section className="qp-card">
            <h2 className="qp-card-title">Plan your week in one tap</h2>
            <p className="qp-card-text">We'll pick dinners that fit how much time you have each night. Swap anything you don't love.</p>
            <button className="qp-card-btn" onClick={openQuickPlan}>Plan my week</button>
          </section>
        ):(
          <button className="qp-slim" onClick={openQuickPlan}>{Ic.shuffle(16)} {qpOpenDays().length?`Plan my week · ${qpOpenDays().length} open night${qpOpenDays().length===1?"":"s"}`:"Plan or switch dinners"}</button>
        )}

        <button className={`pl-earlier${missed.length?" has-missed":""}`} aria-expanded={showEarlier} onClick={()=>setShowEarlier(v=>!v)}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transform:showEarlier?"rotate(180deg)":"none"}}><path d="m6 15 6-6 6 6"/></svg>
          {showEarlier?"Hide earlier days":missed.length?`Earlier · ${missed.length} meal${missed.length===1?"":"s"} you didn't get to`:"Earlier days"}
        </button>
        {showEarlier&&(
          <ol className="pl-days pl-earlier-list">
            {earlierKeys.flatMap((k,i)=>[i===0?null:weekDivider(k),row(k)])}
          </ol>
        )}

        {mealsPlanned===0&&<p className="pl-hint">Or tap <strong>+ Add a meal</strong> on any day to pick from your saved recipes.</p>}
        <ol className="pl-days">
          {aheadKeys.flatMap((k,i)=>[i===0?null:weekDivider(k),row(k)])}
        </ol>
        {planAhead<PLAN_MAX_AHEAD&&(
          <button className="pl-more" onClick={()=>setPlanAhead(n=>Math.min(PLAN_MAX_AHEAD,n+14))}>Show 2 more weeks</button>
        )}
        {!(household&&household.members.length>1)&&(
          <button className="pl-hh-link" onClick={()=>setShowHousehold(true)}>{Ic.family(18)} {household?"Waiting for someone to join your household":"Plan together with your household"}</button>
        )}
      </div>
    );
  }

  /* ── FAMILY VIEW ── */
  function FamilyView(){
    const shared=household&&household.members.length>1;
    const legacy=!!familyCode&&sharedRecipes.length>0;
    const card=(r:any,tag:string,back:string)=>{
      const mine=saved.some((x:any)=>x.id===r.id||sameRecipe(x,r));
      return(
        <div key={(r._savedBy||"")+r.id} className={`recipe-card${photosOn?" has-pic":""}`} onClick={()=>{setReturnTab(back);setPairedSides([]);setActivePane(0);setReturnDayKey(null);setRecipe(r);setServings(null);setStatus("done");setTab("search");}}>
          {photosOn&&<DishPic title={r.title} src={photoFor(r)} className="lib-pic"/>}
          <div className="card-tag">{tag}</div>
          <div className="card-title">{r.title}</div>
          {r.tagline&&<div className="card-desc">{r.tagline}</div>}
          <div className="card-meta">{tt(r)&&<span>{tt(r)}</span>}</div>
          <div onClick={e=>e.stopPropagation()}>
            <button className="fm-save" disabled={mine} onClick={()=>{const {_savedBy,...rest}=r;setSaved(l=>[{...rest,id:Date.now()},...l]);}}>{mine?"In your recipes":"Save to my recipes"}</button>
          </div>
        </div>
      );
    };
    return(
      <div className="fm-wrap">
        {!user?(
          <section className="ui-notice fm-card">
            <h2 className="ui-notice-title">Share with your household</h2>
            <p className="ui-notice-text">Sign in to share a meal plan and grocery list with the people you live with, and see the recipes they save.</p>
            <div className="ui-actions"><button className="ui-btn-primary" onClick={()=>openSignIn()}>Sign in</button></div>
          </section>
        ):shared?(
          hhRecipes.length?(
            <section className="fm-shared">
              <h2 className="pl-week" style={{margin:"8px 0 12px"}}><span>Saved by {household!.members.filter(m=>m.id!==household!.me).map(m=>m.name).join(", ")} · {hhRecipes.length}</span></h2>
              <div className="cards-grid lib-grid">{hhRecipes.map(r=>card(r,`${r._savedBy}'s`,"family"))}</div>
            </section>
          ):(
            <section className="ui-notice fm-card">
              <h2 className="ui-notice-title">Nothing saved yet</h2>
              <p className="ui-notice-text">Recipes {household!.members.filter(m=>m.id!==household!.me).map(m=>m.name).join(" and ")} save will show up here.</p>
            </section>
          )
        ):(
          <section className="ui-notice fm-card">
            <h2 className="ui-notice-title">Share with your household</h2>
            <p className="ui-notice-text">Invite the people you live with to share one meal plan and one grocery list. You'll see the recipes they save here.</p>
            <div className="ui-actions"><button className="ui-btn-primary" onClick={()=>setShowHousehold(true)}>{household?"Invite someone":"Plan together"}</button></div>
          </section>
        )}
        {legacy&&(
          <section className="fm-shared">
            <h2 className="pl-week" style={{margin:"20px 0 6px"}}><span>From your old family code · {sharedRecipes.length}</span></h2>
            <p className="ui-notice-text" style={{margin:"0 0 12px"}}>Family codes have been replaced by households. Save anything you want to keep, then invite your family to your household. <button className="ck-textlink" style={{alignSelf:"auto",fontSize:"inherit"}} onClick={leaveFamilyCode}>Remove these</button></p>
            <div className="cards-grid lib-grid">{sharedRecipes.map(r=>card(r,"Family code","family"))}</div>
          </section>
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
    const allRecipes=[...saved,...hhRecipes.filter(r=>!saved.some(s=>sameRecipe(s,r))),...sharedRecipes.filter(r=>!saved.some(s=>s.id===r.id))];

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
                  <div key={k} className="modal-item" role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();(e.currentTarget as HTMLElement).click();}}} onClick={()=>{if(r){assignMain(k,r);setAssignDay(null);setModalSearch("");}}}>
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
                      <div key={i} className="modal-item" role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();(e.currentTarget as HTMLElement).click();}}} onClick={()=>{addPlanSide(sideDayKey!,s.title);setAssignDay(null);setModalSearch("");}}>
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
                    <div key={i} className="modal-item" role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();(e.currentTarget as HTMLElement).click();}}} onClick={()=>{addPlanSide(sideDayKey!,r.title,r);setAssignDay(null);setModalSearch("");}}>
                      <div className="modal-item-title">{r.title}</div>
                      <div className="modal-item-meta">{tt(r)}</div>
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
                        <div key={r.id} className="modal-item" role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();(e.currentTarget as HTMLElement).click();}}} onClick={()=>{assignMain(dayKey!,r);setAssignDay(null);setModalSearch("");}}>
                          <div className="modal-item-title">{r.title}</div>
                          <div className="modal-item-meta">{tt(r)}</div>
                        </div>
                      ))}
                    </div>
                  )):(
                    filtered.map((r:any)=>(
                      <div key={r.id} className="modal-item" role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();(e.currentTarget as HTMLElement).click();}}} onClick={()=>{assignMain(dayKey!,r);setAssignDay(null);setModalSearch("");}}>
                        <div className="modal-item-title">{r.title}</div>
                        <div className="modal-item-meta">{tt(r)}</div>
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
    {key:"search",match:commFrom==="library"?["search"]:["search","community"],label:"Cook",icon:(n)=>Ic.cook(n),badge:null},
    {key:"week",match:["week"],label:"Plan",icon:(n)=>Ic.calendar(n),badge:mealsPlanned||null},
    {key:"list",match:["list"],label:"List",icon:(n)=>Ic.cart(n),badge:listLeft||null},
    {key:"library",match:commFrom==="library"?["library","saved","family","community"]:["library","saved","family"],label:"Library",icon:(n)=>Ic.library(n),badge:null},
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
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
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
                  <a className="account-dropdown-item" href="/privacy">Privacy policy</a>
                  <a className="account-dropdown-item" href="/terms">Terms of use</a>
                  <a className="account-dropdown-item" href="/support">Help & support</a>
                  <button className="account-dropdown-item danger" onClick={openDeleteAccount}>Delete account</button>
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
      {tab==="list"&&ListView()}
      {Modal()}
      {qp&&(()=>{
        const close=()=>setQp(null);
        const DOWS=["SUN","MON","TUE","WED","THU","FRI","SAT"];
        const todayK=dateKey(startOfToday());
        const date=(k:string)=>{const d=keyToDate(k);return <span className={`qp-date${k===todayK?" today":""}`}><span className="qp-dow">{DOWS[d.getDay()]}</span><span className="qp-dnum">{d.getDate()}</span></span>;};
        const active=qpActive(qp);
        const toFill=active.filter(d=>d.level!=="skip").length;
        const activeKeys=new Set(active.map(d=>d.key));
        const picked=Object.entries(qp.picks).filter(([k,p])=>p&&activeKeys.has(k)).map(([,p])=>p!.recipe);
        const listCount=(()=>{const keys=new Set<string>();for(const r of picked)for(const g of recipeGroceries(r))if(!isStaple(g.name))keys.add(groceryKey(g.name));return keys.size;})();
        const fmtShared=(xs:string[])=>xs.length===1?xs[0]:xs.slice(0,-1).join(", ")+" and "+xs[xs.length-1];
        const shown=qp.days.filter((_,i)=>i<7||qp.week2);
        const divider=(k:string,i:number)=>i===7?<li key={"nw"+k} className="pl-week" aria-hidden="true"><span>Next week</span></li>:null;
        const week2Btn=<button className="qp-week2" onClick={()=>setQp(q=>q&&{...q,week2:!q.week2})}>{qp.week2?"Just this week":"+ Plan next week too"}</button>;
        const nReplace=Object.keys(qp.replace).filter(k=>qp.replace[k]&&plan[k]&&activeKeys.has(k)&&qp.picks[k]).length;
        const nOff=active.filter(d=>d.level==="skip"&&plan[d.key]&&qp.replace[d.key]).length;
        // a read-only look at one night's dinner, without leaving the sheet
        const viewKey=qp.view;
        const viewR:any=viewKey?(plan[viewKey]&&!qp.replace[viewKey]?plan[viewKey]:qp.picks[viewKey]?.recipe):null;
        const backToWeek=()=>{setQp(q=>q&&{...q,view:undefined});requestAnimationFrame(()=>document.querySelector(".qp-sheet")?.scrollTo({top:qpScroll.current}));};
        const recipeView=viewR?(
          <div className="qp-view">
            <button className="rx-back qp-view-back" onClick={backToWeek}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg>
              Your week
            </button>
            {photosOn&&<DishPic title={viewR.title} src={photoFor(viewR)} className="qp-view-pic"/>}
            <h2 id="qp-title" className="share-sheet-title" style={{marginTop:12}}>{viewR.title}</h2>
            {viewR.tagline&&<p className="qp-view-tag">{viewR.tagline}</p>}
            <p className="qp-view-meta">{[tt(viewR),viewR.servings?`Serves ${viewR.servings}`:""].filter(Boolean).join(" · ")}</p>
            <h3 className="qp-view-h">Ingredients</h3>
            {(viewR.ingredient_groups||[]).map((g:any,gi:number)=>(
              <div key={gi}>
                {g.label&&<p className="qp-view-group">{g.label}</p>}
                <ul className="qp-view-ings">{(g.items||[]).map((it:any,ii:number)=><li key={ii}>{[it.amount,it.name].filter(Boolean).join(" ")}</li>)}</ul>
              </div>
            ))}
            <h3 className="qp-view-h">Steps</h3>
            <ol className="qp-view-steps">{(viewR.steps||[]).map((st:any,si:number)=><li key={si}>{typeof st==="string"?st:st?.text||""}</li>)}</ol>
            <div className="qp-view-actions">
              <button className="ui-btn-secondary" onClick={()=>{const k=viewKey!;backToWeek();qpShuffle(k);}}>{Ic.shuffle(16)} Different pick</button>
              <button className="ui-btn-primary" onClick={backToWeek}>Keep this one</button>
            </div>
          </div>
        ):null;
        return(
          <div className="share-overlay" onClick={close}>
            <div className="share-sheet qp-sheet" role="dialog" aria-modal="true" aria-labelledby="qp-title" onClick={e=>e.stopPropagation()}>
              <div className="ui-handle" aria-hidden="true"/>
              <button className="ui-close" aria-label="Close" onClick={close}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
              {qp.stage==="week"&&recipeView?recipeView:qp.stage!=="week"?(
                <>
                  <h2 id="qp-title" className="share-sheet-title">Your week</h2>
                  {qp.err?(
                    <>
                      <p className="inspire-error" role="alert" style={{margin:"4px 0 12px"}}>{qp.err}</p>
                      <button className="ui-btn-primary qp-go" onClick={()=>qpFill()}>Try again</button>
                    </>
                  ):(
                    <>
                      <p className="qp-sub" aria-live="polite">Picking dinners…</p>
                      <ul className="qp-days" aria-hidden="true">
                        {qp.days.slice(0,7).map(d=>(
                          <li key={d.key} className="qp-day"><div className="qp-row">{date(d.key)}<span className="qp-pick"><span className="gen-skel" style={{width:"60%",height:16,margin:"12px 8px"}}/></span></div></li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              ):(
                <>
                  <h2 id="qp-title" className="share-sheet-title">{qp.week2?"Your next two weeks":"Your week"}</h2>
                  <p className="qp-sub">Tap a dinner to see the recipe, or its time to change the night. Tap <span aria-hidden="true">{Ic.shuffle(14)}</span><span className="sr-only">shuffle</span> for a different pick.</p>
                  <ul className="qp-days">
                    {shown.flatMap((d,i)=>{
                      const p=qp.picks[d.key];
                      const kept=plan[d.key]&&!qp.replace[d.key]?plan[d.key]:null;
                      const isOpen=qp.open===d.key;
                      const tapHint={role:"button" as const,tabIndex:0,"aria-expanded":isOpen,onClick:()=>qpToggleRow(d.key),onKeyDown:(e:any)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();qpToggleRow(d.key);}}};
                      const curLevel:QPLevel=kept?"normal":d.level;
                      const prevs=(qp.prev||{})[d.key]||[];
                      const undoBtn=prevs.length>0&&qp.busy!==d.key?(
                        <button className="qp-shuffle qp-undo" aria-label={`Go back to ${prevs[prevs.length-1].pick?.recipe?.title||"the last choice"}`} onClick={()=>qpUndo(d.key)}>
                          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
                        </button>
                      ):null;
                      const see=(title:string)=>({onClick:()=>{const el=document.querySelector(".qp-sheet");qpScroll.current=el?.scrollTop||0;setQp(q=>q&&{...q,view:d.key,open:undefined});requestAnimationFrame(()=>el?.scrollTo({top:0}));},"aria-label":`See the recipe for ${title}`});
                      const when=(label:string)=>(
                        <button className="qp-when" aria-expanded={isOpen} onClick={()=>qpToggleRow(d.key)}>
                          {label}<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d={isOpen?"m6 15 6-6 6 6":"m6 9 6 6 6-6"}/></svg>
                        </button>
                      );
                      return [divider(d.key,i),(
                        <li key={d.key} className={`qp-day${isOpen?" open":""}`}>
                          <div className="qp-row">
                            {date(d.key)}
                            {qp.busy===d.key?(
                              <span className="qp-skipped">Finding a dinner…</span>
                            ):kept?(
                              <span className="qp-pick">
                                {photosOn&&<button className="qp-see-pic" {...see(kept.title)}><DishPic title={kept.title} src={photoFor(kept)} className="qp-pic"/></button>}
                                <span className="qp-pick-text"><button className="qp-see" {...see(kept.title)}>{kept.title}</button>{when("Already planned")}</span>
                                {undoBtn}
                                <button className="qp-shuffle" aria-label={`Swap ${kept.title} for another dinner`} onClick={()=>qpShuffle(d.key)}>{Ic.shuffle(18)}</button>
                              </span>
                            ):d.level==="skip"||!p?(
                              <span className="qp-skipped qp-tap" {...tapHint}>
                                {d.level==="skip"?(plan[d.key]?`Skipped · removes ${plan[d.key].title}`:"Skipped"):`No ${QP_LABEL[d.level].toLowerCase()} dinners left${diets.length?" with your filters":""}`}
                                <span className="qp-change">Change</span>
                              </span>
                            ):null}
                            {qp.busy!==d.key&&!kept&&(d.level==="skip"||!p)?undoBtn:null}
                            {qp.busy===d.key||kept||d.level==="skip"||!p?null:(
                              <span className={`qp-pick${plan[d.key]?" qp-switched":""}`}>
                                {photosOn&&<button className="qp-see-pic" {...see(p.recipe.title)}><DishPic title={p.recipe.title} src={photoFor(p.recipe)} className="qp-pic"/></button>}
                                <span className="qp-pick-text"><button className="qp-see" {...see(p.recipe.title)}>{p.recipe.title}</button>{when(plan[d.key]?`Replaces ${plan[d.key].title}`:p.minutes?`${QP_LABEL[d.level]} · ${totalShort(p.recipe)}`:(totalShort(p.recipe)||"Your pick"))}</span>
                                {undoBtn}
                                <button className="qp-shuffle" aria-label={`Swap ${p.recipe.title} for another dinner`} onClick={()=>qpShuffle(d.key)}>{Ic.shuffle(18)}</button>
                              </span>
                            )}
                          </div>
                          {isOpen&&(
                            <div className="qp-edit">
                              <span className="qp-seg" role="radiogroup" aria-label="How much time">
                                {QP_LEVELS.map(([v,l])=>(
                                  <button key={v} role="radio" aria-checked={!kept&&curLevel===v} className={`qp-opt${!kept&&curLevel===v?" on":""}${v==="skip"?" skip":""}${v==="long"?" long":""}`} onClick={()=>qpSetLevel(d.key,v)}>{l}</button>
                                ))}
                              </span>
                              <span className="qp-legend" style={{margin:0}}>Quick is about 40 min or less · Normal 40–75 · Take my time is longer</span>
                              <label htmlFor={`qp-find-${d.key}`} className="sr-only">Find a dish for this night</label>
                              <input id={`qp-find-${d.key}`} className="fr-input qp-find" value={qpQuery} onChange={e=>setQpQuery(e.target.value)} placeholder="Or find a dish: tacos, lasagna…" autoComplete="off" enterKeyHint="search"/>
                              {qpHits.length>0&&(
                                <ul className="qp-hits">
                                  {qpHits.map((h,hi)=>(
                                    <li key={hi}><button className="qp-hit" onClick={()=>qpChoose(d.key,h)}><span className="qp-hit-t">{h.title}</span><span className="qp-hit-m">{h.from==="mine"?"Your recipe":"Community"}{h.total?` · ${h.total}`:""}</span></button></li>
                                  ))}
                                </ul>
                              )}
                              {qpQuery.trim().length>=3&&!qpHits.length&&<p className="qp-nohit">Nothing saved by that name yet. You can make it from the Cook tab, then plan it.</p>}
                            </div>
                          )}
                        </li>
                      )];
                    })}
                  </ul>
                  {!qp.week2&&<button className="qp-week2" disabled={qp.busy==="week2"} onClick={qpFillWeek2}>{qp.busy==="week2"?"Picking next week…":"+ Plan next week too"}</button>}
                  {(qp.shared.length>0||listCount>0)&&<p className="qp-note">{qp.shared.length>0?`Uses ${fmtShared(qp.shared)} more than once, so less goes to waste. `:""}{listCount?`Adds ${listCount} item${listCount===1?"":"s"} to your list.`:""}</p>}
                  <button className="ui-btn-primary qp-go" disabled={!picked.length&&!nOff} onClick={qpAdd}>{(()=>{const a=picked.length-nReplace;const parts=[a?`Add ${a} dinner${a===1?"":"s"}`:"",nReplace?`switch ${nReplace}`:"",nOff?`skip ${nOff}`:""].filter(Boolean);if(!parts.length)return "Nothing to add";const t=parts.join(", ").replace(/, ([^,]*)$/," and $1");return t[0].toUpperCase()+t.slice(1);})()}</button>
                </>
              )}
            </div>
          </div>
        );
      })()}
        {showNutri&&(()=>{
        const n=nutri[nutriKey(recipe)];
        if(!recipe||!n||typeof n!=="object")return null;
        const kc={p:n.protein*4,c:n.carbs*4,f:n.fat*9};const tot=kc.p+kc.c+kc.f||1;
        const close=()=>setShowNutri(false);
        const bar=(label:string,g:number,part:number,color:string)=>{const pct=Math.round(part/tot*100);return(
          <div className="nu-bar"><div className="nu-bar-top"><span><b>{label}</b> {g}g</span><span>{pct}% of calories</span></div><span className="nu-track"><span style={{width:`${pct}%`,background:color}}/></span></div>
        );};
        return(
          <div className="share-overlay" onClick={close}>
            <div className="share-sheet" role="dialog" aria-modal="true" aria-labelledby="nu-title" onClick={e=>e.stopPropagation()}>
              <div className="ui-handle" aria-hidden="true"/>
              <button className="ui-close" aria-label="Close" onClick={close}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
              <h2 id="nu-title" className="share-sheet-title">Nutrition</h2>
              <p className="nu-sub">Per serving{servesOf(recipe)>1?`: ${fracOf(servesOf(recipe))} of the recipe, which serves ${servesOf(recipe)}`:""}</p>
              <p className="nu-cal"><strong>{n.calories}</strong> calories</p>
              {(()=>{const sv=servesOf(recipe);if(sv<2||sv>10)return null;const alts=[sv+2,sv+4].map(m=>`${m} pieces: about ${Math.round(n.calories*sv/m/10)*10}`);return <p className="nu-alt">Smaller portions · {alts.join(" · ")} calories each</p>;})()}
              {bar("Protein",n.protein,kc.p,"#2F6B3A")}
              {bar("Carbs",n.carbs,kc.c,"#F4A021")}
              {bar("Fat",n.fat,kc.f,"#B36A00")}
              <div className="nu-more">
                {([[`${n.fiber}g`,"fiber"],[`${n.sugar}g`,"sugar"],[`${n.sodium.toLocaleString()}mg`,"sodium"]] as [string,string][]).map(([v,l])=><span key={l}><strong>{v}</strong><span>{l}</span></span>)}
              </div>
              <p className="nu-note">An estimate worked out from this recipe's ingredients and amounts, not a lab test. Brands and portion sizes change the real numbers.</p>
              <button className="ui-btn-primary" style={{width:"100%"}} onClick={close}>Done</button>
            </div>
          </div>
        );
      })()}
      {showDietSheet&&(
        <div className="share-overlay" onClick={()=>setShowDietSheet(false)}>
          <div className="share-sheet" role="dialog" aria-modal="true" aria-labelledby="diet-title" onClick={e=>e.stopPropagation()}>
            <div className="ui-handle" aria-hidden="true"/>
            <button className="ui-close" aria-label="Close" onClick={()=>setShowDietSheet(false)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            <h2 id="diet-title" className="share-sheet-title">How do you eat?</h2>
            <p className="diet-sub">Every search, plan and suggestion follows this. Pick as many as you like.</p>
            <div className="diet-grid" role="group" aria-label="Diets">
              {DIETS.map(d=>(
                <button key={d} aria-pressed={diets.includes(d)} className={`diet-opt${diets.includes(d)?" on":""}`} onClick={()=>toggleDiet(d)}>
                  {diets.includes(d)&&<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>}{d}
                </button>
              ))}
            </div>
            <div className="diet-actions">
              {diets.length>0&&<button className="ck-textlink" onClick={()=>setDiets([])}>Clear</button>}
              <button className="ui-btn-primary diet-done" onClick={()=>setShowDietSheet(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
      {showHousehold&&(()=>{
        const close=()=>{setShowHousehold(false);setHhInvite(null);setHhMsg("");setHhConfirm(null);};
        const others=household?household.members.filter(m=>m.id!==household.me):[];
        const owner=!!household&&household.owner===household.me;
        const check=<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2F6B3A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>;
        return(
          <div className="share-overlay" onClick={close}>
            <div className="share-sheet hh-sheet" role="dialog" aria-modal="true" aria-labelledby="hh-title" onClick={e=>e.stopPropagation()}>
              <div className="ui-handle" aria-hidden="true"/>
              <button className="ui-close" aria-label="Close" onClick={close}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
              <h2 id="hh-title" className="share-sheet-title">{others.length?"Your household":"Plan together"}</h2>
              {!others.length&&<p className="hh-lede">Share one meal plan and one grocery list with the people you live with. Everyone sees changes as they happen.</p>}
              {others.length>0?(
                <ul className="hh-members">
                  {household!.members.map((m,i)=>(
                    <li key={m.id} className="hh-member">
                      <span className="pl-hh-av hh-av" style={{background:HH_COLORS[i%HH_COLORS.length]}} aria-hidden="true">{m.name[0]?.toUpperCase()}</span>
                      <span className="hh-member-name">{m.name}{m.id===household!.me?" (you)":""}{m.id===household!.owner?<span className="hh-owner"> · started it</span>:null}</span>
                      {owner&&m.id!==household!.me&&(hhConfirm===m.id?(
                        <span className="hh-confirm"><button className="hh-danger" disabled={hhBusy} onClick={()=>leaveOrRemove(m.id)}>Remove</button><button className="ck-textlink" style={{alignSelf:"auto"}} onClick={()=>setHhConfirm(null)}>Cancel</button></span>
                      ):<button className="ck-textlink" style={{alignSelf:"auto"}} onClick={()=>setHhConfirm(m.id)}>Remove</button>)}
                    </li>
                  ))}
                </ul>
              ):(
                <div className="hh-box">
                  <span className="hh-box-label">What you share</span>
                  <p className="hh-row">{check}<span><b>Meal plan.</b> Anyone can add, move or swap a meal.</span></p>
                  <p className="hh-row">{check}<span><b>Grocery list.</b> Checks show up for everyone as you shop.</span></p>
                  <p className="hh-row">{check}<span><b>Saved recipes.</b> See each other's in Library, under Household.</span></p>
                  <span className="hh-box-label" style={{marginTop:6}}>Stays yours</span>
                  <p className="hh-row" style={{color:"#4F4744"}}>Your Library, edits to your own recipes, and your dietary settings.</p>
                </div>
              )}
              {hhInvite?(
                <div className="hh-invite">
                  <label htmlFor="hh-link" className="hh-box-label">Send this link</label>
                  <div className="hh-link-row">
                    <input id="hh-link" className="fr-input" readOnly value={hhInvite.url} onFocus={e=>e.currentTarget.select()}/>
                    <button className="fr-add-btn" onClick={()=>{navigator.clipboard?.writeText(hhInvite.url).then(()=>setHhInvite({...hhInvite,copied:true})).catch(()=>{});}}>{hhInvite.copied?"Copied":"Copy"}</button>
                  </div>
                  <p className="hh-fine">Works for two weeks. They'll need a free account.</p>
                </div>
              ):(
                <>
                  <button className="ui-btn-primary hh-wide" disabled={hhBusy} onClick={inviteToHousehold}>{hhBusy?"One moment…":user?"Invite someone":"Sign in to invite someone"}</button>
                  {!others.length&&<p className="hh-fine">Sends a link by text or email. They'll need a free account.</p>}
                </>
              )}
              {hhMsg&&<p className="inspire-error" role="alert" style={{margin:"10px 0 0"}}>{hhMsg}</p>}
              {household&&(hhConfirm==="leave"?(
                <div className="hh-leave-confirm">
                  <p>Leave the household? You'll keep a copy of the plan and list as they are now.</p>
                  <span className="hh-confirm"><button className="hh-danger" disabled={hhBusy} onClick={()=>leaveOrRemove("leave")}>Leave</button><button className="ck-textlink" style={{alignSelf:"auto"}} onClick={()=>setHhConfirm(null)}>Cancel</button></span>
                </div>
              ):<button className="hh-leave" onClick={()=>setHhConfirm("leave")}>{others.length?"Leave household":"Stop sharing"}</button>)}
            </div>
          </div>
        );
      })()}
      {addSheet&&(()=>{
        const on=addSheet.items.filter(x=>x.on);
        const close=()=>setAddSheet(null);
        const planDay=addSheet.plannedOn?keyToDate(addSheet.plannedOn).toLocaleDateString("en-US",{weekday:"long"}):"";
        return(
          <div className="share-overlay" onClick={close}>
            <div className="share-sheet gl-sheet" role="dialog" aria-modal="true" aria-labelledby="gl-sheet-title" onClick={e=>e.stopPropagation()}>
              <div className="ui-handle" aria-hidden="true"/>
              <button className="ui-close" aria-label="Close" onClick={close}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
              <h2 id="gl-sheet-title" className="share-sheet-title">Add to your grocery list</h2>
              <p className="share-sheet-dish">{addSheet.recipe.title}</p>
              {addSheet.plannedOn?(
                <>
                  <p className="gl-sheet-note">This is planned for {planDay}, so its ingredients are already on your list.</p>
                  <button className="ui-btn-primary" onClick={()=>{close();goNav("list");}}>Open my list</button>
                </>
              ):(
                <>
                  <p className="gl-sheet-note">Untick anything you already have.</p>
                  <ul className="gl-sheet-list">
                    {addSheet.items.map((it,i)=>(
                      <li key={i}>
                        <label className="gl-check">
                          <input type="checkbox" checked={it.on} onChange={()=>setAddSheet(s=>s&&({...s,items:s.items.map((x,j)=>j===i?{...x,on:!x.on}:x)}))}/>
                          <span className="gl-text"><span className="gl-name" style={it.on?undefined:{color:"#9A8F88"}}>{displayName(it.name)}{it.amount?<span className="gl-sheet-amt"> · {it.amount}</span>:null}</span></span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  {addSheet.staples.length>0&&<p className="gl-sheet-staples">Left off as pantry staples: {addSheet.staples.map(x=>displayName(x).toLowerCase()).join(", ")}.</p>}
                  <button className="ui-btn-primary" disabled={!on.length} onClick={()=>{
                    addListExtras(on.map(x=>({name:x.name,amount:x.amount,recipe:addSheet.recipe.title})));
                    setListToast(`Added ${on.length} item${on.length===1?"":"s"} to your list`);close();
                  }}>{on.length?`Add ${on.length} item${on.length===1?"":"s"}`:"Nothing to add"}</button>
                </>
              )}
            </div>
          </div>
        );
      })()}
      {listToast&&(
        <div className="gl-toast" role="status">
          <span>{listToast}</span>
          <button onClick={()=>{setListToast("");goNav("list");}}>View list</button>
        </div>
      )}
      {planPick&&(()=>{
        const r=planPick.recipe;
        const days=Array.from({length:14},(_,i)=>dateKey(addDays(startOfToday(),i)));
        const pick=(k:string,withSides:boolean)=>{
          if(planPick.moveFrom){ // moving a planned dinner: trade places with whatever is on that day
            const from=planPick.moveFrom;
            setPlan(p=>{const n={...p};const there=n[k];n[k]=n[from];if(there)n[from]=there;else delete n[from];return n;});
            setPlanSides(p=>{const n={...p};const a=n[from],b=n[k];if(a)n[k]=a;else delete n[k];if(b)n[from]=b;else delete n[from];return n;});
            setPlanMade(p=>{const n={...p};delete n[from];delete n[k];return n;});
            setPlanPick(null);setPlanToast({day:k,title:r.title});return;
          }
          assignMain(k,r);
          const sides=withSides?planPick.sides.map((x:any)=>({title:x.title,status:"done",recipe:x.recipe})):[];
          setPlanSides(p=>{const n={...p};if(sides.length)n[k]=sides;else delete n[k];return n;});
          setPlanPick(null);
          setPlanToast({day:k,title:r.title});
        };
        return(
          <div className="share-overlay" onClick={()=>setPlanPick(null)}>
            <div className="share-sheet pp-sheet" role="dialog" aria-modal="true" aria-labelledby="pp-title" onClick={e=>e.stopPropagation()}>
              <div className="ui-handle" aria-hidden="true"/>
              <button className="ui-close" aria-label="Close" onClick={()=>setPlanPick(null)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
              <h2 id="pp-title" className="share-sheet-title">{planPick.moveFrom?"Move to another day":"Add to your plan"}</h2>
              <p className="share-sheet-dish">{r.title}{planPick.sides.length>0?` with ${planPick.sides.map((x:any)=>x.title).join(", ")}`:""}</p>
              <ul className="pp-days">
                {days.map((k,i)=>{
                  const cur=plan[k];
                  const same=planPick.moveFrom?k===planPick.moveFrom:!!cur&&sameRecipe(cur,planPick.recipe);
                  const d=keyToDate(k);
                  return(
                    <li key={k}>
                      <button className={`pp-day${same?" same":cur?" taken":" open"}`} disabled={same} onClick={()=>pick(k,planPick.sides.length>0)}>
                        <span className="pp-date"><span className="pp-dow">{["SUN","MON","TUE","WED","THU","FRI","SAT"][d.getDay()]}</span><span className="pp-dnum">{d.getDate()}</span></span>
                        <span className="pp-text">
                          <span className="pp-label">{i===0?"Today":i===1?"Tomorrow":d.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</span>
                          <span className="pp-meta">{same?(planPick.moveFrom?"Planned here now":"Already planned"):cur?cur.title:"Open"}</span>
                        </span>
                        {cur&&!same&&photosOn&&photoFor(cur)&&<span className="pp-thumb"><DishPic title={cur.title} src={photoFor(cur)} className="pp-pic"/></span>}
                        <span className="pp-tag">{same?"✓":cur?(planPick.moveFrom?"Swap":"Replace"):planPick.moveFrom?"Move":"+ Add"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })()}
      {planToast&&(
        <div className="pp-toast" role="status">
          <span className="pp-toast-text">Added to {planToast.day===dateKey(startOfToday())?"today":planToast.day===dateKey(addDays(startOfToday(),1))?"tomorrow":keyToDate(planToast.day).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
          <button onClick={()=>{setPlanToast(null);if(tab==="search"&&status==="done")leaveRecipe();setTab("week");window.scrollTo({top:0});}}>View plan</button>
        </div>
      )}
      {nameClash&&!planToast&&(
        <div className="pp-toast" role="status">
          <span className="pp-toast-text" style={{whiteSpace:"normal"}}>You already have a recipe called {nameClash.title}.</span>
          {recipe?.id===nameClash.id&&status==="done"
            ?<button onClick={()=>{setNameClash(null);setEditRecipe(JSON.parse(JSON.stringify(recipe)));setStepRewrite("idle");setStepsSyncedFor("");setShowEditPanel(true);}}>Rename</button>
            :<button onClick={()=>setNameClash(null)}>OK</button>}
        </div>
      )}
      {showAccountSheet&&user&&(
        <div className="account-sheet-overlay" onClick={()=>setShowAccountSheet(false)}>
          <div className="account-sheet" role="dialog" aria-modal="true" aria-label="Account" onClick={e=>e.stopPropagation()}>
            <div className="ui-handle" aria-hidden="true"/>
            <div className="account-sheet-user">
              {user.imageUrl?<img className="account-sheet-avatar" src={user.imageUrl} alt=""/>:<div className="account-sheet-avatar-placeholder">{userInitial}</div>}
              <div>
                <div className="account-sheet-name">{user.firstName||"My Account"}</div>
                <div className="account-sheet-email">{user.emailAddresses?.[0]?.emailAddress||""}</div>
              </div>
            </div>
            <label className="account-toggle">
              <span><b>Show my name on recipes I share</b><span>People who make their own version see "Adapted from … by {user.firstName||"you"}". Off: "Adapted from a shared recipe".</span></span>
              <input type="checkbox" role="switch" checked={shareName} onChange={e=>{setShareName(e.target.checked);try{localStorage.setItem("dw-share-name",e.target.checked?"1":"0");}catch{}}}/>
            </label>
            <div className="account-sheet-actions">
              <button className="account-sheet-btn danger" onClick={doSignOut}>Sign out</button>
              <a className="account-sheet-btn" href="/privacy">Privacy policy</a>
              <a className="account-sheet-btn" href="/terms">Terms of use</a>
              <a className="account-sheet-btn" href="/support">Help & support</a>
              <button className="account-sheet-btn danger account-delete" onClick={openDeleteAccount}>Delete account</button>
            </div>
            <button className="account-sheet-cancel" onClick={()=>setShowAccountSheet(false)}>Cancel</button>
          </div>
        </div>
      )}
      {reportFor&&(
        <div className="account-sheet-overlay" onClick={()=>reportState!=="sending"&&setReportFor(null)}>
          <div className="account-sheet" role="dialog" aria-modal="true" aria-labelledby="rp-title" onClick={e=>e.stopPropagation()}>
            <div className="ui-handle" aria-hidden="true"/>
            {reportState==="sent"?(
              <>
                <h2 id="rp-title" className="signout-confirm-title" style={{margin:"8px 16px 4px"}}>Thanks for letting us know</h2>
                <p className="signout-confirm-sub" style={{margin:"0 16px 12px"}}>We'll take a look at {reportFor.title} and remove it if it breaks our rules.</p>
                <button className="account-sheet-cancel" onClick={()=>setReportFor(null)}>Done</button>
              </>
            ):(
              <>
                <h2 id="rp-title" className="signout-confirm-title" style={{margin:"8px 16px 4px"}}>What's wrong with this recipe?</h2>
                <div className="account-sheet-actions">
                  {["Offensive or inappropriate","Not a real recipe","Unsafe or wrong instructions","Copied without permission","Something else"].map(reason=>(
                    <button key={reason} className="account-sheet-btn" disabled={reportState==="sending"} onClick={async()=>{
                      setReportState("sending");
                      const share=reportFor._shareFrom;
                      await fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:share?"share":"community",target:share||reportFor._dish||reportFor.title,title:reportFor.title,reason})}).catch(()=>{});
                      setReportState("sent");
                    }}>{reason}</button>
                  ))}
                </div>
                <button className="account-sheet-cancel" onClick={()=>setReportFor(null)}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}
      {deleteStage!=="closed"&&(
        <div className="signout-confirm-overlay" onClick={()=>deleteStage!=="deleting"&&setDeleteStage("closed")}>
          <div className="signout-confirm" role="alertdialog" aria-modal="true" aria-labelledby="da-title" aria-describedby="da-desc" onClick={e=>e.stopPropagation()}>
            <h2 id="da-title" className="signout-confirm-title">Delete your account?</h2>
            <p id="da-desc" className="signout-confirm-sub">This permanently deletes your account, saved recipes, meal plan and any links you've shared. It can't be undone.{deleteStage==="error"&&<><br/><strong style={{color:"#B8340F"}}>Something went wrong. Please try again.</strong></>}</p>
            <div className="signout-confirm-btns">
              <button className="signout-confirm-cancel" disabled={deleteStage==="deleting"} onClick={()=>setDeleteStage("closed")}>Cancel</button>
              <button className="signout-confirm-go" disabled={deleteStage==="deleting"} onClick={confirmDeleteAccount}>{deleteStage==="deleting"?"Deleting…":"Delete account"}</button>
            </div>
          </div>
        </div>
      )}
      {showSignOutConfirm&&(
        <div className="signout-confirm-overlay" onClick={()=>setShowSignOutConfirm(false)}>
          <div className="signout-confirm" role="alertdialog" aria-modal="true" aria-labelledby="so-title" aria-describedby="so-desc" onClick={e=>e.stopPropagation()}>
            <h2 id="so-title" className="signout-confirm-title">Sign out?</h2>
            <p id="so-desc" className="signout-confirm-sub">Your recipes and meal plan are saved to your account and will be here when you sign back in.</p>
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
        const rr=(r===recipe||(r?.id!=null&&r.id===recipe?.id))?ratio:1;
        const amt=(a:string)=>renderAmount(normalizeAmount(rr===1?(a||""):scaleAmt(a||"",rr)));
        const idx=cookStep;
        const last=steps.length;
        const stepText=idx>0?steps[idx-1]:"";
        const stepIngs=idx>0?(stepIngredientMap(r)[idx-1]||[]).map(n=>allIngs[n]).filter(Boolean):[];
        const timers=idx>0?stepTimers(stepText):[];
        const now=Date.now();
        const otherTimers=Object.entries(cookTimers).filter(([k])=>Number(k.split(".")[0])!==idx).map(([k,t])=>({key:k,step:Number(k.split(".")[0]),t,left:Math.max(0,Math.ceil((t.end-now)/1000))}));
        const go=(n:number)=>{const to=Math.max(0,Math.min(last,n));if(to===idx)return;setCookStep(to);if(readAloud){unlockAudio();say(stepSpeech(r,to));if(to<last)ttsUrl(stepSpeech(r,to+1));}};
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
              <button className={`cook-voice${readAloud?" on":""}`} aria-pressed={readAloud} aria-label={readAloud?"Stop reading steps out loud":"Read steps out loud"} onClick={toggleReadAloud}>
                {readAloud
                  ?<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>
                  :<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6M21 9l-5 6"/></svg>}
                <span>{readAloud?"Reading":"Read aloud"}</span>
              </button>
              <div className="cook-count">{idx===0?"Get ready":`${idx} / ${last}`}</div>
            </div>
            <div className="cook-progress" aria-hidden="true"><div style={{width:`${last?(idx/last)*100:0}%`}}/></div>

            {otherTimers.length>0&&(
              <div className="cook-timer-strip">
                {otherTimers.map(o=>(
                  <button key={o.key} className={`cook-timer-pill${o.t.done?" done":""}`} onClick={()=>go(o.step)}>
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
                  {!r._scanned&&!r._imported&&!r._author&&<p className="ai-note cook-ai-note">Written with AI. Check for allergens, and cook meat, poultry, fish and eggs to safe temperatures.</p>}
                </>
              ):(
                <>
                  <div className="cook-eyebrow">Step {idx}</div>
                  <p className="cook-step-text">{stepText}</p>
                  {readAloud&&<button className="cook-again" onClick={()=>{unlockAudio();say(stepSpeech(r,idx));}}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
                    Read it again
                  </button>}
                  {timers.length>0&&(
                    <div className={`cook-timers${timers.length>1?" stacked":""}`}>
                      {timers.map((tm,ti)=>{
                        const key=`${idx}.${ti}`,timer=cookTimers[key];
                        const remaining=timer?Math.max(0,Math.ceil((timer.end-now)/1000)):0;
                        const label=timers.length>1&&<span className="cook-timer-for">{tm.label}</span>;
                        return !timer?(
                          <button key={key} className="cook-timer-start" onClick={()=>startCookTimer(key,tm.secs)}>
                            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>
                            <span className="cook-timer-text"><span>Start {fmtDuration(tm.secs)} timer</span>{label}</span>
                          </button>
                        ):timer.done?(
                          <div key={key} className="cook-timer done" role="status">
                            <span className="cook-timer-text"><span className="cook-timer-time">Time's up</span>{label}</span>
                            <button className="cook-timer-btn" onClick={()=>clearCookTimer(key)}>Dismiss</button>
                          </div>
                        ):(
                          <div key={key} className="cook-timer" role="timer" aria-live="off">
                            <span className="cook-timer-text"><span className="cook-timer-time">{fmtClock(remaining)}</span>{label}</span>
                            <button className="cook-timer-btn" onClick={()=>clearCookTimer(key)}>Cancel</button>
                          </div>
                        );
                      })}
                    </div>
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
          navigator.share({title:sr.title,text:shareMode==="original"?sr.title:`Check out this recipe on Every Chef: ${sr.title}`,url:shareUrl}).catch(()=>{});
        };
        return(
          <div className="share-overlay" onClick={()=>setShowShare(false)}>
            <div className="share-sheet" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={e=>e.stopPropagation()}>
              <div className="ui-handle" aria-hidden="true"/>
              <button className="ui-close" aria-label="Close" onClick={()=>setShowShare(false)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
              {shareMode==="ask"?(
                <>
                  <h2 id="share-title" className="share-sheet-title">Is this your own or a family recipe?</h2>
                  <p className="share-ask-sub">Shared recipes get a public link, so only share recipes that are yours to share.</p>
                  <div className="share-ask">
                    <button className="share-ask-opt" onClick={()=>shareRecipe(sr,{confirmedOwn:true})}><strong>Yes, it's mine to share</strong><span>I wrote it, or it's a family recipe</span></button>
                    <button className="share-ask-opt" onClick={()=>setShareMode("private")}><strong>It's from a cookbook, magazine or website</strong><span>Keep it in my Library</span></button>
                  </div>
                </>
              ):shareMode==="private"?(
                <>
                  <h2 id="share-title" className="share-sheet-title">This one stays in your Library</h2>
                  <p className="share-ask-sub">{sr._imported?"We couldn't find the original link for this recipe, so it can't be shared from Every Chef.":"Recipes from cookbooks, magazines and websites belong to their authors, so Every Chef keeps them private to you. You can still cook, plan and add it to a family collection."}</p>
                  <button className="share-native-btn" onClick={()=>setShowShare(false)}>Got it</button>
                </>
              ):(<>
              <h2 id="share-title" className="share-sheet-title">{shareMode==="original"?"Share the original":"Share recipe"}</h2>
              <div className="share-sheet-dish">{sr.title}</div>
              {shareMode==="original"&&<p className="share-ask-sub">{(()=>{let h="";try{h=new URL(sr._sourceUrl).hostname.replace(/^www\./,"");}catch{}return sr._author?`This recipe is by @${String(sr._author).replace(/^@/,"")}, so we'll share their original post.`:`This recipe is from ${h||"another site"}, so we'll share the original link. That way the creator gets the credit.`;})()}</p>}
              <div className="share-url-row">
                <div className="share-url-text" style={{color:shareLoading?"#9A8F88":"#151210"}}>{displayUrl}</div>
                <button id="share-copy-btn" className="share-copy-btn" onClick={doCopy} disabled={!shareUrl||shareLoading}>
                  {shareLoading?"…":"Copy"}
                </button>
              </div>
              {qrSrc?(
                <div className="share-qr">
                  <img src={qrSrc} alt={`QR code for ${sr.title}`}/>
                  <div className="share-qr-label">Scan with a phone camera to open</div>
                </div>
              ):(
                <div className="share-qr" aria-busy="true">
                  <div className="gen-skel" style={{width:180,height:180,borderRadius:12}}/>
                  <div className="share-qr-label">Making a QR code…</div>
                </div>
              )}
              {typeof navigator!=="undefined"&&"share" in navigator&&shareUrl&&(
                <button className="share-native-btn" onClick={doNativeShare}>
                  {Ic.share(18)} Share with…
                </button>
              )}
              </>)}
            </div>
          </div>
        );
      })()}
      {/* QR Scanner */}
      {showQrScanner&&(
        <div className="qr-scan-overlay" onClick={stopQrScanner}>
          <div className="qr-scan-sheet" role="dialog" aria-modal="true" aria-labelledby="qr-title" onClick={e=>e.stopPropagation()}>
            <div className="ui-handle" aria-hidden="true"/>
            <button className="ui-close" aria-label="Close scanner" onClick={stopQrScanner}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            <h2 id="qr-title" className="qr-scan-title">Scan a recipe code</h2>
            <p className="qr-scan-sub">Point your camera at an Every Chef QR code. The recipe opens right here.</p>
            <div className="qr-scan-frame">
              {qrStatus==="error"?(
                <div className="qr-scan-status" style={{flexDirection:"column",gap:12}}>
                  <div>{qrErr}</div>
                  <button className="qr-scan-retry" onClick={openQrScanner} style={{width:"auto",padding:"0 22px"}}>Try again</button>
                </div>
              ):qrStatus==="starting"?(
                <div className="qr-scan-status" role="status">Opening your camera…</div>
              ):qrStatus==="loading"?(
                <div className="qr-scan-status" role="status" style={{flexDirection:"column",gap:12}}>
                  <div className="gen-bar gen-bar-indeterminate" style={{width:"60%"}}><div/></div>
                  Opening the recipe…
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
          <div className="edit-panel" role="dialog" aria-modal="true" aria-labelledby="edit-title" onClick={e=>e.stopPropagation()}>
            <div className="ui-handle" aria-hidden="true"/>
            <div className="edit-panel-header">
              <h2 id="edit-title" className="edit-panel-title">Edit recipe</h2>
              <button className="ui-close" aria-label="Close without saving" onClick={()=>setShowEditPanel(false)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            </div>
            <div className="edit-panel-body">
              {/* Title */}
              <label htmlFor="edit-title-input" className="edit-section-label" style={{display:"block"}}>Title</label>
              <input id="edit-title-input" className="edit-title-input"
                value={editRecipe.title||""}
                onChange={e=>setEditRecipe((r:any)=>({...r,title:e.target.value}))}
              />
              {!editRecipe._adapt&&(originOf(editRecipe)||editRecipe._origin?.off)&&(()=>{const o=editRecipe._origin||{q:editRecipe._dish,title:""};return(
                <>
                  <div className="edit-section-label">Credit</div>
                  {o.off?(
                    <p className="edit-credit-note">Credit removed. <button className="ck-textlink" style={{display:"inline",padding:0}} onClick={()=>setEditRecipe((r:any)=>({...r,_origin:{...o,off:false}}))}>Put it back</button></p>
                  ):(
                    <div className="edit-credit">
                      <span>Adapted from <b>{o.title||"the original"}</b> in the Community</span>
                      <button className="edit-credit-remove" onClick={()=>setEditRecipe((r:any)=>({...r,_origin:{...o,off:true}}))}>Remove</button>
                    </div>
                  )}
                </>);})()}
              {editRecipe._adapt?.slug&&(
                <>
                  <div className="edit-section-label">Credit</div>
                  {editRecipe._adapt.off?(
                    <p className="edit-credit-note">Credit removed. <button className="ck-textlink" style={{display:"inline",padding:0}} onClick={()=>setEditRecipe((r:any)=>({...r,_adapt:{...r._adapt,off:false}}))}>Put it back</button></p>
                  ):(
                    <div className="edit-credit">
                      <span>Adapted from <b>{editRecipe._adapt.title||"a shared recipe"}</b>{editRecipe._adapt.by?` by ${editRecipe._adapt.by}`:""}</span>
                      <button className="edit-credit-remove" onClick={()=>setEditRecipe((r:any)=>({...r,_adapt:{...r._adapt,off:true}}))}>Remove</button>
                    </div>
                  )}
                  {!editRecipe._adapt.off&&<p className="edit-credit-note">Changed it so much it's really yours? Remove the credit.</p>}
                </>
              )}
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
                const missing=unusedIngs(editRecipe).filter((i:any)=>!/^(salt|pepper|black pepper|kosher salt|sea salt|water)\b/i.test(i.name||"")&&!/to taste|garnish|for serving/i.test(`${i.amount||""} ${i.name||""}`));
                if(!missing.length)return null;
                return <div className="edit-unused" role="note">Not used in any step yet: <strong>{missing.map((i:any)=>(i.name||"").split(/[,(]/)[0].trim()).join(", ")}</strong>. {removedIngs(editRecipe,recipe).length?"Saving will work new ingredients into the steps.":"Add it to a step so it doesn't get missed."}</div>;
              })()}
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
                    const res=await rewriteStepsWithout(editRecipe,names,removedIngs(editRecipe,recipe).map((r:any)=>(r.name||"").split(/[,(]/)[0].trim()).filter(Boolean));
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
                // ...and when ingredients were added that no step uses yet, so they get worked into the method
                const addedNames=removedIngs(edited,recipe).map((r:any)=>(r.name||"").split(/[,(]/)[0].trim()).filter(Boolean);
                const addedUnused=unusedIngs(edited).filter((i:any)=>addedNames.some(a=>normIng(a)===normIng((i.name||"").split(/[,(]/)[0]))&&!/^(salt|pepper|black pepper|kosher salt|sea salt|water)\b/i.test(i.name||"")&&!/to taste|garnish|for serving/i.test(`${i.amount||""} ${i.name||""}`));
                if(((names.length&&stepsSyncedFor!==key)||addedUnused.length)&&stepRewrite!=="error"&&(edited.steps||[]).length){
                  setStepRewrite("loading");
                  try{
                    const res=await rewriteStepsWithout(edited,names,removedIngs(edited,recipe).map((r:any)=>(r.name||"").split(/[,(]/)[0].trim()).filter(Boolean));
                    edited={...edited,steps:res.steps,...(res.tagline?{tagline:res.tagline}:{})};
                    setStepRewrite("idle");
                  }catch{setStepRewrite("error");return;}
                }
                const fromLibrary=!recipe._scanned&&!recipe._imported&&!recipe._author&&!recipe._adapt;
                const origin=edited._origin||recipe._origin||(fromLibrary&&!recipe._edited&&(recipe._dish||recipe.title)?{q:recipe._dish||recipe.title,title:recipe.title}:undefined);
                // renamed: keep showing the same photo
                const keepPhoto=!edited._ownPhoto&&String(edited.title||"").trim().toLowerCase()!==String(recipe.title||"").trim().toLowerCase()?{_ownPhoto:photoName(recipe)}:{};
                const updated={...edited,_edited:true,grocery_items:syncGroceries(recipe,edited),...(origin?{_origin:origin}:{}),...keepPhoto};
                // ingredients or steps changed: the step-by-step ingredient list gets redone next time cook mode opens
                if(JSON.stringify(recipe.ingredient_groups)!==JSON.stringify(edited.ingredient_groups)||JSON.stringify(recipe.steps)!==JSON.stringify(edited.steps))delete (updated as any).step_ingredients;
                // in the background: if the edit changes how the dish looks, give this recipe its own photo
                const before=recipe;
                if(before.id!=null)editChangesLook(before,edited).then(looksNew=>{
                  if(!looksNew)return;
                  const own=`${edited.title} #${before.id}-${Date.now().toString(36)}`;
                  const tag=(r:any)=>r&&r.id===before.id?{...r,_ownPhoto:own}:r;
                  setRecipe((r:any)=>tag(r));
                  setSaved((l:any[])=>l.map(tag));
                  setPlan((p:any)=>{let ch=false;const m={...p};for(const k in m){if(m[k]?.id===before.id){m[k]=tag(m[k]);ch=true;}}return ch?m:p;});
                });
                setRecipe(updated);
                if(isSaved(recipe))setSaved((l:any[])=>l.map((r:any)=>r.id===updated.id?updated:r));
                // keep any planned copies of this recipe in step with the edit
                setPlan((p:any)=>{let ch=false;const n={...p};for(const k in n){const r=n[k];if(r&&(updated.id!=null?r.id===updated.id:r.title===recipe.title)){n[k]=updated;ch=true;}}return ch?n:p;});
                if(updated._shareSlug&&updated._shareToken)pushShare(updated).catch(()=>{}); // keep the shared link current
                setShowEditPanel(false);setStepRewrite("idle");
              }}>{stepRewrite==="loading"?"Updating steps…":"Save changes"}</button>
            </div>
          </div>
        </div>
      )}
      {showSavePrompt&&(
        <div className="save-prompt-overlay" onClick={()=>{setShowSavePrompt(false);setPendingSave(null);}}>
          <div className="save-prompt" role="dialog" aria-modal="true" aria-labelledby="sp-title" onClick={e=>e.stopPropagation()}>
            <h2 id="sp-title" className="save-prompt-title">Keep this recipe</h2>
            <p className="save-prompt-sub">Sign in to save recipes to every device you use. It's free and takes a few seconds.</p>
            <button className="save-prompt-btn" onClick={()=>{
              setShowSavePrompt(false);
              openSignIn();
            }}>Sign in to save</button>
            <button className="save-prompt-skip" onClick={()=>{
              setShowSavePrompt(false);
              if(pendingSave){setSaved((l:any[])=>[{...pendingSave,_savedAt:Date.now(),id:pendingSave.id||Date.now()},...l]);}
              setPendingSave(null);
            }}>Save on this device only</button>
          </div>
        </div>
      )}
    </>
  );
}

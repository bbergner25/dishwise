"use client";
import { useState, useEffect, useRef } from "react";

const C = {
  cream:"#FAF7F2",parchment:"#F0EAE0",brown:"#3D2B1F",
  terra:"#C45E3E",sage:"#7A8C6E",muted:"#9B8C7E",
  white:"#FFFFFF",border:"#E0D8CC",overlay:"rgba(61,43,31,0.45)",
  green:"#4a6040",greenLight:"#F0F5EE",greenBorder:"#b5c9a8",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'DM Sans',sans-serif;background:#FAF7F2;color:#3D2B1F;min-height:100vh;padding-bottom:80px;}
  @media(min-width:768px){body{padding-bottom:0;}}

  /* ── TOP NAV (desktop) ── */
  .nav{display:none;}
  @media(min-width:768px){
    .nav{display:flex;align-items:center;justify-content:space-between;padding:0 32px;height:60px;border-bottom:1px solid #E0D8CC;background:#FAF7F2;position:sticky;top:0;z-index:100;}
    .nav-brand{font-family:'Playfair Display',serif;font-size:20px;letter-spacing:-0.3px;background:none;border:none;cursor:pointer;color:#3D2B1F;}
    .nav-brand span{color:#C45E3E;font-style:italic;}
    .nav-tabs{display:flex;gap:4px;}
    .nav-tab{padding:7px 16px;border-radius:100px;border:none;background:transparent;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:#9B8C7E;cursor:pointer;transition:all .15s;position:relative;}
    .nav-tab.active{background:#3D2B1F;color:#fff;}
    .nav-tab:not(.active):hover{background:#F0EAE0;color:#3D2B1F;}
    .nav-badge{position:absolute;top:3px;right:5px;background:#C45E3E;color:#fff;font-size:9px;font-weight:700;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
  }

  /* ── BOTTOM NAV (mobile) ── */
  .bottom-nav{
    display:flex;position:fixed;bottom:0;left:0;right:0;z-index:100;
    background:#fff;border-top:1px solid #E0D8CC;
    padding:0 4px env(safe-area-inset-bottom,0px);
    height:72px;align-items:stretch;
  }
  @media(min-width:768px){.bottom-nav{display:none;}}
  .bottom-nav-brand{
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:8px 10px 4px;background:none;border:none;cursor:pointer;
    font-family:'Playfair Display',serif;font-size:13px;color:#3D2B1F;flex:1;
    gap:2px;
  }
  .bottom-nav-brand span{color:#C45E3E;font-style:italic;}
  .bottom-nav-brand .bnb-icon{font-size:18px;}
  .bottom-tab{
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:8px 4px 4px;background:none;border:none;cursor:pointer;
    font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;
    color:#9B8C7E;flex:1;gap:3px;position:relative;transition:color .15s;
  }
  .bottom-tab.active{color:#3D2B1F;}
  .bottom-tab .bt-icon{font-size:20px;line-height:1;}
  .bottom-tab .bt-label{font-size:10px;line-height:1;}
  .bottom-tab .nav-badge{position:absolute;top:6px;right:calc(50% - 18px);background:#C45E3E;color:#fff;font-size:8px;font-weight:700;width:13px;height:13px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
  .nav-badge{position:absolute;top:3px;right:5px;background:#C45E3E;color:#fff;font-size:9px;font-weight:700;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;}

  /* ── HERO ── */
  .hero{padding:48px 24px 24px;text-align:center;max-width:680px;margin:0 auto;}
  .hero-eyebrow{font-size:11px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:#C45E3E;margin-bottom:14px;}
  .hero-title{font-family:'Playfair Display',serif;font-size:clamp(32px,6vw,52px);line-height:1.1;margin-bottom:12px;}
  .hero-sub{font-size:15px;color:#9B8C7E;font-weight:300;line-height:1.6;max-width:400px;margin:0 auto 28px;}
  .search-wrap{max-width:560px;margin:0 auto;}
  .search-bar{display:flex;background:#fff;border:1.5px solid #E0D8CC;border-radius:100px;overflow:hidden;box-shadow:0 4px 20px rgba(61,43,31,.07);transition:box-shadow .2s,border-color .2s;}
  .search-bar:focus-within{box-shadow:0 4px 28px rgba(196,94,62,.18);border-color:#C45E3E;}
  .search-input{flex:1;border:none;outline:none;padding:15px 22px;font-family:'DM Sans',sans-serif;font-size:15px;color:#3D2B1F;background:transparent;}
  .search-input::placeholder{color:#9B8C7E;}
  .search-btn{margin:5px;padding:10px 20px;background:#C45E3E;color:#fff;border:none;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:background .15s;white-space:nowrap;}
  .search-btn:hover:not(:disabled){background:#B34E31;}
  .search-btn:disabled{background:#9B8C7E;cursor:not-allowed;}

  /* Filters */
  .filter-label{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9B8C7E;margin:16px 0 8px;text-align:center;}
  .diet-filters{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;}
  .diet-chip{padding:5px 14px;border-radius:100px;border:1px solid #E0D8CC;background:transparent;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#9B8C7E;cursor:pointer;transition:all .15s;}
  .diet-chip.on{background:#7A8C6E;border-color:#7A8C6E;color:#fff;}
  .seasonal-row{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:10px;flex-wrap:wrap;}
  .seasonal-chip{padding:5px 14px;border-radius:100px;border:1.5px solid #7A8C6E;background:transparent;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#7A8C6E;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px;}
  .seasonal-chip.on{background:#7A8C6E;color:#fff;}
  .location-wrap{display:flex;align-items:center;gap:6px;}
  .location-input{padding:5px 12px;border:1px solid #E0D8CC;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:12px;color:#3D2B1F;outline:none;width:160px;}
  .location-input:focus{border-color:#7A8C6E;}
  .location-detect{padding:5px 10px;border:1px solid #E0D8CC;border-radius:100px;background:transparent;font-size:11px;cursor:pointer;color:#9B8C7E;white-space:nowrap;}
  .suggestions{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:16px;}
  .suggestion-chip{padding:6px 16px;border-radius:100px;border:1px solid #E0D8CC;background:transparent;font-family:'DM Sans',sans-serif;font-size:12px;color:#9B8C7E;cursor:pointer;transition:all .15s;}
  .suggestion-chip:hover{background:#F0EAE0;border-color:#3D2B1F;color:#3D2B1F;}

  /* Scan */
  .scan-divider{display:flex;align-items:center;gap:12px;margin:24px auto 0;max-width:560px;}
  .scan-divider-line{flex:1;height:1px;background:#E0D8CC;}
  .scan-divider-text{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9B8C7E;white-space:nowrap;}
  .scan-area{max-width:560px;margin:12px auto 0;background:#fff;border:1.5px dashed #E0D8CC;border-radius:16px;padding:20px;text-align:center;}
  .scan-icon{font-size:28px;margin-bottom:8px;}
  .scan-label{font-family:'Playfair Display',serif;font-size:16px;margin-bottom:6px;}
  .scan-sub{font-size:12px;color:#9B8C7E;margin-bottom:14px;}
  .scan-upload-btn{padding:8px 20px;background:#3D2B1F;color:#fff;border:none;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;}
  .scan-preview{width:100%;max-height:200px;object-fit:contain;border-radius:10px;margin-bottom:12px;border:1px solid #E0D8CC;}
  .scan-actions{display:flex;gap:10px;justify-content:center;}
  .scan-go-btn{padding:8px 22px;background:#C45E3E;color:#fff;border:none;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;}
  .scan-go-btn:disabled{background:#9B8C7E;cursor:not-allowed;}
  .scan-clear-btn{padding:8px 16px;background:none;color:#9B8C7E;border:1px solid #E0D8CC;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;}
  .scan-success{padding:10px 14px;background:#F0F5EE;border:1px solid #7A8C6E;border-radius:10px;font-size:13px;color:#4a6040;margin-top:10px;}

  /* Loading */
  .loading-wrap{text-align:center;padding:80px 24px;}
  .spinner{width:36px;height:36px;border:2.5px solid #E0D8CC;border-top-color:#C45E3E;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 20px;}
  @keyframes spin{to{transform:rotate(360deg);}}
  .loading-text{font-family:'Playfair Display',serif;font-size:17px;font-style:italic;}
  .loading-sub{font-size:13px;color:#9B8C7E;margin-top:8px;}

  /* ── PREMIUM RECIPE PAGE ── */
  .recipe-page{max-width:860px;margin:0 auto;padding:0 0 80px;}

  /* Dark hero banner */
  .recipe-banner{
    background:linear-gradient(135deg,#1C1007 0%,#2E1A0C 50%,#1C1007 100%);
    padding:40px 32px 36px;
    text-align:center;
    position:relative;
  }
  @media(max-width:640px){.recipe-banner{padding:32px 20px 28px;}}
  .recipe-banner-eyebrow{
    font-size:10px;letter-spacing:3px;text-transform:uppercase;
    color:#C4956A;margin-bottom:14px;font-weight:500;opacity:.8;
  }
  .recipe-banner-title{
    font-family:'Playfair Display',serif;
    font-size:clamp(26px,5vw,46px);
    line-height:1.15;
    color:#F5EDD8;
    margin-bottom:14px;
    font-weight:700;
  }
  .recipe-banner-title em{color:#C4956A;font-style:italic;}
  .recipe-banner-desc{
    font-size:15px;color:rgba(245,237,216,.65);
    line-height:1.7;max-width:480px;margin:0 auto 24px;font-weight:300;
  }
  .recipe-banner-meta{
    display:flex;gap:0;justify-content:center;flex-wrap:wrap;
    border-top:1px solid rgba(196,149,106,.2);
    padding-top:20px;margin-top:4px;
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
    font-family:'Playfair Display',serif;font-size:16px;color:#F5EDD8;
  }
  .recipe-banner-actions{
    position:absolute;top:20px;right:20px;display:flex;gap:8px;
  }
  .save-btn{background:rgba(255,255,255,.1);border:1px solid rgba(196,149,106,.4);border-radius:100px;padding:6px 14px;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;color:#C4956A;display:flex;align-items:center;gap:5px;transition:all .15s;backdrop-filter:blur(4px);}
  .save-btn:hover{background:rgba(196,149,106,.2);border-color:#C4956A;}
  .save-btn.saved{background:#C45E3E;border-color:#C45E3E;color:#fff;}
  .print-btn{background:rgba(255,255,255,.1);border:1px solid rgba(196,149,106,.4);border-radius:100px;padding:6px 14px;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;color:#C4956A;display:flex;align-items:center;gap:5px;transition:all .15s;backdrop-filter:blur(4px);}
  .print-btn:hover{background:rgba(196,149,106,.2);}
  .seasonal-note{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;background:rgba(122,140,110,.2);border:1px solid rgba(122,140,110,.4);border-radius:100px;font-size:12px;color:#a8c49a;margin-bottom:16px;}

  /* Serving scaler — on banner */
  .scaler{display:inline-flex;align-items:center;border:1px solid rgba(196,149,106,.3);border-radius:100px;overflow:hidden;margin:0 auto;}
  .scaler-btn{width:32px;height:32px;border:none;background:rgba(255,255,255,.08);font-size:15px;cursor:pointer;color:#C4956A;display:flex;align-items:center;justify-content:center;transition:background .12s;}
  .scaler-btn:hover{background:rgba(196,149,106,.2);}
  .scaler-val{padding:0 12px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:#F5EDD8;white-space:nowrap;}
  .scaler-wrap{display:flex;flex-direction:column;align-items:center;gap:5px;}
  .scaler-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(196,149,106,.7);font-weight:500;}

  /* Recipe body */
  .recipe-body{padding:36px 32px 0;}
  @media(max-width:640px){.recipe-body{padding:28px 20px 0;}}

  /* Ingredients */
  .two-col{display:grid;grid-template-columns:260px 1fr;gap:48px;align-items:start;}
  @media(max-width:640px){.two-col{grid-template-columns:1fr;gap:32px;}}
  .section-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#C45E3E;margin-bottom:16px;font-weight:500;}
  .ing-group{margin-bottom:20px;}
  .ing-group:last-child{margin-bottom:0;}
  .ing-group-label{
    font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;
    letter-spacing:1.5px;text-transform:uppercase;
    color:#3D2B1F;padding:7px 0 6px;
    border-bottom:2px solid #3D2B1F;margin-bottom:2px;
  }
  .ing-list{list-style:none;}
  .ing-item{display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #E0D8CC;font-size:14px;line-height:1.4;}
  .ing-item:last-child{border-bottom:none;}
  .ing-dot{width:4px;height:4px;border-radius:50%;background:#C45E3E;flex-shrink:0;}
  .ing-text{flex:1;}
  .ing-amount{font-weight:600;color:#3D2B1F;}
  .ing-name{color:#6B5A4E;}
  .ing-shop-links{display:flex;gap:4px;flex-shrink:0;}
  .ing-shop-link{font-size:10px;padding:2px 7px;border-radius:100px;text-decoration:none;border:1px solid #E0D8CC;color:#9B8C7E;transition:all .12s;}
  .ing-shop-link:hover{border-color:#0071CE;color:#0071CE;}
  .ing-shop-link.tg:hover{border-color:#CC0000;color:#CC0000;}

  /* Steps — premium numbered */
  .steps-list{list-style:none;}
  .step-item{display:flex;gap:20px;margin-bottom:28px;align-items:flex-start;}
  .step-num{
    font-family:'Playfair Display',serif;
    font-size:13px;font-weight:700;
    color:#FAF7F2;background:#3D2B1F;
    width:28px;height:28px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    flex-shrink:0;margin-top:2px;letter-spacing:0;
  }
  .step-text{font-size:15px;line-height:1.75;font-weight:300;color:#3D2B1F;padding-top:3px;}

  /* Grocery */
  .grocery-section{margin-top:40px;padding-top:32px;border-top:1px solid #E0D8CC;}
  .grocery-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
  .grocery-title{font-family:'Playfair Display',serif;font-size:20px;}
  .shop-btns{display:flex;gap:8px;flex-wrap:wrap;}
  .shop-btn{padding:7px 14px;border-radius:100px;border:none;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;cursor:pointer;text-decoration:none;transition:all .12s;display:inline-flex;align-items:center;gap:4px;color:#fff;}
  .btn-wm{background:#0071CE;}.btn-wm:hover{background:#005AA6;}
  .btn-tg{background:#CC0000;}.btn-tg:hover{background:#AA0000;}
  .grocery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;}
  .grocery-card{background:#fff;border:1px solid #E0D8CC;border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:8px;}
  .grocery-check{width:15px;height:15px;border-radius:4px;border:1.5px solid #E0D8CC;background:#fff;flex-shrink:0;cursor:pointer;appearance:none;transition:all .12s;}
  .grocery-check:checked{background:#7A8C6E;border-color:#7A8C6E;}
  .grocery-item-wrap{flex:1;min-width:0;}
  .grocery-name{font-size:12px;line-height:1.3;}
  .grocery-shop-links{display:flex;gap:4px;margin-top:3px;}
  .grocery-shop-link{font-size:10px;padding:1px 6px;border-radius:100px;text-decoration:none;border:1px solid #E0D8CC;color:#9B8C7E;transition:all .12s;}
  .grocery-shop-link:hover{border-color:#0071CE;color:#0071CE;}
  .grocery-shop-link.tg:hover{border-color:#CC0000;color:#CC0000;}

  /* Sources */
  .source-section{margin-top:28px;padding-top:24px;border-top:1px solid #E0D8CC;}
  .source-section-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#9B8C7E;margin-bottom:10px;font-weight:500;}
  .source-links{display:flex;flex-wrap:wrap;gap:8px;}
  .source-link{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border:1px solid #E0D8CC;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:12px;color:#9B8C7E;text-decoration:none;transition:all .15s;background:#fff;}
  .source-link:hover{border-color:#C45E3E;color:#C45E3E;}
  .source-note{margin-top:12px;font-size:12px;color:#9B8C7E;line-height:1.6;font-style:italic;}
  .back-btn{display:inline-flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;color:#C45E3E;padding:0;margin:32px 0 0;text-decoration:underline;text-underline-offset:3px;}

  /* Pages */
  .page{max-width:900px;margin:0 auto;padding:36px 24px 40px;}
  .page-title{font-family:'Playfair Display',serif;font-size:clamp(22px,4vw,34px);margin-bottom:8px;}
  .page-sub{font-size:14px;color:#9B8C7E;margin-bottom:28px;}
  .empty-state{text-align:center;padding:60px 24px;color:#9B8C7E;font-size:15px;line-height:1.6;}
  .empty-state h3{font-family:'Playfair Display',serif;color:#3D2B1F;font-size:22px;margin-bottom:10px;}
  .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;}
  .recipe-card{background:#fff;border:1px solid #E0D8CC;border-radius:14px;padding:18px;cursor:pointer;transition:all .15s;}
  .recipe-card:hover{box-shadow:0 6px 24px rgba(61,43,31,.1);transform:translateY(-2px);border-color:#C45E3E;}
  .card-tag{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7A8C6E;margin-bottom:7px;}
  .card-title{font-family:'Playfair Display',serif;font-size:16px;line-height:1.3;margin-bottom:7px;}
  .card-desc{font-size:12px;color:#9B8C7E;line-height:1.5;margin-bottom:12px;}
  .card-meta{display:flex;gap:10px;font-size:11px;color:#9B8C7E;flex-wrap:wrap;}
  .card-actions{display:flex;gap:7px;margin-top:12px;padding-top:12px;border-top:1px solid #E0D8CC;}
  .card-btn{flex:1;padding:6px;border-radius:8px;border:1px solid #E0D8CC;background:transparent;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;cursor:pointer;transition:all .12s;color:#9B8C7E;}
  .card-btn:hover{background:#F0EAE0;color:#3D2B1F;}
  .card-btn.danger:hover{background:#FEE;color:#C00;border-color:#C00;}

  /* Week */
  .week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;}
  @media(max-width:700px){.week-grid{grid-template-columns:repeat(2,1fr);}}
  .day-card{border:1px solid #E0D8CC;border-radius:12px;background:#fff;min-height:130px;display:flex;flex-direction:column;overflow:hidden;}
  .day-head{padding:8px 10px;border-bottom:1px solid #E0D8CC;background:#FAF7F2;}
  .day-name{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#9B8C7E;font-weight:500;}
  .day-body{flex:1;padding:8px 10px;display:flex;flex-direction:column;}
  .day-recipe-title{font-family:'Playfair Display',serif;font-size:12px;line-height:1.3;margin-bottom:4px;}
  .day-recipe-meta{font-size:10px;color:#9B8C7E;}
  .day-actions{display:flex;gap:5px;margin-top:8px;}
  .day-btn{flex:1;padding:4px;border-radius:6px;border:1px solid #E0D8CC;background:transparent;font-size:10px;font-family:'DM Sans',sans-serif;cursor:pointer;color:#9B8C7E;}
  .day-btn.add{border-style:dashed;color:#C45E3E;width:100%;margin-top:auto;}
  .day-btn.add:hover{background:#FFF5F2;border-color:#C45E3E;}
  .day-btn:not(.add):hover{background:#F0EAE0;color:#3D2B1F;}
  .consol-section{margin-top:40px;padding-top:32px;border-top:1px solid #E0D8CC;}
  .consol-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px;}
  .consol-title{font-family:'Playfair Display',serif;font-size:20px;}

  /* Inspire */
  .inspire-wrap{max-width:680px;margin:0 auto;padding:40px 24px 40px;}
  .inspire-title{font-family:'Playfair Display',serif;font-size:clamp(26px,5vw,42px);text-align:center;margin-bottom:10px;}
  .inspire-sub{font-size:14px;color:#9B8C7E;text-align:center;margin-bottom:32px;line-height:1.6;}
  .inspire-section{margin-bottom:24px;}
  .inspire-section-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9B8C7E;margin-bottom:12px;font-weight:500;}
  .inspire-chips{display:flex;flex-wrap:wrap;gap:8px;}
  .inspire-chip{padding:9px 18px;border-radius:100px;border:1.5px solid #E0D8CC;background:#fff;font-family:'DM Sans',sans-serif;font-size:13px;color:#9B8C7E;cursor:pointer;transition:all .15s;}
  .inspire-chip.on{background:#3D2B1F;border-color:#3D2B1F;color:#fff;}
  .inspire-chip:not(.on):hover{border-color:#3D2B1F;color:#3D2B1F;}
  .inspire-go-btn{width:100%;padding:15px;background:#C45E3E;color:#fff;border:none;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;cursor:pointer;transition:background .15s;margin-top:8px;}
  .inspire-go-btn:hover:not(:disabled){background:#B34E31;}
  .inspire-go-btn:disabled{background:#9B8C7E;cursor:not-allowed;}
  .inspire-results{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:28px;}
  .inspire-card{background:#fff;border:1px solid #E0D8CC;border-radius:14px;padding:20px;cursor:pointer;transition:all .15s;border-left:4px solid #C45E3E;}
  .inspire-card:hover{box-shadow:0 6px 24px rgba(61,43,31,.1);transform:translateY(-2px);}
  .inspire-card-title{font-family:'Playfair Display',serif;font-size:18px;margin-bottom:6px;}
  .inspire-card-desc{font-size:13px;color:#9B8C7E;line-height:1.5;margin-bottom:10px;}
  .inspire-card-meta{display:flex;gap:12px;font-size:11px;color:#9B8C7E;flex-wrap:wrap;margin-bottom:10px;}
  .inspire-card-btn{width:100%;padding:8px;background:#3D2B1F;color:#fff;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;}
  .inspire-card-btn:hover{background:#5a3e2f;}
  .inspire-reset{background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;color:#C45E3E;text-decoration:underline;text-underline-offset:3px;display:block;margin:24px auto 0;}

  /* Family */
  .family-wrap{max-width:560px;margin:0 auto;padding:40px 24px 40px;}
  .family-title{font-family:'Playfair Display',serif;font-size:clamp(24px,4vw,36px);margin-bottom:8px;}
  .family-sub{font-size:14px;color:#9B8C7E;margin-bottom:28px;line-height:1.6;}
  .family-current{background:#fff;border:1px solid #E0D8CC;border-radius:14px;padding:20px;margin-bottom:22px;}
  .family-code-display{font-family:'Playfair Display',serif;font-size:32px;letter-spacing:4px;color:#C45E3E;margin:8px 0;}
  .family-code-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9B8C7E;font-weight:500;}
  .family-code-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;}
  .family-code-btn{padding:8px 18px;border-radius:100px;border:1px solid #E0D8CC;background:transparent;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;color:#9B8C7E;transition:all .15s;}
  .family-code-btn:hover{border-color:#3D2B1F;color:#3D2B1F;}
  .family-code-btn.primary{background:#3D2B1F;border-color:#3D2B1F;color:#fff;}
  .family-code-btn.primary:hover{background:#5a3e2f;}
  .family-divider{display:flex;align-items:center;gap:12px;margin:22px 0;}
  .family-divider-line{flex:1;height:1px;background:#E0D8CC;}
  .family-divider-text{font-size:11px;color:#9B8C7E;text-transform:uppercase;letter-spacing:1.5px;}
  .family-join-wrap{background:#fff;border:1px solid #E0D8CC;border-radius:14px;padding:20px;}
  .family-join-label{font-size:13px;color:#3D2B1F;margin-bottom:10px;font-weight:500;}
  .family-join-row{display:flex;gap:8px;}
  .family-join-input{flex:1;padding:10px 16px;border:1.5px solid #E0D8CC;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:14px;color:#3D2B1F;outline:none;text-transform:uppercase;letter-spacing:2px;}
  .family-join-input:focus{border-color:#C45E3E;}
  .family-join-btn{padding:10px 20px;background:#C45E3E;color:#fff;border:none;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;}
  .family-shared-recipes{margin-top:28px;}
  .family-shared-title{font-family:'Playfair Display',serif;font-size:20px;margin-bottom:6px;}
  .family-shared-sub{font-size:13px;color:#9B8C7E;margin-bottom:16px;}
  .family-status{padding:10px 14px;border-radius:10px;font-size:13px;margin-top:12px;}
  .family-status.ok{background:#F0F5EE;border:1px solid #b5c9a8;color:#4a6040;}
  .family-status.err{background:#FEE;border:1px solid #fcc;color:#900;}

  /* Modal */
  .modal-overlay{position:fixed;inset:0;background:rgba(61,43,31,.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;}
  .modal{background:#FAF7F2;border-radius:18px;padding:26px;width:100%;max-width:480px;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);}
  .modal-title{font-family:'Playfair Display',serif;font-size:20px;margin-bottom:16px;flex-shrink:0;}
  .modal-list{overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:8px;}
  .modal-item{background:#fff;border:1px solid #E0D8CC;border-radius:10px;padding:12px 14px;cursor:pointer;transition:all .12s;}
  .modal-item:hover{border-color:#C45E3E;background:#FFF8F5;}
  .modal-item-title{font-family:'Playfair Display',serif;font-size:15px;}
  .modal-item-meta{font-size:11px;color:#9B8C7E;margin-top:3px;}
  .modal-close{margin-top:14px;flex-shrink:0;background:none;border:1px solid #E0D8CC;border-radius:100px;padding:8px 20px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;color:#9B8C7E;}
  .error-box{text-align:center;padding:60px 24px;color:#9B8C7E;}
  .error-box h3{font-family:'Playfair Display',serif;color:#3D2B1F;margin-bottom:8px;}

  /* History */
  .history-empty{text-align:center;padding:40px 24px;color:#9B8C7E;font-size:14px;line-height:1.6;}
  .history-empty h3{font-family:'Playfair Display',serif;color:#3D2B1F;font-size:20px;margin-bottom:8px;}
  .history-list{display:flex;flex-direction:column;gap:10px;margin-top:8px;}
  .history-item{background:#fff;border:1px solid #E0D8CC;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:14px;transition:all .15s;}
  .history-item:hover{border-color:#C45E3E;box-shadow:0 3px 12px rgba(61,43,31,.07);}
  .history-item-main{flex:1;cursor:pointer;min-width:0;}
  .history-item-title{font-family:'Playfair Display',serif;font-size:16px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .history-item-meta{font-size:11px;color:#9B8C7E;display:flex;gap:10px;flex-wrap:wrap;}
  .history-item-time{font-size:11px;color:#9B8C7E;white-space:nowrap;}
  .history-item-save{padding:5px 14px;border-radius:100px;border:1.5px solid #E0D8CC;background:transparent;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;cursor:pointer;color:#9B8C7E;transition:all .15s;white-space:nowrap;flex-shrink:0;}
  .history-item-save:hover{border-color:#C45E3E;color:#C45E3E;}
  .history-item-save.saved{background:#C45E3E;border-color:#C45E3E;color:#fff;}
  .history-clear{background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;color:#9B8C7E;text-decoration:underline;text-underline-offset:3px;margin-top:16px;display:block;}
  .history-tabs{display:flex;gap:0;border-bottom:1px solid #E0D8CC;margin-bottom:24px;}
  .history-tab{padding:8px 20px;border:none;background:transparent;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:#9B8C7E;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;}
  .history-tab.active{color:#3D2B1F;border-bottom-color:#C45E3E;}

  @media print{
    .nav,.bottom-nav,.recipe-banner-actions,.scaler,.shop-btns,.back-btn,
    .source-links,.card-actions,.grocery-section,.scan-divider,.scan-area{display:none !important;}
    body{background:#fff;padding-bottom:0;}
    .recipe-page{max-width:100%;padding:0;}
    .recipe-banner{background:#1C1007;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .two-col{grid-template-columns:200px 1fr;gap:24px;}
  }
`;

/* ── CONSTANTS ── */
const SUGGESTIONS = ["Chicken Tikka Masala","Beef Tacos","Pasta Carbonara","Lemon Herb Salmon","Veggie Stir Fry","Classic Chili","Butter Chicken","Thai Green Curry"];
const DIETS    = ["Vegetarian","Vegan","Gluten-Free","Dairy-Free","Keto","Low-Carb"];
const DAYS     = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAY_KEYS = ["mon","tue","wed","thu","fri","sat","sun"];
const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const INSPIRE_OPTIONS = {
  time:    ["Under 20 mins","Under 30 mins","Under 45 mins","1 hour+","I've got all day"],
  vibe:    ["Comfort food","Light & fresh","Bold & spicy","Something new","Family favorite","Date night"],
  serves:  ["Just me","2 people","Family of 4","Big group"],
};

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
      setReady(true);
    }
    load();
  },[]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-saved",JSON.stringify(saved));}catch{};},[saved,ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-history",JSON.stringify(history.slice(0,30)));}catch{};},[history,ready]);
  useEffect(()=>{if(ready)try{localStorage.setItem("dw-plan",JSON.stringify(plan));}catch{};},[plan,ready]);
  useEffect(()=>{if(ready&&location)try{localStorage.setItem("dw-location",location);}catch{};},[location,ready]);

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
          <div className="hero">
            <div className="hero-eyebrow">Recipe Finder</div>
            <h1 className="hero-title">What would you<br/><em>like to cook?</em></h1>
            <p className="hero-sub">We synthesize the best recipes from across the web — no ads, no scrolling, just great food.</p>
            <div className="search-wrap">
              <div className="search-bar">
                <input ref={inputRef} className="search-input" placeholder="e.g. Chicken Tikka Masala…"
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
                  🌱 {seasonal?"In Season — On":"In Season"}
                </button>
                {seasonal&&(
                  <div className="location-wrap">
                    <input className="location-input" placeholder="City, State…" value={location} onChange={e=>setLocation(e.target.value)}/>
                    <button className="location-detect" onClick={detectLocation} disabled={detecting}>{detecting?"…":"📍 Detect"}</button>
                  </div>
                )}
              </div>
              <div className="suggestions">
                {SUGGESTIONS.map(s=>(
                  <button key={s} className="suggestion-chip" onClick={()=>{setQuery(s);doSearch(s);}}>{s}</button>
                ))}
              </div>
            </div>
            <div className="scan-divider"><div className="scan-divider-line"/><div className="scan-divider-text">or scan a recipe card</div><div className="scan-divider-line"/></div>
            <div className="scan-area">
              {!scanPreview?(
                <>
                  <div className="scan-icon">📸</div>
                  <div className="scan-label">Digitize Grandma's Recipe Card</div>
                  <div className="scan-sub">Snap or upload any handwritten or printed recipe card</div>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={onFileChange}/>
                  <button className="scan-upload-btn" onClick={()=>fileRef.current?.click()}>Choose Photo</button>
                </>
              ):(
                <>
                  <img src={scanPreview} className="scan-preview" alt="Recipe preview"/>
                  <div className="scan-actions">
                    <button className="scan-go-btn" onClick={doScan} disabled={scanStatus==="scanning"}>{scanStatus==="scanning"?"Extracting…":"✨ Digitize Recipe"}</button>
                    <button className="scan-clear-btn" onClick={clearScan}>Clear</button>
                  </div>
                </>
              )}
              {scanStatus==="done"&&scanMsg&&(
                <div className="scan-success">✓ {scanMsg}{" "}
                  <button onClick={()=>setTab("saved")} style={{background:"none",border:"none",cursor:"pointer",color:"#4a6040",textDecoration:"underline",fontSize:13}}>View in Saved →</button>
                </div>
              )}
              {scanStatus==="error"&&<div style={{marginTop:10,fontSize:12,color:"#C45E3E"}}>{scanMsg}</div>}
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
            <button className="print-btn" onClick={()=>window.print()}>🖨 Print</button>
            <button className={`save-btn${sv?" saved":""}`} onClick={()=>toggleSave(recipe)}>{sv?"♥ Saved":"♡ Save"}</button>
          </div>
          <div className="recipe-banner-eyebrow">{recipe._scanned?"📸 Digitized Recipe Card":"· Synthesized Recipe ·"}</div>
          <h2 className="recipe-banner-title">{recipe.title}</h2>
          <p className="recipe-banner-desc">{recipe.tagline}</p>
          {recipe.seasonal_note&&<div className="seasonal-note">🌱 {recipe.seasonal_note}</div>}
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
                      <span className="ing-shop-links">
                        <a href={wmUrl(ing.name)} target="_blank" rel="noopener noreferrer" className="ing-shop-link">WM</a>
                        <a href={tgUrl(ing.name)} target="_blank" rel="noopener noreferrer" className="ing-shop-link tg">TG</a>
                      </span>
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
            <div className="shop-btns">
              <a href={wmUrl(firstItem)} target="_blank" rel="noopener noreferrer" className="shop-btn btn-wm">🛒 Walmart</a>
              <a href={tgUrl(firstItem)} target="_blank" rel="noopener noreferrer" className="shop-btn btn-tg">🎯 Target</a>
            </div>
          </div>
          <div className="grocery-grid">
            {(recipe.grocery_items||[]).map((item:string,i:number)=>(
              <div key={i} className="grocery-card">
                <input type="checkbox" className="grocery-check"/>
                <div className="grocery-item-wrap">
                  <div className="grocery-name">{item}</div>
                  <div className="grocery-shop-links">
                    <a href={wmUrl(item)} target="_blank" rel="noopener noreferrer" className="grocery-shop-link">Walmart</a>
                    <a href={tgUrl(item)} target="_blank" rel="noopener noreferrer" className="grocery-shop-link tg">Target</a>
                  </div>
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
        <button className="back-btn" onClick={()=>{setStatus("idle");setRecipe(null);setQuery("");}}>← Search another recipe</button>
        </div>{/* recipe-body */}
      </div>
    );
  }

  /* ── INSPIRE ME VIEW ── */
  function InspireView(){
    const canGo=inspireTime&&inspireVibe&&inspireServes;
    return(
      <div className="inspire-wrap">
        <h2 className="inspire-title">✨ Inspire <em>me</em></h2>
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
                    <span>⏱ {s.prep_time} prep</span>
                    <span>🍳 {s.cook_time} cook</span>
                    <span>🍽 {s.servings} servings</span>
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
                          <span>⏱ {r.prep_time}</span>
                          <span>🍳 {r.cook_time}</span>
                          <span>🍽 {r.servings} servings</span>
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
          <div className="empty-state"><h3>Nothing saved yet</h3><p>Search for a recipe and hit ♡ Save, or scan a recipe card.</p></div>
        ):(
          <div className="cards-grid">
            {allRecipes.map((r:any)=>{
              const isSharedOnly=!saved.some(s=>s.id===r.id);
              return(
                <div key={r.id} className="recipe-card" onClick={()=>{setRecipe(r);setServings(null);setStatus("done");setTab("search");}}>
                  <div className="card-tag">{r._scanned?"📸 Recipe Card":isSharedOnly?"👨‍👩‍👧 Shared":r.seasonal_note?"🌱 Seasonal":"Saved Recipe"}</div>
                  <div className="card-title">{r.title}</div>
                  <div className="card-desc">{r.tagline}</div>
                  <div className="card-meta"><span>⏱ {r.prep_time}</span><span>🍳 {r.cook_time}</span><span>🍽 {r.servings} servings</span></div>
                  <div className="card-actions" onClick={e=>e.stopPropagation()}>
                    <button className="card-btn" onClick={()=>{setAssignDay("fromSaved_"+r.id);setTab("week");}}>+ Week</button>
                    {!isSharedOnly&&<button className="card-btn danger" onClick={()=>setSaved(l=>l.filter((s:any)=>s.id!==r.id))}>Remove</button>}
                    {isSharedOnly&&<button className="card-btn" onClick={()=>setSaved(l=>[r,...l])}>♡ Save Mine</button>}
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
                <a href={wmUrl(consolidated[0]?.name||"")} target="_blank" rel="noopener noreferrer" className="shop-btn btn-wm">🛒 Walmart</a>
                <a href={tgUrl(consolidated[0]?.name||"")} target="_blank" rel="noopener noreferrer" className="shop-btn btn-tg">🎯 Target</a>
              </div>
            </div>
            <div className="grocery-grid">
              {consolidated.map((item,i)=>(
                <div key={i} className="grocery-card">
                  <input type="checkbox" className="grocery-check"/>
                  <div className="grocery-item-wrap">
                    <div className="grocery-name">{item.name}</div>
                    {item.recipes.length>1&&<div style={{fontSize:10,color:C.muted,marginTop:1}}>{item.recipes.length} meals</div>}
                    <div className="grocery-shop-links">
                      <a href={wmUrl(item.name)} target="_blank" rel="noopener noreferrer" className="grocery-shop-link">Walmart</a>
                      <a href={tgUrl(item.name)} target="_blank" rel="noopener noreferrer" className="grocery-shop-link tg">Target</a>
                    </div>
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
            <div style={{fontSize:13,color:C.muted,marginBottom:10}}>Share this code with anyone you want to connect with. They enter it on their Dishwise to join your collection.</div>
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
            <button className="family-code-btn primary" onClick={createFamilyCode}>✨ Create a Family Code</button>
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
                  <div className="card-tag">👨‍👩‍👧 Shared Recipe</div>
                  <div className="card-title">{r.title}</div>
                  <div className="card-desc">{r.tagline}</div>
                  <div className="card-meta"><span>⏱ {r.prep_time}</span><span>🍳 {r.cook_time}</span></div>
                  <div className="card-actions" onClick={e=>e.stopPropagation()}>
                    <button className="card-btn" onClick={()=>setSaved(l=>[r,...l.filter((s:any)=>s.id!==r.id)])}>♡ Save to Mine</button>
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
                    <div className="modal-item-meta">⏱ {r.prep_time} · 🍳 {r.cook_time}</div>
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
        <button className="nav-brand" style={{background:"none",border:"none",cursor:"pointer"}} onClick={()=>{setTab("search");setStatus("idle");setRecipe(null);setQuery("");}}>dish<span>wise</span></button>
        <div className="nav-tabs">
          {[
            {key:"search",label:"Search"},
            {key:"inspire",label:"✨ Inspire"},
            {key:"saved",label:"Saved",badge:saved.length||null},
            {key:"week",label:"Week",badge:mealsPlanned||null},
            {key:"family",label:"👨‍👩‍👧 Family",badge:familyCode?1:null},
          ].map(({key,label,badge}:any)=>(
            <button key={key} className={`nav-tab${tab===key?" active":""}`} onClick={()=>setTab(key)}>
              {label}{badge?<span className="nav-badge">{badge}</span>:null}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="bottom-nav">
        <button className="bottom-nav-brand" onClick={()=>{setTab("search");setStatus("idle");setRecipe(null);setQuery("");}}>
          <span className="bnb-icon">🍽</span>
          <span>dish<span style={{color:"#C45E3E",fontStyle:"italic"}}>wise</span></span>
        </button>
        {[
          {key:"search",icon:"🔍",label:"Search"},
          {key:"inspire",icon:"✨",label:"Inspire"},
          {key:"saved",icon:"♡",label:"Saved",badge:saved.length||null},
          {key:"week",icon:"📅",label:"Week",badge:mealsPlanned||null},
          {key:"family",icon:"👨‍👩‍👧",label:"Family",badge:familyCode?1:null},
        ].map(({key,icon,label,badge}:any)=>(
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

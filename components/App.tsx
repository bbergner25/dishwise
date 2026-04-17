"use client";
import { useState, useEffect, useRef } from "react";

const C = {
  cream:"#FAF7F2",parchment:"#F0EAE0",brown:"#3D2B1F",
  terra:"#C45E3E",sage:"#7A8C6E",muted:"#9B8C7E",
  white:"#FFFFFF",border:"#E0D8CC",overlay:"rgba(61,43,31,0.45)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'DM Sans',sans-serif;background:#FAF7F2;color:#3D2B1F;min-height:100vh;}

  .nav{display:flex;align-items:center;justify-content:space-between;padding:0 28px;height:56px;border-bottom:1px solid #E0D8CC;background:#FAF7F2;position:sticky;top:0;z-index:100;}
  .nav-brand{font-family:'Playfair Display',serif;font-size:18px;letter-spacing:-0.3px;}
  .nav-brand span{color:#C45E3E;font-style:italic;}
  .nav-tabs{display:flex;gap:4px;}
  .nav-tab{padding:6px 16px;border-radius:100px;border:none;background:transparent;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:#9B8C7E;cursor:pointer;transition:all .15s;position:relative;}
  .nav-tab.active{background:#3D2B1F;color:#fff;}
  .nav-tab:not(.active):hover{background:#F0EAE0;color:#3D2B1F;}
  .nav-badge{position:absolute;top:2px;right:6px;background:#C45E3E;color:#fff;font-size:9px;font-weight:700;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;}

  .hero{padding:56px 24px 40px;text-align:center;max-width:680px;margin:0 auto;}
  .hero-eyebrow{font-size:11px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:#C45E3E;margin-bottom:14px;}
  .hero-title{font-family:'Playfair Display',serif;font-size:clamp(34px,6vw,56px);line-height:1.1;margin-bottom:14px;}
  .hero-sub{font-size:15px;color:#9B8C7E;font-weight:300;line-height:1.6;max-width:400px;margin:0 auto 36px;}

  .search-wrap{max-width:560px;margin:0 auto;}
  .search-bar{display:flex;background:#fff;border:1.5px solid #E0D8CC;border-radius:100px;overflow:hidden;box-shadow:0 4px 20px rgba(61,43,31,.07);transition:box-shadow .2s,border-color .2s;}
  .search-bar:focus-within{box-shadow:0 4px 28px rgba(196,94,62,.18);border-color:#C45E3E;}
  .search-input{flex:1;border:none;outline:none;padding:15px 22px;font-family:'DM Sans',sans-serif;font-size:15px;color:#3D2B1F;background:transparent;}
  .search-input::placeholder{color:#9B8C7E;}
  .search-btn{margin:5px;padding:10px 22px;background:#C45E3E;color:#fff;border:none;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:background .15s,transform .1s;white-space:nowrap;}
  .search-btn:hover:not(:disabled){background:#B34E31;}
  .search-btn:active{transform:scale(.97);}
  .search-btn:disabled{background:#9B8C7E;cursor:not-allowed;}

  .filter-label{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9B8C7E;margin:20px 0 8px;text-align:center;}
  .diet-filters{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;}
  .diet-chip{padding:5px 14px;border-radius:100px;border:1px solid #E0D8CC;background:transparent;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#9B8C7E;cursor:pointer;transition:all .15s;}
  .diet-chip.on{background:#7A8C6E;border-color:#7A8C6E;color:#fff;}
  .diet-chip:not(.on):hover{border-color:#3D2B1F;color:#3D2B1F;}

  .seasonal-row{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:12px;flex-wrap:wrap;}
  .seasonal-chip{padding:5px 14px;border-radius:100px;border:1.5px solid #7A8C6E;background:transparent;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#7A8C6E;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px;}
  .seasonal-chip.on{background:#7A8C6E;color:#fff;}
  .seasonal-chip:not(.on):hover{background:#F0F5EE;}
  .location-wrap{display:flex;align-items:center;gap:6px;}
  .location-input{padding:5px 12px;border:1px solid #E0D8CC;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:12px;color:#3D2B1F;outline:none;width:170px;transition:border-color .15s;}
  .location-input:focus{border-color:#7A8C6E;}
  .location-detect{padding:5px 10px;border:1px solid #E0D8CC;border-radius:100px;background:transparent;font-size:11px;cursor:pointer;color:#9B8C7E;transition:all .15s;white-space:nowrap;}
  .location-detect:hover{border-color:#7A8C6E;color:#7A8C6E;}
  .location-detect:disabled{opacity:.5;cursor:not-allowed;}

  .suggestions{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:20px;}
  .suggestion-chip{padding:6px 16px;border-radius:100px;border:1px solid #E0D8CC;background:transparent;font-family:'DM Sans',sans-serif;font-size:12px;color:#9B8C7E;cursor:pointer;transition:all .15s;}
  .suggestion-chip:hover{background:#F0EAE0;border-color:#3D2B1F;color:#3D2B1F;}

  .scan-divider{display:flex;align-items:center;gap:12px;margin:32px auto 0;max-width:560px;}
  .scan-divider-line{flex:1;height:1px;background:#E0D8CC;}
  .scan-divider-text{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9B8C7E;white-space:nowrap;}
  .scan-area{max-width:560px;margin:16px auto 0;background:#fff;border:1.5px dashed #E0D8CC;border-radius:16px;padding:24px;text-align:center;transition:border-color .15s;}
  .scan-area:hover{border-color:#C45E3E;}
  .scan-icon{font-size:32px;margin-bottom:10px;}
  .scan-label{font-family:'Playfair Display',serif;font-size:16px;margin-bottom:6px;}
  .scan-sub{font-size:12px;color:#9B8C7E;margin-bottom:16px;}
  .scan-upload-btn{padding:9px 22px;background:#3D2B1F;color:#fff;border:none;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:background .15s;}
  .scan-upload-btn:hover{background:#5a3e2f;}
  .scan-preview{width:100%;max-height:220px;object-fit:contain;border-radius:10px;margin-bottom:14px;border:1px solid #E0D8CC;}
  .scan-actions{display:flex;gap:10px;justify-content:center;}
  .scan-go-btn{padding:9px 24px;background:#C45E3E;color:#fff;border:none;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:background .15s;}
  .scan-go-btn:hover:not(:disabled){background:#B34E31;}
  .scan-go-btn:disabled{background:#9B8C7E;cursor:not-allowed;}
  .scan-clear-btn{padding:9px 18px;background:none;color:#9B8C7E;border:1px solid #E0D8CC;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;transition:all .15s;}
  .scan-clear-btn:hover{border-color:#3D2B1F;color:#3D2B1F;}
  .scan-success{padding:12px 16px;background:#F0F5EE;border:1px solid #7A8C6E;border-radius:10px;font-size:13px;color:#4a6040;margin-top:10px;}

  .loading-wrap{text-align:center;padding:80px 24px;}
  .spinner{width:36px;height:36px;border:2.5px solid #E0D8CC;border-top-color:#C45E3E;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 20px;}
  @keyframes spin{to{transform:rotate(360deg);}}
  .loading-text{font-family:'Playfair Display',serif;font-size:17px;font-style:italic;}
  .loading-sub{font-size:13px;color:#9B8C7E;margin-top:8px;}

  .recipe-page{max-width:880px;margin:0 auto;padding:0 24px 80px;}
  .recipe-header{text-align:center;padding:40px 0 36px;border-bottom:1px solid #E0D8CC;margin-bottom:40px;position:relative;}
  .recipe-tag{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#7A8C6E;margin-bottom:12px;font-weight:500;}
  .recipe-title{font-family:'Playfair Display',serif;font-size:clamp(26px,5vw,42px);line-height:1.15;margin-bottom:14px;}
  .recipe-desc{font-size:15px;color:#9B8C7E;line-height:1.7;max-width:500px;margin:0 auto 16px;font-weight:300;}
  .seasonal-note{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#F0F5EE;border:1px solid #b5c9a8;border-radius:100px;font-size:12px;color:#4a6040;margin-bottom:20px;}
  .recipe-meta{display:flex;gap:32px;justify-content:center;flex-wrap:wrap;margin-bottom:24px;}
  .meta-item{text-align:center;}
  .meta-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#9B8C7E;margin-bottom:4px;}
  .meta-value{font-family:'Playfair Display',serif;font-size:17px;}
  .scaler{display:inline-flex;align-items:center;border:1px solid #E0D8CC;border-radius:100px;overflow:hidden;margin:4px auto 0;}
  .scaler-btn{width:34px;height:34px;border:none;background:#F0EAE0;font-size:16px;cursor:pointer;color:#3D2B1F;transition:background .12s;display:flex;align-items:center;justify-content:center;}
  .scaler-btn:hover{background:#E0D8CC;}
  .scaler-val{padding:0 14px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;white-space:nowrap;}
  .recipe-header-actions{position:absolute;top:40px;right:0;display:flex;gap:8px;}
  .save-btn{background:none;border:1.5px solid #E0D8CC;border-radius:100px;padding:7px 14px;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;color:#9B8C7E;display:flex;align-items:center;gap:6px;transition:all .15s;}
  .save-btn:hover{border-color:#C45E3E;color:#C45E3E;}
  .save-btn.saved{background:#C45E3E;border-color:#C45E3E;color:#fff;}
  .print-btn{background:none;border:1.5px solid #E0D8CC;border-radius:100px;padding:7px 14px;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;color:#9B8C7E;display:flex;align-items:center;gap:6px;transition:all .15s;}
  .print-btn:hover{border-color:#3D2B1F;color:#3D2B1F;}

  .two-col{display:grid;grid-template-columns:280px 1fr;gap:48px;align-items:start;}
  @media(max-width:640px){.two-col{grid-template-columns:1fr;}}
  .section-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#C45E3E;margin-bottom:18px;font-weight:500;}
  .ing-group{margin-bottom:20px;}
  .ing-group:last-child{margin-bottom:0;}
  .ing-group-label{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;color:#9B8C7E;padding:6px 0 4px;border-bottom:1px solid #F0EAE0;margin-bottom:4px;}
  .ing-list{list-style:none;}
  .ing-item{display:flex;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px solid #E0D8CC;font-size:14px;line-height:1.4;}
  .ing-item:last-child{border-bottom:none;}
  .ing-dot{width:5px;height:5px;border-radius:50%;background:#C45E3E;flex-shrink:0;margin-top:5px;}
  .ing-amount{font-weight:500;}
  .ing-name{color:#9B8C7E;}
  .steps-list{list-style:none;}
  .step-item{display:flex;gap:18px;margin-bottom:26px;}
  .step-num{font-family:'Playfair Display',serif;font-size:20px;color:#C45E3E;opacity:.45;flex-shrink:0;line-height:1;padding-top:3px;min-width:26px;}
  .step-text{font-size:15px;line-height:1.7;font-weight:300;}

  .grocery-section{margin-top:52px;padding-top:36px;border-top:1px solid #E0D8CC;}
  .grocery-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;}
  .grocery-title{font-family:'Playfair Display',serif;font-size:22px;}
  .shop-btns{display:flex;gap:8px;flex-wrap:wrap;}
  .shop-btn{padding:7px 16px;border-radius:100px;border:none;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;cursor:pointer;text-decoration:none;transition:all .12s;display:inline-flex;align-items:center;gap:5px;color:#fff;}
  .btn-wm{background:#0071CE;} .btn-wm:hover{background:#005AA6;}
  .btn-tg{background:#CC0000;} .btn-tg:hover{background:#AA0000;}
  .grocery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;}
  .grocery-card{background:#fff;border:1px solid #E0D8CC;border-radius:10px;padding:11px 14px;display:flex;align-items:center;gap:10px;}
  .grocery-check{width:16px;height:16px;border-radius:4px;border:1.5px solid #E0D8CC;background:#fff;flex-shrink:0;cursor:pointer;appearance:none;transition:all .12s;}
  .grocery-check:checked{background:#7A8C6E;border-color:#7A8C6E;}
  .grocery-name{font-size:13px;line-height:1.3;}

  .source-section{margin-top:32px;padding-top:28px;border-top:1px solid #E0D8CC;}
  .source-section-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#9B8C7E;margin-bottom:12px;font-weight:500;}
  .source-links{display:flex;flex-wrap:wrap;gap:8px;}
  .source-link{display:inline-flex;align-items:center;gap:5px;padding:6px 14px;border:1px solid #E0D8CC;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:12px;color:#9B8C7E;text-decoration:none;transition:all .15s;background:#fff;}
  .source-link:hover{border-color:#C45E3E;color:#C45E3E;background:#FFF5F2;}
  .source-note{margin-top:14px;font-size:12px;color:#9B8C7E;line-height:1.6;font-style:italic;}

  .back-btn{display:inline-flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;color:#C45E3E;padding:0;margin:40px 0 0;text-decoration:underline;text-underline-offset:3px;}

  .page{max-width:900px;margin:0 auto;padding:40px 24px 80px;}
  .page-title{font-family:'Playfair Display',serif;font-size:clamp(24px,4vw,36px);margin-bottom:8px;}
  .page-sub{font-size:14px;color:#9B8C7E;margin-bottom:32px;}
  .empty-state{text-align:center;padding:60px 24px;color:#9B8C7E;font-size:15px;line-height:1.6;}
  .empty-state h3{font-family:'Playfair Display',serif;color:#3D2B1F;font-size:22px;margin-bottom:10px;}
  .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;}
  .recipe-card{background:#fff;border:1px solid #E0D8CC;border-radius:14px;padding:20px;cursor:pointer;transition:all .15s;}
  .recipe-card:hover{box-shadow:0 6px 24px rgba(61,43,31,.1);transform:translateY(-2px);border-color:#C45E3E;}
  .card-tag{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7A8C6E;margin-bottom:8px;}
  .card-title{font-family:'Playfair Display',serif;font-size:17px;line-height:1.3;margin-bottom:8px;}
  .card-desc{font-size:12px;color:#9B8C7E;line-height:1.5;margin-bottom:14px;}
  .card-meta{display:flex;gap:12px;font-size:11px;color:#9B8C7E;flex-wrap:wrap;}
  .card-actions{display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #E0D8CC;}
  .card-btn{flex:1;padding:7px;border-radius:8px;border:1px solid #E0D8CC;background:transparent;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;cursor:pointer;transition:all .12s;color:#9B8C7E;}
  .card-btn:hover{background:#F0EAE0;color:#3D2B1F;}
  .card-btn.danger:hover{background:#FEE;color:#C00;border-color:#C00;}

  .week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;}
  @media(max-width:700px){.week-grid{grid-template-columns:repeat(2,1fr);}}
  .day-card{border:1px solid #E0D8CC;border-radius:14px;background:#fff;min-height:140px;display:flex;flex-direction:column;overflow:hidden;transition:all .15s;}
  .day-card:hover{box-shadow:0 4px 16px rgba(61,43,31,.08);}
  .day-head{padding:10px 12px 8px;border-bottom:1px solid #E0D8CC;}
  .day-name{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#9B8C7E;font-weight:500;}
  .day-body{flex:1;padding:10px 12px;display:flex;flex-direction:column;}
  .day-recipe-title{font-family:'Playfair Display',serif;font-size:13px;line-height:1.3;margin-bottom:4px;}
  .day-recipe-meta{font-size:10px;color:#9B8C7E;}
  .day-actions{display:flex;gap:6px;margin-top:8px;}
  .day-btn{flex:1;padding:5px;border-radius:6px;border:1px solid #E0D8CC;background:transparent;font-size:10px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .12s;color:#9B8C7E;}
  .day-btn.add{border-style:dashed;color:#C45E3E;width:100%;margin-top:auto;}
  .day-btn.add:hover{background:#FFF5F2;border-color:#C45E3E;}
  .day-btn:not(.add):hover{background:#F0EAE0;color:#3D2B1F;}

  .consol-section{margin-top:48px;padding-top:36px;border-top:1px solid #E0D8CC;}
  .consol-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;}
  .consol-title{font-family:'Playfair Display',serif;font-size:22px;}

  .modal-overlay{position:fixed;inset:0;background:rgba(61,43,31,.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;}
  .modal{background:#FAF7F2;border-radius:18px;padding:28px;width:100%;max-width:480px;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);}
  .modal-title{font-family:'Playfair Display',serif;font-size:20px;margin-bottom:18px;flex-shrink:0;}
  .modal-list{overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:8px;}
  .modal-item{background:#fff;border:1px solid #E0D8CC;border-radius:10px;padding:12px 14px;cursor:pointer;transition:all .12s;}
  .modal-item:hover{border-color:#C45E3E;background:#FFF8F5;}
  .modal-item-title{font-family:'Playfair Display',serif;font-size:15px;}
  .modal-item-meta{font-size:11px;color:#9B8C7E;margin-top:3px;}
  .modal-close{margin-top:16px;flex-shrink:0;background:none;border:1px solid #E0D8CC;border-radius:100px;padding:8px 20px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;color:#9B8C7E;transition:all .12s;}
  .modal-close:hover{background:#F0EAE0;color:#3D2B1F;}

  .error-box{text-align:center;padding:60px 24px;color:#9B8C7E;}
  .error-box h3{font-family:'Playfair Display',serif;color:#3D2B1F;margin-bottom:8px;}

  @media print {
    .nav,.recipe-header-actions,.scaler,.shop-btns,.back-btn,
    .source-links,.card-actions,.grocery-section,.scan-divider,.scan-area{display:none !important;}
    body{background:#fff;}
    .recipe-page{max-width:100%;padding:0;}
    .two-col{grid-template-columns:200px 1fr;gap:24px;}
    .ing-item,.step-item{break-inside:avoid;}
  }
`;

const SUGGESTIONS = ["Chicken Tikka Masala","Beef Tacos","Pasta Carbonara","Lemon Herb Salmon","Veggie Stir Fry","Classic Chili","Butter Chicken","Thai Green Curry"];
const DIETS    = ["Vegetarian","Vegan","Gluten-Free","Dairy-Free","Keto","Low-Carb"];
const DAYS     = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAY_KEYS = ["mon","tue","wed","thu","fri","sat","sun"];
const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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

function parseNum(s: string): number|null {
  const t=s.trim();
  const mx=t.match(/^(\d+)\s+(\d+)\/(\d+)$/);if(mx)return+mx[1]+ +mx[2]/+mx[3];
  const fx=t.match(/^(\d+)\/(\d+)$/);if(fx)return+fx[1]/+fx[2];
  const n=parseFloat(t);return isNaN(n)?null:n;
}
function formatNum(n: number): string {
  const w=Math.floor(n),r=n-w;
  const fs:Array<[number,string]>=[[.125,"⅛"],[.25,"¼"],[.333,"⅓"],[.375,"⅜"],[.5,"½"],[.625,"⅝"],[.667,"⅔"],[.75,"¾"],[.875,"⅞"]];
  for(const[v,sym]of fs)if(Math.abs(r-v)<.06)return w>0?`${w} ${sym}`:sym;
  if(r<.05||r>.95)return String(Math.round(n));
  return n.toFixed(1).replace(/\.0$/,"");
}
function scaleAmt(str: string, ratio: number): string {
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

function buildPrompt(dish: string, diets: string[], seasonal: boolean, location: string): string {
  const d=diets.length?" Dietary needs: "+diets.join(", ")+".":"";
  const now=new Date();
  const monthYear=MONTHS[now.getMonth()]+" "+now.getFullYear();
  const s=seasonal&&location
    ?` This is a seasonal recipe for ${location} in ${monthYear}. Prioritize produce and proteins at peak right now. Include a seasonal_note (one sentence) naming key seasonal ingredients.`
    :seasonal
    ?` Prioritize ingredients currently in season (${monthYear}). Include a seasonal_note naming key seasonal ingredients.`
    :"";
  return `Create a recipe for "${dish}".${d}${s}

Reply with ONLY a valid JSON object, no other text, no markdown:
{
  "title":"...",
  "tagline":"...",
  "prep_time":"X mins",
  "cook_time":"X mins",
  "servings":"4",
  "ingredient_groups":[
    {"label":"For the Marinade","items":[{"amount":"2 tbsp","name":"soy sauce"}]},
    {"label":"","items":[{"amount":"1 cup","name":"jasmine rice"}]}
  ],
  "steps":["Detailed step one.","Detailed step two."],
  "grocery_items":["soy sauce","jasmine rice"],
  "sources":["AllRecipes","Serious Eats"],
  "source_note":"...",
  "seasonal_note":"..."
}

Rules: group ingredients by component (Marinade, Sauce, Dough, etc.) when it adds clarity. Simple recipes use one group with empty label. 6-10 steps. grocery_items: flat names only. sources: 2-3 real sites. seasonal_note: only if seasonal requested.`;
}

function buildScanPrompt(): string {
  return `Extract the recipe from this image. Reply with ONLY a valid JSON object, no other text:
{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","servings":"4","ingredient_groups":[{"label":"","items":[{"amount":"2 tbsp","name":"olive oil"}]}],"steps":["Full step."],"grocery_items":["olive oil"],"sources":[],"source_note":"Digitized from a recipe card."}
Group ingredients by component if applicable. Expand abbreviated instructions into full sentences.`;
}

// Calls our own Next.js API route — keeps the Anthropic key server-side
async function callAPI(messages: any[]): Promise<any> {
  const res = await fetch("/api/recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2048, messages }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error("HTTP " + res.status + ": " + raw.slice(0, 300));
  let data: any;
  try { data = JSON.parse(raw); } catch { throw new Error("Response not JSON: " + raw.slice(0, 200)); }
  if (data.error) throw new Error("API: " + JSON.stringify(data.error).slice(0, 200));
  const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  if (!text.trim()) throw new Error("Empty response");
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s === -1) throw new Error("No JSON found: " + text.slice(0, 200));
  return JSON.parse(text.slice(s, e + 1));
}

// localStorage helpers
function lsGet(key: string): any {
  if (typeof window === "undefined") return null;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
function lsSet(key: string, val: any) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export default function App() {
  const [tab, setTab]             = useState("search");
  const [query, setQuery]         = useState("");
  const [diets, setDiets]         = useState<string[]>([]);
  const [seasonal, setSeasonal]   = useState(false);
  const [location, setLocation]   = useState("");
  const [detecting, setDetecting] = useState(false);
  const [status, setStatus]       = useState("idle");
  const [recipe, setRecipe]       = useState<any>(null);
  const [servings, setServings]   = useState<number|null>(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [saved, setSaved]         = useState<any[]>([]);
  const [plan, setPlan]           = useState<Record<string,any>>({});
  const [assignDay, setAssignDay] = useState<string|null>(null);
  const [scanPreview, setScanPreview] = useState<string|null>(null);
  const [scanMime, setScanMime]       = useState("image/jpeg");
  const [scanStatus, setScanStatus]   = useState("idle");
  const [scanMsg, setScanMsg]         = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    setSaved(lsGet("dw-saved") || []);
    setPlan(lsGet("dw-plan") || {});
    setLocation(lsGet("dw-location") || "");
  }, []);

  useEffect(() => { lsSet("dw-saved", saved); }, [saved]);
  useEffect(() => { lsSet("dw-plan", plan); }, [plan]);
  useEffect(() => { if (location) lsSet("dw-location", location); }, [location]);

  const detectLocation = () => {
    if (!navigator.geolocation) { setLocation("Location unavailable"); return; }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const d = await r.json();
        const city = d.address?.city || d.address?.town || d.address?.village || "";
        const state = d.address?.state || d.address?.country || "";
        setLocation(city && state ? `${city}, ${state}` : state || city || `${lat.toFixed(1)}, ${lon.toFixed(1)}`);
      } catch { setLocation("Location detected"); }
      setDetecting(false);
    }, () => { setDetecting(false); setLocation("Could not detect"); });
  };

  const doSearch = async (dish?: string) => {
    const q = (dish || query).trim(); if (!q) return;
    setStatus("loading"); setRecipe(null); setServings(null); setErrorMsg("");
    try {
      const parsed = await callAPI([{ role: "user", content: buildPrompt(q, diets, seasonal, location) }]);
      setRecipe({ ...parsed, id: Date.now(), _dish: q }); setStatus("done");
    } catch (e: any) { setErrorMsg(e.message || String(e)); setStatus("error"); }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setScanMime(file.type || "image/jpeg"); setScanStatus("idle"); setScanMsg("");
    const reader = new FileReader();
    reader.onload = (ev) => setScanPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const doScan = async () => {
    if (!scanPreview) return;
    setScanStatus("scanning"); setScanMsg("");
    try {
      const b64 = scanPreview.split(",")[1];
      const parsed = await callAPI([{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: scanMime, data: b64 } },
        { type: "text", text: buildScanPrompt() },
      ]}]);
      const r = { ...parsed, id: Date.now(), _dish: parsed.title || "Scanned Recipe", _scanned: true };
      setSaved(l => [r, ...l]);
      setScanStatus("done"); setScanMsg(`"${r.title}" saved to your collection!`);
      setScanPreview(null); if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) { setScanStatus("error"); setScanMsg(e.message || String(e)); }
  };

  const clearScan = () => { setScanPreview(null); setScanStatus("idle"); setScanMsg(""); if (fileRef.current) fileRef.current.value = ""; };
  const toggleDiet = (d: string) => setDiets(f => f.includes(d) ? f.filter(x => x !== d) : [...f, d]);
  const isSaved = (r: any) => r && saved.some((s: any) => s.id === r.id);
  const toggleSave = (r: any) => { if (!r) return; isSaved(r) ? setSaved(l => l.filter((s: any) => s.id !== r.id)) : setSaved(l => [r, ...l]); };

  const baseS = recipe ? (parseInt(recipe.servings) || 4) : 4;
  const curS = servings || baseS;
  const ratio = curS / baseS;
  const consolidated = consolidate(plan);
  const mealsPlanned = DAY_KEYS.filter(k => plan[k]).length;

  const SearchView = () => (
    <>
      {status !== "done" && (
        <div className="hero">
          <div className="hero-eyebrow">Recipe Finder</div>
          <h1 className="hero-title">What would you<br /><em>like to cook?</em></h1>
          <p className="hero-sub">We synthesize the best recipes from across the web — no ads, no scrolling, just great food.</p>
          <div className="search-wrap">
            <div className="search-bar">
              <input ref={inputRef} className="search-input" placeholder="e.g. Chicken Tikka Masala…"
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch()} disabled={status === "loading"} />
              <button className="search-btn" onClick={() => doSearch()} disabled={status === "loading" || !query.trim()}>
                {status === "loading" ? "Searching…" : "Find Recipe →"}
              </button>
            </div>
            <div className="filter-label">Dietary Filters</div>
            <div className="diet-filters">
              {DIETS.map(d => (
                <button key={d} className={`diet-chip${diets.includes(d) ? " on" : ""}`} onClick={() => toggleDiet(d)}>{d}</button>
              ))}
            </div>
            <div className="seasonal-row">
              <button className={`seasonal-chip${seasonal ? " on" : ""}`} onClick={() => setSeasonal(v => !v)}>
                🌱 {seasonal ? "In Season — On" : "In Season"}
              </button>
              {seasonal && (
                <div className="location-wrap">
                  <input className="location-input" placeholder="City, State…" value={location} onChange={e => setLocation(e.target.value)} />
                  <button className="location-detect" onClick={detectLocation} disabled={detecting}>{detecting ? "Detecting…" : "📍 Detect"}</button>
                </div>
              )}
            </div>
            <div className="suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="suggestion-chip" onClick={() => { setQuery(s); doSearch(s); }}>{s}</button>
              ))}
            </div>
          </div>
          <div className="scan-divider">
            <div className="scan-divider-line" /><div className="scan-divider-text">or scan a recipe card</div><div className="scan-divider-line" />
          </div>
          <div className="scan-area">
            {!scanPreview ? (
              <>
                <div className="scan-icon">📸</div>
                <div className="scan-label">Digitize Grandma's Recipe Card</div>
                <div className="scan-sub">Snap or upload a photo of any handwritten or printed recipe card</div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
                <button className="scan-upload-btn" onClick={() => fileRef.current?.click()}>Choose Photo</button>
              </>
            ) : (
              <>
                <img src={scanPreview} className="scan-preview" alt="Recipe preview" />
                <div className="scan-actions">
                  <button className="scan-go-btn" onClick={doScan} disabled={scanStatus === "scanning"}>{scanStatus === "scanning" ? "Extracting…" : "✨ Digitize Recipe"}</button>
                  <button className="scan-clear-btn" onClick={clearScan}>Clear</button>
                </div>
              </>
            )}
            {scanStatus === "done" && scanMsg && (
              <div className="scan-success">✓ {scanMsg}{" "}
                <button onClick={() => setTab("saved")} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a6040", textDecoration: "underline", fontSize: 13 }}>View in Saved →</button>
              </div>
            )}
            {scanStatus === "error" && <div style={{ marginTop: 10, fontSize: 12, color: "#C45E3E" }}>{scanMsg}</div>}
          </div>
        </div>
      )}
      {status === "loading" && (
        <div className="loading-wrap">
          <div className="spinner" />
          <div className="loading-text">{seasonal ? "Finding what's fresh near you…" : "Gathering the finest recipes…"}</div>
          <div className="loading-sub">Synthesizing techniques from top sources</div>
        </div>
      )}
      {status === "error" && (
        <div className="error-box">
          <h3>Something went wrong</h3>
          <p style={{ fontSize: 12, fontFamily: "monospace", background: "#f5f5f5", padding: "8px 12px", borderRadius: 6, marginTop: 8, textAlign: "left", wordBreak: "break-all", color: "#555" }}>{errorMsg || "Unknown error"}</p>
          <button className="back-btn" onClick={() => setStatus("idle")}>← Try again</button>
        </div>
      )}
      {status === "done" && recipe && RecipeView()}
    </>
  );

  const RecipeView = () => {
    const sv = isSaved(recipe);
    const dish = recipe._dish || recipe.title || "";
    const sources = recipe.sources || [];
    const firstItem = (recipe.grocery_items || [])[0] || "";
    const groups = recipe.ingredient_groups || (recipe.ingredients ? [{ label: "", items: recipe.ingredients }] : []);
    return (
      <div className="recipe-page">
        <div className="recipe-header">
          <div className="recipe-header-actions">
            <button className="print-btn" onClick={() => window.print()}>🖨 Print</button>
            <button className={`save-btn${sv ? " saved" : ""}`} onClick={() => toggleSave(recipe)}>{sv ? "♥ Saved" : "♡ Save"}</button>
          </div>
          <div className="recipe-tag">{recipe._scanned ? "📸 Digitized Recipe Card" : "Synthesized Recipe"}</div>
          <h2 className="recipe-title">{recipe.title}</h2>
          <p className="recipe-desc">{recipe.tagline}</p>
          {recipe.seasonal_note && <div className="seasonal-note">🌱 {recipe.seasonal_note}</div>}
          <div className="recipe-meta">
            <div className="meta-item"><div className="meta-label">Prep</div><div className="meta-value">{recipe.prep_time}</div></div>
            <div className="meta-item"><div className="meta-label">Cook</div><div className="meta-value">{recipe.cook_time}</div></div>
            <div className="meta-item">
              <div className="meta-label">Servings</div>
              <div className="scaler">
                <button className="scaler-btn" onClick={() => setServings(Math.max(1, curS - 1))}>−</button>
                <span className="scaler-val">{curS} {curS === 1 ? "serving" : "servings"}</span>
                <button className="scaler-btn" onClick={() => setServings(curS + 1)}>+</button>
              </div>
            </div>
          </div>
        </div>
        <div className="two-col">
          <div>
            <div className="section-label">Ingredients</div>
            {groups.map((g: any, gi: number) => (
              <div key={gi} className="ing-group">
                {g.label && <div className="ing-group-label">{g.label}</div>}
                <ul className="ing-list">
                  {(g.items || []).map((ing: any, ii: number) => (
                    <li key={ii} className="ing-item">
                      <span className="ing-dot" />
                      <span><span className="ing-amount">{scaleAmt(ing.amount, ratio)}</span>{" "}<span className="ing-name">{ing.name}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div>
            <div className="section-label">Method</div>
            <ol className="steps-list">
              {(recipe.steps || []).map((step: string, i: number) => (
                <li key={i} className="step-item">
                  <span className="step-num">{String(i + 1).padStart(2, "0")}</span>
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
              <a href={`https://www.walmart.com/search?q=${encodeURIComponent(firstItem)}`} target="_blank" rel="noopener noreferrer" className="shop-btn btn-wm">🛒 Walmart</a>
              <a href={`https://www.target.com/s?searchTerm=${encodeURIComponent(firstItem)}`} target="_blank" rel="noopener noreferrer" className="shop-btn btn-tg">🎯 Target</a>
            </div>
          </div>
          <div className="grocery-grid">
            {(recipe.grocery_items || []).map((item: string, i: number) => (
              <div key={i} className="grocery-card"><input type="checkbox" className="grocery-check" /><span className="grocery-name">{item}</span></div>
            ))}
          </div>
        </div>
        {sources.length > 0 && (
          <div className="source-section">
            <div className="source-section-label">Explore more on</div>
            <div className="source-links">
              {sources.map((s: string, i: number) => (
                <a key={i} href={getSiteUrl(s, dish)} target="_blank" rel="noopener noreferrer" className="source-link">{s} ↗</a>
              ))}
            </div>
            {recipe.source_note && <div className="source-note">{recipe.source_note}</div>}
          </div>
        )}
        <button className="back-btn" onClick={() => { setStatus("idle"); setRecipe(null); setQuery(""); }}>← Search another recipe</button>
      </div>
    );
  };

  const SavedView = () => (
    <div className="page">
      <div className="page-title">Saved Recipes</div>
      <div className="page-sub">Your collection — tap any card to view.</div>
      {saved.length === 0 ? (
        <div className="empty-state"><h3>Nothing saved yet</h3><p>Search for a recipe and hit ♡ Save, or scan a recipe card.</p></div>
      ) : (
        <div className="cards-grid">
          {saved.map((r: any) => (
            <div key={r.id} className="recipe-card" onClick={() => { setRecipe(r); setServings(null); setStatus("done"); setTab("search"); }}>
              <div className="card-tag">{r._scanned ? "📸 Recipe Card" : r.seasonal_note ? "🌱 Seasonal" : "Saved Recipe"}</div>
              <div className="card-title">{r.title}</div>
              <div className="card-desc">{r.tagline}</div>
              <div className="card-meta"><span>⏱ {r.prep_time}</span><span>🍳 {r.cook_time}</span><span>🍽 {r.servings} servings</span></div>
              <div className="card-actions" onClick={e => e.stopPropagation()}>
                <button className="card-btn" onClick={() => { setAssignDay("fromSaved_" + r.id); setTab("week"); }}>+ Add to Week</button>
                <button className="card-btn danger" onClick={() => setSaved(l => l.filter((s: any) => s.id !== r.id))}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const WeekView = () => (
    <div className="page">
      <div className="page-title">My Week</div>
      <div className="page-sub">Assign saved recipes to days. Combined grocery list appears below.</div>
      <div className="week-grid">
        {DAY_KEYS.map((key, i) => {
          const r = plan[key];
          return (
            <div key={key} className="day-card">
              <div className="day-head"><div className="day-name">{DAYS[i].slice(0, 3)}</div></div>
              <div className="day-body">
                {r ? (
                  <>
                    <div className="day-recipe-title">{r.title}</div>
                    <div className="day-recipe-meta">{r.cook_time}</div>
                    <div className="day-actions">
                      <button className="day-btn" onClick={() => { setRecipe(r); setServings(null); setStatus("done"); setTab("search"); }}>View</button>
                      <button className="day-btn" onClick={() => setPlan(p => { const n = { ...p }; delete n[key]; return n; })}>✕</button>
                    </div>
                  </>
                ) : (
                  <button className="day-btn add" onClick={() => setAssignDay(key)}>+ Add</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {mealsPlanned > 0 && (
        <div className="consol-section">
          <div className="consol-hdr">
            <div>
              <div className="consol-title">Combined Grocery List</div>
              <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{consolidated.length} items across {mealsPlanned} meal{mealsPlanned !== 1 ? "s" : ""}</p>
            </div>
            <div className="shop-btns">
              <a href={`https://www.walmart.com/search?q=${encodeURIComponent(consolidated[0]?.name || "")}`} target="_blank" rel="noopener noreferrer" className="shop-btn btn-wm">🛒 Walmart</a>
              <a href={`https://www.target.com/s?searchTerm=${encodeURIComponent(consolidated[0]?.name || "")}`} target="_blank" rel="noopener noreferrer" className="shop-btn btn-tg">🎯 Target</a>
            </div>
          </div>
          <div className="grocery-grid">
            {consolidated.map((item, i) => (
              <div key={i} className="grocery-card">
                <input type="checkbox" className="grocery-check" />
                <div>
                  <div className="grocery-name">{item.name}</div>
                  {item.recipes.length > 1 && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{item.recipes.length} meals</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {mealsPlanned === 0 && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <h3>Your week is open</h3>
          <p>Save some recipes, then click <strong>+ Add</strong> on any day.</p>
        </div>
      )}
    </div>
  );

  const Modal = () => {
    if (!assignDay) return null;
    const isRedirect = assignDay.startsWith("fromSaved_");
    const dayKey = isRedirect ? null : assignDay;
    return (
      <div className="modal-overlay" onClick={() => setAssignDay(null)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-title">{dayKey ? `Add recipe to ${DAYS[DAY_KEYS.indexOf(dayKey)]}` : "Choose a day"}</div>
          {isRedirect ? (
            <div className="modal-list">
              {DAY_KEYS.map((k, i) => {
                const rid = assignDay.replace("fromSaved_", "");
                const r = saved.find((s: any) => String(s.id) === rid);
                return (
                  <div key={k} className="modal-item" onClick={() => { if (r) { setPlan(p => ({ ...p, [k]: r })); setAssignDay(null); } }}>
                    <div className="modal-item-title">{DAYS[i]}</div>
                    {plan[k] && <div className="modal-item-meta">Currently: {plan[k].title}</div>}
                  </div>
                );
              })}
            </div>
          ) : saved.length === 0 ? <p style={{ color: C.muted, fontSize: 14 }}>No saved recipes yet.</p> : (
            <div className="modal-list">
              {saved.map((r: any) => (
                <div key={r.id} className="modal-item" onClick={() => { setPlan(p => ({ ...p, [dayKey!]: r })); setAssignDay(null); }}>
                  <div className="modal-item-title">{r.title}</div>
                  <div className="modal-item-meta">⏱ {r.prep_time} · 🍳 {r.cook_time}</div>
                </div>
              ))}
            </div>
          )}
          <button className="modal-close" onClick={() => setAssignDay(null)}>Cancel</button>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{CSS}</style>
      <nav className="nav">
        <div className="nav-brand">dish<span>wise</span></div>
        <div className="nav-tabs">
          {[{ key: "search", label: "Search" }, { key: "saved", label: "Saved", badge: saved.length || null }, { key: "week", label: "My Week", badge: mealsPlanned || null }]
            .map(({ key, label, badge }: any) => (
              <button key={key} className={`nav-tab${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>
                {label}{badge ? <span className="nav-badge">{badge}</span> : null}
              </button>
            ))}
        </div>
      </nav>
      {tab === "search" && SearchView()}
      {tab === "saved" && SavedView()}
      {tab === "week" && WeekView()}
      {Modal()}
    </>
  );
}

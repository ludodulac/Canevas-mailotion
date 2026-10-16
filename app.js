(()=>{
'use strict';
const REPO='ludodulac/Canevas-mailotion';
const STORE='mailotion-studio-v1';
const CATALOG_CACHE='mailotion-studio-catalog-v1';
const FIELD_NAMES=['name','brand','logoText','subject','preheader','kicker','heading','intro','body','heroImage','productImage','productTitle','productDescription','productPrice','showProduct','showPromo','promoText','promoCode','buttonText','buttonUrl','reassurance','footerText','footerEmail','background','paper','accent','dark','muted','font'];
const BOOL=new Set(['showProduct','showPromo']);
const COLORS=new Set(['background','paper','accent','dark','muted']);
const LIMIT={name:110,brand:85,logoText:110,subject:180,preheader:180,kicker:130,heading:220,intro:500,body:1600,heroImage:500,productImage:500,productTitle:110,productDescription:180,productPrice:35,promoText:120,promoCode:55,buttonText:100,buttonUrl:600,reassurance:360,footerText:400,footerEmail:160};
const FALLBACK={name:'Mon canevas',brand:'MA BOUTIQUE',logoText:'MA BOUTIQUE',subject:'Un mot de notre boutique',preheader:'',kicker:'BONJOUR',heading:'Bienvenue chez nous.',intro:'Un petit mot rien que pour vous.',body:'Merci de faire partie de notre univers.',heroImage:'',productImage:'',productTitle:'',productDescription:'',productPrice:'',showProduct:false,showPromo:false,promoText:'',promoCode:'',buttonText:'DÉCOUVRIR',buttonUrl:'',reassurance:'',footerText:'Merci pour votre confiance.',footerEmail:'',background:'#f6f1f5',paper:'#ffffff',accent:'#8256a8',dark:'#342340',muted:'#887c8a',font:'Georgia'};
const state={catalog:[],drafts:[],active:null,mobile:'edit',busy:false,syncDate:null};
let saveTimer,toastTimer,resizeObserver;
const $=id=>document.getElementById(id);
const plain=(x,max=2000)=>String(x??'').slice(0,max);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isHex=s=>/^#[0-9A-Fa-f]{6}$/.test(s);
const color=(x,f)=>isHex(x)?x:f;
const safeFont=x=>['Georgia','Arial','Trebuchet MS'].includes(x)?x:'Georgia';
const safeImage=raw=>{
 const v=plain(raw,1500000).trim();
 if(/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(v))return v;
 if(!v||v.startsWith('//')||/^[^:]+:[^/]/.test(v)&&!/^https?:\/\//.test(v))return '';
 try{
  const url=new URL(v,location.href);
  if(!/^https?:$/.test(url.protocol))return '';
  return url.href;
 }catch{return ''}
};
const safeLink=raw=>{
 const v=plain(raw,600).trim();
 if(!v)return '';
 try{const u=new URL(/^https?:\/\//i.test(v)?v:'https://'+v);return /^https?:$/.test(u.protocol)?u.href:''}catch{return ''}
};
const mailto=raw=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw||''))?'mailto:'+encodeURIComponent(raw):'';
const dateKey=()=>new Date().toISOString().slice(0,10);
const fileKey=str=>(String(str||'canevas').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60))||'canevas';
const uid=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
const download=(blob,filename)=>{
 const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),90000);
};
const toast=msg=>{const e=$('toast');e.textContent=msg;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),4600)};
function sanitize(obj,mode='catalog'){
 if(!obj||typeof obj!=='object'||Array.isArray(obj))return null;
 const c={...FALLBACK};
 for(const key of FIELD_NAMES){
  if(BOOL.has(key)){c[key]=obj[key]===true||obj[key]==='true'}
  else if(COLORS.has(key)){c[key]=color(obj[key],FALLBACK[key])}
  else if(key==='font'){c[key]=safeFont(obj[key])}
  else{c[key]=plain(obj[key]??FALLBACK[key],LIMIT[key]||180)}
 }
 c.id=plain(obj.id||uid(),125).replace(/[^a-zA-Z0-9_-]/g,'_')||uid();
 c.type=plain(obj.type||'Email marketing',70);
 c.audience=plain(obj.audience||'',95);
 c.parentId=plain(obj.parentId||'',125);
 c.createdAt=plain(obj.createdAt||'',45);
 c.updatedAt=plain(obj.updatedAt||'',45);
 return c;
}
function readStore(){
 try{const data=JSON.parse(localStorage.getItem(STORE)||'{}');
  if(Array.isArray(data.drafts))state.drafts=data.drafts.slice(0,80).map(t=>sanitize(t,'draft')).filter(Boolean);
  if(typeof data.active==='string')state.active=data.active;
 }catch{toast('Stockage local inaccessible : tu pourras exporter tes créations.')}
}
function persist(){
 clearTimeout(saveTimer);saveTimer=setTimeout(()=>{
  try{localStorage.setItem(STORE,JSON.stringify({version:1,drafts:state.drafts,active:state.active,updatedAt:new Date().toISOString()}));$('saveIndicator').textContent=state.active?.startsWith('draft:')?'✓ Enregistré':'○ Modèle';}
  catch(e){toast('Le stockage du téléphone est saturé. Exporte une sauvegarde JSON de tes créations.');$('saveIndicator').textContent='⚠ Sauvegarde impossible';}
 },220);
}
function current(){
 if(!state.active)return state.catalog[0]||null;
 const [kind,id]=state.active.split(':');
 return kind==='draft'?(state.drafts.find(t=>t.id===id)||state.catalog[0]||null):(state.catalog.find(t=>t.id===id)||state.catalog[0]||null);
}
function setActive(kind,id,scroll=false){
 const found=(kind==='draft'?state.drafts:state.catalog).find(t=>t.id===id);
 if(!found)return;
 state.active=kind+':'+id;
 populateFields();renderCatalog();renderPreview();persist();
 if(scroll){document.querySelector('.workspace').scrollIntoView({behavior:'smooth',block:'start'})}
}
function renderCatalog(){
 const all=[...state.catalog.map(t=>({kind:'base',data:t})),...state.drafts.map(t=>({kind:'draft',data:t}))];
 $('modelCount').textContent=all.length+' canevas';
 $('modelList').innerHTML=all.length?all.map(({kind,data:t})=>{
  const selected=state.active===kind+':'+t.id;
  const img=safeImage(t.heroImage);
  const cover=img?'<img src="'+escape(img)+'" alt="" loading="lazy">':'✉';
  return '<button type="button" class="model-card '+(selected?'active':'')+'" data-kind="'+kind+'" data-id="'+escape(t.id)+'" aria-pressed="'+selected+'">'+
   '<span class="model-thumb '+(img?'':'fallback')+'">'+cover+'</span><span class="model-info"><span class="model-tag '+(kind==='draft'?'local':'')+'">'+(kind==='draft'?'✎ Ma version':'✦ Modèle')+'</span>'+
   '<b>'+escape(t.name)+'</b><small>'+escape(t.type)+(t.audience?' · '+escape(t.audience):'')+'</small></span></button>'
 }).join(''):'<div class="library-loading">Pas encore de canevas. Actualise depuis GitHub.</div>';
}
function populateFields(){
 const t=current();if(!t)return;
 for(const field of document.querySelectorAll('[data-field]')){
   const k=field.dataset.field;
   field[BOOL.has(k)?'checked':'value']=BOOL.has(k)?!!t[k]:(t[k]||'');
   if(k==='heroImage'&&t.heroImage?.startsWith('data:'))field.value=''; // photo locale stockée mais pas affichée sous forme base64 illisible
   if(k==='productImage'&&t.productImage?.startsWith('data:'))field.value='';
 }
 $('activeName').textContent=t.name;
 $('activeType').textContent=t.type+(state.active?.startsWith('draft:')?' · Mon brouillon':' · Modèle');
 $('deleteBtn').hidden=!state.active?.startsWith('draft:');
 $('saveIndicator').textContent=state.active?.startsWith('draft:')?'✓ Enregistré':'○ Modèle';
}
function ensureDraft(){
 if(state.active?.startsWith('draft:'))return current();
 const base=current();if(!base)return null;
 const draft={...base,id:'draft-'+uid(),parentId:base.id,name:base.name+' · Ma version',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 state.drafts.unshift(draft);state.active='draft:'+draft.id;
 $('name').value=draft.name;
 return draft;
}
function handleChange(event){
 const node=event.target;
 if(!node.matches('[data-field]'))return;
 const key=node.dataset.field, draft=ensureDraft();if(!draft)return;
 draft[key]=BOOL.has(key)?node.checked:node.value;
 if((key==='heroImage'||key==='productImage')&&!node.value.trim())draft[key]='';
 draft.updatedAt=new Date().toISOString();
 $('activeName').textContent=draft.name;
 $('activeType').textContent=draft.type+' · Mon brouillon';
 $('deleteBtn').hidden=false;
 $('saveIndicator').textContent='● Sauvegarde…';
 renderCatalog();renderPreview();persist();
}
function formatText(str){return escape(str).replace(/\n/g,'<br>')}
function makeEmail(t){
 const bg=color(t.background,FALLBACK.background),paper=color(t.paper,FALLBACK.paper),accent=color(t.accent,FALLBACK.accent),
 dark=color(t.dark,FALLBACK.dark),muted=color(t.muted,FALLBACK.muted),font=safeFont(t.font);
 const image=safeImage(t.heroImage),productImg=safeImage(t.productImage)||image,link=safeLink(t.buttonUrl);
 const top='style="border-collapse:collapse;border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt;"';
 const cta=t.buttonText?'<tr><td align="center" style="padding:18px 58px 39px;background-color:'+paper+'">'+
  (link?'<a href="'+escape(link)+'" target="_blank" style="display:inline-block;padding:18px 28px;background-color:'+accent+';border-radius:3px;text-decoration:none;color:#ffffff;font:bold 12px Arial,sans-serif;letter-spacing:1.3px;">'+escape(t.buttonText)+'</a>':'<span style="display:inline-block;padding:18px 28px;background-color:'+accent+';border-radius:3px;color:#ffffff;font:bold 12px Arial,sans-serif;letter-spacing:1.3px">'+escape(t.buttonText)+'</span>')+'</td></tr>':'';
 const hero=image?'<tr><td style="background-color:'+bg+'"><img src="'+escape(image)+'" width="600" alt="Visuel '+escape(t.brand)+'" style="display:block;width:600px;height:auto;border:0"></td></tr>':'';
 const product=t.showProduct?'<tr><td style="padding:0 53px 32px;background-color:'+paper+'"><table width="494" cellpadding="0" cellspacing="0" style="width:494px;background-color:'+bg+';border-collapse:collapse">'+
  '<tr>'+(productImg?'<td width="161" valign="middle" style="width:161px"><img src="'+escape(productImg)+'" width="161" alt="" style="display:block;width:161px;height:155px;object-fit:cover;border:0"></td>':'')+
  '<td valign="middle" style="padding:25px 22px"><div style="font:700 11px Arial,sans-serif;letter-spacing:2px;color:'+accent+';margin-bottom:11px">VOTRE SÉLECTION</div>'+
  '<div style="font:22px '+font+',serif;line-height:1.27;color:'+dark+'">'+formatText(t.productTitle)+'</div>'+
  '<div style="font:13px Arial,sans-serif;line-height:1.7;color:'+muted+';margin-top:7px">'+formatText(t.productDescription)+'</div>'+
  '<div style="font:700 17px Arial,sans-serif;color:'+dark+';margin-top:13px">'+escape(t.productPrice)+'</div></td></tr></table></td></tr>':'';
 const promo=t.showPromo?'<tr><td align="center" style="padding:5px 60px 30px;background-color:'+paper+'">'+
  '<table width="480" cellpadding="0" cellspacing="0" style="width:480px;border:1px solid '+accent+';border-collapse:collapse"><tr><td align="center" style="padding:24px 15px">'+
  '<div style="font:bold 11px Arial,sans-serif;letter-spacing:1.7px;color:'+accent+'">'+escape(t.promoText)+'</div>'+
  (t.promoCode?'<div style="font:bold 25px Arial,sans-serif;letter-spacing:3px;color:'+dark+';margin-top:13px">'+escape(t.promoCode)+'</div>':'')+
  '</td></tr></table></td></tr>':'';
 const footerEmail=mailto(t.footerEmail);
 return '<table class="email-root" width="600" cellpadding="0" cellspacing="0" align="center" '+top+' style="width:600px;max-width:600px;border-collapse:collapse;border-spacing:0;background-color:'+bg+';table-layout:fixed" role="presentation">'+
  '<tr><td align="center" style="padding:13px 30px 8px;background-color:'+bg+';font:10px Arial,sans-serif;letter-spacing:1px;color:'+muted+'">'+escape(t.brand)+' · Un message pensé pour vous</td></tr>'+
  '<tr><td align="center" style="padding:27px 20px;background-color:'+paper+';font:bold 28px '+font+',serif;letter-spacing:3px;color:'+dark+'">'+escape(t.logoText||t.brand)+'</td></tr>'+
  hero+
  '<tr><td align="center" style="padding:45px 62px 0;background-color:'+paper+'">'+
  '<div style="font:bold 11px Arial,sans-serif;letter-spacing:2.5px;line-height:1.6;color:'+accent+'">'+escape(t.kicker)+'</div>'+
  '<div style="font:normal 43px/1.14 '+font+',Georgia,serif;letter-spacing:-.6px;color:'+dark+';margin:17px 0 19px">'+formatText(t.heading)+'</div>'+
  '<div style="font:normal 18px/1.65 '+font+',Georgia,serif;color:'+dark+';margin:0 0 16px">'+formatText(t.intro)+'</div>'+
  '<div style="font:normal 14px/1.9 Arial,sans-serif;color:'+muted+';padding-bottom:30px">'+formatText(t.body)+'</div></td></tr>'+
  product+promo+cta+
  '<tr><td align="center" style="padding:0 44px 38px;background-color:'+paper+'"><div style="height:1px;background-color:'+bg+';margin:0 0 29px"></div>'+
  '<div style="font:12px/1.9 Arial,sans-serif;color:'+muted+'">'+formatText(t.reassurance)+'</div></td></tr>'+
  '<tr><td align="center" style="padding:30px 60px 42px;background-color:'+bg+'">'+
  '<div style="font:bold 19px '+font+',Georgia,serif;letter-spacing:1.5px;color:'+dark+'">'+escape(t.brand)+'</div>'+
  '<div style="font:12px/1.75 Arial,sans-serif;color:'+muted+';margin-top:15px">'+formatText(t.footerText)+'</div>'+
  (t.footerEmail?'<div style="font:12px Arial,sans-serif;margin-top:16px"><a href="'+escape(footerEmail)+'" style="color:'+accent+';text-decoration:underline">'+escape(t.footerEmail)+'</a></div>':'')+
  '<div style="margin-top:24px;font:9px Arial,sans-serif;letter-spacing:.7px;color:'+muted+'">EXEMPLE DE DESIGN EMAIL · À PERSONNALISER</div></td></tr>'+
  '</table>';
}
function renderPreview(){
 const t=current();if(!t)return;
 $('subjectPreview').textContent=t.subject||'Objet de l’email';
 $('preheaderPreview').textContent=t.preheader||'Pré-en-tête';
 $('inboxAvatar').textContent=(t.brand||'M').slice(0,1).toUpperCase();
 $('emailCanvas').innerHTML=makeEmail(t);
 // Recalculate when images finish loading
 for(const img of $('emailCanvas').querySelectorAll('img')){if(!img.complete){img.addEventListener('load',resizePreview,{once:true});img.addEventListener('error',resizePreview,{once:true})}}
 resizePreview();
}
function resizePreview(){
 const frame=$('emailClip'),node=$('emailCanvas');if(!frame||!node)return;
 const s=Math.min(1,frame.clientWidth/600);
 node.style.transform='scale('+s+')';
 frame.style.height=Math.ceil(node.scrollHeight*s)+'px';
}
async function fetchCatalog(silent=false){
 $('refreshBtn').disabled=true;
 try{
  const response=await fetch('./templates.json?v='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const json=await response.json();
  if(!Array.isArray(json.templates))throw Error('Le fichier templates.json ne contient pas de tableau templates.');
  const clean=json.templates.slice(0,80).map(t=>sanitize(t)).filter(Boolean);
  if(!clean.length)throw Error('Le fichier de modèles est vide.');
  state.catalog=clean;
  try{localStorage.setItem(CATALOG_CACHE,JSON.stringify(clean))}catch{}
  if(!current()||!state.active)state.active='base:'+state.catalog[0].id;
  state.syncDate=new Date();
  $('syncState').textContent='Modèles mis à jour depuis GitHub';
  renderCatalog();populateFields();renderPreview();persist();
  if(!silent)toast(clean.length+' canevas disponibles. Les créations privées sont conservées.');
 }catch(e){
  let cache=null;try{cache=JSON.parse(localStorage.getItem(CATALOG_CACHE)||'null')}catch{}
  if(Array.isArray(cache)&&cache.length){state.catalog=cache;if(!current()||!state.active)state.active='base:'+cache[0].id;renderCatalog();populateFields();renderPreview();$('syncState').textContent='Hors ligne · derniers modèles connus';if(!silent)toast('Réseau indisponible, anciens modèles chargés.')}
  else{$('syncState').textContent='Modèles indisponibles — utilise Actualiser';renderCatalog();if(!silent)toast("Impossible de charger les modèles. Vérifie GitHub Pages.")}
 }finally{$('refreshBtn').disabled=false}
}
function duplicate(){
 const t=current();if(!t)return;
 const clone={...t,id:'draft-'+uid(),parentId:t.parentId||t.id,name:t.name+' · Copie',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 state.drafts.unshift(clone);setActive('draft',clone.id);toast('Copie créée, tu peux la personnaliser librement.');
}
function reset(){
 const t=current();if(!t)return;
 if(state.active?.startsWith('base:')){toast('C’est déjà le modèle original.');return}
 if(!confirm('Repartir du canevas initial ? Tes modifications de cette version seront remplacées.'))return;
 const base=state.catalog.find(b=>b.id===t.parentId);
 const reset=base?{...base,id:t.id,parentId:t.parentId,name:t.name,createdAt:t.createdAt,updatedAt:new Date().toISOString()}:{...FALLBACK,id:t.id,parentId:t.parentId,name:t.name,createdAt:t.createdAt,updatedAt:new Date().toISOString(),type:t.type,audience:t.audience};
 Object.assign(t,reset);setActive('draft',t.id);toast('Canevas réinitialisé.');
}
function deleteDraft(){
 if(!state.active?.startsWith('draft:'))return;
 const t=current();if(!confirm('Supprimer définitivement la version « '+t.name+' » enregistrée sur ce téléphone ?'))return;
 state.drafts=state.drafts.filter(x=>x.id!==t.id);
 state.active=state.catalog.length?'base:'+state.catalog[0].id:state.drafts.length?'draft:'+state.drafts[0].id:null;
 renderCatalog();populateFields();renderPreview();persist();toast('Version personnelle supprimée.');
}
async function loadPhoto(file,key){
 if(!file)return;
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)){toast('Choisis une image JPG, PNG ou WebP. Pour SVG, utilise le dossier GitHub assets/.');return}
 if(file.size>12*1024*1024){toast("L'image dépasse 12 Mo. Choisis-en une plus légère.");return}
 try{
  const data=await new Promise((resolve,reject)=>{
   const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)
  });
  const img=new Image();img.src=data;await img.decode();
  const maxWidth=1100;const scale=Math.min(1,maxWidth/img.naturalWidth);
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  if(canvas.width*canvas.height>4_000_000)throw Error('Image trop grande');
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const compressed=canvas.toDataURL('image/jpeg',.78);
  const draft=ensureDraft();draft[key]=compressed;draft.updatedAt=new Date().toISOString();
  const inp=$(key);inp.value='';
  renderCatalog();renderPreview();populateFields();persist();
  toast('Image importée dans ta version personnelle (non envoyée sur GitHub).');
 }catch{toast("Impossible de lire cette image sur le téléphone.")}
}
function emailDocument(t){
 return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>'+
  '<body style="margin:0;padding:0;background-color:'+color(t.background,'#f6f1f5')+'"><center style="margin:0;padding:0;">'+makeEmail(t)+'</center></body></html>';
}
async function waitPictures(node){
 await Promise.all([...node.querySelectorAll('img')].map(async img=>{if(img.complete)return;try{await Promise.race([img.decode(),new Promise(r=>setTimeout(r,5000))])}catch{}}));
}
async function loadScreenshotLib(){
 if(typeof window.html2canvas==='function')return window.html2canvas;
 if(window.__loadingHTML2Canvas)return window.__loadingHTML2Canvas;
 window.__loadingHTML2Canvas=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  script.onload=()=>typeof window.html2canvas==='function'?resolve(window.html2canvas):reject(Error('Librairie indisponible'));
  script.onerror=()=>reject(Error('Téléchargement de la librairie de capture impossible.'));
  document.head.appendChild(script);
 });
 try{return await window.__loadingHTML2Canvas}catch(e){window.__loadingHTML2Canvas=null;throw e}
}
async function makePNG(){
 const t=current();if(!t)throw Error('Choisis un canevas');
 const shot=await loadScreenshotLib();
 const sandbox=document.createElement('div');sandbox.style.cssText='position:fixed;z-index:-1000;top:0;left:-9999px;width:600px;overflow:visible;pointer-events:none';
 sandbox.innerHTML=makeEmail(t);document.body.appendChild(sandbox);
 try{
  await waitPictures(sandbox);
  const root=sandbox.querySelector('.email-root');
  const canvas=await shot(root,{backgroundColor:color(t.background,'#ffffff'),scale:2,logging:false,useCORS:true,allowTaint:false,foreignObjectRendering:false,scrollX:0,scrollY:0,windowWidth:1200});
  return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Impossible de créer le PNG')),'image/png'));
 }finally{sandbox.remove()}
}
async function downloadPNG(){
 if(state.busy)return;state.busy=true;const button=$('pngBtn'),original=button.innerHTML;
 button.disabled=true;button.innerHTML='⏳ Création de l’image…';
 try{const blob=await makePNG();download(blob,'Mailotion_'+fileKey(current().name)+'_'+dateKey()+'.png');toast('Image PNG téléchargée : tu peux l’envoyer à ta boutique.')}
 catch(e){toast('Export PNG indisponible : '+e.message+' Vérifie la connexion puis réessaie.')}
 finally{state.busy=false;button.disabled=false;button.innerHTML=original}
}
async function sharePNG(){
 if(state.busy)return;state.busy=true;const button=$('shareBtn');button.disabled=true;
 try{
  const blob=await makePNG();
  const file=new File([blob],'Mailotion_'+fileKey(current().name)+'.png',{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
   try{await navigator.share({files:[file],title:current().name});return}catch(e){if(e.name==='AbortError')return}
  }
  download(blob,file.name);toast('Image enregistrée. Tu peux maintenant la joindre à un message.');
 }catch(e){toast('Partage indisponible : '+e.message)}
 finally{state.busy=false;button.disabled=false}
}
function downloadHTML(){
 const t=current();if(!t)return;
 download(new Blob([emailDocument(t)],{type:'text/html;charset=utf-8'}),'Mailotion_'+fileKey(t.name)+'.html');
 toast('Email HTML enregistré. Remplace les liens et vérifie les images avant un vrai envoi.');
}
function printPDF(){
 const t=current();if(!t)return;
 const w=window.open('','_blank');
 if(!w){toast('Autorise les fenêtres ou utilise le navigateur pour imprimer.');return}
 const doc=emailDocument(t).replace('</head>','<style>@page{size:A4;margin:12mm}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}center{margin:0 auto}@media print{table.email-root{max-width:100%!important}}</style></head>');
 w.document.open();w.document.write(doc);w.document.close();w.onload=()=>setTimeout(()=>w.print(),450);
 toast('Dans la fenêtre qui s’ouvre, choisis « Enregistrer en PDF ».');
}
function backup(){
 const bundle={version:1,format:'mailotion-studio-backup',drafts:state.drafts,active:state.active,exportedAt:new Date().toISOString()};
 download(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}),'Mailotion_Mes_Canevas_'+dateKey()+'.json');
 toast('Sauvegarde de tes canevas enregistrée sur ton téléphone.');
}
async function restoreBackup(file){
 try{
  const obj=JSON.parse(await file.text());
  if(!obj||obj.format!=='mailotion-studio-backup'||!Array.isArray(obj.drafts))throw Error();
  if(state.drafts.length&&!confirm('Restaurer cette sauvegarde ? Les versions enregistrées sur ce téléphone seront remplacées.'))return;
  state.drafts=obj.drafts.slice(0,80).map(d=>sanitize(d,'draft')).filter(Boolean);
  state.active=typeof obj.active==='string'?obj.active:(state.drafts[0]?'draft:'+state.drafts[0].id:null);
  if(!current())state.active=state.catalog.length?'base:'+state.catalog[0].id:null;
  renderCatalog();populateFields();renderPreview();persist();toast(state.drafts.length+' canevas personnels restaurés.');
 }catch{toast('Ce fichier ne semble pas être une sauvegarde Mailotion Studio.')}
}
async function importTemplate(file){
 try{
  const o=JSON.parse(await file.text());
  const raw=Array.isArray(o)?o[0]:o.templates?o.templates[0]:o;
  const data=sanitize(raw,'draft');if(!data)throw Error();
  data.id='draft-'+uid();data.name=(data.name||'Mon nouveau canevas')+' · Importé';
  data.parentId='';data.createdAt=new Date().toISOString();
  state.drafts.unshift(data);setActive('draft',data.id,true);toast('Canevas importé et enregistré uniquement sur cet appareil.');
 }catch{toast('Format non reconnu. Sélectionne un fichier JSON de canevas valide.')}
}
function promptForChatGPT(){
 return 'Travaille directement dans mon dépôt GitHub ludodulac/Canevas-mailotion, branche main. Je veux un nouveau canevas d’email marketing très esthétique à ajouter à mon studio Mailotion. Lis d’abord templates.json, index.html et README.md pour respecter le modèle de données. Ajoute un objet de modèle dans le tableau "templates" de templates.json, avec un id unique et tous les champs existants ; ne supprime ni les modèles existants ni les données publiques du dépôt. Crée au besoin une nouvelle image originale sous assets/ (SVG ou image), puis renseigne heroImage avec son chemin exact "assets/nom-du-fichier.svg" ou .png/.jpg. Les champs (titre, texte, produit, promo, bouton, couleurs, image) doivent rester modifiables dans l’application. Utilise une marque fictive, jamais de vraies données clients, et aucun secret ou identifiant personnel puisque le dépôt est public. Ne remplace pas app.js/style.css/index.html sans nécessité. Commits les modifications sur main et indique quel nouveau canevas a été ajouté. J’ouvrirai le studio et cliquerai « Actualiser depuis GitHub ».';
}
async function copyInstruction(){
 const s=promptForChatGPT();
 if(navigator.clipboard&&window.isSecureContext){try{await navigator.clipboard.writeText(s);toast('Consigne copiée : colle-la dans ta conversation ChatGPT.');return}catch{}}
 const a=document.createElement('textarea');a.value=s;a.style.position='fixed';a.style.left='-9999px';document.body.appendChild(a);a.select();try{document.execCommand('copy');toast('Consigne copiée.')}catch{toast('Impossible de copier automatiquement.')}a.remove();
}
function setMobile(mode){
 state.mobile=mode;
 const editing=mode==='edit';
 $('editColumn').classList.toggle('is-hidden',!editing);
 $('previewColumn').classList.toggle('is-hidden',editing);
 $('mobileEdit').classList.toggle('active',editing);
 $('mobilePreview').classList.toggle('active',!editing);
 if(!editing)requestAnimationFrame(()=>setTimeout(resizePreview,40));
}
function init(){
 readStore();
 $('modelList').addEventListener('click',event=>{
  const button=event.target.closest('button[data-kind]');if(!button)return;
  setActive(button.dataset.kind,button.dataset.id);
 });
 document.querySelector('.editing-body').addEventListener('input',handleChange);
 document.querySelector('.editing-body').addEventListener('change',handleChange);
 $('duplicateBtn').addEventListener('click',duplicate);
 $('resetBtn').addEventListener('click',reset);
 $('deleteBtn').addEventListener('click',deleteDraft);
 $('refreshBtn').addEventListener('click',()=>fetchCatalog());
 $('uploadHero').addEventListener('change',async e=>{await loadPhoto(e.target.files[0],'heroImage');e.target.value=''});
 $('uploadProduct').addEventListener('change',async e=>{await loadPhoto(e.target.files[0],'productImage');e.target.value=''});
 $('pngBtn').addEventListener('click',downloadPNG);
 $('shareBtn').addEventListener('click',sharePNG);
 $('htmlBtn').addEventListener('click',downloadHTML);
 $('printBtn').addEventListener('click',printPDF);
 $('backupBtn').addEventListener('click',backup);
 $('restoreBtn').addEventListener('click',()=>$('restoreFile').click());
 $('restoreFile').addEventListener('change',async e=>{if(e.target.files[0])await restoreBackup(e.target.files[0]);e.target.value=''});
 $('importTemplateBtn').addEventListener('click',()=>$('importTemplateFile').click());
 $('importTemplateFile').addEventListener('change',async e=>{if(e.target.files[0])await importTemplate(e.target.files[0]);e.target.value=''});
 $('copyInstructionBtn').addEventListener('click',copyInstruction);
 $('mobileEdit').addEventListener('click',()=>setMobile('edit'));
 $('mobilePreview').addEventListener('click',()=>setMobile('preview'));
 window.addEventListener('resize',resizePreview);
 if('ResizeObserver' in window){resizeObserver=new ResizeObserver(()=>resizePreview());resizeObserver.observe($('emailClip'))}
 // On small screens show a preview right away, then switch back to edit as wanted.
 if(window.innerWidth<=760)setMobile('preview');
 else setMobile('edit');
 fetchCatalog(true);
 if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
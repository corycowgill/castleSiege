// Castle Siege — v3.28 UI layer: menus, cinematic backdrop, banners,
// callouts, toasts, tooltips, pause, wave summary and game-over screens.
// Loaded by index_3d.html only.
//
// Depends on globals declared in index_3d.html's inline script (all
// referenced at call time, never at load time):
//   gameState, gameMode, isMobile, waveNum, MAX_WAVES, players, camera,
//   CAM_BASE, camZoom, setCameraZoom, playSound, audioCtx, BUILD_OPTS,
//   TOWER_DATA, ENEMY_DATA, BOSS_DATA, SPECIAL_DATA, showScreen,
//   restartGame, stopMusic, startMusic, playTitleMusic, setMusicDuck,
//   toggleMute, AUDIO, applyTimeOfDay

// v3.30: hover-driven UI (tooltips, hover-to-focus) only for a real
// mouse. On iOS Safari a mouseenter handler that changes the page makes
// the first tap count as a "hover" and swallows the click, so build
// cards and menu buttons needed two taps (and tooltips stuck open).
const UI_HOVER=(()=>{try{return matchMedia('(hover: hover) and (pointer: fine)').matches}catch(e){return true}})();
const __isMouse=e=>e.pointerType==='mouse'||(e.pointerType===undefined&&UI_HOVER);

// ==================== ICONS ====================
function uiIcon(id,cls){return `<svg class="ico${cls?' '+cls:''}" viewBox="0 0 24 24"><use href="#i-${id}"/></svg>`}
const OPT_ICON={turret:'turret',magic:'magic',catapult:'catapult',bombard:'bombard',wall:'wall',barricade:'barricade',
  goblin:'goblin',orc:'orc',darkKnight:'knight',archer:'archer',troll:'troll',dragon:'dragon',lich:'lich'};
const SPEC_ICON=['meteor','lightning','freeze','heal'];
const OPT_DESC={
  turret:'Reliable arrow tower. Cheap, fast-firing single-target damage.',
  magic:'Arcane orbs that burst on impact, scorching every foe nearby.',
  catapult:'Long-range siege engine. Slow, heavy boulders with wide splash.',
  bombard:'Heavy cannon. Punishing single-target damage against brutes.',
  wall:'Stone blocker. Forces the enemy to march the long way round.',
  barricade:'Cheap wooden spikes for quick mazing. Breaks easily.',
  goblin:'Fast, weak swarm. Overwhelms defenses with sheer numbers.',
  orc:'Slow, tanky bruiser that hits hard in melee.',
  darkKnight:'Armored warrior. Shrugs off half of all damage.',
  archer:'Ranged skirmisher. Shoots enemy units — even dragons.',
  troll:'Boss. Batters straight through any wall in its way.',
  dragon:'Boss. Flies over walls and towers; only towers and archers reach it.',
  lich:'Boss. Its necromantic aura mends nearby allied units.',
};

// ==================== SOUND ====================
// Soft procedural UI ticks so menus feel responsive.
function uiSfx(kind){
  if(typeof audioCtx==='undefined'||!audioCtx)return;
  if(kind==='hover')playSound(1400,0.04,'sine',0.025);
  else if(kind==='select'){playSound(660,0.09,'triangle',0.07);setTimeout(()=>playSound(990,0.12,'triangle',0.06),55)}
  else if(kind==='back')playSound(420,0.1,'triangle',0.06);
  else if(kind==='error')playSound(140,0.12,'square',0.035);
  else if(kind==='banner'){playSound(220,0.6,'sawtooth',0.04);playSound(330,0.6,'triangle',0.05)}
}

// ==================== BACKDROP / EMBERS ====================
function uiInitEmbers(){
  const host=document.getElementById('embers');if(!host||host.childElementCount)return;
  for(let i=0;i<34;i++){
    const e=document.createElement('i');e.className='ember';
    const dur=7+Math.random()*9;
    e.style.left=(Math.random()*100)+'%';
    e.style.setProperty('--dx',((Math.random()-0.5)*160)+'px');
    e.style.animationDuration=dur+'s';e.style.animationDelay=(-Math.random()*dur)+'s';
    const s=1.5+Math.random()*2.5;e.style.width=e.style.height=s+'px';
    host.appendChild(e);
  }
}
// Shown behind the welcome, main menu, lobby and (menu) help screens.
function uiSetBackdrop(on){
  const bd=document.getElementById('menu-backdrop');
  bd.style.display=on?'block':'none';
  // On touch devices the canvas is hidden during menus (iOS touch fix),
  // so the backdrop paints a solid scene instead of a vignette.
  bd.classList.toggle('solid',!!(on&&isMobile));
}
// Slow cinematic orbit over the battlefield while menus are up.
let __menuCamT=0,__menuCamOn=false;
function uiUpdateMenuCamera(dt){
  if(!camera)return;
  __menuCamOn=true;__menuCamT+=dt;
  const a=__menuCamT*0.045+0.6;
  const r=24,y=9.5+Math.sin(__menuCamT*0.11)*1.5;
  camera.position.set(Math.sin(a)*r,y,Math.cos(a)*r*0.75);
  camera.lookAt(0,0.5,0);
}
function uiRestoreGameCamera(){
  if(!__menuCamOn)return;__menuCamOn=false;
  setCameraZoom(camZoom);
}

// ==================== FADE TRANSITION ====================
function uiFade(cb){
  const f=document.getElementById('fade');
  f.classList.add('on');
  setTimeout(()=>{try{cb&&cb()}finally{f.classList.remove('on')}},360);
}

// ==================== MENU NAVIGATION ====================
// Works for any container of focusable items: the main menu list, the
// pause panel and the game-over actions. Mouse hover moves focus too.
const __nav={items:[],idx:0,descEl:null};
function uiNavSet(selector,descEl){
  __nav.items=[...document.querySelectorAll(selector)].filter(e=>e.style.display!=='none');
  __nav.descEl=descEl||null;
  __nav.idx=Math.max(0,__nav.items.findIndex(i=>i.classList.contains('focus')));
  __nav.items.forEach((it,i)=>{
    if(it._navBound)return;it._navBound=true;
    it.addEventListener('pointerenter',e=>{if(!__isMouse(e))return;const k=__nav.items.indexOf(it);if(k>=0&&k!==__nav.idx){__nav.idx=k;uiNavPaint();uiSfx('hover')}});
  });
  uiNavPaint();
}
function uiNavPaint(){
  __nav.items.forEach((it,i)=>it.classList.toggle('focus',i===__nav.idx));
  const cur=__nav.items[__nav.idx];
  if(__nav.descEl&&cur&&cur.dataset.desc)__nav.descEl.textContent=cur.dataset.desc;
}
function uiNavMove(d){
  if(!__nav.items.length)return;
  __nav.idx=(__nav.idx+d+__nav.items.length)%__nav.items.length;uiNavPaint();uiSfx('hover');
}
function uiNavActivate(){const cur=__nav.items[__nav.idx];if(cur){uiSfx('select');cur.click()}}
// Keyboard + gamepad driver; call once per frame while a nav list is live.
let __navPadPrev={};
function uiNavPoll(){
  if(typeof __honOpen!=='undefined'&&__honOpen){
    if(consumeKey('Escape')||consumeKey('Enter')||consumeKey('Space')){uiCloseHonours();return}
    const hg=document.getElementById('hon-grid'),sc=d=>hg&&hg.scrollBy({top:d*90,behavior:'smooth'});
    if(consumeKey('ArrowUp')||consumeKey('KeyW'))sc(-1);if(consumeKey('ArrowDown')||consumeKey('KeyS'))sc(1);
    const gp=getGamepad();
    if(gp){const b=i=>gp.buttons[i]&&gp.buttons[i].pressed&&!__navPadPrev[i];if(b(0)||b(1))uiCloseHonours();if(b(12))sc(-1);if(b(13))sc(1);
      const np={};for(let i=0;i<gp.buttons.length;i++)np[i]=gp.buttons[i].pressed;__navPadPrev=np}
    return;
  }
  if(__settingsOpen){
    // settings: up/down choose, left/right adjust, Enter cycles, Esc closes
    if(consumeKey('Escape')){uiCloseSettings();return}
    const cur=__nav.items[__nav.idx];
    const adj=d=>{if(cur&&cur._adjust){cur._adjust(d);uiSfx('hover')}};
    if(consumeKey('ArrowLeft')||consumeKey('KeyA'))adj(-1);
    if(consumeKey('ArrowRight')||consumeKey('KeyD'))adj(1);
    if(consumeKey('ArrowUp')||consumeKey('KeyW'))uiNavMove(-1);
    if(consumeKey('ArrowDown')||consumeKey('KeyS'))uiNavMove(1);
    if(consumeKey('Enter')||consumeKey('Space'))uiNavActivate();
    const gp=getGamepad();
    if(gp){const b=i=>gp.buttons[i]&&gp.buttons[i].pressed&&!__navPadPrev[i];
      if(b(12))uiNavMove(-1);if(b(13))uiNavMove(1);if(b(14))adj(-1);if(b(15))adj(1);if(b(0))uiNavActivate();if(b(1))uiCloseSettings();
      const np={};for(let i=0;i<gp.buttons.length;i++)np[i]=gp.buttons[i].pressed;__navPadPrev=np}
    return;
  }
  if(consumeKey('ArrowUp')||consumeKey('KeyW'))uiNavMove(-1);
  if(consumeKey('ArrowDown')||consumeKey('KeyS'))uiNavMove(1);
  if(consumeKey('ArrowLeft')||consumeKey('KeyA'))uiNavMove(-1);
  if(consumeKey('ArrowRight')||consumeKey('KeyD'))uiNavMove(1);
  if(consumeKey('Enter')||consumeKey('Space'))uiNavActivate();
  const gp=getGamepad();
  if(gp){
    const b=i=>gp.buttons[i]&&gp.buttons[i].pressed&&!__navPadPrev[i];
    const ay=gp.axes[1]||0,stick=Math.abs(ay)>0.6?Math.sign(ay):0;
    if(b(12)||(stick<0&&!__navPadPrev.s))uiNavMove(-1);
    if(b(13)||(stick>0&&!__navPadPrev.s))uiNavMove(1);
    if(b(0))uiNavActivate();
    const np={s:stick!==0};for(let i=0;i<gp.buttons.length;i++)np[i]=gp.buttons[i].pressed;__navPadPrev=np;
  }
}

// ==================== WAVE BANNERS ====================
const WAVE_NAMES=['First Blood','Mist Upon the Fields','The Bloodied Sun','The Gathering Storm','Into the Dark',
  'The Witching Hour','Shadows Linger','Before the Dawn','First Light','The Final Siege'];
const ENDLESS_NAMES=['Beyond the Last Dawn','No Quarter','The Long Night Returns','Iron and Ash','The Grinding Years','Banners Without End','Old Bones, New Blades','The Siege Eternal'];
const WAVE_TIMES=['High Noon','Afternoon','Dusk','Storm at Nightfall','Nightfall','Midnight','Deep Night','Small Hours','Dawn','Morning'];
let __bannerT=null;
function uiBanner(kicker,title,sub,danger){
  const b=document.getElementById('wave-banner');
  document.getElementById('wb-kicker').textContent=kicker;
  document.getElementById('wb-title').textContent=title;
  document.getElementById('wb-sub').textContent=sub||'';
  b.classList.remove('show');void b.offsetWidth;b.classList.toggle('danger',!!danger);b.classList.add('show');
  clearTimeout(__bannerT);__bannerT=setTimeout(()=>b.classList.remove('show'),3300);
  uiSfx('banner');
}
function uiWaveBanner(w){
  const i=Math.max(0,Math.min(WAVE_NAMES.length-1,w-1));
  if(isEndless()&&w>MAX_WAVES){
    const champ=endlessChampion(w);
    const om=omenFor(w);
    uiBanner(`Endless \u00B7 Wave ${w}`,champ?'Champions Take the Field':ENDLESS_NAMES[(w-MAX_WAVES-1)%ENDLESS_NAMES.length],`${om.id?`Omen: ${om.name} \u2014 ${om.desc} \u00B7 `:''}HP +${Math.round((endlessHpMult(w)-1)*100)}%`,champ);
    return;
  }
  uiBanner(w>=MAX_WAVES&&!isEndless()?'Final Wave':isEndless()?`Wave ${w} \u00B7 Endless`:`Wave ${w} of ${MAX_WAVES}`,WAVE_NAMES[i],WAVE_TIMES[i],w>=MAX_WAVES&&!isEndless());
}
function uiBuildBanner(){
  const w=waveNum+1;
  const om=typeof omenFor==='function'?omenFor(w):{};
  uiBanner(w===1?'The Siege Begins':`Wave ${waveNum} Repelled`,'Prepare Defenses',om.id?`Omen for wave ${w}: ${om.name} \u2014 ${om.desc}`:`${BUILD_TIME} seconds to fortify before wave ${w}`);
}

// ==================== CALLOUTS & TOASTS ====================
function uiCallout(html,color,icon){
  const host=document.getElementById('callouts');if(!host)return;
  const el=document.createElement('div');el.className='callout';
  if(color)el.style.setProperty('--tc',color);
  el.innerHTML=(icon?uiIcon(icon):'')+'<span>'+html+'</span>';
  host.appendChild(el);
  while(host.childElementCount>3)host.firstChild.remove();
  setTimeout(()=>el.remove(),3500);
}
const __toastLast=[0,{},{}];
function uiToast(pNum,text,kind,icon){
  // The AI never gets toasts; neither does a duplicate within 0.9s.
  if(gameMode==='1p'&&pNum===2)return;
  const now=performance.now(),last=__toastLast[pNum];
  if(last[text]&&now-last[text]<900)return;last[text]=now;
  const host=document.getElementById(gameMode==='1p'||pNum===1?'toasts-p1':'toasts-p2');
  if(gameMode==='1p'&&host.id==='toasts-p1'){host.style.left='25%'}
  const el=document.createElement('div');el.className='toast '+(kind||'');
  el.innerHTML=(icon?uiIcon(icon):'')+'<span>'+text+'</span>';
  host.appendChild(el);
  while(host.childElementCount>3)host.firstChild.remove();
  setTimeout(()=>el.remove(),2050);
  if(kind==='bad')uiSfx('error');
}

// ==================== TOOLTIP ====================
function uiTooltipFor(el){
  const tt=document.getElementById('tooltip');
  el.addEventListener('pointerenter',e=>{
    if(!__isMouse(e))return;
    tt.innerHTML=uiTooltipHTML(el);
    const r=el.getBoundingClientRect();
    tt.classList.add('show');
    const w=tt.offsetWidth,h=tt.offsetHeight;
    tt.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';
    tt.style.top=Math.max(8,r.top-h-10)+'px';
  });
  el.addEventListener('pointerleave',()=>tt.classList.remove('show'));
}
function uiTooltipHTML(el){
  const stat=(k,v)=>`<span>${k}<b>${v}</b></span>`;
  if(el.classList.contains('spec-btn')){
    const sp=SPECIAL_DATA[+el.dataset.idx];
    return `<div class="tt-head">${uiIcon(SPEC_ICON[+el.dataset.idx])}<div><div class="tt-name">${sp.name}</div><div class="tt-cat">Special &middot; Combat only</div></div></div>
      <div class="tt-desc">${sp.desc}. Aim with your cursor, then cast.</div>
      <div class="tt-cost"><span>Charges</span><span>3 per round</span></div>`;
  }
  const opt=BUILD_OPTS[+el.dataset.idx];
  if(opt.cat==='tower'){
    const t=TOWER_DATA.find(d=>d.id===opt.id);
    return `<div class="tt-head">${uiIcon(OPT_ICON[opt.id])}<div><div class="tt-name">${t.name}</div><div class="tt-cat">Tower</div></div></div>
      <div class="tt-desc">${OPT_DESC[opt.id]}</div>
      <div class="tt-stats">${stat('Damage',t.dmg)}${stat('Range',t.range)}${stat('Rate',t.rate+'s')}${stat('Splash',t.splash||'—')}</div>
      <div class="tt-cost"><span>Cost</span><span>$${t.cost} &middot; Upgrade $${Math.floor(t.cost*0.6)}</span></div>`;
  }
  if(opt.cat==='build'){
    const hp=opt.id==='wall'?150:75;
    return `<div class="tt-head">${uiIcon(OPT_ICON[opt.id])}<div><div class="tt-name">${opt.name}</div><div class="tt-cat">Fortification</div></div></div>
      <div class="tt-desc">${OPT_DESC[opt.id]}</div>
      <div class="tt-stats">${stat('Health',hp)}${stat('Refund','50%')}</div>
      <div class="tt-cost"><span>Cost</span><span>$${opt.cost}</span></div>`;
  }
  const d=ENEMY_DATA.find(e=>e.id===opt.id)||BOSS_DATA.find(b=>b.id===opt.id);
  const boss=opt.cat==='boss';
  return `<div class="tt-head">${uiIcon(OPT_ICON[opt.id])}<div><div class="tt-name">${d.name}</div><div class="tt-cat">${boss?'Boss &middot; Single unit':'Army &middot; Squad of 10'}</div></div></div>
    <div class="tt-desc">${OPT_DESC[opt.id]}</div>
    <div class="tt-stats">${stat('Health',d.hp)}${stat('Speed',d.spd)}${stat('Damage',d.dmg)}${stat('Armor',Math.round((d.armor||0)*100)+'%')}</div>
    <div class="tt-cost"><span>Cost</span><span>$${boss?d.cost:d.cost*10}</span></div>`;
}

// ==================== PAUSE ====================
let __pausedFrom=null;
function uiCanPause(){return gameState==='build'||gameState==='combat'||gameState==='waveEnd'}
function uiPause(){
  if(!uiCanPause())return;
  __pausedFrom=gameState;gameState='paused';
  document.getElementById('pause-ov').style.display='flex';
  document.getElementById('btn-resume').classList.add('focus');
  uiNavSet('#pause-ov .btn');uiSfx('back');
  setMusicDuck(true);uiSyncSoundBtn();
}
function uiSyncSoundBtn(){
  const b=document.getElementById('btn-sound');
  if(b)b.innerHTML=`Sound: ${AUDIO.muted?'Off':'On'} <span class="key">M</span>`;
  const gb=document.getElementById('btn-gfx');
  if(gb&&typeof __post!=='undefined'&&__post)gb.textContent=`Graphics: ${__post.enabled?'High':'Low'}`;
}
function uiResume(){
  if(gameState!=='paused')return;
  gameState=__pausedFrom||'build';__pausedFrom=null;
  document.getElementById('pause-ov').style.display='none';
  document.querySelectorAll('#pause-ov .btn').forEach(b=>b.classList.remove('focus'));
  setMusicDuck(false);uiSfx('select');
}

// ==================== MAIN MENU RETURN ====================
function uiReturnToMenu(){
  uiFade(()=>{
    document.getElementById('pause-ov').style.display='none';setMusicDuck(false);
    restartGame();stopMusic();applyTimeOfDay(0.22);
    gameState='modeselect';showScreen('modeselect');
    uiNavSet('#main-menu .menu-item',document.getElementById('menu-desc'));
    players[1].ready=false;players[2].ready=false;
    playTitleMusic();
  });
}

// ==================== WAVE SUMMARY ====================
const __leakTxt=L=>L&&L.n?`${L.n} <span class="leak">\u2212${Math.round(L.d)}</span>`:'<span class="hold">None</span>';
function uiWaveEnd(){
  const p1=players[1],p2=players[2];
  const wk1=p1.kills-(__waveStartKills1||0),wk2=p2.kills-(__waveStartKills2||0);
  const wd1=Math.round(p1.totalDmgDealt-(__waveStartDmg1||0)),wd2=Math.round(p2.totalDmgDealt-(__waveStartDmg2||0));
  const n2=gameMode==='1p'?'Warlord':'Red Crown';
  const row=(a,lab,b)=>`<div class="l p1c">${a}</div><div class="m">${lab}</div><div class="r p2c">${b}</div>`;
  document.getElementById('we-title').textContent=`Wave ${waveNum} Complete`;
  document.getElementById('we-grid').innerHTML=
    `<div class="l p1c hd" style="font-size:clamp(10px,1vw,12px);letter-spacing:.24em">BLUE CROWN</div><div class="m"></div><div class="r p2c hd" style="font-size:clamp(10px,1vw,12px);letter-spacing:.24em">${n2.toUpperCase()}</div>`+
    row(wk1,'Kills',wk2)+row(wd1,'Damage',wd2)+row(Math.max(0,Math.ceil(p1.castleHP)),'Castle HP',Math.max(0,Math.ceil(p2.castleHP)))+
    // v3.48: who broke through to each keep this wave, and what it cost
    row(__leakTxt(__waveLeak[1]),'Broke through',__leakTxt(__waveLeak[2]));
}

// ==================== GAME OVER ====================
function uiGameOver(winner,score,best,isNewBest,ex){ex=ex||{};
  const ov=document.getElementById('gameover-ov');
  const p1=players[1],p2=players[2];
  const draw=winner==='draw';
  const p1won=winner===1;
  let title,sub,kicker;
  if(gameMode==='1p'){
    title=draw?'Stalemate':p1won?'Victory':'Defeat';
    sub=draw?'Neither crown would yield.':p1won?(p2.castleHP<=0?'The warlord\'s keep lies in ruin.':'Your keep stands taller at the final dawn.'):(p1.castleHP<=0?'Your walls have fallen. The realm mourns.':'The warlord outlasted you.');
    kicker=isEndless()?`Endless \u00B7 reached wave ${waveNum} \u00B7 ${diffProfile().label}${ex.newWave?' \u00B7 \u2605 new record':ex.bestWave?` \u00B7 record ${ex.bestWave}`:''}`
      :`After ${waveNum} wave${waveNum===1?'':'s'} \u00B7 ${diffProfile().label}`;
  }else{
    title=draw?'Stalemate':p1won?'Blue Triumphs':'Red Triumphs';
    sub=draw?'Neither crown would yield.':(p1won?'The Blue Crown':'The Red Crown')+' holds the field.';
    kicker='The Siege Is Over';
  }
  ov.classList.toggle('defeat',gameMode==='1p'&&!p1won&&!draw);
  document.getElementById('go-kicker').textContent=kicker;
  document.getElementById('go-title').textContent=title;
  document.getElementById('go-sub').textContent=sub;
  document.getElementById('go-p2-name').textContent=gameMode==='1p'?'Warlord':'Red Crown';
  document.getElementById('go-p1-name').textContent='Blue Crown';
  // count the score up
  const sEl=document.getElementById('go-score');const t0=performance.now();
  (function tick(){const k=Math.min(1,(performance.now()-t0)/1400);sEl.textContent='Score '+Math.round(score*(1-Math.pow(1-k,3))).toLocaleString();if(k<1)requestAnimationFrame(tick)})();
  const bEl=document.getElementById('go-best');
  bEl.classList.toggle('new',!!isNewBest);
  bEl.textContent=best==null?'':isNewBest?'★ New best':'Best '+best.toLocaleString();
  const rows=[
    ['Castle HP',Math.max(0,Math.ceil(p1.castleHP)),Math.max(0,Math.ceil(p2.castleHP))],
    ['Kills',p1.kills,p2.kills],
    ['Damage',Math.round(p1.totalDmgDealt),Math.round(p2.totalDmgDealt)],
  ];
  const cmp=document.getElementById('go-cmp');
  cmp.innerHTML=rows.map(([lab,a,b])=>`<div class="cmp"><span class="v l">${a.toLocaleString()}</span><span class="bar l"><i></i></span><span class="lab">${lab}</span><span class="bar r"><i></i></span><span class="v r">${b.toLocaleString()}</span></div>`).join('');
  // v3.41: each side's most valuable tower (by kills, then damage)
  const mvp=pn=>{let b=null;for(const t of towers)if(t.owner===pn&&(!b||(t.kills||0)>(b.kills||0)||((t.kills||0)===(b.kills||0)&&(t.dmgDone||0)>(b.dmgDone||0))))b=t;return b&&(b.kills||b.dmgDone)?b:null};
  const mv=(t,side)=>t?`<div class="mv ${side}"><span class="mk">MVP tower</span><span class="mn">${TOWER_DATA.find(d=>d.id===t.type).name} \u00B7 Lv${t.level||1}</span><span class="ms">${t.kills||0} kills \u00B7 ${Math.round(t.dmgDone||0).toLocaleString()} dmg</span></div>`:`<div class="mv ${side}"></div>`;
  uiHonoursGameOver(winner);
  const hon=document.getElementById('go-hon');
  if(hon)hon.innerHTML=__honBattle.length?`<span class="mk">Honours earned</span> `+__honBattle.map(id=>{const h=HONOURS.find(x=>x.id===id);return `<span class="hb">${uiIcon(h.icon)}${h.name}</span>`}).join(''):'';
  const m1=mvp(1),m2=mvp(2);
  document.getElementById('go-mvp').innerHTML=(m1||m2)?mv(m1,'l')+mv(m2,'r'):'';
  setTimeout(()=>{
    const bars=cmp.querySelectorAll('.cmp');
    rows.forEach(([,a,b],i)=>{const m=Math.max(1,a,b);bars[i].querySelector('.bar.l i').style.width=(a/m*100)+'%';bars[i].querySelector('.bar.r i').style.width=(b/m*100)+'%'});
  },1200);
  document.getElementById('btn-go-again').classList.add('focus');document.getElementById('btn-go-menu').classList.remove('focus');
  uiNavSet('#gameover-ov .btn');
}


// ==================== v3.37: SETTINGS ====================
const SETTINGS={music:0.5,sfx:0.8,gfx:'high',shake:true,dmg:true,tips:true};
try{Object.assign(SETTINGS,JSON.parse(localStorage.getItem('castleSiege_settings')||'{}'))}catch(e){}
function uiSaveSettings(){try{localStorage.setItem('castleSiege_settings',JSON.stringify(SETTINGS))}catch(e){}}
function uiApplySettings(init){
  if(typeof AUDIO!=='undefined'){AUDIO.music=SETTINGS.music;AUDIO.sfx=SETTINGS.sfx;if(typeof __applyAudioLevels==='function')__applyAudioLevels(!!init)}
  if(typeof __post!=='undefined'&&__post){
    let saved=false;try{saved=!!localStorage.getItem('castleSiege_settings')||!!localStorage.getItem('castleSiege_gfx')}catch(e){}
    if(saved||!init){__post.auto=false;__post._slow=0;__post.enabled=SETTINGS.gfx==='high'}
  }
}
// Hide plain damage numbers when disabled (gold rewards and castle hits
// are strings and always show).
(function(){const _sdn=spawnDmgNumber;spawnDmgNumber=function(x,y,z,text,color){if(!SETTINGS.dmg&&typeof text==='number')return;return _sdn(x,y,z,text,color)}})();
const SETTING_ROWS=[
  {k:'music',label:'Music',kind:'pct'},
  {k:'sfx',label:'Effects',kind:'pct'},
  {k:'muted',label:'Sound',kind:'mute'},
  {k:'gfx',label:'Graphics',kind:'opt',opts:['high','low'],names:{high:'High',low:'Low (faster)'}},
  {k:'shake',label:'Screen shake',kind:'bool'},
  {k:'dmg',label:'Damage numbers',kind:'bool'},
  {k:'tips',label:'Tutorial tips',kind:'bool'},
];
let __settingsOpen=false,__settingsFrom='menu';
function uiSettingsOpen(){return __settingsOpen}
function __settingVal(r){
  if(r.kind==='pct')return Math.round(SETTINGS[r.k]*100)+'%';
  if(r.kind==='mute')return AUDIO.muted?'Off':'On';
  if(r.kind==='bool')return SETTINGS[r.k]?'On':'Off';
  return r.names[SETTINGS[r.k]];
}
function __settingAdjust(r,d){
  if(r.kind==='pct')SETTINGS[r.k]=Math.round(Math.max(0,Math.min(1,SETTINGS[r.k]+d*0.1))*10)/10;
  else if(r.kind==='mute'){toggleMute()}
  else if(r.kind==='bool')SETTINGS[r.k]=!SETTINGS[r.k];
  else{const i=r.opts.indexOf(SETTINGS[r.k]);SETTINGS[r.k]=r.opts[(i+(d<0?r.opts.length-1:1))%r.opts.length]}
  uiSaveSettings();uiApplySettings(false);uiRenderSettings();
}
function uiRenderSettings(){
  const host=document.getElementById('settings-rows');
  if(!host.childElementCount){
    for(const r of SETTING_ROWS){
      const b=document.createElement('button');b.className='set-row';b.dataset.k=r.k;
      b.innerHTML=`<span class="lab">${r.label}</span>${r.kind==='pct'?'<span class="bar"><i></i></span>':''}<span class="arr" data-d="-1">&#9664;</span><span class="val"></span><span class="arr" data-d="1">&#9654;</span>`;
      b._adjust=d=>__settingAdjust(r,d);
      b.addEventListener('click',ev=>{const a=ev.target.closest('.arr');__settingAdjust(r,a?+a.dataset.d:1);uiSfx('hover')});
      host.appendChild(b);
    }
  }
  for(const b of host.children){const r=SETTING_ROWS.find(x=>x.k===b.dataset.k);b.querySelector('.val').textContent=__settingVal(r);
    const bar=b.querySelector('.bar i');if(bar)bar.style.width=(SETTINGS[r.k]*100)+'%'}
}
function uiOpenSettings(from){
  __settingsFrom=from||'menu';__settingsOpen=true;uiRenderSettings();
  document.getElementById('settings-ov').style.display='flex';
  document.querySelectorAll('#settings-ov .set-row,#settings-ov .btn').forEach(e=>e.classList.remove('focus'));
  document.querySelector('#settings-ov .set-row').classList.add('focus');
  uiNavSet('#settings-ov .set-row, #btn-settings-done');uiSfx('select');
}
function uiCloseSettings(){
  if(!__settingsOpen)return;__settingsOpen=false;
  document.getElementById('settings-ov').style.display='none';uiSfx('back');
  if(__settingsFrom==='pause')uiNavSet('#pause-ov .btn');
  else uiNavSet('#main-menu .menu-item',document.getElementById('menu-desc'));
}

// ==================== v3.37: DIFFICULTY PICKER ====================
function uiSyncDifficulty(){
  document.querySelectorAll('.diff-btn').forEach(b=>b.classList.toggle('sel',b.dataset.d===difficulty));
  document.querySelectorAll('.len-btn').forEach(b=>b.classList.toggle('sel',(b.dataset.e==='1')===endless));
  const d=document.getElementById('diff-desc');if(d){let bw=0;try{bw=parseInt(localStorage.getItem('castleSiege_endlessWave_'+difficulty)||'0',10)}catch(e){}
    d.textContent=diffProfile().desc+(diffProfile().score!==1?` Score ×${diffProfile().score}.`:'')+(endless?` Endless: survive as long as you can${bw?` — record wave ${bw}`:''}.`:'')}
  const n=document.getElementById('lobby-p2-name');if(n&&gameMode==='1p')n.textContent='The '+diffProfile().name;
  const dv=document.getElementById('lobby-p2-dev');if(dv&&gameMode==='1p')dv.textContent='AI Opponent \u2022 '+diffProfile().label;
}


// ==================== v3.38: TUTORIAL (first Campaign game) ====================
// Coach cards that react to what the player actually does. Visual/UI
// only — never changes game state. Runs while SETTINGS.tips is on (the
// default); finishing or skipping turns it off, Settings turns it back on.
const __touchUI=()=>isMobile;
const K=t=>`<span class="key">${t}</span>`;
const TUT=[
  {phase:'build',title:'Raise a tower',hl:'turret',
   text:()=>__touchUI()?`Tap ${K('Turret')}, tap a tile beside the road, then tap it again (or ${K('Place')}) to build.`:`Select ${K('Turret')} (click it, or ${K('Q')}/${K('Tab')}), aim at a tile beside the road and press ${K('Space')} or click.`,
   done:()=>towers.some(t=>t.owner===1)},
  {phase:'build',title:'Wall them in',hl:'wall',
   text:()=>`The <b>red arrows</b> show the enemy's march through your half. Place a ${K('Wall')} on them — armies must go the long way round, under your towers.`,
   done:()=>grid.some(row=>row.some(c=>c&&c.owner===1&&(c.type==='wall'||c.type==='barricade')))},
  {phase:'build',title:'Upgrade',hl:'turret',
   text:()=>__touchUI()?`Tap your tower, then tap it again \u2014 or tap <b>Upgrade</b> on its card \u2014 to upgrade it (up to level 3).`:`Build <b>on top of your own tower</b> to upgrade it (up to level 3), or click <b>Upgrade</b> on its card. The cursor turns gold when an upgrade is possible.`,
   done:()=>towers.some(t=>t.owner===1&&t.level>=2)},
  {phase:'build',title:'March on their keep',hl:'goblin',
   text:()=>`Defence alone won't win. Buy a squad of ${K('Goblins')} — ten of them join the next wave and attack the enemy castle.`,
   done:()=>Object.values(players[1].enemyQueue).some(v=>v>0)},
  {phase:'build',title:'Ready for war',live:true,
   text:()=>players[1].ready?`You're ready \u2014 the Warlord finishes its last orders and the wave begins. Changed your mind? Press ${__touchUI()?K('\u2713'):K('Ready')} again to cancel.`:__touchUI()?`Tap ${K('RDY')} to start the wave. Readying early earns bonus gold.`:`Press ${K('R')} or the ${K('Ready')} button to start the wave. Readying early earns bonus gold.`,
   done:()=>gameState==='combat'},
  {phase:'combat',title:'Call down a special',hlSpec:0,auto:22,
   text:()=>__touchUI()?`Tap a special icon to cast it at your cursor — try ${K('Meteor')} on a crowd. Three charges per round.`:`Pick a special with ${K('Z')} and cast it at your cursor with ${K('F')} — try ${K('Meteor')} on a crowd. Three charges per round.`,
   done:()=>players[1].specials<3},
  {phase:'any',title:'You have the basics',auto:9,
   text:()=>`Each wave pays <b>+250 gold</b> plus <b>10% interest</b> on what you saved. Bosses are bought from the specials row. ${__touchUI()?'Tap a tower\'s <b>Target</b> tag':K('C')+' on a tower'} changes who it shoots. ${K('Esc')} pauses. Good luck, commander!`,
   done:()=>false},
];
let __tut={i:-1,t:0,shown:-1};
function uiTutorialReset(){__tut={i:(gameMode==='1p'&&SETTINGS.tips)?0:-1,t:0,shown:-1};uiTutorialHide()}
function uiTutorialHide(){const c=document.getElementById('tut-card');if(c)c.style.display='none';document.querySelectorAll('.tut-hl').forEach(e=>e.classList.remove('tut-hl'));__tut.shown=-1}
function uiTutorialFinish(){__tut.i=-1;uiTutorialHide();SETTINGS.tips=false;uiSaveSettings()}
function uiTutorialTick(dt){
  if(__tut.i<0||gameMode!=='1p')return;
  if(!(gameState==='build'||gameState==='combat'||gameState==='waveEnd'))return;
  let s=TUT[__tut.i];
  // the wave started before the build lessons were done: jump ahead
  if(gameState==='combat'&&s.phase==='build'){__tut.i=TUT.findIndex(x=>x.phase==='combat');__tut.t=0;s=TUT[__tut.i]}
  if(s.phase==='combat'&&gameState!=='combat'&&__tut.t>0.5){__tut.i++;__tut.t=0;s=TUT[__tut.i]}
  if(!s){uiTutorialFinish();return}
  __tut.t+=dt;
  const doneNow=s.done();
  if(doneNow||(s.auto&&__tut.t>s.auto)){
    uiSfx('select');__tut.i++;__tut.t=0;
    if(__tut.i>=TUT.length){uiTutorialFinish();return}
    s=TUT[__tut.i];
  }
  if(s.live&&__tut.shown===__tut.i){const tx=s.text();if(tx!==__tut.tx){__tut.tx=tx;document.getElementById('tut-text').innerHTML=tx}}
  if(__tut.shown!==__tut.i){
    __tut.shown=__tut.i;
    const c=document.getElementById('tut-card');
    document.getElementById('tut-step').textContent=`Training · ${__tut.i+1}/${TUT.length}`;
    document.getElementById('tut-title').textContent=s.title;
    document.getElementById('tut-text').innerHTML=__tut.tx=s.text();
    document.getElementById('tut-prog').style.width=((__tut.i)/TUT.length*100)+'%';
    c.style.display='block';c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop');
    document.querySelectorAll('.tut-hl').forEach(e=>e.classList.remove('tut-hl'));
    if(s.hl){const idx=BUILD_OPTS.findIndex(o=>o.id===s.hl);document.querySelectorAll(`#p1-build-opts .build-opt[data-idx="${idx}"]`).forEach(e=>e.classList.add('tut-hl'))}
    if(s.hlSpec!==undefined){document.querySelectorAll(`#p1-specials .spec-btn[data-idx="${s.hlSpec}"],#touch-special-row .touch-spec:nth-child(${s.hlSpec+1})`).forEach(e=>e.classList.add('tut-hl'))}
  }
}
document.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('tut-skip');if(b)b.addEventListener('click',()=>{uiSfx('back');uiTutorialFinish()})});

// ==================== BUILDING INSPECTOR (v3.39) ====================
// Hovering your own tower or wall shows a small card above it: level,
// current stats with the next upgrade's gains, the tower's kills and
// damage dealt, and the upgrade/sell prices. HTML is rebuilt only when
// its content changes; the card is re-positioned every frame.
const __insp={1:{sig:'',el:null},2:{sig:'',el:null}};
const __inspV=typeof THREE!=='undefined'?new THREE.Vector3():null;
function __inspHTML(cell,pl,pn){
  const {c,r}=pl.cursor;
  if(cell.type==='tower'){
    const t=towers.find(x=>x.col===c&&x.row===r);if(!t)return null;
    const td=TOWER_DATA.find(x=>x.id===t.type),lv=t.level||1,mx=lv>=3;
    const nd=Math.round(td.dmg*(1+0.3*lv)),nr=td.range*(1+0.1*lv),nt=td.rate*(1-0.15*lv);
    const up=Math.floor(td.cost*0.6),sell=towerRefund(t),fresh=gameState==='build'&&t.fresh,full=fresh&&sell>=td.cost+up*(lv-1);
    const gain=(a,b,f)=>mx?'':`<em>→ ${f(b)}</em>`;
    const f1=v=>v.toFixed(1),fr=v=>(1/v).toFixed(2)+'/s';
    const pips='◆'.repeat(lv)+`<i>${'◆'.repeat(3-lv)}</i>`;
    return `<div class="ih"><span class="in">${td.name}</span><span class="ip">${pips}</span></div>`+
      `<div class="ir">Damage<span><b>${t.dmg}</b>${gain(t.dmg,nd,v=>v)}</span></div>`+
      `<div class="ir">Range<span><b>${f1(t.range)}</b>${gain(t.range,nr,f1)}</span></div>`+
      `<div class="ir">Fire rate<span><b>${fr(t.rate)}</b>${gain(t.rate,nt,fr)}</span></div>`+
      (td.splash?`<div class="ir">Splash<span><b>${td.splash}</b></span></div>`:'')+
      `<div class="ir is">Kills<span><b>${t.kills||0}</b></span></div>`+
      `<div class="ir">Damage dealt<span><b>${Math.round(t.dmgDone||0).toLocaleString()}</b></span></div>`+
      `<div class="tgt" data-p="${pn}">Target<span><b>${TARGET_MODES[t.tmode||0]}</b>${__touchUI()?'':`<span class="key">${pn===1?'C':'MMB'}</span>`}</span></div>`+
      `<div class="if">${mx?'<span class="max">Max level</span>':`<span data-a="up" class="${pl.credits<up?'poor':''}">Upgrade $${up}</span>`}<span data-a="sell" class="${fresh?'full':''}">Sell +$${sell}${full?' \u00B7 full':fresh?' \u00B7 upg back':''}</span></div>`;
  }
  if(cell.type==='wall'||cell.type==='barricade'){
    const sell=wallRefund(cell),full=cell.fresh&&gameState==='build',rc=cell.hp<cell.maxHp?wallRepairCost(cell):0;
    const hp=Math.max(0,Math.ceil(cell.hp)),pc=Math.round(hp/cell.maxHp*100);
    return `<div class="ih"><span class="in">${cell.type==='wall'?'Stone Wall':'Barricade'}</span></div>`+
      `<div class="ir">Integrity<span><b>${hp} / ${cell.maxHp}</b></span></div><div class="hpb"><i style="width:${pc}%"></i></div>`+
      `<div class="if">${rc?`<span data-a="up" class="${gameState==='build'&&pl.credits>=rc?'':'poor'}">Repair $${rc}</span>`:'<span class="note">Blocks the march</span>'}<span data-a="sell" class="${full?'full':''}">Sell +$${sell}${full?' \u00B7 full':''}</span></div>`;
  }
  return null;
}
function uiInspectTick(){
  const live=gameState==='build'||gameState==='combat';
  for(const pn of [1,2]){
    const I=__insp[pn];if(!I.el){I.el=document.getElementById('insp-'+pn);if(!I.el)continue}
    const pl=players[pn];
    let html=null,cell=null;
    if(live&&pl&&(pn===1||gameMode==='2p')&&pl.cursor){
      cell=grid[pl.cursor.r]&&grid[pl.cursor.r][pl.cursor.c];
      if(cell&&cell.owner===pn&&cell.type!=='castle')html=__inspHTML(cell,pl,pn);
    }
    if(!html){if(I.sig){I.sig='';I.el.style.display='none'}continue}
    if(html!==I.sig){I.sig=html;I.el.innerHTML=html;I.el.style.display='block'}
    // anchor above the tile, clamped to the viewport
    const wp=tileToWorld(pl.cursor.c,pl.cursor.r);
    __inspV.set(wp.x,cell.type==='tower'?2.2:1.2,wp.z).project(camera);
    const rc=renderer.domElement.getBoundingClientRect();
    const w=I.el.offsetWidth,h=I.el.offsetHeight;
    const sx=rc.left+(__inspV.x*0.5+0.5)*rc.width,sy=rc.top+(-__inspV.y*0.5+0.5)*rc.height;
    if(!__insp.bot){const hb=document.getElementById('hud-bottom');__insp.bot=hb}
    const floor=(__insp.bot&&__insp.bot.offsetHeight?__insp.bot.getBoundingClientRect().top:innerHeight)-6;
    let x=sx-w/2,y=sy-h-14;
    if(y<56){ // no room above (near the top bar): sit beside the tile instead
      x=sx+(sx+34+w<innerWidth-8?34:-34-w);y=Math.max(56,Math.min(floor-h,sy-h/2));
    }
    x=Math.max(8,Math.min(innerWidth-w-8,x));
    I.el.style.transform=`translate(${x|0}px,${y|0}px)`;
  }
}
document.addEventListener('DOMContentLoaded',()=>{
  for(const pn of [1,2]){const el=document.getElementById('insp-'+pn);if(!el)continue;
    const go=e=>{
      const a=e.target.closest('[data-a]');
      if(a){e.preventDefault();e.stopPropagation(); // v3.54: tappable Upgrade / Repair / Sell
        if(a.dataset.a==='up'){if(gameState==='build')tryActAt(players[pn],pn);else uiToast(pn,'Upgrade during the build phase','bad','up')}
        else if(gameState==='build'||gameState==='combat')trySell(players[pn],pn);
        return}
      if(!e.target.closest('.tgt'))return;e.preventDefault();e.stopPropagation();cycleTargetMode(players[pn],pn)};
    el.addEventListener('pointerdown',go);}
});

// ==================== HONOURS (v3.45) ====================
// Local achievements for Player 1 / the Blue Crown. Unlocks persist in
// localStorage (castleSiege_honours = {id: unlock time}). State-based
// goals are polled twice a second during a battle; wins and records are
// awarded from the game-over screen via uiHonoursGameOver().
const HONOURS=[
  {id:'firstwave',name:'First Light',desc:'Survive your first wave.',icon:'check'},
  {id:'mason',name:'Stonemason',desc:'Hold 12 walls or barricades at once.',icon:'wall'},
  {id:'master',name:'Master Builder',desc:'Raise a tower to level 3.',icon:'up'},
  {id:'arsenal',name:'Full Arsenal',desc:'Field all four tower types at once.',icon:'turret'},
  {id:'veteran',name:'Veteran Tower',desc:'One tower scores 100 kills.',icon:'target'},
  {id:'boss',name:'Hired Monster',desc:'Send a boss into battle.',icon:'troll'},
  {id:'rain',name:'Rain of Ruin',desc:'Cast all three specials in a single wave.',icon:'meteor'},
  {id:'chest',name:'War Chest',desc:'Begin a build phase with $2,000 banked.',icon:'coin'},
  {id:'easy',name:'Squire’s Crown',desc:'Win a Campaign on Easy.',icon:'emblem'},
  {id:'normal',name:'Knight’s Crown',desc:'Win a Campaign on Normal.',icon:'emblem'},
  {id:'hard',name:'Warlord Slayer',desc:'Win a Campaign on Hard.',icon:'emblem'},
  {id:'flawless',name:'Untouched',desc:'Win a Campaign with your keep at full health.',icon:'heal'},
  {id:'breaker',name:'Keepbreaker',desc:'Bring the enemy keep to ruin.',icon:'bombard'},
  {id:'night',name:'The Long Night',desc:'Reach wave 15 in Endless.',icon:'freeze'},
  {id:'eternal',name:'The Siege Eternal',desc:'Reach wave 25 in Endless.',icon:'lich'},
  {id:'duel',name:'Duelist',desc:'Finish a Versus match.',icon:'lightning'},
];
let __hon=(()=>{try{return JSON.parse(localStorage.getItem('castleSiege_honours')||'{}')||{}}catch(e){return{}}})();
let __honBattle=[],__honT=0,__honOpen=false;
function uiHonourCount(){return HONOURS.filter(h=>__hon[h.id]).length}
function uiHonour(id){
  if(__hon[id])return false;const h=HONOURS.find(x=>x.id===id);if(!h)return false;
  __hon[id]=Date.now();try{localStorage.setItem('castleSiege_honours',JSON.stringify(__hon))}catch(e){}
  __honBattle.push(id);
  uiCallout(`Honour earned · <b>${h.name}</b>`,'#ffd76a',h.icon);if(typeof sndHonour==='function')sndHonour();
  uiSyncHonoursMenu();return true;
}
function uiHonoursReset(){__honBattle=[];__honT=0}
function uiHonoursTick(dt){
  if(!(gameState==='build'||gameState==='combat'||gameState==='waveEnd'))return;
  __honT+=dt;if(__honT<0.5)return;__honT=0;
  const p1=players[1],mine=towers.filter(t=>t.owner===1);
  let walls=0;for(const row of grid)for(const c of row)if(c&&c.owner===1&&(c.type==='wall'||c.type==='barricade'))walls++;
  if(walls>=12)uiHonour('mason');
  if(mine.some(t=>(t.level||1)>=3))uiHonour('master');
  if(new Set(mine.map(t=>t.type)).size>=4)uiHonour('arsenal');
  if(mine.some(t=>(t.kills||0)>=100))uiHonour('veteran');
  if(gameState==='combat'&&p1.specials===0)uiHonour('rain');
  if(gameState==='waveEnd'&&waveNum>=1)uiHonour('firstwave');
  if(isEndless()&&waveNum>=15)uiHonour('night');
  if(isEndless()&&waveNum>=25)uiHonour('eternal');
}
// called from startBuild (after income) and tryPlace (boss purchase)
function uiHonoursEvent(kind){
  if(kind==='build'&&waveNum>0&&players[1].credits>=2000)uiHonour('chest');
  if(kind==='boss')uiHonour('boss');
}
function uiHonoursGameOver(winner){
  const p1=players[1],p2=players[2];
  if(waveNum>=1&&p1.castleHP>0)uiHonour('firstwave');
  if(gameMode==='2p'){uiHonour('duel');return}
  if(p2.castleHP<=0)uiHonour('breaker');
  if(winner===1){
    uiHonour(difficulty);
    if(p1.castleHP>=p1.maxHP)uiHonour('flawless');
  }
}
function uiSyncHonoursMenu(){const s=document.getElementById('btn-menu-hon-sub');if(s)s.textContent=`${uiHonourCount()} / ${HONOURS.length}`}
function uiRenderHonours(){
  const g=document.getElementById('hon-grid');if(!g)return;
  g.innerHTML=HONOURS.map(h=>{const t=__hon[h.id];
    return `<div class="hon ${t?'got':''}">${uiIcon(h.icon)}<div><div class="hn">${h.name}</div><div class="hd">${h.desc}</div>${t?`<div class="ht">${new Date(t).toLocaleDateString()}</div>`:''}</div></div>`}).join('');
  document.getElementById('hon-count').textContent=`${uiHonourCount()} of ${HONOURS.length} earned`;
  document.getElementById('hon-bar').style.width=(uiHonourCount()/HONOURS.length*100)+'%';
}
function uiOpenHonours(){
  __honOpen=true;uiRenderHonours();document.getElementById('honours-ov').style.display='flex';
  uiNavSet('#btn-hon-done');uiSfx('select');
}
function uiCloseHonours(){
  if(!__honOpen)return;__honOpen=false;document.getElementById('honours-ov').style.display='none';uiSfx('back');
  uiNavSet('#main-menu .menu-item',document.getElementById('menu-desc'));
}
function uiHonoursOpen(){return __honOpen}
document.addEventListener('DOMContentLoaded',()=>{
  const b=document.getElementById('btn-menu-honours');if(b)b.addEventListener('click',uiOpenHonours);
  const d=document.getElementById('btn-hon-done');if(d)d.addEventListener('click',uiCloseHonours);
  uiSyncHonoursMenu();
});

// ==================== SCOUTING REPORT (v3.46) ====================
// Campaign only: during the build phase the HUD shows what the Warlord
// has bought for the next wave (Hard: only a head-count), and a callout
// names the purchased units when the wave starts.
const SCOUT_PLURAL={goblin:'Goblins',orc:'Orcs',darkKnight:'Dark Knights',archer:'Archers',troll:'Trolls',dragon:'Dragons',lich:'Liches'};
const SCOUT_ONE={troll:'a Troll',dragon:'a Dragon',lich:'a Lich'};
function uiScoutText(q,html){
  const parts=[];for(const id of Object.keys(SCOUT_PLURAL)){const n=q[id]||0;if(n)parts.push(n===1&&SCOUT_ONE[id]?SCOUT_ONE[id]:`${n} ${SCOUT_PLURAL[id]}`)}
  if(!parts.length)return '';
  if(difficulty==='hard'){const n=Object.values(q).reduce((a,b)=>a+(b||0),0);return `The Warlord's host swells by <b>${n}</b> more`}
  const list=parts.length>1?parts.slice(0,-1).join(', ')+' and '+parts[parts.length-1]:parts[0];
  return html?`The Warlord sends <b>${list}</b>`:list;
}
let __scoutSig='';
function uiScoutHUD(hide){
  const el=document.getElementById('scout');if(!el)return;
  if(hide||gameMode!=='1p'||gameState!=='build'){if(__scoutSig){__scoutSig='';el.style.display='none'}return}
  const q=players[2].enemyQueue,sig=difficulty+JSON.stringify(q);
  if(sig===__scoutSig)return;__scoutSig=sig;
  const ids=Object.keys(SCOUT_PLURAL).filter(id=>q[id]>0);
  if(!ids.length){el.style.display='none';return}
  let html='<span class="sk">Scouts</span>';
  if(difficulty==='hard'){const n=ids.reduce((a,id)=>a+q[id],0);html+=`<span class="sq">${n} more mustering</span>`}
  else html+=ids.map(id=>`<span class="sc ${SCOUT_ONE[id]?'boss':''}">${uiIcon(OPT_ICON[id])}${q[id]}</span>`).join('');
  el.innerHTML=html;el.style.display='flex';
}

// ==================== CONTINUE (v3.48) ====================
function uiSyncContinue(){
  const b=document.getElementById('btn-continue');if(!b)return;
  const d=typeof loadCampaignSave==='function'?loadCampaignSave():null;
  b.style.display=d?'':'none';
  if(d){const D=DIFFICULTY[d.d]||DIFFICULTY.normal;
    document.getElementById('btn-continue-sub').textContent=`Wave ${d.w+1} \u00B7 ${D.label}${d.e?' \u00B7 Endless':''}`;
    b.dataset.desc=`Resume your Campaign against the ${D.name}: wave ${d.w+1} build phase, keep at ${Math.max(0,Math.ceil(d.p[1].hp))} HP, $${d.p[1].cr.toLocaleString()} in the treasury.`}
  if(gameState==='modeselect'&&document.getElementById('main-menu'))uiNavSet('#main-menu .menu-item',document.getElementById('menu-desc'));
}
document.addEventListener('DOMContentLoaded',()=>{
  const b=document.getElementById('btn-continue');if(b)b.addEventListener('click',()=>continueCampaign());
  uiSyncContinue();
});

// ==================== OMEN TAG (v3.49) ====================
let __omenSig='';
function uiOmenTag(w,label){
  const el=document.getElementById('omen-tag');if(!el)return;
  const om=omenFor(w),hp=endlessHpMult(w);
  const sig=om.id||hp>1?label+om.id+hp:'';
  if(sig===__omenSig)return;__omenSig=sig;
  if(!sig){el.style.display='none';return}
  el.innerHTML=`<span class="ok">${label}</span>${om.id?`<b>\u263D ${om.name}</b><i>${om.desc}</i>`:''}${hp>1?`<span class="hp">HP +${Math.round((hp-1)*100)}%</span>`:''}`;
  el.style.display='flex';
}

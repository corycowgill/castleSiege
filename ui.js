// Castle Siege — v3.28 UI layer: menus, cinematic backdrop, banners,
// callouts, toasts, tooltips, pause, wave summary and game-over screens.
// Loaded by index_3d.html only.
//
// Depends on globals declared in index_3d.html's inline script (all
// referenced at call time, never at load time):
//   gameState, gameMode, isMobile, waveNum, MAX_WAVES, players, camera,
//   CAM_BASE, camZoom, setCameraZoom, playSound, audioCtx, BUILD_OPTS,
//   TOWER_DATA, ENEMY_DATA, BOSS_DATA, SPECIAL_DATA, showScreen,
//   restartGame, stopMusic, startMusic, titleMusic, applyTimeOfDay

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
  __nav.items=[...document.querySelectorAll(selector)];
  __nav.descEl=descEl||null;
  __nav.idx=Math.max(0,__nav.items.findIndex(i=>i.classList.contains('focus')));
  __nav.items.forEach((it,i)=>{
    if(it._navBound)return;it._navBound=true;
    it.addEventListener('mouseenter',()=>{const k=__nav.items.indexOf(it);if(k>=0&&k!==__nav.idx){__nav.idx=k;uiNavPaint();uiSfx('hover')}});
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
  uiBanner(w>=MAX_WAVES?'Final Wave':`Wave ${w} of ${MAX_WAVES}`,WAVE_NAMES[i],WAVE_TIMES[i],w>=MAX_WAVES);
}
function uiBuildBanner(){
  const w=waveNum+1;
  uiBanner(w===1?'The Siege Begins':`Wave ${waveNum} Repelled`,'Prepare Defenses',`${BUILD_TIME} seconds to fortify before wave ${w}`);
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
  el.addEventListener('mouseenter',()=>{
    tt.innerHTML=uiTooltipHTML(el);
    const r=el.getBoundingClientRect();
    tt.classList.add('show');
    const w=tt.offsetWidth,h=tt.offsetHeight;
    tt.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';
    tt.style.top=Math.max(8,r.top-h-10)+'px';
  });
  el.addEventListener('mouseleave',()=>tt.classList.remove('show'));
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
}
function uiResume(){
  if(gameState!=='paused')return;
  gameState=__pausedFrom||'build';__pausedFrom=null;
  document.getElementById('pause-ov').style.display='none';
  document.querySelectorAll('#pause-ov .btn').forEach(b=>b.classList.remove('focus'));
  uiSfx('select');
}

// ==================== MAIN MENU RETURN ====================
function uiReturnToMenu(){
  uiFade(()=>{
    document.getElementById('pause-ov').style.display='none';
    restartGame();stopMusic();applyTimeOfDay(0.22);
    gameState='modeselect';showScreen('modeselect');
    uiNavSet('#main-menu .menu-item',document.getElementById('menu-desc'));
    players[1].ready=false;players[2].ready=false;
    try{titleMusic.currentTime=0;titleMusic.play().catch(()=>{})}catch(e){}
  });
}

// ==================== WAVE SUMMARY ====================
function uiWaveEnd(){
  const p1=players[1],p2=players[2];
  const wk1=p1.kills-(__waveStartKills1||0),wk2=p2.kills-(__waveStartKills2||0);
  const wd1=Math.round(p1.totalDmgDealt-(__waveStartDmg1||0)),wd2=Math.round(p2.totalDmgDealt-(__waveStartDmg2||0));
  const n2=gameMode==='1p'?'Warlord':'Red Crown';
  const row=(a,lab,b)=>`<div class="l p1c">${a}</div><div class="m">${lab}</div><div class="r p2c">${b}</div>`;
  document.getElementById('we-title').textContent=`Wave ${waveNum} Complete`;
  document.getElementById('we-grid').innerHTML=
    `<div class="l p1c hd" style="font-size:clamp(10px,1vw,12px);letter-spacing:.24em">BLUE CROWN</div><div class="m"></div><div class="r p2c hd" style="font-size:clamp(10px,1vw,12px);letter-spacing:.24em">${n2.toUpperCase()}</div>`+
    row(wk1,'Kills',wk2)+row(wd1,'Damage',wd2)+row(Math.max(0,Math.ceil(p1.castleHP)),'Castle HP',Math.max(0,Math.ceil(p2.castleHP)));
}

// ==================== GAME OVER ====================
function uiGameOver(winner,score,best,isNewBest){
  const ov=document.getElementById('gameover-ov');
  const p1=players[1],p2=players[2];
  const draw=winner==='draw';
  const p1won=winner===1;
  let title,sub,kicker;
  if(gameMode==='1p'){
    title=draw?'Stalemate':p1won?'Victory':'Defeat';
    sub=draw?'Neither crown would yield.':p1won?(p2.castleHP<=0?'The warlord\'s keep lies in ruin.':'Your keep stands taller at the final dawn.'):(p1.castleHP<=0?'Your walls have fallen. The realm mourns.':'The warlord outlasted you.');
    kicker=`After ${waveNum} wave${waveNum===1?'':'s'}`;
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
  setTimeout(()=>{
    const bars=cmp.querySelectorAll('.cmp');
    rows.forEach(([,a,b],i)=>{const m=Math.max(1,a,b);bars[i].querySelector('.bar.l i').style.width=(a/m*100)+'%';bars[i].querySelector('.bar.r i').style.width=(b/m*100)+'%'});
  },1200);
  document.getElementById('btn-go-again').classList.add('focus');document.getElementById('btn-go-menu').classList.remove('focus');
  uiNavSet('#gameover-ov .btn');
}

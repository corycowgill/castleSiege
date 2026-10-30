// Mechanics regression test: asserts the rules added in v3.39-v3.56.
// Usage: PORT=8765 node tests/mechanics.js   (exit code 1 on any FAIL)
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:800,height:450}});
  const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
  await p.goto('http://localhost:'+(process.env.PORT||8765)+'/index_3d.html');
  await p.evaluate(()=>{localStorage.clear();localStorage.setItem('castleSiege_settings',JSON.stringify({tips:false}))});
  await p.reload();await p.waitForTimeout(3000);
  const r=await p.evaluate(()=>{
    const res={};const ok=(k,v)=>{res[k]=v?'PASS':'FAIL'};
    document.getElementById('welcome-screen').style.display='none';window._select1P();
    gameState='build';buildTimer=9999;showScreen('game');aiUpdate=()=>{};
    const pl=players[1];pl.credits=99999;
    const sel=id=>pl.selectedIdx=BUILD_OPTS.findIndex(o=>o.id===id);
    const at=(c,r)=>pl.cursor={c,r};
    const TW=(c,r)=>towers.find(t=>t.owner===1&&t.col===c&&t.row===r);
    // --- bounty: bought units pay half; overkill pays nothing extra
    const pay=type=>{spawnEnemy(type,2,8,1);const e=enemies[enemies.length-1];const c0=players[2].credits;dealDamage(e,1000);enemies.length=0;return players[2].credits-c0};
    ok('bounty_free_orc_34',pay('orc')===34);
    ok('bounty_bought_orc_17',pay('+orc')===17);
    // --- refunds: full this build phase, half after the wave starts
    sel('magic');at(8,6);let c0=pl.credits;tryPlace(pl,1);trySell(pl,1);ok('takeback_full',pl.credits===c0);
    sel('turret');at(8,6);tryPlace(pl,1);clearFreshBuilds();ok('refund_half_after_wave',towerRefund(TW(8,6))===50);
    // --- upgrade on own tower whatever is selected (touch fix)
    sel('goblin');at(8,6);const q0=pl.enemyQueue.goblin;tryActAt(pl,1);
    ok('tap_upgrades_not_buys',TW(8,6).level===2&&pl.enemyQueue.goblin===q0&&BUILD_OPTS[pl.selectedIdx].id==='goblin');
    // --- wall repair
    sel('wall');at(10,8);tryPlace(pl,1);grid[8][10].hp=60;c0=pl.credits;sel('goblin');tryActAt(pl,1);
    ok('wall_repair',grid[8][10].hp===150&&c0-pl.credits===18);
    // --- targeting modes cycle, banners have none
    at(8,6);cycleTargetMode(pl,1);ok('target_cycle',TW(8,6).tmode===1);
    // --- War Banner aura
    sel('turret');at(12,6);tryPlace(pl,1);at(16,6);tryPlace(pl,1);
    sel('banner');at(13,5);tryPlace(pl,1);
    ok('banner_buffs_adjacent',TW(12,6)._buff===0.25&&TW(16,6)._buff===0&&TW(13,5)._buff===0);
    tryActAt(pl,1);tryActAt(pl,1);ok('banner_lv3_45',Math.abs(TW(12,6)._buff-0.45)<1e-9);
    at(13,5);ok('banner_no_target_mode',cycleTargetMode(pl,1)===false);
    // --- Endless: no cap at 10, omens apply, classic unaffected
    setEndless(true);ok('omen_none_before_11',omenFor(10).id==='');
    const ids=new Set();for(let w=11;w<=15;w++)ids.add(omenFor(w).id);ok('omens_cycle_all_5',ids.size===5);
    setEndless(false);ok('classic_no_omen',omenFor(15).id==='');
    // --- temperaments: rolled from the table, saved with the campaign
    ok('temper_valid',!!TEMPERS[aiTemper]);
    aiTemper='raider';waveNum=3;saveCampaign();const sv=loadCampaignSave();
    ok('save_has_temper_towers',sv&&sv.tp==='raider'&&sv.towers.some(t=>t.ty==='banner'&&t.l===3));
    aiTemper='strategist';applyCampaignSave(sv);ok('restore_temper',aiTemper==='raider');
    clearCampaignSave();ok('save_cleared',loadCampaignSave()===null);
    // --- Daily Siege: endless with omens from wave 2, day-fixed temper, no campaign save
    __daily=true;ok('daily_endless_omens',isEndless()&&omenFor(1).id===''&&omenFor(2).id!=='');
    ok('daily_temper_fixed',dailyTemper()===dailyTemper()&&!!TEMPERS[dailyTemper()]);
    waveNum=3;saveCampaign();ok('daily_never_saves',loadCampaignSave()===null);
    leaveDaily();ok('daily_left',!__daily&&!isEndless());
    // --- speed: 1x -> 2x -> 3x -> 1x, only during a wave
    gameState='combat';__combatSpeed=1;cycleSpeed();const s2=__combatSpeed;cycleSpeed();const s3=__combatSpeed;cycleSpeed();
    ok('speed_cycle',s2===2&&s3===3&&__combatSpeed===1);gameState='build';cycleSpeed();ok('speed_build_noop',__combatSpeed===1);
    // --- adaptive resolution: Auto drops under slow frames and recovers; High is fixed
    SETTINGS.gfx='auto';uiApplySettings();const feed=(ms,secs)=>{for(let x=0;x<secs*1000;x+=ms)adaptResolution(ms)};
    feed(33,10);const low=__prScale;feed(16,90);ok('adaptive_res',low<0.8&&__prScale===1);
    SETTINGS.gfx='high';uiApplySettings();feed(50,10);ok('high_fixed_res',__prScale===1);SETTINGS.gfx='auto';uiApplySettings();
    // --- specialisations: Lv3 only, once, effects apply, refund includes them
    sel('bombard');at(14,11);tryPlace(pl,1);const bb=TW(14,11);ok('spec_needs_lv3',trySpecialize(pl,1,0)&&!bb.spec);
    tryPlace(pl,1);tryPlace(pl,1);trySpecialize(pl,1,0);ok('spec_pierce',bb.spec==='pierce'&&bb._pierce===1);
    trySpecialize(pl,1,1);ok('spec_once',bb.spec==='pierce');
    spawnEnemy('darkKnight',30,8,2);const dk=enemies[enemies.length-1];dk.hp=999;dealDamage(dk,60,bb);ok('spec_pierce_ignores_armour',dk.hp===939);enemies.length=0;
    ok('spec_refund',towerRefund(bb)===200+120+120+180);
    // --- sappers: blast flattens a wall (+50 to neighbours), never stop to brawl
    grid[3][25]={type:'wall',owner:2,hp:150,maxHp:150};grid[3][26]={type:'wall',owner:2,hp:150,maxHp:150};
    spawnEnemy('+sapper',24,3,1);const sp=enemies[enemies.length-1];ok('sapper_flag_halfbounty',sp.sapper&&sp.bountyMul===0.5);
    sapperBlast(sp,25,3);ok('sapper_blast',grid[3][25]===null&&grid[3][26].hp===100&&!sp.alive);grid[3][26]=null;markGridDirty();enemies.length=0;
    // --- wall painting: a stroke fills skipped tiles, never seals the route
    sel('wall');pl._paintFrom=null;pl._paintLast=null;paintStroke(pl,1,4,1);paintStroke(pl,1,9,1);
    ok('paint_fills_line',[4,5,6,7,8,9].every(c=>grid[1][c]&&grid[1][c].type==='wall'));
    pl._paintFrom=null;pl._paintLast=null;for(let r=0;r<ROWS;r++)paintStroke(pl,1,3,r);ok('paint_keeps_route_open',!!previewPath(2));
    // --- maze preview: hovering shows how far a build pushes the route
    sel('wall');const g=[...Array(ROWS).keys()].find(r=>!grid[r][3]);
    at(4,g);ok('maze_seal_no_preview',__cursorAction(1).state==='bad'&&__cursorAction(1).delta===null);
    sel('turret');let hit=0;for(const t of previewPath(2).filter(t=>t.c>=6&&t.c<=19)){at(t.c,t.r);const a=__cursorAction(1);if(a.state!=='ok')continue;
      const base=previewPath(2).length;grid[t.r][t.c]={type:'temp',owner:1};const len=previewPath(2).length;grid[t.r][t.c]=null;
      if(a.delta!==len-base||(a.delta>0)!==!!a.ghost){hit=-1;break}hit++}
    ok('maze_delta_matches_route',hit>0);
    // --- veterancy: 25 kills promotes (+7% dmg); sold towers lose it; saved via kills
    sel('turret');at(17,2);tryPlace(pl,1);const vt=TW(17,2);const d0=vt.dmg;vt.kills=24;
    spawnEnemy('goblin',30,8,2);const ve=enemies[enemies.length-1];dealDamage(ve,9999,vt);enemies.length=0;
    ok('vet_promote',vt.rank===1&&vt.dmg===Math.round(d0*1.07));
    vt.kills=175;recomputeTower(vt);ok('vet_elite_cap',vt.rank===3&&vt.dmg===Math.round(d0*1.21));
    updatePathPreview();const pm=__pathPrev.meshes[2];
    ok('kill_zone_tint',__pathPrev.cov.some(c=>c>0)&&__pathPrev.cov.some(c=>c===0)&&!!pm.instanceColor);
    // --- v3.73 undo: build, upgrade, army, a dragged wall line as one step; cleared at wave start
    pl._undo=[];sel('turret');at(18,14);let u0=pl.credits;tryPlace(pl,1);tryPlace(pl,1);
    tryUndo(pl,1);ok('undo_upgrade',TW(18,14).level===1&&pl.credits===u0-100);
    tryUndo(pl,1);ok('undo_build',!TW(18,14)&&!grid[14][18]&&pl.credits===u0);
    sel('goblin');const gq=pl.enemyQueue.goblin||0;tryPlace(pl,1);tryUndo(pl,1);ok('undo_army',(pl.enemyQueue.goblin||0)===gq&&pl.credits===u0);
    sel('wall');pl._paintFrom=null;pl._paintLast=null;paintStroke(pl,1,6,16);paintStroke(pl,1,10,16);
    tryUndo(pl,1);ok('undo_stroke_one_step',[6,7,8,9,10].every(c=>!grid[16][c])&&pl.credits===u0);
    tryPlace(pl,1);clearFreshBuilds();ok('undo_cleared_at_wave',!tryUndo(pl,1));trySell(pl,1);
    // --- v3.73 controls: digit hotkeys, held movement repeats faster
    pl.cursor={c:5,r:5};keyPressed['Digit3']=true;processInput(0.016);ok('hotkey_3_catapult',BUILD_OPTS[pl.selectedIdx].id===BUILD_OPTS[HOTKEY_OPTS[2]].id&&HOTKEY_OPTS.length===10);
    {const q={cursor:{c:0,r:5}};heldMove(q,'_m',1,0,0.016,1);const a1=q.cursor.c;for(let k=0;k<60;k++)heldMove(q,'_m',1,0,1/60,1);
     ok('held_move_accel',a1===1&&q.cursor.c>=9&&q.cursor.c<=14);heldMove(q,'_m',0,0,0.016,1);heldMove(q,'_m',0,1,0.016,1);ok('held_move_new_dir_instant',q.cursor.r===6)}
    // --- keep warnings fire once per threshold
    pl.castleHP=pl.maxHP*0.45;keepWarn(1);pl.castleHP=pl.maxHP*0.44;keepWarn(1);
    ok('keep_warn_once',pl._warn[0.5]===true&&document.getElementById('callouts').childElementCount===1);
    return res;
  });
  const fails=Object.entries(r).filter(([k,v])=>v==='FAIL');
  console.log(Object.keys(r).length+' checks, '+fails.length+' failed'+(fails.length?': '+fails.map(f=>f[0]).join(', '):''));
  console.log(errs.slice(0,5).join('\n')||'no console errors');await b.close();
  if(fails.length||errs.length)process.exitCode=1;
})();

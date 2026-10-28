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

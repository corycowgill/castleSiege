// Smoke test: every tower/unit/boss/castle/projectile model builds, animates
// and disposes; effects run without errors. Usage: PORT=8765 node tests/smoke.js
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:800,height:450}});
  const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'||(m.type()==='warning'&&!/deprecated/.test(m.text())))errs.push(m.text())});
  await p.goto('http://localhost:'+(process.env.PORT||8765)+'/index_3d.html');await p.waitForTimeout(3000);
  const r=await p.evaluate(()=>{
    const res={};const ok=(k,v)=>{res[k]=v?'PASS':'FAIL'};
    document.getElementById('welcome-screen').style.display='none';gameState='build';buildTimer=9999;showScreen('game');aiUpdate=()=>{};
    const tick=()=>{syncBuildings();syncTowers();syncEnemies();syncProjectiles();updateCastleFx(0.2)};
    const fx=()=>{for(let i=0;i<150;i++){updateVfx(1/60);updateDmgNumbers(1/60);updateSmoke(1/60);updateParticles(1/60)}};
    // towers: every family, both factions, L1->L3 swap + sell
    for(const pn of[1,2])['turret','magic','catapult','bombard'].forEach((ty,i)=>{
      const P=players[pn];P.credits=1e6;const c=pn===1?4+i*3:24+i*3;P.cursor={c,r:3};P.selectedIdx=BUILD_OPTS.findIndex(o=>o.id===ty);
      tryPlace(P,pn);tick();const t=towers.find(t=>t.col===c&&t.row===3);const m1=towerMeshes.get(t);
      tryPlace(P,pn);tick();tryPlace(P,pn);tick();const m3=towerMeshes.get(t);
      ok(`${ty}_p${pn}_L1_L3`,m1.userData.artLevel===1&&t.level===3&&m3.userData.artLevel===3&&!m1.parent);
      trySell(P,pn);tick();ok(`${ty}_p${pn}_sell`,!towers.includes(t)&&!m3.parent);
    });
    // catapult arm animates with cooldown; magic rings spin
    {const P=players[1];P.cursor={c:6,r:5};P.selectedIdx=BUILD_OPTS.findIndex(o=>o.id==='catapult');tryPlace(P,1);P.cursor={c:8,r:5};P.selectedIdx=BUILD_OPTS.findIndex(o=>o.id==='magic');tryPlace(P,1);tick();
     const cat=towers.find(t=>t.col===6&&t.row===5),mg=towers.find(t=>t.col===8&&t.row===5);
     const arm=towerMeshes.get(cat).userData.anim.find(c=>c.userData.limb==='arm');
     cat.cooldown=cat.rate*0.97;__lastRawDt=1/60;tick();const a0=arm.rotation.x;cat.cooldown=0;tick();const a1=arm.rotation.x;
     const sp=towerMeshes.get(mg).userData.anim.find(c=>c.userData.limb==='spin');const s0=sp.rotation.y+sp.rotation.x+sp.rotation.z;tick();tick();
     ok('catapult_arm_follows_reload',a0>1.2&&Math.abs(a1-(-0.3))<0.05);ok('magic_rings_spin',sp.rotation.y+sp.rotation.x+sp.rotation.z!==s0);
     trySell(P,1);P.cursor={c:6,r:5};trySell(P,1);tick();}
    // enemies: all 7 art models, limb contract, scale
    for(const ty of['goblin','orc','darkKnight','archer','troll','dragon','lich']){
      const m=createEnemyModel(ty,2);const L=new Set();m.traverse(c=>{if(c.userData.limb)L.add(c.userData.limb)});
      const boss=['troll','dragon','lich'].includes(ty);
      ok(`${ty}_model`,!!ART.enemy[ty]&&m.scale.x===(boss?3.8:2.2)&&L.has('leftArm')&&L.has('rightArm')&&(ty==='lich'||L.has('leftLeg')));
    }
    // walls + barricades art and blocking
    {const P=players[2];P.credits=1e6;P.cursor={c:30,r:15};P.selectedIdx=BUILD_OPTS.findIndex(o=>o.id==='wall');tryPlace(P,2);P.cursor={c:31,r:15};P.selectedIdx=BUILD_OPTS.findIndex(o=>o.id==='barricade');tryPlace(P,2);tick();
     ok('walls_built',buildingMeshes.size>=2&&!isPassable(30,15,2)&&!isPassable(31,15,2));
     P.cursor={c:30,r:15};trySell(P,2);P.cursor={c:31,r:15};trySell(P,2);tick();}
    // gameplay semantics preserved
    gameState='combat';
    {for(let r=0;r<18;r++){players[2].cursor={c:25,r};players[2].selectedIdx=BUILD_OPTS.findIndex(o=>o.id==='wall');tryPlace(players[2],2)}
     spawnEnemy('dragon',20,8,1);const d=enemies[enemies.length-1];ok('dragon_flies_over_walls',d.flying&&d.path.length<=20);
     const w0=grid.flat().filter(c=>c&&c.type==='wall').length;spawnEnemy('troll',20,8,1);
     for(let i=0;i<60*40;i++){updateCombat(1/60);if(grid.flat().filter(c=>c&&c.type==='wall').length<w0)break}
     ok('troll_smashes_wall',grid.flat().filter(c=>c&&c.type==='wall').length<w0);
     for(const e of enemies)e.alive=false;updateCombat(1/60);}
    {spawnEnemy('lich',10,8,1);spawnEnemy('goblin',10,9,1);const L=enemies[enemies.length-2],g=enemies[enemies.length-1];L.spd=g.spd=0;g.hp=5;L.auraCd=0;updateCombat(1/60);ok('lich_heals_allies',g.hp>5);
     for(const e of enemies)e.alive=false;updateCombat(1/60);}
    tick();
    // castle damage states
    {const vis=(m,k)=>{let v=null;m.traverse(o=>{if(o.userData.limb===k&&v===null)v=o.visible});return v};const P=players[2],st=[];
     for(const hp of[1,0.5,0.2,1]){P.castleHP=P.maxHP*hp;updateCastleFx(0.2);st.push([vis(castle2Mesh,'dmgA'),vis(castle2Mesh,'dmgB'),vis(castle2Mesh,'rubA'),vis(castle2Mesh,'rubB')].map(Number).join(''))}
     ok('castle_damage_states',st.join(' ')==='1100 0110 0011 1100');}
    // builder failure fallback
    {const keep=ART.enemy.lich.build;ART.enemy.lich.build=()=>{throw new Error('boom')};let m=null;try{m=createEnemyModel('lich',1)}catch(e){}ART.enemy.lich.build=keep;ok('builder_failure_falls_back',!!m);}
    // restart stability with every asset type
    {gameState='combat';restartGame();tick();fx();const seq=[scene.children.length];
     for(let k=0;k<3;k++){const P=players[1];P.credits=1e6;['turret','magic','catapult','bombard'].forEach((ty,i)=>{P.cursor={c:4+i*2,r:3};P.selectedIdx=BUILD_OPTS.findIndex(o=>o.id===ty);tryPlace(P,1);tryPlace(P,1);tryPlace(P,1)});
      P.cursor={c:4,r:14};P.selectedIdx=BUILD_OPTS.findIndex(o=>o.id==='wall');tryPlace(P,1);
      for(const ty of['goblin','orc','darkKnight','archer','troll','dragon','lich'])spawnEnemy(ty,4,8,1);
      gameState='combat';for(let i=0;i<30;i++)updateCombat(1/60);tick();restartGame();tick();fx();seq.push(scene.children.length)}
     res.scene_children=seq.join(',');ok('restart_no_leak',seq[1]===seq[2]&&seq[2]===seq[3]);}
    return res;
  });
  const fails=Object.entries(r).filter(([k,v])=>v==='FAIL');
  console.log(Object.keys(r).length+' checks, '+fails.length+' failed'+(fails.length?': '+fails.map(f=>f[0]).join(', '):''));console.log('scene_children: '+r.scene_children);
  console.log(errs.slice(0,5).join('\n')||'no console errors');await b.close();
  if(fails.length)process.exitCode=1;
})();

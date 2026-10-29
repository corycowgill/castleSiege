// Balance sim: a scripted defence vs the AI on $DIFF (default Normal) for each Warlord
// temperament, 3 seeds each. MAZE=1 makes the defence also build up to 14 walls. Slow (~10 min). Usage: node tests/balance.js PORT [tempers]
const {chromium}=require('playwright');
const PORT=process.argv[2]||8765;
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader']});
  const res={};
  for(const d of(process.argv[3]||'strategist,fortifier,raider,beastmaster').split(','))for(const seed0 of[1,7,4242]){
    const p=await b.newPage({viewport:{width:480,height:270}});
    await p.goto(`http://localhost:${PORT}/index_3d.html`);await p.evaluate(([d,m])=>{window.__DIFF=d;window.__MAZE=m},[process.env.DIFF||'normal',!!process.env.MAZE]);await p.waitForTimeout(2500);
    const r=await p.evaluate(([d,seed0])=>{
      document.getElementById('welcome-screen').style.display='none';window._select1P();setDifficulty(window.__DIFF||'normal');aiTemper=d;
      gameState='build';buildTimer=BUILD_TIME;applyDifficultyStart();
      const P=players[1];const spots=[[17,6],[17,11],[15,6],[15,11],[13,6],[13,11],[11,6],[11,11],[9,6],[9,11]];let si=0;
      let seed=seed0;Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
      for(let i=0;i<60*60*45&&gameState!=='gameover';i++){
        aiUpdate(1/60);
        if(gameState==='build'){
          if(i%30===0){
            if(si<spots.length&&P.credits>=150){P.cursor={c:spots[si][0],r:spots[si][1]};P.selectedIdx=BUILD_OPTS.findIndex(o=>o.id===['turret','catapult','magic','bombard'][si%4]);tryPlace(P,1);si++}
            else if(window.__MAZE&&P.credits>=60&&grid.flat().filter(c=>c&&c.owner===1&&c.type==='wall').length<14){const sp=aiFindWallSpot(1);if(sp){P.cursor={c:sp.c,r:sp.r};P.selectedIdx=BUILD_OPTS.findIndex(o=>o.id==='wall');tryPlace(P,1)}}
            else{const t=towers.find(t=>t.owner===1&&t.level<3);if(t&&P.credits>=120){P.cursor={c:t.col,r:t.row};P.selectedIdx=0;tryPlace(P,1)}else if(P.credits>=100){P.selectedIdx=BUILD_OPTS.findIndex(o=>o.id==='goblin');tryPlace(P,1)}}
          }
          if(buildTimer<2)P.ready=true;updateBuild(1/60);
        }else if(gameState==='combat')updateCombat(1/60);
        else if(gameState==='waveEnd'){waveEndTimer-=1/60;if(waveEndTimer<=0)startBuild()}
      }
      return {w:waveNum,hp:Math.max(0,players[1].castleHP|0),ai:Math.max(0,players[2].castleHP|0),aiGold:players[2].credits|0};
    },[d,seed0]);
    (res[d]=res[d]||[]).push(r);await p.close();
  }
  for(const d in res)console.log(PORT,d.padEnd(6),res[d].map(r=>`w${r.w} P1hp ${r.hp} AIhp ${r.ai} AI$${r.aiGold}`).join(' | '));
  await b.close();
})();

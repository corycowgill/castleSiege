// Autoplay: a scripted defence plays a Campaign to game over; prints the
// result and renderer stats. Usage: PORT=8765 node tests/autoplay.js
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1280,height:720}});
  const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('http://localhost:'+(process.env.PORT||8765)+'/index_3d.html');await p.waitForTimeout(2500);
  await p.evaluate(()=>{document.getElementById('welcome-screen').style.display='none';window._select1P()});await p.waitForTimeout(600);
  const r=await p.evaluate(()=>{
    gameState='build';buildTimer=BUILD_TIME;showScreen('game');
    const log=[];
    for(let i=0;i<60*60*40&&gameState!=='gameover';i++){
      aiUpdate(1/60);
      if(gameState==='build'){players[1].ready=true;updateBuild(1/60)}
      else if(gameState==='combat')updateCombat(1/60);
      else if(gameState==='waveEnd'){waveEndTimer-=1/60;if(waveEndTimer<=0)startBuild()}
      if(i%900===0){syncBuildings();syncTowers();syncEnemies();syncProjectiles();__post.render(scene,camera)}
    }
    return JSON.stringify({end:gameState,wave:waveNum,programs:renderer.info.programs.length,calls:renderer.info.render.calls,tris:renderer.info.render.triangles,post:__post.enabled});
  });
  console.log(r);
  if(0){const g=await b.newPage();
  }
  console.log(errs.join('\n'));await b.close();
})();

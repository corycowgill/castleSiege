// Castle Siege — VFX spawners, particle pool, damage numbers, vfx queue.
// Loaded by index_3d.html only (the field guide doesn't need any of this).
//
// Depends on globals declared in index_3d.html's inline script:
//   scene, enemies, dealDamage, pixelToWorld, T, sndHit
// ...and on globals it declares itself that are referenced elsewhere:
//   particlePool, PARTICLE_GEO, dmgNumbers, vfx, addVfx
//
// Top-level const declarations here land in the shared "script scope" so
// the inline script can reference them by name at runtime.
//
// Requires THREE to be loaded first.

// ==================== PARTICLE SYSTEM ====================
// v3.32: one InstancedMesh for all sparks/debris (was 300 separate
// meshes, each its own draw call + material). Particles fade by
// shrinking, so no per-instance opacity is needed.
const PARTICLE_MAX=600;
const particlePool=[];const PARTICLE_GEO=new THREE.BoxGeometry(0.03,0.03,0.03);
let __pMesh=null;const __pDummy=new THREE.Object3D(),__pCol=new THREE.Color();
function initParticles(){
  const m=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x222222,flatShading:true,roughness:0.6});
  __pMesh=new THREE.InstancedMesh(PARTICLE_GEO,m,PARTICLE_MAX);
  __pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  __pMesh.setColorAt(0,__pCol.set(0xffffff));__pMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  __pMesh.count=0;__pMesh.frustumCulled=false;scene.add(__pMesh);
  __initFlashLights(); // fixed light count from frame one
  for(let i=0;i<PARTICLE_MAX;i++)particlePool.push({active:false,x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,maxLife:0,s:1,color:new THREE.Color()});
}
let __pCursor=0;
function emitParticles(wx,wy,wz,color,count,spread){
  let spawned=0;
  for(let n=0;n<PARTICLE_MAX&&spawned<count;n++){
    const p=particlePool[__pCursor];__pCursor=(__pCursor+1)%PARTICLE_MAX;
    if(p.active)continue;
    p.active=true;p.x=wx;p.y=wy;p.z=wz;p.color.set(color);
    const sp=spread/T;
    p.vx=(Math.random()-0.5)*sp*2;p.vy=Math.random()*sp*2+sp*0.5;p.vz=(Math.random()-0.5)*sp*2;
    p.maxLife=0.4+Math.random()*0.6;p.life=p.maxLife;p.s=0.5+Math.random();spawned++;
  }
}
function updateParticles(dt){
  if(!__pMesh)return;
  let n=0;
  for(let i=0;i<PARTICLE_MAX;i++){
    const p=particlePool[i];if(!p.active)continue;
    p.life-=dt;if(p.life<=0){p.active=false;continue}
    p.vy-=3.0*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    const k=p.s*(p.life/p.maxLife);
    __pDummy.position.set(p.x,p.y,p.z);__pDummy.scale.set(k,k,k);__pDummy.updateMatrix();
    __pMesh.setMatrixAt(n,__pDummy.matrix);__pMesh.setColorAt(n,p.color);n++;
  }
  __pMesh.count=n;
  if(n){__pMesh.instanceMatrix.needsUpdate=true;__pMesh.instanceColor.needsUpdate=true}
}

// ==================== FLASH LIGHT POOL ====================
// v3.32: a fixed set of point lights that flashes borrow. Adding and
// removing lights changes the scene's light count, which makes three.js
// recompile every lit shader — the main source of mid-battle hitches
// (18 -> 49 programs in a 20-frame benchmark). Lights here are always
// present; idle ones just sit at intensity 0.
const FLASH_LIGHTS=4;const __flashLights=[];
function __initFlashLights(){
  for(let i=0;i<FLASH_LIGHTS;i++){const l=new THREE.PointLight(0xffffff,0,6,1.5);l.position.set(0,-50,0);scene.add(l);__flashLights.push({l,t:0,life:1,peak:0})}
}
function flashLight(x,y,z,color,peak,dist,life){
  if(!__flashLights.length)__initFlashLights();
  // steal the dimmest (or finished) slot
  let best=__flashLights[0];
  for(const f of __flashLights){const cur=f.t>=f.life?0:f.peak*(1-f.t/f.life);const bc=best.t>=best.life?0:best.peak*(1-best.t/best.life);if(cur<bc)best=f}
  best.l.color.set(color);best.l.distance=dist;best.l.position.set(x,y,z);best.t=0;best.life=life;best.peak=peak;best.l.intensity=peak;
  return best;
}
function __updateFlashLights(dt){
  for(const f of __flashLights){
    if(f.t>=f.life){if(f.l.intensity!==0)f.l.intensity=0;continue}
    f.t+=dt;f.l.intensity=Math.max(0,f.peak*(1-f.t/f.life));
  }
}
// Shared flash geometry (was a new SphereGeometry per shot).
const __flashGeo=new THREE.SphereGeometry(1,12,10);

// Short-lived flash sphere for muzzle/impact flashes.
// Uses an emissive sphere + point light that fades over ~0.3s.
function spawnMuzzleFlash(wx,wy,wz,color,size){
  const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending});
  const core=new THREE.Mesh(__flashGeo,mat);const r0=size||0.25;
  core.position.set(wx,wy,wz);core.scale.setScalar(r0);scene.add(core);
  flashLight(wx,wy,wz,color,3.5,r0*10,0.28);
  let t=0;
  addVfx({
    update(dt){
      t+=dt;
      const k=t/0.28;
      if(k>=1){return false}
      core.scale.setScalar(r0*(1+k*1.8));
      mat.opacity=1-k;
      return true;
    },
    dispose(){
      scene.remove(core);mat.dispose();
    }
  });
}
function spawnImpactFlash(wx,wy,wz,color,size){
  // Bigger, slower flash for projectile impacts. Two overlapping spheres.
  const R=size||0.4;
  const outerMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.55,depthWrite:false,blending:THREE.AdditiveBlending});
  const outer=new THREE.Mesh(__flashGeo,outerMat);
  outer.position.set(wx,wy,wz);outer.scale.setScalar(R);scene.add(outer);
  const coreMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending});
  const core=new THREE.Mesh(__flashGeo,coreMat);
  core.position.set(wx,wy,wz);core.scale.setScalar(R*0.5);scene.add(core);
  flashLight(wx,wy,wz,color,5.0,R*14,0.45);
  // Expanding shockwave ring (shared ring geometry, scaled)
  const ringMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.7,side:THREE.DoubleSide,depthWrite:false});
  const ring=new THREE.Mesh(__ringGeo,ringMat);
  ring.position.set(wx,wy-0.05,wz);ring.scale.setScalar(R*0.5);scene.add(ring);
  let t=0;
  addVfx({
    update(dt){
      t+=dt;
      const k=t/0.45;
      if(k>=1){return false}
      const expand=1+k*2.5;
      outer.scale.setScalar(R*expand);
      core.scale.setScalar(R*0.5*(1+k*1.2));
      outerMat.opacity=0.55*(1-k);
      coreMat.opacity=1-k;
      ring.scale.setScalar(R*0.5*(1+k*4));
      ringMat.opacity=0.7*(1-k);
      return true;
    },
    dispose(){
      scene.remove(outer);scene.remove(core);scene.remove(ring);
      outerMat.dispose();coreMat.dispose();ringMat.dispose();
    }
  });
}
// ==================== DAMAGE NUMBERS ====================
// v3.32: textures are cached by text+colour (numbers repeat constantly)
// and sprites/materials are pooled. Previously every number allocated a
// canvas, a GPU texture and a material, then threw them away 1s later.
const dmgNumbers=[];const __dnTex=new Map();const __dnFree=[];
function __dnTexture(text,color){
  const key=text+'|'+color;let t=__dnTex.get(key);
  if(t){__dnTex.delete(key);__dnTex.set(key,t);return t} // LRU touch
  const c=document.createElement('canvas');c.width=128;c.height=64;
  const ctx=c.getContext('2d');ctx.font='bold 40px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.strokeStyle='#000';ctx.lineWidth=4;ctx.strokeText(text,64,32);
  const col=new THREE.Color(color);
  ctx.fillStyle=`rgb(${Math.floor(col.r*255)},${Math.floor(col.g*255)},${Math.floor(col.b*255)})`;
  ctx.fillText(text,64,32);
  t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  __dnTex.set(key,t);
  if(__dnTex.size>160){const k0=__dnTex.keys().next().value;const old=__dnTex.get(k0);
    if(!dmgNumbers.some(d=>d.sprite.material.map===old)){old.dispose();__dnTex.delete(k0)}}
  return t;
}
function spawnDmgNumber(wx,wy,wz,text,color){
  const tex=__dnTexture(String(text),color);
  let sprite=__dnFree.pop();
  if(!sprite){sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));scene.add(sprite)}
  sprite.material.map=tex;sprite.material.opacity=1;sprite.visible=true;
  sprite.position.set(wx,wy,wz);sprite.scale.set(0.5,0.25,1);
  dmgNumbers.push({sprite,age:0,driftX:(Math.random()-0.5)*0.3});
}
function updateDmgNumbers(dt){
  for(let i=dmgNumbers.length-1;i>=0;i--){
    const d=dmgNumbers[i];d.age+=dt;d.sprite.position.y+=0.8*dt;d.sprite.position.x+=d.driftX*dt;
    const t=d.age/1.0;if(t>0.4)d.sprite.material.opacity=Math.max(0,1-(t-0.4)/0.6);
    if(d.age>=1.0){d.sprite.visible=false;__dnFree.push(d.sprite);dmgNumbers[i]=dmgNumbers[dmgNumbers.length-1];dmgNumbers.pop()}
  }
}

// ==================== SPECIAL VFX ====================
const vfx=[];
function addVfx(obj){vfx.push(obj)}
function updateVfx(dt){
  __updateFlashLights(dt);
  for(let i=vfx.length-1;i>=0;i--){
    const v=vfx[i];
    if(v.update(dt)===false){if(v.dispose)v.dispose();vfx.splice(i,1)}
  }
}

// Falling meteor with fire tail. Triggers dealDamage to all enemies of enemyTeam within impactRadius on strike.
function spawnMeteorStrike(wx,wz,delay,impactRadius,dmg,enemyTeam){
  const startY=18+Math.random()*4;
  const offX=(Math.random()-0.5)*0.6,offZ=(Math.random()-0.5)*0.6;
  const core=new THREE.Mesh(new THREE.SphereGeometry(0.18,10,8),
    new THREE.MeshStandardMaterial({color:0xff5500,emissive:0xff3300,emissiveIntensity:2.2}));
  const glow=new THREE.Mesh(new THREE.SphereGeometry(0.34,10,8),
    new THREE.MeshBasicMaterial({color:0xffaa22,transparent:true,opacity:0.45,depthWrite:false}));
  core.position.set(wx+offX,startY,wz+offZ);glow.position.copy(core.position);
  core.visible=false;glow.visible=false;
  scene.add(core);scene.add(glow);
  const fallTime=0.55;
  let t=0,wait=delay||0,exploded=false,trailTimer=0;
  addVfx({
    update(dt){
      if(wait>0){wait-=dt;return true}
      if(!core.visible){core.visible=true;glow.visible=true}
      t+=dt;
      const k=Math.min(1,t/fallTime);
      const y=startY*(1-k)+0.3*k;
      core.position.y=y;glow.position.y=y;
      trailTimer-=dt;
      if(trailTimer<=0){
        emitParticles(core.position.x,y,core.position.z,0xff8800,1,30);
        spawnSmoke(core.position.x,y,core.position.z,0xff7a20,1,0.5,{additive:true,rise:0.2,spread:0.3,life:0.45,grow:1.2,alpha:0.8});
        spawnSmoke(core.position.x,y+0.2,core.position.z,0x3a3028,1,0.6,{rise:0.4,spread:0.3,life:1.0,grow:2,alpha:0.4});
        trailTimer=0.02;
      }
      if(!exploded&&k>=1){
        exploded=true;
        // damage
        const tx=core.position.x,tz=core.position.z;
        for(const e of enemies){
          if(!e.alive||e.owner!==enemyTeam)continue;
          const ep=pixelToWorld(e.x,e.y);
          const dd=Math.hypot(ep.x-tx,ep.z-tz);
          if(dd<=impactRadius)dealDamage(e,dmg);
        }
        emitParticles(tx,0.3,tz,0xff8800,20,130);
        emitParticles(tx,0.5,tz,0xff3300,15,90);
        emitParticles(tx,0.3,tz,0xffee66,10,60);
        emitParticles(tx,0.2,tz,0x444444,10,70);
        // v3.27: heavier impact — flash, shockwave, smoke, scorch.
        spawnImpactFlash(tx,0.4,tz,0xff6622,Math.min(0.9,impactRadius*0.3));
        spawnAuraPulse(tx,tz,impactRadius,0xff7733,0.5);
        spawnSmoke(tx,0.4,tz,0x4a4038,5,impactRadius*0.45,{rise:0.8,life:1.4});
        spawnScorch(tx,tz,Math.max(0.6,impactRadius*0.6));
        if(typeof screenShake!=='undefined')screenShake=Math.max(screenShake,0.18);
        sndHit&&sndHit();
        core.visible=false;glow.visible=false;
        return false;
      }
      return true;
    },
    dispose(){scene.remove(core);scene.remove(glow);core.geometry.dispose();core.material.dispose();glow.geometry.dispose();glow.material.dispose()}
  });
}

// Jagged lightning bolt from sky to a world point.
function spawnLightningBolt(wx,wz){
  const topY=14;const segs=9;
  const pts=[];
  for(let i=0;i<=segs;i++){
    const k=i/segs;
    const y=topY*(1-k)+0.3*k;
    const jx=(Math.random()-0.5)*0.7*(1-Math.abs(k-0.5));
    const jz=(Math.random()-0.5)*0.7*(1-Math.abs(k-0.5));
    pts.push(new THREE.Vector3(wx+jx,y,wz+jz));
  }
  const geo=new THREE.BufferGeometry().setFromPoints(pts);
  const mat=new THREE.LineBasicMaterial({color:0xaaddff,transparent:true,opacity:1,linewidth:3});
  const line=new THREE.Line(geo,mat);scene.add(line);
  // wider faint outer glow
  const mat2=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.9});
  const line2=new THREE.Line(geo.clone(),mat2);scene.add(line2);
  emitParticles(wx,0.3,wz,0xaaddff,12,80);
  emitParticles(wx,0.6,wz,0xffffff,6,50);
  // v3.27: a bright flash so the strike lights up the battlefield,
  // plus a forked side branch so the bolt isn't a single thin line.
  const flash=flashLight(wx,2.5,wz,0xbbddff,8,9,0.35).l;
  const bp=[];const bi=3+Math.floor(Math.random()*3);
  bp.push(pts[bi].clone());
  const bdx=(Math.random()-0.5)*2.2,bdz=(Math.random()-0.5)*2.2;
  for(let i=1;i<=4;i++){const k=i/4;bp.push(new THREE.Vector3(pts[bi].x+bdx*k+(Math.random()-0.5)*0.3,pts[bi].y-k*3.5,pts[bi].z+bdz*k+(Math.random()-0.5)*0.3))}
  const bgeo=new THREE.BufferGeometry().setFromPoints(bp);
  const branch=new THREE.Line(bgeo,mat);scene.add(branch);
  spawnAuraPulse(wx,wz,1.2,0x99ccff,0.35);
  let age=0,life=0.35;
  addVfx({
    update(dt){
      age+=dt;
      const k=age/life;
      if(k>=1)return false;
      mat.opacity=1-k;mat2.opacity=0.9*(1-k);
      // flicker the flash like a real strike
      if(k<0.3&&Math.random()<0.4)flash.intensity*=0.3;
      return true;
    },
    dispose(){scene.remove(line);scene.remove(line2);scene.remove(branch);geo.dispose();bgeo.dispose();line2.geometry.dispose();mat.dispose();mat2.dispose()}
  });
}

// Rising green aura + red '+' sprites at a castle position.
function spawnHealAura(wx,wz){
  const aura=new THREE.Mesh(
    new THREE.CylinderGeometry(0.9,0.9,3.0,20,1,true),
    new THREE.MeshBasicMaterial({color:0x66ff88,transparent:true,opacity:0.55,side:THREE.DoubleSide,depthWrite:false})
  );
  aura.position.set(wx,0.2,wz);scene.add(aura);
  const inner=new THREE.Mesh(
    new THREE.CylinderGeometry(0.4,0.4,3.0,16,1,true),
    new THREE.MeshBasicMaterial({color:0xaaffbb,transparent:true,opacity:0.8,side:THREE.DoubleSide,depthWrite:false})
  );
  inner.position.set(wx,0.2,wz);scene.add(inner);
  // ground ring
  const ring=new THREE.Mesh(
    new THREE.RingGeometry(0.4,1.0,24),
    new THREE.MeshBasicMaterial({color:0x00ff66,transparent:true,opacity:0.8,side:THREE.DoubleSide,depthWrite:false})
  );
  ring.rotation.x=-Math.PI/2;ring.position.set(wx,0.04,wz);scene.add(ring);
  emitParticles(wx,0.3,wz,0x00ff66,25,70);
  emitParticles(wx,0.6,wz,0x88ffaa,15,50);
  // Red '+' sprites
  const plusSprites=[];
  function makePlusTexture(){
    const c=document.createElement('canvas');c.width=64;c.height=64;
    const ctx=c.getContext('2d');
    ctx.strokeStyle='#000';ctx.lineWidth=8;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(32,10);ctx.lineTo(32,54);ctx.moveTo(10,32);ctx.lineTo(54,32);ctx.stroke();
    ctx.strokeStyle='#ff2233';ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(32,10);ctx.lineTo(32,54);ctx.moveTo(10,32);ctx.lineTo(54,32);ctx.stroke();
    return new THREE.CanvasTexture(c);
  }
  const plusTex=makePlusTexture();
  for(let i=0;i<8;i++){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:plusTex,transparent:true,depthTest:false}));
    const ang=Math.random()*Math.PI*2;const rad=Math.random()*0.7;
    sp.position.set(wx+Math.cos(ang)*rad,0.5+Math.random()*0.5,wz+Math.sin(ang)*rad);
    const s=0.35+Math.random()*0.2;sp.scale.set(s,s,1);
    scene.add(sp);
    plusSprites.push({sp,vy:1.2+Math.random()*0.6,vx:(Math.random()-0.5)*0.3,delay:i*0.08,age:0});
  }
  let age=0,life=1.6;
  addVfx({
    update(dt){
      age+=dt;
      const k=age/life;
      if(k>=1)return false;
      // Aura grows then fades
      const grow=Math.min(1,age/0.25);
      const fade=Math.max(0,1-Math.max(0,(age-0.4)/1.2));
      aura.scale.set(grow,grow*(0.8+k*0.6),grow);
      inner.scale.set(grow,grow*(0.8+k*0.8),grow);
      aura.position.y=0.2+k*0.6;
      inner.position.y=0.2+k*0.8;
      aura.material.opacity=0.55*fade;
      inner.material.opacity=0.8*fade;
      const rs=1+k*1.8;ring.scale.set(rs,rs,1);
      ring.material.opacity=0.8*(1-k);
      // plus signs
      for(const p of plusSprites){
        if(p.delay>0){p.delay-=dt;continue}
        p.age+=dt;
        p.sp.position.y+=p.vy*dt;
        p.sp.position.x+=p.vx*dt;
        const pk=Math.min(1,p.age/1.1);
        p.sp.material.opacity=1-pk;
      }
      return true;
    },
    dispose(){
      scene.remove(aura);scene.remove(inner);scene.remove(ring);
      aura.geometry.dispose();aura.material.dispose();
      inner.geometry.dispose();inner.material.dispose();
      ring.geometry.dispose();ring.material.dispose();
      for(const p of plusSprites){scene.remove(p.sp);p.sp.material.dispose()}
      plusTex.dispose();
    }
  });
}

// ==================== SOFT SMOKE / DUST PUFFS ====================
// v3.27 look, v3.32 implementation: all puffs live in two THREE.Points
// clouds (normal + additive blending) with per-point colour, alpha,
// size and rotation — 2 draw calls instead of up to 140 sprites.
const SMOKE_MAX=420;
const smokePool=[];
let __smoke=null;
function __initSmoke(){
  const c=document.createElement('canvas');c.width=c.height=64;
  const ctx=c.getContext('2d');
  const g=ctx.createRadialGradient(32,32,2,32,32,31);
  g.addColorStop(0,'rgba(255,255,255,0.9)');g.addColorStop(0.45,'rgba(255,255,255,0.45)');g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  const tex=new THREE.CanvasTexture(c);
  const mk=(additive)=>{
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(SMOKE_MAX*3),3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(SMOKE_MAX*3),3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha',new THREE.BufferAttribute(new Float32Array(SMOKE_MAX),1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize',new THREE.BufferAttribute(new Float32Array(SMOKE_MAX),1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aRot',new THREE.BufferAttribute(new Float32Array(SMOKE_MAX),1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0,0);
    const mat=new THREE.ShaderMaterial({
      uniforms:{tMap:{value:tex},uScale:{value:600}},
      transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,vertexColors:true,
      vertexShader:`attribute float aAlpha,aSize,aRot;uniform float uScale;varying vec3 vC;varying float vA,vR;
        void main(){vC=color;vA=aAlpha;vR=aRot;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*uScale/max(0.1,-mv.z);}`,
      fragmentShader:`uniform sampler2D tMap;varying vec3 vC;varying float vA,vR;
        void main(){vec2 p=gl_PointCoord-0.5;float c=cos(vR),s=sin(vR);p=mat2(c,-s,s,c)*p+0.5;vec4 t=texture2D(tMap,p);gl_FragColor=vec4(vC,t.a*vA);if(gl_FragColor.a<0.004)discard;}`
    });
    const pts=new THREE.Points(geo,mat);pts.frustumCulled=false;pts.renderOrder=3;scene.add(pts);return pts;
  };
  __smoke={normal:mk(false),add:mk(true)};
  for(let i=0;i<SMOKE_MAX;i++)smokePool.push({active:false,add:false,x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,maxLife:1,size:1,grow:1,alpha:0.6,rot:0,col:new THREE.Color()});
}
// size = starting world size; rising + expanding + fading over ~1-2s.
function spawnSmoke(wx,wy,wz,color,count,size,opts){
  if(!__smoke)__initSmoke();
  opts=opts||{};
  let spawned=0;
  for(let i=0;i<smokePool.length&&spawned<count;i++){
    const p=smokePool[i];if(p.active)continue;
    p.active=true;p.add=!!opts.additive;
    p.x=wx+(Math.random()-0.5)*size*0.6;p.y=wy;p.z=wz+(Math.random()-0.5)*size*0.6;
    p.col.set(color);
    p.vx=(Math.random()-0.5)*(opts.spread??0.6);p.vz=(Math.random()-0.5)*(opts.spread??0.6);
    p.vy=(opts.rise??0.5)+Math.random()*0.4;
    p.maxLife=p.life=(opts.life??1.1)+Math.random()*0.6;
    p.size=size*(0.7+Math.random()*0.6);p.grow=opts.grow??1.8;p.alpha=opts.alpha??0.55;
    p.rot=Math.random()*Math.PI*2;
    spawned++;
  }
}
function updateSmoke(dt){
  if(!__smoke)return;
  // keep point size consistent with the camera's projection/resolution
  if(typeof renderer!=='undefined'&&typeof camera!=='undefined'){
    const h=renderer.domElement.height,sc=h/(2*Math.tan(camera.fov*Math.PI/360));
    __smoke.normal.material.uniforms.uScale.value=sc;__smoke.add.material.uniforms.uScale.value=sc;
  }
  const n={normal:0,add:0};
  for(const p of smokePool){
    if(!p.active)continue;
    p.life-=dt;
    if(p.life<=0){p.active=false;continue}
    const k=1-p.life/p.maxLife;
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vx*=0.98;p.vz*=0.98;
    const tgt=p.add?__smoke.add:__smoke.normal,key=p.add?'add':'normal',i=n[key]++;
    const A=tgt.geometry.attributes;
    A.position.array[i*3]=p.x;A.position.array[i*3+1]=p.y;A.position.array[i*3+2]=p.z;
    A.color.array[i*3]=p.col.r;A.color.array[i*3+1]=p.col.g;A.color.array[i*3+2]=p.col.b;
    A.aAlpha.array[i]=p.alpha*Math.min(1,k*6)*(1-k);
    A.aSize.array[i]=p.size*(1+k*p.grow);A.aRot.array[i]=p.rot;
  }
  for(const key of ['normal','add']){
    const g=__smoke[key].geometry;g.setDrawRange(0,n[key]);
    if(n[key])for(const a of ['position','color','aAlpha','aSize','aRot'])g.attributes[a].needsUpdate=true;
  }
}

// Expanding ground ring (lich aura, freeze wave, tower build/upgrade).
const __ringGeo=new THREE.RingGeometry(0.85,1,40);__ringGeo.rotateX(-Math.PI/2);
function spawnAuraPulse(wx,wz,radius,color,life,y){
  const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.7,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const ring=new THREE.Mesh(__ringGeo,mat);
  ring.position.set(wx,y??0.06,wz);ring.scale.setScalar(0.1);scene.add(ring);
  let t=0;const L=life||0.7;
  addVfx({
    update(dt){
      t+=dt;const k=t/L;if(k>=1)return false;
      const e=1-Math.pow(1-k,3);
      ring.scale.setScalar(Math.max(0.05,radius*e));
      mat.opacity=0.7*(1-k);
      return true;
    },
    dispose(){scene.remove(ring);mat.dispose()}
  });
}

// Scorch mark that fades out over a few seconds (meteor craters).
let __scorchTex=null;
function spawnScorch(wx,wz,radius){
  if(!__scorchTex){
    const c=document.createElement('canvas');c.width=c.height=64;
    const ctx=c.getContext('2d');
    const g=ctx.createRadialGradient(32,32,3,32,32,31);
    g.addColorStop(0,'rgba(20,12,8,0.85)');g.addColorStop(0.6,'rgba(35,22,14,0.45)');g.addColorStop(1,'rgba(40,30,20,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
    __scorchTex=new THREE.CanvasTexture(c);
  }
  const mat=new THREE.MeshBasicMaterial({map:__scorchTex,transparent:true,depthWrite:false,opacity:1});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(radius*2,radius*2),mat);
  m.rotation.x=-Math.PI/2;m.rotation.z=Math.random()*Math.PI;m.position.set(wx,0.03,wz);m.renderOrder=1;
  scene.add(m);
  let t=0;
  addVfx({
    update(dt){t+=dt;if(t>6)return false;if(t>4)mat.opacity=1-(t-4)/2;return true},
    dispose(){scene.remove(m);m.geometry.dispose();mat.dispose()}
  });
}


// ==================== v3.35: IMPACT / DEATH / SPELL FX ====================
// Visual-only helpers called at existing combat events. They never touch
// gameplay state. All use the pooled particles / smoke / rings above.
function fxTrail(type,x,y,z,tick){
  if(type==='proj_magic'){if(tick%2===0)spawnSmoke(x,y,z,0xb060ff,1,0.22,{additive:true,rise:0.05,spread:0.1,life:0.35,grow:0.4,alpha:0.85})}
  else if(type==='proj_cannonball'){
    spawnSmoke(x,y,z,0xff8a30,1,0.2,{additive:true,rise:0.05,spread:0.08,life:0.25,grow:0.6,alpha:0.9});
    if(tick%3===0)spawnSmoke(x,y,z,0x4a4440,1,0.25,{rise:0.3,spread:0.15,life:0.8,grow:1.8,alpha:0.45});
  }
  else if(type==='proj_boulder'){if(tick%3===0)spawnSmoke(x,y,z,0xb8a888,1,0.2,{rise:0.05,spread:0.15,life:0.5,grow:1.2,alpha:0.35})}
  else if(type==='proj_arrow'){if(tick%3===0)spawnSmoke(x,y,z,0xfff4d8,1,0.08,{additive:true,rise:0,spread:0.02,life:0.18,grow:0.2,alpha:0.5})}
}
function fxImpact(type,x,z,radius){
  const r=Math.max(0.4,radius||0.5);
  if(type==='proj_magic'){
    spawnAuraPulse(x,z,r,0xc070ff,0.45);
    spawnSmoke(x,0.35,z,0xb060ff,6,0.35,{additive:true,rise:0.4,spread:1.4,life:0.5,grow:1,alpha:0.8});
    emitParticles(x,0.4,z,0xe0b0ff,14,90);
  }else if(type==='proj_boulder'){
    spawnAuraPulse(x,z,r*0.9,0xd8c8a0,0.4);
    spawnSmoke(x,0.15,z,0xb8a888,8,0.45,{rise:0.25,spread:2.2,life:1.1,grow:1.6,alpha:0.5});
    emitParticles(x,0.25,z,0x8a7a62,16,110);
    spawnScorch(x,z,0.45);
    if(typeof screenShake!=='undefined')screenShake=Math.max(screenShake,0.05);
  }else if(type==='proj_cannonball'){
    spawnAuraPulse(x,z,r*1.1,0xff9040,0.4);
    spawnSmoke(x,0.3,z,0xff7a20,7,0.4,{additive:true,rise:0.5,spread:1.6,life:0.45,grow:1.4,alpha:0.9});
    spawnSmoke(x,0.4,z,0x3e3834,6,0.5,{rise:0.8,spread:1.0,life:1.4,grow:2.2,alpha:0.5});
    spawnScorch(x,z,0.55);
    if(typeof screenShake!=='undefined')screenShake=Math.max(screenShake,0.08);
  }else{ // arrow / single-target hit
    spawnSmoke(x,0.45,z,0xfff0c0,2,0.14,{additive:true,rise:0.1,spread:0.6,life:0.2,grow:0.6,alpha:0.8});
  }
}
// Unit death: dust puff + a team-coloured wisp rising; bosses get a finale.
function fxDeath(x,z,owner,boss){
  const team=owner===1?0x6a9aff:0xff6a82;
  spawnSmoke(x,0.2,z,0xb8a888,boss?10:3,boss?0.9:0.35,{rise:0.3,spread:boss?2.4:0.9,life:boss?1.6:0.9,alpha:0.45});
  spawnSmoke(x,0.5,z,team,boss?6:1,boss?0.6:0.22,{additive:true,rise:boss?1.2:0.9,spread:0.2,life:boss?1.4:0.9,grow:0.6,alpha:0.75});
  if(boss){
    spawnAuraPulse(x,z,3,team,0.8);spawnAuraPulse(x,z,1.8,0xffffff,0.5);
    spawnImpactFlash(x,1.2,z,team,0.9);spawnScorch(x,z,1.4);
    emitParticles(x,1.0,z,0xffd27a,40,180);
    if(typeof screenShake!=='undefined')screenShake=Math.max(screenShake,0.45);
  }
}
// Freeze: ring of ice spikes that erupt from the ground, then melt away.
const __iceGeo=new THREE.ConeGeometry(0.09,0.5,5);__iceGeo.translate(0,0.25,0);
function fxIceSpikes(x,z,radius){
  const mat=new THREE.MeshStandardMaterial({color:0xbfe8ff,emissive:0x3a8acc,emissiveIntensity:0.8,roughness:0.15,metalness:0.1,transparent:true,opacity:0.92,flatShading:true});
  const n=Math.round(10+radius*5),spikes=new THREE.InstancedMesh(__iceGeo,mat,n);spikes.frustumCulled=false;scene.add(spikes);
  const d=new THREE.Object3D(),data=[];
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*radius;data.push({x:x+Math.cos(a)*r,z:z+Math.sin(a)*r,s:0.6+Math.random()*1.2,tx:(Math.random()-0.5)*0.6,tz:(Math.random()-0.5)*0.6,delay:r/radius*0.25})}
  let t=0;const L=1.6;
  addVfx({update(dt){t+=dt;if(t>L)return false;
    for(let i=0;i<n;i++){const q=data[i],k=Math.max(0,t-q.delay);const grow=Math.min(1,k/0.15),melt=t>L-0.5?(L-t)/0.5:1;
      d.position.set(q.x,0,q.z);d.rotation.set(q.tx,0,q.tz);d.scale.set(q.s*grow,q.s*grow*melt,q.s*grow);d.updateMatrix();spikes.setMatrixAt(i,d.matrix)}
    spikes.instanceMatrix.needsUpdate=true;mat.opacity=0.92*Math.min(1,(L-t)/0.4);return true},
    dispose(){scene.remove(spikes);mat.dispose();spikes.dispose&&spikes.dispose()}});
}

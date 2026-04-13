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
const particlePool=[];const PARTICLE_GEO=new THREE.BoxGeometry(0.03,0.03,0.03);
function initParticles(){
  for(let i=0;i<300;i++){
    const m=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x000000,emissiveIntensity:0.3,transparent:true,flatShading:true});
    const mesh=new THREE.Mesh(PARTICLE_GEO,m);mesh.visible=false;scene.add(mesh);
    particlePool.push({mesh,active:false,vx:0,vy:0,vz:0,life:0,maxLife:0});
  }
}
// Short-lived flash sphere for muzzle/impact flashes.
// Uses an emissive sphere + point light that fades over ~0.3s.
function spawnMuzzleFlash(wx,wy,wz,color,size){
  const mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:3.0,transparent:true,opacity:1,depthWrite:false});
  const core=new THREE.Mesh(new THREE.SphereGeometry(size||0.25,12,10),mat);
  core.position.set(wx,wy,wz);scene.add(core);
  const light=new THREE.PointLight(color,3.5,(size||0.25)*10,1.5);
  light.position.set(wx,wy,wz);scene.add(light);
  let t=0;
  addVfx({
    update(dt){
      t+=dt;
      const k=t/0.28;
      if(k>=1){return false}
      core.scale.setScalar(1+k*1.8);
      mat.opacity=1-k;
      mat.emissiveIntensity=3.0*(1-k);
      light.intensity=3.5*(1-k);
      return true;
    },
    dispose(){
      scene.remove(core);scene.remove(light);
      core.geometry.dispose();mat.dispose();
    }
  });
}
function spawnImpactFlash(wx,wy,wz,color,size){
  // Bigger, slower flash for projectile impacts. Two overlapping spheres.
  const outerMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.55,depthWrite:false});
  const outer=new THREE.Mesh(new THREE.SphereGeometry(size||0.4,14,12),outerMat);
  outer.position.set(wx,wy,wz);scene.add(outer);
  const coreMat=new THREE.MeshStandardMaterial({color:0xffffff,emissive:color,emissiveIntensity:4.0,transparent:true,opacity:1,depthWrite:false});
  const core=new THREE.Mesh(new THREE.SphereGeometry((size||0.4)*0.5,14,12),coreMat);
  core.position.set(wx,wy,wz);scene.add(core);
  const light=new THREE.PointLight(color,5.0,(size||0.4)*14,1.5);
  light.position.set(wx,wy,wz);scene.add(light);
  // Expanding shockwave ring
  const ringMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.7,side:THREE.DoubleSide,depthWrite:false});
  const ring=new THREE.Mesh(new THREE.RingGeometry((size||0.4)*0.3,(size||0.4)*0.5,24),ringMat);
  ring.rotation.x=-Math.PI/2;ring.position.set(wx,wy-0.05,wz);scene.add(ring);
  let t=0;
  addVfx({
    update(dt){
      t+=dt;
      const k=t/0.45;
      if(k>=1){return false}
      const expand=1+k*2.5;
      outer.scale.setScalar(expand);
      core.scale.setScalar(1+k*1.2);
      outerMat.opacity=0.55*(1-k);
      coreMat.opacity=1-k;
      coreMat.emissiveIntensity=4.0*(1-k*0.8);
      light.intensity=5.0*(1-k);
      ring.scale.setScalar(1+k*4);
      ringMat.opacity=0.7*(1-k);
      return true;
    },
    dispose(){
      scene.remove(outer);scene.remove(core);scene.remove(light);scene.remove(ring);
      outer.geometry.dispose();core.geometry.dispose();ring.geometry.dispose();
      outerMat.dispose();coreMat.dispose();ringMat.dispose();
    }
  });
}
function emitParticles(wx,wy,wz,color,count,spread){
  let spawned=0;
  for(let i=0;i<particlePool.length&&spawned<count;i++){
    const p=particlePool[i];if(p.active)continue;
    p.active=true;p.mesh.visible=true;p.mesh.position.set(wx,wy,wz);
    p.mesh.material.color.set(color);p.mesh.material.emissive.set(color);p.mesh.material.opacity=1;
    const sp=spread/T;
    p.vx=(Math.random()-0.5)*sp*2;p.vy=Math.random()*sp*2+sp*0.5;p.vz=(Math.random()-0.5)*sp*2;
    p.maxLife=0.4+Math.random()*0.6;p.life=p.maxLife;
    const s=0.5+Math.random();p.mesh.scale.set(s,s,s);spawned++;
  }
}
function updateParticles(dt){
  for(const p of particlePool){
    if(!p.active)continue;p.life-=dt;
    if(p.life<=0){p.active=false;p.mesh.visible=false;continue}
    p.vy-=3.0*dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=p.vz*dt;
    p.mesh.material.opacity=p.life/p.maxLife;
    const s=p.life/p.maxLife;p.mesh.scale.set(s,s,s);
  }
}

// ==================== DAMAGE NUMBERS ====================
const dmgNumbers=[];
function spawnDmgNumber(wx,wy,wz,text,color){
  const c=document.createElement('canvas');c.width=128;c.height=64;
  const ctx=c.getContext('2d');ctx.font='bold 40px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.strokeStyle='#000';ctx.lineWidth=4;ctx.strokeText(text,64,32);
  const col=new THREE.Color(color);
  ctx.fillStyle=`rgb(${Math.floor(col.r*255)},${Math.floor(col.g*255)},${Math.floor(col.b*255)})`;
  ctx.fillText(text,64,32);
  const tex=new THREE.CanvasTexture(c);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  sprite.position.set(wx,wy,wz);sprite.scale.set(0.5,0.25,1);scene.add(sprite);
  dmgNumbers.push({sprite,tex,age:0,driftX:(Math.random()-0.5)*0.3});
}
function updateDmgNumbers(dt){
  for(let i=dmgNumbers.length-1;i>=0;i--){
    const d=dmgNumbers[i];d.age+=dt;d.sprite.position.y+=0.8*dt;d.sprite.position.x+=d.driftX*dt;
    const t=d.age/1.0;if(t>0.4)d.sprite.material.opacity=Math.max(0,1-(t-0.4)/0.6);
    if(d.age>=1.0){scene.remove(d.sprite);d.sprite.material.dispose();d.tex.dispose();dmgNumbers.splice(i,1)}
  }
}

// ==================== SPECIAL VFX ====================
const vfx=[];
function addVfx(obj){vfx.push(obj)}
function updateVfx(dt){
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
        emitParticles(core.position.x,y,core.position.z,0xff8800,2,30);
        emitParticles(core.position.x,y,core.position.z,0xff3300,1,20);
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
  let age=0,life=0.35;
  addVfx({
    update(dt){
      age+=dt;
      const k=age/life;
      if(k>=1)return false;
      mat.opacity=1-k;mat2.opacity=0.9*(1-k);
      return true;
    },
    dispose(){scene.remove(line);scene.remove(line2);geo.dispose();line2.geometry.dispose();mat.dispose();mat2.dispose()}
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

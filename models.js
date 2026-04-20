// Castle Siege — shared 3D model builders.
// Loaded by index_3d.html (game) and guide.html (field guide) so the two
// stay in sync. Previously duplicated as inline code in both files, which
// led to drift (v3.2 detail pass landed in the game but not the guide).
//
// Exposes on window: mkMat, mkMesh, ownerAccent, createCastle, createTower,
// createWall, createBarricade, createEnemyModel.
//
// Requires THREE to be loaded first (both callers load three.min.js above).

function mkMat(color,opts={}){return new THREE.MeshStandardMaterial({color,flatShading:true,...opts})}
function mkMesh(geo,mat){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;return m}
function ownerAccent(o){return o===1?0x3366cc:0xcc3333}

// ==================== CASTLE MODEL ====================
function createCastle(owner){
  const g=new THREE.Group();
  const stone=mkMat(0x8a8a7a),stoneLight=mkMat(0x9a9a8a),dark=mkMat(0x6a6a5a),vdark=mkMat(0x5a5a4a);
  const accent=mkMat(ownerAccent(owner));
  const accentDark=mkMat(owner===1?0x224488:0x882222);
  const winMat=mkMat(0xFFDD44,{emissive:0xFFDD44,emissiveIntensity:0.8});
  const roofMat=mkMat(0x6B3A1B);
  const CW=2,CD=8,wallH=1.6,wallT=0.22;

  // Walls - thicker with stone block pattern
  const wallPositions=[
    {w:CW,d:wallT, x:CW/2, z:0},          // front
    {w:CW,d:wallT, x:CW/2, z:CD},          // back
    {w:wallT,d:CD, x:0, z:CD/2},            // left
    {w:wallT,d:CD, x:CW, z:CD/2}            // right
  ];
  wallPositions.forEach(wp=>{
    // Main wall body
    g.add(mkMesh(new THREE.BoxGeometry(wp.w,wallH,wp.d),stone).translateX(wp.x).translateY(wallH/2).translateZ(wp.z));
    // Wall cap ledge
    g.add(mkMesh(new THREE.BoxGeometry(wp.w+0.08,0.06,wp.d+0.08),dark).translateX(wp.x).translateY(wallH).translateZ(wp.z));
  });

  // Crenellations on front and back walls
  const merlonW=0.18,merlonH=0.22,merlonD=0.12;
  for(let i=0;i<6;i++){
    const mx=0.2+i*(CW-0.4)/5;
    // front wall crenellations
    g.add(mkMesh(new THREE.BoxGeometry(merlonW,merlonH,merlonD),dark).translateX(mx).translateY(wallH+merlonH/2).translateZ(0));
    // back wall crenellations
    g.add(mkMesh(new THREE.BoxGeometry(merlonW,merlonH,merlonD),dark).translateX(mx).translateY(wallH+merlonH/2).translateZ(CD));
  }
  // Crenellations on side walls
  for(let i=0;i<18;i++){
    const mz=0.3+i*(CD-0.6)/17;
    g.add(mkMesh(new THREE.BoxGeometry(merlonD,merlonH,merlonW),dark).translateX(0).translateY(wallH+merlonH/2).translateZ(mz));
    g.add(mkMesh(new THREE.BoxGeometry(merlonD,merlonH,merlonW),dark).translateX(CW).translateY(wallH+merlonH/2).translateZ(mz));
  }

  // Accent banner strips on outer walls (team color)
  g.add(mkMesh(new THREE.BoxGeometry(CW-0.4,0.2,0.02),accent).translateX(CW/2).translateY(wallH*0.65).translateZ(-0.01));
  g.add(mkMesh(new THREE.BoxGeometry(CW-0.4,0.2,0.02),accent).translateX(CW/2).translateY(wallH*0.65).translateZ(CD+0.01));

  // Corner towers - taller, with crenellations
  const towerR=0.3,towerH=2.4;
  [[0,0],[CW,0],[0,CD],[CW,CD]].forEach(([cx,cz])=>{
    // Tower base (wider)
    g.add(mkMesh(new THREE.CylinderGeometry(towerR+0.05,towerR+0.1,0.3,8),vdark).translateX(cx).translateY(0.15).translateZ(cz));
    // Tower shaft
    g.add(mkMesh(new THREE.CylinderGeometry(towerR,towerR+0.02,towerH,8),dark).translateX(cx).translateY(towerH/2).translateZ(cz));
    // Tower top ledge
    g.add(mkMesh(new THREE.CylinderGeometry(towerR+0.08,towerR+0.04,0.08,8),vdark).translateX(cx).translateY(towerH+0.04).translateZ(cz));
    // Cone roof
    g.add(mkMesh(new THREE.ConeGeometry(towerR+0.06,0.55,8),roofMat).translateX(cx).translateY(towerH+0.35).translateZ(cz));
    // Tower crenellations (4 merlons around rim)
    for(let a=0;a<4;a++){
      const ang=a*Math.PI/2+Math.PI/4;
      const mr=towerR+0.02;
      g.add(mkMesh(new THREE.BoxGeometry(0.1,0.15,0.1),vdark)
        .translateX(cx+Math.cos(ang)*mr).translateY(towerH+0.12).translateZ(cz+Math.sin(ang)*mr));
    }
    // Window slit on each tower
    g.add(mkMesh(new THREE.BoxGeometry(0.04,0.14,0.04),winMat).translateX(cx).translateY(towerH*0.5).translateZ(cz+(cz<CD/2?-1:1)*(towerR+0.01)));
    // Team color ring
    g.add(mkMesh(new THREE.CylinderGeometry(towerR+0.04,towerR+0.04,0.1,8),accent).translateX(cx).translateY(towerH*0.75).translateZ(cz));
  });

  // "facing" selects which X side is "front" — the wall that faces the opponent.
  // owner 1 sits at the west end, so its front is +X (east); owner 2's front is -X (west).
  const facing = owner===1 ? 1 : -1;

  // Keep - rotated 90° vs the old layout so its long axis runs along X.
  // Width (keepW) is now along X so the front/back faces are wide enough for windows.
  const keepH=3.0,keepW=1.5,keepD=1.1;
  g.add(mkMesh(new THREE.BoxGeometry(keepW,keepH,keepD),stoneLight).translateX(CW/2).translateY(keepH/2).translateZ(CD/2));
  // Keep stone detail bands
  g.add(mkMesh(new THREE.BoxGeometry(keepW+0.04,0.06,keepD+0.04),dark).translateX(CW/2).translateY(keepH*0.33).translateZ(CD/2));
  g.add(mkMesh(new THREE.BoxGeometry(keepW+0.04,0.06,keepD+0.04),dark).translateX(CW/2).translateY(keepH*0.66).translateZ(CD/2));
  // Keep top ledge
  g.add(mkMesh(new THREE.BoxGeometry(keepW+0.12,0.08,keepD+0.12),dark).translateX(CW/2).translateY(keepH+0.04).translateZ(CD/2));
  // Keep crenellations — front/back walls (run along X, length keepW): 5 merlons
  for(let i=0;i<5;i++){
    const kx=CW/2-keepW/2+0.15+i*(keepW-0.3)/4;
    g.add(mkMesh(new THREE.BoxGeometry(0.12,0.18,0.08),dark).translateX(kx).translateY(keepH+0.17).translateZ(CD/2-keepD/2));
    g.add(mkMesh(new THREE.BoxGeometry(0.12,0.18,0.08),dark).translateX(kx).translateY(keepH+0.17).translateZ(CD/2+keepD/2));
  }
  // Keep crenellations — side walls (run along Z, length keepD): 4 merlons
  for(let i=0;i<4;i++){
    const kz=CD/2-keepD/2+0.15+i*(keepD-0.3)/3;
    g.add(mkMesh(new THREE.BoxGeometry(0.08,0.18,0.12),dark).translateX(CW/2-keepW/2).translateY(keepH+0.17).translateZ(kz));
    g.add(mkMesh(new THREE.BoxGeometry(0.08,0.18,0.12),dark).translateX(CW/2+keepW/2).translateY(keepH+0.17).translateZ(kz));
  }
  // Keep roof - pitched
  g.add(mkMesh(new THREE.ConeGeometry(0.85,0.7,4),roofMat).translateX(CW/2).translateY(keepH+0.43).translateZ(CD/2).rotateY(Math.PI/4));

  // Keep windows - arched style (two rows), now on the ±X faces so they look toward the opponent
  const keepFaceX = CW/2 + facing*(keepW/2 + 0.01); // front face (toward opponent)
  const keepBackX = CW/2 - facing*(keepW/2 + 0.01); // back face (toward own baseline)
  [[-0.25,keepH*0.45],[0.25,keepH*0.45],[-0.25,keepH*0.72],[0.25,keepH*0.72]].forEach(([oz,wy])=>{
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.22,0.14),mkMat(0x3a3a3a)).translateX(keepFaceX).translateY(wy).translateZ(CD/2+oz));
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.18,0.10),winMat).translateX(keepFaceX+facing*0.01).translateY(wy).translateZ(CD/2+oz));
    g.add(mkMesh(new THREE.SphereGeometry(0.07,6,4,0,Math.PI*2,0,Math.PI/2),winMat).translateX(keepFaceX+facing*0.01).translateY(wy+0.09).translateZ(CD/2+oz));
  });
  // Back face (fewer windows)
  [[-0.25,keepH*0.45],[0.25,keepH*0.45]].forEach(([oz,wy])=>{
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.22,0.14),mkMat(0x3a3a3a)).translateX(keepBackX).translateY(wy).translateZ(CD/2+oz));
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.18,0.10),winMat).translateX(keepBackX-facing*0.01).translateY(wy).translateZ(CD/2+oz));
  });

  // Gate - on the short wall that faces the opponent (east for P1, west for P2)
  const gateWallX = facing>0 ? CW : 0;
  const gateX = gateWallX + facing*wallT/2;
  const gateZ = CD/2;
  // Gate archway frame (depth along X, opening along Z)
  g.add(mkMesh(new THREE.BoxGeometry(0.16,1.0,0.7),mkMat(0x2a2a2a)).translateX(gateX).translateY(0.5).translateZ(gateZ));
  // Gate dark interior
  g.add(mkMesh(new THREE.BoxGeometry(0.08,0.85,0.55),mkMat(0x0a0a0a)).translateX(gateX+facing*0.04).translateY(0.425).translateZ(gateZ));
  // Portcullis bars (vertical) spread along Z
  for(let i=-2;i<=2;i++){
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.8,0.02),mkMat(0x444444,{metalness:0.5})).translateX(gateX+facing*0.06).translateY(0.4).translateZ(gateZ+i*0.12));
  }
  // Portcullis bars (horizontal) spanning the Z opening
  for(let j=0;j<3;j++){
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.02,0.5),mkMat(0x444444,{metalness:0.5})).translateX(gateX+facing*0.06).translateY(0.2+j*0.25).translateZ(gateZ));
  }
  // Arch top
  g.add(mkMesh(new THREE.SphereGeometry(0.28,8,4,0,Math.PI*2,0,Math.PI/2),mkMat(0x2a2a2a)).translateX(gateX).translateY(0.95).translateZ(gateZ).rotateX(Math.PI));
  // Team color shield above gate
  g.add(mkMesh(new THREE.BoxGeometry(0.04,0.25,0.25),accent).translateX(gateX+facing*0.05).translateY(1.2).translateZ(gateZ));

  // Flags - larger and on multiple towers
  const flagMat=mkMat(owner===1?0x2244AA:0xAA2222);
  const flagPole=mkMat(0x5a3a1a);
  // Main flag on keep
  g.add(mkMesh(new THREE.CylinderGeometry(0.02,0.02,1.0,4),flagPole).translateX(CW/2).translateY(keepH+0.78+0.5).translateZ(CD/2));
  g.add(mkMesh(new THREE.BoxGeometry(0.45,0.28,0.015),flagMat).translateX(CW/2+0.23).translateY(keepH+0.78+0.86).translateZ(CD/2));
  // Smaller flags on two corner towers
  [[0,0],[CW,CD]].forEach(([cx,cz])=>{
    g.add(mkMesh(new THREE.CylinderGeometry(0.015,0.015,0.5,4),flagPole).translateX(cx).translateY(towerH+0.62+0.25).translateZ(cz));
    g.add(mkMesh(new THREE.BoxGeometry(0.3,0.18,0.012),flagMat).translateX(cx+0.15).translateY(towerH+0.62+0.42).translateZ(cz));
  });

  // ============ v3.8 CASTLE DETAIL PASS ============
  // Shared materials (canonicalization will dedupe any duplicates).
  const ivy=mkMat(0x2d5a2a,{roughness:0.9});
  const ivyDark=mkMat(0x1e4a1e,{roughness:0.9});
  const moss=mkMat(0x3a6a2a,{roughness:0.95});
  const iron=mkMat(0x2a2a2a,{metalness:0.55,roughness:0.35});
  const ironLight=mkMat(0x666677,{metalness:0.6,roughness:0.35});
  const gold=mkMat(0xd4b04a,{metalness:0.8,roughness:0.3});
  const torchWood=mkMat(0x3a2208);
  const torchFire=mkMat(0xff6622,{emissive:0xff3300,emissiveIntensity:2.4,transparent:true,opacity:0.9});
  const torchGlow=mkMat(0xffcc44,{emissive:0xff8822,emissiveIntensity:2.0,transparent:true,opacity:0.85});
  const stainRed=mkMat(0xcc2a1a,{emissive:0x661a0a,emissiveIntensity:0.6,transparent:true,opacity:0.85});
  const stainBlue=mkMat(0x2a4acc,{emissive:0x0a1a66,emissiveIntensity:0.6,transparent:true,opacity:0.85});
  const stainGold=mkMat(0xffcc44,{emissive:0xaa7722,emissiveIntensity:0.7,transparent:true,opacity:0.85});
  const leadLine=mkMat(0x222233,{metalness:0.3});
  const scorch=mkMat(0x1a1510);
  const crewSkin=mkMat(0xc4956a);
  const crewHelm=mkMat(0x44445a,{metalness:0.6,roughness:0.35});
  const banner=mkMat(owner===1?0x1a3d7a:0x7a1a3d,{roughness:0.7});

  // ---- Defender archer silhouettes patrolling the front wall ----
  for(let i=0;i<4;i++){
    const ax=0.25+i*(CW-0.5)/3;
    // Only visible behind front wall (the one facing the enemy)
    const az= (facing>0 ? -0.04 : CD+0.04);
    // Torso (cuirass)
    g.add(mkMesh(new THREE.BoxGeometry(0.12,0.16,0.08),crewHelm).translateX(ax).translateY(wallH+0.22).translateZ(az));
    // Helmet
    g.add(mkMesh(new THREE.SphereGeometry(0.05,6,5),iron).translateX(ax).translateY(wallH+0.34).translateZ(az));
    // Helmet crest (team color)
    g.add(mkMesh(new THREE.BoxGeometry(0.005,0.03,0.06),accent).translateX(ax).translateY(wallH+0.38).translateZ(az));
    // Bow or spear in hand (every other one)
    if(i%2===0){
      g.add(mkMesh(new THREE.CylinderGeometry(0.006,0.006,0.28,4),mkMat(0x5a3a1a))
        .translateX(ax+facing*0.06).translateY(wallH+0.32).translateZ(az).rotateZ(0.3));
    }else{
      // Bow (torus segment)
      g.add(mkMesh(new THREE.TorusGeometry(0.06,0.006,4,8,Math.PI),mkMat(0x5a3a1a))
        .translateX(ax+facing*0.07).translateY(wallH+0.24).translateZ(az).rotateZ(Math.PI/2));
    }
  }
  // Two more defenders on side walls (long direction)
  [[0-0.03,CD*0.25],[0-0.03,CD*0.75],[CW+0.03,CD*0.25],[CW+0.03,CD*0.75]].forEach(([dx,dz])=>{
    g.add(mkMesh(new THREE.BoxGeometry(0.08,0.14,0.1),crewHelm).translateX(dx).translateY(wallH+0.21).translateZ(dz));
    g.add(mkMesh(new THREE.SphereGeometry(0.045,6,5),iron).translateX(dx).translateY(wallH+0.31).translateZ(dz));
  });

  // ---- Wall torches flanking the gate (brazier + flame) ----
  const gt1=gateZ-0.45, gt2=gateZ+0.45;
  const tgX= gateWallX + facing*0.05;
  [gt1,gt2].forEach(tz=>{
    // Iron bracket
    g.add(mkMesh(new THREE.BoxGeometry(0.03,0.04,0.04),iron).translateX(tgX).translateY(1.1).translateZ(tz));
    // Wooden handle
    g.add(mkMesh(new THREE.CylinderGeometry(0.014,0.016,0.16,5),torchWood).translateX(tgX+facing*0.02).translateY(1.2).translateZ(tz));
    // Iron brazier bowl
    g.add(mkMesh(new THREE.CylinderGeometry(0.05,0.035,0.05,8),iron).translateX(tgX+facing*0.04).translateY(1.3).translateZ(tz));
    // Fire core
    g.add(mkMesh(new THREE.SphereGeometry(0.045,8,6),torchFire).translateX(tgX+facing*0.04).translateY(1.34).translateZ(tz));
    // Flame cone
    g.add(mkMesh(new THREE.ConeGeometry(0.04,0.12,6),torchGlow).translateX(tgX+facing*0.04).translateY(1.42).translateZ(tz));
    // Spark
    g.add(mkMesh(new THREE.SphereGeometry(0.02,6,5),mkMat(0xffffcc,{emissive:0xffee88,emissiveIntensity:2.8,transparent:true,opacity:0.95}))
      .translateX(tgX+facing*0.04).translateY(1.36).translateZ(tz));
  });

  // ---- Drawbridge chains (2 diagonal iron chains) ----
  [gt1+0.1,gt2-0.1].forEach(cz=>{
    // Upper attachment (arch top)
    g.add(mkMesh(new THREE.SphereGeometry(0.02,6,4),iron).translateX(gateX).translateY(1.0).translateZ(cz));
    // Chain links (6 per side)
    for(let li=0;li<6;li++){
      g.add(mkMesh(new THREE.TorusGeometry(0.012,0.003,3,8),ironLight)
        .translateX(gateX+facing*li*0.025).translateY(0.96-li*0.06).translateZ(cz).rotateX(li%2===0?0:Math.PI/2));
    }
  });

  // ---- Guard silhouettes flanking the gate ----
  [gt1-0.18,gt2+0.18].forEach(tz=>{
    // Body
    g.add(mkMesh(new THREE.CylinderGeometry(0.06,0.07,0.28,6),crewHelm).translateX(gateX-facing*0.15).translateY(0.14).translateZ(tz));
    // Head
    g.add(mkMesh(new THREE.SphereGeometry(0.055,6,5),crewSkin).translateX(gateX-facing*0.15).translateY(0.32).translateZ(tz));
    // Great helm
    g.add(mkMesh(new THREE.CylinderGeometry(0.06,0.055,0.08,7),iron).translateX(gateX-facing*0.15).translateY(0.34).translateZ(tz));
    // Crest plume (team)
    g.add(mkMesh(new THREE.BoxGeometry(0.006,0.04,0.08),accent).translateX(gateX-facing*0.15).translateY(0.4).translateZ(tz));
    // Spear (vertical)
    g.add(mkMesh(new THREE.CylinderGeometry(0.006,0.006,0.55,4),mkMat(0x5a3a1a))
      .translateX(gateX-facing*0.2).translateY(0.28).translateZ(tz));
    // Spear tip
    g.add(mkMesh(new THREE.ConeGeometry(0.012,0.04,4),ironLight)
      .translateX(gateX-facing*0.2).translateY(0.58).translateZ(tz));
    // Shield (rectangular, team color)
    g.add(mkMesh(new THREE.BoxGeometry(0.008,0.15,0.08),accent)
      .translateX(gateX-facing*0.08).translateY(0.18).translateZ(tz));
  });

  // ---- Stained glass rose window on front of keep ----
  const rwX=keepFaceX+facing*0.005;
  const rwY=keepH*0.82;
  const rwZ=CD/2;
  g.add(mkMesh(new THREE.CylinderGeometry(0.18,0.18,0.015,12),leadLine).translateX(rwX).translateY(rwY).translateZ(rwZ).rotateZ(Math.PI/2));
  // Rose window petals (alternating colors)
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    const pcol= i%3===0?stainRed : (i%3===1?stainBlue : stainGold);
    g.add(mkMesh(new THREE.BoxGeometry(0.01,0.14,0.04),pcol)
      .translateX(rwX+facing*0.005).translateY(rwY).translateZ(rwZ)
      .rotateX(a));
  }
  // Rose window center (bright gold)
  g.add(mkMesh(new THREE.SphereGeometry(0.025,8,6),stainGold).translateX(rwX+facing*0.008).translateY(rwY).translateZ(rwZ));
  // Window lead crosspieces
  g.add(mkMesh(new THREE.BoxGeometry(0.003,0.34,0.005),leadLine).translateX(rwX+facing*0.006).translateY(rwY).translateZ(rwZ));
  g.add(mkMesh(new THREE.BoxGeometry(0.003,0.005,0.34),leadLine).translateX(rwX+facing*0.006).translateY(rwY).translateZ(rwZ));

  // ---- Long team banners hanging from keep side walls ----
  [-1,1].forEach(s=>{
    const bx=CW/2+s*(keepW/2+0.005);
    const by=keepH*0.65;
    const bz=CD/2;
    // Banner cloth
    g.add(mkMesh(new THREE.BoxGeometry(0.015,0.8,0.35),banner).translateX(bx).translateY(by).translateZ(bz));
    // Banner fringe (bottom ragged)
    for(let f=-1;f<=1;f++){
      g.add(mkMesh(new THREE.BoxGeometry(0.018,0.08,0.08),banner).translateX(bx).translateY(by-0.44).translateZ(bz+f*0.12));
    }
    // Banner top rod
    g.add(mkMesh(new THREE.CylinderGeometry(0.01,0.01,0.38,5),gold).translateX(bx).translateY(by+0.42).translateZ(bz).rotateX(Math.PI/2));
    // Cross or chevron emblem
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.12,0.02),gold).translateX(bx+s*0.005).translateY(by).translateZ(bz));
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.02,0.12),gold).translateX(bx+s*0.005).translateY(by).translateZ(bz));
  });

  // ---- Keep roof ridge tiles + golden finial ----
  for(let rt=0;rt<4;rt++){
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.04,0.02),dark).translateX(CW/2).translateY(keepH+0.6+rt*0.04).translateZ(CD/2));
  }
  // Golden finial on keep roof
  g.add(mkMesh(new THREE.SphereGeometry(0.04,8,6),gold).translateX(CW/2).translateY(keepH+0.78).translateZ(CD/2));
  g.add(mkMesh(new THREE.ConeGeometry(0.025,0.08,6),gold).translateX(CW/2).translateY(keepH+0.86).translateZ(CD/2));

  // ---- Chimney with glowing ember smoke (on keep side) ----
  g.add(mkMesh(new THREE.BoxGeometry(0.12,0.25,0.12),stone).translateX(CW/2+keepW/2-0.15).translateY(keepH+0.5).translateZ(CD/2-keepD/2+0.2));
  g.add(mkMesh(new THREE.BoxGeometry(0.14,0.04,0.14),dark).translateX(CW/2+keepW/2-0.15).translateY(keepH+0.62).translateZ(CD/2-keepD/2+0.2));
  // Ember glow inside
  g.add(mkMesh(new THREE.SphereGeometry(0.035,6,4),torchFire).translateX(CW/2+keepW/2-0.15).translateY(keepH+0.6).translateZ(CD/2-keepD/2+0.2));
  // Static smoke plume (3 stacked translucent spheres)
  [0.18,0.32,0.48].forEach((h,i)=>{
    g.add(mkMesh(new THREE.SphereGeometry(0.08-i*0.015,6,4),
      mkMat(0x9a9a9a,{transparent:true,opacity:0.35-i*0.08}))
      .translateX(CW/2+keepW/2-0.15).translateY(keepH+0.7+h).translateZ(CD/2-keepD/2+0.2));
  });

  // ---- Ivy climbing on side walls (clusters of leaves) ----
  for(let iy=0.2;iy<wallH-0.2;iy+=0.25){
    // Left wall
    for(let ic=0;ic<2;ic++){
      g.add(mkMesh(new THREE.SphereGeometry(0.04,5,4),ic%2===0?ivy:ivyDark)
        .translateX(-0.02).translateY(iy).translateZ(CD*0.25+ic*CD*0.4+Math.sin(iy*7)*0.2));
    }
    // Right wall
    for(let ic=0;ic<2;ic++){
      g.add(mkMesh(new THREE.SphereGeometry(0.04,5,4),ic%2===0?ivy:ivyDark)
        .translateX(CW+0.02).translateY(iy).translateZ(CD*0.3+ic*CD*0.35+Math.cos(iy*7)*0.2));
    }
  }
  // Ivy trunks (vertical vines)
  [[-0.02,CD*0.3],[-0.02,CD*0.7],[CW+0.02,CD*0.35],[CW+0.02,CD*0.65]].forEach(p=>{
    g.add(mkMesh(new THREE.CylinderGeometry(0.008,0.008,wallH*0.8,4),ivyDark).translateX(p[0]).translateY(wallH*0.5).translateZ(p[1]));
  });

  // ---- Moss patches at base of walls ----
  for(let mi=0;mi<10;mi++){
    const mx=0.1+mi*(CW-0.2)/9;
    g.add(mkMesh(new THREE.SphereGeometry(0.03+Math.random()*0.02,5,4),moss)
      .translateX(mx).translateY(0.02).translateZ(-0.02));
    g.add(mkMesh(new THREE.SphereGeometry(0.03+Math.random()*0.02,5,4),moss)
      .translateX(mx).translateY(0.02).translateZ(CD+0.02));
  }

  // ---- Gargoyle drainspouts on corner tower tops ----
  [[0,0],[CW,0],[0,CD],[CW,CD]].forEach(([cx,cz])=>{
    // Small ugly head
    const spoutDx=(cx===0?-1:1);
    const spoutDz=(cz===0?-1:1);
    g.add(mkMesh(new THREE.SphereGeometry(0.05,6,5),vdark).translateX(cx+spoutDx*(towerR+0.02)).translateY(towerH+0.05).translateZ(cz+spoutDz*(towerR+0.02)));
    // Spout pipe
    g.add(mkMesh(new THREE.CylinderGeometry(0.012,0.02,0.07,5),vdark)
      .translateX(cx+spoutDx*(towerR+0.05)).translateY(towerH+0.02).translateZ(cz+spoutDz*(towerR+0.05))
      .rotateZ(spoutDx*0.7).rotateX(spoutDz*0.7));
  });

  // ---- Iron-banded tower doors at base of each corner tower ----
  [[0,0],[CW,0],[0,CD],[CW,CD]].forEach(([cx,cz])=>{
    const doorDz=(cz<CD/2?-1:1);
    g.add(mkMesh(new THREE.BoxGeometry(0.16,0.28,0.02),mkMat(0x4a2a0a,{roughness:0.85}))
      .translateX(cx).translateY(0.17).translateZ(cz+doorDz*(towerR+0.005)));
    // Iron bands
    g.add(mkMesh(new THREE.BoxGeometry(0.16,0.02,0.022),iron)
      .translateX(cx).translateY(0.25).translateZ(cz+doorDz*(towerR+0.006)));
    g.add(mkMesh(new THREE.BoxGeometry(0.16,0.02,0.022),iron)
      .translateX(cx).translateY(0.1).translateZ(cz+doorDz*(towerR+0.006)));
    // Door handle
    g.add(mkMesh(new THREE.SphereGeometry(0.012,5,4),ironLight)
      .translateX(cx+0.05).translateY(0.17).translateZ(cz+doorDz*(towerR+0.014)));
  });

  // ---- Team pennants on corner tower cone roofs ----
  [[0,0],[CW,0],[0,CD],[CW,CD]].forEach(([cx,cz])=>{
    // Tiny flag pole
    g.add(mkMesh(new THREE.CylinderGeometry(0.006,0.006,0.25,4),iron).translateX(cx).translateY(towerH+0.78).translateZ(cz));
    // Pennant (triangular-ish box)
    g.add(mkMesh(new THREE.BoxGeometry(0.14,0.06,0.01),accent).translateX(cx+0.075).translateY(towerH+0.9).translateZ(cz));
    // Finial ball
    g.add(mkMesh(new THREE.SphereGeometry(0.012,5,4),gold).translateX(cx).translateY(towerH+0.93).translateZ(cz));
  });

  // ---- Stone buttresses at corner tower bases ----
  [[0,0],[CW,0],[0,CD],[CW,CD]].forEach(([cx,cz])=>{
    const dx= cx<CW/2?-0.12:0.12;
    const dz= cz<CD/2?-0.12:0.12;
    g.add(mkMesh(new THREE.BoxGeometry(0.12,0.4,0.12),vdark)
      .translateX(cx+dx*0.5).translateY(0.2).translateZ(cz+dz*0.5));
  });

  // ---- Battle damage (dark scorch patches on outer front wall) ----
  [[0.35,0.8,-0.012],[1.3,0.6,-0.012],[0.7,1.2,-0.012],[1.5,0.9,-0.012]].forEach(p=>{
    g.add(mkMesh(new THREE.BoxGeometry(0.06,0.05,0.004),scorch).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
  });
  // And back wall
  [[0.4,0.7,CD+0.012],[1.2,0.5,CD+0.012],[0.9,1.0,CD+0.012]].forEach(p=>{
    g.add(mkMesh(new THREE.BoxGeometry(0.06,0.05,0.004),scorch).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
  });

  // ---- Arrow slits on front wall (between crenellations) ----
  for(let i=0;i<5;i++){
    const ax=0.35+i*(CW-0.7)/4;
    // Front wall
    g.add(mkMesh(new THREE.BoxGeometry(0.03,0.14,0.005),mkMat(0x111111)).translateX(ax).translateY(wallH*0.7).translateZ(-0.01));
    // Glow behind the slit (defender's torchlight)
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.08,0.003),mkMat(0xffaa44,{emissive:0xff8822,emissiveIntensity:1.0})).translateX(ax).translateY(wallH*0.7).translateZ(-0.015));
    // Back wall
    g.add(mkMesh(new THREE.BoxGeometry(0.03,0.14,0.005),mkMat(0x111111)).translateX(ax).translateY(wallH*0.7).translateZ(CD+0.01));
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.08,0.003),mkMat(0xffaa44,{emissive:0xff8822,emissiveIntensity:1.0})).translateX(ax).translateY(wallH*0.7).translateZ(CD+0.015));
  }

  // ---- Well in the courtyard ----
  const wellX=CW/2-facing*0.3;
  const wellZ=CD*0.25;
  g.add(mkMesh(new THREE.CylinderGeometry(0.15,0.18,0.12,10),stone).translateX(wellX).translateY(0.06).translateZ(wellZ));
  g.add(mkMesh(new THREE.CylinderGeometry(0.13,0.13,0.03,10),mkMat(0x0a1a2a)).translateX(wellX).translateY(0.13).translateZ(wellZ));
  // Well posts
  [-1,1].forEach(s=>{
    g.add(mkMesh(new THREE.BoxGeometry(0.025,0.3,0.025),torchWood).translateX(wellX+s*0.15).translateY(0.26).translateZ(wellZ));
  });
  // Well crossbeam
  g.add(mkMesh(new THREE.BoxGeometry(0.35,0.025,0.025),torchWood).translateX(wellX).translateY(0.4).translateZ(wellZ));
  // Bucket
  g.add(mkMesh(new THREE.CylinderGeometry(0.04,0.045,0.06,6),mkMat(0x4a2a0a)).translateX(wellX).translateY(0.22).translateZ(wellZ));
  g.add(mkMesh(new THREE.CylinderGeometry(0.002,0.002,0.16,3),iron).translateX(wellX).translateY(0.3).translateZ(wellZ));

  // ---- Supply crates stacked against a wall ----
  [[0.2,0.12,CD*0.15],[0.2,0.12,CD*0.15+0.15],[0.32,0.12,CD*0.15+0.07]].forEach(p=>{
    g.add(mkMesh(new THREE.BoxGeometry(0.12,0.12,0.12),mkMat(0x5a3a1a,{roughness:0.85})).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    // Crate slats (2 dark horizontal lines)
    g.add(mkMesh(new THREE.BoxGeometry(0.125,0.008,0.125),mkMat(0x3a2008)).translateX(p[0]).translateY(p[1]+0.025).translateZ(p[2]));
  });
  // Hay bale next to crates
  g.add(mkMesh(new THREE.CylinderGeometry(0.1,0.1,0.14,8),mkMat(0xd4b060,{roughness:0.95})).translateX(0.4).translateY(0.1).translateZ(CD*0.18).rotateZ(Math.PI/2));
  // Rope wrap on hay
  g.add(mkMesh(new THREE.TorusGeometry(0.1,0.005,3,10),mkMat(0x8a6030)).translateX(0.4).translateY(0.1).translateZ(CD*0.18));

  // ---- Small training dummy ----
  const tdX=CW/2+facing*0.4;
  const tdZ=CD*0.75;
  g.add(mkMesh(new THREE.CylinderGeometry(0.02,0.03,0.3,5),torchWood).translateX(tdX).translateY(0.15).translateZ(tdZ));
  g.add(mkMesh(new THREE.BoxGeometry(0.08,0.2,0.05),mkMat(0x8a7040,{roughness:0.9})).translateX(tdX).translateY(0.42).translateZ(tdZ));
  g.add(mkMesh(new THREE.SphereGeometry(0.045,6,5),mkMat(0xd4b060)).translateX(tdX).translateY(0.56).translateZ(tdZ));
  // Arrow stuck in dummy
  g.add(mkMesh(new THREE.CylinderGeometry(0.004,0.004,0.09,4),torchWood).translateX(tdX+0.04).translateY(0.44).translateZ(tdZ+0.02).rotateZ(Math.PI/2));

  // ---- Brazier in the courtyard near the keep ----
  const brX=CW/2-facing*0.35;
  const brZ=CD*0.55;
  g.add(mkMesh(new THREE.CylinderGeometry(0.1,0.08,0.1,8),iron).translateX(brX).translateY(0.3).translateZ(brZ));
  g.add(mkMesh(new THREE.CylinderGeometry(0.09,0.05,0.02,8),iron).translateX(brX).translateY(0.36).translateZ(brZ));
  // Tripod legs
  for(let lg=0;lg<3;lg++){
    const ang=lg*Math.PI*2/3;
    g.add(mkMesh(new THREE.CylinderGeometry(0.01,0.01,0.3,4),iron)
      .translateX(brX+Math.cos(ang)*0.08).translateY(0.16).translateZ(brZ+Math.sin(ang)*0.08)
      .rotateZ(Math.cos(ang)*0.2).rotateX(Math.sin(ang)*0.2));
  }
  // Brazier fire
  g.add(mkMesh(new THREE.SphereGeometry(0.08,8,6),torchFire).translateX(brX).translateY(0.4).translateZ(brZ));
  g.add(mkMesh(new THREE.ConeGeometry(0.07,0.2,8),torchGlow).translateX(brX).translateY(0.5).translateZ(brZ));
  g.add(mkMesh(new THREE.SphereGeometry(0.04,6,5),mkMat(0xffffcc,{emissive:0xffee88,emissiveIntensity:3.2,transparent:true,opacity:0.95})).translateX(brX).translateY(0.42).translateZ(brZ));

  // ---- Decorative stone crest above the gate ----
  g.add(mkMesh(new THREE.BoxGeometry(0.08,0.18,0.4),stoneLight).translateX(gateX).translateY(1.3).translateZ(gateZ));
  g.add(mkMesh(new THREE.BoxGeometry(0.1,0.04,0.42),dark).translateX(gateX).translateY(1.42).translateZ(gateZ));
  // Crest inscription lines
  [-0.1,-0.03,0.04,0.11].forEach(dz=>{
    g.add(mkMesh(new THREE.BoxGeometry(0.005,0.01,0.06),gold).translateX(gateX+facing*0.045).translateY(1.3).translateZ(gateZ+dz));
  });

  // ---- Rivets around the gate arch ----
  for(let ri=0;ri<9;ri++){
    const a=Math.PI*(ri/8);
    g.add(mkMesh(new THREE.SphereGeometry(0.01,4,3),ironLight)
      .translateX(gateX).translateY(0.5+Math.sin(a)*0.55).translateZ(gateZ+Math.cos(a)*0.42));
  }

  // Position group so center is at origin
  g.position.set(-CW/2,0,-CD/2);
  const wrapper=new THREE.Group();wrapper.add(g);
  return wrapper;
}

// ==================== TOWER MODELS ====================
function createTower(type,owner){
  const g=new THREE.Group();
  const accent=mkMat(ownerAccent(owner));
  const accentDark=mkMat(owner===1?0x224488:0x882222);
  // Base platform with team color
  g.add(mkMesh(new THREE.BoxGeometry(0.92,0.06,0.92),accent).translateY(0.03));
  g.add(mkMesh(new THREE.BoxGeometry(0.85,0.04,0.85),accentDark).translateY(0.08));

  if(type==='turret'){
    const stone=mkMat(0x8a8a7a),dark=mkMat(0x6a6a5a),vdark=mkMat(0x5a5a4a);
    const light=mkMat(0x9a9a8a);
    const tH=1.8; // Taller than before
    // Tower base - tapered
    g.add(mkMesh(new THREE.BoxGeometry(0.72,0.22,0.72),vdark).translateY(0.11));
    g.add(mkMesh(new THREE.BoxGeometry(0.65,0.18,0.65),dark).translateY(0.22));
    // Tower shaft (main)
    g.add(mkMesh(new THREE.BoxGeometry(0.55,tH,0.55),stone).translateY(0.3+tH/2));
    // Brighter highlight side (light from +x direction)
    g.add(mkMesh(new THREE.BoxGeometry(0.02,tH*0.9,0.5),light).translateX(0.28).translateY(0.3+tH/2));
    // Stone detail bands (more of them)
    [0.55,0.95,1.35,1.75].forEach(y=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.58,0.04,0.58),dark).translateY(y));
    });
    // Top platform ledge (machicolations)
    g.add(mkMesh(new THREE.BoxGeometry(0.78,0.08,0.78),dark).translateY(tH+0.34));
    g.add(mkMesh(new THREE.BoxGeometry(0.74,0.04,0.74),vdark).translateY(tH+0.42));
    // Crenellations - 8 merlons around top
    const mp=[[-.24,-.24],[0,-.24],[.24,-.24],[-.24,0],[.24,0],[-.24,.24],[0,.24],[.24,.24]];
    mp.forEach(([dx,dz])=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.11,0.18,0.11),vdark).translateX(dx).translateY(tH+0.55).translateZ(dz));
      // Merlon cap highlight
      g.add(mkMesh(new THREE.BoxGeometry(0.11,0.02,0.11),light).translateX(dx).translateY(tH+0.65).translateZ(dz));
    });
    // Conical inner roof over central keep
    g.add(mkMesh(new THREE.ConeGeometry(0.22,0.35,8),mkMat(0x5a3a1a)).translateY(tH+0.75));
    // Arrow slits on each face with warm glow
    [[ 0,0.28],[ 0,-0.28],[0.28,0],[-0.28,0]].forEach(([dx,dz])=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.035,0.28,0.035),mkMat(0x1a1a1a)).translateX(dx).translateY(1.0).translateZ(dz));
      g.add(mkMesh(new THREE.BoxGeometry(0.02,0.12,0.02),mkMat(0xffaa44,{emissive:0xff8822,emissiveIntensity:0.8})).translateX(dx).translateY(1.0).translateZ(dz));
    });
    // Wooden door at base
    g.add(mkMesh(new THREE.BoxGeometry(0.16,0.22,0.02),mkMat(0x4a2a0a)).translateY(0.42).translateZ(0.28));
    g.add(mkMesh(new THREE.BoxGeometry(0.14,0.20,0.02),mkMat(0x6a3a14)).translateY(0.42).translateZ(0.29));
    // Tall flag pole on top (central spire)
    g.add(mkMesh(new THREE.CylinderGeometry(0.015,0.015,0.6,6),mkMat(0x3a3a3a)).translateY(tH+1.0));
    // Gold finial ball
    g.add(mkMesh(new THREE.SphereGeometry(0.04,8,6),mkMat(0xffd700,{emissive:0xaa7700,emissiveIntensity:0.6})).translateY(tH+1.32));
    // Large team-colored flag flying from pole
    const flag=mkMesh(new THREE.BoxGeometry(0.26,0.16,0.02),accent);
    flag.position.set(0.14,tH+1.1,0);g.add(flag);
    g.add(mkMesh(new THREE.BoxGeometry(0.26,0.025,0.025),accentDark).translateX(0.14).translateY(tH+1.2));
    g.add(mkMesh(new THREE.BoxGeometry(0.26,0.025,0.025),accentDark).translateX(0.14).translateY(tH+1.0));

    // ============ v3.3 DETAIL PASS ============
    const ivy=mkMat(0x2d5a2a,{roughness:0.9});
    const scorch=mkMat(0x1a1510);
    const woodHoard=mkMat(0x5a3a1a,{roughness:0.85});
    const shieldMetal=mkMat(0x666677,{metalness:0.55,roughness:0.4});
    const torchWood=mkMat(0x3a2208);
    const torchFire=mkMat(0xff6622,{emissive:0xff3300,emissiveIntensity:2.2,transparent:true,opacity:0.9});
    const torchGlow=mkMat(0xffcc44,{emissive:0xff8822,emissiveIntensity:1.8,transparent:true,opacity:0.85});

    // Archer silhouettes behind merlons (shoulders + helmet peeking over)
    [[-.12,.24],[.12,.24],[0,-.24]].forEach(([ax,az])=>{
      // Torso block
      g.add(mkMesh(new THREE.BoxGeometry(0.1,0.14,0.08),dark).translateX(ax).translateY(tH+0.62).translateZ(az*0.9));
      // Helmet
      g.add(mkMesh(new THREE.SphereGeometry(0.045,6,5),vdark).translateX(ax).translateY(tH+0.72).translateZ(az*0.9));
      // Helmet spike
      g.add(mkMesh(new THREE.ConeGeometry(0.012,0.04,4),shieldMetal).translateX(ax).translateY(tH+0.78).translateZ(az*0.9));
    });
    // One archer with a bow raised (right side)
    g.add(mkMesh(new THREE.TorusGeometry(0.04,0.005,4,10),woodHoard).translateX(0.26).translateY(tH+0.68).translateZ(0.05).rotateY(Math.PI/2));

    // Wooden hoardings (covered parapet) around top — 4 side panels
    [[0,0.38,0.02,0.03],[0,-0.38,0.02,0.03],[0.38,0,0.03,0.02],[-0.38,0,0.03,0.02]].forEach(([hx,hz,sx,sz])=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.6-sz*8,0.06,0.6-sx*8),woodHoard).translateX(hx).translateY(tH+0.3).translateZ(hz));
    });

    // Climbing ivy — clusters of small green bumps on tower sides
    for(let vy=0.5;vy<tH+0.2;vy+=0.18){
      for(let vi=0;vi<3;vi++){
        const ox=(Math.random()-0.5)*0.08;
        const oz=(Math.random()-0.5)*0.08;
        g.add(mkMesh(new THREE.SphereGeometry(0.025,4,3),ivy).translateX(0.29+ox*0.3).translateY(vy).translateZ(0.22+oz));
      }
      if(vy<tH-0.2){
        g.add(mkMesh(new THREE.SphereGeometry(0.02,4,3),ivy).translateX(-0.27).translateY(vy+0.05).translateZ(0.15));
      }
    }
    // Ivy vine trunks (thin vertical cylinders)
    g.add(mkMesh(new THREE.CylinderGeometry(0.008,0.008,tH*0.8,4),ivy).translateX(0.29).translateY(0.3+tH*0.4).translateZ(0.22));
    g.add(mkMesh(new THREE.CylinderGeometry(0.008,0.008,tH*0.7,4),ivy).translateX(-0.27).translateY(0.3+tH*0.35).translateZ(0.15));

    // Battle scorch marks (dark patches on walls)
    [[0.29,0.9,0],[0.29,1.4,-0.15],[-0.27,1.1,0.1],[0,1.6,0.29]].forEach(p=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.04,0.04,0.006),scorch).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    });

    // Chipped corner stones (small dark notches)
    [[0.28,1.2,0.28],[-0.28,1.5,-0.28],[0.28,1.8,-0.28]].forEach(p=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.03,0.03,0.03),vdark).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    });

    // Shield hanging from wall (two, one per side)
    [[0.305,0.85,0.08],[-0.285,0.95,-0.1]].forEach(p=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.07,6,4,0,Math.PI*2,0,Math.PI*0.5),shieldMetal).translateX(p[0]).translateY(p[1]).translateZ(p[2]).rotateZ(Math.PI/2));
      // Shield boss
      g.add(mkMesh(new THREE.SphereGeometry(0.012,5,4),accentDark).translateX(p[0]+Math.sign(p[0])*0.01).translateY(p[1]).translateZ(p[2]));
      // Shield cross
      g.add(mkMesh(new THREE.BoxGeometry(0.003,0.08,0.008),accent).translateX(p[0]+Math.sign(p[0])*0.005).translateY(p[1]).translateZ(p[2]));
      g.add(mkMesh(new THREE.BoxGeometry(0.003,0.008,0.08),accent).translateX(p[0]+Math.sign(p[0])*0.005).translateY(p[1]).translateZ(p[2]));
    });

    // Wall-mounted torches (2, flanking door)
    [[-0.15,0.55,0.3],[0.15,0.55,0.3]].forEach(p=>{
      // Bracket
      g.add(mkMesh(new THREE.BoxGeometry(0.02,0.04,0.03),shieldMetal).translateX(p[0]).translateY(p[1]).translateZ(p[2]-0.01));
      // Torch handle
      g.add(mkMesh(new THREE.CylinderGeometry(0.012,0.014,0.12,5),torchWood).translateX(p[0]).translateY(p[1]+0.06).translateZ(p[2]+0.005));
      // Fire core
      g.add(mkMesh(new THREE.SphereGeometry(0.028,6,5),torchFire).translateX(p[0]).translateY(p[1]+0.15).translateZ(p[2]+0.008));
      // Flame cone
      g.add(mkMesh(new THREE.ConeGeometry(0.024,0.07,5),torchGlow).translateX(p[0]).translateY(p[1]+0.2).translateZ(p[2]+0.008));
    });

    // Rope and bucket hanging from pulley arm (crane)
    g.add(mkMesh(new THREE.BoxGeometry(0.08,0.02,0.02),woodHoard).translateY(tH+0.28).translateZ(0.38));
    g.add(mkMesh(new THREE.CylinderGeometry(0.002,0.002,0.35,4),torchWood).translateY(tH+0.1).translateZ(0.42));
    g.add(mkMesh(new THREE.CylinderGeometry(0.04,0.045,0.06,8),woodHoard).translateY(tH-0.08).translateZ(0.42));
    g.add(mkMesh(new THREE.TorusGeometry(0.04,0.004,4,10),shieldMetal).translateY(tH-0.06).translateZ(0.42).rotateX(Math.PI/2));
    g.add(mkMesh(new THREE.TorusGeometry(0.04,0.004,4,10),shieldMetal).translateY(tH-0.11).translateZ(0.42).rotateX(Math.PI/2));

    // Stuck arrows in walls (3 arrows at angles)
    [[0.29,1.2,0.1,0.3],[-0.27,1.4,-0.05,-0.3],[0.1,0.9,0.3,0.1]].forEach(p=>{
      const arr=mkMesh(new THREE.CylinderGeometry(0.004,0.004,0.08,4),torchWood);
      arr.position.set(p[0],p[1],p[2]);
      arr.rotation.z=p[3];arr.rotation.y=p[3]*0.5;
      g.add(arr);
      // Fletching
      g.add(mkMesh(new THREE.BoxGeometry(0.02,0.005,0.005),accent).translateX(p[0]-0.035*Math.sin(p[3])).translateY(p[1]-0.035*Math.cos(p[3])).translateZ(p[2]));
    });

    // Stone stair steps at base (4 steps)
    [0.04,0.08,0.12,0.16].forEach((sy,i)=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.2-i*0.02,0.03,0.06),stone).translateY(sy).translateZ(0.35+i*0.04));
    });

    // Gargoyle drainspouts on corners (small angry heads)
    [[0.35,tH+0.25,0.35],[-0.35,tH+0.25,0.35],[0.35,tH+0.25,-0.35],[-0.35,tH+0.25,-0.35]].forEach(p=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.04,6,5),vdark).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
      // Mouth spout
      g.add(mkMesh(new THREE.CylinderGeometry(0.008,0.015,0.04,5),vdark).translateX(p[0]*1.15).translateY(p[1]-0.02).translateZ(p[2]*1.15).rotateZ(Math.sign(p[0])*Math.PI/3));
    });

  }else if(type==='magic'){
    const purple=mkMat(0x7B2D8E),darkP=mkMat(0x5A1D6E),lightP=mkMat(0x9B3DAE);
    const mH=2.0; // Much taller
    // Base ring - stepped
    g.add(mkMesh(new THREE.CylinderGeometry(0.42,0.46,0.12,10),darkP).translateY(0.16));
    g.add(mkMesh(new THREE.CylinderGeometry(0.36,0.42,0.12,10),darkP).translateY(0.28));
    // Tower shaft - taller with highlight
    g.add(mkMesh(new THREE.CylinderGeometry(0.28,0.36,mH,10),purple).translateY(0.34+mH/2));
    // Vertical highlight strip
    g.add(mkMesh(new THREE.BoxGeometry(0.02,mH*0.9,0.04),lightP).translateX(0.28).translateY(0.34+mH/2));
    // Decorative rings with emissive glow (more of them)
    [0.55,1.0,1.45,1.9].forEach(y=>{
      g.add(mkMesh(new THREE.TorusGeometry(0.31,0.028,6,10),mkMat(0x9944CC,{emissive:0x6622AA,emissiveIntensity:0.5})).translateY(y).rotateX(Math.PI/2));
    });
    // 4-tier stepped conical roof
    g.add(mkMesh(new THREE.ConeGeometry(0.4,0.2,10),mkMat(0x5a1d6e)).translateY(mH+0.42));
    g.add(mkMesh(new THREE.ConeGeometry(0.32,0.2,10),mkMat(0x6a2d7e)).translateY(mH+0.55));
    g.add(mkMesh(new THREE.ConeGeometry(0.22,0.2,10),mkMat(0x7b2d8e)).translateY(mH+0.68));
    g.add(mkMesh(new THREE.ConeGeometry(0.12,0.2,10),mkMat(0x8b3d9e)).translateY(mH+0.82));
    // Crystal orb on top - much larger and more emissive
    g.add(mkMesh(new THREE.SphereGeometry(0.15,12,10),mkMat(0xDD88FF,{emissive:0xCC66FF,emissiveIntensity:2.0})).translateY(mH+1.0));
    // Inner bright core
    g.add(mkMesh(new THREE.SphereGeometry(0.08,10,8),mkMat(0xffffff,{emissive:0xffccff,emissiveIntensity:3.0})).translateY(mH+1.0));
    // Orbiting glow rings (3 rings at different orientations)
    g.add(mkMesh(new THREE.TorusGeometry(0.22,0.018,6,16),mkMat(0xDD88FF,{emissive:0xCC66FF,emissiveIntensity:1.2,transparent:true,opacity:0.7})).translateY(mH+1.0).rotateX(Math.PI/3));
    g.add(mkMesh(new THREE.TorusGeometry(0.22,0.018,6,16),mkMat(0xDD88FF,{emissive:0xCC66FF,emissiveIntensity:1.2,transparent:true,opacity:0.7})).translateY(mH+1.0).rotateZ(Math.PI/3));
    g.add(mkMesh(new THREE.TorusGeometry(0.26,0.015,6,16),mkMat(0xDD88FF,{emissive:0xCC66FF,emissiveIntensity:1.0,transparent:true,opacity:0.5})).translateY(mH+1.0));
    // Arched glowing windows (more of them, at multiple heights)
    const gw=mkMat(0xCC66FF,{emissive:0xCC66FF,emissiveIntensity:1.0});
    [0.8,1.5].forEach(wy=>{
      [0,Math.PI/2,Math.PI,Math.PI*1.5].forEach(a=>{
        const r=0.32;
        g.add(mkMesh(new THREE.BoxGeometry(0.04,0.2,0.025),gw).translateX(Math.cos(a)*r).translateY(wy).translateZ(Math.sin(a)*r));
        g.add(mkMesh(new THREE.SphereGeometry(0.028,6,5),gw).translateX(Math.cos(a)*r).translateY(wy+0.13).translateZ(Math.sin(a)*r));
      });
    });
    // Rune marks on shaft (glowing)
    const rune=mkMat(0xff88ff,{emissive:0xcc66cc,emissiveIntensity:0.9});
    [0.5,1.1,1.7].forEach(y=>{
      [0,Math.PI].forEach(a=>{
        g.add(mkMesh(new THREE.BoxGeometry(0.03,0.03,0.025),rune).translateX(Math.cos(a)*0.32).translateY(y).translateZ(Math.sin(a)*0.32));
      });
    });
    // Team accent bands
    g.add(mkMesh(new THREE.CylinderGeometry(0.33,0.33,0.06,10),accent).translateY(0.42));
    g.add(mkMesh(new THREE.CylinderGeometry(0.31,0.31,0.06,10),accent).translateY(mH+0.3));

    // ============ v3.3 DETAIL PASS ============
    const arcane=mkMat(0xbb66ff,{emissive:0x9944cc,emissiveIntensity:1.1,transparent:true,opacity:0.85});
    const arcaneBright=mkMat(0xee99ff,{emissive:0xcc66ff,emissiveIntensity:2.0});
    const crystal=mkMat(0xaaffff,{emissive:0x66ccff,emissiveIntensity:1.4,transparent:true,opacity:0.9});
    const tomeBrown=mkMat(0x5a2a10,{roughness:0.85});
    const tomeGold=mkMat(0xd4b04a,{metalness:0.7});
    const staffWood=mkMat(0x3a1a08,{roughness:0.8});

    // Glowing magic circle on ground around base
    g.add(mkMesh(new THREE.TorusGeometry(0.52,0.015,4,32),arcane).translateY(0.01).rotateX(Math.PI/2));
    g.add(mkMesh(new THREE.TorusGeometry(0.46,0.01,4,32),arcane).translateY(0.015).rotateX(Math.PI/2));
    // Rune marks around the circle (8 evenly spaced)
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      g.add(mkMesh(new THREE.BoxGeometry(0.04,0.02,0.015),arcaneBright).translateX(Math.cos(a)*0.5).translateY(0.018).translateZ(Math.sin(a)*0.5).rotateY(-a));
    }

    // Floating crystal shards (4 around the tower at mid-height)
    [0,Math.PI/2,Math.PI,Math.PI*1.5].forEach((a,i)=>{
      const cx=Math.cos(a)*0.6,cz=Math.sin(a)*0.6;
      const h=1.1+Math.sin(i*1.7)*0.3;
      // Crystal body (octahedron-like, use cone+cone inverse)
      g.add(mkMesh(new THREE.ConeGeometry(0.05,0.12,6),crystal).translateX(cx).translateY(h).translateZ(cz));
      g.add(mkMesh(new THREE.ConeGeometry(0.05,0.08,6),crystal).translateX(cx).translateY(h-0.1).translateZ(cz).rotateX(Math.PI));
      // Inner bright core
      g.add(mkMesh(new THREE.SphereGeometry(0.02,6,5),arcaneBright).translateX(cx).translateY(h).translateZ(cz));
    });

    // Enchanted tome on a pedestal at base front
    g.add(mkMesh(new THREE.CylinderGeometry(0.06,0.07,0.12,8),darkP).translateY(0.12).translateZ(0.52));
    g.add(mkMesh(new THREE.BoxGeometry(0.1,0.025,0.08),tomeBrown).translateY(0.2).translateZ(0.52));
    g.add(mkMesh(new THREE.BoxGeometry(0.095,0.005,0.075),mkMat(0xfff4cc)).translateY(0.215).translateZ(0.52));
    // Tome gold clasp
    g.add(mkMesh(new THREE.BoxGeometry(0.015,0.008,0.08),tomeGold).translateY(0.215).translateZ(0.52));
    // Glowing tome gem
    g.add(mkMesh(new THREE.SphereGeometry(0.008,5,4),arcaneBright).translateY(0.225).translateZ(0.48));

    // Staff leaning against tower side
    const staff=mkMesh(new THREE.CylinderGeometry(0.012,0.015,0.9,6),staffWood);
    staff.position.set(0.44,0.45,0.1);staff.rotation.z=0.3;g.add(staff);
    // Staff wrapped grip (darker)
    g.add(mkMesh(new THREE.CylinderGeometry(0.018,0.018,0.1,6),tomeBrown).translateX(0.48).translateY(0.52).translateZ(0.1).rotateZ(0.3));
    // Staff orb top
    g.add(mkMesh(new THREE.SphereGeometry(0.04,8,6),crystal).translateX(0.57).translateY(0.85).translateZ(0.1));
    g.add(mkMesh(new THREE.SphereGeometry(0.02,6,5),arcaneBright).translateX(0.57).translateY(0.85).translateZ(0.1));
    // Staff claw/bracket around orb (3 prongs)
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3;
      g.add(mkMesh(new THREE.BoxGeometry(0.008,0.04,0.008),tomeGold).translateX(0.57+Math.cos(a)*0.035).translateY(0.84).translateZ(0.1+Math.sin(a)*0.035).rotateX(Math.cos(a)*0.3).rotateZ(Math.sin(a)*0.3));
    }

    // Potion bottles on a tiny shelf
    g.add(mkMesh(new THREE.BoxGeometry(0.14,0.008,0.04),tomeBrown).translateX(-0.42).translateY(0.55).translateZ(0));
    [[-0.47,0x00ff66],[-0.42,0xff6644],[-0.37,0x66ccff]].forEach((p)=>{
      g.add(mkMesh(new THREE.CylinderGeometry(0.014,0.014,0.04,6),
        mkMat(p[1],{emissive:p[1],emissiveIntensity:0.9,transparent:true,opacity:0.85}))
        .translateX(p[0]).translateY(0.58).translateZ(0));
      // Cork
      g.add(mkMesh(new THREE.CylinderGeometry(0.008,0.008,0.008,5),tomeBrown).translateX(p[0]).translateY(0.606).translateZ(0));
    });

    // Helical energy spiral around shaft (descending spiral of small cubes)
    for(let i=0;i<18;i++){
      const a=(i/18)*Math.PI*4;
      const y=0.5+(i/18)*1.5;
      const r=0.34;
      g.add(mkMesh(new THREE.BoxGeometry(0.02,0.02,0.02),arcaneBright).translateX(Math.cos(a)*r).translateY(y).translateZ(Math.sin(a)*r));
    }

    // Additional larger rune carvings on shaft (4 sides, more elaborate)
    const bigRune=mkMat(0xff99ff,{emissive:0xcc66cc,emissiveIntensity:1.3});
    [0,Math.PI/2,Math.PI,Math.PI*1.5].forEach(a=>{
      // Vertical stroke
      g.add(mkMesh(new THREE.BoxGeometry(0.008,0.08,0.012),bigRune).translateX(Math.cos(a)*0.33).translateY(1.0).translateZ(Math.sin(a)*0.33).rotateY(-a));
      // Horizontal strokes
      g.add(mkMesh(new THREE.BoxGeometry(0.04,0.008,0.012),bigRune).translateX(Math.cos(a)*0.33).translateY(1.02).translateZ(Math.sin(a)*0.33).rotateY(-a));
      g.add(mkMesh(new THREE.BoxGeometry(0.03,0.008,0.012),bigRune).translateX(Math.cos(a)*0.33).translateY(0.98).translateZ(Math.sin(a)*0.33).rotateY(-a));
    });

    // Second floating orb at mid-height (smaller)
    g.add(mkMesh(new THREE.SphereGeometry(0.06,10,8),crystal).translateY(1.2).translateZ(0.48));
    g.add(mkMesh(new THREE.SphereGeometry(0.025,6,5),arcaneBright).translateY(1.2).translateZ(0.48));

    // Stone runestones at base of circle (4 tall thin stones)
    [[0.42,0.42],[-0.42,0.42],[-0.42,-0.42],[0.42,-0.42]].forEach(p=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.04,0.22,0.04),mkMat(0x4a4a5a)).translateX(p[0]).translateY(0.13).translateZ(p[1]));
      // Rune carving on the stone
      g.add(mkMesh(new THREE.BoxGeometry(0.015,0.015,0.045),bigRune).translateX(p[0]).translateY(0.17).translateZ(p[1]));
    });

  }else if(type==='catapult'){
    const wood=mkMat(0x8B5A2B),woodD=mkMat(0x6B3A1B),woodL=mkMat(0xa07028),metal=mkMat(0x555555,{metalness:0.4}),iron=mkMat(0x2a2a2a,{metalness:0.55,roughness:0.4});
    // Platform - thicker, stepped
    g.add(mkMesh(new THREE.BoxGeometry(0.88,0.06,0.76),woodD).translateY(0.12));
    g.add(mkMesh(new THREE.BoxGeometry(0.8,0.1,0.7),wood).translateY(0.2));
    g.add(mkMesh(new THREE.BoxGeometry(0.8,0.02,0.7),woodL).translateY(0.255));
    // Reinforced edges (iron bands wrapping the platform)
    g.add(mkMesh(new THREE.BoxGeometry(0.82,0.04,0.04),iron).translateY(0.2).translateZ(0.34));
    g.add(mkMesh(new THREE.BoxGeometry(0.82,0.04,0.04),iron).translateY(0.2).translateZ(-0.34));
    g.add(mkMesh(new THREE.BoxGeometry(0.04,0.04,0.7),iron).translateY(0.2).translateX(0.38));
    g.add(mkMesh(new THREE.BoxGeometry(0.04,0.04,0.7),iron).translateY(0.2).translateX(-0.38));
    // Iron rivets on bands
    for(const sx of[-0.3,-0.1,0.1,0.3])for(const sz of[0.34,-0.34]){
      g.add(mkMesh(new THREE.SphereGeometry(0.015,5,4),metal).translateX(sx).translateY(0.215).translateZ(sz));
    }
    // Wheels - larger, with spokes
    [[-0.38,-0.32],[-0.38,0.32],[0.38,-0.32],[0.38,0.32]].forEach(([wx,wz])=>{
      // Outer tire
      const tire=mkMesh(new THREE.CylinderGeometry(0.15,0.15,0.05,12),woodD);
      tire.rotation.x=Math.PI/2;tire.position.set(wx,0.15,wz);g.add(tire);
      // Inner wood
      const inner=mkMesh(new THREE.CylinderGeometry(0.12,0.12,0.055,12),wood);
      inner.rotation.x=Math.PI/2;inner.position.set(wx,0.15,wz);g.add(inner);
      // Hub (gold)
      const hub=mkMesh(new THREE.CylinderGeometry(0.04,0.04,0.07,8),mkMat(0xaa7f28,{metalness:0.5}));
      hub.rotation.x=Math.PI/2;hub.position.set(wx,0.15,wz);g.add(hub);
      // Spokes (4-way)
      for(let s=0;s<4;s++){
        const ang=s*Math.PI/2;
        const spoke=mkMesh(new THREE.BoxGeometry(0.02,0.22,0.02),woodD);
        spoke.position.set(wx,0.15,wz);
        spoke.rotation.x=Math.PI/2;spoke.rotation.z=ang;
        g.add(spoke);
      }
    });
    // A-frame supports - taller, tapered
    const frameH=1.0;
    g.add(mkMesh(new THREE.BoxGeometry(0.09,frameH,0.09),wood).translateX(-0.24).translateY(0.22+frameH/2));
    g.add(mkMesh(new THREE.BoxGeometry(0.09,frameH,0.09),wood).translateX(0.24).translateY(0.22+frameH/2));
    // Highlight strip on lit side of each post
    g.add(mkMesh(new THREE.BoxGeometry(0.015,frameH*0.95,0.09),woodL).translateX(-0.19).translateY(0.22+frameH/2));
    g.add(mkMesh(new THREE.BoxGeometry(0.015,frameH*0.95,0.09),woodL).translateX(0.29).translateY(0.22+frameH/2));
    // Cross beam at top of frame
    g.add(mkMesh(new THREE.BoxGeometry(0.6,0.08,0.08),wood).translateY(0.22+frameH));
    g.add(mkMesh(new THREE.BoxGeometry(0.6,0.015,0.08),woodL).translateY(0.22+frameH+0.045));
    // Pivot axle (horizontal iron cylinder through posts)
    const axle=mkMesh(new THREE.CylinderGeometry(0.025,0.025,0.6,8),iron);
    axle.rotation.z=Math.PI/2;axle.position.set(0,0.22+frameH-0.05,0);g.add(axle);
    // Tension rope coils around axle (two groups)
    [-0.1,0.1].forEach(rx=>{
      const rope=mkMesh(new THREE.CylinderGeometry(0.04,0.04,0.06,8),mkMat(0xaa8855));
      rope.rotation.z=Math.PI/2;rope.position.set(rx,0.22+frameH-0.05,0);g.add(rope);
    });
    // Diagonal knee braces
    const brace1=mkMesh(new THREE.BoxGeometry(0.05,0.5,0.05),woodD);
    brace1.position.set(-0.14,0.55,0);brace1.rotation.z=0.45;g.add(brace1);
    const brace2=mkMesh(new THREE.BoxGeometry(0.05,0.5,0.05),woodD);
    brace2.position.set(0.14,0.55,0);brace2.rotation.z=-0.45;g.add(brace2);
    // Throwing arm - longer, thicker
    const arm=mkMesh(new THREE.BoxGeometry(0.07,1.15,0.07),wood);
    arm.position.set(0,1.05,0.22);arm.rotation.x=-0.42;g.add(arm);
    // Arm metal reinforcement bands
    for(const ay of[-0.3,0,0.3]){
      const band=mkMesh(new THREE.BoxGeometry(0.08,0.02,0.08),iron);
      band.position.set(0,1.05+ay*Math.cos(0.42),0.22+ay*Math.sin(0.42));
      band.rotation.x=-0.42;g.add(band);
    }
    // Rope lashing (visible wrap at top of arm)
    const lash=mkMesh(new THREE.CylinderGeometry(0.05,0.05,0.07,6),mkMat(0xaa8855));
    lash.rotation.x=-0.42+Math.PI/2;lash.position.set(0,1.45,0.5);g.add(lash);
    // Sling/bucket (wider, iron rimmed)
    g.add(mkMesh(new THREE.BoxGeometry(0.16,0.08,0.16),woodD).translateY(1.52).translateZ(0.62));
    g.add(mkMesh(new THREE.BoxGeometry(0.18,0.02,0.18),iron).translateY(1.49).translateZ(0.62));
    g.add(mkMesh(new THREE.BoxGeometry(0.18,0.02,0.18),iron).translateY(1.55).translateZ(0.62));
    // Boulder in bucket (rough rock)
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.1,0),mkMat(0x666666,{flatShading:true})).translateY(1.6).translateZ(0.62));
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.08,0),mkMat(0x888888,{flatShading:true})).translateY(1.62).translateZ(0.62));
    // Counterweight box on the back (with iron bands)
    g.add(mkMesh(new THREE.BoxGeometry(0.18,0.18,0.18),mkMat(0x444444,{metalness:0.4})).translateY(0.8).translateZ(-0.28));
    g.add(mkMesh(new THREE.BoxGeometry(0.19,0.025,0.19),iron).translateY(0.8).translateZ(-0.28));
    g.add(mkMesh(new THREE.BoxGeometry(0.19,0.025,0.19),iron).translateY(0.75).translateZ(-0.28));
    // Ammo pile beside platform (3 boulders stacked)
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.075,0),mkMat(0x555555,{flatShading:true})).translateY(0.26).translateX(0.32).translateZ(0));
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.065,0),mkMat(0x666666,{flatShading:true})).translateY(0.32).translateX(0.38).translateZ(0.05));
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.06,0),mkMat(0x777777,{flatShading:true})).translateY(0.36).translateX(0.3).translateZ(-0.05));
    // Team accent pennant hanging off cross beam
    g.add(mkMesh(new THREE.BoxGeometry(0.18,0.14,0.018),accent).translateZ(0.045).translateY(0.22+frameH-0.08));
    g.add(mkMesh(new THREE.BoxGeometry(0.18,0.02,0.018),accentDark).translateZ(0.045).translateY(0.22+frameH-0.15));

    // ============ v3.3 DETAIL PASS ============
    const pitch=mkMat(0x1a1208,{roughness:0.95});
    const rope=mkMat(0xaa8855,{roughness:0.85});
    const lanternGlow=mkMat(0xffcc44,{emissive:0xff9922,emissiveIntensity:2.0,transparent:true,opacity:0.85});
    const crewCloth=mkMat(0x4a3a1a);
    const crewSkin=mkMat(0xc4956a);

    // Pitch barrel (black tar for flaming shots)
    g.add(mkMesh(new THREE.CylinderGeometry(0.07,0.08,0.14,10),pitch).translateX(-0.32).translateY(0.33).translateZ(0.22));
    // Barrel iron bands
    g.add(mkMesh(new THREE.TorusGeometry(0.08,0.01,4,12),iron).translateX(-0.32).translateY(0.37).translateZ(0.22).rotateX(Math.PI/2));
    g.add(mkMesh(new THREE.TorusGeometry(0.08,0.01,4,12),iron).translateX(-0.32).translateY(0.29).translateZ(0.22).rotateX(Math.PI/2));
    // Pitch ladle stuck in barrel
    g.add(mkMesh(new THREE.CylinderGeometry(0.005,0.005,0.15,4),wood).translateX(-0.32).translateY(0.45).translateZ(0.22).rotateZ(0.2));
    g.add(mkMesh(new THREE.SphereGeometry(0.02,5,4),iron).translateX(-0.35).translateY(0.52).translateZ(0.22));

    // Coiled rope on deck
    for(let cr=0;cr<4;cr++){
      g.add(mkMesh(new THREE.TorusGeometry(0.06-cr*0.008,0.012,4,12),rope).translateX(0.3).translateY(0.28+cr*0.012).translateZ(0.22).rotateX(Math.PI/2));
    }

    // Tool rack - hammer and lever
    const rackBase=mkMesh(new THREE.BoxGeometry(0.18,0.01,0.04),woodD);
    rackBase.position.set(-0.3,0.28,-0.2);g.add(rackBase);
    // Hammer (handle + head)
    g.add(mkMesh(new THREE.CylinderGeometry(0.008,0.008,0.12,5),wood).translateX(-0.35).translateY(0.34).translateZ(-0.2).rotateZ(-0.2));
    g.add(mkMesh(new THREE.BoxGeometry(0.035,0.025,0.025),iron).translateX(-0.33).translateY(0.4).translateZ(-0.2));
    // Lever (crowbar)
    g.add(mkMesh(new THREE.CylinderGeometry(0.006,0.006,0.15,5),iron).translateX(-0.28).translateY(0.35).translateZ(-0.2).rotateZ(0.15));
    g.add(mkMesh(new THREE.BoxGeometry(0.015,0.008,0.008),iron).translateX(-0.28).translateY(0.425).translateZ(-0.2).rotateZ(0.6));

    // Extra ammo basket (woven) with spare boulders
    // Basket wall (ring of thin boxes)
    for(let b=0;b<8;b++){
      const a=b*Math.PI/4;
      g.add(mkMesh(new THREE.BoxGeometry(0.008,0.08,0.02),rope).translateX(0.32+Math.cos(a)*0.08).translateY(0.3).translateZ(-0.18+Math.sin(a)*0.08).rotateY(-a));
    }
    // Basket bottom
    g.add(mkMesh(new THREE.CylinderGeometry(0.085,0.085,0.01,8),rope).translateX(0.32).translateY(0.265).translateZ(-0.18));
    // Boulders in basket
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.055,0),mkMat(0x555555)).translateX(0.32).translateY(0.32).translateZ(-0.18));
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.048,0),mkMat(0x666666)).translateX(0.34).translateY(0.36).translateZ(-0.16));
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.042,0),mkMat(0x777777)).translateX(0.3).translateY(0.36).translateZ(-0.2));

    // Shield wall at front (2 wooden shields propped up)
    [[-0.18,0.38],[0.18,0.38]].forEach(p=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.16,0.2,0.02),woodD).translateX(p[0]).translateY(0.35).translateZ(p[1]));
      // Shield iron boss
      g.add(mkMesh(new THREE.SphereGeometry(0.015,5,4),iron).translateX(p[0]).translateY(0.35).translateZ(p[1]+0.013));
      // Team color band
      g.add(mkMesh(new THREE.BoxGeometry(0.16,0.03,0.022),accent).translateX(p[0]).translateY(0.41).translateZ(p[1]));
    });

    // Water bucket (hanging from frame)
    g.add(mkMesh(new THREE.CylinderGeometry(0.05,0.055,0.08,8),woodD).translateX(0.28).translateY(0.85).translateZ(0));
    g.add(mkMesh(new THREE.TorusGeometry(0.05,0.006,4,10),iron).translateX(0.28).translateY(0.88).translateZ(0).rotateX(Math.PI/2));
    // Bucket handle
    g.add(mkMesh(new THREE.TorusGeometry(0.05,0.003,3,6,Math.PI),iron).translateX(0.28).translateY(0.92).translateZ(0).rotateX(Math.PI));
    // Rope to frame
    g.add(mkMesh(new THREE.CylinderGeometry(0.002,0.002,0.16,3),rope).translateX(0.28).translateY(1.02).translateZ(0));

    // Lantern hanging from frame (other side)
    g.add(mkMesh(new THREE.CylinderGeometry(0.002,0.002,0.12,3),iron).translateX(-0.28).translateY(1.08).translateZ(0));
    g.add(mkMesh(new THREE.BoxGeometry(0.05,0.008,0.05),iron).translateX(-0.28).translateY(1.02).translateZ(0));
    g.add(mkMesh(new THREE.BoxGeometry(0.04,0.06,0.04),lanternGlow).translateX(-0.28).translateY(0.97).translateZ(0));
    g.add(mkMesh(new THREE.BoxGeometry(0.05,0.008,0.05),iron).translateX(-0.28).translateY(0.94).translateZ(0));
    // Lantern frame corners (4 vertical rods)
    [[0.025,0.025],[-0.025,0.025],[0.025,-0.025],[-0.025,-0.025]].forEach(c=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.003,0.06,0.003),iron).translateX(-0.28+c[0]).translateY(0.97).translateZ(c[1]));
    });

    // Crew silhouette — gunner pulling rope (simplified standing figure)
    // Body
    g.add(mkMesh(new THREE.CylinderGeometry(0.04,0.045,0.16,6),crewCloth).translateX(-0.1).translateY(0.42).translateZ(-0.1));
    // Head
    g.add(mkMesh(new THREE.SphereGeometry(0.04,6,5),crewSkin).translateX(-0.1).translateY(0.56).translateZ(-0.1));
    // Helmet
    g.add(mkMesh(new THREE.SphereGeometry(0.042,6,4,0,Math.PI*2,0,Math.PI*0.5),iron).translateX(-0.1).translateY(0.58).translateZ(-0.1));
    // Arm raised (pulling lanyard toward the arm)
    g.add(mkMesh(new THREE.CylinderGeometry(0.015,0.013,0.1,4),crewCloth).translateX(-0.05).translateY(0.5).translateZ(-0.1).rotateZ(-0.6));

    // Chain anchoring counterweight to frame
    for(let ch=0;ch<4;ch++){
      g.add(mkMesh(new THREE.TorusGeometry(0.015,0.003,3,6),iron).translateY(0.78+ch*0.03).translateZ(-0.28).rotateX(ch%2===0?0:Math.PI/2));
    }

    // Measuring knotted rope (ranging tool) hanging off side
    for(let k=0;k<5;k++){
      g.add(mkMesh(new THREE.SphereGeometry(0.008,4,3),rope).translateX(0.44).translateY(0.48-k*0.05).translateZ(0.2));
    }
    g.add(mkMesh(new THREE.CylinderGeometry(0.002,0.002,0.26,3),rope).translateX(0.44).translateY(0.35).translateZ(0.2));

    // Sparks on the fuse slot (tiny emissive bits near pitch barrel - the lit torch for flame shots)
    g.add(mkMesh(new THREE.CylinderGeometry(0.008,0.008,0.1,4),wood).translateX(-0.22).translateY(0.34).translateZ(0.22).rotateZ(0.3));
    g.add(mkMesh(new THREE.SphereGeometry(0.014,5,4),mkMat(0xff8822,{emissive:0xff5500,emissiveIntensity:2.5})).translateX(-0.18).translateY(0.4).translateZ(0.22));

  }else if(type==='bombard'){
    const stone=mkMat(0x8a8a7a),dark=mkMat(0x6a6a5a),light=mkMat(0x9a9a8a);
    const metal=mkMat(0x2a2a2a,{metalness:0.7,roughness:0.25});
    const iron=mkMat(0x444,{metalness:0.5});
    const wood=mkMat(0x6b3a1b),woodL=mkMat(0x8b5a2b);
    // Stone emplacement (stepped, taller)
    g.add(mkMesh(new THREE.BoxGeometry(0.88,0.08,0.78),dark).translateY(0.09));
    g.add(mkMesh(new THREE.BoxGeometry(0.82,0.36,0.72),stone).translateY(0.31));
    // Highlight edge on lit face
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.34,0.72),light).translateX(0.41).translateY(0.31));
    // Stone courses (horizontal brick lines)
    g.add(mkMesh(new THREE.BoxGeometry(0.84,0.02,0.74),dark).translateY(0.22));
    g.add(mkMesh(new THREE.BoxGeometry(0.84,0.02,0.74),dark).translateY(0.35));
    g.add(mkMesh(new THREE.BoxGeometry(0.84,0.02,0.74),dark).translateY(0.44));
    // Top ledge platform
    g.add(mkMesh(new THREE.BoxGeometry(0.86,0.04,0.76),dark).translateY(0.51));
    // Wheels partially visible on sides
    [[-0.45,-0.25],[-0.45,0.25],[0.45,-0.25],[0.45,0.25]].forEach(([wx,wz])=>{
      const wh=mkMesh(new THREE.CylinderGeometry(0.14,0.14,0.05,12),wood);
      wh.rotation.x=Math.PI/2;wh.position.set(wx,0.14,wz);g.add(wh);
      const hub=mkMesh(new THREE.CylinderGeometry(0.035,0.035,0.06,6),iron);
      hub.rotation.x=Math.PI/2;hub.position.set(wx,0.14,wz);g.add(hub);
      // Spokes
      for(let s=0;s<4;s++){
        const ang=s*Math.PI/2;
        const spoke=mkMesh(new THREE.BoxGeometry(0.02,0.2,0.02),wood);
        spoke.position.set(wx,0.14,wz);spoke.rotation.x=Math.PI/2;spoke.rotation.z=ang;
        g.add(spoke);
      }
    });
    // Front embrasure (sloped cannon notch)
    g.add(mkMesh(new THREE.BoxGeometry(0.38,0.16,0.08),dark).translateY(0.56).translateZ(0.35));
    g.add(mkMesh(new THREE.BoxGeometry(0.12,0.16,0.08),dark).translateX(-0.32).translateY(0.56).translateZ(0.35));
    g.add(mkMesh(new THREE.BoxGeometry(0.12,0.16,0.08),dark).translateX(0.32).translateY(0.56).translateZ(0.35));
    // Breech block (rear of cannon, blockier)
    g.add(mkMesh(new THREE.BoxGeometry(0.26,0.24,0.26),metal).translateY(0.58).translateZ(-0.18));
    g.add(mkMesh(new THREE.BoxGeometry(0.1,0.1,0.1),iron).translateY(0.58).translateZ(-0.32));
    // Cascabel ball at back of breech
    g.add(mkMesh(new THREE.SphereGeometry(0.06,10,8),metal).translateY(0.58).translateZ(-0.38));
    // Cannon barrel - longer, thicker, tapered
    const barrel=mkMesh(new THREE.CylinderGeometry(0.11,0.14,0.95,14),metal);
    barrel.position.set(0,0.56,0.18);barrel.rotation.x=Math.PI/2-0.18;g.add(barrel);
    // Barrel flare (muzzle)
    const flare=mkMesh(new THREE.CylinderGeometry(0.16,0.11,0.12,14),metal);
    flare.position.set(0,0.62,0.6);flare.rotation.x=Math.PI/2-0.18;g.add(flare);
    // Muzzle rim (bright ring)
    const rim=mkMesh(new THREE.TorusGeometry(0.155,0.015,6,14),mkMat(0x777,{metalness:0.6}));
    rim.position.set(0,0.635,0.66);rim.rotation.x=-0.18;g.add(rim);
    // Fire glow inside muzzle (layered)
    g.add(mkMesh(new THREE.SphereGeometry(0.1,8,6),mkMat(0xff2200,{emissive:0xff2200,emissiveIntensity:1.3})).translateY(0.625).translateZ(0.68));
    g.add(mkMesh(new THREE.SphereGeometry(0.07,8,6),mkMat(0xffaa00,{emissive:0xffaa00,emissiveIntensity:2.2})).translateY(0.625).translateZ(0.68));
    g.add(mkMesh(new THREE.SphereGeometry(0.035,6,4),mkMat(0xffeecc,{emissive:0xffeecc,emissiveIntensity:3.5})).translateY(0.625).translateZ(0.7));
    // Reinforcement rings on barrel (more of them)
    [-0.3,-0.1,0.1,0.3].forEach(t=>{
      const ring=mkMesh(new THREE.TorusGeometry(0.125,0.018,6,12),iron);
      ring.position.set(0,0.56+Math.sin(0.18)*t*-1,0.18+Math.cos(0.18)*t);
      ring.rotation.x=Math.PI/2-0.18;g.add(ring);
      // Rivet detail
      for(let r=0;r<3;r++){
        const rr=r*Math.PI*2/3;
        const rivet=mkMesh(new THREE.SphereGeometry(0.012,4,3),mkMat(0xbbb));
        rivet.position.set(Math.cos(rr)*0.13,0.56+Math.sin(0.18)*t*-1+Math.sin(rr)*0.13*Math.cos(0.18),0.18+Math.cos(0.18)*t+Math.sin(rr)*0.13*Math.sin(0.18));
        g.add(rivet);
      }
    });
    // Fuse on top with glowing ember
    g.add(mkMesh(new THREE.CylinderGeometry(0.012,0.012,0.08,5),mkMat(0x3a2208)).translateY(0.73).translateZ(-0.14));
    g.add(mkMesh(new THREE.SphereGeometry(0.022,6,5),mkMat(0xffcc00,{emissive:0xff8800,emissiveIntensity:2.5})).translateY(0.78).translateZ(-0.14));
    // Cannonball pyramid stack (7 balls: 4+2+1)
    for(let row=0;row<3;row++){
      const count=3-row;
      for(let k=0;k<count;k++){
        const bx=-0.22+(k+row*0.5)*0.09;
        const by=0.57+row*0.08;
        const bz=-0.33;
        g.add(mkMesh(new THREE.SphereGeometry(0.04,8,6),mkMat(0x222,{metalness:0.55})).translateX(bx).translateY(by).translateZ(bz));
      }
    }
    // Powder keg next to cannon
    g.add(mkMesh(new THREE.CylinderGeometry(0.07,0.07,0.14,10),woodL).translateX(0.26).translateY(0.62).translateZ(-0.15));
    g.add(mkMesh(new THREE.TorusGeometry(0.07,0.012,5,10),iron).translateX(0.26).translateY(0.66).translateZ(-0.15).rotateX(Math.PI/2));
    g.add(mkMesh(new THREE.TorusGeometry(0.07,0.012,5,10),iron).translateX(0.26).translateY(0.58).translateZ(-0.15).rotateX(Math.PI/2));
    // Smoke sphere floating above muzzle (subtle, semi-transparent)
    g.add(mkMesh(new THREE.SphereGeometry(0.08,6,5),mkMat(0xaaaaaa,{transparent:true,opacity:0.35})).translateY(0.95).translateZ(0.55));
    g.add(mkMesh(new THREE.SphereGeometry(0.06,6,5),mkMat(0xbbbbbb,{transparent:true,opacity:0.3})).translateY(1.1).translateZ(0.48));
    // Team accent base
    g.add(mkMesh(new THREE.BoxGeometry(0.88,0.05,0.78),accent).translateY(0.06));
    // Team flag on back pole
    g.add(mkMesh(new THREE.CylinderGeometry(0.015,0.015,0.55,6),mkMat(0x2a2a2a)).translateY(0.85).translateZ(-0.4));
    g.add(mkMesh(new THREE.BoxGeometry(0.22,0.14,0.02),accent).translateX(0.12).translateY(1.05).translateZ(-0.4));
    g.add(mkMesh(new THREE.SphereGeometry(0.025,6,4),mkMat(0xffd700,{emissive:0xaa7700,emissiveIntensity:0.6})).translateY(1.14).translateZ(-0.4));

    // ============ v3.3 DETAIL PASS ============
    const sandbagCloth=mkMat(0xa08858,{roughness:0.95});
    const sandbagDark=mkMat(0x7a6438,{roughness:0.95});
    const scorch2=mkMat(0x0a0a0a);
    const powder=mkMat(0x2a1a10);
    const brass=mkMat(0xccaa44,{metalness:0.8,roughness:0.3});
    const glass=mkMat(0xaaccee,{metalness:0.3,roughness:0.1,transparent:true,opacity:0.6});
    const emberGlow=mkMat(0xff6622,{emissive:0xff4400,emissiveIntensity:2.5});
    const crewCloth2=mkMat(0x4a2a1a);
    const crewSkin2=mkMat(0xc4956a);

    // Sandbags stacked around base (3 rows, staggered)
    for(let row=0;row<3;row++){
      const count=4-row;
      for(let c=0;c<count;c++){
        const sx=-0.35+c*0.18+row*0.05;
        const sy=0.13+row*0.1;
        g.add(mkMesh(new THREE.BoxGeometry(0.14,0.08,0.08),row%2===0?sandbagCloth:sandbagDark).translateX(sx).translateY(sy).translateZ(0.44));
        // Rope tie across middle
        g.add(mkMesh(new THREE.BoxGeometry(0.14,0.012,0.082),sandbagDark).translateX(sx).translateY(sy).translateZ(0.44));
      }
    }
    // Another sandbag stack on opposite side
    for(let row=0;row<2;row++){
      for(let c=0;c<3;c++){
        g.add(mkMesh(new THREE.BoxGeometry(0.14,0.08,0.08),row%2===0?sandbagDark:sandbagCloth).translateX(-0.3+c*0.15).translateY(0.13+row*0.1).translateZ(-0.44));
      }
    }

    // Water bucket (for cooling barrel) next to gun
    g.add(mkMesh(new THREE.CylinderGeometry(0.06,0.065,0.1,8),wood).translateX(-0.3).translateY(0.6).translateZ(0.12));
    g.add(mkMesh(new THREE.TorusGeometry(0.065,0.006,4,10),iron).translateX(-0.3).translateY(0.64).translateZ(0.12).rotateX(Math.PI/2));
    g.add(mkMesh(new THREE.TorusGeometry(0.065,0.006,4,10),iron).translateX(-0.3).translateY(0.56).translateZ(0.12).rotateX(Math.PI/2));
    // Water surface (reflective blue)
    g.add(mkMesh(new THREE.CylinderGeometry(0.055,0.055,0.005,8),glass).translateX(-0.3).translateY(0.645).translateZ(0.12));
    // Bucket handle
    g.add(mkMesh(new THREE.TorusGeometry(0.06,0.003,3,6,Math.PI),iron).translateX(-0.3).translateY(0.68).translateZ(0.12));

    // Powder horn (curved, brass-tipped)
    g.add(mkMesh(new THREE.CylinderGeometry(0.022,0.035,0.12,8),powder).translateX(0.32).translateY(0.62).translateZ(0.08).rotateZ(0.4));
    g.add(mkMesh(new THREE.CylinderGeometry(0.01,0.015,0.02,6),brass).translateX(0.37).translateY(0.68).translateZ(0.08).rotateZ(0.4));
    // Strap
    g.add(mkMesh(new THREE.BoxGeometry(0.003,0.15,0.015),mkMat(0x3a2010)).translateX(0.32).translateY(0.6).translateZ(0.08).rotateZ(0.2));

    // Rammer/sponge tool leaning on side
    g.add(mkMesh(new THREE.CylinderGeometry(0.01,0.01,0.6,5),wood).translateX(0.42).translateY(0.4).translateZ(-0.1).rotateZ(0.4));
    // Rammer head (cylinder wrap)
    g.add(mkMesh(new THREE.CylinderGeometry(0.035,0.035,0.08,6),sandbagCloth).translateX(0.52).translateY(0.64).translateZ(-0.1).rotateZ(0.4));

    // Scorch marks on barrel
    [[0.0,0.56,0.25],[0.03,0.58,0.35],[-0.04,0.57,0.3]].forEach(p=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.014,5,4),scorch2).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    });

    // Extra cannonballs on ground (rolled out of pyramid)
    [[0.1,0.08,0.35],[-0.06,0.08,0.32],[0.25,0.08,0.3]].forEach(p=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.04,8,6),mkMat(0x222,{metalness:0.55})).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    });

    // Match cord holder (slow-burning rope with glowing ember)
    g.add(mkMesh(new THREE.CylinderGeometry(0.006,0.008,0.16,5),wood).translateX(0.16).translateY(0.72).translateZ(-0.1).rotateZ(-0.2));
    g.add(mkMesh(new THREE.CylinderGeometry(0.005,0.005,0.12,4),mkMat(0x3a2a10)).translateX(0.18).translateY(0.82).translateZ(-0.1));
    // Glowing ember at the tip
    g.add(mkMesh(new THREE.SphereGeometry(0.012,5,4),emberGlow).translateX(0.19).translateY(0.88).translateZ(-0.1));

    // Spyglass on platform (brass telescope)
    g.add(mkMesh(new THREE.CylinderGeometry(0.012,0.014,0.12,8),brass).translateX(0.08).translateY(0.54).translateZ(-0.1).rotateZ(Math.PI/2));
    g.add(mkMesh(new THREE.CylinderGeometry(0.01,0.012,0.08,8),brass).translateX(0.16).translateY(0.54).translateZ(-0.1).rotateZ(Math.PI/2));
    // Glass lens
    g.add(mkMesh(new THREE.CylinderGeometry(0.011,0.011,0.003,8),glass).translateX(0.2).translateY(0.54).translateZ(-0.1).rotateZ(Math.PI/2));

    // Crew silhouette — loader kneeling beside cannon
    g.add(mkMesh(new THREE.CylinderGeometry(0.04,0.045,0.12,6),crewCloth2).translateX(0.35).translateY(0.62).translateZ(0.05));
    g.add(mkMesh(new THREE.SphereGeometry(0.035,6,5),crewSkin2).translateX(0.35).translateY(0.72).translateZ(0.05));
    // Crew hat
    g.add(mkMesh(new THREE.CylinderGeometry(0.04,0.045,0.03,6),iron).translateX(0.35).translateY(0.75).translateZ(0.05));
    // Crew arm reaching toward powder
    g.add(mkMesh(new THREE.CylinderGeometry(0.013,0.011,0.1,4),crewCloth2).translateX(0.32).translateY(0.64).translateZ(0.08).rotateZ(0.5));

    // Additional powder keg (small, beside cannon)
    g.add(mkMesh(new THREE.CylinderGeometry(0.05,0.05,0.1,8),woodL).translateX(-0.15).translateY(0.6).translateZ(0.1));
    g.add(mkMesh(new THREE.TorusGeometry(0.052,0.005,4,10),iron).translateX(-0.15).translateY(0.63).translateZ(0.1).rotateX(Math.PI/2));
    g.add(mkMesh(new THREE.TorusGeometry(0.052,0.005,4,10),iron).translateX(-0.15).translateY(0.57).translateZ(0.1).rotateX(Math.PI/2));
    // Powder symbol (dark X marking)
    g.add(mkMesh(new THREE.BoxGeometry(0.015,0.003,0.003),scorch2).translateX(-0.1).translateY(0.6).translateZ(0.1).rotateZ(Math.PI/4));
    g.add(mkMesh(new THREE.BoxGeometry(0.015,0.003,0.003),scorch2).translateX(-0.1).translateY(0.6).translateZ(0.1).rotateZ(-Math.PI/4));

  }
  return g;
}

// ==================== WALL & BARRICADE ====================
function createWall(owner){
  const g=new THREE.Group();
  const sc=0x8a8a7a,oc=ownerAccent(owner);
  const r1=(sc>>16&0xFF)*0.85+(oc>>16&0xFF)*0.15;
  const g1=(sc>>8&0xFF)*0.85+(oc>>8&0xFF)*0.15;
  const b1=(sc&0xFF)*0.85+(oc&0xFF)*0.15;
  const tinted=(Math.floor(r1)<<16)|(Math.floor(g1)<<8)|Math.floor(b1);
  const dark=mkMat(0x6a6a5a),vdark=mkMat(0x5a5a4a);
  const wallH=0.9;
  // Foundation
  g.add(mkMesh(new THREE.BoxGeometry(0.92,0.08,0.92),dark).translateY(0.04));
  // Main wall body - taller
  g.add(mkMesh(new THREE.BoxGeometry(0.85,wallH,0.85),mkMat(tinted)).translateY(0.08+wallH/2));
  // Stone block lines (horizontal grooves for texture)
  [0.25,0.5,0.75].forEach(frac=>{
    const y=0.08+wallH*frac;
    g.add(mkMesh(new THREE.BoxGeometry(0.87,0.015,0.87),vdark).translateY(y));
  });
  // Top ledge
  g.add(mkMesh(new THREE.BoxGeometry(0.92,0.06,0.92),dark).translateY(0.08+wallH+0.03));
  // Crenellations - more merlons for proper battlement look
  const mTop=0.08+wallH+0.06;
  [[-0.3,-0.3],[-0.3,0],[-.3,.3],[0,-.3],[0,.3],[.3,-.3],[.3,0],[.3,.3]].forEach(([dx,dz])=>{
    g.add(mkMesh(new THREE.BoxGeometry(0.12,0.16,0.12),vdark).translateX(dx).translateY(mTop+0.08).translateZ(dz));
  });
  // Team color accent strip
  g.add(mkMesh(new THREE.BoxGeometry(0.87,0.06,0.02),mkMat(ownerAccent(owner))).translateY(0.08+wallH*0.6).translateZ(0.43));
  g.add(mkMesh(new THREE.BoxGeometry(0.02,0.06,0.87),mkMat(ownerAccent(owner))).translateY(0.08+wallH*0.6).translateX(0.43));

  // ============ v3.9 DETAIL PASS ============
  // Shared palette. Per-wall randomization is fine — walls aren't
  // pooled; each placement runs through the v3.5 merge+freeze pipe
  // individually, so variation between walls is free.
  const ivy=mkMat(0x2d5a2a,{roughness:0.9});
  const moss=mkMat(0x3a6a2a,{roughness:0.95});
  const iron=mkMat(0x2a2a2a,{metalness:0.55,roughness:0.35});
  const ironLight=mkMat(0x666677,{metalness:0.6,roughness:0.35});
  const torchFire=mkMat(0xff6622,{emissive:0xff3300,emissiveIntensity:2.2,transparent:true,opacity:0.9});
  const torchGlow=mkMat(0xffcc44,{emissive:0xff8822,emissiveIntensity:1.8,transparent:true,opacity:0.85});
  const scorchMat=mkMat(0x1a1510);
  const bloodStain=mkMat(0x6a0a0a,{emissive:0x220404,emissiveIntensity:0.3,roughness:0.9});

  // Vertical stone block seams (4 per face, centered between crenels)
  [-0.3,-0.1,0.1,0.3].forEach(dx=>{
    g.add(mkMesh(new THREE.BoxGeometry(0.008,wallH*0.9,0.86),vdark).translateX(dx).translateY(0.08+wallH/2));
  });
  [-0.3,-0.1,0.1,0.3].forEach(dz=>{
    g.add(mkMesh(new THREE.BoxGeometry(0.86,wallH*0.9,0.008),vdark).translateY(0.08+wallH/2).translateZ(dz));
  });

  // Arrow slits on 2 opposing sides (thin dark slots + defender glow)
  [-1,1].forEach(s=>{
    g.add(mkMesh(new THREE.BoxGeometry(0.03,0.26,0.005),mkMat(0x111111))
      .translateX(s*0.425).translateY(0.08+wallH*0.6));
    // Defender torchlight behind the slit
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.16,0.003),mkMat(0xffaa44,{emissive:0xff8822,emissiveIntensity:1.0}))
      .translateX(s*0.43).translateY(0.08+wallH*0.6));
  });

  // Moss patches at base (2-4 randomly placed)
  const __mossCount=2+(Math.random()*3|0);
  for(let i=0;i<__mossCount;i++){
    const mx=(Math.random()-0.5)*0.8;
    const mz=(Math.random()-0.5)*0.8;
    const edge=Math.random()<0.5?0.43:-0.43;
    g.add(mkMesh(new THREE.SphereGeometry(0.035+Math.random()*0.02,5,4),moss)
      .translateX(Math.abs(mx)>Math.abs(mz)?edge:mx).translateY(0.11+Math.random()*0.05).translateZ(Math.abs(mz)>=Math.abs(mx)?edge:mz));
  }

  // Ivy climbing one random face (trunk + leaf clusters)
  const ivyFace=Math.random()*4|0;
  const ivyDx=[0.43,-0.43,0,0][ivyFace];
  const ivyDz=[0,0,0.43,-0.43][ivyFace];
  g.add(mkMesh(new THREE.CylinderGeometry(0.008,0.008,wallH*0.85,4),ivy)
    .translateX(ivyDx).translateY(0.08+wallH*0.45).translateZ(ivyDz));
  for(let iy=0.15;iy<wallH-0.05;iy+=0.18){
    g.add(mkMesh(new THREE.SphereGeometry(0.035,5,4),ivy)
      .translateX(ivyDx+(ivyDx===0?(Math.random()-0.5)*0.1:(Math.random()-0.5)*0.05))
      .translateY(0.08+iy)
      .translateZ(ivyDz+(ivyDz===0?(Math.random()-0.5)*0.1:(Math.random()-0.5)*0.05)));
  }

  // Battle damage — 1-3 scorch marks on the outer walls
  const __scorchCount=1+(Math.random()*3|0);
  for(let i=0;i<__scorchCount;i++){
    const side=Math.random()<0.5?1:-1;
    const vert=Math.random()<0.5;
    g.add(mkMesh(new THREE.BoxGeometry(vert?0.005:0.06,0.05,vert?0.06:0.005),scorchMat)
      .translateX(vert?0.432*side:(Math.random()-0.5)*0.6)
      .translateY(0.2+Math.random()*wallH*0.6)
      .translateZ(vert?(Math.random()-0.5)*0.6:0.432*side));
  }

  // Rivet pattern on one face (decorative studs)
  const rivetFace=Math.random()<0.5?1:-1;
  for(let rr=0;rr<4;rr++){
    g.add(mkMesh(new THREE.SphereGeometry(0.012,4,3),ironLight)
      .translateX(-0.25+rr*0.17).translateY(0.25).translateZ(0.434*rivetFace));
  }

  // Wall torch on one merlon (50% chance; if present, glows at night)
  if(Math.random()<0.6){
    const torchDx=(Math.random()*3-1)*0.3;
    const torchDz=Math.random()<0.5?0.3:-0.3;
    // Bracket
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.03,0.025),iron).translateX(torchDx).translateY(mTop+0.18).translateZ(torchDz));
    // Fire core
    g.add(mkMesh(new THREE.SphereGeometry(0.035,6,5),torchFire).translateX(torchDx).translateY(mTop+0.22).translateZ(torchDz));
    // Flame cone
    g.add(mkMesh(new THREE.ConeGeometry(0.03,0.09,5),torchGlow).translateX(torchDx).translateY(mTop+0.29).translateZ(torchDz));
  }

  // Defender helmet peeking from behind the crenellations (one random merlon gap)
  if(Math.random()<0.5){
    const hx=(Math.random()*3-1)*0.3;
    const hz=Math.random()<0.5?0.3:-0.3;
    // Helmet dome peeking over the top
    g.add(mkMesh(new THREE.SphereGeometry(0.05,6,4,0,Math.PI*2,0,Math.PI*0.5),iron)
      .translateX(hx).translateY(mTop+0.14).translateZ(hz*0.5));
    // Crest plume (team color)
    g.add(mkMesh(new THREE.BoxGeometry(0.005,0.02,0.04),mkMat(ownerAccent(owner)))
      .translateX(hx).translateY(mTop+0.18).translateZ(hz*0.5));
  }

  // Blood stains on outer face (rare, 30% chance)
  if(Math.random()<0.3){
    const bs=Math.random()<0.5?1:-1;
    g.add(mkMesh(new THREE.BoxGeometry(0.004,0.1,0.015),bloodStain)
      .translateX(0.434*bs).translateY(0.5).translateZ((Math.random()-0.5)*0.4));
  }

  // Small rubble pile at base (some walls only)
  if(Math.random()<0.4){
    const rbx=(Math.random()-0.5)*0.6;
    const rbz=0.43*(Math.random()<0.5?1:-1);
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.035,0),vdark).translateX(rbx).translateY(0.1).translateZ(rbz));
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.028,0),dark).translateX(rbx+0.05).translateY(0.1).translateZ(rbz-0.03));
  }

  return g;
}
function createBarricade(owner){
  const g=new THREE.Group();
  const wood=mkMat(0x8B5A2B),woodD=mkMat(0x6B3A1B),woodL=mkMat(0x9B6A3B);
  const metal=mkMat(0x555555,{metalness:0.3});
  // Base frame
  g.add(mkMesh(new THREE.BoxGeometry(0.88,0.06,0.88),mkMat(ownerAccent(owner))).translateY(0.03));
  g.add(mkMesh(new THREE.BoxGeometry(0.82,0.06,0.82),woodD).translateY(0.09));
  // X-frame supports (two crossed logs on each side)
  const addXBrace=(zOff)=>{
    const b1=mkMesh(new THREE.BoxGeometry(0.06,0.55,0.06),wood);
    b1.position.set(0,0.35,zOff);b1.rotation.z=0.35;g.add(b1);
    const b2=mkMesh(new THREE.BoxGeometry(0.06,0.55,0.06),wood);
    b2.position.set(0,0.35,zOff);b2.rotation.z=-0.35;g.add(b2);
  };
  addXBrace(-0.25);addXBrace(0.25);
  // Horizontal rails - three levels
  g.add(mkMesh(new THREE.BoxGeometry(0.82,0.05,0.05),woodD).translateY(0.15));
  g.add(mkMesh(new THREE.BoxGeometry(0.82,0.05,0.05),woodD).translateY(0.35));
  g.add(mkMesh(new THREE.BoxGeometry(0.82,0.05,0.05),woodD).translateY(0.55));
  // Pointed stakes - more of them, varied heights
  for(let i=-3;i<=3;i++){
    const h=0.6+Math.random()*0.2;
    const x=i*0.12;
    // Stake body
    g.add(mkMesh(new THREE.BoxGeometry(0.05,h,0.05),woodL).translateX(x).translateY(h/2+0.06));
    // Sharp pointed tip
    g.add(mkMesh(new THREE.ConeGeometry(0.04,0.14,4),woodD).translateX(x).translateY(h+0.13).rotateY(Math.PI/4));
  }
  // Outward-angled spikes (the threatening ones)
  for(let i=-2;i<=2;i++){
    const spike=mkMesh(new THREE.ConeGeometry(0.025,0.35,4),woodD);
    spike.position.set(i*0.18,0.35,0.42);spike.rotation.x=-0.6;g.add(spike);
    const spike2=mkMesh(new THREE.ConeGeometry(0.025,0.35,4),woodD);
    spike2.position.set(i*0.18,0.35,-0.42);spike2.rotation.x=0.6;g.add(spike2);
  }
  // Metal binding bands
  g.add(mkMesh(new THREE.BoxGeometry(0.84,0.025,0.025),metal).translateY(0.25));
  g.add(mkMesh(new THREE.BoxGeometry(0.84,0.025,0.025),metal).translateY(0.45));

  // ============ v3.9 DETAIL PASS ============
  const rope=mkMat(0xaa8855,{roughness:0.85});
  const bone=mkMat(0xeeeecc,{roughness:0.55});
  const boneDark=mkMat(0xaaaa88,{roughness:0.6});
  const ironB=mkMat(0x3a3a3a,{metalness:0.55,roughness:0.4});
  const bloodStain2=mkMat(0x6a0a0a,{emissive:0x220404,emissiveIntensity:0.4,roughness:0.9});
  const mudMat=mkMat(0x2a1808,{roughness:0.95});
  const ragMat=mkMat(owner===1?0x1a3d7a:0x7a1a3d,{roughness:0.85});
  const torchFireB=mkMat(0xff6622,{emissive:0xff3300,emissiveIntensity:2.2,transparent:true,opacity:0.9});
  const torchGlowB=mkMat(0xffcc44,{emissive:0xff8822,emissiveIntensity:1.8,transparent:true,opacity:0.85});

  // Rope lashings at X-frame joints
  [-0.25,0.25].forEach(zOff=>{
    g.add(mkMesh(new THREE.TorusGeometry(0.035,0.006,4,10),rope).translateY(0.35).translateZ(zOff).rotateY(Math.PI/2));
    g.add(mkMesh(new THREE.TorusGeometry(0.032,0.005,4,8),rope).translateY(0.36).translateZ(zOff).rotateY(Math.PI/2).rotateZ(0.3));
  });

  // Impaled skull on center stake (trophy display, every other barricade)
  if(Math.random()<0.5){
    const skullY=0.85+Math.random()*0.05;
    g.add(mkMesh(new THREE.SphereGeometry(0.04,7,6),bone).translateY(skullY));
    // Eye sockets
    [-0.012,0.012].forEach(ex=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.007,4,3),mkMat(0x111100)).translateX(ex).translateY(skullY+0.005).translateZ(0.028));
    });
    // Jaw
    g.add(mkMesh(new THREE.BoxGeometry(0.04,0.008,0.02),bone).translateY(skullY-0.018).translateZ(0.018));
    // Tiny teeth
    [-0.01,0,0.01].forEach(tx=>{
      g.add(mkMesh(new THREE.ConeGeometry(0.003,0.008,3),bone).translateX(tx).translateY(skullY-0.02).translateZ(0.025).rotateX(Math.PI));
    });
  }

  // Extra scattered animal bones on top bar (ribs/femur fragments)
  for(let bi=0;bi<3;bi++){
    g.add(mkMesh(new THREE.CylinderGeometry(0.006,0.006,0.05,4),boneDark)
      .translateX(-0.3+bi*0.3+(Math.random()-0.5)*0.05)
      .translateY(0.6)
      .translateZ((Math.random()-0.5)*0.15).rotateZ(Math.PI/2+Math.random()*0.4));
  }

  // Iron reinforcement plates (nailed on the X-braces)
  [-0.25,0.25].forEach(zOff=>{
    g.add(mkMesh(new THREE.BoxGeometry(0.08,0.08,0.008),ironB).translateY(0.35).translateZ(zOff));
    // Rivets on plate (4 corners)
    for(let rx=-1;rx<=1;rx+=2)for(let ry=-1;ry<=1;ry+=2){
      g.add(mkMesh(new THREE.SphereGeometry(0.006,4,3),mkMat(0x888899,{metalness:0.7}))
        .translateX(rx*0.03).translateY(0.35+ry*0.03).translateZ(zOff+0.005));
    }
  });

  // Blood on outward spikes (kill markers, 50% chance per spike side)
  if(Math.random()<0.5){
    g.add(mkMesh(new THREE.SphereGeometry(0.015,5,4),bloodStain2).translateX(-0.36).translateY(0.35).translateZ(0.55));
    g.add(mkMesh(new THREE.SphereGeometry(0.012,5,4),bloodStain2).translateX(0,0).translateY(0.33).translateZ(0.58));
  }
  if(Math.random()<0.5){
    g.add(mkMesh(new THREE.SphereGeometry(0.013,5,4),bloodStain2).translateX(0.18).translateY(0.36).translateZ(-0.55));
  }

  // Mud splatter at base (random)
  for(let mi=0;mi<4;mi++){
    g.add(mkMesh(new THREE.SphereGeometry(0.025+Math.random()*0.015,4,3),mudMat)
      .translateX((Math.random()-0.5)*0.8).translateY(0.06+Math.random()*0.03).translateZ((Math.random()-0.5)*0.8));
  }

  // Ragged cloth banner strip tied to top (team color)
  if(Math.random()<0.5){
    const ragX=(Math.random()*3-1)*0.2;
    g.add(mkMesh(new THREE.BoxGeometry(0.06,0.12,0.008),ragMat).translateX(ragX).translateY(0.7).translateZ(0));
    // Tattered bottom strips
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.05,0.008),ragMat).translateX(ragX-0.015).translateY(0.62).translateZ(0.002));
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.04,0.008),ragMat).translateX(ragX+0.015).translateY(0.625).translateZ(0.002));
    // Tie string
    g.add(mkMesh(new THREE.CylinderGeometry(0.002,0.002,0.04,3),rope).translateX(ragX).translateY(0.77));
  }

  // Small torch mounted on one end stake (emissive; stands out at night)
  if(Math.random()<0.4){
    const tx=Math.random()<0.5?-0.36:0.36;
    // Iron clamp
    g.add(mkMesh(new THREE.BoxGeometry(0.015,0.02,0.015),ironB).translateX(tx).translateY(0.7));
    // Fire core
    g.add(mkMesh(new THREE.SphereGeometry(0.03,6,5),torchFireB).translateX(tx).translateY(0.76));
    // Flame cone
    g.add(mkMesh(new THREE.ConeGeometry(0.025,0.07,5),torchGlowB).translateX(tx).translateY(0.82));
    // Bright spark
    g.add(mkMesh(new THREE.SphereGeometry(0.014,5,4),mkMat(0xffffcc,{emissive:0xffee88,emissiveIntensity:2.8,transparent:true,opacity:0.95}))
      .translateX(tx).translateY(0.78));
  }

  // Hanging shield on a side (round iron shield)
  if(Math.random()<0.4){
    const sdx=Math.random()<0.5?-0.42:0.42;
    g.add(mkMesh(new THREE.SphereGeometry(0.065,6,4,0,Math.PI*2,0,Math.PI*0.5),ironB).translateX(sdx).translateY(0.3).rotateZ(Math.PI/2));
    // Boss in middle
    g.add(mkMesh(new THREE.SphereGeometry(0.012,5,4),mkMat(0x666677,{metalness:0.7})).translateX(sdx).translateY(0.3).translateZ(0.002));
    // Team cross
    g.add(mkMesh(new THREE.BoxGeometry(0.003,0.07,0.006),mkMat(ownerAccent(owner))).translateX(sdx).translateY(0.3));
    g.add(mkMesh(new THREE.BoxGeometry(0.003,0.006,0.07),mkMat(ownerAccent(owner))).translateX(sdx).translateY(0.3));
  }

  // Thorny brambles twisted around a stake (small spheres + tiny spikes)
  for(let ti=0;ti<4;ti++){
    const tax=-0.4+ti*0.27;
    const tay=0.3+(ti%2)*0.08;
    g.add(mkMesh(new THREE.SphereGeometry(0.012,5,4),mkMat(0x2a1a08)).translateX(tax).translateY(tay).translateZ(0.05));
    g.add(mkMesh(new THREE.ConeGeometry(0.004,0.015,3),mkMat(0x3a2a1a)).translateX(tax).translateY(tay+0.01).translateZ(0.06).rotateX(0.3));
  }

  return g;
}

// ==================== ENEMY MODELS ====================
function createEnemyModel(type,owner){
  const g=new THREE.Group();
  const acMat=mkMat(ownerAccent(owner));
  const acMetalMat=mkMat(ownerAccent(owner),{metalness:0.3,roughness:0.6});

  if(type==='goblin'){
    // --- GOBLIN: small, sneaky, green, pointy features ---
    const skin=mkMat(0x4a8c38);
    const darkSkin=mkMat(0x3a7028);
    const cloth=mkMat(0x5a4a2a);
    const leather=mkMat(0x4a3a1a,{roughness:0.8});

    // Legs - cylinder with boot cuffs
    [-0.045,0.045].forEach((x,idx)=>{
      const legGrp=new THREE.Group();
      legGrp.userData.limb=idx===0?'leftLeg':'rightLeg';
      legGrp.userData.origY=0.08;legGrp.userData.origRotX=0;
      legGrp.position.set(x,0.08,0);
      legGrp.add(mkMesh(new THREE.CylinderGeometry(0.025,0.03,0.1,6),skin));
      // Boots
      legGrp.add(mkMesh(new THREE.CylinderGeometry(0.032,0.035,0.05,6),leather).translateY(-0.04));
      // Boot cuff
      legGrp.add(mkMesh(new THREE.TorusGeometry(0.032,0.006,4,6),leather).translateY(-0.015));
      g.add(legGrp);
    });

    // Torso - tapered using lathe
    const torsoShape=[new THREE.Vector2(0,0),new THREE.Vector2(0.08,0),new THREE.Vector2(0.09,0.04),new THREE.Vector2(0.07,0.12),new THREE.Vector2(0,0.14)];
    g.add(mkMesh(new THREE.LatheGeometry(torsoShape,8),cloth).translateY(0.15));

    // Belt
    g.add(mkMesh(new THREE.TorusGeometry(0.075,0.01,4,8),leather).translateY(0.17));
    // Belt buckle
    g.add(mkMesh(new THREE.BoxGeometry(0.02,0.02,0.005),mkMat(0xccaa44,{metalness:0.6})).translateY(0.17).translateZ(0.075));

    // Arms - thin cylinders
    [-1,1].forEach((s,idx)=>{
      const armGrp=new THREE.Group();
      armGrp.userData.limb=idx===0?'leftArm':'rightArm';
      armGrp.userData.origY=0.26;armGrp.userData.origRotX=0;
      armGrp.position.set(s*0.1,0.26,0);
      // Upper arm
      const ua=mkMesh(new THREE.CylinderGeometry(0.02,0.018,0.08,5),skin);
      ua.rotation.z=s*0.3;armGrp.add(ua);
      // Forearm
      const fa=mkMesh(new THREE.CylinderGeometry(0.018,0.015,0.07,5),skin);
      fa.rotation.z=s*0.6;fa.position.set(s*0.03,-0.05,0);armGrp.add(fa);
      // Bracer
      const br=mkMesh(new THREE.CylinderGeometry(0.02,0.02,0.03,5),leather);
      br.rotation.z=s*0.6;br.position.set(s*0.02,-0.04,0);armGrp.add(br);
      g.add(armGrp);
    });

    // Head - slightly squished sphere
    const head=mkMesh(new THREE.SphereGeometry(0.08,8,6),skin);
    head.scale.set(1,0.9,0.95);head.position.y=0.38;g.add(head);

    // Pointy chin
    const chin=mkMesh(new THREE.ConeGeometry(0.03,0.04,5),skin);
    chin.rotation.x=0.3;chin.position.set(0,0.32,0.05);g.add(chin);

    // Big pointy ears
    [-1,1].forEach(s=>{
      const ear=mkMesh(new THREE.ConeGeometry(0.025,0.1,4),skin);
      ear.rotation.z=s*0.9;ear.rotation.x=-0.1;
      ear.position.set(s*0.09,0.39,0);g.add(ear);
      // Inner ear
      const inner=mkMesh(new THREE.ConeGeometry(0.015,0.06,4),mkMat(0x5a9a48));
      inner.rotation.z=s*0.9;inner.rotation.x=-0.1;
      inner.position.set(s*0.085,0.39,0.005);g.add(inner);
    });

    // Eyes - big, yellow, menacing
    const eyeWhite=mkMat(0xffff44,{emissive:0xcccc00,emissiveIntensity:0.5});
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.02,6,5),eyeWhite).translateX(s*0.035).translateY(0.395).translateZ(0.06));
      // Pupils - slit-like
      g.add(mkMesh(new THREE.SphereGeometry(0.01,4,4),mkMat(0x111100)).translateX(s*0.035).translateY(0.395).translateZ(0.075));
      // Brow ridge
      const brow=mkMesh(new THREE.BoxGeometry(0.03,0.008,0.015),darkSkin);
      brow.rotation.z=s*-0.2;brow.position.set(s*0.035,0.415,0.06);g.add(brow);
    });

    // Nose - pointy
    g.add(mkMesh(new THREE.ConeGeometry(0.012,0.03,4),skin).translateY(0.375).translateZ(0.075));

    // Mouth - wicked grin
    g.add(mkMesh(new THREE.BoxGeometry(0.04,0.006,0.01),mkMat(0x2a1a0a)).translateY(0.355).translateZ(0.07));
    // Teeth
    [-0.012,0,0.012].forEach(x=>{
      g.add(mkMesh(new THREE.ConeGeometry(0.004,0.01,3),mkMat(0xeeeecc)).translateX(x).translateY(0.35).translateZ(0.072));
    });

    // Dagger in right hand
    const blade=mkMat(0xaaaaaa,{metalness:0.7,roughness:0.3});
    const dagger=mkMesh(new THREE.BoxGeometry(0.012,0.08,0.005),blade);
    dagger.position.set(0.16,0.16,0);g.add(dagger);
    // Dagger hilt
    g.add(mkMesh(new THREE.CylinderGeometry(0.008,0.008,0.025,5),mkMat(0x4a2a0a)).translateX(0.16).translateY(0.115));
    // Dagger guard
    g.add(mkMesh(new THREE.BoxGeometry(0.03,0.005,0.01),mkMat(0x886622,{metalness:0.4})).translateX(0.16).translateY(0.13));

    // Team accent - hood/bandana
    const hood=mkMesh(new THREE.SphereGeometry(0.083,8,4,0,Math.PI*2,0,Math.PI*0.5),acMat);
    hood.position.y=0.39;g.add(hood);
    // Hood trim / stitching
    g.add(mkMesh(new THREE.TorusGeometry(0.083,0.005,4,10),mkMat(0x3a1a10)).translateY(0.39).rotateX(Math.PI/2));
    // Tattered cloak/cape draped from shoulders (team accent, darker)
    const cloakMat=mkMat(owner===1?0x1a3060:0x601a30,{roughness:0.85});
    const cloak=mkMesh(new THREE.BoxGeometry(0.18,0.2,0.02),cloakMat);
    cloak.position.set(0,0.22,-0.075);g.add(cloak);
    // Tattered bottom edge of cloak (3 small drops)
    [-0.06,0,0.06].forEach(cx=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.05,0.04,0.02),cloakMat).translateX(cx).translateY(0.1).translateZ(-0.075));
    });
    // Belt pouch
    g.add(mkMesh(new THREE.BoxGeometry(0.04,0.045,0.025),leather).translateX(-0.05).translateY(0.15).translateZ(0.075));
    g.add(mkMesh(new THREE.BoxGeometry(0.04,0.01,0.028),mkMat(0x3a2208)).translateX(-0.05).translateY(0.17).translateZ(0.076));
    // Claws on both hands (small cone points)
    [-1,1].forEach(s=>{
      for(let f=0;f<3;f++){
        const claw=mkMesh(new THREE.ConeGeometry(0.003,0.012,3),mkMat(0x1a0a0a));
        claw.position.set(s*0.13,0.16+(f-1)*0.005,0.005+f*0.003);
        claw.rotation.z=-s*Math.PI/2;
        g.add(claw);
      }
    });
    // War-paint stripes on cheeks (2 per side)
    const warPaint=mkMat(0xaa1010,{emissive:0x661010,emissiveIntensity:0.4});
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.02,0.005,0.003),warPaint).translateX(s*0.05).translateY(0.38).translateZ(0.07));
      g.add(mkMesh(new THREE.BoxGeometry(0.018,0.005,0.003),warPaint).translateX(s*0.048).translateY(0.372).translateZ(0.068));
    });
    // Small belt fur tuft
    g.add(mkMesh(new THREE.BoxGeometry(0.03,0.025,0.015),mkMat(0x3a2208)).translateX(0.04).translateY(0.155).translateZ(0.075));

    // ============ v3.2 DETAIL PASS ============
    // Shared materials (reuse these so they canonicalize into fewer draw calls)
    const goblinMuscle=mkMat(0x3e7a28,{roughness:0.75});
    const goblinDark=mkMat(0x2a5018,{roughness:0.85});
    const poisonGlow=mkMat(0x66ff44,{emissive:0x33aa22,emissiveIntensity:0.9,transparent:true,opacity:0.85});
    const steelMat=mkMat(0xbbbbcc,{metalness:0.75,roughness:0.2});
    const goldMat=mkMat(0xccaa44,{metalness:0.7,roughness:0.3});
    const bone=mkMat(0xeeeecc,{roughness:0.5});

    // Warts on skin — small dark bumps on head and shoulders
    [[0.03,0.4,0.06],[-0.04,0.39,0.065],[0.05,0.37,0.055],[-0.02,0.405,0.07],
     [0.07,0.41,0.04],[-0.06,0.4,0.05],[0,0.415,0.06]].forEach(p=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.005,4,3),goblinDark).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    });

    // Extra wart-bumps on torso
    [[0.04,0.2,0.08],[-0.03,0.18,0.085],[0.02,0.12,0.08]].forEach(p=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.004,4,3),goblinDark).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    });

    // Lower jaw teeth row (4 tiny fangs)
    [-0.015,-0.005,0.005,0.015].forEach(x=>{
      g.add(mkMesh(new THREE.ConeGeometry(0.003,0.008,3),mkMat(0xccccaa)).translateX(x).translateY(0.345).translateZ(0.072).rotateX(Math.PI));
    });
    // Tongue peeking out
    g.add(mkMesh(new THREE.BoxGeometry(0.012,0.005,0.008),mkMat(0xcc4466)).translateY(0.347).translateZ(0.077));

    // Fang protruding on side of mouth (bigger single tooth)
    g.add(mkMesh(new THREE.ConeGeometry(0.005,0.015,4),bone).translateX(0.015).translateY(0.348).translateZ(0.073).rotateZ(0.2));

    // Scar across left eye — diagonal dark line
    g.add(mkMesh(new THREE.BoxGeometry(0.025,0.003,0.003),goblinDark).translateX(-0.035).translateY(0.4).translateZ(0.078).rotateZ(0.4));
    // Stitch marks on scar
    [-0.008,0,0.008].forEach(dx=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.003,0.005,0.003),goblinDark).translateX(-0.035+dx).translateY(0.4).translateZ(0.079));
    });

    // Messy hair tufts sticking out of hood (3 spikes up top)
    [-0.02,0,0.02].forEach((hx,i)=>{
      g.add(mkMesh(new THREE.ConeGeometry(0.008,0.025,4),goblinDark).translateX(hx).translateY(0.45+i*0.002).translateZ(0.01).rotateX(-0.3));
    });
    // Side hair wisps
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.ConeGeometry(0.005,0.018,3),goblinDark).translateX(s*0.08).translateY(0.43).translateZ(0.01).rotateZ(s*0.4));
    });

    // Bicep bumps on upper arms (muscle definition)
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.012,5,4),goblinMuscle).translateX(s*0.11).translateY(0.28).translateZ(0.008));
    });

    // Knuckle claws on fists (sharper, longer — 3 per hand)
    [-1,1].forEach(s=>{
      for(let k=0;k<3;k++){
        const cl=mkMesh(new THREE.ConeGeometry(0.0035,0.018,3),mkMat(0x221100));
        cl.position.set(s*0.14,0.15+(k-1)*0.006,0.012);
        cl.rotation.z=-s*Math.PI/2;cl.rotation.x=0.1;
        g.add(cl);
      }
    });

    // Hunched back spinal ridge — 4 small bumps along spine
    [0.1,0.14,0.18,0.22].forEach(y=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.008,4,3),goblinDark).translateY(y).translateZ(-0.07));
    });
    // Larger shoulder blade bumps
    [-0.05,0.05].forEach(x=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.015,5,4),goblinMuscle).translateX(x).translateY(0.22).translateZ(-0.08));
    });

    // Poison vial on left belt — glowing green flask
    g.add(mkMesh(new THREE.CylinderGeometry(0.012,0.012,0.028,6),poisonGlow).translateX(0.04).translateY(0.15).translateZ(0.078));
    // Vial cork
    g.add(mkMesh(new THREE.CylinderGeometry(0.008,0.008,0.006,5),mkMat(0x4a2a08)).translateX(0.04).translateY(0.17).translateZ(0.078));
    // Vial neck
    g.add(mkMesh(new THREE.CylinderGeometry(0.005,0.005,0.005,5),poisonGlow).translateX(0.04).translateY(0.166).translateZ(0.078));

    // Tiny skull trinket hanging from belt (on opposite side from vial)
    g.add(mkMesh(new THREE.SphereGeometry(0.012,5,4),bone).translateX(-0.04).translateY(0.135).translateZ(0.08));
    // Skull eye sockets (dark)
    [-0.004,0.004].forEach(sx=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.002,4,3),mkMat(0x111100)).translateX(-0.04+sx).translateY(0.137).translateZ(0.09));
    });
    // Skull cord to belt
    g.add(mkMesh(new THREE.CylinderGeometry(0.001,0.001,0.02,3),leather).translateX(-0.04).translateY(0.155).translateZ(0.078));

    // Bone necklace — 3 small bones on a cord
    [-0.03,0,0.03].forEach(x=>{
      g.add(mkMesh(new THREE.CylinderGeometry(0.004,0.004,0.012,4),bone).translateX(x).translateY(0.29).translateZ(0.075).rotateZ(Math.PI/2));
    });

    // Leather shoulder strap (diagonal across chest)
    const gobStrap=mkMesh(new THREE.BoxGeometry(0.014,0.2,0.005),leather);
    gobStrap.rotation.z=0.45;gobStrap.position.set(0,0.24,0.076);g.add(gobStrap);
    // Strap studs (3 along the strap)
    [-0.04,0,0.04].forEach(dy=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.003,4,3),goldMat).translateX(-dy*0.4).translateY(0.24+dy).translateZ(0.078));
    });

    // Dagger blade upgrade — add a poison-coated shimmer near the tip (emissive thin box on blade)
    g.add(mkMesh(new THREE.BoxGeometry(0.009,0.04,0.003),poisonGlow).translateX(0.16).translateY(0.18).translateZ(0.001));
    // Jagged blade notches (3 small cones on the side of the blade)
    [0.15,0.17,0.19].forEach(y=>{
      g.add(mkMesh(new THREE.ConeGeometry(0.002,0.006,3),steelMat).translateX(0.167).translateY(y).rotateZ(-Math.PI/2));
    });

    // Earring — single gold hoop on left ear
    g.add(mkMesh(new THREE.TorusGeometry(0.007,0.0015,3,8),goldMat).translateX(-0.1).translateY(0.37).translateZ(0.005).rotateY(Math.PI/2));

    // Septum ring (nose piercing)
    g.add(mkMesh(new THREE.TorusGeometry(0.004,0.001,3,8),goldMat).translateY(0.37).translateZ(0.082).rotateX(Math.PI/2));

  }else if(type==='orc'){
    // --- ORC: large, muscular, dark green, imposing ---
    const skin=mkMat(0x2d5a1e);
    const darkSkin=mkMat(0x1e4a10);
    const loincloth=mkMat(0x5a3a1a,{roughness:0.9});
    const metal=mkMat(0x666666,{metalness:0.5,roughness:0.4});

    // Legs - thick cylinders
    [-0.08,0.08].forEach((x,idx)=>{
      const legGrp=new THREE.Group();
      legGrp.userData.limb=idx===0?'leftLeg':'rightLeg';
      legGrp.userData.origY=0.14;legGrp.userData.origRotX=0;
      legGrp.position.set(x,0.14,0);
      // Thigh
      legGrp.add(mkMesh(new THREE.CylinderGeometry(0.05,0.045,0.12,7),skin));
      // Shin
      legGrp.add(mkMesh(new THREE.CylinderGeometry(0.04,0.045,0.1,7),skin).translateY(-0.08));
      // Knee pad
      legGrp.add(mkMesh(new THREE.SphereGeometry(0.03,5,4),metal).translateY(-0.04).translateZ(0.025));
      // Boot
      legGrp.add(mkMesh(new THREE.CylinderGeometry(0.048,0.05,0.04,7),loincloth).translateY(-0.11));
      g.add(legGrp);
    });

    // Torso - large and muscular using lathe
    const torsoProfile=[new THREE.Vector2(0,0),new THREE.Vector2(0.14,0),new THREE.Vector2(0.16,0.06),new THREE.Vector2(0.15,0.12),new THREE.Vector2(0.12,0.2),new THREE.Vector2(0,0.22)];
    g.add(mkMesh(new THREE.LatheGeometry(torsoProfile,8),skin).translateY(0.24));

    // Chest plate / harness (accent)
    const chestShape=new THREE.Shape();
    chestShape.moveTo(-0.1,0);chestShape.lineTo(0.1,0);chestShape.lineTo(0.08,0.14);chestShape.lineTo(-0.08,0.14);chestShape.closePath();
    const chestGeo=new THREE.ExtrudeGeometry(chestShape,{depth:0.02,bevelEnabled:false});
    const chest=mkMesh(chestGeo,acMetalMat);
    chest.position.set(0,0.3,0.1);g.add(chest);

    // Belt
    g.add(mkMesh(new THREE.TorusGeometry(0.13,0.015,4,8),loincloth).translateY(0.26));
    // Skull belt buckle
    g.add(mkMesh(new THREE.SphereGeometry(0.02,5,4),mkMat(0xddddaa)).translateY(0.26).translateZ(0.13));

    // Loincloth front
    g.add(mkMesh(new THREE.BoxGeometry(0.1,0.08,0.015),loincloth).translateY(0.2).translateZ(0.07));

    // Shoulders - big pauldrons
    [-1,1].forEach((s,idx)=>{
      // Shoulder muscle
      const shl=mkMesh(new THREE.SphereGeometry(0.06,6,5),skin);
      shl.scale.set(1,0.8,0.8);shl.position.set(s*0.17,0.44,0);g.add(shl);
      // Shoulder pad (accent)
      const pad=mkMesh(new THREE.SphereGeometry(0.055,6,4,0,Math.PI*2,0,Math.PI*0.6),acMetalMat);
      pad.position.set(s*0.17,0.46,0);g.add(pad);
      // Spike on pauldron
      const spike=mkMesh(new THREE.ConeGeometry(0.015,0.06,4),metal);
      spike.position.set(s*0.2,0.49,0);g.add(spike);
      // Arm group for animation
      const armGrp=new THREE.Group();
      armGrp.userData.limb=idx===0?'leftArm':'rightArm';
      armGrp.userData.origY=0.36;armGrp.userData.origRotX=0;
      armGrp.position.set(s*0.18,0.36,0);
      // Upper arm
      armGrp.add(mkMesh(new THREE.CylinderGeometry(0.04,0.035,0.1,6),skin));
      // Forearm
      const fa=mkMesh(new THREE.CylinderGeometry(0.035,0.04,0.1,6),skin);
      fa.rotation.z=s*0.4;fa.position.set(s*0.04,-0.06,0);armGrp.add(fa);
      // Bracer
      const br=mkMesh(new THREE.CylinderGeometry(0.042,0.042,0.04,6),metal);
      br.rotation.z=s*0.4;br.position.set(s*0.03,-0.05,0);armGrp.add(br);
      g.add(armGrp);
    });

    // Head
    const head=mkMesh(new THREE.SphereGeometry(0.1,8,6),skin);
    head.scale.set(1,0.9,0.9);head.position.y=0.56;g.add(head);

    // Jaw - pronounced
    g.add(mkMesh(new THREE.BoxGeometry(0.12,0.04,0.08),skin).translateY(0.5).translateZ(0.03));

    // Brow ridge
    g.add(mkMesh(new THREE.BoxGeometry(0.14,0.02,0.04),darkSkin).translateY(0.58).translateZ(0.07));

    // Eyes - small, angry, red-tinged
    const orcEye=mkMat(0xff4400,{emissive:0xcc2200,emissiveIntensity:0.4});
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.015,5,4),orcEye).translateX(s*0.04).translateY(0.565).translateZ(0.075));
    });

    // Tusks - big upward-pointing
    [-0.04,0.04].forEach(x=>{
      const tusk=mkMesh(new THREE.ConeGeometry(0.015,0.06,5),mkMat(0xeeeecc,{roughness:0.5}));
      tusk.rotation.x=-0.3;tusk.position.set(x,0.49,0.1);g.add(tusk);
    });

    // Nose - flat and wide
    g.add(mkMesh(new THREE.SphereGeometry(0.02,5,4),darkSkin).translateY(0.545).translateZ(0.09));

    // War club in right hand
    const wood=mkMat(0x6b4226,{roughness:0.9});
    g.add(mkMesh(new THREE.CylinderGeometry(0.02,0.018,0.25,6),wood).translateX(0.26).translateY(0.2));
    // Club head
    g.add(mkMesh(new THREE.SphereGeometry(0.045,6,5),wood).translateX(0.26).translateY(0.34));
    // Spikes on club
    [0,1,2,3].forEach(i=>{
      const sp=mkMesh(new THREE.ConeGeometry(0.01,0.03,4),metal);
      const a=i*Math.PI/2;
      sp.position.set(0.26+Math.cos(a)*0.04,0.34,Math.sin(a)*0.04);
      sp.rotation.z=Math.cos(a)*0.5;sp.rotation.x=Math.sin(a)*0.5;g.add(sp);
    });

    // War paint stripes across face (horizontal band)
    const orcPaint=mkMat(0xcc2222,{emissive:0x881111,emissiveIntensity:0.5});
    g.add(mkMesh(new THREE.BoxGeometry(0.16,0.01,0.003),orcPaint).translateY(0.575).translateZ(0.09));
    // Vertical war paint stripes under eyes
    [-0.04,0.04].forEach(x=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.008,0.025,0.003),orcPaint).translateX(x).translateY(0.54).translateZ(0.085));
    });
    // Second set of smaller tusks (lower)
    [-0.025,0.025].forEach(x=>{
      const tk=mkMesh(new THREE.ConeGeometry(0.01,0.035,5),mkMat(0xeeeecc,{roughness:0.5}));
      tk.rotation.x=-0.25;tk.position.set(x,0.5,0.11);g.add(tk);
    });
    // Bone necklace (three bone shapes around neck)
    const boneMat=mkMat(0xddd0a8,{roughness:0.6});
    [-0.06,-0.02,0.02,0.06].forEach(x=>{
      g.add(mkMesh(new THREE.CylinderGeometry(0.008,0.008,0.025,4),boneMat).translateX(x).translateY(0.46).translateZ(0.11).rotateX(Math.PI/2));
    });
    // Necklace cord
    g.add(mkMesh(new THREE.TorusGeometry(0.08,0.003,3,12),mkMat(0x3a2208)).translateY(0.47).translateZ(0.08).rotateX(0.2));
    // X leather strap across chest
    const strap1=mkMesh(new THREE.BoxGeometry(0.025,0.3,0.008),mkMat(0x4a2a0a,{roughness:0.85}));
    strap1.rotation.z=0.35;strap1.position.set(0,0.34,0.1);g.add(strap1);
    const strap2=mkMesh(new THREE.BoxGeometry(0.025,0.3,0.008),mkMat(0x4a2a0a,{roughness:0.85}));
    strap2.rotation.z=-0.35;strap2.position.set(0,0.34,0.1);g.add(strap2);
    // Central strap buckle
    g.add(mkMesh(new THREE.BoxGeometry(0.025,0.025,0.01),mkMat(0x886622,{metalness:0.6})).translateY(0.34).translateZ(0.11));
    // Tribal arm band (left arm)
    g.add(mkMesh(new THREE.TorusGeometry(0.038,0.006,4,10),mkMat(0x886622,{metalness:0.5})).translateX(-0.18).translateY(0.36).rotateY(Math.PI/2));
    // Tattoo stripes on upper arms (3 bands per arm)
    [-1,1].forEach(s=>{
      for(let b=0;b<3;b++){
        g.add(mkMesh(new THREE.TorusGeometry(0.04,0.002,3,8),mkMat(0x1a3a0a))
          .translateX(s*0.18).translateY(0.4-b*0.03).rotateY(Math.PI/2));
      }
    });
    // Scar across chest (diagonal dark line)
    g.add(mkMesh(new THREE.BoxGeometry(0.12,0.004,0.003),darkSkin).translateY(0.32).translateZ(0.115).rotateZ(-0.4));
    // Tattered loincloth hanging strips
    [-0.05,0,0.05].forEach(x=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.035,0.1,0.008),loincloth).translateX(x).translateY(0.13).translateZ(0.07));
    });

    // ============ v3.2 DETAIL PASS ============
    const orcMuscle=mkMat(0x3a6e22,{roughness:0.7});
    const orcVein=mkMat(0x1a3a0a);
    const rustyIron=mkMat(0x554433,{metalness:0.4,roughness:0.7});
    const bloodStain=mkMat(0x6a0a0a,{emissive:0x330505,emissiveIntensity:0.3,roughness:0.9});
    const orcBone=mkMat(0xddd0a8,{roughness:0.55});
    const orcGold=mkMat(0xaa7722,{metalness:0.6,roughness:0.4});

    // Pectoral muscles (two bulges on chest)
    [-1,1].forEach(s=>{
      const pec=mkMesh(new THREE.SphereGeometry(0.055,6,5),orcMuscle);
      pec.scale.set(1,0.8,0.6);
      pec.position.set(s*0.06,0.36,0.08);
      g.add(pec);
    });
    // Abdominal definition — 6-pack (2 rows of 3)
    for(let r=0;r<2;r++)for(let c=-1;c<=1;c++){
      g.add(mkMesh(new THREE.SphereGeometry(0.022,5,4),orcMuscle).translateX(c*0.04).translateY(0.24-r*0.035).translateZ(0.1));
    }

    // Bicep bulges on upper arms
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.022,5,4),orcMuscle).translateX(s*0.19).translateY(0.4).translateZ(0.012));
    });
    // Tricep bumps (back of arms)
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.018,5,4),orcMuscle).translateX(s*0.19).translateY(0.39).translateZ(-0.015));
    });

    // Bulging neck trapezius muscles
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.028,5,4),orcMuscle).translateX(s*0.06).translateY(0.47).translateZ(0.02));
    });
    // Thick neck
    g.add(mkMesh(new THREE.CylinderGeometry(0.042,0.05,0.05,7),skin).translateY(0.47));

    // Mohawk crest down the middle of head (5 spikes of increasing then decreasing height)
    const mohawkHeights=[0.02,0.035,0.045,0.035,0.02];
    mohawkHeights.forEach((h,i)=>{
      g.add(mkMesh(new THREE.ConeGeometry(0.008,h,4),darkSkin).translateX((i-2)*0.012).translateY(0.66+h*0.5).translateZ(-0.005));
    });

    // Ear tusks / piercings — 3 gold hoops on each ear
    [-1,1].forEach(s=>{
      [0.005,0.015,0.025].forEach(dz=>{
        g.add(mkMesh(new THREE.TorusGeometry(0.006,0.0015,3,8),orcGold).translateX(s*0.1).translateY(0.55-dz).translateZ(0).rotateY(Math.PI/2));
      });
    });

    // Nose ring — big bull ring
    g.add(mkMesh(new THREE.TorusGeometry(0.012,0.0025,4,10),orcGold).translateY(0.535).translateZ(0.103).rotateX(Math.PI/2));

    // Iron spiked collar around neck
    g.add(mkMesh(new THREE.TorusGeometry(0.055,0.012,4,10),rustyIron).translateY(0.47));
    // Collar spikes (8 around)
    for(let a=0;a<8;a++){
      const ang=a*Math.PI/4;
      const sp=mkMesh(new THREE.ConeGeometry(0.008,0.025,4),metal);
      sp.position.set(Math.cos(ang)*0.056,0.47,Math.sin(ang)*0.056);
      sp.rotation.z=-Math.cos(ang)*Math.PI/2;sp.rotation.x=Math.sin(ang)*Math.PI/2;
      g.add(sp);
    }

    // Skull pauldrons sitting on top of shoulders
    [-1,1].forEach(s=>{
      // Skull dome
      g.add(mkMesh(new THREE.SphereGeometry(0.035,6,5),orcBone).translateX(s*0.19).translateY(0.5).translateZ(-0.01));
      // Skull eye sockets
      [-0.01,0.01].forEach(ex=>{
        g.add(mkMesh(new THREE.SphereGeometry(0.006,4,3),mkMat(0x111100)).translateX(s*0.19+ex).translateY(0.503).translateZ(0.02));
      });
      // Skull jaw line
      g.add(mkMesh(new THREE.BoxGeometry(0.035,0.005,0.02),orcBone).translateX(s*0.19).translateY(0.488).translateZ(0.015));
    });

    // Rib visibility — dark stripes on torso sides
    [-1,1].forEach(s=>{
      for(let r=0;r<4;r++){
        g.add(mkMesh(new THREE.BoxGeometry(0.02,0.003,0.004),orcVein).translateX(s*0.12).translateY(0.28-r*0.025).translateZ(0.06));
      }
    });

    // Blood spatter on chest and club head
    [[0.05,0.32,0.12],[-0.04,0.28,0.115],[0.02,0.36,0.118]].forEach(p=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.008,4,3),bloodStain).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    });
    // Blood on club head (crimson stain)
    g.add(mkMesh(new THREE.SphereGeometry(0.018,5,4),bloodStain).translateX(0.26).translateY(0.35).translateZ(0.02));
    g.add(mkMesh(new THREE.SphereGeometry(0.014,5,4),bloodStain).translateX(0.255).translateY(0.33).translateZ(-0.015));

    // Additional tusks (curved, going sideways — for fiercer look)
    [-1,1].forEach(s=>{
      const bigTusk=mkMesh(new THREE.ConeGeometry(0.012,0.05,5),orcBone);
      bigTusk.position.set(s*0.055,0.485,0.09);
      bigTusk.rotation.x=-0.2;bigTusk.rotation.z=s*0.3;
      g.add(bigTusk);
    });

    // Knuckle dusters on fists
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.04,0.02,0.025),rustyIron).translateX(s*0.24).translateY(0.15));
      // Knuckle spikes
      for(let k=0;k<3;k++){
        g.add(mkMesh(new THREE.ConeGeometry(0.005,0.012,4),metal).translateX(s*0.24).translateY(0.15+(k-1)*0.008).translateZ(0.016));
      }
    });

    // Skull trophy on belt (trophy of fallen enemies)
    g.add(mkMesh(new THREE.SphereGeometry(0.022,6,5),orcBone).translateX(-0.1).translateY(0.18).translateZ(0.08));
    [-0.006,0.006].forEach(ex=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.004,4,3),mkMat(0x111100)).translateX(-0.1+ex).translateY(0.183).translateZ(0.1));
    });
    // Trophy chain
    g.add(mkMesh(new THREE.CylinderGeometry(0.002,0.002,0.08,4),rustyIron).translateX(-0.1).translateY(0.23).translateZ(0.075));

    // Open wound / battle cut on side (dark gash)
    g.add(mkMesh(new THREE.BoxGeometry(0.004,0.05,0.005),bloodStain).translateX(0.13).translateY(0.3).translateZ(0.075).rotateZ(0.3));

    // Iron shoulder plates (additional armor over pauldrons)
    [-1,1].forEach(s=>{
      const plate=mkMesh(new THREE.SphereGeometry(0.058,6,4,0,Math.PI*2,0,Math.PI*0.5),rustyIron);
      plate.position.set(s*0.17,0.49,0);
      g.add(plate);
      // Rivets on plate
      for(let r=0;r<4;r++){
        const ra=r*Math.PI/2+Math.PI/4;
        g.add(mkMesh(new THREE.SphereGeometry(0.004,4,3),metal).translateX(s*0.17+Math.cos(ra)*0.045).translateY(0.49).translateZ(Math.sin(ra)*0.045));
      }
    });

  }else if(type==='darkKnight'){
    // --- DARK KNIGHT: armored warrior, sword & shield, intimidating ---
    const armor=mkMat(0x44445a,{metalness:0.6,roughness:0.3});
    const darkArmor=mkMat(0x333344,{metalness:0.7,roughness:0.25});
    const chainmail=mkMat(0x666680,{metalness:0.5,roughness:0.4});
    const skinTone=mkMat(0x888888);
    const blade=mkMat(0xccccdd,{metalness:0.8,roughness:0.15});

    // Legs - armored
    [-0.06,0.06].forEach((x,idx)=>{
      const legGrp=new THREE.Group();
      legGrp.userData.limb=idx===0?'leftLeg':'rightLeg';
      legGrp.userData.origY=0.14;legGrp.userData.origRotX=0;
      legGrp.position.set(x,0.14,0);
      // Thigh armor
      legGrp.add(mkMesh(new THREE.CylinderGeometry(0.04,0.038,0.1,6),armor));
      // Knee cop
      legGrp.add(mkMesh(new THREE.SphereGeometry(0.03,5,4),darkArmor).translateY(-0.04).translateZ(0.02));
      // Greave
      legGrp.add(mkMesh(new THREE.CylinderGeometry(0.035,0.04,0.08,6),armor).translateY(-0.08));
      // Sabaton (foot armor)
      const foot=mkMesh(new THREE.BoxGeometry(0.05,0.025,0.06),armor);
      foot.position.set(0,-0.12,0.01);legGrp.add(foot);
      g.add(legGrp);
    });

    // Torso - armored cuirass using lathe
    const cuirassProfile=[new THREE.Vector2(0,0),new THREE.Vector2(0.11,0),new THREE.Vector2(0.12,0.05),new THREE.Vector2(0.12,0.12),new THREE.Vector2(0.1,0.18),new THREE.Vector2(0,0.2)];
    g.add(mkMesh(new THREE.LatheGeometry(cuirassProfile,8),armor).translateY(0.22));

    // Chest cross / tabard (accent color)
    const tabardShape=new THREE.Shape();
    tabardShape.moveTo(-0.04,0);tabardShape.lineTo(0.04,0);tabardShape.lineTo(0.03,0.15);tabardShape.lineTo(-0.03,0.15);tabardShape.closePath();
    const tabardGeo=new THREE.ExtrudeGeometry(tabardShape,{depth:0.01,bevelEnabled:false});
    const tabard=mkMesh(tabardGeo,acMat);
    tabard.position.set(0,0.25,0.1);g.add(tabard);
    // Cross on tabard
    g.add(mkMesh(new THREE.BoxGeometry(0.05,0.008,0.005),acMat).translateY(0.36).translateZ(0.115));
    g.add(mkMesh(new THREE.BoxGeometry(0.008,0.05,0.005),acMat).translateY(0.35).translateZ(0.115));

    // Gorget (neck armor)
    g.add(mkMesh(new THREE.TorusGeometry(0.06,0.015,4,8),darkArmor).translateY(0.44));

    // Shoulders - layered pauldrons
    [-1,1].forEach((s,idx)=>{
      // Base pauldron
      const p1=mkMesh(new THREE.SphereGeometry(0.05,6,4,0,Math.PI*2,0,Math.PI*0.6),armor);
      p1.position.set(s*0.14,0.43,0);g.add(p1);
      // Layered plate
      const p2=mkMesh(new THREE.SphereGeometry(0.04,6,3,0,Math.PI*2,0,Math.PI*0.5),darkArmor);
      p2.position.set(s*0.14,0.44,0);g.add(p2);
      // Rivet
      g.add(mkMesh(new THREE.SphereGeometry(0.006,4,3),mkMat(0x888899,{metalness:0.7})).translateX(s*0.14).translateY(0.46).translateZ(0.03));
      // Arm group for animation
      const armGrp=new THREE.Group();
      armGrp.userData.limb=idx===0?'leftArm':'rightArm';
      armGrp.userData.origY=0.36;armGrp.userData.origRotX=0;
      armGrp.position.set(s*0.15,0.36,0);
      // Upper arm armor
      armGrp.add(mkMesh(new THREE.CylinderGeometry(0.032,0.028,0.08,6),chainmail));
      // Vambrace (forearm armor)
      const vb=mkMesh(new THREE.CylinderGeometry(0.03,0.032,0.07,6),armor);
      vb.rotation.z=s*0.3;vb.position.set(s*0.02,-0.06,0);armGrp.add(vb);
      // Gauntlet
      const ga=mkMesh(new THREE.BoxGeometry(0.03,0.025,0.03),darkArmor);
      ga.position.set(s*0.04,-0.1,0);armGrp.add(ga);
      g.add(armGrp);
    });

    // Helmet - great helm style
    const helmetBase=mkMesh(new THREE.CylinderGeometry(0.075,0.07,0.12,8),armor);
    helmetBase.position.y=0.53;g.add(helmetBase);
    // Helmet dome
    g.add(mkMesh(new THREE.SphereGeometry(0.076,8,4,0,Math.PI*2,0,Math.PI*0.5),armor).translateY(0.59));
    // Visor slit (eyes)
    g.add(mkMesh(new THREE.BoxGeometry(0.1,0.012,0.01),mkMat(0x111122,{emissive:0x222244,emissiveIntensity:0.3})).translateY(0.54).translateZ(0.07));
    // Eye glow behind visor
    [-0.025,0.025].forEach(x=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.006,4,3),mkMat(0x4466ff,{emissive:0x3355cc,emissiveIntensity:0.8})).translateX(x).translateY(0.54).translateZ(0.065));
    });
    // Helmet nose guard
    g.add(mkMesh(new THREE.BoxGeometry(0.012,0.08,0.015),armor).translateY(0.53).translateZ(0.073));
    // Helmet crest / plume (accent)
    const crestProfile=[new THREE.Vector2(0,0),new THREE.Vector2(0.02,0.01),new THREE.Vector2(0.025,0.04),new THREE.Vector2(0.015,0.1),new THREE.Vector2(0,0.12)];
    const crest=mkMesh(new THREE.LatheGeometry(crestProfile,6),acMat);
    crest.rotation.x=-Math.PI/2;crest.position.set(0,0.6,-0.02);g.add(crest);

    // SHIELD - left hand, detailed
    const shieldGroup=new THREE.Group();
    // Shield body - curved using extrude
    const shieldShape=new THREE.Shape();
    shieldShape.moveTo(0,-0.1);shieldShape.quadraticCurveTo(0.08,-0.08,0.08,0);
    shieldShape.quadraticCurveTo(0.08,0.06,0.04,0.1);shieldShape.lineTo(0,0.12);
    shieldShape.lineTo(-0.04,0.1);shieldShape.quadraticCurveTo(-0.08,0.06,-0.08,0);
    shieldShape.quadraticCurveTo(-0.08,-0.08,0,-0.1);
    const shieldGeo=new THREE.ExtrudeGeometry(shieldShape,{depth:0.02,bevelEnabled:true,bevelThickness:0.005,bevelSize:0.005,bevelSegments:1});
    shieldGroup.add(mkMesh(shieldGeo,acMetalMat));
    // Shield boss (center bump)
    shieldGroup.add(mkMesh(new THREE.SphereGeometry(0.02,6,4),darkArmor).translateZ(0.025));
    // Shield rim
    shieldGroup.add(mkMesh(new THREE.TorusGeometry(0.065,0.005,4,8),darkArmor).translateZ(0.015));
    shieldGroup.position.set(-0.2,0.32,0.06);
    shieldGroup.rotation.y=0.2;g.add(shieldGroup);

    // SWORD - right hand, detailed
    const swordGroup=new THREE.Group();
    // Blade
    swordGroup.add(mkMesh(new THREE.BoxGeometry(0.02,0.22,0.006),blade).translateY(0.11));
    // Blade edge taper
    swordGroup.add(mkMesh(new THREE.ConeGeometry(0.01,0.04,4),blade).translateY(0.24));
    // Fuller (groove in blade - darker line)
    swordGroup.add(mkMesh(new THREE.BoxGeometry(0.006,0.16,0.002),mkMat(0x999aaa,{metalness:0.9})).translateY(0.1).translateZ(0.004));
    // Cross-guard
    swordGroup.add(mkMesh(new THREE.BoxGeometry(0.07,0.012,0.015),mkMat(0x886622,{metalness:0.5})));
    // Grip
    swordGroup.add(mkMesh(new THREE.CylinderGeometry(0.01,0.01,0.06,6),mkMat(0x3a2a1a,{roughness:0.9})).translateY(-0.03));
    // Pommel
    swordGroup.add(mkMesh(new THREE.SphereGeometry(0.015,5,4),mkMat(0x886622,{metalness:0.5})).translateY(-0.065));
    swordGroup.position.set(0.2,0.18,0.03);g.add(swordGroup);

    // Flowing cape behind the knight (team accent color)
    const capeMat=mkMat(owner===1?0x1a3d7a:0x7a1a3d,{roughness:0.7});
    const cape=mkMesh(new THREE.BoxGeometry(0.24,0.4,0.015),capeMat);
    cape.position.set(0,0.28,-0.11);g.add(cape);
    // Cape shoulder clasps (gold discs)
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.CylinderGeometry(0.012,0.012,0.008,8),mkMat(0xccaa44,{metalness:0.7}))
        .translateX(s*0.1).translateY(0.46).translateZ(-0.015).rotateX(Math.PI/2));
    });
    // Cape trim (bottom fringe)
    g.add(mkMesh(new THREE.BoxGeometry(0.24,0.02,0.017),darkArmor).translateY(0.09).translateZ(-0.11));
    // Cape tattered tails
    [-0.08,0,0.08].forEach(cx=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.06,0.06,0.015),capeMat).translateX(cx).translateY(0.05).translateZ(-0.11));
    });
    // Chainmail skirt under cuirass
    const mailMat=mkMat(0x555566,{metalness:0.55,roughness:0.5});
    g.add(mkMesh(new THREE.CylinderGeometry(0.11,0.1,0.08,12),mailMat).translateY(0.15));
    // Chainmail detail bands
    [0.12,0.16,0.19].forEach(y=>{
      g.add(mkMesh(new THREE.TorusGeometry(0.11,0.003,3,14),mkMat(0x666680)).translateY(y).rotateX(Math.PI/2));
    });
    // Helmet horns (bull-style)
    [-1,1].forEach(s=>{
      const horn=mkMesh(new THREE.ConeGeometry(0.018,0.08,6),darkArmor);
      horn.position.set(s*0.075,0.62,0);
      horn.rotation.z=s*1.1;
      g.add(horn);
      // Horn tip
      g.add(mkMesh(new THREE.SphereGeometry(0.008,5,4),mkMat(0x222233)).translateX(s*0.11).translateY(0.645));
    });
    // Helmet rivets around the base
    for(let a=0;a<8;a++){
      const ang=a*Math.PI/4;
      g.add(mkMesh(new THREE.SphereGeometry(0.005,4,3),mkMat(0x888899,{metalness:0.7}))
        .translateX(Math.cos(ang)*0.075).translateY(0.48).translateZ(Math.sin(ang)*0.075));
    }
    // Pommel gem (team colored, emissive)
    g.add(mkMesh(new THREE.SphereGeometry(0.008,6,5),
      mkMat(owner===1?0x3388ff:0xff3388,{emissive:owner===1?0x1144aa:0xaa1144,emissiveIntensity:1.2}))
      .translateX(0.2).translateY(0.12).translateZ(0.03));
    // Shield boss detail - team cross
    g.add(mkMesh(new THREE.BoxGeometry(0.06,0.012,0.004),acMat).translateX(-0.2).translateY(0.32).translateZ(0.09));
    g.add(mkMesh(new THREE.BoxGeometry(0.012,0.06,0.004),acMat).translateX(-0.2).translateY(0.32).translateZ(0.09));
    // Belt / sword-belt across waist
    g.add(mkMesh(new THREE.TorusGeometry(0.12,0.01,4,12),mkMat(0x2a1808,{roughness:0.85})).translateY(0.24));
    // Belt buckle (large)
    g.add(mkMesh(new THREE.BoxGeometry(0.025,0.02,0.01),mkMat(0xccaa44,{metalness:0.7})).translateY(0.24).translateZ(0.12));

    // ============ v3.2 DETAIL PASS ============
    const dkSteel=mkMat(0x5a5a6a,{metalness:0.7,roughness:0.25});
    const dkDarkSteel=mkMat(0x28283a,{metalness:0.75,roughness:0.2});
    const dkGold=mkMat(0xd4b04a,{metalness:0.85,roughness:0.25});
    const dkRune=mkMat(owner===1?0x66aaff:0xff66aa,{emissive:owner===1?0x2266cc:0xcc2266,emissiveIntensity:1.3});
    const dkBloodRed=mkMat(0x8a1a1a,{emissive:0x3a0505,emissiveIntensity:0.4,metalness:0.3,roughness:0.6});
    const dkChain=mkMat(0x6a6a7a,{metalness:0.55,roughness:0.45});

    // Cuirass ornate trim — raised gold band along the top
    g.add(mkMesh(new THREE.TorusGeometry(0.12,0.008,4,16),dkGold).translateY(0.42));
    // Bottom trim
    g.add(mkMesh(new THREE.TorusGeometry(0.11,0.006,4,16),dkGold).translateY(0.22));
    // Vertical gold ribs on cuirass (3 on each side of the tabard)
    [-0.08,-0.05,0.05,0.08].forEach(x=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.006,0.14,0.005),dkGold).translateX(x).translateY(0.3).translateZ(0.11));
    });

    // Glowing runes on chest (3 small emissive symbols on each side of cross)
    [[0.06,0.28],[0.06,0.32],[0.06,0.36],[-0.06,0.28],[-0.06,0.32],[-0.06,0.36]].forEach(p=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.012,0.012,0.002),dkRune).translateX(p[0]).translateY(p[1]).translateZ(0.118));
    });

    // Rivet pattern around cuirass (12 rivets)
    for(let a=0;a<12;a++){
      const ang=a*Math.PI/6;
      g.add(mkMesh(new THREE.SphereGeometry(0.005,4,3),mkMat(0x888899,{metalness:0.8}))
        .translateX(Math.cos(ang)*0.115).translateY(0.32).translateZ(Math.sin(ang)*0.115));
    }

    // Layered pauldron — extra lower lame under each shoulder plate
    [-1,1].forEach(s=>{
      const lame=mkMesh(new THREE.SphereGeometry(0.048,6,3,0,Math.PI*2,0,Math.PI*0.45),dkDarkSteel);
      lame.position.set(s*0.14,0.39,0);
      g.add(lame);
      // Extra pauldron spike (large, curved outward)
      const spk=mkMesh(new THREE.ConeGeometry(0.012,0.05,6),dkSteel);
      spk.position.set(s*0.17,0.47,-0.01);
      spk.rotation.z=s*0.6;spk.rotation.x=-0.3;
      g.add(spk);
      // Second smaller spike
      const spk2=mkMesh(new THREE.ConeGeometry(0.008,0.03,5),dkSteel);
      spk2.position.set(s*0.18,0.44,0);
      spk2.rotation.z=s*0.8;
      g.add(spk2);
    });

    // Articulated elbow cop (visible joint armor)
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.025,5,4),dkDarkSteel).translateX(s*0.17).translateY(0.3).translateZ(0));
    });

    // Gauntlet knuckle plates (4 small cubes per hand)
    [-1,1].forEach(s=>{
      for(let k=0;k<4;k++){
        g.add(mkMesh(new THREE.BoxGeometry(0.009,0.008,0.008),dkDarkSteel)
          .translateX(s*0.19).translateY(0.14+(k-1.5)*0.007).translateZ(0.013));
      }
    });

    // Helmet decorative ridge (mohawk-style along top of helm)
    for(let i=0;i<5;i++){
      g.add(mkMesh(new THREE.BoxGeometry(0.01,0.015,0.015-i*0.001),dkDarkSteel).translateY(0.62+i*0.005).translateZ(-0.02+i*0.008));
    }

    // Helmet face grille / breathing slits (3 horizontal bars below visor)
    [0.528,0.522,0.516].forEach(y=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.06,0.003,0.004),dkDarkSteel).translateY(y).translateZ(0.073));
    });

    // Cheek plates on helmet
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.015,0.04,0.015),armor).translateX(s*0.065).translateY(0.525).translateZ(0.05));
    });

    // Crown of gold band around helmet base
    g.add(mkMesh(new THREE.TorusGeometry(0.078,0.005,4,16),dkGold).translateY(0.475));
    // Gold stud spikes on crown (6)
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      g.add(mkMesh(new THREE.ConeGeometry(0.006,0.015,4),dkGold).translateX(Math.cos(a)*0.08).translateY(0.485).translateZ(Math.sin(a)*0.08));
    }

    // Chainmail coif beneath helmet (visible around face)
    g.add(mkMesh(new THREE.TorusGeometry(0.08,0.012,5,16),dkChain).translateY(0.465));

    // Sword blade runes (thin emissive stripe down the center)
    g.add(mkMesh(new THREE.BoxGeometry(0.004,0.18,0.003),dkRune).translateX(0.2).translateY(0.2).translateZ(0.033));
    // Sword blade battle damage — small nicks on edge
    [0.12,0.18,0.25].forEach(y=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.004,0.006,0.004),dkDarkSteel).translateX(0.211).translateY(y).translateZ(0.03));
    });

    // Shield boss gem (glowing, team color)
    g.add(mkMesh(new THREE.SphereGeometry(0.01,6,5),dkRune).translateX(-0.2).translateY(0.32).translateZ(0.094));
    // Shield rim studs (8 around the rim)
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      g.add(mkMesh(new THREE.SphereGeometry(0.004,4,3),dkGold)
        .translateX(-0.2+Math.cos(a)*0.072).translateY(0.32+Math.sin(a)*0.072).translateZ(0.09));
    }
    // Shield diagonal bracing (iron bands forming an X)
    const sBrace1=mkMesh(new THREE.BoxGeometry(0.006,0.16,0.003),dkDarkSteel);
    sBrace1.rotation.z=0.6;sBrace1.position.set(-0.2,0.32,0.088);g.add(sBrace1);
    const sBrace2=mkMesh(new THREE.BoxGeometry(0.006,0.16,0.003),dkDarkSteel);
    sBrace2.rotation.z=-0.6;sBrace2.position.set(-0.2,0.32,0.088);g.add(sBrace2);

    // Cape segmented fringe (instead of 3 simple tails, make 5 curved strips)
    for(let i=0;i<5;i++){
      const cx=(i-2)*0.04;
      g.add(mkMesh(new THREE.BoxGeometry(0.03,0.07-Math.abs(i-2)*0.01,0.012),capeMat).translateX(cx).translateY(0.06).translateZ(-0.112));
    }
    // Cape inner lining (slightly lighter color peek-through at top)
    g.add(mkMesh(new THREE.BoxGeometry(0.22,0.03,0.013),dkGold).translateY(0.45).translateZ(-0.108));

    // Knee cops with spike
    [-0.06,0.06].forEach(x=>{
      g.add(mkMesh(new THREE.ConeGeometry(0.012,0.025,5),dkSteel).translateX(x).translateY(0.1).translateZ(0.045).rotateX(-0.3));
    });

    // Belt pouches (left and right)
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.028,0.035,0.02),mkMat(0x3a2208,{roughness:0.85})).translateX(s*0.08).translateY(0.21).translateZ(0.1));
      // Pouch flap
      g.add(mkMesh(new THREE.BoxGeometry(0.028,0.008,0.022),mkMat(0x2a1808,{roughness:0.85})).translateX(s*0.08).translateY(0.225).translateZ(0.101));
    });

    // Chain pendant hanging from neck (medallion)
    g.add(mkMesh(new THREE.CylinderGeometry(0.001,0.001,0.04,3),dkChain).translateY(0.42).translateZ(0.11));
    g.add(mkMesh(new THREE.CylinderGeometry(0.012,0.012,0.004,8),dkGold).translateY(0.4).translateZ(0.115));
    g.add(mkMesh(new THREE.SphereGeometry(0.005,5,4),dkRune).translateY(0.4).translateZ(0.118));

    // Blood stains on armor
    [[0.09,0.3,0.115],[-0.05,0.35,0.113],[0.03,0.25,0.116]].forEach(p=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.007,4,3),dkBloodRed).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    });

    // Greave highlights — gold accent line down front of each shin
    [-0.06,0.06].forEach(x=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.004,0.08,0.003),dkGold).translateX(x).translateY(0.08).translateZ(0.042));
    });

  }else if(type==='troll'){
    // --- TROLL: massive brute, slow, huge HP, crushing melee ---
    const skin=mkMat(0x4a6a2a);
    const darkSkin=mkMat(0x2a4a18);
    const muscle=mkMat(0x5a7a32,{roughness:0.7});
    const cloth=mkMat(0x3a2a10,{roughness:0.9});
    const wood=mkMat(0x3a2008,{roughness:0.9});
    const ironBand=mkMat(0x3a3a3a,{metalness:0.55,roughness:0.4});
    const bone=mkMat(0xddd0a8,{roughness:0.55});
    const moss=mkMat(0x3a6a2a,{roughness:0.95});
    const eyeRed=mkMat(0xff4400,{emissive:0xcc2200,emissiveIntensity:1.0});
    const tuskMat=mkMat(0xeeeecc,{roughness:0.4});

    // Thick legs with huge feet
    [-0.14,0.14].forEach((x,idx)=>{
      const legGrp=new THREE.Group();
      legGrp.userData.limb=idx===0?'leftLeg':'rightLeg';
      legGrp.position.set(x,0.26,0);
      // Thigh (thicker)
      legGrp.add(mkMesh(new THREE.CylinderGeometry(0.09,0.08,0.22,7),skin));
      // Knee bulge
      legGrp.add(mkMesh(new THREE.SphereGeometry(0.075,6,5),muscle).translateY(-0.12));
      // Shin
      legGrp.add(mkMesh(new THREE.CylinderGeometry(0.07,0.08,0.18,7),skin).translateY(-0.22));
      // Huge foot (3-toed)
      legGrp.add(mkMesh(new THREE.BoxGeometry(0.14,0.05,0.18),darkSkin).translateY(-0.33).translateZ(0.03));
      // Toe claws
      [-0.05,0,0.05].forEach(tx=>{
        legGrp.add(mkMesh(new THREE.ConeGeometry(0.015,0.04,4),bone).translateX(tx).translateY(-0.34).translateZ(0.12).rotateX(Math.PI/2));
      });
      g.add(legGrp);
    });

    // Massive torso — chunky lathe shape
    const trollTorso=[
      new THREE.Vector2(0,0),new THREE.Vector2(0.22,0),
      new THREE.Vector2(0.26,0.1),new THREE.Vector2(0.28,0.25),
      new THREE.Vector2(0.25,0.4),new THREE.Vector2(0.2,0.5),
      new THREE.Vector2(0,0.52),
    ];
    g.add(mkMesh(new THREE.LatheGeometry(trollTorso,10),skin).translateY(0.52));
    // Pec muscles
    [-1,1].forEach(s=>{
      const pec=mkMesh(new THREE.SphereGeometry(0.1,7,6),muscle);
      pec.scale.set(1,0.75,0.6);
      pec.position.set(s*0.1,0.82,0.16);
      g.add(pec);
    });
    // Big abdomen muscles (4-pack)
    for(let r=0;r<2;r++)for(let c=-1;c<=1;c+=2){
      g.add(mkMesh(new THREE.SphereGeometry(0.04,5,4),muscle).translateX(c*0.08).translateY(0.62-r*0.08).translateZ(0.19));
    }
    // Loincloth
    g.add(mkMesh(new THREE.CylinderGeometry(0.22,0.25,0.18,8),cloth).translateY(0.5));
    // Tattered strips
    [-0.12,0,0.12].forEach(x=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.08,0.15,0.02),cloth).translateX(x).translateY(0.35).translateZ(0.22));
    });
    // Iron belt studs
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      g.add(mkMesh(new THREE.SphereGeometry(0.015,4,3),ironBand).translateX(Math.cos(a)*0.24).translateY(0.52).translateZ(Math.sin(a)*0.24));
    }

    // Massive hunched shoulders
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.14,7,6),muscle).translateX(s*0.22).translateY(0.95).translateZ(-0.05));
      // Moss on shoulders
      g.add(mkMesh(new THREE.SphereGeometry(0.05,5,4),moss).translateX(s*0.22).translateY(1.02).translateZ(-0.08));
    });

    // Huge arms with limb groups
    [-1,1].forEach((s,idx)=>{
      const armGrp=new THREE.Group();
      armGrp.userData.limb=idx===0?'leftArm':'rightArm';
      armGrp.position.set(s*0.22,0.9,0);
      // Upper arm (thick)
      armGrp.add(mkMesh(new THREE.CylinderGeometry(0.08,0.09,0.22,7),skin));
      // Bicep bulge
      armGrp.add(mkMesh(new THREE.SphereGeometry(0.08,6,5),muscle).translateX(s*0.02).translateY(0.02).translateZ(0.04));
      // Elbow
      armGrp.add(mkMesh(new THREE.SphereGeometry(0.08,6,5),skin).translateY(-0.12));
      // Forearm (massive, wider at fist)
      const fa=mkMesh(new THREE.CylinderGeometry(0.08,0.11,0.28,7),skin);
      fa.rotation.z=s*0.3;
      fa.position.set(s*0.06,-0.25,0);
      armGrp.add(fa);
      // Giant fist
      const fist=mkMesh(new THREE.SphereGeometry(0.13,7,6),skin);
      fist.scale.set(1,0.9,1);
      fist.position.set(s*0.12,-0.4,0);
      armGrp.add(fist);
      // Knuckle spikes
      for(let k=0;k<4;k++){
        armGrp.add(mkMesh(new THREE.ConeGeometry(0.018,0.04,4),bone).translateX(s*0.16).translateY(-0.42+(k-1.5)*0.02).translateZ(0.1).rotateZ(-s*Math.PI/2));
      }
      g.add(armGrp);
    });

    // v3.18: Head wrapped in a pivot group so it bobs with walk.
    // Pivot at the neck (~1.0 world-local), everything above it
    // rotates together.
    const trollHead=new THREE.Group();
    trollHead.userData.limb='head';
    trollHead.position.set(0,1.0,0);
    // Head sphere
    trollHead.add(mkMesh(new THREE.SphereGeometry(0.17,10,8),skin).translateY(0.12));
    // Flat jaw
    trollHead.add(mkMesh(new THREE.BoxGeometry(0.24,0.08,0.18),skin).translateY(0.03).translateZ(0.05));
    // Brow ridge
    trollHead.add(mkMesh(new THREE.BoxGeometry(0.22,0.04,0.06),darkSkin).translateY(0.17).translateZ(0.14));
    // Tiny angry eyes
    [-1,1].forEach(s=>{
      trollHead.add(mkMesh(new THREE.SphereGeometry(0.018,5,4),eyeRed).translateX(s*0.06).translateY(0.13).translateZ(0.15));
    });
    // Huge upward tusks
    [-1,1].forEach(s=>{
      const tusk=mkMesh(new THREE.ConeGeometry(0.028,0.14,5),tuskMat);
      tusk.position.set(s*0.07,0.04,0.14);
      tusk.rotation.x=-0.2;
      trollHead.add(tusk);
    });
    // Nostrils (flat nose holes)
    [-0.02,0.02].forEach(x=>{
      trollHead.add(mkMesh(new THREE.SphereGeometry(0.01,4,3),darkSkin).translateX(x).translateY(0.08).translateZ(0.16));
    });
    // Mohawk tuft
    for(let i=0;i<4;i++){
      trollHead.add(mkMesh(new THREE.ConeGeometry(0.02,0.05+i*0.01,4),darkSkin).translateX((i-1.5)*0.02).translateY(0.26+i*0.005).translateZ(-0.02));
    }
    g.add(trollHead);

    // v3.18: Club in a weapon pivot group that swings with walk and
    // swings harder in combat. Pivot at the grip where the troll
    // holds it.
    const clubGrp=new THREE.Group();
    clubGrp.userData.limb='weapon';
    clubGrp.position.set(0.38,0.7,0.1);
    clubGrp.rotation.z=0.6;
    const club=new THREE.Group();
    club.add(mkMesh(new THREE.CylinderGeometry(0.04,0.06,0.5,6),wood));
    // Club head (thick end)
    club.add(mkMesh(new THREE.SphereGeometry(0.1,7,6),wood).translateY(0.22));
    // Spikes on club head
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      club.add(mkMesh(new THREE.ConeGeometry(0.02,0.08,4),ironBand)
        .translateX(Math.cos(a)*0.09).translateY(0.22).translateZ(Math.sin(a)*0.09)
        .rotateZ(Math.cos(a)*Math.PI/2).rotateX(-Math.sin(a)*Math.PI/2));
    }
    // Iron bands wrapping the club
    [0.1,0.0,-0.15].forEach(y=>{
      club.add(mkMesh(new THREE.TorusGeometry(0.045,0.008,4,10),ironBand).translateY(y).rotateX(Math.PI/2));
    });
    clubGrp.add(club);
    g.add(clubGrp);

    // ============ v3.19 TROLL DETAIL PASS ============
    const scarMat=mkMat(0x3a2a10,{roughness:0.9});
    const warPaint=mkMat(0xcc2222,{emissive:0x661010,emissiveIntensity:1.2});
    const bloodDrool=mkMat(0x5a0a0a,{emissive:0x220404,emissiveIntensity:0.5,transparent:true,opacity:0.9});
    const furMat=mkMat(0x2a1a08,{roughness:0.95});
    const chainMat=mkMat(0x3a3a3a,{metalness:0.6,roughness:0.4});
    const bracerMat=mkMat(0x554030,{metalness:0.45,roughness:0.6});
    // Battle scars across chest (4 diagonal slashes)
    [[0.04,0.88,0.15,0.35],[-0.06,0.78,0.16,-0.25],[0.02,0.68,0.17,0.15],[-0.08,0.92,0.14,-0.4]].forEach(p=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.005,0.12,0.005),scarMat).translateX(p[0]).translateY(p[1]).translateZ(p[2]).rotateZ(p[3]));
    });
    // Warts scattered on torso, arms, back
    [[0.08,0.86,0.18],[-0.1,0.75,0.16],[0.14,0.92,-0.1],[-0.12,0.82,-0.08],[0.2,0.42,-0.03],[-0.22,0.5,0.02]].forEach(p=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.018,5,4),darkSkin).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    });
    // Tribal war-paint stripes on biceps (emissive red)
    [-1,1].forEach(s=>{
      for(let i=0;i<3;i++){
        g.add(mkMesh(new THREE.BoxGeometry(0.03,0.008,0.01),warPaint).translateX(s*0.22).translateY(0.9-i*0.03).translateZ(0.06));
      }
    });
    // Fur shoulder pad on the left shoulder
    g.add(mkMesh(new THREE.SphereGeometry(0.11,7,6),furMat).translateX(-0.22).translateY(1.0).translateZ(-0.03));
    // Fur tufts (small spheres clustered)
    [[-0.2,1.05,-0.05],[-0.24,1.02,0.02],[-0.26,0.95,-0.02]].forEach(p=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.04,5,4),furMat).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    });
    // Iron bracer on the right arm (opposite of the fur pad side)
    g.add(mkMesh(new THREE.CylinderGeometry(0.085,0.085,0.08,8),bracerMat).translateX(0.28).translateY(0.78).rotateZ(0.2));
    // Rivets on the bracer
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      g.add(mkMesh(new THREE.SphereGeometry(0.008,4,3),chainMat).translateX(0.28+Math.cos(a)*0.09).translateY(0.78).translateZ(Math.sin(a)*0.09));
    }
    // Bone trophies hanging from belt (4 small bones)
    [-0.15,-0.05,0.05,0.15].forEach(x=>{
      g.add(mkMesh(new THREE.CylinderGeometry(0.008,0.008,0.08,4),bone).translateX(x).translateY(0.36).translateZ(0.22).rotateZ(Math.PI/2+(Math.random()-0.5)*0.4));
      // Knob ends
      g.add(mkMesh(new THREE.SphereGeometry(0.013,4,3),bone).translateX(x-0.04).translateY(0.36).translateZ(0.22));
      g.add(mkMesh(new THREE.SphereGeometry(0.013,4,3),bone).translateX(x+0.04).translateY(0.36).translateZ(0.22));
    });
    // Back spikes along spine (3 bone protrusions)
    [0.65,0.8,0.95].forEach(y=>{
      g.add(mkMesh(new THREE.ConeGeometry(0.025,0.1,5),bone).translateY(y).translateZ(-0.25).rotateX(-0.5));
    });
    // Chain belt loop with dangling link
    g.add(mkMesh(new THREE.TorusGeometry(0.28,0.012,4,12),chainMat).translateY(0.52).rotateX(Math.PI/2));
    // Veins on biceps (thin emissive lines)
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.003,0.1,0.004),mkMat(0x1a3a0a)).translateX(s*0.24).translateY(0.92).translateZ(0.02));
    });
    // Head details (added to the trollHead group so they bob with walk)
    // Scar across left eye
    trollHead.add(mkMesh(new THREE.BoxGeometry(0.005,0.05,0.005),scarMat).translateX(-0.06).translateY(0.13).translateZ(0.16).rotateZ(0.5));
    // Drool/blood drip from jaw
    trollHead.add(mkMesh(new THREE.SphereGeometry(0.012,5,4),bloodDrool).translateX(-0.03).translateY(-0.02).translateZ(0.13));
    trollHead.add(mkMesh(new THREE.BoxGeometry(0.005,0.04,0.005),bloodDrool).translateX(-0.03).translateY(-0.04).translateZ(0.13));
    // Broken tusk stub on one side (replaces one of the full tusks visually — just add a stump)
    trollHead.add(mkMesh(new THREE.ConeGeometry(0.024,0.05,5),tuskMat).translateX(-0.07).translateY(0.04).translateZ(0.14).rotateX(-0.2));
    // Ear bone plugs (large wooden discs on sides of head)
    [-1,1].forEach(s=>{
      trollHead.add(mkMesh(new THREE.CylinderGeometry(0.022,0.022,0.008,6),bone).translateX(s*0.17).translateY(0.1).translateZ(0).rotateZ(Math.PI/2));
    });
    // Nose ring (bone loop)
    trollHead.add(mkMesh(new THREE.TorusGeometry(0.01,0.002,4,8),bone).translateY(0.08).translateZ(0.17).rotateX(Math.PI/2));
    // Club trophies (added to clubGrp so they swing with the club)
    // Small shrunken skull tied to top of club
    clubGrp.add(mkMesh(new THREE.SphereGeometry(0.04,6,5),bone).translateY(0.35));
    [-0.012,0.012].forEach(ex=>{
      clubGrp.add(mkMesh(new THREE.SphereGeometry(0.006,4,3),mkMat(0x111100)).translateX(ex).translateY(0.355).translateZ(0.035));
    });
    // Club blood stains
    [[0.05,0.22,0.08],[-0.04,0.25,0.02],[0.02,0.18,-0.06]].forEach(p=>{
      clubGrp.add(mkMesh(new THREE.SphereGeometry(0.015,5,4),bloodDrool).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    });

    // ============ v3.26 TROLL ANIMATION GRAPHICS UPGRADE ============
    // Glowing red war-paint eye markings (emissive, visible at night)
    [-1,1].forEach(s=>{
      trollHead.add(mkMesh(new THREE.BoxGeometry(0.05,0.008,0.005),warPaint).translateX(s*0.06).translateY(0.17).translateZ(0.16));
    });
    // Throbbing chest veins (green-dark lines radiating from center)
    [[0.05,0.85,0.17,0.4],[-0.05,0.78,0.16,-0.3],[0.08,0.72,0.15,0.2],[-0.08,0.9,0.14,-0.5]].forEach(p=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.005,0.08,0.004),mkMat(0x1a3a0a)).translateX(p[0]).translateY(p[1]).translateZ(p[2]).rotateZ(p[3]));
    });
    // Bone armor plate on left shoulder (over fur)
    g.add(mkMesh(new THREE.SphereGeometry(0.08,6,4,0,Math.PI*2,0,Math.PI*0.5),bone).translateX(-0.22).translateY(1.08).translateZ(-0.04));
    // Shoulder plate rivets
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;
      g.add(mkMesh(new THREE.SphereGeometry(0.01,4,3),ironBand).translateX(-0.22+Math.cos(a)*0.06).translateY(1.08).translateZ(-0.04+Math.sin(a)*0.06));
    }
    // Stomp dust cloud effect (static puffs at feet)
    [-0.14,0.14].forEach(x=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.08,6,5),
        mkMat(0x8a7a5a,{transparent:true,opacity:0.25,depthWrite:false}))
        .translateX(x).translateY(0.04).translateZ(0.04));
    });

  }else if(type==='dragon'){
    // --- DRAGON: fast wyvern, moderate HP, powerful hits ---
    const scale=mkMat(0xa02020,{roughness:0.6});
    const darkScale=mkMat(0x701010,{roughness:0.65});
    const brightScale=mkMat(0xc83030,{roughness:0.55});
    const belly=mkMat(0xffcc66,{roughness:0.7});
    const horn=mkMat(0x2a1a10,{roughness:0.5});
    const claw=mkMat(0x1a1008,{roughness:0.4});
    const eyeYellow=mkMat(0xffff44,{emissive:0xffaa00,emissiveIntensity:1.5});
    const fireCore=mkMat(0xff6622,{emissive:0xff4400,emissiveIntensity:2.5,transparent:true,opacity:0.9});
    const membrane=mkMat(0x601010,{roughness:0.8,transparent:true,opacity:0.85,side:THREE.DoubleSide});

    // Powerful back legs (limb groups)
    [-0.13,0.13].forEach((x,idx)=>{
      const legGrp=new THREE.Group();
      legGrp.userData.limb=idx===0?'leftLeg':'rightLeg';
      legGrp.position.set(x,0.28,0);
      // Thigh (bulky)
      legGrp.add(mkMesh(new THREE.SphereGeometry(0.09,7,6),scale).translateY(-0.02));
      // Shin (backward-angled wyvern style)
      const shin=mkMesh(new THREE.CylinderGeometry(0.06,0.05,0.22,6),scale);
      shin.rotation.x=0.4;
      shin.position.set(0,-0.15,0.02);
      legGrp.add(shin);
      // Foot/talon
      const foot=mkMesh(new THREE.BoxGeometry(0.12,0.04,0.16),darkScale);
      foot.position.set(0,-0.28,0.08);
      legGrp.add(foot);
      // 3 talon claws
      [-0.04,0,0.04].forEach(tx=>{
        legGrp.add(mkMesh(new THREE.ConeGeometry(0.015,0.06,4),claw)
          .translateX(tx).translateY(-0.3).translateZ(0.17).rotateX(Math.PI/2));
      });
      g.add(legGrp);
    });

    // Low-slung body (sphere scaled to be long and flat)
    const body=mkMesh(new THREE.SphereGeometry(0.22,12,10),scale);
    body.scale.set(1.2,0.85,1.8);
    body.position.set(0,0.48,0.05);
    g.add(body);
    // Belly (lighter underside)
    const belMesh=mkMesh(new THREE.SphereGeometry(0.18,10,8),belly);
    belMesh.scale.set(1,0.5,1.6);
    belMesh.position.set(0,0.4,0.05);
    g.add(belMesh);
    // Back scales (ridge of triangular plates along spine)
    for(let i=0;i<7;i++){
      const z=0.4-i*0.13;
      const ph=0.07-Math.abs(i-3)*0.01;
      g.add(mkMesh(new THREE.ConeGeometry(0.03,ph,4),brightScale).translateY(0.62).translateZ(z).rotateX(-0.3));
    }

    // v3.18: neck + head wrapped in a pivot group so they can bob
    // with the walk cycle. Pivot at the base of the neck where it
    // attaches to the body, so rotation animates the whole chain.
    const neckGrp=new THREE.Group();
    neckGrp.userData.limb='neck';
    neckGrp.position.set(0,0.55,0.3); // base of neck at body junction
    // Neck segments (now positioned RELATIVE to the neck pivot)
    [0,0.07,0.12,0.15].forEach((y,i)=>{
      const seg=mkMesh(new THREE.SphereGeometry(0.09-i*0.012,8,6),scale);
      seg.position.set(0,y+0.05,0.0+i*0.08);
      seg.scale.set(1,0.9,1.2);
      neckGrp.add(seg);
    });
    // Head sub-group (nods independently on top of the neck bob)
    const headGrp=new THREE.Group();
    headGrp.userData.limb='head';
    headGrp.position.set(0,0.23,0.32);
    const head=mkMesh(new THREE.SphereGeometry(0.1,10,8),scale);
    head.scale.set(1,0.85,1.4);
    headGrp.add(head);
    // Snout extension (jaw)
    headGrp.add(mkMesh(new THREE.ConeGeometry(0.07,0.16,6),scale).translateY(-0.02).translateZ(0.16).rotateX(Math.PI/2));
    // Open mouth with fire glow
    headGrp.add(mkMesh(new THREE.SphereGeometry(0.05,6,5),mkMat(0x1a0a0a)).translateY(-0.02).translateZ(0.2));
    headGrp.add(mkMesh(new THREE.SphereGeometry(0.04,6,5),fireCore).translateY(-0.01).translateZ(0.21));
    // Fire flame cone extending from mouth
    headGrp.add(mkMesh(new THREE.ConeGeometry(0.04,0.1,6),fireCore).translateY(0).translateZ(0.28).rotateX(Math.PI/2));
    // Horns on head (2 curving back)
    [-1,1].forEach(s=>{
      const h=mkMesh(new THREE.ConeGeometry(0.025,0.15,5),horn);
      h.position.set(s*0.06,0.1,-0.07);
      h.rotation.x=0.6;
      h.rotation.z=s*0.2;
      headGrp.add(h);
    });
    // Eyes
    [-1,1].forEach(s=>{
      headGrp.add(mkMesh(new THREE.SphereGeometry(0.02,5,4),eyeYellow).translateX(s*0.05).translateY(0.04).translateZ(0.04));
    });
    neckGrp.add(headGrp);
    g.add(neckGrp);

    // Folded wings on the back
    [-1,1].forEach(s=>{
      const wingGrp=new THREE.Group();
      wingGrp.userData.limb=s<0?'leftArm':'rightArm';
      wingGrp.position.set(s*0.18,0.58,0.1);
      // Main wing bone
      const bone=mkMesh(new THREE.CylinderGeometry(0.02,0.015,0.3,5),darkScale);
      bone.rotation.z=s*0.8;
      wingGrp.add(bone);
      // Membrane panel (triangular)
      const mem=mkMesh(new THREE.BoxGeometry(0.22,0.16,0.01),membrane);
      mem.rotation.z=s*0.8;
      mem.position.set(s*0.1,0.05,0);
      wingGrp.add(mem);
      // Secondary wing ribs
      for(let i=0;i<3;i++){
        const rib=mkMesh(new THREE.CylinderGeometry(0.008,0.008,0.14,4),darkScale);
        rib.rotation.z=s*(0.8+i*0.15);
        rib.position.set(s*(0.05+i*0.04),0,0);
        wingGrp.add(rib);
      }
      // Wing claw (at top)
      wingGrp.add(mkMesh(new THREE.ConeGeometry(0.015,0.05,4),claw).translateX(s*0.16).translateY(0.12).rotateZ(-s*0.5));
      g.add(wingGrp);
    });

    // v3.18: tail wrapped in a pivot group so it sways side-to-side
    // with the walk cycle. Pivot is at the base of the tail where
    // it joins the body.
    const tailGrp=new THREE.Group();
    tailGrp.userData.limb='tail';
    tailGrp.position.set(0,0.42,-0.12);
    for(let i=0;i<6;i++){
      const seg=mkMesh(new THREE.SphereGeometry(0.08-i*0.008,7,5),scale);
      // Positions relative to tail pivot now — subtract the base.
      seg.position.set(0,-i*0.01,-i*0.13);
      seg.scale.set(1,0.8,1.3);
      tailGrp.add(seg);
      // Back ridge spike
      if(i<5){
        tailGrp.add(mkMesh(new THREE.ConeGeometry(0.02,0.04,4),brightScale)
          .translateY(0.08-i*0.01).translateZ(-i*0.13).rotateX(-0.3));
      }
    }
    // Tail tip spike
    tailGrp.add(mkMesh(new THREE.ConeGeometry(0.04,0.14,5),horn).translateY(-0.04).translateZ(-0.83).rotateX(-Math.PI/2));
    // Tail side fins
    [-1,1].forEach(s=>{
      tailGrp.add(mkMesh(new THREE.BoxGeometry(0.008,0.06,0.1),brightScale).translateX(s*0.03).translateY(-0.04).translateZ(-0.76));
    });
    g.add(tailGrp);

    // ============ v3.19 DRAGON DETAIL PASS ============
    const fangMat=mkMat(0xeeeecc,{roughness:0.35});
    const heartGlow=mkMat(0xff3322,{emissive:0xff2200,emissiveIntensity:2.8,transparent:true,opacity:0.92});
    const runeOrangeRed=mkMat(0xff6622,{emissive:0xff4400,emissiveIntensity:2.2});
    const pupilMat=mkMat(0x080808);
    const scaleDetailMat=mkMat(0x5a1010,{roughness:0.65});
    const smokeMat=mkMat(0x2a2a2a,{transparent:true,opacity:0.35,fog:false});
    // Glowing chest heart — visible fire burning inside the ribcage
    g.add(mkMesh(new THREE.SphereGeometry(0.055,8,6),heartGlow).translateY(0.44).translateZ(0.12));
    // Outer heart glow shell
    g.add(mkMesh(new THREE.SphereGeometry(0.09,8,6),mkMat(0xff6622,{emissive:0xff4400,emissiveIntensity:1.2,transparent:true,opacity:0.35,depthWrite:false})).translateY(0.44).translateZ(0.1));
    // Individual scale plates on body sides (overlapping small boxes)
    for(let row=0;row<3;row++){
      for(let col=-2;col<=2;col++){
        const sy=0.4+row*0.06;
        const sz=0.0+col*0.12;
        [-1,1].forEach(s=>{
          g.add(mkMesh(new THREE.BoxGeometry(0.007,0.03,0.04),scaleDetailMat).translateX(s*0.24).translateY(sy).translateZ(sz));
        });
      }
    }
    // Crown of spikes where neck meets body
    for(let i=0;i<6;i++){
      const a=(i/6)*Math.PI-Math.PI/2;
      g.add(mkMesh(new THREE.ConeGeometry(0.018,0.05,4),brightScale).translateX(Math.cos(a)*0.14).translateY(0.6).translateZ(0.22+Math.sin(a)*0.06).rotateX(-0.3));
    }
    // ---- Details ON the neckGrp so they bob with it ----
    // Spines down the back of the neck (4 small spikes)
    for(let i=0;i<4;i++){
      neckGrp.add(mkMesh(new THREE.ConeGeometry(0.02,0.05,4),brightScale).translateY(0.04+i*0.05).translateZ(-0.01+i*0.075).rotateX(-0.5));
    }
    // ---- Details INSIDE the headGrp so they nod with head ----
    // Bigger pupils in existing eyes
    [-1,1].forEach(s=>{
      headGrp.add(mkMesh(new THREE.SphereGeometry(0.012,5,4),pupilMat).translateX(s*0.05).translateY(0.04).translateZ(0.055));
    });
    // Eye ridges (dark scales over eyes)
    [-1,1].forEach(s=>{
      headGrp.add(mkMesh(new THREE.BoxGeometry(0.05,0.015,0.03),darkScale).translateX(s*0.05).translateY(0.06).translateZ(0.03));
    });
    // Secondary smaller horns in front of main horns
    [-1,1].forEach(s=>{
      const h=mkMesh(new THREE.ConeGeometry(0.015,0.08,4),horn);
      h.position.set(s*0.04,0.07,-0.03);
      h.rotation.x=0.3;
      h.rotation.z=s*0.3;
      headGrp.add(h);
    });
    // Glowing forehead rune (diamond-shaped emissive plate)
    headGrp.add(mkMesh(new THREE.BoxGeometry(0.03,0.03,0.008),runeOrangeRed).translateY(0.065).translateZ(0.03).rotateZ(Math.PI/4));
    // Upper fangs protruding from jaw
    [-0.04,0.04].forEach(x=>{
      headGrp.add(mkMesh(new THREE.ConeGeometry(0.012,0.05,4),fangMat).translateX(x).translateY(-0.025).translateZ(0.15).rotateX(Math.PI));
    });
    // Whiskers/barbels (2 thin cylinders dangling from chin)
    [-1,1].forEach(s=>{
      headGrp.add(mkMesh(new THREE.CylinderGeometry(0.004,0.002,0.09,4),darkScale).translateX(s*0.025).translateY(-0.08).translateZ(0.13).rotateZ(s*0.3));
    });
    // Smoke puffs from the mouth (static translucent spheres suggesting breath)
    headGrp.add(mkMesh(new THREE.SphereGeometry(0.04,6,5),smokeMat).translateY(0.03).translateZ(0.34));
    headGrp.add(mkMesh(new THREE.SphereGeometry(0.03,6,5),smokeMat).translateX(0.02).translateY(0.06).translateZ(0.38));
    // Head crest frill (3 thin plates on top of head)
    [-0.05,0,0.05].forEach(x=>{
      headGrp.add(mkMesh(new THREE.BoxGeometry(0.01,0.04,0.05),brightScale).translateX(x).translateY(0.1).translateZ(-0.02));
    });
    // ---- Tail underside patterning ----
    for(let i=0;i<5;i++){
      tailGrp.add(mkMesh(new THREE.BoxGeometry(0.08,0.005,0.04),belly).translateY(-0.035-i*0.01).translateZ(-i*0.13));
    }
    // Extra tail fin flares (2 along the tail length)
    [-1,1].forEach(s=>{
      tailGrp.add(mkMesh(new THREE.BoxGeometry(0.005,0.05,0.08),brightScale).translateX(s*0.05).translateY(-0.02).translateZ(-0.39));
    });

    // ============ v3.26 DRAGON ANIMATION GRAPHICS UPGRADE ============
    // Bigger fire breath (visible from far away — main visual signature)
    headGrp.add(mkMesh(new THREE.ConeGeometry(0.06,0.18,8),fireCore).translateY(0.02).translateZ(0.35).rotateX(Math.PI/2));
    headGrp.add(mkMesh(new THREE.SphereGeometry(0.08,8,6),
      mkMat(0xff8822,{emissive:0xff6600,emissiveIntensity:2.0,transparent:true,opacity:0.6,depthWrite:false}))
      .translateY(0.04).translateZ(0.4));
    // Heat shimmer sphere around the head
    headGrp.add(mkMesh(new THREE.SphereGeometry(0.2,8,6),
      mkMat(0xff4400,{emissive:0xff2200,emissiveIntensity:0.8,transparent:true,opacity:0.15,depthWrite:false})));
    // Bigger back ridge spikes (body, not neck — more menacing silhouette)
    for(let i=0;i<5;i++){
      const z=0.35-i*0.14;
      g.add(mkMesh(new THREE.ConeGeometry(0.04,0.12,4),brightScale).translateY(0.66).translateZ(z).rotateX(-0.35));
    }
    // Claw glow on feet (emissive tips)
    [-0.13,0.13].forEach(x=>{
      [-0.04,0,0.04].forEach(tx=>{
        g.add(mkMesh(new THREE.SphereGeometry(0.01,4,3),
          mkMat(0xff6622,{emissive:0xff4400,emissiveIntensity:1.5}))
          .translateX(x+tx).translateY(0.01).translateZ(0.25));
      });
    });

  }else if(type==='lich'){
    // --- LICH: tall skeletal sorcerer, heavy armor, ranged threat ---
    const robeDark=mkMat(0x2a1a44,{roughness:0.85});
    const robePurple=mkMat(0x553388,{roughness:0.8});
    const robeTrim=mkMat(0xaa7722,{metalness:0.6,roughness:0.4});
    const boneMat=mkMat(0xeeeecc,{roughness:0.5});
    const boneDark=mkMat(0xaaaa88,{roughness:0.6});
    const eyeGlow=mkMat(0x66ccff,{emissive:0x3388ff,emissiveIntensity:3.0});
    const staffWood=mkMat(0x3a1a08,{roughness:0.8});
    const crystalMat=mkMat(0xaaffff,{emissive:0x66ccff,emissiveIntensity:2.5,transparent:true,opacity:0.92});
    const runeMat=mkMat(0xcc88ff,{emissive:0x9944cc,emissiveIntensity:1.6});

    // Flowing robe base (tall tapered cylinder)
    g.add(mkMesh(new THREE.CylinderGeometry(0.2,0.32,0.5,10),robeDark).translateY(0.25));
    // Inner purple lining (slightly narrower, taller)
    g.add(mkMesh(new THREE.CylinderGeometry(0.18,0.28,0.45,10),robePurple).translateY(0.27));
    // Robe bottom fringe (tattered strips)
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      g.add(mkMesh(new THREE.BoxGeometry(0.04,0.08+Math.random()*0.04,0.02),robeDark)
        .translateX(Math.cos(a)*0.29).translateY(0.02).translateZ(Math.sin(a)*0.29));
    }
    // Gold trim at bottom
    g.add(mkMesh(new THREE.TorusGeometry(0.31,0.008,4,14),robeTrim).translateY(0.04));
    // Gold trim at waist
    g.add(mkMesh(new THREE.TorusGeometry(0.22,0.01,4,14),robeTrim).translateY(0.52));

    // Skeletal legs visible through the robe (limb groups, partially hidden)
    [-0.07,0.07].forEach((x,idx)=>{
      const legGrp=new THREE.Group();
      legGrp.userData.limb=idx===0?'leftLeg':'rightLeg';
      legGrp.position.set(x,0.1,0);
      // Thin tibia peeking below robe
      legGrp.add(mkMesh(new THREE.CylinderGeometry(0.018,0.02,0.12,5),boneMat).translateY(-0.03));
      // Skeletal foot
      legGrp.add(mkMesh(new THREE.BoxGeometry(0.06,0.025,0.08),boneDark).translateY(-0.11).translateZ(0.02));
      g.add(legGrp);
    });

    // Upper body — ribcage showing between robe and hood
    const ribCage=new THREE.Group();
    ribCage.position.y=0.58;
    // Spine column
    ribCage.add(mkMesh(new THREE.CylinderGeometry(0.02,0.02,0.28,5),boneMat));
    // 4 pairs of ribs
    for(let i=0;i<4;i++){
      const ry=0.1-i*0.06;
      [-1,1].forEach(s=>{
        const rib=mkMesh(new THREE.TorusGeometry(0.08-i*0.005,0.006,3,8,Math.PI),boneMat);
        rib.rotation.x=Math.PI/2;
        rib.rotation.z=s>0?0:Math.PI;
        rib.position.set(0,ry,0);
        ribCage.add(rib);
      });
    }
    // Sternum
    ribCage.add(mkMesh(new THREE.BoxGeometry(0.025,0.2,0.015),boneMat).translateZ(0.075));
    g.add(ribCage);

    // Robe shoulders (covering upper ribs)
    g.add(mkMesh(new THREE.SphereGeometry(0.18,10,6,0,Math.PI*2,0,Math.PI*0.6),robeDark).translateY(0.72));
    // Shoulder gold trim
    g.add(mkMesh(new THREE.TorusGeometry(0.17,0.008,4,14),robeTrim).translateY(0.72));

    // Skeletal arms with sleeves
    [-1,1].forEach((s,idx)=>{
      const armGrp=new THREE.Group();
      armGrp.userData.limb=idx===0?'leftArm':'rightArm';
      armGrp.position.set(s*0.19,0.72,0);
      // Upper arm bone
      armGrp.add(mkMesh(new THREE.CylinderGeometry(0.018,0.016,0.18,5),boneMat));
      // Sleeve wrap (purple robe covering upper arm)
      armGrp.add(mkMesh(new THREE.CylinderGeometry(0.035,0.04,0.16,6),robeDark));
      // Elbow joint
      armGrp.add(mkMesh(new THREE.SphereGeometry(0.025,5,4),boneMat).translateY(-0.1));
      // Forearm (skeletal)
      const fa=mkMesh(new THREE.CylinderGeometry(0.015,0.014,0.2,5),boneMat);
      fa.rotation.z=s*0.2;
      fa.position.set(s*0.03,-0.2,0);
      armGrp.add(fa);
      // Sleeve fringe
      armGrp.add(mkMesh(new THREE.CylinderGeometry(0.045,0.035,0.04,6),robePurple).translateY(-0.1));
      // Skeletal hand (claw fingers)
      armGrp.add(mkMesh(new THREE.SphereGeometry(0.025,5,4),boneMat).translateX(s*0.06).translateY(-0.3));
      // 3 finger bones as claws
      for(let f=0;f<3;f++){
        armGrp.add(mkMesh(new THREE.ConeGeometry(0.006,0.04,3),boneMat)
          .translateX(s*0.08).translateY(-0.33).translateZ((f-1)*0.015).rotateZ(-s*Math.PI/3));
      }
      g.add(armGrp);
    });

    // v3.26: Skull + hood wrapped in a head Group for nodding animation.
    // Pivot at the neck junction (~0.88 y) so the whole head+hood rocks.
    const lichHead=new THREE.Group();
    lichHead.userData.limb='head';
    lichHead.position.set(0,0.88,0);
    // Skull
    const skullHead=mkMesh(new THREE.SphereGeometry(0.14,10,8),boneMat);
    skullHead.scale.set(1,0.95,1.05);
    skullHead.position.y=0.1;
    lichHead.add(skullHead);
    // Jaw
    lichHead.add(mkMesh(new THREE.BoxGeometry(0.16,0.05,0.1),boneDark).translateY(0).translateZ(0.04));
    // Teeth row
    for(let i=-3;i<=3;i++){
      lichHead.add(mkMesh(new THREE.ConeGeometry(0.005,0.015,3),boneMat).translateX(i*0.018).translateY(0).translateZ(0.09).rotateX(Math.PI));
    }
    // Hollow eye sockets with bright glowing eyes
    [-1,1].forEach(s=>{
      lichHead.add(mkMesh(new THREE.SphereGeometry(0.035,6,5),mkMat(0x080808)).translateX(s*0.045).translateY(0.12).translateZ(0.1));
      // v3.26: bigger brighter eye glow (was 0.022 radius)
      lichHead.add(mkMesh(new THREE.SphereGeometry(0.028,6,5),eyeGlow).translateX(s*0.045).translateY(0.12).translateZ(0.11));
      // Outer eye glow aura
      lichHead.add(mkMesh(new THREE.SphereGeometry(0.04,6,5),
        mkMat(0x88ccff,{emissive:0x4488ff,emissiveIntensity:1.5,transparent:true,opacity:0.4,depthWrite:false}))
        .translateX(s*0.045).translateY(0.12).translateZ(0.105));
    });
    // Nose hole
    lichHead.add(mkMesh(new THREE.ConeGeometry(0.015,0.03,4),mkMat(0x080808)).translateY(0.07).translateZ(0.125).rotateX(Math.PI));
    // Dark hood covering the back of the skull
    lichHead.add(mkMesh(new THREE.SphereGeometry(0.16,10,5,0,Math.PI*2,0,Math.PI*0.6),robeDark).translateY(0.14));
    // Hood trim
    lichHead.add(mkMesh(new THREE.TorusGeometry(0.155,0.006,4,12),robeTrim).translateY(0.09).rotateX(0.3));
    // Hood point
    lichHead.add(mkMesh(new THREE.ConeGeometry(0.04,0.08,5),robeDark).translateY(0.3));
    // v3.26: skull cracks (dark lines across the cranium)
    [[0.04,0.12,-0.3],[-0.03,0.15,0.4],[0.06,0.08,0.2]].forEach(p=>{
      lichHead.add(mkMesh(new THREE.BoxGeometry(0.004,0.06,0.004),boneDark).translateX(p[0]).translateY(0.1).translateZ(p[1]).rotateZ(p[2]));
    });
    g.add(lichHead);

    // v3.18: Staff in a weapon pivot group so it bobs/sways with
    // the walk cycle (gentle since lich is a slow caster).
    const staff=new THREE.Group();
    staff.userData.limb='weapon';
    // Shaft
    staff.add(mkMesh(new THREE.CylinderGeometry(0.015,0.018,1.0,6),staffWood));
    // Gold wrappings
    [0.2,0.0,-0.2].forEach(y=>{
      staff.add(mkMesh(new THREE.TorusGeometry(0.02,0.004,4,10),robeTrim).translateY(y).rotateX(Math.PI/2));
    });
    // Claw holder at top (3 prongs)
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3;
      staff.add(mkMesh(new THREE.BoxGeometry(0.008,0.07,0.008),robeTrim)
        .translateX(Math.cos(a)*0.04).translateY(0.52).translateZ(Math.sin(a)*0.04)
        .rotateX(Math.cos(a)*0.3).rotateZ(Math.sin(a)*0.3));
    }
    // Main crystal orb (large, glowing)
    staff.add(mkMesh(new THREE.SphereGeometry(0.07,10,8),crystalMat).translateY(0.56));
    // Inner bright core
    staff.add(mkMesh(new THREE.SphereGeometry(0.035,8,6),mkMat(0xffffff,{emissive:0xaaddff,emissiveIntensity:3.5})).translateY(0.56));
    // Runic symbols on the shaft
    [0.1,-0.1,-0.3].forEach(y=>{
      staff.add(mkMesh(new THREE.BoxGeometry(0.005,0.02,0.022),runeMat).translateY(y).translateZ(0.02));
    });
    staff.position.set(0.3,0.55,0);
    staff.rotation.z=0.15;
    g.add(staff);

    // Floating runes orbiting the lich (3 emissive cubes in air)
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3;
      g.add(mkMesh(new THREE.BoxGeometry(0.025,0.025,0.025),runeMat)
        .translateX(Math.cos(a)*0.3).translateY(0.65+i*0.08).translateZ(Math.sin(a)*0.3));
    }

    // Neck amulet
    g.add(mkMesh(new THREE.TorusGeometry(0.1,0.008,4,14),robeTrim).translateY(0.76).rotateX(Math.PI/2));
    g.add(mkMesh(new THREE.SphereGeometry(0.02,6,5),runeMat).translateY(0.7).translateZ(0.05));

    // ============ v3.19 LICH DETAIL PASS ============
    const gemPurple=mkMat(0x8822cc,{emissive:0x550088,emissiveIntensity:1.3,transparent:true,opacity:0.9,metalness:0.5});
    const phylactMat=mkMat(0x44ddff,{emissive:0x1188ff,emissiveIntensity:2.8,transparent:true,opacity:0.85});
    const soulflame=mkMat(0x88ccff,{emissive:0x44aaff,emissiveIntensity:3.0,transparent:true,opacity:0.7,depthWrite:false});
    const tatteredCloth=mkMat(0x1a0828,{roughness:0.9,transparent:true,opacity:0.85});
    // Bone crown of 7 thin spikes around the top of the hood
    for(let i=0;i<7;i++){
      const a=(i-3)*0.25;
      g.add(mkMesh(new THREE.ConeGeometry(0.012,0.07,4),boneMat).translateX(Math.sin(a)*0.14).translateY(1.15).translateZ(-0.02+Math.cos(a)*0.08).rotateZ(Math.sin(a)*0.3).rotateX(-0.2));
    }
    // Phylactery — glowing blue vial hanging from a bone chain in the center of the chest
    // Chain
    g.add(mkMesh(new THREE.CylinderGeometry(0.002,0.002,0.15,3),robeTrim).translateY(0.67).translateZ(0.11));
    // Vial body
    g.add(mkMesh(new THREE.CylinderGeometry(0.018,0.018,0.06,6),phylactMat).translateY(0.6).translateZ(0.14));
    // Vial cap
    g.add(mkMesh(new THREE.CylinderGeometry(0.01,0.01,0.01,5),robeTrim).translateY(0.63).translateZ(0.14));
    // Vial glow aura
    g.add(mkMesh(new THREE.SphereGeometry(0.03,7,6),soulflame).translateY(0.6).translateZ(0.14));
    // 3 large dark purple gemstones on robe chest
    [[0.07,0.45,0.14],[-0.07,0.45,0.14],[0,0.38,0.14]].forEach(p=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.015,6,5),gemPurple).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
      // Gold setting around each gem
      g.add(mkMesh(new THREE.TorusGeometry(0.018,0.003,3,8),robeTrim).translateX(p[0]).translateY(p[1]).translateZ(p[2]).rotateX(Math.PI/2));
    });
    // Wraith tendrils — 4 tattered cloth wisps coming off the shoulders/back
    for(let i=0;i<4;i++){
      const tx=(i-1.5)*0.12;
      g.add(mkMesh(new THREE.BoxGeometry(0.04,0.25,0.01),tatteredCloth).translateX(tx).translateY(0.55).translateZ(-0.15+Math.random()*0.05));
    }
    // Inside-ribcage soul flame (dim emissive sphere inside the ribs)
    g.add(mkMesh(new THREE.SphereGeometry(0.04,7,6),soulflame).translateY(0.58));
    // Brighter inner core
    g.add(mkMesh(new THREE.SphereGeometry(0.02,6,5),mkMat(0xffffff,{emissive:0xaaddff,emissiveIntensity:3.5})).translateY(0.58));
    // Skull collar — 3 tiny skull charms around the neck
    [-0.08,0,0.08].forEach(x=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.02,6,5),boneMat).translateX(x).translateY(0.75).translateZ(0.08));
      // Eye sockets
      [-0.006,0.006].forEach(ex=>{
        g.add(mkMesh(new THREE.SphereGeometry(0.003,4,3),mkMat(0x080808)).translateX(x+ex).translateY(0.755).translateZ(0.093));
      });
    });
    // Additional rune marks on the robe bottom (5 more around the hem)
    for(let i=0;i<5;i++){
      const a=-Math.PI/2+(i-2)*0.35;
      g.add(mkMesh(new THREE.BoxGeometry(0.015,0.02,0.006),runeMat).translateX(Math.cos(a)*0.27).translateY(0.22).translateZ(Math.sin(a)*0.27).rotateY(-a));
    }
    // Belt pouches (2 small bone-bound bags)
    const lichPouch=mkMat(0x2a1a10,{roughness:0.9});
    [-1,1].forEach(s=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.04,0.05,0.025),lichPouch).translateX(s*0.14).translateY(0.52).translateZ(0.12));
      g.add(mkMesh(new THREE.TorusGeometry(0.022,0.003,3,8),boneMat).translateX(s*0.14).translateY(0.55).translateZ(0.12).rotateX(Math.PI/2));
    });
    // Extra floating runes orbiting higher (3 more at different elevation)
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3+0.5;
      g.add(mkMesh(new THREE.TetrahedronGeometry(0.02,0),runeMat).translateX(Math.cos(a)*0.35).translateY(0.95+i*0.04).translateZ(Math.sin(a)*0.35));
    }
    // ---- Staff details (added to the staff group so they sway with it) ----
    // Small secondary crystal orbs clustered around the main orb
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3;
      staff.add(mkMesh(new THREE.SphereGeometry(0.022,6,5),crystalMat).translateX(Math.cos(a)*0.06).translateY(0.56+0.04).translateZ(Math.sin(a)*0.06));
    }
    // Jawbone decoration hanging from top of the staff
    staff.add(mkMesh(new THREE.BoxGeometry(0.05,0.01,0.03),boneMat).translateY(0.4).translateZ(0.02));
    [-0.012,0,0.012].forEach(x=>{
      staff.add(mkMesh(new THREE.ConeGeometry(0.004,0.012,3),boneMat).translateX(x).translateY(0.392).translateZ(0.02).rotateX(Math.PI));
    });
    // Hanging skull trophy (dangling below staff grip)
    staff.add(mkMesh(new THREE.SphereGeometry(0.025,6,5),boneMat).translateY(-0.4).translateZ(0.01));
    [-0.007,0.007].forEach(ex=>{
      staff.add(mkMesh(new THREE.SphereGeometry(0.004,4,3),mkMat(0x080808)).translateX(ex).translateY(-0.395).translateZ(0.025));
    });
    // Skull-to-staff cord
    staff.add(mkMesh(new THREE.CylinderGeometry(0.002,0.002,0.05,3),robeTrim).translateY(-0.375));
    // Additional runes on the shaft
    [0.25,0.15,-0.15,-0.25].forEach(y=>{
      staff.add(mkMesh(new THREE.BoxGeometry(0.003,0.012,0.02),runeMat).translateY(y).translateZ(0.021));
      staff.add(mkMesh(new THREE.BoxGeometry(0.003,0.012,0.02),runeMat).translateY(y).translateZ(-0.021));
    });

    // ============ v3.26 LICH ANIMATION GRAPHICS UPGRADE ============
    // Bigger staff crystal glow aura (visible from far away)
    staff.add(mkMesh(new THREE.SphereGeometry(0.1,10,8),
      mkMat(0x88ddff,{emissive:0x44aaff,emissiveIntensity:1.8,transparent:true,opacity:0.3,depthWrite:false}))
      .translateY(0.56));
    // Ethereal mist trail around the robe hem (4 translucent wisps)
    for(let i=0;i<6;i++){
      const a=(i/6)*Math.PI*2;
      g.add(mkMesh(new THREE.SphereGeometry(0.06,5,4),
        mkMat(0x553388,{transparent:true,opacity:0.2+Math.random()*0.1,depthWrite:false}))
        .translateX(Math.cos(a)*0.3).translateY(0.08).translateZ(Math.sin(a)*0.3));
    }
    // Brighter rune circle on the ground beneath the lich
    g.add(mkMesh(new THREE.TorusGeometry(0.35,0.01,4,20),
      mkMat(0xcc88ff,{emissive:0x9944cc,emissiveIntensity:2.0,transparent:true,opacity:0.6}))
      .translateY(0.02).rotateX(Math.PI/2));
    // Inner rune circle
    g.add(mkMesh(new THREE.TorusGeometry(0.25,0.008,4,16),
      mkMat(0xee99ff,{emissive:0xcc66ff,emissiveIntensity:1.5,transparent:true,opacity:0.45}))
      .translateY(0.025).rotateX(Math.PI/2));
    // Soul wisp particles (6 small bright spheres orbiting at chest level)
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3+0.3;
      g.add(mkMesh(new THREE.SphereGeometry(0.015,5,4),
        mkMat(0xaaddff,{emissive:0x66aaff,emissiveIntensity:3.0}))
        .translateX(Math.cos(a)*0.28).translateY(0.55+i*0.03).translateZ(Math.sin(a)*0.28));
    }

  }else{
    // --- ARCHER: agile, elven, ranged with bow ---
    const skinTone=mkMat(0xc4956a);
    const hair=mkMat(0xd4a437);
    const cloth=mkMat(0x2a5a2a);
    const darkCloth=mkMat(0x1e4a1e);
    const leather=mkMat(0x6b4226,{roughness:0.8});
    const wood=mkMat(0x8b5a2b,{roughness:0.7});

    // Legs - slender
    [-0.04,0.04].forEach((x,idx)=>{
      const legGrp=new THREE.Group();
      legGrp.userData.limb=idx===0?'leftLeg':'rightLeg';
      legGrp.userData.origY=0.1;legGrp.userData.origRotX=0;
      legGrp.position.set(x,0.1,0);
      legGrp.add(mkMesh(new THREE.CylinderGeometry(0.025,0.022,0.12,6),cloth));
      // Knee-high boots
      legGrp.add(mkMesh(new THREE.CylinderGeometry(0.028,0.032,0.08,6),leather).translateY(-0.05));
      // Boot cuff
      legGrp.add(mkMesh(new THREE.TorusGeometry(0.028,0.005,4,6),leather).translateY(-0.01));
      // Boot toe
      legGrp.add(mkMesh(new THREE.SphereGeometry(0.02,5,3),leather).translateY(-0.08).translateZ(0.01));
      g.add(legGrp);
    });

    // Torso - lithe, using lathe
    const torsoProfile=[new THREE.Vector2(0,0),new THREE.Vector2(0.08,0),new THREE.Vector2(0.085,0.04),new THREE.Vector2(0.08,0.1),new THREE.Vector2(0.065,0.16),new THREE.Vector2(0,0.18)];
    g.add(mkMesh(new THREE.LatheGeometry(torsoProfile,8),cloth).translateY(0.2));

    // Tunic detail - V-neck collar (accent)
    g.add(mkMesh(new THREE.BoxGeometry(0.06,0.03,0.01),acMat).translateY(0.37).translateZ(0.065));

    // Belt
    g.add(mkMesh(new THREE.TorusGeometry(0.07,0.008,4,8),leather).translateY(0.23));
    // Belt buckle - leaf shaped
    g.add(mkMesh(new THREE.ConeGeometry(0.01,0.025,4),mkMat(0xaaaa44,{metalness:0.5})).translateY(0.23).translateZ(0.07));

    // Shoulders and arms
    [-1,1].forEach((s,idx)=>{
      // Shoulder
      g.add(mkMesh(new THREE.SphereGeometry(0.03,6,4),cloth).translateX(s*0.1).translateY(0.38));
      // Arm group for animation
      const armGrp=new THREE.Group();
      armGrp.userData.limb=idx===0?'leftArm':'rightArm';
      armGrp.userData.origY=0.32;armGrp.userData.origRotX=0;
      armGrp.position.set(s*0.11,0.32,0);
      // Upper arm
      armGrp.add(mkMesh(new THREE.CylinderGeometry(0.02,0.018,0.08,5),cloth));
      // Forearm
      const fa=mkMesh(new THREE.CylinderGeometry(0.016,0.015,0.08,5),skinTone);
      fa.rotation.z=s*0.3;fa.position.set(s*0.02,-0.06,0);armGrp.add(fa);
      // Archer's bracer (leather)
      const br=mkMesh(new THREE.CylinderGeometry(0.02,0.019,0.04,5),leather);
      br.rotation.z=s*0.3;br.position.set(s*0.015,-0.05,0);armGrp.add(br);
      g.add(armGrp);
    });

    // Quiver on back (diagonal)
    const quiver=mkMesh(new THREE.CylinderGeometry(0.025,0.03,0.18,6),leather);
    quiver.rotation.z=0.2;quiver.position.set(0.03,0.35,-0.08);g.add(quiver);
    // Arrow tips sticking out of quiver
    [0,0.015,-0.015].forEach(x=>{
      const tip=mkMesh(new THREE.ConeGeometry(0.006,0.02,3),mkMat(0xaaaaaa,{metalness:0.6}));
      tip.position.set(0.02+x,0.46,-0.08);g.add(tip);
    });
    // Arrow shafts
    [0,0.012,-0.012].forEach(x=>{
      g.add(mkMesh(new THREE.CylinderGeometry(0.003,0.003,0.04,3),mkMat(0x8b6914)).translateX(0.025+x).translateY(0.43).translateZ(-0.08));
    });

    // Head - elven, slightly elongated
    const head=mkMesh(new THREE.SphereGeometry(0.07,8,6),skinTone);
    head.scale.set(0.9,1.05,0.9);head.position.y=0.48;g.add(head);

    // Hair - flowing
    const hairBack=mkMesh(new THREE.SphereGeometry(0.072,8,5),hair);
    hairBack.scale.set(0.92,1.0,1.0);hairBack.position.set(0,0.49,-0.01);g.add(hairBack);
    // Hair fringe
    g.add(mkMesh(new THREE.BoxGeometry(0.1,0.02,0.06),hair).translateY(0.52).translateZ(0.02));
    // Hair flow down back
    g.add(mkMesh(new THREE.BoxGeometry(0.06,0.08,0.02),hair).translateY(0.42).translateZ(-0.06));

    // Pointed elven ears
    [-1,1].forEach(s=>{
      const ear=mkMesh(new THREE.ConeGeometry(0.015,0.12,4),skinTone);
      ear.rotation.z=s*1.2;ear.rotation.x=-0.15;
      ear.position.set(s*0.08,0.49,0);g.add(ear);
    });

    // Eyes - bright, perceptive
    const elfEye=mkMat(0x44cc44,{emissive:0x228822,emissiveIntensity:0.3});
    [-1,1].forEach(s=>{
      // Eye white
      g.add(mkMesh(new THREE.SphereGeometry(0.012,5,4),mkMat(0xffffff)).translateX(s*0.03).translateY(0.49).translateZ(0.055));
      // Iris
      g.add(mkMesh(new THREE.SphereGeometry(0.007,4,3),elfEye).translateX(s*0.03).translateY(0.49).translateZ(0.063));
      // Pupil
      g.add(mkMesh(new THREE.SphereGeometry(0.004,3,3),mkMat(0x111111)).translateX(s*0.03).translateY(0.49).translateZ(0.067));
      // Eyebrow
      const brow=mkMesh(new THREE.BoxGeometry(0.025,0.005,0.01),hair);
      brow.rotation.z=s*-0.15;brow.position.set(s*0.03,0.505,0.055);g.add(brow);
    });

    // Nose
    g.add(mkMesh(new THREE.ConeGeometry(0.008,0.02,4),skinTone).translateY(0.475).translateZ(0.065));

    // Slight smile
    g.add(mkMesh(new THREE.BoxGeometry(0.025,0.004,0.006),mkMat(0x995544)).translateY(0.46).translateZ(0.06));

    // BOW - detailed, in left hand
    const bowGroup=new THREE.Group();
    // Bow limbs using torus arc
    const bowLimb=mkMat(0x8b5a2b,{roughness:0.6});
    const upperLimb=mkMesh(new THREE.TorusGeometry(0.1,0.008,4,8,Math.PI*0.7),bowLimb);
    upperLimb.rotation.z=Math.PI*0.15;upperLimb.position.set(0,0.04,0);bowGroup.add(upperLimb);
    // Bow grip
    bowGroup.add(mkMesh(new THREE.CylinderGeometry(0.012,0.012,0.04,5),leather).translateY(0));
    // Bowstring - thin cylinder
    const string=mkMesh(new THREE.CylinderGeometry(0.002,0.002,0.22,3),mkMat(0xccccaa));
    string.position.set(0.06,0,0);bowGroup.add(string);
    // Nocked arrow
    bowGroup.add(mkMesh(new THREE.CylinderGeometry(0.003,0.003,0.2,3),mkMat(0x8b6914)).translateY(0).translateZ(0.01));
    // Arrowhead
    const arrowTip=mkMesh(new THREE.ConeGeometry(0.008,0.025,4),mkMat(0xaaaaaa,{metalness:0.6}));
    arrowTip.position.set(0,0.11,0.01);bowGroup.add(arrowTip);
    // Fletching
    [-0.01,0.01].forEach(z=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.002,0.02,0.01),mkMat(0xcc4444)));
    });

    bowGroup.position.set(-0.18,0.3,0.04);
    bowGroup.rotation.y=0.1;g.add(bowGroup);

    // Team accent - shoulder cape/mantle
    const cape=mkMesh(new THREE.BoxGeometry(0.16,0.08,0.04),acMat);
    cape.position.set(0,0.38,-0.05);g.add(cape);
    // Ranger cloak flowing down back (team tinted)
    const ranger=mkMat(owner===1?0x1a3050:0x501a30,{roughness:0.8});
    g.add(mkMesh(new THREE.BoxGeometry(0.2,0.32,0.015),ranger).translateY(0.3).translateZ(-0.085));
    // Cloak tattered bottom
    [-0.06,0,0.06].forEach(cx=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.055,0.05,0.015),ranger).translateX(cx).translateY(0.14).translateZ(-0.085));
    });
    // Hood (pulled-back variation with peak)
    const hoodA=mkMesh(new THREE.SphereGeometry(0.085,8,5,0,Math.PI*2,0,Math.PI*0.55),ranger);
    hoodA.position.set(0,0.5,-0.03);g.add(hoodA);
    // Hood peak (pointed elven style)
    g.add(mkMesh(new THREE.ConeGeometry(0.04,0.08,5),ranger).translateY(0.56).translateZ(-0.04).rotateX(0.3));
    // Leather bandolier diagonal across chest (to quiver)
    const band=mkMesh(new THREE.BoxGeometry(0.02,0.3,0.006),leather);
    band.rotation.z=0.3;band.position.set(0,0.32,0.07);g.add(band);
    // Bandolier buckle
    g.add(mkMesh(new THREE.BoxGeometry(0.018,0.014,0.008),mkMat(0xaaaa44,{metalness:0.5})).translateY(0.35).translateZ(0.08));
    // Bracer with leaf etching (accent) on left arm
    g.add(mkMesh(new THREE.TorusGeometry(0.023,0.005,4,10),acMat).translateX(-0.14).translateY(0.28).rotateZ(0.3).rotateY(Math.PI/2));
    // More arrows in quiver (5 total instead of 3)
    [-0.024,-0.012,0,0.012,0.024].forEach((x,i)=>{
      // Arrow shafts extended
      g.add(mkMesh(new THREE.CylinderGeometry(0.003,0.003,0.08,3),mkMat(0x8b6914))
        .translateX(0.025+x).translateY(0.45).translateZ(-0.08));
      // Tips
      if(i%2===0){
        const tip=mkMesh(new THREE.ConeGeometry(0.007,0.025,4),mkMat(0xccccbb,{metalness:0.6}));
        tip.position.set(0.025+x,0.5,-0.08);g.add(tip);
      }
      // Fletching on some
      if(i===2){
        g.add(mkMesh(new THREE.BoxGeometry(0.008,0.025,0.002),mkMat(0xcc2222)).translateX(0.025+x).translateY(0.425).translateZ(-0.08));
      }
    });
    // Hair braid draped over shoulder
    g.add(mkMesh(new THREE.CylinderGeometry(0.012,0.01,0.12,5),hair).translateX(0.07).translateY(0.4).translateZ(-0.02).rotateZ(-0.3));
    g.add(mkMesh(new THREE.SphereGeometry(0.011,5,4),leather).translateX(0.1).translateY(0.34).translateZ(-0.03));
    // Small ranger pouch on belt
    g.add(mkMesh(new THREE.BoxGeometry(0.035,0.04,0.022),leather).translateX(0.06).translateY(0.2).translateZ(0.06));
    g.add(mkMesh(new THREE.BoxGeometry(0.035,0.008,0.025),mkMat(0x3a2208)).translateX(0.06).translateY(0.215).translateZ(0.061));
    // Forehead band with team accent gem
    g.add(mkMesh(new THREE.TorusGeometry(0.07,0.005,4,10),leather).translateY(0.53).rotateX(0.1));
    g.add(mkMesh(new THREE.SphereGeometry(0.008,5,4),mkMat(owner===1?0x66ccff:0xff66cc,{emissive:owner===1?0x2288cc:0xcc2288,emissiveIntensity:1.0})).translateY(0.535).translateZ(0.068));
  }

  // Direction set dynamically in syncEnemies based on movement
  // Default facing for initial spawn
  g.rotation.y=owner===1?-Math.PI/2:Math.PI/2;
  // Scale up for visibility. v3.14: bosses get a larger scale (3.8x)
  // so they tower over regular enemies (2.2x) — ~1.7x bigger silhouette.
  const __bossScale=(type==='troll'||type==='dragon'||type==='lich')?3.8:2.2;
  g.scale.set(__bossScale,__bossScale,__bossScale);
  return g;
}
// ==================== PROJECTILE MODELS ====================
function createProjectileModel(type){
  const g=new THREE.Group();
  if(type==='proj_arrow'){
    // Wooden shaft (cylindrical, with grain color)
    const shaft=mkMesh(new THREE.CylinderGeometry(0.012,0.012,0.36,6),mkMat(0x8b6914));
    shaft.rotation.z=Math.PI/2;g.add(shaft);
    // Brighter wood highlight stripe
    const hl=mkMesh(new THREE.CylinderGeometry(0.013,0.013,0.3,3),mkMat(0xa07528));
    hl.rotation.z=Math.PI/2;g.add(hl);
    // Iron conical head
    const head=mkMesh(new THREE.ConeGeometry(0.025,0.09,8),mkMat(0xcccccc,{metalness:0.7,roughness:0.25}));
    head.rotation.z=-Math.PI/2;head.position.x=0.22;g.add(head);
    // Head socket (iron band)
    const sock=mkMesh(new THREE.CylinderGeometry(0.016,0.016,0.025,8),mkMat(0x555555,{metalness:0.6}));
    sock.rotation.z=Math.PI/2;sock.position.x=0.17;g.add(sock);
    // Fletching - 4 triangular feather fins
    for(let i=0;i<4;i++){
      const fin=mkMesh(new THREE.BoxGeometry(0.065,0.036,0.005),mkMat(i%2===0?0xcc2222:0x881818));
      fin.position.x=-0.13;
      fin.rotation.x=i*Math.PI/2;
      g.add(fin);
    }
    // Nock end cap
    g.add(mkMesh(new THREE.SphereGeometry(0.016,6,5),mkMat(0x3a1a1a)).translateX(-0.18));

    // ============ v3.11 DETAIL PASS ============
    // Barbs on the arrowhead (2 small spines angled back)
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(p=>{
      const barb=mkMesh(new THREE.ConeGeometry(0.006,0.025,3),mkMat(0xaaaaaa,{metalness:0.6}));
      barb.position.set(0.2,p[0]*0.018,p[1]*0.018);
      barb.rotation.z=-Math.PI/2+0.5*p[0];
      barb.rotation.x=0.5*p[1];
      g.add(barb);
    });
    // Leather binding wraps (3 thin dark bands along the shaft)
    [0.08,0.0,-0.08].forEach(x=>{
      g.add(mkMesh(new THREE.CylinderGeometry(0.0135,0.0135,0.012,6),mkMat(0x4a2a0a,{roughness:0.85}))
        .translateX(x).rotateZ(Math.PI/2));
    });
    // Wood grain dark stripes (2 thin lines)
    const grain=mkMat(0x5a3a10);
    g.add(mkMesh(new THREE.BoxGeometry(0.32,0.003,0.003),grain).translateY(0.011));
    g.add(mkMesh(new THREE.BoxGeometry(0.32,0.003,0.003),grain).translateY(-0.011));
    // 5th (center) feather for extra silhouette richness
    const cfin=mkMesh(new THREE.BoxGeometry(0.07,0.042,0.004),mkMat(0xaa1818));
    cfin.position.x=-0.13;cfin.rotation.x=Math.PI/4;g.add(cfin);
    // Glowing enchanted tip accent (ember near the head)
    g.add(mkMesh(new THREE.SphereGeometry(0.014,6,5),
      new THREE.MeshStandardMaterial({color:0xffaa44,emissive:0xff6622,emissiveIntensity:2.2,transparent:true,opacity:0.9,depthWrite:false})).translateX(0.245));
    // Thin streak trail behind the arrow (faint elongated cone)
    g.add(mkMesh(new THREE.ConeGeometry(0.012,0.16,6),
      new THREE.MeshBasicMaterial({color:0xffee88,transparent:true,opacity:0.35,depthWrite:false}))
      .translateX(-0.24).rotateZ(Math.PI/2));

  }else if(type==='proj_magic'){
    // Bright white core
    g.add(mkMesh(new THREE.SphereGeometry(0.07,12,10),
      new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffddff,emissiveIntensity:3.5})));
    // Main purple orb
    g.add(mkMesh(new THREE.SphereGeometry(0.11,14,12),
      new THREE.MeshStandardMaterial({color:0xcc55ff,emissive:0x9933ff,emissiveIntensity:2.0})));
    // Outer translucent glow shell
    g.add(mkMesh(new THREE.SphereGeometry(0.18,12,10),
      new THREE.MeshStandardMaterial({color:0xaa55ff,emissive:0x7733cc,emissiveIntensity:0.9,transparent:true,opacity:0.35,depthWrite:false})));
    // Outermost aura (very faint)
    g.add(mkMesh(new THREE.SphereGeometry(0.26,10,8),
      new THREE.MeshBasicMaterial({color:0xdd88ff,transparent:true,opacity:0.12,depthWrite:false})));
    // Two orbiting sparkle rings (cross-oriented)
    const r1=mkMesh(new THREE.TorusGeometry(0.15,0.012,6,20),
      new THREE.MeshStandardMaterial({color:0xffddff,emissive:0xcc66ff,emissiveIntensity:1.6,transparent:true,opacity:0.75,depthWrite:false}));
    r1.rotation.x=Math.PI/3;g.add(r1);
    r1.userData.spin='ring1';
    const r2=mkMesh(new THREE.TorusGeometry(0.14,0.01,6,20),
      new THREE.MeshStandardMaterial({color:0xffaaff,emissive:0xcc66ff,emissiveIntensity:1.3,transparent:true,opacity:0.6,depthWrite:false}));
    r2.rotation.z=Math.PI/3;g.add(r2);
    r2.userData.spin='ring2';

    // ============ v3.11 DETAIL PASS ============
    // Third orbiting ring (cross-axis)
    const r3=mkMesh(new THREE.TorusGeometry(0.16,0.008,6,24),
      new THREE.MeshStandardMaterial({color:0xddaaff,emissive:0xbb55ff,emissiveIntensity:1.4,transparent:true,opacity:0.55,depthWrite:false}));
    r3.rotation.y=Math.PI/3;r3.rotation.x=Math.PI/5;g.add(r3);
    r3.userData.spin='ring1';
    // Runic symbols floating inside the orb (4 tiny emissive cubes)
    const runeMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.95});
    [[0.06,0,0],[-0.06,0,0],[0,0.06,0],[0,-0.06,0]].forEach(p=>{
      g.add(mkMesh(new THREE.BoxGeometry(0.015,0.015,0.015),runeMat).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    });
    // Sparkle specks orbiting at the outer shell (6 random)
    const sparkMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9,fog:false});
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      g.add(mkMesh(new THREE.TetrahedronGeometry(0.012,0),sparkMat)
        .translateX(Math.cos(a)*0.2).translateY(Math.sin(a)*0.2).translateZ((i%2===0?1:-1)*0.05));
    }
    // Thin lightning tendrils shooting out (4 directions)
    const boltMat=new THREE.MeshBasicMaterial({color:0xffddff,transparent:true,opacity:0.55,depthWrite:false,fog:false});
    [0,Math.PI/2,Math.PI,Math.PI*1.5].forEach(a=>{
      const bolt=mkMesh(new THREE.CylinderGeometry(0.004,0.001,0.18,3),boltMat);
      bolt.position.set(Math.cos(a)*0.24,0,Math.sin(a)*0.24);
      bolt.rotation.z=Math.PI/2-a;
      g.add(bolt);
    });

  }else if(type==='proj_boulder'){
    // Rough rock core with flat shading
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.15,0),
      new THREE.MeshStandardMaterial({color:0x7a7a6a,roughness:0.95,flatShading:true})));
    // Darker cracks/lumps for depth
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.09,0),
      new THREE.MeshStandardMaterial({color:0x554a3a,roughness:0.95,flatShading:true})).translateX(0.06).translateY(0.04));
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.08,0),
      new THREE.MeshStandardMaterial({color:0x99907a,roughness:0.9,flatShading:true})).translateX(-0.06).translateZ(0.05));
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.06,0),
      new THREE.MeshStandardMaterial({color:0x665a4a,roughness:0.9,flatShading:true})).translateX(0.02).translateY(-0.06).translateZ(-0.04));
    // Dust trail cloud behind (3 fading puffs)
    for(let i=0;i<3;i++){
      const dust=mkMesh(new THREE.SphereGeometry(0.1-i*0.015,7,6),
        new THREE.MeshBasicMaterial({color:0xa89866,transparent:true,opacity:0.38-i*0.09,depthWrite:false}));
      dust.position.x=-0.16-i*0.1;
      dust.position.y=(i%2)*0.03;
      g.add(dust);
    }

    // ============ v3.11 DETAIL PASS ============
    const rockMoss=mkMat(0x3a6a2a,{roughness:0.95});
    const rockDark=mkMat(0x3a3028,{roughness:0.95,flatShading:true});
    const rockLight=mkMat(0xaaa088,{roughness:0.9,flatShading:true});
    // Additional overlapping chunks for a bumpier, less uniform shape
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.055,0),rockLight).translateX(0.08).translateY(-0.04).translateZ(0.05));
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.045,0),rockDark).translateX(-0.04).translateY(0.07).translateZ(-0.06));
    g.add(mkMesh(new THREE.DodecahedronGeometry(0.04,0),rockLight).translateX(0.05).translateY(0.06).translateZ(0.08));
    // Moss patches (green clumps on top/side)
    g.add(mkMesh(new THREE.SphereGeometry(0.035,5,4),rockMoss).translateX(0.02).translateY(0.12).translateZ(-0.02));
    g.add(mkMesh(new THREE.SphereGeometry(0.028,5,4),rockMoss).translateX(-0.08).translateY(0.08).translateZ(0.06));
    // Scorch marks (dark patches)
    g.add(mkMesh(new THREE.SphereGeometry(0.025,5,4),mkMat(0x1a1008)).translateX(0.1).translateY(0.02).translateZ(0.1));
    g.add(mkMesh(new THREE.SphereGeometry(0.02,5,4),mkMat(0x0a0504)).translateX(-0.1).translateY(-0.05).translateZ(-0.08));
    // Small flying gravel bits trailing behind
    for(let gi=0;gi<5;gi++){
      g.add(mkMesh(new THREE.DodecahedronGeometry(0.015+Math.random()*0.01,0),rockDark)
        .translateX(-0.22-gi*0.06).translateY((Math.random()-0.5)*0.08).translateZ((Math.random()-0.5)*0.08));
    }
    // Extra wide dust cloud in back
    g.add(mkMesh(new THREE.SphereGeometry(0.14,8,6),
      new THREE.MeshBasicMaterial({color:0x8a7858,transparent:true,opacity:0.22,depthWrite:false}))
      .translateX(-0.42));

  }else{// cannonball
    // Dark iron sphere (metallic)
    g.add(mkMesh(new THREE.SphereGeometry(0.11,14,12),
      new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:0.9,roughness:0.15})));
    // Hot glowing core visible through "cracks"
    g.add(mkMesh(new THREE.SphereGeometry(0.095,10,8),
      new THREE.MeshStandardMaterial({color:0xff3300,emissive:0xff4400,emissiveIntensity:0.7,transparent:true,opacity:0.55,depthWrite:false})));
    // Layered fire trail behind the ball (bright core outward)
    const trailLayers=[
      {c:0xffee88,s:0.045,ox:-0.22,e:2.5,o:0.85},
      {c:0xffaa00,s:0.07, ox:-0.17,e:2.0,o:0.80},
      {c:0xff8800,s:0.085,ox:-0.12,e:1.6,o:0.75},
      {c:0xff4400,s:0.10, ox:-0.07,e:1.2,o:0.70}
    ];
    for(const tc of trailLayers){
      g.add(mkMesh(new THREE.SphereGeometry(tc.s,10,8),
        new THREE.MeshStandardMaterial({color:tc.c,emissive:tc.c,emissiveIntensity:tc.e,transparent:true,opacity:tc.o,depthWrite:false}))
        .translateX(tc.ox));
    }
    // Smoke trail behind the fire
    for(let i=0;i<3;i++){
      g.add(mkMesh(new THREE.SphereGeometry(0.07+i*0.022,7,6),
        new THREE.MeshBasicMaterial({color:0x2a2a2a,transparent:true,opacity:0.35-i*0.09,depthWrite:false}))
        .translateX(-0.32-i*0.09).translateY(0.015*(i+1)));
    }

    // ============ v3.11 DETAIL PASS ============
    // Iron surface pitting (small dark bumps on the sphere)
    const pitMat=mkMat(0x0a0a0a,{metalness:0.9,roughness:0.2});
    [[0.09,0.03,0.04],[-0.04,0.09,0.02],[0.02,-0.08,0.06],[-0.07,-0.04,-0.05],[0.06,0.05,-0.07]].forEach(p=>{
      g.add(mkMesh(new THREE.SphereGeometry(0.015,5,4),pitMat).translateX(p[0]).translateY(p[1]).translateZ(p[2]));
    });
    // Glowing crack lines across the sphere (emissive thin boxes)
    const crackMat=new THREE.MeshStandardMaterial({color:0xff6622,emissive:0xff4400,emissiveIntensity:2.5,transparent:true,opacity:0.9});
    [[0.11,0,0,0],[0,0.11,0,Math.PI/2],[0,0,0.11,0]].forEach(p=>{
      const crack=mkMesh(new THREE.BoxGeometry(0.004,0.08,0.004),crackMat);
      crack.position.set(p[0],p[1],p[2]);
      crack.rotation.z=p[3];
      g.add(crack);
    });
    // Additional curved fire tendrils shooting off the trail (3 angled cones)
    const flameMat=new THREE.MeshStandardMaterial({color:0xff8800,emissive:0xff6600,emissiveIntensity:2.2,transparent:true,opacity:0.7,depthWrite:false});
    [[-0.15,0.08,0.3],[-0.12,-0.07,-0.3],[-0.18,0.03,0.1]].forEach(p=>{
      g.add(mkMesh(new THREE.ConeGeometry(0.025,0.08,6),flameMat).translateX(p[0]).translateY(p[1]).translateZ(p[2]*0.2).rotateZ(p[2]));
    });
    // Ember sparks orbiting the fire trail (5 tiny emissive)
    const emberMat=new THREE.MeshBasicMaterial({color:0xffee88,transparent:true,opacity:0.9,fog:false});
    for(let ei=0;ei<5;ei++){
      const a=ei*1.3;
      g.add(mkMesh(new THREE.SphereGeometry(0.01,4,3),emberMat)
        .translateX(-0.1-ei*0.04).translateY(Math.sin(a)*0.04).translateZ(Math.cos(a)*0.04));
    }
    // Heat distortion outer shell (very faint red sphere)
    g.add(mkMesh(new THREE.SphereGeometry(0.16,10,8),
      new THREE.MeshBasicMaterial({color:0xff6644,transparent:true,opacity:0.12,depthWrite:false})));
    // Extra fat smoke puff further back
    g.add(mkMesh(new THREE.SphereGeometry(0.12,7,6),
      new THREE.MeshBasicMaterial({color:0x2a2a2a,transparent:true,opacity:0.2,depthWrite:false}))
      .translateX(-0.55).translateY(0.06));
    // PERF: no PointLight on projectile — glow is emissive-only.
  }
  return g;
}

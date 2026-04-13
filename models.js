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
  // Scale up for visibility
  g.scale.set(2.2,2.2,2.2);
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
    // Dynamic point light for scene illumination
    // PERF: no PointLight on projectile (was expensive per-active-projectile).
    // Glow comes from emissive materials only.
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
    // PERF: no PointLight on projectile — glow is emissive-only.
  }
  return g;
}

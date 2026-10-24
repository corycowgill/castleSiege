// Castle Siege — v3.33 art pipeline: stylized fantasy asset kit.
// Loaded after models.js by index_3d.html and guide.html.
//
// Original procedural models in the "AAA stylized" direction (chunky
// bevelled stone, gold trim, team-coloured cloth, exaggerated
// proportions). Everything is built from a small shape toolkit below and
// the shared mkMat() toon material, so assets share scale, palette and
// shading conventions.
//
// ASSET REGISTRY — `ART` maps gameplay entity types to builders. The
// existing entry points (createTower / createEnemyModel / createCastle)
// are wrapped: a registered type uses its new builder, anything else (or
// a builder that throws) falls back to the original models.js version.
//
// Conventions (shared with the game's sync code):
//  - world unit = 1 grid tile; ground at y=0; models face +z.
//  - units are built at "model scale" and scaled by the wrapper exactly
//    like the originals (2.2 regular, 3.8 boss) so HP bars, blob
//    shadows and hit boxes stay valid.
//  - animated parts are Groups tagged userData.limb:
//      units:  leftLeg rightLeg leftArm rightArm head weapon (see
//              __cacheEnemyMeshRefs in index_3d.html)
//      towers: aim (yaws toward target), bowL/bowR (flex on fire)
//      castle: dmgA/dmgB (hidden as HP drops), rubA/rubB (shown)
//  - __mergeEnemyModel keeps every tagged group as its own merged mesh,
//    so tags cost one draw call each and nothing more.

// ==================== SHAPE TOOLKIT ====================
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
function __clampf(v,a,b){return v<a?a:v>b?b:v}
function artRng(seed){let s=seed>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}

// Rounded box with analytic smooth normals. s=2 -> pillowy hand-cut
// stone; s=3 -> crisp slab with bevelled edges.
function rbox(w,h,d,r,s){
  s=s||3;r=Math.min(r,w/2,h/2,d/2)*0.999;
  const g=new THREE.BoxGeometry(w,h,d,s,s,s),p=g.attributes.position,n=g.attributes.normal;
  const hx=w/2-r,hy=h/2-r,hz=d/2-r;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const cx=__clampf(x,-hx,hx),cy=__clampf(y,-hy,hy),cz=__clampf(z,-hz,hz);
    let dx=x-cx,dy=y-cy,dz=z-cz;const L=Math.hypot(dx,dy,dz);
    if(L<1e-9)continue;dx/=L;dy/=L;dz/=L;
    p.setXYZ(i,cx+dx*r,cy+dy*r,cz+dz*r);n.setXYZ(i,dx,dy,dz);
  }
  return g;
}
// Ellipsoid.
function ell(rx,ry,rz,ws,hs){const g=new THREE.SphereGeometry(1,ws||12,hs||8);g.scale(rx,ry,rz);return g}
// Hemisphere dome (open at the bottom), for pauldrons/helmets/pads.
function dome(r,ws,hs){return new THREE.SphereGeometry(r,ws||14,hs||7,0,Math.PI*2,0,Math.PI/2)}
function cyl(rt,rb,h,s,open){return new THREE.CylinderGeometry(rt,rb,h,s||14,1,!!open)}
function cone(r,h,s){return new THREE.ConeGeometry(r,h,s||10)}
function torus(R,r,rs,ts,arc){return new THREE.TorusGeometry(R,r,rs||6,ts||20,arc)}
// Lathe from [[radius,y],...].
function lathe(prof,seg){return new THREE.LatheGeometry(prof.map(([r,y])=>new THREE.Vector2(r,y)),seg||16)}
// Tube along points with radius tapering r0 -> r1 (horns, tusks, bow limbs).
function horn(pts,r0,r1,seg,rs){
  seg=seg||10;rs=rs||7;
  const c=new THREE.CatmullRomCurve3(pts.map(q=>V3(q[0],q[1],q[2])));
  const g=new THREE.TubeGeometry(c,seg,1,rs,false),p=g.attributes.position,v=new THREE.Vector3(),ctr=new THREE.Vector3();
  for(let i=0;i<=seg;i++){
    const t=i/seg;c.getPointAt(t,ctr);const r=r0+(r1-r0)*t;
    for(let j=0;j<=rs;j++){const k=i*(rs+1)+j;v.fromBufferAttribute(p,k).sub(ctr).multiplyScalar(r).add(ctr);p.setXYZ(k,v.x,v.y,v.z)}
  }
  g.computeVertexNormals();return g;
}
function strap(pts,r,seg){return horn(pts,r,r,seg||10,5)}
// Flat shape extruded and centred on z (blades, ears, shields, crests).
function ext(shape,depth,bevel){
  const b=bevel===undefined?depth*0.4:bevel;
  const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:1,curveSegments:5});
  g.translate(0,0,-depth/2);g.computeVertexNormals();return g;
}
function shapeLeaf(len,wid){const s=new THREE.Shape();s.moveTo(0,0);s.quadraticCurveTo(wid,len*0.38,0,len);s.quadraticCurveTo(-wid,len*0.38,0,0);return s}
function shapeBlade(len,w){const s=new THREE.Shape();s.moveTo(-w,0);s.lineTo(-w*0.85,len*0.72);s.lineTo(0,len);s.lineTo(w*0.85,len*0.72);s.lineTo(w,0);s.lineTo(-w,0);return s}
function shapeShield(w,h){const s=new THREE.Shape();s.moveTo(-w,h);s.lineTo(w,h);s.lineTo(w,h*0.2);s.quadraticCurveTo(w*0.95,-h*0.55,0,-h);s.quadraticCurveTo(-w*0.95,-h*0.55,-w,h*0.2);s.lineTo(-w,h);return s}
function shapeArch(w,h,t){
  // stone arch frame: outer arch minus inner opening
  const s=new THREE.Shape(),o=w/2+t;
  s.moveTo(-o,0);s.lineTo(-o,h);s.absarc(0,h,o,Math.PI,0,true);s.lineTo(o,0);s.lineTo(w/2,0);s.lineTo(w/2,h);s.absarc(0,h,w/2,0,Math.PI,false);s.lineTo(-w/2,0);s.lineTo(-o,0);
  return s;
}
// Hanging cloth banner: top edge at y=0, pointed tail, gentle ripple.
function bannerGeo(w,h,tail,wave,phase){
  const g=new THREE.PlaneGeometry(w,h,4,8);g.translate(0,-h/2,0);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),t=-y/h;
    const yy=y-tail*t*(1-Math.abs(x)/(w/2));
    const z=Math.sin(t*Math.PI*1.4+x*6+(phase||0))*wave*t;
    p.setXYZ(i,x,yy,z);
  }
  g.computeVertexNormals();return g;
}
// Ragged skirt / loincloth ring with a jagged hem.
function skirt(rTop,rBot,h,seg,jag,seed){
  const g=new THREE.CylinderGeometry(rTop,rBot,h,seg||14,2,true),p=g.attributes.position,R=artRng(seed||7);
  const cuts=[];for(let i=0;i<=(seg||14);i++)cuts.push(R());
  for(let i=0;i<p.count;i++){
    const y=p.getY(i);if(y>-h/2+1e-5)continue;
    const a=Math.atan2(p.getZ(i),p.getX(i)),k=Math.round(((a/(Math.PI*2))+1)%1*(seg||14));
    p.setY(i,y-jag*(k%2?1:0.25+cuts[k]*0.6));
  }
  g.computeVertexNormals();return g;
}
// Evenly spread unit vectors (spike placement).
function fibDirs(n){const out=[],ga=Math.PI*(3-Math.sqrt(5));for(let i=0;i<n;i++){const y=1-2*(i+0.5)/n,r=Math.sqrt(1-y*y),a=i*ga;out.push(V3(Math.cos(a)*r,y,Math.sin(a)*r))}return out}

// Placement helpers.
function P(parent,geo,mat,pos,rot,scl){
  const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;
  if(pos)m.position.set(pos[0],pos[1],pos[2]);
  if(rot)m.rotation.set(rot[0]||0,rot[1]||0,rot[2]||0);
  if(scl!==undefined)typeof scl==='number'?m.scale.setScalar(scl):m.scale.set(scl[0],scl[1],scl[2]);
  parent.add(m);return m;
}
function G(parent,pos,limb,rot){const g=new THREE.Group();if(pos)g.position.set(pos[0],pos[1],pos[2]);if(rot)g.rotation.set(rot[0]||0,rot[1]||0,rot[2]||0);if(limb)g.userData.limb=limb;parent.add(g);return g}
// Point a cone/cylinder (built along +y) along direction d.
const __UP=V3(0,1,0);
function alignY(mesh,d){mesh.quaternion.setFromUnitVectors(__UP,d.clone().normalize());return mesh}

// ==================== PALETTE ====================
// One palette for every asset. Team colours are deep (cloth, roofs) or
// bright (trim); the rest is neutral so the two crowns read instantly.
const ART_TEAM={
  1:{cloth:0x2446a8,clothD:0x1a3480,roof:0x2b55c8,trim:0x5d8cff},
  2:{cloth:0xa82a34,clothD:0x7a1c24,roof:0xc23a40,trim:0xff6a72},
};
function artMats(owner){
  const T=ART_TEAM[owner]||ART_TEAM[1],DS=THREE.DoubleSide;
  return{
    stone:mkMat(0xcfc2a4,{map:texStone()}),stoneD:mkMat(0xa59478,{map:texStone()}),
    block1:mkMat(0xd6c8a6),block2:mkMat(0xc4b38e),block3:mkMat(0xe1d4b6),blockD:mkMat(0x9c8b6c),
    gold:mkMat(0xf0b43c,{metalness:0.85,roughness:0.3}),goldD:mkMat(0xb8862a,{metalness:0.8}),
    iron:mkMat(0x4b505c,{metalness:0.7}),ironD:mkMat(0x30333b,{metalness:0.6}),steel:mkMat(0xa8b0bc,{metalness:0.85}),
    rust:mkMat(0x8a6a52,{metalness:0.4}),
    wood:mkMat(0x9a6434,{map:texWood()}),woodD:mkMat(0x6e4626,{map:texWood()}),
    leather:mkMat(0x6b4426),leatherD:mkMat(0x4a2e1a),fur:mkMat(0x5e4634),ivory:mkMat(0xf0e6cc),
    cloth:mkMat(T.cloth,{side:DS}),clothD:mkMat(T.clothD,{side:DS}),roof:mkMat(T.roof,{map:texShingle()}),trim:mkMat(T.trim),
    rope:mkMat(0xc8a46a),dark:mkMat(0x1c1612),black:mkMat(0x0c0c0e),
    glowWarm:mkMat(0xffc860,{emissive:0xff9a30,emissiveIntensity:1.6}),
    flame:mkMat(0xffb040,{emissive:0xff6a10,emissiveIntensity:2.4}),flameCore:mkMat(0xfff0b0,{emissive:0xffd070,emissiveIntensity:3}),
  };
}
const TEAM_OF=o=>ART_TEAM[o]||ART_TEAM[1];

// Gold crest emblem (lion-ish shield badge) used on banners and shields.
function crest(parent,M,pos,s,rotY){
  const g=G(parent,pos,null,[0,rotY||0,0]);
  P(g,ext(shapeShield(0.5*s,0.55*s),0.04*s,0.012*s),M.gold,[0,0,0]);
  P(g,ext(shapeShield(0.38*s,0.42*s),0.05*s,0.008*s),M.clothD,[0,0.01*s,0.01*s]);
  // stylised crown on the badge
  const cg=G(g,[0,0.12*s,0.04*s]);
  P(cg,rbox(0.42*s,0.1*s,0.03*s,0.01*s),M.gold,[0,0,0]);
  for(const x of[-0.16,0,0.16])P(cg,cone(0.05*s,0.16*s,5),M.gold,[x*s,0.12*s,0]);
  return g;
}
// Banner with gold rod + crest. Hangs from `pos` facing +z (rotY turns it).
function banner(parent,M,pos,w,h,rotY,phase){
  const g=G(parent,pos,null,[0,rotY||0,0]);
  P(g,bannerGeo(w,h,h*0.18,w*0.06,phase),M.cloth,[0,0,0]);
  P(g,cyl(0.012,0.012,w*1.15,8),M.gold,[0,0.01,0.004],[0,0,Math.PI/2]);
  for(const x of[-1,1])P(g,ell(0.02,0.02,0.02,8,6),M.gold,[x*w*0.58,0.01,0.004]);
  P(g,bannerGeo(w*0.86,h*0.05,0,0),M.gold,[0,-h*0.08,0.006]);
  crest(g,M,[0,-h*0.38,0.012],w*0.55);
  return g;
}

// ==================== TOWER: ARROW BASTION (turret) ====================
// Stone block pedestal + rotating ballista. Three distinct tiers:
//  L1 compact crossbow, L2 reinforced w/ plating + crank, L3 massive
//  twin-limbed ballista with triple bolts, spikes and a crest shield.
function buildArrowBastion(owner,level){
  const L=Math.max(1,Math.min(3,level||1)),M=artMats(owner),R=artRng(31+L),g=new THREE.Group();
  const blocks=[M.block1,M.block2,M.block3];
  P(g,rbox(0.94,0.13,0.94,0.04,3),M.blockD,[0,0.065,0]);
  const layers=2+L,lh=0.19;let y=0.13;let w=0.82;
  for(let i=0;i<layers;i++){
    w=0.82-i*0.03;
    P(g,rbox(w-0.08,lh,w-0.08,0.02,2),M.blockD,[0,y+lh/2,0]);
    for(let side=0;side<4;side++){
      const along=(side%2===i%2)?w:w-0.22,n=2,len=along/n,a=side*Math.PI/2;
      const nx=Math.sin(a),nz=Math.cos(a),tx=Math.cos(a),tz=-Math.sin(a);
      for(let k=0;k<n;k++){
        const off=-along/2+len*(k+0.5),bw=len-0.012,bh=lh-0.012+(R()-0.5)*0.01;
        const m=P(g,rbox(bw,bh,0.12,0.03,2),blocks[(R()*3)|0],[nx*(w/2-0.06)+tx*off,y+lh/2,nz*(w/2-0.06)+tz*off],[0,a+(R()-0.5)*0.03,0]);
        m.rotation.z=(R()-0.5)*0.02;
      }
    }
    y+=lh;
  }
  // gold trim + crowning platform
  P(g,rbox(w+0.05,0.05,w+0.05,0.02,3),M.gold,[0,y+0.02,0]);y+=0.045;
  P(g,rbox(w+0.1,0.1,w+0.1,0.03,3),M.block1,[0,y+0.05,0]);y+=0.1;
  // banners hang from the platform lip
  const sides=L===1?[0,2]:[0,1,2,3],bh=0.36+0.1*L,bw=0.27;
  for(const sd of sides){const a=sd*Math.PI/2;banner(g,M,[Math.sin(a)*(w/2+0.075),y-0.04,Math.cos(a)*(w/2+0.075)],bw,bh,a,sd)}
  if(L>=2){
    for(const[sx,sz]of[[1,1],[1,-1],[-1,1],[-1,-1]]){
      const cx=sx*(w/2+0.01),cz=sz*(w/2+0.01);
      P(g,rbox(0.14,0.16,0.14,0.03,2),M.block3,[cx,y+0.08,cz]);
      P(g,rbox(0.16,0.035,0.16,0.012,3),M.gold,[cx,y+0.175,cz]);
      if(L>=3)P(g,cone(0.035,0.14,6),M.gold,[cx,y+0.26,cz]);
    }
  }
  // ---- rotating ballista ----
  const aim=G(g,[0,y,0],'aim');
  const S=0.85+0.17*L; // weapon scale per tier
  P(aim,cyl(0.21,0.24,0.06,18),M.ironD,[0,0.03,0]);
  P(aim,torus(0.225,0.016,6,28),M.gold,[0,0.06,0],[Math.PI/2,0,0]);
  P(aim,rbox(0.13,0.2,0.13,0.03),M.woodD,[0,0.15,0]);
  const by=0.27;
  const stockLen=0.6*S;
  P(aim,rbox(0.13*S,0.09*S,stockLen,0.025),M.wood,[0,by,0.04]);
  for(let i=0;i<2+L;i++)P(aim,rbox(0.145*S,0.105*S,0.025,0.008),M.gold,[0,by,-0.2*S+i*(0.42*S/(1+L))]);
  if(L>=2){
    for(const sx of[-1,1]){
      P(aim,rbox(0.02,0.11*S,0.34*S,0.008),M.iron,[sx*0.075*S,by,0.0]);
      for(let i=0;i<3;i++)P(aim,ell(0.012,0.012,0.012,6,5),M.gold,[sx*0.087*S,by+0.02,-0.12*S+i*0.12*S]);
    }
    // winch crank at the back
    const cr=G(aim,[0,by,-stockLen/2+0.03]);
    P(cr,torus(0.07*S,0.012,6,18),M.iron,[0,0,-0.02],[0,0,0]);
    for(let i=0;i<4;i++)P(cr,rbox(0.012,0.13*S,0.012,0.004),M.iron,[0,0,-0.02],[0,0,i*Math.PI/4]);
    P(cr,cyl(0.02,0.02,0.2*S,8),M.ironD,[0,0,0],[0,0,Math.PI/2]);
  }
  // bow limbs (flex on fire)
  const front=stockLen/2+0.02,pairs=L>=3?2:1,limbs=[];
  for(let pIdx=0;pIdx<pairs;pIdx++){
    const yo=by+(pIdx?-0.075*S:0.012);
    for(const sx of[1,-1]){
      const lg=G(aim,[sx*0.05*S,yo,front-0.06],sx>0?'bowL':'bowR');
      const span=(0.36+0.05*L)*S*(pIdx?0.82:1);
      P(lg,horn([[0,0,0],[sx*span*0.45,0,0.03],[sx*span,0,-0.1*S]],0.035*S,0.016*S,10,7),pIdx?M.woodD:M.wood);
      P(lg,rbox(0.06*S,0.05*S,0.05*S,0.012),M.gold,[sx*0.01,0,0]);
      P(lg,cone(0.022*S,0.07*S,6),L>=2?M.gold:M.iron,[sx*span,0,-0.1*S],[0,0,-sx*Math.PI/2]);
      limbs.push({sx,span,yo});
    }
  }
  // bowstrings (to the nock)
  const nockZ=-0.05;
  for(const l of limbs)P(aim,strap([[l.sx*(0.05*S+l.span),l.yo,front-0.06-0.1*S],[0,l.yo+0.01,nockZ]],0.005,4),M.rope);
  // bolts
  const bolts=L>=3?[-0.12,0,0.12]:[0];
  for(const a of bolts){
    const bg=G(aim,[0,by+0.06*S,0.02],null,[0,a,0]);
    P(bg,cyl(0.012,0.012,0.72*S,6),M.woodD,[0,0,0.05],[Math.PI/2,0,0]);
    P(bg,cone(0.03*S,0.1*S,4),M.steel,[0,0,0.05+0.4*S],[Math.PI/2,0,0]);
    for(const r of[0,Math.PI/2])P(bg,rbox(0.004,0.05*S,0.08*S,0.002),M.cloth,[0,0,0.05-0.3*S],[0,0,r]);
  }
  if(L>=3){
    // armoured prow with crest + spikes
    P(aim,rbox(0.26*S,0.18*S,0.03,0.015),M.iron,[0,by-0.02,front+0.03]);
    crest(aim,M,[0,by-0.02,front+0.06],0.36*S);
    for(const sx of[-1,1])P(aim,cone(0.02,0.12*S,6),M.steel,[sx*0.11*S,by-0.08*S,front+0.05],[Math.PI/2,0,0]);
    P(aim,ell(0.05,0.05,0.05,10,8),M.gold,[0,by+0.12*S,-0.05]);
  }
  g.userData.artLevel=L;
  return g;
}

// ==================== ENEMY: GOBLIN ====================
// Small, wiry, oversized ears and grin, team-coloured bandana and rags,
// rusty short sword. Model scale (game multiplies by 2.2).
function buildGoblin(owner){
  const M=artMats(owner),g=new THREE.Group();
  const skin=mkMat(0x6e9a38),skinD=mkMat(0x4f7428),skinIn=mkMat(0xb26a5a);
  const eye=mkMat(0xffe46a,{emissive:0x7a5a00,emissiveIntensity:0.6});
  // legs
  for(const sx of[-1,1]){
    const lg=G(g,[sx*0.042,0.13,0],sx<0?'leftLeg':'rightLeg');
    P(lg,ell(0.03,0.045,0.033,8,6),skin,[0,-0.028,0.006],[-0.25,0,0]);
    P(lg,ell(0.023,0.04,0.025,8,6),skinD,[0,-0.08,0.012],[0.15,0,0]);
    P(lg,torus(0.024,0.006,4,9),M.leather,[0,-0.07,0.012],[Math.PI/2,0,0]);
    P(lg,ell(0.03,0.016,0.052,8,6),skinD,[0,-0.118,0.028]);
    for(const tx of[-0.016,0,0.016])P(lg,cone(0.006,0.018,5),M.ivory,[tx,-0.122,0.078],[Math.PI/2,0,0]);
  }
  // hips: rags + belt
  P(g,skirt(0.058,0.08,0.075,14,0.02,3),M.cloth,[0,0.12,0]);
  P(g,torus(0.06,0.011,4,9),M.leather,[0,0.158,0],[Math.PI/2,0,0]);
  P(g,rbox(0.03,0.026,0.012,0.005,2),M.gold,[0,0.158,0.064]);
  P(g,rbox(0.035,0.04,0.025,0.01,2),M.leatherD,[0.058,0.14,0.02],[0,0.6,0]);
  // torso (hunched)
  P(g,ell(0.064,0.08,0.056,8,6),skin,[0,0.215,-0.004],[0.32,0,0]);
  P(g,ell(0.056,0.05,0.05,10,6),skin,[0,0.182,0.014]);
  P(g,strap([[-0.06,0.28,0.02],[0,0.225,0.062],[0.062,0.165,0.04]],0.008),M.leather);
  P(g,torus(0.05,0.012,5,12),M.clothD,[0,0.28,0.008],[Math.PI/2+0.3,0,0]);
  // left shoulder pad
  const sp=P(g,dome(0.042,10,6),M.iron,[-0.072,0.27,0],[0,0,0.55]);sp.scale.set(1,0.75,1);
  for(const z of[-0.018,0.018])P(g,ell(0.007,0.007,0.007,6,4),M.gold,[-0.09,0.285,z]);
  // head
  const hd=G(g,[0,0.295,0.025],'head');
  P(hd,ell(0.084,0.074,0.078,13,9),skin,[0,0.07,0]);
  P(hd,ell(0.068,0.04,0.062,11,7),skin,[0,0.03,0.018]);
  // ears — the signature silhouette
  for(const sx of[-1,1]){
    const eg=G(hd,[sx*0.07,0.08,-0.005],null,[0,-sx*0.35,sx*(-Math.PI/2+0.42)]);
    P(eg,ext(shapeLeaf(0.17,0.05),0.008,0.003),skin);
    P(eg,ext(shapeLeaf(0.12,0.03),0.006,0.002),skinIn,[0,0.02,0.007]);
    if(sx<0)P(eg,torus(0.012,0.003,4,10),M.gold,[0,0.045,0],[0,Math.PI/2,0]);
  }
  // face: big eyes, angry brows, long nose, toothy grin
  for(const sx of[-1,1]){
    P(hd,ell(0.022,0.018,0.012,8,6),eye,[sx*0.034,0.085,0.068],[0,sx*0.3,0]);
    P(hd,ell(0.008,0.009,0.006,8,6),M.black,[sx*0.032,0.084,0.079]);
    P(hd,rbox(0.042,0.012,0.016,0.005,2),skinD,[sx*0.034,0.108,0.07],[0,0,sx*0.45]);
  }
  P(hd,cone(0.016,0.075,8),skin,[0,0.062,0.1],[Math.PI/2+0.35,0,0]);
  P(hd,ell(0.044,0.013,0.02,12,6),M.dark,[0,0.03,0.077]);
  for(let i=0;i<5;i++){const x=-0.03+i*0.015;P(hd,cone(0.005,i===0||i===4?0.022:0.012,4),M.ivory,[x,0.04,0.088],[Math.PI,0,0])}
  // bandana with knot tails
  P(hd,torus(0.081,0.013,5,14),M.cloth,[0,0.105,-0.004],[Math.PI/2-0.28,0,0]);
  for(const sx of[-1,1])P(hd,bannerGeo(0.022,0.07,0.012,0.006),M.cloth,[sx*0.012,0.12,-0.085],[0.5,0,sx*0.3]);
  // arms
  for(const sx of[-1,1]){
    const ag=G(g,[sx*0.082,0.262,0],sx<0?'leftArm':'rightArm');
    P(ag,ell(0.021,0.044,0.023,8,6),skin,[sx*0.008,-0.04,0],[0,0,sx*0.18]);
    P(ag,ell(0.02,0.04,0.022,8,6),skin,[sx*0.016,-0.098,0.016],[-0.3,0,0]);
    P(ag,torus(0.021,0.006,4,9),M.leather,[sx*0.016,-0.1,0.016],[Math.PI/2-0.3,0,0]);
    P(ag,ell(0.026,0.022,0.026,8,6),skin,[sx*0.018,-0.138,0.03]);
    if(sx>0){
      // rusty short sword
      const sw=G(ag,[sx*0.018,-0.14,0.04],null,[1.05,0,0]);
      P(sw,cyl(0.008,0.008,0.045,6),M.leatherD,[0,0,0]);
      P(sw,rbox(0.055,0.012,0.014,0.004,2),M.iron,[0,0.026,0]);
      P(sw,ext(shapeBlade(0.15,0.016),0.005,0.002),M.rust,[0,0.03,0]);
    }
  }
  return g;
}

// ==================== BOSS: WARLORD TROLL ====================
// Hulking green warlord: spiked pauldrons, iron wrist guards, giant
// spiked mace, tusks, team war banners on the back. Model scale (x3.8).
function buildTroll(owner){
  const M=artMats(owner),g=new THREE.Group();
  const skin=mkMat(0x6f8a3a),skinD=mkMat(0x52692a),scar=mkMat(0x8a5a48);
  const eye=mkMat(0xff5a30,{emissive:0xff2a10,emissiveIntensity:2.2});
  // legs
  for(const sx of[-1,1]){
    const lg=G(g,[sx*0.17,0.42,0],sx<0?'leftLeg':'rightLeg');
    P(lg,ell(0.12,0.17,0.13,12,8),skin,[0,-0.1,0.01]);
    P(lg,ell(0.1,0.14,0.11,12,8),skinD,[0,-0.26,0.03]);
    P(lg,torus(0.1,0.022,6,18),M.leather,[0,-0.28,0.03],[Math.PI/2,0,0]);
    const kp=P(lg,dome(0.075,12,6),M.iron,[0,-0.18,0.1],[Math.PI/2-0.3,0,0]);kp.scale.set(1,1,0.6);
    P(lg,cone(0.02,0.07,6),M.steel,[0,-0.17,0.15],[Math.PI/2,0,0]);
    P(lg,ell(0.13,0.06,0.17,14,8),skinD,[0,-0.38,0.06]);
    for(const tx of[-0.07,0,0.07])P(lg,cone(0.022,0.06,6),M.ivory,[tx,-0.39,0.22],[Math.PI/2,0,0]);
  }
  // hips: fur kilt, belt, skull buckle, team loincloth
  P(g,skirt(0.27,0.33,0.16,18,0.05,5),M.fur,[0,0.4,0]);
  P(g,cyl(0.28,0.29,0.08,22),M.leather,[0,0.48,0]);
  P(g,rbox(0.14,0.11,0.04,0.015),M.gold,[0,0.48,0.285]);
  P(g,ell(0.04,0.045,0.03,10,8),M.ivory,[0,0.49,0.31]);
  for(const sx of[-1,1])P(g,ell(0.011,0.012,0.008,6,5),M.black,[sx*0.015,0.495,0.335]);
  P(g,bannerGeo(0.25,0.3,0.06,0.015),M.cloth,[0,0.45,0.3],[0.12,0,0]);
  P(g,bannerGeo(0.3,0.32,0.06,0.015),M.cloth,[0,0.45,-0.29],[-0.12,Math.PI,0]);
  // torso — hunched, huge upper body
  P(g,ell(0.27,0.22,0.24,12,8),skin,[0,0.62,0.06]);
  P(g,ell(0.34,0.29,0.27,12,8),skin,[0,0.84,0.02],[0.35,0,0]);
  P(g,ell(0.26,0.2,0.2,12,8),skinD,[0,0.98,-0.13]);
  for(const sx of[-1,1])P(g,ell(0.15,0.1,0.08,12,8),skin,[sx*0.12,0.9,0.22],[0.35,0,0]);
  P(g,rbox(0.012,0.12,0.02,0.005),scar,[0.12,0.84,0.29],[0.3,0,0.6]);
  P(g,strap([[-0.3,1.02,0.08],[-0.05,0.86,0.3],[0.22,0.6,0.25]],0.028),M.leather);
  P(g,strap([[-0.3,1.02,0.08],[-0.1,0.95,-0.3],[0.22,0.6,-0.22]],0.028),M.leather);
  P(g,cyl(0.07,0.07,0.03,14),M.iron,[-0.06,0.84,0.31],[Math.PI/2-0.35,0,0]);
  P(g,cone(0.025,0.09,6),M.steel,[-0.06,0.85,0.35],[Math.PI/2-0.35,0,0]);
  // back war banners
  for(const sx of[-1,1]){
    const bp=G(g,[sx*0.12,0.98,-0.26],null,[-0.18,0,sx*0.12]);
    P(bp,cyl(0.016,0.016,0.95,8),M.woodD,[0,0.4,0]);
    P(bp,cone(0.03,0.1,6),M.gold,[0,0.92,0]);
    banner(bp,M,[0,0.82,0.02],0.2,0.36,0,sx);
  }
  // head
  const hd=G(g,[0,1.06,0.2],'head');hd.scale.setScalar(1.25);
  P(hd,ell(0.14,0.13,0.14,12,8),skin,[0,0.06,0]);
  P(hd,ell(0.15,0.045,0.07,14,8),skinD,[0,0.1,0.09]);
  P(hd,ell(0.155,0.085,0.135,12,8),skin,[0,-0.01,0.05]);
  P(hd,ell(0.045,0.035,0.035,10,8),skinD,[0,0.05,0.15]);
  for(const sx of[-1,1]){
    P(hd,ell(0.02,0.016,0.012,8,6),eye,[sx*0.052,0.08,0.135]);
    P(hd,rbox(0.06,0.018,0.025,0.008),skinD,[sx*0.05,0.105,0.13],[0,0,sx*0.4]);
    P(hd,horn([[sx*0.085,0.0,0.14],[sx*0.1,0.07,0.17],[sx*0.085,0.14,0.15]],0.024,0.004,8,7),M.ivory);
    P(hd,ext(shapeLeaf(0.09,0.035),0.012,0.004),skinD,[sx*0.13,0.07,-0.01],[0,-sx*0.5,sx*(-Math.PI/2+0.6)]);
  }
  for(let i=0;i<4;i++)P(hd,cone(0.008,0.02,4),M.ivory,[-0.045+i*0.03,0.03,0.175]);
  P(hd,rbox(0.012,0.06,0.02,0.005),scar,[0.08,0.05,0.13],[0,0.4,0.3]);
  P(hd,cone(0.05,0.16,8),M.dark,[0,0.2,-0.06],[-0.5,0,0]);
  P(hd,torus(0.04,0.01,5,12),M.gold,[0,0.17,-0.04],[Math.PI/2-0.5,0,0]);
  // arms
  for(const sx of[-1,1]){
    const ag=G(g,[sx*0.42,0.98,0.05],sx<0?'leftArm':'rightArm');
    // pauldron: dome + gold rim share one tilted frame; three big spikes
    const pf=G(ag,[sx*0.03,0.04,0],null,[0,0,-sx*0.45]);
    const pd=P(pf,dome(0.21,16,8),M.iron,[0,0,0]);pd.scale.set(1,0.8,1.05);
    P(pf,torus(0.208,0.024,6,28),M.gold,[0,0.005,0],[Math.PI/2,0,0]);
    for(const[a,len]of[[-0.55,0.3],[0,0.36],[0.55,0.3]]){
      const d=V3(Math.sin(a)*0.55,1,Math.sin(a)*0.25+0.05).normalize();
      const sp=P(pf,cone(0.05,len,7),M.steel,[d.x*0.13,0.1+len*0.25,d.z*0.13]);alignY(sp,d);
    }
    P(ag,ell(0.11,0.18,0.12,12,8),skin,[sx*0.03,-0.2,0],[0,0,sx*0.15]);
    P(ag,ell(0.13,0.17,0.14,12,8),skin,[sx*0.06,-0.46,0.05],[-0.2,0,0]);
    P(ag,cyl(0.13,0.12,0.13,16),M.iron,[sx*0.07,-0.56,0.06],[-0.2,0,0]);
    P(ag,torus(0.13,0.012,5,20),M.gold,[sx*0.07,-0.5,0.05],[Math.PI/2-0.2,0,0]);
    for(let i=0;i<4;i++){const a=i*Math.PI/2+0.4;const d=V3(Math.cos(a),0,Math.sin(a));const sp=P(ag,cone(0.022,0.09,6),M.steel,[sx*0.07+d.x*0.13,-0.56,0.06+d.z*0.13]);alignY(sp,d)}
    P(ag,ell(0.12,0.11,0.12,12,8),skinD,[sx*0.07,-0.68,0.08]);
    if(sx>0){
      // giant spiked mace
      const w=G(ag,[sx*0.07,-0.68,0.1],'weapon',[0.9,0,0]);
      P(w,cyl(0.034,0.04,0.8,10),M.woodD,[0,0.3,0]);
      for(let i=0;i<3;i++)P(w,torus(0.04,0.011,5,12),M.leather,[0,0.02+i*0.05,0],[Math.PI/2,0,0]);
      P(w,ell(0.05,0.03,0.05,10,6),M.gold,[0,-0.11,0]);
      P(w,ell(0.17,0.19,0.17,14,10),M.iron,[0,0.78,0]);
      for(const yy of[0.68,0.88])P(w,torus(0.168,0.022,6,24),M.gold,[0,yy,0],[Math.PI/2,0,0]);
      for(const d of fibDirs(16)){const sp=P(w,cone(0.035,0.14,6),M.steel,[d.x*0.17,0.78+d.y*0.19,d.z*0.17]);alignY(sp,d)}
    }else{
      for(let i=0;i<3;i++)P(ag,cone(0.016,0.05,5),M.steel,[sx*0.07-0.04+i*0.04,-0.66,0.2],[Math.PI/2,0,0]);
    }
  }
  return g;
}

// ==================== CASTLE ====================
// Heroic fortress: four roofed corner towers, front mid towers, a
// gatehouse with arched doors, portcullis and crest, a tall keep with
// spires, hanging banners, braziers and torches. Built facing +x (owner
// 1); owner 2 is rotated 180°. Footprint matches the old castle (front
// wall on the field edge) and extends west, off the playfield.
function buildCastle(owner){
  const M=artMats(owner),T=TEAM_OF(owner),root=new THREE.Group(),g=G(root),R=artRng(91);
  const roofTower=(parent,x,z,r,h,roofH,opts={})=>{
    const tg=G(parent,[x,0,z],opts.tag);
    P(tg,cyl(r*1.02,r*1.16,0.32,18),M.stoneD,[0,0.16,0]);
    P(tg,cyl(r,r*1.02,h-0.32,18),M.stone,[0,0.32+(h-0.32)/2,0]);
    P(tg,torus(r*1.01,0.025,5,24),M.gold,[0,h*0.62,0],[Math.PI/2,0,0]);
    // machicolation ring + corbels + merlons
    P(tg,cyl(r*1.2,r*1.12,0.14,20),M.stoneD,[0,h+0.04,0]);
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;P(tg,rbox(0.08,0.12,0.08,0.02,2),M.blockD,[Math.cos(a)*r*1.08,h-0.07,Math.sin(a)*r*1.08],[0,-a,0])}
    const mg=G(tg,[0,0,0],opts.mtag);
    for(let i=0;i<10;i++){const a=(i+0.5)/10*Math.PI*2;P(mg,rbox(0.13,0.16,0.1,0.025,2),M.block1,[Math.cos(a)*r*1.12,h+0.19,Math.sin(a)*r*1.12],[0,-a+Math.PI/2,0])}
    // windows (warm glow) facing outwards
    for(const yy of[h*0.4,h*0.75])P(tg,rbox(0.05,0.14,0.05,0.02),M.glowWarm,[(opts.face||1)*r*0.99,yy,0]);
    const rg=G(tg,[0,0,0],opts.rtag);
    P(rg,cyl(r*1.28,r*1.28,0.05,20),M.trim,[0,h+0.28,0]);
    P(rg,cone(r*1.26,roofH,20),M.roof,[0,h+0.28+roofH/2,0]);
    P(rg,ell(0.05,0.05,0.05,10,8),M.gold,[0,h+0.32+roofH,0]);
    P(rg,cone(0.025,0.28,8),M.gold,[0,h+0.48+roofH,0]);
    P(rg,cyl(0.008,0.008,0.4,6),M.ironD,[0,h+0.5+roofH,0]);
    P(rg,bannerGeo(0.2,0.12,0,0.02,R()*6),M.cloth,[0.1,h+0.66+roofH,0],[Math.PI/2,0,Math.PI/2]);
    return tg;
  };
  const wallRun=(parent,x0,z0,x1,z1,h,thick,tagM)=>{
    const len=Math.hypot(x1-x0,z1-z0),a=Math.atan2(x1-x0,z1-z0),cx=(x0+x1)/2,cz=(z0+z1)/2;
    const wg=G(parent,[cx,0,cz],null,[0,a,0]);
    P(wg,rbox(thick,h,len,0.03,3),M.stone,[0,h/2,0]);
    P(wg,rbox(thick+0.06,0.07,len,0.02,3),M.stoneD,[0,h+0.02,0]);
    P(wg,rbox(thick+0.04,0.05,len+0.02,0.015,3),M.gold,[0,h*0.55,0]);
    const n=Math.max(2,Math.floor(len/0.3)),mg=G(wg,[0,0,0],tagM);
    for(let i=0;i<n;i++){const z=-len/2+(i+0.5)*len/n;for(const sx of[-1,1])P(i%3===1&&sx>0?mg:wg,rbox(0.1,0.18,0.15,0.025,2),M.block1,[sx*(thick/2-0.03),h+0.14,z])}
    return wg;
  };
  // foundation + courtyard
  // front face stays at local x<=1 (the old castle's edge) so nothing
  // intrudes on buildable column 2
  P(g,rbox(2.7,0.22,8.5,0.06,3),M.blockD,[-0.6,0.06,0]);
  P(g,rbox(2.2,0.05,7.4,0.02,3),M.stoneD,[-0.6,0.17,0]);
  const FX=0.55,BX=-1.75,ZE=3.75;
  // curtain walls
  wallRun(g,FX,-ZE,FX,-0.7,1.45,0.32,'dmgA');
  wallRun(g,FX,0.7,FX,ZE,1.45,0.32,'dmgB');
  wallRun(g,BX,-ZE,BX,ZE,1.3,0.3);
  wallRun(g,BX,-ZE,FX,-ZE,1.35,0.3);
  wallRun(g,BX,ZE,FX,ZE,1.35,0.3);
  // towers
  roofTower(g,FX,-ZE,0.46,2.3,1.35,{face:1,mtag:'dmgB'});
  roofTower(g,FX,ZE,0.46,2.3,1.35,{face:1,rtag:'dmgB'});
  roofTower(g,BX,-ZE,0.42,2.1,1.2,{face:-1});
  roofTower(g,BX,ZE,0.42,2.1,1.2,{face:-1,mtag:'dmgA'});
  roofTower(g,FX+0.02,-2.0,0.32,1.9,0.95,{face:1});
  roofTower(g,FX+0.02,2.0,0.32,1.9,0.95,{face:1,rtag:'dmgA'});
  // hanging banners on the outer face of the front wall
  for(const z of[-2.85,-1.2,1.2,2.85])banner(g,M,[FX+0.19,1.38,z],0.32,0.78,Math.PI/2,z);
  // torches between banners
  for(const z of[-2.4,-0.95,0.95,2.4]){
    P(g,rbox(0.06,0.06,0.06,0.015),M.ironD,[FX+0.19,1.0,z]);
    P(g,cyl(0.03,0.02,0.07,8),M.ironD,[FX+0.22,1.06,z]);
    P(g,cone(0.035,0.11,8),M.flame,[FX+0.22,1.15,z]);
  }
  // ---- gatehouse ----
  const gh=G(g,[FX+0.1,0,0]);
  for(const sz of[-1,1]){
    P(gh,rbox(0.66,2.15,0.56,0.04,3),M.stone,[0,1.075,sz*0.66]);
    P(gh,rbox(0.72,0.07,0.62,0.02,3),M.gold,[0,1.5,sz*0.66]);
    for(const[mx,mz]of[[-0.24,-0.2],[0.24,-0.2],[-0.24,0.2],[0.24,0.2]])P(gh,rbox(0.13,0.17,0.13,0.025,2),M.block1,[mx,2.24,sz*0.66+mz]);
    P(gh,cone(0.55,0.95,4),M.roof,[0,2.7,sz*0.66],[0,Math.PI/4,0]);
    P(gh,ell(0.04,0.04,0.04,8,6),M.gold,[0,3.2,sz*0.66]);
    P(gh,cone(0.02,0.22,6),M.gold,[0,3.32,sz*0.66]);
    for(const yy of[0.95,1.75])P(gh,rbox(0.05,0.16,0.07,0.02),M.glowWarm,[0.33,yy,sz*0.66]);
  }
  P(gh,rbox(0.6,0.55,0.8,0.03,3),M.stone,[0,1.62,0]);
  for(let i=0;i<5;i++)P(gh,rbox(0.13,0.17,0.13,0.025,2),M.block1,[0.24,2.0,-0.32+i*0.16]);
  // recess + doors + arch + portcullis
  P(gh,rbox(0.1,1.15,0.74,0.02,2),M.dark,[0.27,0.75,0]);
  const door=G(gh,[0.33,0,0],null,[0,Math.PI/2,0]);
  for(const sz of[-1,1]){
    P(door,rbox(0.33,1.05,0.06,0.015,3),M.wood,[sz*0.17,0.7,0]);
    for(const yy of[0.4,0.75,1.05])P(door,rbox(0.34,0.035,0.075,0.01),M.iron,[sz*0.17,yy,0]);
    for(const yy of[0.3,0.6,0.9])P(door,ell(0.012,0.012,0.01,6,5),M.gold,[sz*0.06,yy,0.035]);
    P(door,torus(0.035,0.008,5,12),M.gold,[sz*0.05,0.62,0.045]);
  }
  P(door,ext(shapeArch(0.7,1.05,0.1),0.14,0.02),M.block1,[0,0.17,0.02]);
  P(door,rbox(0.12,0.12,0.06,0.02),M.gold,[0,1.62,0.08]);
  for(let i=0;i<6;i++)P(door,rbox(0.018,0.32,0.018,0.005),M.ironD,[-0.25+i*0.1,1.34,0.06]);
  for(const yy of[1.22,1.42])P(door,rbox(0.6,0.018,0.018,0.005),M.ironD,[0,yy,0.06]);
  for(let i=0;i<6;i++)P(door,cone(0.012,0.05,4),M.ironD,[-0.25+i*0.1,1.16,0.06],[Math.PI,0,0]);
  crest(door,M,[0,2.05,0.1],0.55);
  // braziers flanking the approach
  for(const sz of[-1,1]){
    const bz=G(g,[FX+0.25,0,sz*1.08]);
    P(bz,rbox(0.22,0.5,0.22,0.03,2),M.block2,[0,0.25,0]);
    P(bz,rbox(0.26,0.05,0.26,0.015,3),M.gold,[0,0.52,0]);
    P(bz,lathe([[0.06,0],[0.15,0.04],[0.17,0.12],[0.15,0.13]],14),M.ironD,[0,0.54,0]);
    P(bz,cone(0.11,0.24,10),M.flame,[0,0.78,0]);
    P(bz,cone(0.06,0.18,8),M.flameCore,[0,0.74,0]);
    for(const d of[[-0.06,0.03],[0.05,-0.05],[0.03,0.06]])P(bz,cone(0.04,0.14,6),M.flame,[d[0],0.72,d[1]]);
  }
  // ---- keep ----
  const kp=G(g,[-0.62,0,0]);
  P(kp,rbox(1.4,2.75,1.95,0.05,3),M.stone,[0,1.375,0]);
  for(const yy of[1.4,2.75])P(kp,rbox(1.46,0.07,2.01,0.02,3),M.gold,[0,yy,0]);
  for(const yy of[1.0,2.05])for(const z of[-0.5,0,0.5]){
    P(kp,rbox(0.05,0.32,0.18,0.03),M.dark,[0.7,yy,z]);
    P(kp,rbox(0.04,0.26,0.13,0.03),M.glowWarm,[0.71,yy,z]);
  }
  for(let i=0;i<6;i++)for(const sz of[-1,1])P(kp,rbox(0.13,0.17,0.13,0.025,2),M.block1,[-0.6+i*0.24,2.88,sz*0.92]);
  for(const[sx,sz]of[[1,1],[1,-1],[-1,1],[-1,-1]]){
    const t=G(kp,[sx*0.72,0,sz*0.98]);
    P(t,cyl(0.18,0.2,1.1,14),M.stone,[0,2.55,0]);
    P(t,cyl(0.23,0.21,0.1,14),M.stoneD,[0,3.12,0]);
    P(t,cone(0.25,0.62,14),M.roof,[0,3.48,0]);
    P(t,cone(0.015,0.18,6),M.gold,[0,3.86,0]);
  }
  P(kp,rbox(0.9,0.95,1.2,0.04,3),M.stone,[0,3.22,0]);
  P(kp,rbox(0.05,0.26,0.16,0.03),M.glowWarm,[0.46,3.25,0]);
  P(kp,cone(0.92,1.45,4),M.roof,[0,4.42,0],[0,Math.PI/4,0]);
  const sp=G(kp,[0,0,0],'dmgB');
  P(sp,ell(0.06,0.06,0.06,10,8),M.gold,[0,5.18,0]);
  P(sp,cone(0.03,0.45,8),M.gold,[0,5.45,0]);
  P(sp,cyl(0.01,0.01,0.6,6),M.ironD,[0,5.55,0]);
  P(sp,bannerGeo(0.34,0.2,0,0.03,1),M.cloth,[0,5.75,0.17],[Math.PI/2,0,Math.PI/2]);
  // ---- rubble shown as the castle takes damage ----
  const rubble=(tag,n,seed)=>{const rg=G(g,[0,0,0],tag),r=artRng(seed);rg.visible=false;
    for(let i=0;i<n;i++){const x=FX+0.1+r()*0.3,z=(r()-0.5)*7;P(rg,new THREE.DodecahedronGeometry(0.06+r()*0.08,0),[M.block1,M.block2,M.blockD][i%3],[x,0.08,z],[r()*3,r()*3,r()*3])}};
  rubble('rubA',14,5);rubble('rubB',22,9);
  if(owner===2)g.rotation.y=Math.PI;
  return root;
}
// Castle HP -> visual damage state (healthy / damaged / critical).
function artCastleDamage(root,pct){
  if(!root)return;
  const st=pct>0.66?0:pct>0.33?1:2;
  if(root.userData._dmgState===st)return;root.userData._dmgState=st;
  if(!root.userData._dmgGroups){const d={};root.traverse(o=>{const l=o.userData&&o.userData.limb;if(l&&/^(dmg|rub)[AB]$/.test(l))(d[l]=d[l]||[]).push(o)});root.userData._dmgGroups=d}
  const D=root.userData._dmgGroups,set=(k,v)=>{for(const o of D[k]||[])o.visible=v};
  set('dmgA',st<1);set('dmgB',st<2);set('rubA',st>=1);set('rubB',st>=2);
}

// ==================== SHARED TOWER PARTS ====================
// Stone-block pedestal (same language as the Arrow Bastion). Returns the
// top height and width so the crown can sit on it.
function pedestal(g,M,R,layers,w0,banners,bannerLen){
  const blocks=[M.block1,M.block2,M.block3];
  P(g,rbox(w0+0.12,0.13,w0+0.12,0.04,3),M.blockD,[0,0.065,0]);
  const lh=0.19;let y=0.13,w=w0;
  for(let i=0;i<layers;i++){
    w=w0-i*0.03;
    P(g,rbox(w-0.08,lh,w-0.08,0.02,2),M.blockD,[0,y+lh/2,0]);
    for(let side=0;side<4;side++){
      const along=(side%2===i%2)?w:w-0.22,n=2,len=along/n,a=side*Math.PI/2;
      const nx=Math.sin(a),nz=Math.cos(a),tx=Math.cos(a),tz=-Math.sin(a);
      for(let k=0;k<n;k++){const off=-along/2+len*(k+0.5);
        P(g,rbox(len-0.012,lh-0.012+(R()-0.5)*0.01,0.12,0.03,2),blocks[(R()*3)|0],[nx*(w/2-0.06)+tx*off,y+lh/2,nz*(w/2-0.06)+tz*off],[0,a+(R()-0.5)*0.03,(R()-0.5)*0.02])}
    }
    y+=lh;
  }
  P(g,rbox(w+0.05,0.05,w+0.05,0.02,3),M.gold,[0,y+0.02,0]);y+=0.045;
  P(g,rbox(w+0.1,0.1,w+0.1,0.03,3),M.block1,[0,y+0.05,0]);y+=0.1;
  for(const sd of banners){const a=sd*Math.PI/2;banner(g,M,[Math.sin(a)*(w/2+0.075),y-0.04,Math.cos(a)*(w/2+0.075)],0.27,bannerLen,a,sd)}
  return{y,w};
}
function cornerMerlons(g,M,w,y,spikes){
  for(const[sx,sz]of[[1,1],[1,-1],[-1,1],[-1,-1]]){
    const cx=sx*(w/2+0.01),cz=sz*(w/2+0.01);
    P(g,rbox(0.14,0.16,0.14,0.03,2),M.block3,[cx,y+0.08,cz]);
    P(g,rbox(0.16,0.035,0.16,0.012,3),M.gold,[cx,y+0.175,cz]);
    if(spikes)P(g,cone(0.035,0.14,6),M.gold,[cx,y+0.26,cz]);
  }
}
// Animated group helper: tags drive syncTowers' ambient animation.
function A(parent,pos,limb,opts){const g=G(parent,pos,limb);Object.assign(g.userData,opts||{});return g}

// ==================== TOWER: ARCANE SPIRE (magic) ====================
// Floating crystal held by brass rings over a stone pedestal.
//  L1 single crystal + one ring, L2 bigger crystal, two rings, runes,
//  L3 monumental crystal, three rings, orbiting shards, arc spikes.
function buildArcaneSpire(owner,level){
  const L=Math.max(1,Math.min(3,level||1)),M=artMats(owner),R=artRng(57+L),g=new THREE.Group();
  const {y,w}=pedestal(g,M,R,1+L,0.78,L===1?[0,2]:[0,1,2,3],0.34+0.08*L);
  if(L>=2)cornerMerlons(g,M,w,y,L>=3);
  const crys=mkMat(0x58b4ff,{emissive:0x2a7aff,emissiveIntensity:1.5});
  const core=mkMat(0xd8f4ff,{emissive:0x9ad8ff,emissiveIntensity:2.6});
  const rune=mkMat(0x8ad0ff,{emissive:0x4aa0ff,emissiveIntensity:2});
  // brass cradle
  P(g,lathe([[0.2,0],[0.22,0.04],[0.16,0.1],[0.1,0.16],[0.12,0.2]],18),M.goldD,[0,y,0]);
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2;P(g,horn([[Math.cos(a)*0.18,0,Math.sin(a)*0.18],[Math.cos(a)*0.24,0.16,Math.sin(a)*0.24],[Math.cos(a)*0.15,0.3,Math.sin(a)*0.15]],0.022,0.01,8,5),M.gold,[0,y,0]);}
  if(L>=2)for(let i=0;i<4;i++){const a=i/4*Math.PI*2+0.4;P(g,rbox(0.05,0.07,0.012,0.01,2),rune,[Math.sin(a)*(w/2+0.05),y-0.19,Math.cos(a)*(w/2+0.05)],[0,a,0])}
  const S=0.8+0.2*L,cy=y+0.36+0.12*L;
  const fl=A(g,[0,cy,0],'float',{amp:0.05,spd:1.6});
  const cr=A(fl,[0,0,0],'spin',{spd:0.6});
  const oct=new THREE.OctahedronGeometry(0.18*S,0);oct.scale(1,1.65,1);
  P(cr,oct,crys);
  const oc2=new THREE.OctahedronGeometry(0.09*S,0);oc2.scale(1,1.7,1);
  P(cr,oc2,core);
  // rings (each spins on its own axis)
  const rings=L;
  for(let i=0;i<rings;i++){
    const rg=A(fl,[0,0,0],'spin',{spd:(i%2?-1:1)*(0.9+i*0.4),axis:i===0?'y':i===1?'x':'z'});
    const tilt=G(rg,[0,0,0],null,[Math.PI/2+(i===0?0:0.6),0,i*0.9]);
    P(tilt,torus(0.27*S+i*0.06,0.016,6,32),M.gold);
    for(let k=0;k<4;k++){const a=k/4*Math.PI*2;P(tilt,ell(0.022,0.022,0.022,8,6),rune,[Math.cos(a)*(0.27*S+i*0.06),Math.sin(a)*(0.27*S+i*0.06),0])}
  }
  if(L>=3){
    const orb=A(fl,[0,0,0],'spin',{spd:-0.7});
    for(let k=0;k<5;k++){const a=k/5*Math.PI*2;const sh=new THREE.OctahedronGeometry(0.045,0);sh.scale(1,1.8,1);P(orb,sh,crys,[Math.cos(a)*0.42,Math.sin(k*1.7)*0.08,Math.sin(a)*0.42])}
    for(const sx of[-1,1])P(g,cone(0.025,0.3,6),M.gold,[sx*0.16,y+0.15,0],[0,0,-sx*0.3]);
  }
  g.userData.artLevel=L;return g;
}

// ==================== TOWER: STONEBREAKER (catapult) ====================
// Wooden mangonel. L1 sled frame, L2 reinforced w/ small wheels and
// plating, L3 heavy siege engine with big iron-shod wheels. The arm
// ('arm') flings on the shot and winds back over the reload time.
function buildStonebreaker(owner,level){
  const L=Math.max(1,Math.min(3,level||1)),M=artMats(owner),g=new THREE.Group();
  const aim=G(g,[0,0,0],'aim');
  const S=0.85+0.12*L,wy=L===1?0.08:0.16+0.04*L;
  // chassis beams
  for(const sx of[-1,1]){
    P(aim,rbox(0.1*S,0.1*S,0.92*S,0.02,3),M.wood,[sx*0.27*S,wy,0]);
    if(L>=2)for(const z of[-0.3,0.3])P(aim,rbox(0.11*S,0.115*S,0.04,0.01),M.iron,[sx*0.27*S,wy,z*S]);
  }
  for(const z of[-0.36,0,0.36])P(aim,rbox(0.64*S,0.08*S,0.09*S,0.02,3),M.woodD,[0,wy+0.02,z*S]);
  P(aim,rbox(0.5*S,0.04,0.7*S,0.01,3),M.woodD,[0,wy+0.06,0]);
  if(L===1){for(const sx of[-1,1])P(aim,rbox(0.12*S,0.06,0.98*S,0.025,3),M.woodD,[sx*0.27*S,0.03,0])}
  else{
    const wr=(0.1+0.05*L)*S;
    for(const sx of[-1,1])for(const z of[-0.3,0.3]){
      const wh=G(aim,[sx*0.36*S,wr,z*S],null,[0,0,Math.PI/2]);
      P(wh,cyl(wr,wr,0.07*S,16),M.wood);
      P(wh,torus(wr,0.018,5,20),L>=3?M.iron:M.ironD,[0,0.04*S,0],[Math.PI/2,0,0]);
      P(wh,torus(wr,0.018,5,20),L>=3?M.iron:M.ironD,[0,-0.04*S,0],[Math.PI/2,0,0]);
      P(wh,cyl(0.03,0.03,0.11*S,8),M.gold,[0,0,0]);
      if(L>=3)for(let k=0;k<8;k++){const a=k/8*Math.PI*2;P(wh,ell(0.012,0.012,0.012,5,4),M.steel,[Math.cos(a)*wr,0.045*S,Math.sin(a)*wr])}
    }
    P(aim,cyl(0.025,0.025,0.8*S,8),M.ironD,[0,wr,-0.3*S],[0,0,Math.PI/2]);
    P(aim,cyl(0.025,0.025,0.8*S,8),M.ironD,[0,wr,0.3*S],[0,0,Math.PI/2]);
  }
  // A-frame uprights + axle
  const ay=wy+0.42*S;
  for(const sx of[-1,1]){
    P(aim,rbox(0.07*S,0.5*S,0.07*S,0.015),M.wood,[sx*0.22*S,wy+0.25*S,-0.08*S],[0.25,0,0]);
    P(aim,rbox(0.07*S,0.5*S,0.07*S,0.015),M.wood,[sx*0.22*S,wy+0.25*S,0.12*S],[-0.25,0,0]);
    P(aim,rbox(0.1*S,0.08*S,0.1*S,0.02),M.gold,[sx*0.22*S,ay,0.02*S]);
  }
  P(aim,rbox(0.5*S,0.06*S,0.06*S,0.015),M.woodD,[0,ay+0.04*S,0.26*S]); // crossbar the arm strikes
  P(aim,rbox(0.52*S,0.035,0.08*S,0.01),M.leather,[0,ay+0.075*S,0.26*S]);
  P(aim,cyl(0.035,0.035,0.5*S,10),M.iron,[0,ay,0.02*S],[0,0,Math.PI/2]);
  // torsion rope bundles
  for(const sx of[-1,1])for(let k=0;k<3;k++)P(aim,torus(0.05*S,0.014,5,14),M.rope,[sx*(0.1+k*0.035)*S,ay,0.02*S],[0,Math.PI/2,0]);
  // throwing arm (rests cocked back, flings forward)
  const arm=A(aim,[0,ay,0.02*S],'arm',{rest:-0.3,fire:1.75});
  P(arm,rbox(0.07*S,0.07*S,0.72*S,0.015,3),M.wood,[0,0,-0.3*S],[0,0,0]);
  for(let k=0;k<2+L;k++)P(arm,rbox(0.085*S,0.085*S,0.025,0.008),L>=2?M.gold:M.iron,[0,0,-0.08*S-k*0.14*S]);
  const cupZ=-0.66*S;
  P(arm,lathe([[0,0],[0.1,0.01],[0.13,0.06],[0.12,0.075]],12),M.woodD,[0,0.02,cupZ],[0,0,0],S);
  const ammo=G(arm,[0,0.11*S,cupZ],'ammo');
  P(ammo,new THREE.DodecahedronGeometry(0.1*S,1),M.blockD);
  if(L>=3){P(aim,rbox(0.36*S,0.24*S,0.04,0.02),M.iron,[0,wy+0.17,0.5*S]);crest(aim,M,[0,wy+0.17,0.53*S],0.28*S)}
  banner(aim,M,[0,wy+0.12,-0.5*S],0.22,0.22+0.05*L,Math.PI,1);
  g.userData.artLevel=L;return g;
}

// ==================== TOWER: IRON THUNDER (bombard) ====================
// Black-iron cannon on a stone emplacement. L3 is an oversized ornate
// bombard with a glowing, heated muzzle.
function buildIronThunder(owner,level){
  const L=Math.max(1,Math.min(3,level||1)),M=artMats(owner),R=artRng(77+L),g=new THREE.Group();
  const {y,w}=pedestal(g,M,R,L,0.86,[0,1,2,3].slice(0,L===1?2:4),0.26+0.06*L);
  if(L>=2)cornerMerlons(g,M,w,y,L>=3);
  const aim=A(g,[0,y,0],'aim',{recoil:0.16});
  const S=0.85+0.15*L;
  // wooden carriage with iron straps
  for(const sx of[-1,1]){
    P(aim,rbox(0.08*S,0.24*S,0.56*S,0.02,3),M.wood,[sx*0.17*S,0.14*S,0]);
    for(const z of[-0.18,0.18])P(aim,rbox(0.09*S,0.25*S,0.03,0.008),M.iron,[sx*0.17*S,0.14*S,z*S]);
    const wh=G(aim,[sx*0.24*S,0.1*S,-0.12*S],null,[0,0,Math.PI/2]);
    P(wh,cyl(0.1*S,0.1*S,0.05*S,14),M.woodD);P(wh,torus(0.1*S,0.014,5,18),M.iron,[0,0,0],[Math.PI/2,0,0]);
  }
  // barrel (lathe profile: breech knob -> body -> flared muzzle)
  const len=(0.62+0.08*L)*S,r=(0.11+0.015*L)*S;
  const prof=[[0,-0.08],[0.06,-0.08],[0.09,-0.04],[1.0,0.0],[1.05,0.12],[0.95,0.35],[0.82,0.82],[0.9,0.88],[1.08,0.93],[1.08,1.0],[0.7,1.0],[0.65,0.9]];
  const bg=G(aim,[0,0.3*S,-0.05*S],null,[Math.PI/2-0.22,0,0]);
  P(bg,lathe(prof.map(([a,b])=>[a*r,b*len]),18),M.ironD,[0,-len*0.35,0]);
  for(const t of[0.12,0.38,0.62,0.86])P(bg,torus(r*(1.04-t*0.2)+0.008,0.02*S,6,20),L>=2?M.gold:M.iron,[0,-len*0.35+t*len,0],[Math.PI/2,0,0]);
  P(bg,ell(0.05*S,0.05*S,0.05*S,8,6),M.gold,[0,-len*0.35-0.1*S,0]);
  // trunnions
  P(bg,cyl(0.035*S,0.035*S,0.36*S,10),M.iron,[0,0,0],[0,0,Math.PI/2]);
  // muzzle (heated glow on L3)
  const muz=L>=3?mkMat(0xff8a3a,{emissive:0xff4a10,emissiveIntensity:2.6}):M.black;
  P(bg,cyl(r*0.64,r*0.64,0.02,16),muz,[0,-len*0.35+len*0.99,0]);
  if(L>=3){
    for(let k=0;k<6;k++){const a=k/6*Math.PI*2;P(bg,cone(0.025*S,0.08*S,5),M.gold,[Math.cos(a)*r*1.1,-len*0.35+len*0.96,Math.sin(a)*r*1.1],[0,0,0])}
    crest(aim,M,[0,0.2*S,0.3*S],0.26*S);
  }
  // shot pile
  for(const[x,z]of[[0.3,-0.3],[0.36,-0.22],[0.33,-0.38]])P(g,ell(0.05,0.05,0.05,8,6),M.ironD,[x,y+0.05,z]);
  g.userData.artLevel=L;return g;
}

// ==================== FORTIFICATIONS ====================
// Stone wall tile: chunky staggered blocks, merlons, team cloth.
function buildStoneWall(owner){
  const M=artMats(owner),R=artRng(13),g=new THREE.Group(),bl=[M.block1,M.block2,M.block3];
  P(g,rbox(0.96,0.1,0.96,0.03,3),M.blockD,[0,0.05,0]);
  const rows=3,rh=0.27;
  for(let i=0;i<rows;i++){
    const y=0.1+i*rh+rh/2;
    P(g,rbox(0.78,rh,0.78,0.02,2),M.blockD,[0,y,0]);
    for(let side=0;side<4;side++){
      const a=side*Math.PI/2,nx=Math.sin(a),nz=Math.cos(a),tx=Math.cos(a),tz=-Math.sin(a);
      const n=(i+side)%2?2:3,along=0.9,len=along/n;
      for(let k=0;k<n;k++){const off=-along/2+len*(k+0.5);
        P(g,rbox(len-0.02,rh-0.02,0.16,0.05,2),bl[(R()*3)|0],[nx*0.38+tx*off,y,nz*0.38+tz*off],[(R()-0.5)*0.04,a,(R()-0.5)*0.04])}
    }
  }
  const top=0.1+rows*rh;
  P(g,rbox(0.92,0.06,0.92,0.02,3),M.stoneD,[0,top+0.03,0]);
  for(const[x,z]of[[-0.3,-0.3],[0.3,-0.3],[-0.3,0.3],[0.3,0.3]])P(g,rbox(0.22,0.2,0.22,0.05,2),bl[(R()*3)|0],[x,top+0.16,z]);
  P(g,rbox(0.94,0.04,0.94,0.015,3),M.gold,[0,top-0.02,0]);
  banner(g,M,[0,top-0.06,0.475],0.3,0.42,0,R()*6);
  return g;
}
// Wooden spike palisade.
function buildPalisade(owner){
  const M=artMats(owner),R=artRng(29),g=new THREE.Group();
  P(g,rbox(0.9,0.06,0.5,0.03,2),M.leatherD,[0,0.03,0]);
  const n=6;
  for(let i=0;i<n;i++){
    const x=-0.4+i*0.16,h=0.5+R()*0.14,r=0.055+R()*0.012,lean=(R()-0.5)*0.12;
    const lg=G(g,[x,0,(i%2?0.06:-0.04)],null,[-0.32+lean,0,(R()-0.5)*0.08]);
    P(lg,cyl(r,r*1.08,h,8),[M.wood,M.woodD][i%2]);
    P(lg,cone(r,0.17,8),M.wood,[0,h/2+0.085,0]);
    P(lg,cone(r*0.55,0.07,6),M.ivory,[0,h/2+0.15,0]);
  }
  for(const[y,z]of[[0.2,0.13],[0.4,0.04]]){P(g,rbox(0.96,0.05,0.06,0.015),M.woodD,[0,y,z],[-0.32,0,0]);for(let i=0;i<n;i++)P(g,torus(0.06,0.012,4,10),M.rope,[-0.4+i*0.16,y,z+0.005],[0.3,0,0])}
  // crossed spikes in front
  for(const sx of[-1,1])P(g,horn([[sx*0.32,0.02,0.22],[sx*0.2,0.18,0.38]],0.04,0.008,4,6),M.wood);
  banner(g,M,[0.02,0.55,0.15],0.2,0.24,0,2);
  return g;
}

// ==================== SHARED CHARACTER PARTS ====================
// Leg with thigh/shin/foot; armour=true swaps skin for plate + greave.
function legRig(g,side,x,hip,mats,o){
  const lg=G(g,[side*x,hip,0],side<0?'leftLeg':'rightLeg'),h=hip;
  P(lg,ell(o.tw,h*0.36,o.tw*1.08,10,7),mats.thigh,[0,-h*0.24,0.005]);
  P(lg,ell(o.sw,h*0.32,o.sw*1.1,10,7),mats.shin,[0,-h*0.62,0.01]);
  if(o.knee)P(lg,ell(o.sw*1.1,o.sw*0.9,o.sw*0.7,8,6),mats.knee,[0,-h*0.42,o.sw*0.8]);
  if(o.wrap)P(lg,torus(o.sw*1.05,o.sw*0.22,4,10),mats.wrap,[0,-h*0.58,0.01],[Math.PI/2,0,0]);
  P(lg,ell(o.fw,h*0.12,o.fl,10,6),mats.foot,[0,-h*0.9,o.fl*0.45]);
  return lg;
}
function armRig(g,side,x,y,mats,o){
  const ag=G(g,[side*x,y,0],side<0?'leftArm':'rightArm');
  P(ag,ell(o.uw,o.len*0.3,o.uw*1.05,10,7),mats.upper,[side*o.uw*0.3,-o.len*0.27,0],[0,0,side*0.14]);
  P(ag,ell(o.fw,o.len*0.28,o.fw*1.05,10,7),mats.fore,[side*o.uw*0.55,-o.len*0.7,o.fw*0.5],[-0.25,0,0]);
  if(o.bracer)P(ag,cyl(o.fw*1.08,o.fw*1.02,o.len*0.2,10),mats.bracer,[side*o.uw*0.55,-o.len*0.74,o.fw*0.55],[-0.25,0,0]);
  P(ag,ell(o.hand,o.hand*0.9,o.hand,10,7),mats.hand,[side*o.uw*0.6,-o.len,o.fw*0.9]);
  ag.userData.handPos=[side*o.uw*0.6,-o.len,o.fw*0.9];
  return ag;
}

// ==================== ENEMY: ORC BRUISER ====================
function buildOrc(owner){
  const M=artMats(owner),g=new THREE.Group();
  const skin=mkMat(0x6c8c3c),skinD=mkMat(0x4e6a2a);
  const eye=mkMat(0xffd040,{emissive:0xff8a00,emissiveIntensity:1.4});
  for(const sx of[-1,1])legRig(g,sx,0.085,0.15,{thigh:M.leather,shin:skinD,knee:M.iron,wrap:M.leatherD,foot:M.leatherD},{tw:0.05,sw:0.042,fw:0.05,fl:0.07,knee:1,wrap:1});
  // hips: kilt + belt + team tabard
  P(g,skirt(0.11,0.13,0.08,14,0.025,8),M.fur,[0,0.15,0]);
  P(g,cyl(0.112,0.115,0.04,16),M.leather,[0,0.19,0]);
  P(g,rbox(0.06,0.045,0.02,0.008,2),M.gold,[0,0.19,0.115]);
  P(g,bannerGeo(0.1,0.12,0.025,0.008),M.cloth,[0,0.18,0.12],[0.12,0,0]);
  // torso: barrel chest, hunched
  P(g,ell(0.12,0.1,0.1,12,9),skin,[0,0.25,0.02]);
  P(g,ell(0.16,0.13,0.12,12,9),skin,[0,0.34,0.0],[0.3,0,0]);
  P(g,ell(0.13,0.09,0.09,10,7),skinD,[0,0.4,-0.07]);
  P(g,strap([[-0.15,0.43,0.02],[0,0.34,0.13],[0.13,0.22,0.08]],0.012),M.leather);
  P(g,rbox(0.08,0.07,0.03,0.012,2),M.iron,[0.02,0.33,0.13],[0.3,0.2,0]);
  // head
  const hd=G(g,[0,0.43,0.07],'head');
  P(hd,ell(0.07,0.065,0.07,12,9),skin,[0,0.03,0]);
  P(hd,ell(0.075,0.04,0.065,12,8),skin,[0,-0.005,0.025]);
  P(hd,ell(0.07,0.022,0.035,10,6),skinD,[0,0.05,0.045]);
  for(const sx of[-1,1]){
    P(hd,ell(0.011,0.009,0.007,6,5),eye,[sx*0.026,0.038,0.064]);
    P(hd,horn([[sx*0.04,-0.01,0.07],[sx*0.05,0.03,0.085],[sx*0.04,0.06,0.075]],0.012,0.002,6,5),M.ivory);
    P(hd,ext(shapeLeaf(0.05,0.018),0.006,0.002),skinD,[sx*0.066,0.03,-0.005],[0,-sx*0.4,sx*(-Math.PI/2+0.5)]);
  }
  P(hd,cone(0.022,0.07,7),M.dark,[0,0.1,-0.03],[-0.5,0,0]);
  // arms: big hands, spiked pauldron on the left, spiked mace on the right
  const mats={upper:skin,fore:skin,bracer:M.iron,hand:skinD};
  for(const sx of[-1,1]){
    const ag=armRig(g,sx,0.17,0.38,mats,{uw:0.048,fw:0.05,len:0.21,hand:0.045,bracer:1});
    const pf=G(ag,[sx*0.015,0.015,0],null,[0,0,-sx*0.45]);
    P(pf,dome(sx<0?0.08:0.065,12,6),M.iron);P(pf,torus(sx<0?0.079:0.064,0.009,5,16),sx<0?M.trim:M.leather,[0,0.003,0],[Math.PI/2,0,0]);
    if(sx<0)for(const a of[-0.5,0,0.5]){const d=V3(Math.sin(a)*0.5,1,0.1).normalize();const sp=P(pf,cone(0.018,0.09,6),M.steel,[d.x*0.05,0.04,d.z*0.05]);alignY(sp,d)}
    if(sx>0){
      const w=G(ag,ag.userData.handPos,null,[1.0,0,0]);
      P(w,cyl(0.014,0.016,0.3,8),M.woodD,[0,0.1,0]);
      P(w,ell(0.055,0.065,0.055,10,8),M.iron,[0,0.27,0]);
      P(w,torus(0.055,0.009,5,16),M.gold,[0,0.27,0],[Math.PI/2,0,0]);
      for(const d of fibDirs(10)){const sp=P(w,cone(0.012,0.05,5),M.steel,[d.x*0.055,0.27+d.y*0.065,d.z*0.055]);alignY(sp,d)}
    }
  }
  return g;
}

// ==================== ENEMY: DARK KNIGHT ====================
function buildDarkKnight(owner){
  const M=artMats(owner),T=TEAM_OF(owner),g=new THREE.Group();
  const plate=mkMat(0x3a3e48,{metalness:0.75}),plateD=mkMat(0x23262d,{metalness:0.7});
  const visor=mkMat(T.trim,{emissive:T.trim,emissiveIntensity:2.2});
  for(const sx of[-1,1]){
    const lg=legRig(g,sx,0.065,0.15,{thigh:plateD,shin:plate,knee:plate,wrap:M.trim,foot:plateD},{tw:0.042,sw:0.04,fw:0.042,fl:0.068,knee:1,wrap:1});
    P(lg,cone(0.012,0.04,5),M.steel,[0,-0.065,0.05],[Math.PI/2,0,0]);
  }
  // faulds + tabard
  P(g,skirt(0.09,0.115,0.07,12,0.0,2),plate,[0,0.155,0]);
  P(g,bannerGeo(0.1,0.15,0.03,0.006),M.cloth,[0,0.19,0.1],[0.08,0,0]);
  // cuirass
  P(g,ell(0.1,0.12,0.085,12,9),plateD,[0,0.3,0]);
  P(g,ell(0.11,0.08,0.09,12,8),plate,[0,0.34,0.012]);
  P(g,rbox(0.03,0.12,0.02,0.008,2),M.gold,[0,0.31,0.095]);
  P(g,rbox(0.1,0.022,0.02,0.006,2),M.gold,[0,0.35,0.095]);
  P(g,torus(0.075,0.012,5,16),M.gold,[0,0.22,0],[Math.PI/2,0,0]);
  // cape
  P(g,bannerGeo(0.2,0.32,0.06,0.03,1),M.cloth,[0,0.4,-0.085],[0.18,Math.PI,0]);
  P(g,torus(0.06,0.014,5,14),M.clothD,[0,0.4,-0.02],[Math.PI/2,0,0]);
  // horned helm with glowing visor slit
  const hd=G(g,[0,0.42,0.01],'head');
  P(hd,ell(0.062,0.07,0.066,12,9),plateD,[0,0.05,0]);
  P(hd,rbox(0.11,0.05,0.04,0.012,2),plate,[0,0.04,0.045]);
  P(hd,rbox(0.075,0.011,0.012,0.004,2),visor,[0,0.05,0.066]);
  P(hd,rbox(0.012,0.06,0.01,0.004,2),M.gold,[0,0.075,0.062]);
  for(const sx of[-1,1])P(hd,horn([[sx*0.05,0.08,0],[sx*0.1,0.11,0.02],[sx*0.11,0.18,0.04]],0.016,0.002,8,6),M.ivory);
  P(hd,cone(0.012,0.06,6),M.gold,[0,0.14,0]);
  // pauldrons + arms; greatsword right, kite shield left
  const mats={upper:plateD,fore:plate,bracer:plateD,hand:plateD};
  for(const sx of[-1,1]){
    const ag=armRig(g,sx,0.135,0.37,mats,{uw:0.036,fw:0.036,len:0.19,hand:0.032,bracer:1});
    const pf=G(ag,[sx*0.012,0.01,0],null,[0,0,-sx*0.5]);
    const d0=P(pf,dome(0.06,12,6),plate);d0.scale.set(1,0.8,1.1);
    P(pf,torus(0.059,0.008,5,16),M.gold,[0,0.002,0],[Math.PI/2,0,0]);
    for(const a of[-0.4,0.4]){const d=V3(sx*0.3,1,a).normalize();const sp=P(pf,cone(0.013,0.07,5),M.steel,[d.x*0.035,0.035,d.z*0.035]);alignY(sp,d)}
    const hp=ag.userData.handPos;
    if(sx>0){
      const w=G(ag,hp,null,[1.1,0,0]);
      P(w,cyl(0.009,0.009,0.06,6),M.leatherD,[0,0,0]);
      P(w,ell(0.014,0.014,0.014,6,5),M.gold,[0,-0.035,0]);
      P(w,rbox(0.1,0.016,0.022,0.006,2),M.gold,[0,0.035,0]);
      P(w,ext(shapeBlade(0.32,0.022),0.008,0.003),M.steel,[0,0.04,0]);
      P(w,rbox(0.006,0.24,0.004,0.002,2),plateD,[0,0.15,0.007]);
    }else{
      const sh=G(ag,[hp[0]-0.02,hp[1]+0.04,hp[2]+0.025],null,[0,-0.2,0]);
      P(sh,ext(shapeShield(0.075,0.1),0.012,0.004),M.gold,[0,0,0]);
      P(sh,ext(shapeShield(0.062,0.085),0.016,0.003),M.cloth,[0,0.003,0.002]);
      crest(sh,M,[0,0.01,0.015],0.11);
    }
  }
  return g;
}

// ==================== ENEMY: HOODED ARCHER ====================
function buildArcher(owner){
  const M=artMats(owner),T=TEAM_OF(owner),g=new THREE.Group();
  const skin=mkMat(0xc89a74),eye=mkMat(T.trim,{emissive:T.trim,emissiveIntensity:2});
  for(const sx of[-1,1])legRig(g,sx,0.045,0.12,{thigh:M.leatherD,shin:M.leather,knee:M.leather,wrap:M.leatherD,foot:M.leatherD},{tw:0.03,sw:0.026,fw:0.03,fl:0.05,wrap:1});
  P(g,skirt(0.06,0.085,0.09,12,0.03,4),M.clothD,[0,0.13,0]);
  P(g,torus(0.058,0.009,5,14),M.leather,[0,0.17,0],[Math.PI/2,0,0]);
  // lean leather torso + jerkin
  P(g,ell(0.065,0.1,0.052,10,8),M.leather,[0,0.26,0]);
  P(g,ell(0.06,0.05,0.05,10,7),M.leatherD,[0,0.31,0.008]);
  P(g,strap([[-0.055,0.34,0.03],[0,0.27,0.058],[0.05,0.19,0.035]],0.007),M.leatherD);
  // quiver on the back
  const q=G(g,[0.03,0.3,-0.065],null,[0.25,0,-0.35]);
  P(q,cyl(0.024,0.02,0.17,10),M.leatherD);
  P(q,torus(0.025,0.005,4,10),M.gold,[0,0.06,0],[Math.PI/2,0,0]);
  for(let i=0;i<4;i++){const x=(i-1.5)*0.012;P(q,cyl(0.003,0.003,0.08,4),M.woodD,[x,0.12,0]);P(q,rbox(0.012,0.03,0.002,0.001,2),M.cloth,[x,0.15,0])}
  // cape
  P(g,bannerGeo(0.13,0.24,0.05,0.025,2),M.cloth,[0,0.355,-0.05],[0.12,Math.PI,0]);
  // hood with shadowed face + glowing eyes
  const hd=G(g,[0,0.36,0.01],'head');
  P(hd,ell(0.05,0.055,0.052,10,8),skin,[0,0.04,0.005]);
  P(hd,ell(0.064,0.07,0.064,12,9),M.cloth,[0,0.05,-0.01]);
  P(hd,cone(0.045,0.09,8),M.cloth,[0,0.07,-0.06],[-1.0,0,0]);
  P(hd,ell(0.048,0.05,0.02,10,7),M.dark,[0,0.035,0.045]);
  for(const sx of[-1,1])P(hd,ell(0.009,0.006,0.005,6,4),eye,[sx*0.017,0.045,0.06]);
  P(hd,torus(0.055,0.009,5,14),M.clothD,[0,0.0,0.0],[Math.PI/2,0,0]);
  // arms: bow in the left hand, nocked arrow drawn by the right
  const mats={upper:M.leather,fore:skin,bracer:M.leatherD,hand:M.leatherD};
  for(const sx of[-1,1]){
    const ag=armRig(g,sx,0.08,0.34,mats,{uw:0.022,fw:0.02,len:0.15,hand:0.02,bracer:1});
    if(sx<0){
      const hp=ag.userData.handPos,bw=G(ag,[hp[0],hp[1],hp[2]+0.01],null,[0.15,0,0]);
      P(bw,horn([[0,-0.17,-0.03],[0,-0.09,0.03],[0,0,0.045],[0,0.09,0.03],[0,0.17,-0.03]],0.008,0.008,14,5),M.woodD);
      for(const yy of[-0.17,0.17])P(bw,cone(0.009,0.03,5),M.gold,[0,yy*1.05,-0.035],[yy>0?0:Math.PI,0,0]);
      P(bw,cyl(0.011,0.011,0.035,6),M.leather,[0,0,0.045]);
      P(bw,strap([[0,0.17,-0.03],[0,0,-0.09],[0,-0.17,-0.03]],0.0018,4),M.rope);
      P(bw,cyl(0.0035,0.0035,0.2,4),M.woodD,[0,0,-0.02],[Math.PI/2,0,0]);
      P(bw,cone(0.008,0.025,4),M.steel,[0,0,0.09],[Math.PI/2,0,0]);
    }
  }
  return g;
}

// ==================== BOSS: INFERNAL DRAGON ====================
// Crimson wyvern: huge bat wings (the 'arm' limbs, flapped by the game
// while flying), glowing chest plates, swept black horns, burning maw,
// spiked spade tail. Flight height/semantics stay in gameplay code.
function buildDragon(owner){
  const M=artMats(owner),g=new THREE.Group();
  const scale=mkMat(0xb0242a),scaleD=mkMat(0x6e1418),hornM=mkMat(0x1e1a1c),claw=mkMat(0x2a2224);
  const glow=mkMat(0xffa040,{emissive:0xff5a10,emissiveIntensity:2.2}),eye=mkMat(0xffe060,{emissive:0xffa000,emissiveIntensity:2.4});
  const memb=mkMat(0x7a1a20,{side:THREE.DoubleSide});
  // body
  P(g,ell(0.16,0.15,0.3,14,10),scale,[0,0.5,0],[-0.08,0,0]);
  P(g,ell(0.15,0.15,0.17,12,9),scale,[0,0.54,0.17]);
  for(let i=0;i<6;i++)P(g,rbox(0.16-i*0.012,0.03,0.07,0.012,2),glow,[0,0.4-i*0.004+(i<2?0.02:0),0.24-i*0.085],[0.15,0,0]);
  for(let i=0;i<7;i++)P(g,cone(0.025,0.08-i*0.004,5),hornM,[0,0.66-i*0.012,0.2-i*0.08],[-0.4,0,0]);
  // neck + head
  const nk=G(g,[0,0.6,0.28],'neck');
  P(nk,horn([[0,0,0],[0,0.16,0.12],[0,0.26,0.28]],0.085,0.05,10,9),scale);
  for(let i=0;i<4;i++)P(nk,cone(0.018,0.055,5),hornM,[0,0.07+i*0.06,0.05+i*0.07],[-0.6,0,0]);
  const hd=G(nk,[0,0.27,0.31],'head');
  P(hd,ell(0.07,0.06,0.1,12,9),scale,[0,0.01,0]);
  P(hd,ell(0.05,0.035,0.09,10,7),scale,[0,0.0,0.1]);
  P(hd,ell(0.045,0.022,0.085,10,6),scaleD,[0,-0.04,0.08],[0.18,0,0]);
  P(hd,ell(0.04,0.018,0.07,10,6),glow,[0,-0.025,0.09],[0.1,0,0]);
  for(let i=0;i<4;i++)for(const sx of[-1,1])P(hd,cone(0.006,0.022,4),M.ivory,[sx*0.03,-0.012,0.05+i*0.035],[Math.PI,0,0]);
  for(const sx of[-1,1]){
    P(hd,ell(0.015,0.01,0.01,6,5),eye,[sx*0.045,0.035,0.06]);
    P(hd,rbox(0.05,0.016,0.035,0.006,2),scaleD,[sx*0.042,0.05,0.055],[0,0,sx*0.35]);
    P(hd,horn([[sx*0.04,0.04,-0.02],[sx*0.08,0.08,-0.1],[sx*0.09,0.1,-0.22]],0.022,0.003,8,6),hornM);
    P(hd,horn([[sx*0.06,0.0,-0.02],[sx*0.1,0.01,-0.08],[sx*0.12,0.03,-0.14]],0.012,0.002,6,5),hornM);
  }
  // tail with spade
  const tl=G(g,[0,0.48,-0.28],'tail');
  P(tl,horn([[0,0,0],[0,-0.06,-0.3],[0,-0.03,-0.62],[0,0.02,-0.85]],0.085,0.018,14,8),scale);
  for(let i=0;i<6;i++){const z=-0.08-i*0.13;P(tl,cone(0.018-i*0.002,0.06,5),hornM,[0,0.06-i*0.012-(i>2?0.02:0),z],[-0.5,0,0])}
  P(tl,ext(shapeLeaf(0.16,0.07),0.012,0.004),hornM,[0,0.02,-0.82],[-Math.PI/2,0,0]);
  // legs (tucked while flying)
  for(const sx of[-1,1]){
    const lg=G(g,[sx*0.11,0.42,-0.06],sx<0?'leftLeg':'rightLeg');
    P(lg,ell(0.06,0.09,0.07,10,7),scale,[0,-0.04,0]);
    P(lg,ell(0.035,0.07,0.04,8,6),scaleD,[0,-0.14,-0.03],[0.5,0,0]);
    for(const tx of[-0.025,0,0.025])P(lg,cone(0.01,0.05,4),claw,[tx,-0.2,0.0],[Math.PI*0.75,0,0]);
  }
  // wings
  for(const sx of[-1,1]){
    const wg=G(g,[sx*0.12,0.62,0.08],sx<0?'leftArm':'rightArm');
    const w=G(wg,[0,0,0],null,[0,0,sx*0.38]); // dihedral: rest slightly raised
    const WS=1.3,elbow=[sx*0.3*WS,0.04,-0.04],wrist=[sx*0.58*WS,0.06,0.08];
    P(w,horn([[0,0,0],elbow,wrist],0.035,0.02,10,6),scale);
    P(w,cone(0.016,0.07,5),claw,[wrist[0]+sx*0.02,wrist[1],wrist[2]+0.04],[Math.PI/2,0,0]);
    const tips=[[sx*0.82*WS,0.02,-0.18],[sx*0.66*WS,0.0,-0.46],[sx*0.42*WS,0.0,-0.58],[sx*0.2*WS,0.0,-0.46]];
    for(const t of tips)P(w,horn([wrist,[(wrist[0]+t[0])/2,(wrist[1]+t[1])/2+0.02,(wrist[2]+t[2])/2],t],0.016,0.006,8,5),scaleD);
    // membrane: shape in x/(-z), laid flat, scalloped trailing edge
    const sh=new THREE.Shape(),pts=[[0,0.02],[elbow[0],-elbow[2]],[wrist[0],-wrist[2]],...tips.map(t=>[t[0],-t[2]]),[0,0.3]];
    sh.moveTo(pts[0][0],pts[0][1]);sh.lineTo(pts[1][0],pts[1][1]);sh.lineTo(pts[2][0],pts[2][1]);sh.lineTo(pts[3][0],pts[3][1]);
    for(let i=3;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;sh.quadraticCurveTo(mx*0.9,my*0.82,b[0],b[1])}
    sh.lineTo(0,0.02);
    const mg=new THREE.ShapeGeometry(sh,6);mg.rotateX(-Math.PI/2);
    P(w,mg,memb,[0,0.005,0]);
  }
  // presence: the dragon is the biggest silhouette on the field
  const root=new THREE.Group();g.scale.setScalar(1.45);root.add(g);
  return root;
}

// ==================== BOSS: LICH NECROMANCER ====================
// Undead sorcerer in violet robes: horned gold crown, skull face with
// burning eyes, skeletal hands, an arcane staff and orbiting skulls.
// (The healing aura itself is gameplay code + spawnAuraPulse.)
function buildLich(owner){
  const M=artMats(owner),g=new THREE.Group();
  const robe=mkMat(0x4a2a6e,{side:THREE.DoubleSide}),robeD=mkMat(0x241436,{side:THREE.DoubleSide}),bone=mkMat(0xe6dcc4);
  const arcane=mkMat(0xc070ff,{emissive:0x9a3aff,emissiveIntensity:2.4}),arcaneCore=mkMat(0xf4d8ff,{emissive:0xe0a0ff,emissiveIntensity:3});
  // floating robe with ragged hem + arcane mist ring
  P(g,skirt(0.17,0.32,0.46,18,0.08,11),robe,[0,0.28,0]);
  P(g,skirt(0.14,0.27,0.44,16,0.05,13),robeD,[0,0.27,0]);
  P(g,torus(0.3,0.018,6,28),arcane,[0,0.04,0],[Math.PI/2,0,0]);
  P(g,lathe([[0.17,0],[0.19,0.12],[0.16,0.3],[0.12,0.38]],18),robe,[0,0.5,0]);
  P(g,torus(0.165,0.016,6,22),M.gold,[0,0.52,0],[Math.PI/2,0,0]);
  P(g,bannerGeo(0.12,0.5,0.06,0.01),M.cloth,[0,0.58,0.17],[0.08,0,0]);
  // exposed ribcage under the mantle
  for(let i=0;i<4;i++)P(g,torus(0.09-i*0.008,0.009,4,14,Math.PI),bone,[0,0.82-i*0.045,0.08],[0,0,Math.PI]);
  P(g,cyl(0.012,0.012,0.2,6),bone,[0,0.75,0.085]);
  // mantle with bone spikes
  P(g,ell(0.24,0.1,0.19,14,9),robeD,[0,0.9,0]);
  P(g,torus(0.2,0.016,5,24),M.gold,[0,0.88,0],[Math.PI/2,0,0]);
  for(const sx of[-1,1])for(let k=0;k<3;k++){const d=V3(sx*(0.6+k*0.2),1,(k-1)*0.3).normalize();const sp=P(g,cone(0.018,0.12-k*0.02,5),bone,[sx*(0.14+k*0.04),0.95,(k-1)*0.06]);alignY(sp,d)}
  // head: hood, skull, crown
  const hd=G(g,[0,0.95,0.03],'head');
  P(hd,ell(0.13,0.15,0.13,14,10),robeD,[0,0.1,-0.03]);
  P(hd,ell(0.075,0.088,0.08,12,9),bone,[0,0.09,0.03]);
  P(hd,ell(0.06,0.035,0.055,10,7),bone,[0,0.03,0.05]);
  for(const sx of[-1,1]){P(hd,ell(0.022,0.022,0.012,8,6),M.black,[sx*0.03,0.1,0.098]);P(hd,ell(0.012,0.012,0.008,6,5),arcane,[sx*0.03,0.1,0.104])}
  for(let i=0;i<5;i++)P(hd,rbox(0.01,0.018,0.008,0.003,2),bone,[-0.024+i*0.012,0.03,0.104]);
  P(hd,torus(0.078,0.014,5,22),M.gold,[0,0.15,0.02],[Math.PI/2-0.15,0,0]);
  for(let k=0;k<5;k++){const a=(k-2)*0.45;P(hd,cone(0.016,0.08+(k===2?0.05:0),5),M.gold,[Math.sin(a)*0.078,0.2,0.02+Math.cos(a)*0.078])}
  P(hd,ell(0.016,0.016,0.012,6,5),arcane,[0,0.17,0.1]);
  for(const sx of[-1,1])P(hd,horn([[sx*0.07,0.15,0],[sx*0.14,0.22,-0.04],[sx*0.15,0.34,-0.02]],0.022,0.003,8,6),M.ironD);
  // arms: flared sleeves, skeletal hands; staff in the right hand
  for(const sx of[-1,1]){
    const ag=G(g,[sx*0.2,0.86,0.02],sx<0?'leftArm':'rightArm');
    P(ag,cyl(0.05,0.1,0.32,12,true),robe,[sx*0.02,-0.15,0.02],[-0.2,0,sx*0.1]);
    P(ag,cyl(0.012,0.012,0.12,6),bone,[sx*0.03,-0.3,0.06],[-0.3,0,0]);
    const hand=G(ag,[sx*0.03,-0.36,0.08]);
    P(hand,ell(0.025,0.02,0.03,8,6),bone);
    for(let f=0;f<4;f++)P(hand,cyl(0.005,0.004,0.05,4),bone,[(f-1.5)*0.012,-0.03,0.02],[0.4,0,0]);
    if(sx>0){
      const w=G(hand,[0,0,0.01],'weapon',[0.15,0,0]);
      P(w,cyl(0.014,0.018,1.05,8),M.woodD,[0,0.2,0]);
      P(w,strap([[0.016,-0.2,0],[-0.016,0,0.016],[0.016,0.2,0],[-0.016,0.4,-0.016],[0.016,0.6,0]],0.005,16),M.gold);
      P(w,ell(0.035,0.03,0.035,8,6),bone,[0,0.66,0]);
      for(let k=0;k<3;k++){const a=k/3*Math.PI*2;P(w,horn([[Math.cos(a)*0.02,0.68,Math.sin(a)*0.02],[Math.cos(a)*0.07,0.76,Math.sin(a)*0.07],[Math.cos(a)*0.03,0.86,Math.sin(a)*0.03]],0.012,0.003,6,5),M.gold)}
      P(w,ell(0.055,0.055,0.055,12,9),arcane,[0,0.79,0]);
      P(w,ell(0.028,0.028,0.028,8,6),arcaneCore,[0,0.79,0]);
    }
  }
  // orbiting skulls
  const orb=G(g,[0,0.62,0],'orbit');
  for(let k=0;k<3;k++){const a=k/3*Math.PI*2,sk=G(orb,[Math.cos(a)*0.38,Math.sin(k*2.1)*0.06,Math.sin(a)*0.38]);
    P(sk,ell(0.035,0.04,0.038,10,7),bone);P(sk,ell(0.026,0.015,0.028,8,5),bone,[0,-0.03,0.008]);
    for(const sx of[-1,1])P(sk,ell(0.009,0.009,0.006,6,4),arcane,[sx*0.013,0.004,0.034])}
  return g;
}

// ==================== REGISTRY + ENTRY POINTS ====================
const ART={
  tower:{turret:{levels:3,build:buildArrowBastion},magic:{levels:3,build:buildArcaneSpire},catapult:{levels:3,build:buildStonebreaker},bombard:{levels:3,build:buildIronThunder}},
  build:{wall:buildStoneWall,barricade:buildPalisade},
  enemy:{goblin:{build:buildGoblin},orc:{build:buildOrc},darkKnight:{build:buildDarkKnight},archer:{build:buildArcher},troll:{build:buildTroll,boss:true},dragon:{build:buildDragon,boss:true},lich:{build:buildLich,boss:true}},
  castle:{build:buildCastle},
};
function artHasLevels(type){return !!(ART.tower[type]&&ART.tower[type].levels>1)}
(function(){
  const _tower=createTower,_enemy=createEnemyModel,_castle=createCastle;
  createTower=function(type,owner,level){
    const a=ART.tower[type];
    if(a){try{return a.build(owner,level||1)}catch(e){console.warn('[art] tower',type,e)}}
    return _tower(type,owner);
  };
  createEnemyModel=function(type,owner){
    const a=ART.enemy[type];
    if(a){
      try{
        const g=a.build(owner);
        g.rotation.y=owner===1?-Math.PI/2:Math.PI/2;
        g.scale.setScalar(a.boss?3.8:2.2);
        return g;
      }catch(e){console.warn('[art] enemy',type,e)}
    }
    return _enemy(type,owner);
  };
  const _wall=createWall,_barr=createBarricade;
  createWall=function(owner){try{return ART.build.wall(owner)}catch(e){console.warn('[art] wall',e);return _wall(owner)}};
  createBarricade=function(owner){try{return ART.build.barricade(owner)}catch(e){console.warn('[art] barricade',e);return _barr(owner)}};
  createCastle=function(owner){
    try{return ART.castle.build(owner)}catch(e){console.warn('[art] castle',e);return _castle(owner)}
  };
})();

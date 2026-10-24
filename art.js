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
function torus(R,r,rs,ts){return new THREE.TorusGeometry(R,r,rs||6,ts||20)}
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

// ==================== REGISTRY + ENTRY POINTS ====================
const ART={
  tower:{turret:{levels:3,build:buildArrowBastion}},
  enemy:{goblin:{build:buildGoblin},troll:{build:buildTroll,boss:true}},
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
  createCastle=function(owner){
    try{return ART.castle.build(owner)}catch(e){console.warn('[art] castle',e);return _castle(owner)}
  };
})();

// Castle Siege — v3.31 post-processing: bloom + cinematic colour grade.
// Loaded by index_3d.html. Requires THREE (r160).
//
// The scene renders into a HDR (half-float, MSAA) target. A bright pass
// is downsampled, blurred twice at 1/4 resolution and added back, then a
// composite pass applies ACES tone mapping + sRGB (three's own chunks),
// a split-tone grade (warm highlights / cool shadows), a mild contrast
// curve and a vignette.
//
// Usage:  const post=createPost(renderer);  post.render(scene,camera);
// post.enabled=false falls back to a plain render. It also turns itself
// off if the frame budget is blown for a few seconds (weak GPUs/phones).

function createPost(renderer){
  const isGL2=renderer.capabilities.isWebGL2;
  const ok=isGL2&&(renderer.extensions.has('EXT_color_buffer_float')||renderer.extensions.has('EXT_color_buffer_half_float'));
  const P={enabled:ok,bloom:0.55,threshold:0.82,auto:true,_slow:0,_w:0,_h:0};
  if(!ok){P.render=(s,c)=>renderer.render(s,c);P.resize=()=>{};return P}

  const mkRT=(w,h,samples)=>new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,samples:samples||0,depthBuffer:!!samples});
  let rtScene=mkRT(4,4,4),rtA=mkRT(2,2),rtB=mkRT(2,2);
  const quadCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const quadGeo=new THREE.PlaneGeometry(2,2);
  const quad=new THREE.Mesh(quadGeo);quad.frustumCulled=false;
  const quadScene=new THREE.Scene();quadScene.add(quad);
  const VS=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;

  const brightMat=new THREE.ShaderMaterial({
    uniforms:{tSrc:{value:null},uTh:{value:P.threshold},uTexel:{value:new THREE.Vector2()}},
    vertexShader:VS,toneMapped:false,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D tSrc;uniform float uTh;uniform vec2 uTexel;varying vec2 vUv;
      void main(){
        // 4-tap box downsample + soft-knee threshold
        vec3 c=texture2D(tSrc,vUv+uTexel*vec2(-1.,-1.)).rgb+texture2D(tSrc,vUv+uTexel*vec2(1.,-1.)).rgb
              +texture2D(tSrc,vUv+uTexel*vec2(-1.,1.)).rgb+texture2D(tSrc,vUv+uTexel*vec2(1.,1.)).rgb;
        c*=0.25;
        float l=max(c.r,max(c.g,c.b));
        float k=clamp((l-uTh)/(uTh*0.6+1e-4),0.0,1.0);k*=k;
        gl_FragColor=vec4(c*k,1.0);
      }`});
  const blurMat=new THREE.ShaderMaterial({
    uniforms:{tSrc:{value:null},uDir:{value:new THREE.Vector2()}},
    vertexShader:VS,toneMapped:false,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D tSrc;uniform vec2 uDir;varying vec2 vUv;
      void main(){
        vec3 c=texture2D(tSrc,vUv).rgb*0.2270;
        c+=(texture2D(tSrc,vUv+uDir*1.3846).rgb+texture2D(tSrc,vUv-uDir*1.3846).rgb)*0.3162;
        c+=(texture2D(tSrc,vUv+uDir*3.2308).rgb+texture2D(tSrc,vUv-uDir*3.2308).rgb)*0.0703;
        gl_FragColor=vec4(c,1.0);
      }`});
  const compMat=new THREE.ShaderMaterial({
    uniforms:{tScene:{value:null},tBloom:{value:null},uBloom:{value:P.bloom},uAspect:{value:1}},
    vertexShader:VS,toneMapped:true,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D tScene,tBloom;uniform float uBloom,uAspect;varying vec2 vUv;
      void main(){
        vec3 col=texture2D(tScene,vUv).rgb+texture2D(tBloom,vUv).rgb*uBloom;
        gl_FragColor=vec4(col,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        vec3 c=gl_FragColor.rgb;
        // split-tone grade: cool shadows, warm highlights
        float l=dot(c,vec3(0.299,0.587,0.114));
        c+=mix(vec3(-0.012,0.0,0.03),vec3(0.035,0.012,-0.03),smoothstep(0.15,0.85,l));
        // gentle S-curve contrast
        c=mix(c,c*c*(3.0-2.0*c),0.22);
        // saturation lift
        l=dot(c,vec3(0.299,0.587,0.114));c=mix(vec3(l),c,1.08);
        // vignette
        vec2 d=(vUv-0.5)*vec2(uAspect,1.0);
        c*=mix(1.0,0.7,smoothstep(0.45,1.05,length(d)));
        gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);
      }`});

  const sz=new THREE.Vector2();
  P.resize=function(){
    renderer.getDrawingBufferSize(sz);
    const w=Math.max(4,sz.x|0),h=Math.max(4,sz.y|0);
    if(w===P._w&&h===P._h)return;P._w=w;P._h=h;
    rtScene.setSize(w,h);
    const bw=Math.max(2,w>>2),bh=Math.max(2,h>>2);
    rtA.setSize(bw,bh);rtB.setSize(bw,bh);
    brightMat.uniforms.uTexel.value.set(0.5/w,0.5/h);
    compMat.uniforms.uAspect.value=w/h;
  };
  function pass(mat,target){quad.material=mat;renderer.setRenderTarget(target);renderer.render(quadScene,quadCam)}
  let lastT=performance.now();
  P.render=function(scene,camera){
    // Adaptive quality: if frames stay slower than ~30fps for 3s, drop
    // the post chain (the stylized materials still carry the look).
    const now=performance.now(),ft=now-lastT;lastT=now;
    if(P.auto&&P.enabled){
      if(ft>34&&ft<500)P._slow+=ft;else P._slow=Math.max(0,P._slow-ft*0.5);
      if(P._slow>3000){P.enabled=false;console.info('[post] disabled for performance')}
    }
    if(!P.enabled){renderer.setRenderTarget(null);renderer.render(scene,camera);return}
    P.resize();
    renderer.setRenderTarget(rtScene);renderer.render(scene,camera);
    brightMat.uniforms.tSrc.value=rtScene.texture;brightMat.uniforms.uTh.value=P.threshold;pass(brightMat,rtA);
    for(let i=0;i<2;i++){
      blurMat.uniforms.tSrc.value=rtA.texture;blurMat.uniforms.uDir.value.set((1+i)/rtA.width,0);pass(blurMat,rtB);
      blurMat.uniforms.tSrc.value=rtB.texture;blurMat.uniforms.uDir.value.set(0,(1+i)/rtA.height);pass(blurMat,rtA);
    }
    compMat.uniforms.tScene.value=rtScene.texture;compMat.uniforms.tBloom.value=rtA.texture;compMat.uniforms.uBloom.value=P.bloom;
    pass(compMat,null);
  };
  // Compile every material in the scene for the post-processing path
  // (HDR target, no tone mapping) so first use doesn't hitch mid-battle.
  P.compile=function(scene,camera){
    if(!P.enabled){renderer.compile(scene,camera);return}
    P.resize();renderer.setRenderTarget(rtScene);renderer.compile(scene,camera);renderer.setRenderTarget(null);
  };
  return P;
}

import * as THREE from './vendor/three.module.min.js';
const C={grass:0x66aa52,soil:0xad714d,soilDark:0x8e593c,brick:0xc57a4b,used:0x947a5c,gold:0xf9c451,green:0x389a4c,greenDark:0x25733b,red:0xe04735,blue:0x2c66b3,skin:0xf5c18e,brown:0x75462e,white:0xfff3da,black:0x293831,orange:0xff842b,flame:0xffd25a,cream:0xf6e2b0,dust:0xf3ead2};
// Shirt/overall palettes cycled while the star is active.
const STAR=[[C.red,C.blue],[C.white,C.red],[0x4fb85c,C.black],[C.gold,C.brown]];
// Size flicker used by growth (0 = small, 1 = big); shrinking plays it inverted.
const GROW=[0,.5,0,.5,0,.5,1,.5,1,.5,1,1];
const ease=(v,t,k)=>v+(t-v)*k;
export class View{
 constructor(host,game){this.game=game;this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x9dd8ed);this.scene.fog=new THREE.Fog(0x9dd8ed,48,110);this.camera=new THREE.OrthographicCamera(-16,16,9,-9,.1,250);this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(this.renderer.domElement);this.scene.add(new THREE.HemisphereLight(0xffffff,0x79996a,2));let light=new THREE.DirectionalLight(0xfff5dc,2.3);light.position.set(-10,25,18);this.scene.add(light);this.geo=new THREE.BoxGeometry(1,1,1);this.materials={};this.qMat=new THREE.MeshLambertMaterial({color:C.gold});this.qBase=new THREE.Color(C.gold);this.qShine=new THREE.Color(0xfff0b8);this.static=new THREE.Group();this.dynamic=new THREE.Group();this.background=new THREE.Group();this.scene.add(this.background,this.static,this.dynamic);this.clock=performance.now();this.t=0;this.build();addEventListener('resize',()=>this.resize());this.resize()}
 mat(color){return this.materials[color]??=new THREE.MeshLambertMaterial({color})}
 box(parent,x,y,z,w,h,d,color){let m=new THREE.Mesh(this.geo,this.mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m}
 label(text,bg='#e8a331',fg='#fff5c7'){const c=document.createElement('canvas');c.width=c.height=64;let g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,64,64);g.fillStyle=fg;g.font='bold 50px monospace';g.textAlign='center';g.textBaseline='middle';g.fillText(text,32,34);let t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;return new THREE.MeshBasicMaterial({map:t})}
 build(){for(const root of [this.static,this.dynamic])root.traverse(o=>{if(o.material?.map){o.material.map.dispose();o.material.dispose()}});this.static.clear();this.background.clear();this.blockMeshes=new Map();this.coinMeshes=new Map();this.pipeMeshes=[];this.actorMeshes=new Map();this.particles=[];this.clouds=[];this.shake=0;this.playerMesh=this.mario();this.dynamic.clear();this.dynamic.add(this.playerMesh);const game=this.game;
  this.anim={phase:0,speed:0,lastX:game.player.x,lastGrounded:true,lastVy:0,squash:0,turn:.5,dust:0,sparkle:0,blink:2,palette:''};
  for(const s of game.solids){let g=new THREE.Group();g.userData.area=s.area;this.static.add(g);if(s.type==='ground'){this.box(g,s.x,s.y+s.h/2,0,s.w,s.h,3,C.soil);this.box(g,s.x,-.13,0,s.w,.26,3,s.area==='cellar'?0xb68253:C.grass);for(let x=Math.ceil(s.x-s.w/2)+1;x<s.x+s.w/2;x+=4)this.box(g,x,-.9,1.52,.2,.14,.02,C.soilDark)}else if(s.type==='pipe'){this.box(g,s.x,s.h/2,0,s.w-.25,s.h,2,C.green);this.box(g,s.x,s.h-.22,0,s.w,.44,2.15,C.greenDark);this.box(g,s.x,s.h-.15,.1,s.w-.08,.24,2.12,C.green);this.box(g,s.x-.55,s.h/2,1.02,.18,s.h-.5,.03,0x66c86c);this.pipeMeshes.push(g)}else if(s.type==='block'){
    // Each block group is pivoted at its own center so bumps can squash in place.
    g.position.set(s.x,s.y+.5,0);let cube=this.box(g,0,0,0,1,1,1,s.blockType==='question'?C.gold:C.brick);if(s.blockType==='question'){let face=new THREE.Mesh(new THREE.PlaneGeometry(.72,.72),this.label('?'));face.position.set(0,0,.51);g.add(face)}else{for(let dy of [-.2,.2])this.box(g,0,dy,.506,.96,.04,.01,0x8e5037);this.box(g,0,0,.51,.04,.46,.01,0x8e5037)}g.userData.managed=true;this.blockMeshes.set(s,{g,cube});g.visible=!s.hidden}else if(s.type==='stair'){this.box(g,s.x,s.y+.5,0,1,1,1.8,0xc58d5f);this.box(g,s.x,s.y+.94,.92,.9,.04,.02,0xe2b079)}else this.box(g,s.x,s.y+s.h/2,0,s.w,s.h,2,C.soilDark)}
  // Coins are pivoted at their own center; rotating a world-positioned child made them orbit the origin.
  for(const c of game.worldCoins){let g=this.coinModel(this.static);g.position.set(c.x,c.y,0);g.userData.area=c.area;g.userData.managed=true;this.coinMeshes.set(c,g)}
  // Stepped hills and plants sit behind the playable lane, with gaps left open.
  for(let x=-70;x<160;x+=17){for(let j=0;j<4;j++)this.box(this.background,x,1+j*.85,-13,12-j*2,.9,2,j%2?0xa3d3ad:0xadd9bc);}
  for(let x=-62;x<160;x+=12){if((x>1&&x<9)||(x>35&&x<43)||(x>88&&x<95))continue;let z=-4.5-(Math.abs(x)%3);this.box(this.background,x,1,z,.55,2, .55,0x987049);this.box(this.background,x,2.4,z,2.7,1.2,1.6,0x6eb370);this.box(this.background,x,3.15,z,1.8,.6,1.4,0x81c17c);this.box(this.background,x,3.55,z,.8,.3,1,0x91cb86);}
  for(let x=-65;x<160;x+=21){let y=12+(Math.abs(x)%4),cloud=new THREE.Group();cloud.position.set(x,y,-16);cloud.userData.x=x;this.box(cloud,0,0,0,5,.7,1,0xfff9e8);this.box(cloud,-.5,.6,0,2.8,.6,1,0xfff9e8);this.background.add(cloud);this.clouds.push(cloud)}
  this.flag=new THREE.Group();this.static.add(this.flag);this.flag.userData.area='surface';this.box(this.flag,133.5,5,0,.15,10,.15,0xf4f2da);this.box(this.flag,133.5,10.2,0,.45,.45,.45,C.gold);
  this.flagCloth=new THREE.Group();this.flagCloth.position.set(133.5,8.9,0);this.flag.add(this.flagCloth);this.clothSegments=[0,1,2].map(i=>this.box(this.flagCloth,-.3-i*.5,0,0,.52,.8,.15,0x53aa62));
  let castle=new THREE.Group();castle.userData.area='surface';this.static.add(castle);this.box(castle,142,2.5,0,6,5,3,0xb99372);this.box(castle,142,4.8,0,6.3,.5,3.2,0x896b5b);for(let x=139.5;x<=144.5;x+=1.25)this.box(castle,x,5.5,0,.7,1,3,0xb99372);this.box(castle,141,1.15,1.52,1.3,2.3,.05,0x39413a);
 }
 coinModel(parent){let g=new THREE.Group();parent.add(g);this.box(g,0,0,0,.58,.8,.16,C.gold);this.box(g,0,0,.09,.18,.5,.03,0xffe594);this.box(g,0,0,-.09,.18,.5,.03,0xffe594);return g}
 // Mario is built from pivoted parts: legs hinge at the hips, arms at the shoulders, and the
 // upper body (with head) at the waist, so poses can be layered without rebuilding meshes.
 mario(){let root=new THREE.Group(),body=new THREE.Group(),head=new THREE.Group();body.position.y=.54;head.position.y=.54;root.add(body);body.add(head);
  const pivot=(parent,x,y)=>{let g=new THREE.Group();g.position.set(x,y,0);parent.add(g);return g};
  let legL=pivot(root,-.2,.54),legR=pivot(root,.2,.54),armL=pivot(body,-.38,.56),armR=pivot(body,.38,.56),shirt=[],overalls=[];
  shirt.push(this.box(body,0,.31,0,.66,.7,.45,C.red));overalls.push(this.box(body,0,.01,.05,.66,.55,.49,C.blue));
  for(const leg of [legL,legR]){overalls.push(this.box(leg,0,-.27,0,.25,.54,.4,C.blue));this.box(leg,0,-.46,.08,.32,.16,.56,C.brown)}
  for(const [arm,s] of [[armL,-1],[armR,1]]){shirt.push(this.box(arm,0,-.23,0,.18,.56,.25,C.red));this.box(arm,s*.01,-.51,.03,.2,.2,.27,C.white)}
  for(const s of [-1,1]){overalls.push(this.box(body,s*.18,.48,.24,.1,.4,.04,C.blue));this.box(body,s*.17,.26,.27,.07,.07,.03,C.gold)}
  const b=(x,y,z,w,h,d,c)=>this.box(head,x,y,z,w,h,d,c);b(0,.27,0,.6,.55,.42,C.skin);b(0,.54,0,.68,.16,.48,C.red);b(0,.45,.26,.7,.1,.25,C.red);b(0,.34,.24,.14,.13,.16,C.skin);let eyes=[b(-.15,.35,.225,.07,.1,.03,C.black),b(.15,.35,.225,.07,.1,.03,C.black)];b(0,.21,.23,.4,.09,.04,C.brown);
  let badge=new THREE.Mesh(new THREE.PlaneGeometry(.2,.16),this.label('M','#f9f1d8','#d94535'));badge.position.set(0,.57,.25);head.add(badge);
  root.userData={body,head,legL,legR,armL,armR,shirt,overalls,eyes};return root}
 enemy(e){let g=new THREE.Group();if(e.type==='goomba'){let body=new THREE.Group();g.add(body);let b=(x,y,z,w,h,d,c)=>this.box(body,x,y,z,w,h,d,c);b(0,.55,0,.85,.6,.65,C.brown);b(0,.25,0,.55,.4,.5,0xd5a576);b(-.18,.59,.34,.12,.18,.03,C.white);b(.18,.59,.34,.12,.18,.03,C.white);b(-.18,.59,.36,.05,.1,.03,C.black);b(.18,.59,.36,.05,.1,.03,C.black);b(-.19,.73,.34,.2,.05,.03,C.black).rotation.z=-.35;b(.19,.73,.34,.2,.05,.03,C.black).rotation.z=.35;
   g.userData={body,footL:this.box(g,-.22,.08,.05,.35,.16,.55,C.black),footR:this.box(g,.22,.08,.05,.35,.16,.55,C.black)}}
  else{let walk=new THREE.Group(),shell=new THREE.Group(),head=new THREE.Group();g.add(walk,shell);head.position.set(0,1,.04);walk.add(head);let w=(x,y,z,wd,h,d,c)=>this.box(walk,x,y,z,wd,h,d,c);
   w(0,.6,-.04,.8,.7,.6,C.green);w(0,.6,.24,.56,.56,.1,C.cream);w(0,.28,0,.86,.1,.66,C.cream);w(0,.97,-.04,.5,.06,.44,C.greenDark);
   this.box(head,0,.18,0,.55,.5,.45,0xf2c47d);this.box(head,-.14,.22,.24,.08,.12,.03,C.black);this.box(head,.14,.22,.24,.08,.12,.03,C.black);this.box(head,0,.06,.24,.3,.06,.03,0xd29a52);
   let s=(x,y,z,wd,h,d,c)=>this.box(shell,x,y,z,wd,h,d,c);s(0,.34,0,.82,.46,.66,C.green);s(0,.6,0,.5,.08,.46,C.greenDark);s(0,.1,0,.88,.12,.7,C.cream);s(0,.34,.34,.3,.26,.02,C.greenDark);
   g.userData={walk,shell,head,footL:w(-.23,.1,0,.28,.2,.5,C.brown),footR:w(.23,.1,0,.28,.2,.5,C.brown),armL:w(-.45,.62,.12,.14,.24,.2,0xf2c47d),armR:w(.45,.62,.12,.14,.24,.2,0xf2c47d),peek:[s(-.26,.02,.12,.22,.1,.3,C.brown),s(.26,.02,.12,.22,.1,.3,C.brown)]}}return g}
 item(i){let g=new THREE.Group();let b=(x,y,z,w,h,d,c,p=g)=>this.box(p,x,y,z,w,h,d,c);
  if(i.kind==='flower'){b(0,.2,0,.12,.4,.12,C.green);b(-.17,.2,0,.24,.1,.12,C.green).rotation.z=.4;b(.17,.2,0,.24,.1,.12,C.green).rotation.z=-.4;let head=new THREE.Group();head.position.y=.6;g.add(head);let petals=[b(0,0,0,.6,.5,.18,C.red,head),b(0,0,0,.3,.7,.16,C.red,head),b(0,0,0,.78,.26,.16,C.red,head)];b(0,0,.11,.3,.3,.05,C.gold,head);b(-.06,.02,.14,.04,.1,.02,C.black,head);b(.06,.02,.14,.04,.1,.02,C.black,head);g.userData={head,petals}}
  else if(i.kind==='star'){let star=new THREE.Group();star.position.y=.4;g.add(star);let parts=[b(0,0,0,.5,.65,.2,C.gold,star),b(0,0,0,.8,.3,.2,C.gold,star),b(0,-.2,0,.7,.2,.2,C.gold,star)];b(-.09,.04,.11,.05,.14,.02,C.black,star);b(.09,.04,.11,.05,.14,.02,C.black,star);g.userData={star,parts}}
  else{let cap=new THREE.Group();g.add(cap);b(0,.22,0,.45,.4,.4,C.skin,cap);b(0,.55,0,.8,.4,.55,i.kind==='life'?C.green:C.red,cap);b(0,.76,0,.5,.1,.4,i.kind==='life'?C.green:C.red,cap);b(-.2,.61,.29,.15,.14,.02,C.white,cap);b(.2,.61,.29,.15,.14,.02,C.white,cap);b(-.08,.25,.21,.05,.1,.02,C.black,cap);b(.08,.25,.21,.05,.1,.02,C.black,cap);g.userData={cap}}return g}
 fireball(){let g=new THREE.Group(),core=new THREE.Group();core.position.y=.15;g.add(core);this.box(core,0,0,0,.3,.3,.3,C.orange);this.box(core,0,0,0,.2,.2,.36,C.flame).rotation.z=Math.PI/4;this.box(core,0,0,0,.4,.1,.1,0xfff1b0);g.userData={core,trail:0};return g}
 // Short-lived voxel particles: debris, dust, sparkles, popped coins, and fireworks.
 particle(x,y,z,size,color,o={}){let m=o.mesh??this.box(this.dynamic,0,0,0,size,size,size,color);m.position.set(x,y,z);if(!o.mesh)m.rotation.set(Math.random()*3,Math.random()*3,0);this.particles.push({m,size:o.mesh?1:size,vx:o.vx||0,vy:o.vy||0,vz:o.vz||0,g:o.g||0,life:o.life||.5,max:o.life||.5,spin:o.spin||0,spinY:o.spinY||0,grow:o.grow||0,end:o.end});return m}
 sparkle(x,y,n=6,colors=[C.gold,C.white],speed=3.2){for(let i=0;i<n;i++){let a=i/n*Math.PI*2+Math.random()*.4;this.particle(x,y,.6,.14,colors[i%colors.length],{vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.32,spin:9})}}
 dust(x,y,n=3,dir=0){for(let i=0;i<n;i++)this.particle(x+(Math.random()-.5)*.5,y+.12,.4,.16+Math.random()*.1,C.dust,{vx:dir*1.5+(Math.random()-.5)*2,vy:.6+Math.random()*1.2,g:-1,life:.35+Math.random()*.15,grow:1.2,spin:3})}
 effect(type,d){const game=this.game,p=game.player;
  if(type==='coin'){if(d.pop)this.particle(d.x,d.y,.2,1,0,{mesh:this.coinModel(this.dynamic),vy:15,g:48,life:.55,spinY:22,end:m=>this.sparkle(m.position.x,m.position.y)});else this.sparkle(d.x,d.y)}
  else if(type==='break'){for(const [ox,oy] of [[-.25,.25],[.25,.25],[-.25,-.25],[.25,-.25]])this.particle(d.x+ox,d.y+.5+oy,.2,.42,C.brick,{vx:Math.sign(ox)*(2.5+Math.random()),vy:oy>0?15:11,g:42,life:1.1,spin:10});this.dust(d.x,d.y+.3,4);this.shake=.35}
  else if(type==='stomp'&&d){if(d.kind==='stomp')this.dust(d.x,d.y,5);else this.sparkle(d.x,d.y+.5,5,[C.white,C.gold],4)}
  else if(type==='kick'&&d){this.sparkle(d.x,d.y+.3,4,[C.white],3);this.dust(d.x,d.y,2)}
  else if(type==='poof'&&d){for(let i=0;i<5;i++){let a=i/5*Math.PI*2;this.particle(d.x,d.y,.4,.18,i%2?C.orange:C.flame,{vx:Math.cos(a)*2.2,vy:Math.sin(a)*2.2,life:.25,grow:1.5,spin:6})}}
  else if(type==='jump'){this.dust(p.x,p.y,2,-p.facing)}
  else if(type==='power'||type==='life'){this.sparkle(p.x,p.y+p.h/2,10,type==='life'?[0x5ec46a,C.white]:[C.gold,C.white,C.red],4.5)}
  else if(type==='firework'){let n=game.finish.launched,x=140+(n%3)*1.5,y=8+(n%2)*2;this.particle(x,y,.5,.5,C.white,{life:.18,grow:3});for(let i=0;i<16;i++){let a=i/16*Math.PI*2;this.particle(x,y,.5,.22,[C.gold,C.red,C.white,0x6fc1e8][i%4],{vx:Math.cos(a)*5,vy:Math.sin(a)*5,g:4,life:1.1,spin:5})}}}
 setPalette(m,shirt,overall){let key=shirt+'/'+overall;if(this.anim.palette===key)return;this.anim.palette=key;for(const s of m.userData.shirt)s.material=this.mat(shirt);for(const o of m.userData.overalls)o.material=this.mat(overall)}
 syncPlayer(dt){const game=this.game,p=game.player,m=this.playerMesh,P=m.userData,a=this.anim,t=this.t,state=game.state,f=p.facing,finish=game.finish;
  let raw=dt>0?(p.x-a.lastX)/dt:0;if(Math.abs(raw)>40)raw=0;a.lastX=p.x;a.speed=ease(a.speed,raw,Math.min(1,dt*20));let speed=Math.abs(a.speed),run=Math.min(1,speed/9.8);
  let walkingFinish=state==='finish'&&finish?.phase==='walk',grounded=(p.grounded&&state==='play')||walkingFinish,morph=game.freeze>0&&p.morph;
  m.visible=!(state==='finish'&&finish?.phase!=='slide'&&p.x>=141)&&!(p.invuln>0&&!morph&&Math.floor(p.invuln*12)%2===0);
  if(grounded)a.phase+=speed*dt*2.3;
  let L=0,R=0,AL=.06,AR=-.06,lean=0,bob=0,drop=0,headTilt=0,turn=f*.5,x=p.x,dir=(game.input.right?1:0)-(game.input.left?1:0);
  // Poses are expressed for the facing direction: the front limb swings toward +f.
  const arms=(front,back)=>{if(f>0){AR=front;AL=back}else{AL=front;AR=back}},legs=(front,back)=>{if(f>0){R=front;L=back}else{L=front;R=back}};
  if(state==='dying'){turn=0;AL=-2.7+Math.sin(t*22)*.15;AR=2.7-Math.sin(t*22)*.15;L=-.25;R=.25;headTilt=Math.sin(t*10)*.1}
  else if(state==='warp'||morph){turn=0;AL=.08;AR=-.08}
  else if(state==='finish'&&finish.phase==='slide'){x=p.x-.35;turn=.6;AR=2.85;AL=2.45;L=.35;R=.15;bob=Math.sin(t*16)*.02}
  else if(!grounded){if(p.vy>0){arms(f*2.7,-f*.55);legs(f*.8,-f*.35);headTilt=f*-.08}else{arms(f*1.35,-f*1.05);legs(f*.35,-f*.2)}}
  else if(p.duck){L=-.45;R=.45;AL=-.35;AR=.35;drop=.1}
  else if(dir&&p.vx*dir< -1.5){let v=Math.sign(p.vx);lean=v*.3;L=v*.55;R=-v*.2;AL=AR=-v*1.1;a.dust-=dt;if(a.dust<=0){a.dust=.05;this.dust(p.x+v*.3,p.y,1,-v)}}
  else if(speed>.3){let sw=Math.sin(a.phase)*(.35+.55*run);L=f*sw;R=-f*sw;AL=-f*sw*.9;AR=f*sw*.9;bob=Math.abs(Math.cos(a.phase))*.05;lean=-f*.15*run;if(run>.85){a.dust-=dt;if(a.dust<=0){a.dust=.12;this.dust(p.x-f*.3,p.y,1,-f)}}}
  else{let br=Math.sin(t*2.6);AL=.07+br*.03;AR=-AL;bob=br*.012}
  if(p.throwTime>0&&state==='play'){let k=p.throwTime/.2;arms(f*(1.35+1.25*k),f>0?AL:AR);lean=-f*.12}
  let k=Math.min(1,dt*22);P.legL.rotation.z=ease(P.legL.rotation.z,L,k);P.legR.rotation.z=ease(P.legR.rotation.z,R,k);P.armL.rotation.z=ease(P.armL.rotation.z,AL,k);P.armR.rotation.z=ease(P.armR.rotation.z,AR,k);P.body.rotation.z=ease(P.body.rotation.z,lean,k);P.head.rotation.z=ease(P.head.rotation.z,headTilt,k);P.body.position.y=.54+bob-drop;
  a.turn=ease(a.turn,turn,Math.min(1,dt*12));m.rotation.y=a.turn;
  a.blink-=dt;if(a.blink<-.12)a.blink=2+Math.random()*2.5;for(const e of P.eyes)e.scale.y=a.blink<0?.02:.1;
  // Landing squash and take-off stretch.
  if(p.grounded&&!a.lastGrounded&&a.lastVy< -9&&state==='play'){a.squash=.14;this.dust(p.x,p.y,3)}a.lastGrounded=p.grounded;a.lastVy=p.vy;a.squash=Math.max(0,a.squash-dt);
  let big=p.power!=='Small',hs=big?(p.duck?.94:1.55):1,ws=big?1.08:1,shirt=p.power==='Fire'?C.white:C.red,overall=p.power==='Fire'?C.red:C.blue;
  if(morph){let mo=p.morph,stage=Math.floor(mo.t/.075),sizeOf=s=>s==='Small'?0:1,from=sizeOf(mo.from),to=sizeOf(mo.to);if(from!==to){let v=GROW[Math.min(stage,GROW.length-1)],g=to>from?v:1-v;hs=1+.55*g;ws=1+.08*g}if(mo.from==='Fire'||mo.to==='Fire'){let pal=stage%2?mo.to:mo.from;if(stage%4===3)[shirt,overall]=STAR[(stage>>2)%4];else{shirt=pal==='Fire'?C.white:C.red;overall=pal==='Fire'?C.red:C.blue}}}
  if(p.star>0){[shirt,overall]=STAR[Math.floor(t*12)%4];a.sparkle-=dt;if(a.sparkle<=0&&state==='play'){a.sparkle=.07;this.particle(p.x+(Math.random()-.5)*.9,p.y+Math.random()*p.h,.6,.12,Math.random()<.5?C.gold:C.white,{vy:1,life:.3,spin:8})}}
  this.setPalette(m,shirt,overall);
  let sq=a.squash/.14;if(!p.grounded&&p.vy>9&&state==='play'){hs*=1.05;ws*=.97}m.scale.set(ws*(1+.12*sq),hs*(1-.16*sq),ws*(1+.12*sq));
  let warpOffset=state==='warp'?(game.warp.t<.7?-game.warp.t*1.5:-(1.4-game.warp.t)*1.5):0;m.position.set(x,p.y+warpOffset,0)}
 syncActor(obj,mesh,dt){const game=this.game,t=this.t,u=mesh.userData;mesh.visible=obj.area===game.area;mesh.rotation.set(0,0,0);mesh.scale.set(1,1,1);
  if(obj.type){mesh.position.set(obj.x,obj.y,0);let ph=obj.x*5.5,dir=Math.sign(obj.vx)||-1,alive=!obj.dead,step=Math.sin(ph);
   if(obj.dead&&obj.flip){mesh.rotation.z=Math.PI;mesh.position.y=obj.y+obj.h}else if(obj.dead)mesh.scale.set(1.25,.22,1.25);
   if(obj.type==='goomba'){if(alive){u.footL.position.y=.08+Math.max(0,step)*.1;u.footR.position.y=.08+Math.max(0,-step)*.1;u.body.rotation.z=step*.07}}
   else{let shellMode=obj.state==='shell'||obj.state==='sliding'||(obj.dead&&obj.h<1);u.walk.visible=!shellMode;u.shell.visible=shellMode;u.shell.rotation.set(0,0,0);for(const f of u.peek)f.visible=false;
    if(!shellMode){if(alive)mesh.rotation.y=dir*.45;u.footL.position.y=.1+Math.max(0,step)*.1;u.footR.position.y=.1+Math.max(0,-step)*.1;u.armL.rotation.z=step*.4;u.armR.rotation.z=step*.4;u.head.position.y=1+Math.abs(step)*.04;u.walk.rotation.z=step*.05}
    else if(obj.state==='sliding')u.shell.rotation.y=t*24;
    else if(alive&&obj.timer<2){u.shell.rotation.z=Math.sin(t*38)*.12;for(const f of u.peek)f.visible=Math.floor(t*6)%2===0}}}
  else if(obj.kind){let emerging=obj.emerge>0;mesh.position.set(obj.x,obj.y-(obj.emerge||0)*.8,0);
   if(obj.kind==='flower'){u.head.rotation.z=Math.sin(t*3)*.12;u.head.scale.setScalar(1+Math.sin(t*6)*.04);let c=[C.red,0xf08a2c,0xfff3da,0xf08a2c][Math.floor(t*10)%4];for(const m of u.petals)m.material=this.mat(c)}
   else if(obj.kind==='star'){u.star.rotation.y=t*7;u.star.scale.setScalar(1+Math.sin(t*12)*.06);let c=[C.gold,0xfff1b0,0xf6a640][Math.floor(t*14)%3];for(const m of u.parts)m.material=this.mat(c)}
   else if(!emerging){let w=Math.sin(t*14);u.cap.rotation.z=w*.05;u.cap.scale.set(1-w*.03,1+w*.04,1)}}
  else{mesh.position.set(obj.x,obj.y,0);u.core.rotation.z=-(Math.sign(obj.vx)||1)*t*18;u.trail-=dt;if(u.trail<=0&&mesh.visible){u.trail=.03;this.particle(obj.x-Math.sign(obj.vx)*.15,obj.y+.15,-.1,.16,Math.random()<.5?C.orange:C.flame,{life:.2,vy:.4})}}}
 sync(){let now=performance.now(),dt=Math.min(.05,Math.max(0,(now-this.clock)/1000));this.clock=now;this.t+=dt;let t=this.t,game=this.game,p=game.player;
  this.qMat.color.lerpColors(this.qBase,this.qShine,Math.max(0,Math.sin(t*3.2))*.5);
  for(const [s,v] of this.blockMeshes){v.g.visible=s.area===game.area&&!s.hidden&&!s.removed;let k=s.bump?Math.sin(s.bump/.18*Math.PI):0;v.g.position.y=s.y+.5+k*.28;v.g.scale.set(1+k*.08,1-k*.06,1+k*.08);v.cube.material=s.used?this.mat(C.used):s.blockType==='question'?this.qMat:this.mat(C.brick);for(let i=1;i<v.g.children.length;i++)v.g.children[i].visible=!s.used}
  for(const [c,g] of this.coinMeshes){g.visible=c.area===game.area&&!c.collected;g.rotation.y=t*3.2+c.x*.15}for(const g of this.static.children)if(g.userData.area&&!g.userData.managed)g.visible=g.userData.area===game.area;this.background.visible=game.area==='surface';this.scene.background.set(game.area==='cellar'?0x344b58:0x9dd8ed);this.scene.fog.color.copy(this.scene.background);
  for(const c of this.clouds)c.position.x=c.userData.x+Math.sin(t*.12+c.userData.x)*2;
  this.syncPlayer(dt);
  let actors=[...game.enemies,...game.items,...game.projectiles],alive=new Set(actors);for(const [obj,mesh] of this.actorMeshes)if(!alive.has(obj)){this.dynamic.remove(mesh);this.actorMeshes.delete(obj)}
  for(const obj of actors){let mesh=this.actorMeshes.get(obj);if(!mesh){mesh=obj.type?this.enemy(obj):obj.kind?this.item(obj):this.fireball();this.actorMeshes.set(obj,mesh);this.dynamic.add(mesh)}this.syncActor(obj,mesh,dt)}
  for(const q of this.particles){q.life-=dt;q.vy-=q.g*dt;q.m.position.x+=q.vx*dt;q.m.position.y+=q.vy*dt;q.m.position.z+=q.vz*dt;q.m.rotation.x+=q.spin*dt;q.m.rotation.z+=q.spin*dt*.7;q.m.rotation.y+=q.spinY*dt;let k=Math.max(0,q.life/q.max);q.m.scale.setScalar(q.size*(1+q.grow*(1-k))*Math.min(1,k*3));if(q.life<=0){this.dynamic.remove(q.m);q.end?.(q.m)}}this.particles=this.particles.filter(q=>q.life>0);
  this.clothSegments.forEach((s,i)=>{s.position.y=Math.sin(t*5-i*1.1)*.05*(i+1);s.position.z=Math.sin(t*4-i*.9)*.07*i});
  if(game.finish)this.flagCloth.position.y=8.9-Math.min(8,game.finish.phase==='slide'?Math.max(0,8-p.y):8);
  let aspect=innerWidth/innerHeight;let span=aspect<1?Math.max(6,10*aspect):Math.max(16,Math.min(24,10*aspect));this.camera.left=-span;this.camera.right=span;this.camera.top=span/aspect;this.camera.bottom=-span/aspect;this.camera.updateProjectionMatrix();let cx=game.area==='cellar'?0:Math.max(aspect<1?-56:-50,Math.min(137,p.x+(aspect<1?2:5)));
  let sx=0,sy=0;if(this.shake>0){sx=(Math.random()-.5)*this.shake*.3;sy=(Math.random()-.5)*this.shake*.3;this.shake=Math.max(0,this.shake-dt*1.6)}this.camera.position.set(cx+sx,8+sy,26);this.camera.lookAt(cx+sx,3+sy,0);this.renderer.render(this.scene,this.camera)
 }
 worldToScreen(x,y){let v=new THREE.Vector3(x,y,0).project(this.camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2}}
 resize(){this.renderer.setSize(innerWidth,innerHeight)}
}

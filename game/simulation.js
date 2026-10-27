// Authoritative, fixed-step game rules. Positions are measured at the feet.
export const DT = 1 / 120;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const toward=(v,t,d)=>v<t?Math.min(t,v+d):Math.max(t,v-d);
const overlap=(a,b)=>a.x+a.w/2>b.x-b.w/2&&a.x-a.w/2<b.x+b.w/2&&a.y+a.h>b.y&&a.y<b.y+b.h;
const stompScores=[100,200,400,800,1000,2000,4000,8000,0];
const shellScores=[500,800,1000,2000,4000,5000,8000,0];
export class Game {
 constructor(onEvent=()=>{}){this.emit=onEvent;this.reset()}
 reset(){
  this.state='title';this.area='surface';this.score=0;this.coins=0;this.lives=3;this.time=300;this.duration=0;this.secrets=new Set();this.kills=0;this.checkpoint=false;this.warning=false;this.stompChain=0;this.projectiles=[];this.items=[];this.effects=[];this.finish=null;this.freeze=0;this.warp=null;this.input={};this.prevInput={};
  this.player={x:-56,y:0,vx:0,vy:0,w:.72,h:1.6,power:'Small',facing:1,grounded:true,coyote:0,buffer:0,invuln:0,star:0,duck:false,throwTime:0};
  this.solids=[];this.blocks=[];this.enemies=[];this.worldCoins=[];this.build();this.emit('reset');
 }
 build(){
  const solid=(x,y,w,h,type='ground',area='surface',extra={})=>{let o={x,y,w,h,type,area,...extra};this.solids.push(o);return o};
  for(const [a,b] of [[-60,4],[6,37],[40,90],[93,150]])solid((a+b)/2,-2,b-a,2);
  solid(0,-2,34,2,'ground','cellar');solid(-17,0,1,8,'wall','cellar');solid(17,0,1,8,'wall','cellar');
  this.pipes=[];for(const [x,h,kind] of [[-34,2,'normal'],[-23,2.8,'normal'],[-12,3.4,'entry'],[54,2.4,'exit'],[111,2,'normal']]){let p=solid(x,0,2,h,'pipe','surface',{kind});this.pipes.push(p)}
  let cp=solid(13,0,2,2,'pipe','cellar',{kind:'cellarExit'});this.pipes.push(cp);
  const block=(x,y,type,content,area='surface')=>{let o=solid(x,y,1,1,'block',area,{blockType:type,content,used:false,hidden:type==='hidden',remaining:content==='multi'?10:1,bump:0,removed:false});this.blocks.push(o)};
  block(-49,4,'question','coin');block(-43,4,'question','power');block(-41,4,'brick','empty');block(-39,4,'brick','coin');
  block(-27,5,'hidden','life');block(12,4,'brick','empty');block(13,4,'question','power');block(14,4,'brick','multi');block(16,4,'brick','star');block(18,4,'brick','empty');
  for(let x=20;x<=24;x++)block(x,7.5,'brick','empty');block(61,4,'question','coin');block(63,4,'question','power');block(102,4,'question','power');
  const stair=(start,heights)=>heights.forEach((h,i)=>{for(let y=0;y<h;y++)solid(start+i+.5,y,1,1,'stair')});
  stair(70,[1,2,3,4]);stair(76,[4,3,2,1]);stair(84,[1,2,3,4,5,5]);stair(93,[4,3,2,1]);stair(120,[1,2,3,4,5,6,7,8]);
  const enemy=(x,type='goomba')=>this.enemies.push({x,y:0,w:.85,h:type==='goomba'?.85:1.45,vx:type==='goomba'?-1.65:-1.35,vy:0,type,state:'walk',area:'surface',active:false,dead:false,timer:0,chain:0,grace:0});
  enemy(-45);enemy(-19);enemy(2);enemy(27);enemy(30,'koopa');enemy(48);enemy(66);enemy(81);enemy(104);enemy(107,'koopa');
  for(const [x,y] of [[-52,2],[-48,6],[-37,2],[-30,4],[-16,5],[8,2],[9,3],[10,4],[21,9],[22,9],[23,9],[33,2],[35,3],[39,4],[43,3],[51,3],[58,2],[64,6],[72,5],[87,6],[91,7],[96,3],[114,3],[122,4],[124,6],[126,8]])this.worldCoins.push({x,y,area:'surface',collected:false});
  for(let x=-11;x<=9;x+=2)this.worldCoins.push({x,y:x%4===0?3:2,area:'cellar',collected:false});
 }
 start(){if(this.state==='title'||this.state==='gameover'||this.state==='win'){if(this.state!=='title')this.reset();this.state='play';this.emit('start')}}
 setInput(k,v){this.input[k]=v}
 clearInput(){this.input={};this.prevInput={}}
 pause(){if(this.state==='play'){this.state='paused';this.clearInput();this.emit('pause')}else if(this.state==='paused'){this.state='play';this.clearInput();this.emit('resume')}}
 restart(){this.emit('saveScore');this.reset();this.start()}
 solidsHere(){return this.solids.filter(s=>s.area===this.area&&!s.removed&&!s.hidden)}
 canStand(h){const p=this.player;return !this.solidsHere().some(s=>overlap({...p,h},s))}
 moveBody(o,dt,head=false){
  const solids=this.solidsHere();let oldX=o.x;o.x+=o.vx*dt;
  for(const s of solids){if(overlap(o,s)){if(o.vx>0)o.x=s.x-s.w/2-o.w/2;else if(o.vx<0)o.x=s.x+s.w/2+o.w/2;o.vx=0;}}
  let oldY=o.y;o.y+=o.vy*dt;o.grounded=false;
  for(const s of solids){if(!overlap(o,s))continue;
   if(o.vy<=0&&oldY>=s.y+s.h-.08){o.y=s.y+s.h;o.vy=0;o.grounded=true}
   else if(o.vy>0&&oldY+o.h<=s.y+.08){o.y=s.y-o.h;o.vy=0;if(head&&s.type==='block')this.hitBlock(s)}
  }
  if(head&&o.vy>=0){for(const b of this.blocks){if(!b.hidden||b.area!==this.area)continue;if(oldY+o.h<=b.y&&o.y+o.h>=b.y&&o.x+o.w/2>b.x-b.w/2&&o.x-o.w/2<b.x+b.w/2){o.y=b.y-o.h;o.vy=0;this.hitBlock(b);break}}}
  return {oldX,oldY};
 }
 award(n,x,y){if(n===0){this.lives++;this.emit('float',{text:'1-UP',x,y});this.emit('life')}else{this.score+=n;this.emit('float',{text:String(n),x,y})}}
 coin(x,y,pop=false){this.coins++;this.award(200,x,y);this.emit('coin',{x,y,pop});if(this.coins%100===0)this.award(0,x,y)}
 discover(id){if(!this.secrets.has(id)){this.secrets.add(id);this.emit('notice','SECRET FOUND!')}}
 hitBlock(b,byShell=false){if(b.removed||b.used)return;b.hidden=false;b.bump=.18;this.emit('bump');
  for(const e of this.enemies)if(!e.dead&&e.area===b.area&&Math.abs(e.x-b.x)<.8&&Math.abs(e.y-(b.y+1))<.2)this.defeat(e,'block');
  if(b.blockType==='brick'&&b.content==='empty'){if(byShell||this.player.power!=='Small'){b.removed=true;this.award(50,b.x,b.y);this.emit('break',{x:b.x,y:b.y})}return}
  if(b.content==='multi'){this.coin(b.x,b.y+1,true);if(--b.remaining<=0)b.used=true;return}
  b.used=true;
  if(b.content==='coin'){this.coin(b.x,b.y+1,true);return}
  let kind=b.content==='power'?(this.player.power==='Small'?'mushroom':'flower'):b.content;
  if(kind==='life'||kind==='star')this.discover(kind);
  this.items.push({x:b.x,y:b.y+1,w:.75,h:.8,vy:0,vx:kind==='mushroom'||kind==='life'?3.1:kind==='star'?2.5:0,kind,area:b.area,emerge:1,dead:false});this.emit('item');
 }
 collect(item){item.dead=true;this.award(item.kind==='life'?0:1000,item.x,item.y);this.emit(item.kind==='life'?'life':'power');const p=this.player;
  if(item.kind==='star'){p.star=10;return}
  if(item.kind==='life')return;
  let target=item.kind==='flower'?(p.power==='Small'?'Big':'Fire'):(p.power==='Small'?'Big':p.power);
  if(target!==p.power){p.morph={from:p.power,to:target,t:0};p.pending=target;this.freeze=.9;this.tryGrowth()}
 }
 tryGrowth(){let p=this.player;if(p.pending&&this.canStand(2.5)){p.power=p.pending;p.pending=null;p.h=2.5;p.duck=false}}
 defeat(e,kind){if(e.dead)return;e.dead=true;e.state='defeated';e.timer=.35;e.deathKind=kind;if(kind!=='stomp')this.flip(e,e.x<this.player.x?-1:1);this.kills++;if(kind==='stomp'){let n=stompScores[Math.min(this.stompChain++,8)];this.award(n,e.x,e.y+1)}else this.award(100,e.x,e.y+1);this.emit('stomp',{x:e.x,y:e.y,kind})}
 // Non-stomp defeats knock the enemy upside down and let it fall out of the course.
 flip(e,dir){e.flip=true;e.timer=1.4;e.vy=10;e.vx=dir*2.5}
 damage(){const p=this.player;if(p.invuln>0||p.star>0||this.state!=='play')return;if(p.power!=='Small'){p.morph={from:p.power,to:'Small',t:0};p.power='Small';p.h=1.6;p.pending=null;p.invuln=2.2;this.freeze=.7;this.emit('hurt')}else this.die()}
 die(){if(this.state!=='play')return;this.state='dying';this.player.vy=11;this.player.vx=0;this.deathTimer=0;this.lives--;this.clearInput();this.emit('death')}
 respawn(){if(this.lives<=0){this.state='gameover';this.emit('gameover');return}let p=this.player;Object.assign(p,{x:this.checkpoint?57:-56,y:0,vx:0,vy:0,power:'Small',h:1.6,grounded:true,star:0,invuln:2.2,duck:false,pending:null,morph:null,throwTime:0});this.area='surface';this.projectiles=[];this.stompChain=0;this.time=Math.max(this.time,100);this.state='play';this.emit('respawn')}
 enterWarp(to){this.state='warp';this.warp={to,t:0};this.clearInput();this.projectiles=[];if(to==='cellar')this.discover('cellar');this.emit('warp')}
 shoot(){const p=this.player;if(p.power!=='Fire'||p.cooldown>0||this.projectiles.length>=2)return;let f={x:p.x+p.facing*.8,y:p.y+1,w:.3,h:.3,vx:p.facing*13,vy:2,area:this.area,life:2};if(this.solidsHere().some(s=>overlap(f,s)))return;this.projectiles.push(f);p.cooldown=.25;p.throwTime=.2;this.emit('fire')}
 update(dt=DT){
  let p=this.player;if(this.state==='dying'){this.deathTimer+=dt;p.vy-=32*dt;p.y+=p.vy*dt;if(this.deathTimer>1.6)this.respawn();return}
  if(this.state==='warp'){this.warp.t+=dt;if(this.warp.t>.7&&!this.warp.moved){this.warp.moved=true;this.area=this.warp.to;p.x=this.area==='cellar'?-13:54;p.y=this.area==='cellar'?0:2.4;p.vx=p.vy=0}if(this.warp.t>1.4){this.state='play';p.invuln=1.5;this.warp=null;this.emit('resume')}return}
  if(this.state==='finish'){this.updateFinish(dt);return}if(this.state!=='play')return;
  if(this.freeze>0){this.freeze-=dt;if(p.morph){p.morph.t+=dt;if(this.freeze<=0)p.morph=null}return}
  this.duration+=dt;this.time=Math.max(0,this.time-dt);if(this.time<=100&&!this.warning){this.warning=true;this.emit('hurry')}if(this.time<=0){this.die();return}
  p.invuln=Math.max(0,p.invuln-dt);p.star=Math.max(0,p.star-dt);p.cooldown=Math.max(0,(p.cooldown||0)-dt);p.throwTime=Math.max(0,p.throwTime-dt);this.tryGrowth();
  let jump=this.input.jump&&!this.prevInput.jump,down=this.input.down&&!this.prevInput.down;
  if(jump)p.buffer=.16;else p.buffer=Math.max(0,p.buffer-dt);if(p.grounded)p.coyote=.12;else p.coyote=Math.max(0,p.coyote-dt);
  if(down&&p.grounded){let pipe=this.pipes.find(q=>q.area===this.area&&((q.kind==='entry'&&this.area==='surface')||(q.kind==='cellarExit'&&this.area==='cellar'))&&Math.abs(p.x-q.x)<.45&&Math.abs(p.y-(q.y+q.h))<.1);if(pipe){this.enterWarp(this.area==='surface'?'cellar':'surface');return}}
  p.duck=!!this.input.down&&p.power!=='Small';if(!p.duck&&p.power!=='Small'&&!this.canStand(2.5))p.duck=true;p.h=p.duck?1.5:p.power==='Small'?1.6:2.5;
  let direction=(this.input.right?1:0)-(this.input.left?1:0);let speed=this.input.run?9.8:6;if(p.duck)direction=0;
  p.vx=toward(p.vx,direction*speed,(direction?(p.grounded?38:27):(p.grounded?32:8))*dt);if(direction)p.facing=direction;
  if(p.buffer>0&&p.coyote>0){p.vy=21+(this.input.run?1.2:0);p.grounded=false;p.coyote=0;p.buffer=0;this.emit('jump')}
  if(!this.input.jump&&p.vy>0)p.vy-=40*dt; p.vy=Math.max(-34,p.vy-40*dt);
  if(this.input.run&&!this.prevInput.run)this.shoot();let prevY=p.y;let wasGrounded=p.grounded;this.moveBody(p,dt,true);if(p.grounded&&!wasGrounded)this.stompChain=0;
  if(p.y< -6){this.die();return}if(this.area==='surface'&&p.x>57&&!this.checkpoint){this.checkpoint=true;this.emit('notice','CHECKPOINT!')}
  if(this.area==='surface'&&p.x>=133.5&&prevY>-1){this.startFinish();return}
  for(const b of this.blocks)b.bump=Math.max(0,b.bump-dt);
  for(const c of this.worldCoins)if(!c.collected&&c.area===this.area&&overlap(p,{x:c.x,y:c.y-.45,w:.8,h:.9})){c.collected=true;this.coin(c.x,c.y)}
  this.updateItems(dt);this.updateEnemies(dt,prevY);this.updateProjectiles(dt);this.prevInput={...this.input};
 }
 updateItems(dt){for(const i of this.items){if(i.dead||i.area!==this.area)continue;if(i.emerge>0){i.emerge=Math.max(0,i.emerge-dt*1.5);continue}if(i.kind!=='flower'){i.vy=Math.max(-25,i.vy-40*dt);let vx=i.vx;this.moveBody(i,dt);if(i.vx===0)i.vx=-vx;if(i.kind==='star'&&i.grounded)i.vy=12}if(overlap(this.player,i))this.collect(i)}this.items=this.items.filter(i=>!i.dead)}
 updateEnemies(dt,prevY){const p=this.player;for(const e of this.enemies){if(e.area!==this.area)continue;if(e.dead){e.timer-=dt;if(e.flip){e.vy-=40*dt;e.x+=e.vx*dt;e.y+=e.vy*dt}continue}if(!e.active&&Math.abs(e.x-p.x)<24)e.active=true;if(!e.active)continue;e.grace=Math.max(0,e.grace-dt);
  if(e.state==='shell'){e.timer-=dt;if(e.timer<=0){let tall={...e,h:1.45};if(!this.solidsHere().some(s=>overlap(tall,s))){e.state='walk';e.h=1.45;e.vx=-1.35;e.chain=0}}}
  e.vy=Math.max(-30,e.vy-40*dt);let oldX=e.x,oldV=e.vx;this.moveBody(e,dt);if(oldV&&e.vx===0){let hit=this.solidsHere().find(s=>Math.abs((oldV>0?e.x+e.w/2:e.x-e.w/2)-(oldV>0?s.x-s.w/2:s.x+s.w/2))<.08&&e.y<s.y+s.h&&e.y+e.h>s.y);if(e.state==='sliding'&&hit?.type==='block'){this.hitBlock(hit,true);e.vx=hit.removed?oldV:-oldV}else e.vx=-oldV}
  if(e.y< -8){e.dead=true;e.timer=0;continue}
  if(e.state==='walk')for(const other of this.enemies){if(other!==e&&!other.dead&&other.state==='walk'&&other.area===e.area&&overlap(e,other)&&e.vx*other.vx<0){let speed=e.type==='goomba'?1.65:1.35,otherSpeed=other.type==='goomba'?1.65:1.35;e.vx=e.x<other.x?-speed:speed;other.vx=e.x<other.x?otherSpeed:-otherSpeed}}
  if(e.state==='sliding')for(const other of this.enemies){if(other!==e&&!other.dead&&other.area===e.area&&overlap(e,other)){other.dead=true;other.state='defeated';other.deathKind='shell';this.flip(other,Math.sign(e.vx));this.kills++;this.award(shellScores[Math.min(e.chain++,7)],other.x,other.y+1);this.emit('stomp',{x:other.x,y:other.y,kind:'shell'})}}
  if(!overlap(p,e))continue;if(p.star>0){this.defeat(e,'star');continue}
  let stomp=p.vy<=0&&prevY>=e.y+e.h-.12&&p.y<=e.y+e.h;
  if(stomp){p.y=e.y+e.h;p.vy=this.input.jump?14:10;this.emit('stomp');if(e.type==='goomba')this.defeat(e,'stomp');else if(e.state==='walk'){e.state='shell';e.h=.7;e.vx=0;e.timer=8;e.chain=0;this.award(stompScores[Math.min(this.stompChain++,8)],e.x,e.y+1)}else if(e.state==='sliding'){e.state='shell';e.vx=0;e.timer=8;e.chain=0}else{e.state='sliding';e.vx=p.x<e.x?12:-12;e.grace=.35;e.chain=0}}
  else if(e.state==='shell'){e.state='sliding';e.vx=p.x<e.x?12:-12;e.grace=.35;e.chain=0;this.emit('kick',{x:e.x,y:e.y})}else if(!(e.state==='sliding'&&e.grace>0))this.damage();
 }this.enemies=this.enemies.filter(e=>!e.dead||e.timer>0)}
 updateProjectiles(dt){for(const f of this.projectiles){f.life-=dt;f.vy-=25*dt;let vx=f.vx,vy=f.vy;this.moveBody(f,dt);if(vy>0&&f.vy===0)f.dead=true;if(f.grounded)f.vy=8;if(f.vx===0||f.life<=0||f.y< -8)f.dead=true;for(const e of this.enemies)if(!e.dead&&e.area===f.area&&overlap(f,e)){this.defeat(e,'fire');f.dead=true;break}if(!f.vx)f.vx=vx;if(f.dead)this.emit('poof',{x:f.x,y:f.y+.15})}this.projectiles=this.projectiles.filter(f=>!f.dead)}
 startFinish(){this.state='finish';this.clearInput();let p=this.player;let height=p.y;let bonus=height>7?5000:height>5?2000:height>3?800:height>1?400:100;let captured=Math.ceil(this.time);this.finish={phase:'slide',t:0,flagBonus:bonus,timeBonus:captured*50,fireworkBonus:0,captured,fireworks:[1,3,6].includes(captured%10)?captured%10:0,launched:0};this.award(bonus,p.x,p.y);p.x=133.5;p.vx=p.vy=0;this.emit('flag')}
 updateFinish(dt){let f=this.finish,p=this.player;f.t+=dt;if(f.phase==='slide'){p.y=Math.max(0,p.y-5*dt);if(p.y===0){f.phase='walk';f.t=0}}else if(f.phase==='walk'){p.x+=3*dt;if(p.x>=141){f.phase='tally';f.t=0;this.emit('castle')}}else if(f.phase==='tally'){let step=Math.min(Math.ceil(f.captured),Math.max(1,Math.ceil(90*dt)));if(f.captured>0){f.captured-=step;this.time=f.captured;this.score+=step*50;this.emit('tally')}else{f.phase='fireworks';f.t=0}}else if(f.phase==='fireworks'){if(f.launched<f.fireworks&&f.t>.6){f.t=0;f.launched++;f.fireworkBonus+=500;this.score+=500;this.emit('firework')}else if(f.launched===f.fireworks&&f.t>1){this.state='win';this.emit('win')}}}
}

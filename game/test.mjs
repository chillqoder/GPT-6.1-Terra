import assert from 'node:assert/strict';
import {Game,DT} from './simulation.js';
const step=(g,n)=>{for(let i=0;i<n;i++)g.update(DT)};
const fresh=()=>{let g=new Game();g.start();return g};
{
 let g=fresh(),p=g.player;g.enemies=[];g.setInput('right',true);step(g,180);assert(Math.abs(p.vx-6)<.01,'walk cap');g.setInput('run',true);step(g,100);assert(Math.abs(p.vx-9.8)<.01,'run cap');g.setInput('right',false);step(g,80);assert(Math.abs(p.vx)<.01,'braking');
}
function jump(held){let g=fresh(),p=g.player;g.setInput('jump',true);let max=0;for(let i=0;i<100;i++){if(i===held)g.setInput('jump',false);g.update(DT);max=Math.max(max,p.y)}return max}
let short=jump(1),long=jump(100);assert(short>2.4&&short<3.2,`short jump ${short}`);assert(long>5&&long<6,`held jump ${long}`);
{
 let g=fresh(),p=g.player,b=g.blocks.find(b=>b.content==='power');p.x=b.x;p.y=0;g.setInput('jump',true);step(g,50);assert(b.used);assert.equal(g.items.length,1);assert.equal(g.items[0].kind,'mushroom');g.hitBlock(b);assert.equal(g.items.length,1,'single use');
}
{
 let g=fresh(),b=g.blocks.find(b=>b.content==='multi');for(let i=0;i<12;i++)g.hitBlock(b);assert.equal(g.coins,10);assert(b.used);
 let brick=g.blocks.find(b=>b.content==='empty');g.hitBlock(brick,true);assert(brick.removed);
}
{
 let g=fresh(),p=g.player;p.power='Big';p.h=2.5;let b=g.blocks.find(b=>b.content==='power');g.hitBlock(b);assert.equal(g.items[0].kind,'flower');p.power='Small';p.h=1.6;g.collect(g.items[0]);assert.equal(p.power,'Big','flower after damage');
}
{
 let g=fresh(),p=g.player;p.x=-12;p.y=3.4;p.grounded=true;g.setInput('down',true);step(g,1);assert.equal(g.state,'warp');step(g,180);assert.equal(g.area,'cellar');assert.equal(g.secrets.size,1);p.x=13;p.y=2;p.grounded=true;g.setInput('down',false);step(g,1);g.setInput('down',true);step(g,1);step(g,180);assert.equal(g.area,'surface');assert.equal(g.secrets.size,1);
}
{
 let g=fresh();for(let i=0;i<3;i++){g.die();step(g,200)}assert.equal(g.lives,0);assert.equal(g.state,'gameover');g.restart();assert.equal(g.lives,3);assert.equal(g.score,0);
}
{
 let g=fresh();g.time=101.1;g.player.x=133.5;g.player.y=9;step(g,1);assert.equal(g.state,'finish');let f=g.finish;assert.equal(f.flagBonus,5000);let before=g.score;step(g,5000);assert.equal(g.state,'win');assert.equal(g.score,before+f.timeBonus+f.fireworkBonus);assert.equal(f.fireworks,0);
}
console.log(`Simulation checks passed. Jump heights: tap ${short.toFixed(2)}, held ${long.toFixed(2)}.`);
{
 let g=fresh(),p=g.player;p.power='Fire';p.h=2.5;p.x=-49;p.y=0;g.projectiles.push({x:-49,y:3.6,w:.3,h:.3,vx:0,vy:8,area:'surface',life:2});g.updateProjectiles(DT);assert.equal(g.projectiles.length,0,'ceiling removes fireball');
}
{
 let g=fresh();let a=g.enemies[0],b=g.enemies[1];Object.assign(a,{x:-50,y:0,vx:1.65,active:true});Object.assign(b,{x:-49.3,y:0,vx:-1.65,active:true});g.player.x=-56;g.updateEnemies(DT,0);assert(a.vx<0&&b.vx>0,'enemies turn apart');
}
{
 let g=fresh();g.time=101;g.player.x=133.5;g.player.y=8;g.update(DT);assert.equal(g.finish.fireworks,1);step(g,5000);assert.equal(g.finish.launched,1);assert.equal(g.finish.fireworkBonus,500);
}
// Drive the actual simulation across the entire surface course. The agent brakes in
// the air before the tall gap stairs, lands, and jumps again; it uses no invulnerability.
for(const power of ['Small','Big']){
 let g=fresh(),p=g.player;p.power=power;p.h=power==='Big'?2.5:1.6;let jump=0;
 for(let t=0;t<120*180&&g.state==='play';t++){
  let obstacles=g.solids.some(s=>s.area==='surface'&&!s.hidden&&!s.removed&&(s.type==='pipe'||s.type==='stair')&&s.x+s.w/2>p.x+.3&&s.x-s.w/2<p.x+4&&s.y<p.y+p.h&&s.y+s.h>p.y+.1);
  let enemy=g.enemies.some(e=>!e.dead&&e.active&&e.x>p.x&&e.x<p.x+4&&Math.abs(e.y-p.y)<2);
  let edge=[[4,6],[37,40],[90,93]].some(([a])=>p.x<a&&a-p.x<3);
  if(jump>0)jump--;else if(p.grounded&&!g.input.jump&&(obstacles||enemy||edge))jump=60;
  let brake=p.x>86&&p.x<90&&!p.grounded&&p.vy<5;
  g.setInput('right',!brake);g.setInput('run',true);g.setInput('jump',jump>0);g.update(DT);
 }
 assert.equal(g.state,'finish',`${power} surface route reaches flag`);assert.equal(g.lives,3,`${power} route without death`);
 step(g,5000);assert.equal(g.state,'win',`${power} route completes finish`);
}
console.log('Small and Big surface routes reached the flag and completed without losing a life.');
{
 let g=fresh(),p=g.player,b=g.blocks.find(b=>b.x===-49);p.x=b.x;g.setInput('jump',true);g.update(DT);g.setInput('jump',false);step(g,100);assert(b.used,'short jump strikes first question block');
}
for(const power of ['Small','Big']){
 let g=fresh(),p=g.player;g.enemies=[];p.power=power;p.h=power==='Big'?2.5:1.6;p.x=-13.4;g.setInput('jump',true);let landed=false;for(let i=0;i<160;i++){g.setInput('right',p.x< -12.8);g.setInput('left',p.x> -12.4);g.update(DT);if(p.grounded&&p.y>=3.39){landed=true;break}}assert(landed,`${power} can land on tall pipe`);
}
{
 let g=fresh(),p=g.player;p.power='Fire';p.h=2.5;p.cooldown=0;g.shoot();g.shoot();assert.equal(g.projectiles.length,1,'cooldown');p.cooldown=0;g.shoot();p.cooldown=0;g.shoot();assert.equal(g.projectiles.length,2,'two fireball cap');
}
{
 let g=fresh(),p=g.player;g.enemies=[];p.x=3.8;p.vx=6;g.setInput('right',true);for(let i=0;i<20&&p.grounded;i++)g.update(DT);assert(!p.grounded&&p.coyote>0,'walked off edge with coyote time');g.setInput('jump',true);g.update(DT);assert(p.vy>19,'coyote jump');g.setInput('jump',false);g.update(DT);g.setInput('jump',true);let v=p.vy;g.update(DT);assert(p.vy<v,'no double jump');
}
{
 let g=fresh(),p=g.player;g.enemies=[];p.y=.3;p.vy=-8;p.grounded=false;p.coyote=0;g.setInput('jump',true);g.update(DT);g.setInput('jump',false);let bounced=false;for(let i=0;i<20;i++){g.update(DT);if(p.vy>10){bounced=true;break}}assert(bounced,'buffered jump launches on landing');
}

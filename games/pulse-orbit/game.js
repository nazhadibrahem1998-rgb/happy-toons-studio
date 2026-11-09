/* Pulse Orbit - one-tap neon score game. (c) Happy Toons Studio. No tracking, no network. */
(function(){
'use strict';
var TAU=Math.PI*2;
var $=function(id){return document.getElementById(id)};
var cv=$('c'),ctx=cv.getContext('2d');
var W=0,H=0,DPR=1,CX=0,CY=0,RB=100,R=[0,0],LG=0,PR=8;

/* ---------- storage ---------- */
var KEY='pulseorbit_v1',S;
function load(){try{S=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){S={}}
  S.best=S.best||0;S.top=S.top||0;S.daily=S.daily||{};S.skin=S.skin||0;S.ach=S.ach||{};S.runs=S.runs||0;S.muted=!!S.muted;S.dailyRuns=S.dailyRuns||0;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
load();
function today(){var d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();}

/* ---------- RNG ---------- */
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
var rng=Math.random;

/* ---------- skins & achievements ---------- */
var SKINS=[
 {n:'Cyan',c:'#00f0ff',need:0},{n:'Mint',c:'#5dffa8',need:500},{n:'Sun',c:'#ffe45e',need:1500},{n:'Rose',c:'#ff5fa2',need:3000},
 {n:'Violet',c:'#b07cff',need:5000},{n:'Lava',c:'#ff7a2f',need:8000},{n:'Ice',c:'#e6fbff',need:12000},{n:'Prism',c:'rainbow',need:20000}];
var ACH=[
 {id:'first',n:'First Orbit',d:'Finish a run'},
 {id:'k1',n:'Warmed Up',d:'Score 1,000'},
 {id:'k3',n:'In The Zone',d:'Score 5,000'},
 {id:'k6',n:'Orbit Master',d:'Score 15,000'},
 {id:'near10',n:'Daredevil',d:'10 near misses in a run'},
 {id:'x8',n:'Max Pulse',d:'Reach x8 multiplier'},
 {id:'min1',n:'Endurance',d:'Survive 60 seconds'},
 {id:'orbs40',n:'Collector',d:'40 orbs in a run'},
 {id:'pw3',n:'Powered',d:'3 power-ups in a run'},
 {id:'daily',n:'Daily Driver',d:'Play a Daily Challenge'},
 {id:'runs25',n:'Hooked',d:'Play 25 runs'}];
function skinColor(i,t){var s=SKINS[i]||SKINS[0];if(s.c==='rainbow'){var h=(Math.floor(t*8)%24)/24*6,x=1-Math.abs(h%2-1),c=[[1,x,0],[x,1,0],[0,1,x],[0,x,1],[x,0,1],[1,0,x]][Math.floor(h)%6];return 'rgb('+c.map(function(v){return Math.round(60+v*195)}).join(',')+')';}return s.c;}

/* ---------- audio ---------- */
var AC=null,master=null,beatTimer=null,nextBeat=0,beatN=0,lastBeatTime=0;
function initAudio(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=S.muted?0:0.55;master.connect(AC.destination);}catch(e){AC=null}}
function tone(f,dur,type,vol,f2,delay){if(!AC||S.muted)return;var t=AC.currentTime+(delay||0);var o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||0.1,t+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+0.02);}
var noiseBuf=null;
function noise(dur,vol,freq,type,delay,at){if(!AC||S.muted)return;if(!noiseBuf){noiseBuf=AC.createBuffer(1,AC.sampleRate*0.5,AC.sampleRate);var d=noiseBuf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
  var t=at||(AC.currentTime+(delay||0));var s=AC.createBufferSource();s.buffer=noiseBuf;var f=AC.createBiquadFilter();f.type=type||'highpass';f.frequency.value=freq||6000;var g=AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur+0.02);}
var PENTA=[0,2,4,7,9,12,14,16,19,21,24,26,28];
function note(i){return 440*Math.pow(2,(PENTA[Math.min(i,PENTA.length-1)]-9)/12);}
var SFX={
 flip:function(){tone(420,0.07,'sine',0.07,760)},
 orb:function(c){tone(note(4+c%9)*2,0.12,'triangle',0.09);tone(note(4+c%9)*4,0.08,'sine',0.03)},
 near:function(){noise(0.18,0.12,2500,'bandpass');tone(1200,0.12,'sine',0.06,1800)},
 power:function(){[0,4,7,12].forEach(function(n,i){tone(523*Math.pow(2,n/12),0.12,'square',0.045,null,i*0.05)})},
 shield:function(){tone(300,0.25,'sawtooth',0.07,900);noise(0.2,0.12,1500,'lowpass')},
 crash:function(){noise(0.6,0.35,900,'lowpass');tone(180,0.5,'sawtooth',0.14,40)},
 best:function(){[0,4,7,12,16].forEach(function(n,i){tone(659*Math.pow(2,n/12),0.16,'triangle',0.08,null,i*0.07)})},
 unlock:function(){tone(988,0.15,'sine',0.07);tone(1319,0.25,'sine',0.07,null,0.1)}
};
var BASS=[0,0,-5,-2];
function beatLoop(){if(!AC)return;var bpm=112+36*G.diff;var spb=60/bpm/2;
  while(nextBeat<AC.currentTime+0.12){var t=nextBeat,step=beatN%8;
    if(!S.muted&&state==='play'){
      if(step%2===0){var o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(42,t+0.12);g.gain.setValueAtTime(0.32,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.16);o.connect(g);g.connect(master);o.start(t);o.stop(t+0.18);}
      else noise(0.04,0.05,8000,'highpass',0,t);
      if(step===4)noise(0.12,0.08,1800,'bandpass',0,t);
      var bar=Math.floor(beatN/8)%4;
      if(step===0||step===3||step===6){var b=AC.createOscillator(),bg=AC.createGain(),lp=AC.createBiquadFilter();b.type='sawtooth';b.frequency.value=55*Math.pow(2,BASS[bar]/12);lp.type='lowpass';lp.frequency.value=380+500*G.diff;bg.gain.setValueAtTime(0.09,t);bg.gain.exponentialRampToValueAtTime(0.0001,t+spb*1.6);b.connect(lp);lp.connect(bg);bg.connect(master);b.start(t);b.stop(t+spb*1.7);}
      if(step%2===0)lastBeatTime=performance.now()+(t-AC.currentTime)*1000;
    }
    nextBeat+=spb;beatN++;}
}
function setMute(m){S.muted=m;save();if(master)master.gain.value=m?0:0.55;$('mute').innerHTML=m?'&#128263;':'&#9834;';$('mute').style.opacity=m?0.5:1;}
setMute(S.muted);
function buzz(p){if(navigator.vibrate){try{navigator.vibrate(p)}catch(e){}}}

/* ---------- glow sprites ---------- */
var spriteCache={};
function sprite(col){if(spriteCache[col])return spriteCache[col];var c=document.createElement('canvas');c.width=c.height=64;var g=c.getContext('2d');var gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.18,col);gr.addColorStop(0.45,col.replace('rgb(','rgba(').replace(')',',0.35)'));gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);spriteCache[col]=c;return c;}
function hexRgb(h){if(h.charAt(0)!=='#')return h;var n=parseInt(h.slice(1),16);return 'rgb('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+')';}

/* ---------- resize ---------- */
var stars=[];
function resize(){DPR=Math.min(window.devicePixelRatio||1,2.5);W=window.innerWidth;H=window.innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  CX=W/2;CY=H*0.53;RB=Math.min(W*0.4,H*0.27,330);R=[RB*0.74,RB*1.08];LG=R[1]-R[0];PR=Math.max(7,RB*0.06);
  stars=[];for(var i=0;i<90;i++)stars.push({a:Math.random()*TAU,d:Math.random()*Math.max(W,H)*0.8+20,s:Math.random()*1.6+0.3,z:Math.random()*0.8+0.2});}
window.addEventListener('resize',resize);resize();

/* ---------- game state ---------- */
var state='start',mode='classic',G={diff:0};
var obs=[],orbs=[],pows=[],parts=[],texts=[],trail=[],rings=[];
var shake=0,flash=0,overAt=0,dieAt=0,paused=false;

function newRun(){
  G={t:0,th:-Math.PI/2,lane:1,r:R[1],w:1.7,score:0,combo:0,ctimer:0,mult:1,maxMult:1,near:0,orbs:0,pw:0,
     spawnA:-Math.PI/2+2.6,lastSwitch:-9,switchFrom:1,shield:false,slow:0,mag:0,dbl:0,inv:0,diff:0,bestFlag:false,passed:0,squash:0,daySeed:today()};
  rng=mode==='daily'?mulberry(G.daySeed*7919+13):mulberry((Math.random()*1e9)|0);
  obs=[];orbs=[];pows=[];parts=[];texts=[];trail=[];
  G.prevBest=mode==='daily'?(S.daily[G.daySeed]||0):S.best;
  while(G.spawnA<G.th+TAU-1.0)spawnPattern();
}
function startRun(){initAudio();if(AC&&AC.state==='suspended')AC.resume();newRun();state='play';paused=false;
  if(AC){nextBeat=AC.currentTime+0.05;beatN=0;}
  show('start',false);show('over',false);$('hud').style.opacity=1;$('unlock').textContent='';}

/* ---------- patterns ---------- */
function gapA(){var gt=0.62-0.36*G.diff;return gt*G.w;}
function addOb(a,lane,hw,type){obs.push({a:a,lane:lane,hw:hw,type:type||'wall',born:G.t,flipped:false,passed:false});}
function addOrb(a,lane){orbs.push({a:a,lane:lane,taken:false,born:G.t});}
function spawnPattern(){
  var d=G.diff,a=G.spawnA,hw=0.16+0.05*rng(),g=gapA()+hw*2,p=rng(),L=rng()<0.5?0:1,i;
  if(G.t>8&&rng()<0.07+0.03*d){var kinds=['shield','slow','magnet','x2'];pows.push({a:a,lane:L,kind:kinds[(rng()*4)|0],taken:false,born:G.t});G.spawnA+=g*0.9;return;}
  if(p<0.30){addOb(a,L,hw);if(rng()<0.7)addOrb(a,1-L);G.spawnA+=g;}
  else if(p<0.58){var n=3+((rng()*(2+d*3))|0);for(i=0;i<n;i++){addOb(a+i*g,(L+i)%2,hw);if(rng()<0.5)addOrb(a+i*g,(L+i+1)%2);}G.spawnA+=n*g;}
  else if(p<0.74){var whw=0.35+rng()*(0.35+0.25*d);addOb(a+whw,L,whw,'long');for(i=0;i<4;i++)addOrb(a+whw*(0.25+i*0.5),1-L);G.spawnA+=whw*2+g;}
  else if(p<0.86&&G.t>14){addOb(a+g*0.3,L,hw,'flip');G.spawnA+=g*1.9;}
  else if(G.t>22&&p<0.94){var tg=hw*2+(0.28-0.06*d)*G.w;addOb(a,L,hw);addOb(a+tg,1-L,hw);addOb(a+tg*2,L,hw);addOrb(a+tg,L);G.spawnA+=tg*2+g;}
  else{addOrb(a,L);addOrb(a+0.18,L);addOrb(a+0.36,L);addOb(a+0.18,1-L,hw);G.spawnA+=g*1.1;}
}

/* ---------- fx ---------- */
function burst(x,y,col,n,sp,life){for(var i=0;i<n;i++){var an=Math.random()*TAU,v=sp*(0.3+Math.random());parts.push({x:x,y:y,vx:Math.cos(an)*v,vy:Math.sin(an)*v,l:life*(0.5+Math.random()*0.5),ml:life,c:col,s:2+Math.random()*3});}}
function ftext(x,y,s,col,big){texts.push({x:x,y:y,s:s,c:col,l:0.9,big:big});}
function pos(a,r){return{x:CX+Math.cos(a)*r,y:CY+Math.sin(a)*r};}
function addCombo(){G.combo++;G.ctimer=3.2;var m=Math.min(8,1+Math.floor(G.combo/4));if(m>G.mult){G.mult=m;var p=pos(G.th,G.r);ftext(CX,CY,'x'+m,'#ffe45e',true);rings.push({r:RB*0.2,l:0.6,c:'#ffe45e'});}if(G.mult>G.maxMult)G.maxMult=G.mult;}
function addScore(v){G.score+=v*G.mult*(G.dbl>0?2:1);}

/* ---------- input ---------- */
function tapGame(){
  if(paused){paused=false;return;}
  if(state==='play'){G.switchFrom=G.lane;G.lane=1-G.lane;G.lastSwitch=G.t;G.squash=1;SFX.flip();buzz(8);}
  else if(state==='start'){startRun();SFX.flip();}
  else if(state==='over'&&performance.now()-overAt>320){startRun();}
}
cv.addEventListener('pointerdown',function(e){e.preventDefault();tapGame();},{passive:false});
document.addEventListener('keydown',function(e){if(e.code==='Space'||e.code==='ArrowUp'||e.code==='Enter'){e.preventDefault();if(!panelOpen())tapGame();}});
document.addEventListener('touchmove',function(e){if(!e.target.closest('.panel'))e.preventDefault();},{passive:false});
document.addEventListener('gesturestart',function(e){e.preventDefault();});
document.addEventListener('dblclick',function(e){e.preventDefault();});
document.addEventListener('visibilitychange',function(){if(document.hidden){if(state==='play')paused=true;if(AC)AC.suspend();}else if(AC)AC.resume();});

/* ---------- UI ---------- */
function show(id,on){$(id).classList.toggle('on',on);}
function panelOpen(){return $('skins').classList.contains('on')||$('achp').classList.contains('on');}
function setMode(m){mode=m;$('mClassic').classList.toggle('sel',m==='classic');$('mDaily').classList.toggle('sel',m==='daily');refreshStart();}
function refreshStart(){$('startBest').innerHTML=mode==='daily'?'<span class="daily">Daily Challenge &middot; same level for everyone today</span><br>Today\'s best '+(S.daily[today()]||0):'Best '+S.best;}
function bind(id,fn){$(id).addEventListener('pointerdown',function(e){e.stopPropagation();});$(id).addEventListener('click',function(e){e.preventDefault();e.stopPropagation();fn();});}
bind('mute',function(){initAudio();setMute(!S.muted);});
bind('mClassic',function(){setMode('classic')});bind('mDaily',function(){setMode('daily')});
bind('again',function(){startRun()});
bind('oMode',function(){setMode(mode==='daily'?'classic':'daily');startRun();});
function openSkins(){buildSkins();show('skins',true);} function openAch(){buildAch();show('achp',true);}
bind('openSkins',openSkins);bind('oSkins',openSkins);bind('openAch',openAch);bind('oAch',openAch);
bind('closeSkins',function(){show('skins',false)});bind('closeAch',function(){show('achp',false)});
function buildSkins(){var h='';SKINS.forEach(function(s,i){var lock=S.top<s.need;var col=s.c==='rainbow'?'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)':s.c;
  h+='<div class="swatch'+(lock?' lock':'')+(S.skin===i?' sel':'')+'" data-i="'+i+'"><i style="background:'+col+';box-shadow:0 0 12px '+(s.c==='rainbow'?'#fff':s.c)+'"></i>'+(lock?'&#128274; '+s.need:s.n)+'</div>';});
  $('swatches').innerHTML=h;Array.prototype.forEach.call($('swatches').children,function(el){el.addEventListener('click',function(){var i=+el.dataset.i;if(S.top>=SKINS[i].need){S.skin=i;save();buildSkins();SFX.flip();}});});}
function buildAch(){var h='',c=0;ACH.forEach(function(a){var d=!!S.ach[a.id];if(d)c++;h+='<div class="'+(d?'done':'')+'"><span><b>'+a.n+'</b><br>'+a.d+'</span><span>'+(d?'&#10003;':'&#9675;')+'</span></div>';});$('achList').innerHTML='<div style="justify-content:center;background:none">'+c+' / '+ACH.length+' unlocked</div>'+h;}
var toastQ=[],toastBusy=false;
function toast(s){toastQ.push(s);if(!toastBusy)nextToast();}
function nextToast(){var s=toastQ.shift();if(!s){toastBusy=false;return;}toastBusy=true;var t=$('toast');t.textContent=s;t.classList.add('on');SFX.unlock();setTimeout(function(){t.classList.remove('on');setTimeout(nextToast,280);},1700);}
refreshStart();
$('oMode').innerHTML='&#9733; Daily';

/* ---------- death / end ---------- */
function die(){state='dying';dieAt=performance.now();var p=pos(G.th,G.r);burst(p.x,p.y,hexRgb(skinColor(S.skin,G.t)),60,320,1.1);burst(p.x,p.y,'rgb(255,79,216)',30,200,0.9);shake=18;flash=1;SFX.crash();buzz([60,40,90]);}
function endRun(){state='over';overAt=performance.now();$('hud').style.opacity=0;
  var sc=Math.floor(G.score),isDaily=mode==='daily',prev=G.prevBest,nb=sc>prev&&sc>0;
  S.runs++;var oldTop=S.top;
  if(isDaily){S.dailyRuns++;if(sc>(S.daily[G.daySeed]||0))S.daily[G.daySeed]=sc;var ks=Object.keys(S.daily).sort();while(ks.length>14)delete S.daily[ks.shift()];}
  else if(sc>S.best)S.best=sc;
  if(sc>S.top)S.top=sc;
  var A=S.ach,got=[];function un(id,c){if(c&&!A[id]){A[id]=1;ACH.forEach(function(a){if(a.id===id)got.push(a.n)});}}
  un('first',1);un('k1',sc>=1000);un('k3',sc>=5000);un('k6',sc>=15000);un('near10',G.near>=10);un('x8',G.maxMult>=8);un('min1',G.t>=60);un('orbs40',G.orbs>=40);un('pw3',G.pw>=3);un('daily',isDaily);un('runs25',S.runs>=25);
  var newSkins=SKINS.filter(function(s){return s.need>oldTop&&s.need<=S.top;});
  save();
  $('overLbl').textContent=isDaily?'DAILY CHALLENGE':'SCORE';
  $('final').textContent=sc;$('overBest').textContent=(isDaily?'Today\'s best ':'Best ')+(isDaily?S.daily[G.daySeed]:S.best);
  $('sTime').textContent=G.t.toFixed(1)+'s';$('sNear').textContent=G.near;$('sOrbs').textContent=G.orbs;$('sCombo').textContent='x'+G.maxMult;
  var nbEl=$('newbest');nbEl.classList.remove('on');void nbEl.offsetWidth;if(nb){nbEl.classList.add('on');setTimeout(SFX.best,150);buzz([20,40,20]);for(var i=0;i<4;i++)setTimeout(function(){burst(CX+(Math.random()-0.5)*W*0.7,H*0.3+Math.random()*H*0.2,['rgb(255,228,94)','rgb(0,240,255)','rgb(255,79,216)'][(Math.random()*3)|0],40,260,1.2)},i*180);}
  var nextSkin=SKINS.filter(function(s){return s.need>S.top})[0];
  $('unlock').textContent=newSkins.length?('Unlocked skin: '+newSkins.map(function(s){return s.n}).join(', ')+'!'):(nextSkin?('Next skin at '+nextSkin.need+' ('+(nextSkin.need-S.top)+' to go)'):'All skins unlocked!');
  $('oMode').innerHTML=isDaily?'Classic':'&#9733; Daily';
  show('over',true);got.forEach(function(n){toast('Achievement: '+n)});newSkins.forEach(function(s){toast('New skin: '+s.n)});refreshStart();
}

/* ---------- update ---------- */
var last=performance.now();
function update(rdt){
  if(state==='dying'){var k=0.25;stepFx(rdt);if(performance.now()-dieAt>750)endRun();return;}
  if(state!=='play'||paused){stepFx(rdt);return;}
  var dt=rdt*(G.slow>0?0.62:1);
  G.t+=dt;G.diff=Math.min(1,G.t/75);
  G.w=1.65+1.95*(1-Math.exp(-G.t/38));
  G.th+=G.w*dt;
  var tr=R[G.lane],sp=LG/0.085*dt;if(Math.abs(tr-G.r)<=sp)G.r=tr;else G.r+=tr>G.r?sp:-sp;
  G.squash=Math.max(0,G.squash-dt*6);
  if(G.ctimer>0){G.ctimer-=dt;if(G.ctimer<=0){G.combo=0;G.mult=1;}}
  if(G.slow>0)G.slow-=rdt;if(G.mag>0)G.mag-=dt;if(G.dbl>0)G.dbl-=dt;if(G.inv>0)G.inv-=dt;
  while(G.spawnA<G.th+TAU-1.0)spawnPattern();
  var pp=pos(G.th,G.r),i,o,d;
  for(i=obs.length-1;i>=0;i--){o=obs[i];d=o.a-G.th;
    if(o.type==='flip'&&!o.flipped&&d<G.w*0.5){o.flipped=true;o.lane=1-o.lane;o.flipT=G.t;var fp=pos(o.a,R[o.lane]);burst(fp.x,fp.y,'rgb(255,228,94)',10,120,0.4);tone(880,0.08,'square',0.04,440);}
    var Rl=R[o.lane],th2=LG*0.5;
    if(Math.abs(d)*Rl<o.hw*Rl+PR*0.75&&Math.abs(G.r-Rl)<th2*0.5+PR*0.7&&G.inv<=0){
      if(G.shield){G.shield=false;G.inv=0.6;var bp=pos(o.a,Rl);burst(bp.x,bp.y,'rgb(0,240,255)',36,260,0.7);shake=10;SFX.shield();buzz(40);obs.splice(i,1);continue;}
      die();return;}
    if(!o.passed&&d<-o.hw-0.02){o.passed=true;G.passed++;addScore(10);
      if(G.lane!==o.lane&&G.switchFrom===o.lane&&G.t-G.lastSwitch<0.4){G.near++;addCombo();addScore(50);ftext(pp.x,pp.y-26,'NEAR MISS +'+50*G.mult,'#ff9cf0');SFX.near();buzz(15);shake=Math.max(shake,4);burst(pp.x,pp.y,'rgb(255,79,216)',14,180,0.5);}}
    if(d+o.hw<-0.95)obs.splice(i,1);}
  for(i=orbs.length-1;i>=0;i--){o=orbs[i];d=o.a-G.th;
    if(!o.taken){var near=Math.abs(d)<(PR*1.6)/R[o.lane]&&(o.lane===G.lane&&Math.abs(G.r-R[o.lane])<LG*0.6);var mag=G.mag>0&&Math.abs(d)<0.09;
      if(near||mag){o.taken=true;G.orbs++;addCombo();addScore(25);var op=pos(o.a,R[o.lane]);burst(op.x,op.y,'rgb(255,228,94)',10,140,0.45);SFX.orb(G.combo);buzz(5);ftext(op.x,op.y-18,'+'+25*G.mult*(G.dbl>0?2:1),'#ffe45e');}}
    if(d<-0.95)orbs.splice(i,1);}
  for(i=pows.length-1;i>=0;i--){o=pows[i];d=o.a-G.th;
    if(!o.taken&&Math.abs(d)<(PR*2)/R[o.lane]&&o.lane===G.lane&&Math.abs(G.r-R[o.lane])<LG*0.6){o.taken=true;G.pw++;SFX.power();buzz(20);var wp=pos(o.a,R[o.lane]);burst(wp.x,wp.y,'rgb(124,255,178)',24,220,0.6);rings.push({r:RB*0.3,l:0.7,c:'#7cffb2'});
      if(o.kind==='shield'){G.shield=true;ftext(CX,CY,'SHIELD','#00f0ff',true);}else if(o.kind==='slow'){G.slow=4.5;ftext(CX,CY,'SLOW-MO','#b07cff',true);}else if(o.kind==='magnet'){G.mag=7;ftext(CX,CY,'MAGNET','#7cffb2',true);}else{G.dbl=8;ftext(CX,CY,'2X SCORE','#ffe45e',true);}}
    if(d<-0.95)pows.splice(i,1);}
  if(!G.bestFlag&&G.prevBest>0&&G.score>G.prevBest){G.bestFlag=true;ftext(CX,CY-RB*0.3,'NEW BEST!','#ffe45e',true);SFX.best();buzz([15,30,15]);rings.push({r:RB*0.2,l:0.9,c:'#ffe45e'});}
  trail.push({x:pp.x,y:pp.y});if(trail.length>16)trail.shift();
  if(Math.random()<0.5)parts.push({x:pp.x,y:pp.y,vx:(Math.random()-0.5)*30,vy:(Math.random()-0.5)*30,l:0.35,ml:0.35,c:hexRgb(skinColor(S.skin,G.t)),s:2});
  stepFx(rdt);
}
function stepFx(dt){var i,p;for(i=parts.length-1;i>=0;i--){p=parts[i];p.l-=dt;if(p.l<=0){parts.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.96;p.vy*=0.96;}
  for(i=texts.length-1;i>=0;i--){p=texts[i];p.l-=dt;p.y-=(p.big?20:40)*dt;if(p.l<=0)texts.splice(i,1);}
  for(i=rings.length-1;i>=0;i--){p=rings[i];p.l-=dt;p.r+=RB*2.2*dt;if(p.l<=0)rings.splice(i,1);}
  shake*=Math.pow(0.0015,dt);if(shake<0.2)shake=0;flash=Math.max(0,flash-dt*3);}

/* ---------- render ---------- */
var hudCache={};
function setText(id,v){if(hudCache[id]!==v){hudCache[id]=v;$(id).textContent=v;}}
function arcStroke(r,a0,a1,col,w,alpha){ctx.globalAlpha=alpha*0.22;ctx.strokeStyle=col;ctx.lineWidth=w*2.6;ctx.beginPath();ctx.arc(CX,CY,r,a0,a1);ctx.stroke();ctx.globalAlpha=alpha;ctx.lineWidth=w;ctx.beginPath();ctx.arc(CX,CY,r,a0,a1);ctx.stroke();ctx.globalAlpha=alpha;ctx.strokeStyle='rgba(255,255,255,0.85)';ctx.lineWidth=w*0.3;ctx.beginPath();ctx.arc(CX,CY,r,a0,a1);ctx.stroke();ctx.globalAlpha=1;}
function render(now){
  var t=now/1000,beat=Math.max(0,1-(now-lastBeatTime)/220);if(state!=='play')beat*=0.3;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  var bg=ctx.createRadialGradient(CX,CY,0,CX,CY,Math.max(W,H)*0.75);var hue=state==='play'?(250+G.diff*70):250;
  bg.addColorStop(0,'hsl('+hue+',60%,'+(9+beat*3)+'%)');bg.addColorStop(1,'#04030c');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  var sx=shake?(Math.random()-0.5)*shake:0,sy=shake?(Math.random()-0.5)*shake:0;ctx.translate(sx,sy);
  // stars
  var rot=state==='play'?G.th*0.08:t*0.03;ctx.fillStyle='#fff';
  for(var i=0;i<stars.length;i++){var s=stars[i];var a=s.a+rot*s.z;ctx.globalAlpha=0.25+0.5*s.z;ctx.fillRect(CX+Math.cos(a)*s.d,CY+Math.sin(a)*s.d,s.s,s.s);}ctx.globalAlpha=1;
  // pulse rings
  ctx.lineWidth=2;for(i=0;i<rings.length;i++){var rg=rings[i];ctx.globalAlpha=Math.max(0,rg.l);ctx.strokeStyle=rg.c;ctx.beginPath();ctx.arc(CX,CY,rg.r,0,TAU);ctx.stroke();}ctx.globalAlpha=1;
  // lanes
  var th=state==='start'?t*1.7-Math.PI/2:G.th;
  for(i=0;i<2;i++){ctx.strokeStyle='rgba(140,130,255,'+(0.16+beat*0.12)+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(CX,CY,R[i],0,TAU);ctx.stroke();}
  // core
  var cr=RB*0.36*(1+beat*0.06);var cg=ctx.createRadialGradient(CX,CY,0,CX,CY,cr*1.6);var pc=state==='start'?'0,240,255':(G.mult>1?'255,228,94':'0,240,255');
  cg.addColorStop(0,'rgba('+pc+',0.25)');cg.addColorStop(0.6,'rgba('+pc+',0.06)');cg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=cg;ctx.beginPath();ctx.arc(CX,CY,cr*1.6,0,TAU);ctx.fill();
  ctx.strokeStyle='rgba('+pc+',0.5)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(CX,CY,cr,0,TAU);ctx.stroke();
  if(state==='play'||state==='dying'){ // combo arc in core
    if(G.ctimer>0){ctx.strokeStyle='rgba(255,79,216,0.9)';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.arc(CX,CY,cr-6,-Math.PI/2,-Math.PI/2+TAU*(G.ctimer/3.2));ctx.stroke();}
    ctx.fillStyle='rgba(255,255,255,0.9)';ctx.font='800 '+Math.round(cr*0.55)+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('x'+G.mult,CX,CY+1);
  }
  ctx.lineCap='round';
  if(state!=='start'){
    // orbs
    for(i=0;i<orbs.length;i++){var o=orbs[i];if(o.taken)continue;var d=o.a-G.th;var al=fadeA(o.a,G.t-o.born);var p=pos(o.a,R[o.lane]);var sz=PR*(1.5+0.25*Math.sin(t*8+o.a*3));ctx.globalAlpha=al;ctx.drawImage(sprite('rgb(255,228,94)'),p.x-sz*1.6,p.y-sz*1.6,sz*3.2,sz*3.2);}
    ctx.globalAlpha=1;
    // powerups
    for(i=0;i<pows.length;i++){o=pows[i];if(o.taken)continue;al=fadeA(o.a,G.t-o.born);p=pos(o.a,R[o.lane]);var pc2={shield:'#00f0ff',slow:'#b07cff',magnet:'#7cffb2',x2:'#ffe45e'}[o.kind];
      ctx.globalAlpha=al;ctx.drawImage(sprite(hexRgb(pc2)),p.x-PR*3,p.y-PR*3,PR*6,PR*6);ctx.strokeStyle=pc2;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,PR*1.4+Math.sin(t*6)*1.5,0,TAU);ctx.stroke();
      ctx.fillStyle='#05040f';ctx.font='900 '+Math.round(PR*1.2)+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText({shield:'S',slow:'T',magnet:'M',x2:'2X'}[o.kind],p.x,p.y+1);}
    ctx.globalAlpha=1;
    // obstacles
    for(i=0;i<obs.length;i++){o=obs[i];al=fadeA(o.a,G.t-o.born);var col=o.type==='flip'?'#ffd23f':(o.type==='long'?'#ff3d7f':'#ff4fd8');
      if(o.type==='flip'&&!o.flipped){var bl=0.5+0.5*Math.sin(t*14);ctx.setLineDash([4,7]);ctx.globalAlpha=al*0.5*bl;ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.arc(CX,CY,R[1-o.lane],o.a-o.hw,o.a+o.hw);ctx.stroke();ctx.setLineDash([]);}
      arcStroke(R[o.lane],o.a-o.hw,o.a+o.hw,col,LG*0.36,al);}
    // trail + player
    if(state==='play'){var pcol=skinColor(S.skin,t);var prgb=hexRgb(pcol);
      for(i=0;i<trail.length;i++){var tp=trail[i],k=i/trail.length;ctx.globalAlpha=k*0.5;ctx.fillStyle=pcol;ctx.beginPath();ctx.arc(tp.x,tp.y,PR*k*0.9,0,TAU);ctx.fill();}
      ctx.globalAlpha=1;var pp=pos(G.th,G.r);ctx.drawImage(sprite(prgb.indexOf('hsl')===0?'rgb(255,255,255)':prgb),pp.x-PR*3.2,pp.y-PR*3.2,PR*6.4,PR*6.4);
      ctx.save();ctx.translate(pp.x,pp.y);ctx.rotate(G.th);var sq=G.squash;ctx.scale(1-sq*0.25,1+sq*0.3);ctx.fillStyle=pcol;ctx.beginPath();ctx.arc(0,0,PR,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,PR*0.45,0,TAU);ctx.fill();ctx.restore();
      if(G.shield){ctx.strokeStyle='rgba(0,240,255,'+(0.6+0.3*Math.sin(t*10))+')';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(pp.x,pp.y,PR*1.9,0,TAU);ctx.stroke();}
      if(G.mag>0){ctx.strokeStyle='rgba(124,255,178,0.35)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(CX,CY,(R[0]+R[1])/2,G.th-0.09,G.th+0.09);ctx.stroke();}
    }
  } else {
    // attract mode: demo player + sample obstacles
    var demoLane=(Math.floor(t*0.9)%2),dr=R[demoLane];var dp=pos(th,dr),pcol0=skinColor(S.skin,t);
    for(i=0;i<5;i++){var oa=-Math.PI/2+i*TAU/5+0.6;arcStroke(R[i%2],oa-0.16,oa+0.16,i===2?'#ffd23f':'#ff4fd8',LG*0.36,0.85);}
    for(i=0;i<5;i++){var oa2=-Math.PI/2+i*TAU/5+1.25;var op2=pos(oa2,R[(i+1)%2]);ctx.drawImage(sprite('rgb(255,228,94)'),op2.x-PR*2.4,op2.y-PR*2.4,PR*4.8,PR*4.8);}
    ctx.drawImage(sprite(hexRgb(pcol0).indexOf('hsl')===0?'rgb(255,255,255)':hexRgb(pcol0)),dp.x-PR*3.2,dp.y-PR*3.2,PR*6.4,PR*6.4);ctx.fillStyle=pcol0;ctx.beginPath();ctx.arc(dp.x,dp.y,PR,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(dp.x,dp.y,PR*0.45,0,TAU);ctx.fill();
  }
  // particles
  ctx.globalCompositeOperation='lighter';
  for(i=0;i<parts.length;i++){var q=parts[i];var a2=q.l/q.ml;ctx.globalAlpha=a2;var z=q.s*(1+a2)*2;ctx.drawImage(sprite(q.c),q.x-z,q.y-z,z*2,z*2);}
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  // floating texts
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(i=0;i<texts.length;i++){var tx=texts[i];var sc=tx.big?(1+Math.max(0,tx.l-0.7)*3):1;ctx.globalAlpha=Math.min(1,tx.l*2);ctx.fillStyle=tx.c;ctx.font='900 '+Math.round((tx.big?26:15)*sc)+'px system-ui,sans-serif';ctx.fillText(tx.s,tx.x,tx.big?tx.y-RB*0.55:tx.y);}
  ctx.globalAlpha=1;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(flash>0){ctx.fillStyle='rgba(255,79,216,'+flash*0.35+')';ctx.fillRect(0,0,W,H);}
  if(G.slow>0&&state==='play'){ctx.fillStyle='rgba(120,80,255,0.08)';ctx.fillRect(0,0,W,H);}
  if(paused&&state==='play'){ctx.fillStyle='rgba(5,4,15,0.7)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='800 26px system-ui,sans-serif';ctx.fillText('PAUSED',CX,CY-14);ctx.font='600 15px system-ui,sans-serif';ctx.fillText('Tap to resume',CX,CY+18);}
  // HUD
  if(state==='play'||state==='dying'){setText('score',String(Math.floor(G.score)));var m=$('mult');setText('mult','COMBO '+G.combo+'  \u00b7  x'+G.mult+(G.dbl>0?'  \u00b7  2X':''));m.style.opacity=G.combo>0||G.dbl>0?1:0;$('cbar').style.opacity=G.ctimer>0?1:0;$('cfill').style.width=Math.max(0,G.ctimer/3.2*100)+'%';
    var pw=[];if(G.shield)pw.push('<span style="color:#00f0ff">SHIELD</span>');if(G.slow>0)pw.push('<span style="color:#b07cff">SLOW '+G.slow.toFixed(1)+'</span>');if(G.mag>0)pw.push('<span style="color:#7cffb2">MAGNET '+G.mag.toFixed(1)+'</span>');if(G.dbl>0)pw.push('<span style="color:#ffe45e">2X '+G.dbl.toFixed(1)+'</span>');var ph=pw.join(' &nbsp; ');if(hudCache.pw!==ph){hudCache.pw=ph;$('pw').innerHTML=ph;}}
}
function fadeA(a,age){var ahead=a-G.th;var fin=Math.min(1,age/0.3);var far=Math.max(0.25,Math.min(1,(TAU-0.9-ahead)/1.2));var behind=ahead<-0.15?Math.max(0,1+(ahead+0.15)/0.7):1;return fin*far*behind;}

function loop(now){var dt=Math.min(0.05,(now-last)/1000);last=now;update(dt);if(AC)beatLoop();render(now);requestAnimationFrame(loop);}
requestAnimationFrame(loop);
window.PulseOrbit={get state(){return state},get score(){return G.score},get t(){return G.t},tap:tapGame};
})();

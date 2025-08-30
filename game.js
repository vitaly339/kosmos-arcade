/* Kosmos.Worm — mobile-friendly snake engine
   Изменения:
   • Нормальные размеры на телефонах: канвас работает в логических пикселях без devicePixelRatio.
   • Авто-скейл камеры: одинаковая читаемость на мобильных и ПК.
   • Правило: голова одной змеи врезается в любую часть другой → змея умирает; из трупа выпадает еда.
*/

(function(){
  const CFG = {
    worldSize: 2400,
    baseSpeed: 2.2,
    turnRate: 0.10,
    segSpacing: 8,
    initLen: 24,
    snakeRadius: 7,
    foodRadius: 4,
    bots: 4,
    growthPerFood: 6,
    dropEveryN: 2,
    borderBounce: false,
    bgGrid: true
  };

  // ===== helpers
  const rand = (a,b)=>a + Math.random()*(b-a);
  const clamp = (v,a,b)=>Math.max(a, Math.min(b, v));
  const dist2 = (a,b)=>{ const dx=a.x-b.x, dy=a.y-b.y; return dx*dx+dy*dy; };
  const lerpAngle=(a,b,t)=>{ let d=((b-a+Math.PI*3)%(Math.PI*2))-Math.PI; return a+d*t; };

  // ===== state
  let canvas, ctx, rafId=null, running=false;
  let snakes=[], foods=[], player=null, lastTime=0;
  let score=0;
  const camera = {x:0,y:0, zoom:1, vw:0, vh:0};
  const touch = {active:false, sx:0, sy:0, ex:0, ey:0};

  class Snake {
    constructor(x,y, isPlayer=false, name='bot'){
      this.isPlayer=isPlayer; this.name=name; this.alive=true;
      this.dir=rand(0,Math.PI*2); this.speed=CFG.baseSpeed;
      this.radius=CFG.snakeRadius; this.wantGrow=0;
      this.color = isPlayer ? '#6bf2ff' : '#ffa86b';
      this.segs=[];
      const len=CFG.initLen+Math.floor(rand(0,12));
      for(let i=0;i<len;i++){
        this.segs.push({x:x - i*CFG.segSpacing*Math.cos(this.dir),
                        y:y - i*CFG.segSpacing*Math.sin(this.dir)});
      }
    }
    head(){ return this.segs[0]; }
    update(){
      if (!this.alive) return;
      if (this.isPlayer){
        if (touch.active){
          const dx=touch.ex-touch.sx, dy=touch.ey-touch.sy;
          const ang=Math.atan2(dy,dx);
          if (isFinite(ang)) this.dir = lerpAngle(this.dir, ang, CFG.turnRate*2);
        }
      } else {
        this.dir += rand(-CFG.turnRate*0.4, CFG.turnRate*0.4);
      }

      // движение головы
      const nx=this.head().x + Math.cos(this.dir)*this.speed;
      const ny=this.head().y + Math.sin(this.dir)*this.speed;
      this.segs.unshift({x:nx,y:ny});

      // еда
      for(let i=foods.length-1;i>=0;i--){
        const f=foods[i];
        if (dist2(this.head(), f) < (this.radius+CFG.foodRadius)**2){
          foods.splice(i,1);
          this.wantGrow += CFG.growthPerFood;
          if (this.isPlayer){
            score += 1;
            try{ window.updateUIScore?.(score); }catch(e){}
          }
        }
      }

      if (this.wantGrow>0) this.wantGrow--;
      else this.segs.pop();

      // границы
      const hh=this.head();
      if (CFG.borderBounce){
        if (hh.x<this.radius || hh.x>CFG.worldSize-this.radius) this.dir = Math.PI - this.dir;
        if (hh.y<this.radius || hh.y>CFG.worldSize-this.radius) this.dir = -this.dir;
        hh.x = clamp(hh.x, this.radius, CFG.worldSize-this.radius);
        hh.y = clamp(hh.y, this.radius, CFG.worldSize-this.radius);
      } else {
        if (hh.x<0) hh.x += CFG.worldSize;
        if (hh.x>CFG.worldSize) hh.x -= CFG.worldSize;
        if (hh.y<0) hh.y += CFG.worldSize;
        if (hh.y>CFG.worldSize) hh.y -= CFG.worldSize;
      }
    }
  }

  function dropFoodFromSnake(s){
    for(let i=0;i<s.segs.length;i+=CFG.dropEveryN){
      const p=s.segs[i]; foods.push({x:p.x, y:p.y});
    }
  }

  function checkHeadVsOtherBody(a,b){
    const h=a.head(); const R2=(a.radius + b.radius*0.9)**2;
    for(const seg of b.segs){ if (dist2(h,seg)<=R2) return true; }
    return false;
  }

  function handleCollisions(){
    for(let i=0;i<snakes.length;i++){
      const s=snakes[i]; if(!s.alive) continue;
      for(let j=0;j<snakes.length;j++){
        if(i===j) continue; const o=snakes[j]; if(!o.alive) continue;
        if (checkHeadVsOtherBody(s,o)){
          s.alive=false; dropFoodFromSnake(s);
          if (s.isPlayer) gameOver();
          break;
        }
      }
    }
    snakes = snakes.filter(s=>s.alive);
  }

  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const targetBase = 900; 
    const k = Math.min(window.innerWidth, window.innerHeight) / targetBase;
    camera.zoom = clamp(k, 0.65, 1.15);
    camera.vw = canvas.width / camera.zoom;
    camera.vh = canvas.height / camera.zoom;
  }

  function draw(){
    ctx.fillStyle='#060b18'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // еда
    for(const f of foods){
      ctx.beginPath(); ctx.arc(f.x, f.y, CFG.foodRadius, 0, Math.PI*2);
      ctx.fillStyle='#00ffd5'; ctx.shadowBlur=14; ctx.shadowColor='#00ffd5';
      ctx.fill(); ctx.shadowBlur=0;
    }

    // змейки
    for(const s of snakes){
      ctx.strokeStyle=s.color; ctx.lineWidth=s.radius*2;
      ctx.beginPath();
      for(let i=0;i<s.segs.length;i++){
        const p=s.segs[i]; if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function updateCamera(){
    if (!player) return;
    camera.x = player.head().x - camera.vw/2;
    camera.y = player.head().y - camera.vh/2;
    camera.x = clamp(camera.x, 0, CFG.worldSize - camera.vw);
    camera.y = clamp(camera.y, 0, CFG.worldSize - camera.vh);
  }

  function step(ts){
    if(!running) return;
    const dt = ts - lastTime || 16; lastTime = ts;
    for(const s of snakes) s.update(dt);
    handleCollisions();
    updateCamera();
    draw();
    rafId = requestAnimationFrame(step);
  }

  function spawnFoods(n=60){
    foods.length=0;
    for(let i=0;i<n;i++){
      foods.push({x:rand(60, CFG.worldSize-60), y:rand(60, CFG.worldSize-60)});
    }
  }

  function spawnSnakes(){
    snakes.length=0; score=0; try{ window.updateUIScore?.(0); }catch(e){}
    player = new Snake(rand(400,800), rand(400,800), true, 'player');
    player.color='#6bf2ff'; snakes.push(player);
    const names=['Земля','Марс','Юпитер','Венера'];
    for(let i=0;i<CFG.bots;i++){
      snakes.push(new Snake(rand(200,CFG.worldSize-200), rand(200,CFG.worldSize-200), false, names[i%names.length]));
    }
    spawnFoods(80);
    updateCamera();
  }

  function start(){
    if (running) return;
    canvas=document.createElement('canvas');
    canvas.id='worm-canvas';
    canvas.style.position='fixed'; canvas.style.inset='0';
    canvas.style.zIndex='50'; canvas.style.touchAction='none';
    document.body.appendChild(canvas);
    ctx=canvas.getContext('2d');
    window.addEventListener('resize', resize);
    resize();
    bindInput();
    spawnSnakes();
    running=true; lastTime=0;
    document.body.classList.add('playing-worm');
    rafId=requestAnimationFrame(step);
  }

  function stop(){
    running=false;
    if(rafId) cancelAnimationFrame(rafId);
    if(canvas) canvas.remove(); canvas=null; ctx=null;
    snakes.length=0; foods.length=0;
    document.body.classList.remove('playing-worm');
  }

  function gameOver(){ running=false; setTimeout(stop, 450); }

  function bindInput(){
    window.addEventListener('keydown', e=>{
      if(!player) return; const k=e.key.toLowerCase();
      if (k==='arrowleft'||k==='a') player.dir -= 0.22;
      if (k==='arrowright'||k==='d') player.dir += 0.22;
      if (k==='arrowup'||k==='w') player.speed = CFG.baseSpeed*1.35;
      if (k==='arrowdown'||k==='s') player.speed = CFG.baseSpeed*0.8;
    });
    window.addEventListener('keyup', e=>{
      if(!player) return; const k=e.key.toLowerCase();
      if (['arrowup','w','arrowdown','s'].includes(k)) player.speed = CFG.baseSpeed;
    });

    const onStart=(e)=>{ const t=e.touches?e.touches[0]:e;
      touch.active=true; touch.sx=touch.ex=t.clientX; touch.sy=touch.ey=t.clientY; };
    const onMove=(e)=>{ if(!touch.active) return; const t=e.touches?e.touches[0]:e; touch.ex=t.clientX; touch.ey=t.clientY; };
    const onEnd=()=>{ touch.active=false; if(player) player.speed=CFG.baseSpeed; };
    canvas.addEventListener('touchstart', onStart, {passive:true});
    canvas.addEventListener('touchmove', onMove, {passive:true});
    canvas.addEventListener('touchend', onEnd, {passive:true});
    canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  }

  document.addEventListener('ui:start-worm', start);
  document.addEventListener('ui:menu', stop);
  window.__worm = { start, stop };
})();
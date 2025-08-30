/* Kosmos.Worm — минимальный движок змейки
   🐍 Правила:
   — если голова змеи врезается в любую часть другой → змея умирает
   — из мёртвой змеи выпадает еда
   — игрок управляет стрелками/WASD или свайпами на телефоне
*/

(function(){
  const CFG = {
    worldSize: 2400,
    tick: 1000/60,
    baseSpeed: 2.2,
    turnRate: 0.1,
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

  const rand = (a,b)=>a + Math.random()*(b-a);
  const clamp = (v,a,b)=>Math.max(a, Math.min(b, v));
  const dist2 = (a,b)=>{ const dx=a.x-b.x, dy=a.y-b.y; return dx*dx+dy*dy; };

  let canvas, ctx, camera={x:0,y:0}, rafId=null;
  let snakes=[], foods=[], running=false, player=null, lastTime=0;
  let touch = {active:false, sx:0, sy:0, ex:0, ey:0};
  let score = 0;

  class Snake {
    constructor(x,y, isPlayer=false, name='bot'){
      this.isPlayer = isPlayer;
      this.name = name;
      this.dir = rand(0, Math.PI*2);
      this.speed = CFG.baseSpeed;
      this.alive = true;
      this.wantGrow = 0;
      this.segs = [];
      const len = CFG.initLen + Math.floor(rand(0, 12));
      for (let i=0; i<len; i++){
        this.segs.push({x: x - i*CFG.segSpacing*Math.cos(this.dir), y: y - i*CFG.segSpacing*Math.sin(this.dir)});
      }
      this.radius = CFG.snakeRadius;
      this.color = this.isPlayer ? '#6bf2ff' : '#fa7';
    }
    head(){ return this.segs[0]; }
    update(){
      if (!this.alive) return;

      if (this.isPlayer){
        // управление свайпом
        if (touch.active){
          const dx = touch.ex - touch.sx;
          const dy = touch.ey - touch.sy;
          const ang = Math.atan2(dy, dx);
          if (isFinite(ang)) this.dir = lerpAngle(this.dir, ang, CFG.turnRate*2);
        }
      } else {
        // простое блуждание для ботов
        this.dir += rand(-CFG.turnRate*0.4, CFG.turnRate*0.4);
      }

      // движение головы
      const nx = this.head().x + Math.cos(this.dir)*this.speed;
      const ny = this.head().y + Math.sin(this.dir)*this.speed;
      this.segs.unshift({x:nx, y:ny});

      // еда
      for (let i=foods.length-1; i>=0; i--){
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

      if (this.wantGrow>0){
        this.wantGrow--;
      } else {
        this.segs.pop();
      }

      const hh = this.head();
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

  function lerpAngle(a,b,t){
    let d = ((b - a + Math.PI*3) % (Math.PI*2)) - Math.PI;
    return a + d * t;
  }

  function dropFoodFromSnake(snake){
    for (let i=0;i<snake.segs.length;i+=CFG.dropEveryN){
      foods.push({x:snake.segs[i].x, y:snake.segs[i].y});
    }
  }

  function checkHeadVsOtherBody(a, b){
    const h = a.head();
    const R2 = (a.radius + b.radius*0.9) ** 2;
    for (let seg of b.segs){
      if (dist2(h, seg) <= R2) return true;
    }
    return false;
  }

  function handleCollisions(){
    for (let i=0;i<snakes.length;i++){
      const s = snakes[i];
      if (!s.alive) continue;
      for (let j=0;j<snakes.length;j++){
        if (i===j) continue;
        const o = snakes[j];
        if (!o.alive) continue;
        if (checkHeadVsOtherBody(s, o)){
          s.alive = false;
          dropFoodFromSnake(s);
          if (s.isPlayer) gameOver();
        }
      }
    }
    snakes = snakes.filter(s=>s.alive);
  }

  function resize(){
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
  }

  function draw(){
    ctx.fillStyle='#070b17'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // еда
    for (const f of foods){
      ctx.beginPath();
      ctx.arc(f.x, f.y, CFG.foodRadius, 0, Math.PI*2);
      ctx.fillStyle = '#00ffd5';
      ctx.fill();
    }

    // змейки
    for (const s of snakes){
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.radius*2;
      ctx.beginPath();
      for (let i=0;i<s.segs.length;i++){
        const p = s.segs[i];
        if (i===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function step(ts){
    if (!running) return;
    const dt = ts - lastTime || 16;
    lastTime = ts;
    for (const s of snakes) s.update(dt);
    handleCollisions();
    if (player){ camera.x = player.head().x - window.innerWidth/2; camera.y = player.head().y - window.innerHeight/2; }
    draw();
    rafId = requestAnimationFrame(step);
  }

  function spawnFoods(n=40){
    foods.length=0;
    for (let i=0;i<n;i++){
      foods.push({x:rand(60, CFG.worldSize-60), y:rand(60, CFG.worldSize-60)});
    }
  }

  function spawnSnakes(){
    snakes.length=0;
    player = new Snake(rand(400,800), rand(400,800), true, 'player');
    snakes.push(player);
    const names = ['Земля','Марс','Юпитер','Венера'];
    for (let i=0;i<CFG.bots;i++){
      snakes.push(new Snake(rand(200, CFG.worldSize-200), rand(200, CFG.worldSize-200), false, names[i%names.length]));
    }
    spawnFoods(60);
  }

  function start(){
    if (running) return;
    canvas = document.createElement('canvas');
    canvas.id = 'worm-canvas';
    canvas.style.position='fixed';
    canvas.style.inset='0';
    canvas.style.zIndex='50';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    spawnSnakes();
    running = true;
    lastTime = 0;
    rafId = requestAnimationFrame(step);
    document.body.classList.add('playing-worm');
  }

  function stop(){
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (canvas) canvas.remove();
    snakes.length=0; foods.length=0;
    document.body.classList.remove('playing-worm');
  }

  function gameOver(){
    running = false;
    setTimeout(stop, 400);
  }

  // управление
  window.addEventListener('keydown', e=>{
    if (!player) return;
    if (e.key==='ArrowLeft' || e.key==='a') player.dir -= 0.22;
    if (e.key==='ArrowRight' || e.key==='d') player.dir += 0.22;
    if (e.key==='ArrowUp' || e.key==='w') player.speed = CFG.baseSpeed*1.35;
    if (e.key==='ArrowDown' || e.key==='s') player.speed = CFG.baseSpeed*0.8;
  });
  window.addEventListener('keyup', e=>{
    if (!player) return;
    if (['ArrowUp','w','ArrowDown','s'].includes(e.key)) player.speed = CFG.baseSpeed;
  });

  // свайпы
  function onStart(e){ const t=e.touches?e.touches[0]:e; touch.active=true; touch.sx=touch.ex=t.clientX; touch.sy=touch.ey=t.clientY; }
  function onMove(e){ if(!touch.active)return; const t=e.touches?e.touches[0]:e; touch.ex=t.clientX; touch.ey=t.clientY; }
  function onEnd(){ touch.active=false; if (player) player.speed=CFG.baseSpeed; }
  document.addEventListener('touchstart', onStart, {passive:true});
  document.addEventListener('touchmove', onMove, {passive:true});
  document.addEventListener('touchend', onEnd, {passive:true});

  // связь с меню
  document.addEventListener('ui:start-worm', start);
  document.addEventListener('ui:menu', stop);

  window.__worm = { start, stop };
})();
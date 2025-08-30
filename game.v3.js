/* Kosmos.Worm — stylized "io" look (mobile friendly)
   • Глянцевая змея со свечением, глазками и точками на теле.
   • Фон в стиле hex + виньетка.
   • Голова в любую часть другой змеи → смерть, из трупа падает еда.
   • Авто-масштаб камеры (мобилка/ПК).
*/
(function(){
  const CFG = {
    worldSize: 2600,
    baseSpeed: 2.25,
    turnRate: 0.10,
    segSpacing: 8,
    initLen: 28,          // 👈 базовая длина (минимум сегментов)
    snakeRadius: 12,      // толщина «трубы»
    foodRadius: 4,
    bots: 4,
    growthPerFood: 6,
    dropEveryN: 2,
    borderBounce: false,
    bgHex: true
  };

  // helpers
  const rand = (a,b)=>a + Math.random()*(b-a);
  const clamp = (v,a,b)=>Math.max(a, Math.min(b, v));
  const dist2 = (a,b)=>{ const dx=a.x-b.x, dy=a.y-b.y; return dx*dx+dy*dy; };
  const lerpAngle=(a,b,t)=>{ let d=((b-a+Math.PI*3)%(Math.PI*2))-Math.PI; return a+d*t; };

  // state
  let canvas, ctx, rafId=null, running=false;
  let snakes=[], foods=[], player=null, lastTime=0, score=0;
  const camera = {x:0,y:0, zoom:1, vw:0, vh:0};
  const touch  = {active:false, sx:0, sy:0, ex:0, ey:0};

  class Snake {
    constructor(x,y, isPlayer=false, name='bot', color='#6bf2ff'){
      this.isPlayer=isPlayer; this.name=name; this.alive=true;
      this.dir=rand(0,Math.PI*2); this.speed=CFG.baseSpeed;
      this.radius=CFG.snakeRadius; this.wantGrow=0;
      this.color=color;
      this.segs=[];
      const len=CFG.initLen+Math.floor(rand(0,12));
      for (let i=0;i<len;i++){
        this.segs.push({x:x - i*CFG.segSpacing*Math.cos(this.dir),
                        y:y - i*CFG.segSpacing*Math.sin(this.dir)});
      }
    }
    head(){ return this.segs[0]; }
    update(){
      if(!this.alive) return;

      // управление
      if (this.isPlayer){
        if (touch.active){
          const dx=touch.ex-touch.sx, dy=touch.ey-touch.sy;
          const ang=Math.atan2(dy,dx);
          if (isFinite(ang)) this.dir = lerpAngle(this.dir, ang, CFG.turnRate*2);
        }
      } else {
        this.dir += rand(-CFG.turnRate*0.4, CFG.turnRate*0.4);
        const h=this.head();
        if (h.x<140) this.dir = lerpAngle(this.dir, 0, 0.2);
        if (h.x>CFG.worldSize-140) this.dir = lerpAngle(this.dir, Math.PI, 0.2);
        if (h.y<140) this.dir = lerpAngle(this.dir, Math.PI/2, 0.2);
        if (h.y>CFG.worldSize-140) this.dir = lerpAngle(this.dir, -Math.PI/2, 0.2);
      }

      // движение головы (вставляем новый сегмент)
      const nx=this.head().x + Math.cos(this.dir)*this.speed;
      const ny=this.head().y + Math.sin(this.dir)*this.speed;
      this.segs.unshift({x:nx,y:ny});

      // еда
      for(let i=foods.length-1;i>=0;i--){
        const f=foods[i];
        if (dist2(this.head(), f) < (this.radius+CFG.foodRadius)**2){
          foods.splice(i,1);
          this.wantGrow += CFG.growthPerFood;
          if (this.isPlayer){ score++; try{ window.updateUIScore?.(score); }catch(e){} }
        }
      }

      // ✅ рост/хвост: НЕ укорачиваем ниже базовой длины
      if (this.wantGrow > 0) {
        this.wantGrow--;
      } else if (this.segs.length > CFG.initLen) {
        this.segs.pop();
      }
      // (если длина == initLen — хвост не трогаем, чтобы не было «палочки»)

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

  // world
  function dropFoodFromSnake(s){
    for(let i=0;i<s.segs.length;i+=CFG.dropEveryN){
      const p=s.segs[i]; foods.push({x:p.x,y:p.y});
    }
  }
  function checkHeadVsOtherBody(a,b){
    const h=a.head(); const R2=(a.radius + b.radius*0.9)**2;
    for(const seg of b.segs){ if (dist2(h,seg)<=R2) return true; }
    return false;
  }
  function handleCollisions(){
    for (let i=0;i<snakes.length;i++){
      const s=snakes[i]; if(!s.alive) continue;
      for (let j=0;j<snakes.length;j++){
        if (i===j) continue; const o=snakes[j]; if(!o.alive) continue;
        if (checkHeadVsOtherBody(s,o)){
          s.alive=false; dropFoodFromSnake(s); if (s.isPlayer) gameOver();
          break;
        }
      }
    }
    snakes = snakes.filter(s=>s.alive);
  }

  // draw helpers
  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const targetBase = 900; // регулировка общего масштаба
    const k = Math.min(canvas.width, canvas.height) / targetBase;
    camera.zoom = clamp(k, 0.68, 1.15);
    camera.vw = canvas.width / camera.zoom;
    camera.vh = canvas.height / camera.zoom;
  }
  function updateCamera(){
    if(!player) return;
    camera.x = player.head().x - camera.vw/2;
    camera.y = player.head().y - camera.vh/2;
    camera.x = clamp(camera.x, 0, CFG.worldSize-camera.vw);
    camera.y = clamp(camera.y, 0, CFG.worldSize-camera.vh);
  }

  function drawSmoothPath(points){
    if (points.length<2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i=1; i<points.length-1; i++){
      const p = points[i], n = points[i+1];
      const mx = (p.x + n.x)/2, my = (p.y + n.y)/2;
      ctx.quadraticCurveTo(p.x, p.y, mx, my);
    }
    ctx.lineTo(points[points.length-1].x, points[points.length-1].y);
  }
  function drawGlowLayer(drawFn, color, blur){
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.shadowColor = color; ctx.shadowBlur = blur;
    drawFn();
    ctx.restore();
  }
  function drawFood(){
    for(const f of foods){
      ctx.save();
      ctx.beginPath(); ctx.arc(f.x, f.y, CFG.foodRadius, 0, Math.PI*2);
      ctx.fillStyle='#00ffd5'; ctx.shadowBlur=14; ctx.shadowColor='#00ffd5';
      ctx.fill(); ctx.restore();
    }
  }
  function drawSnake(s){
    const r = s.radius;

    // базовый градиент вдоль тела
    const h = s.head(), t = s.segs[s.segs.length-1];
    const lg = ctx.createLinearGradient(h.x, h.y, t.x, t.y);
    lg.addColorStop(0,   lighten(s.color, 0.20));
    lg.addColorStop(0.5, s.color);
    lg.addColorStop(1,   darken(s.color, 0.18));

    // свечение
    drawGlowLayer(()=>{ ctx.lineWidth = r*2; drawSmoothPath(s.segs); ctx.strokeStyle=s.color; ctx.stroke(); }, s.color, 24);

    // основное тело
    ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.lineWidth = r*2; drawSmoothPath(s.segs); ctx.strokeStyle = lg; ctx.stroke();

    // блик сверху
    ctx.save();
    ctx.globalCompositeOperation='screen';
    ctx.lineWidth = r*1.15;
    const vGrad = ctx.createLinearGradient(0, camera.y, 0, camera.y+camera.vh);
    vGrad.addColorStop(0, 'rgba(255,255,255,.16)');
    vGrad.addColorStop(1, 'rgba(255,255,255,.02)');
    ctx.strokeStyle = vGrad;
    drawSmoothPath(s.segs); ctx.stroke();
    ctx.restore();

    // точки-узоры
    for (let i=2; i<s.segs.length-2; i+=4){
      const p0=s.segs[i-1], p1=s.segs[i+1];
      const dx=p1.x-p0.x, dy=p1.y-p0.y;
      const len=Math.hypot(dx,dy)||1;
      const nx=-dy/len, ny=dx/len;        // нормаль
      const ox=nx*(r*0.75), oy=ny*(r*0.75);
      ctx.beginPath();
      ctx.arc(s.segs[i].x+ox, s.segs[i].y+oy, r*0.35, 0, Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,.65)';
      ctx.globalCompositeOperation='overlay';
      ctx.fill();
      ctx.globalCompositeOperation='source-over';
    }

    // глаза + «нос»
    const head = s.head();
    const dpx = Math.cos(s.dir), dpy = Math.sin(s.dir);
    const nx = -dpy, ny = dpx;

    const eyeOffset = r*0.6, eyeR = r*0.45;
    // левый
    ctx.beginPath(); ctx.arc(head.x + nx*eyeOffset + dpx*0.6, head.y + ny*eyeOffset + dpy*0.6, eyeR, 0, Math.PI*2);
    ctx.fillStyle='#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(head.x + nx*eyeOffset + dpx*1.0, head.y + ny*eyeOffset + dpy*1.0, eyeR*0.45, 0, Math.PI*2);
    ctx.fillStyle='#111'; ctx.fill();
    // правый
    ctx.beginPath(); ctx.arc(head.x - nx*eyeOffset + dpx*0.6, head.y - ny*eyeOffset + dpy*0.6, eyeR, 0, Math.PI*2);
    ctx.fillStyle='#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(head.x - nx*eyeOffset + dpx*1.0, head.y - ny*eyeOffset + dpy*1.0, eyeR*0.45, 0, Math.PI*2);
    ctx.fillStyle='#111'; ctx.fill();

    // нос/ротик
    ctx.beginPath();
    ctx.arc(head.x + dpx*(r*0.9), head.y + dpy*(r*0.9), r*0.18, 0, Math.PI*2);
    ctx.fillStyle=darken(s.color,0.25);
    ctx.fill();
  }

  // background
  function drawBackground(){
    // виньетка
    const g = ctx.createRadialGradient(
      camera.x + camera.vw/2, camera.y + camera.vh/2, Math.min(camera.vw,camera.vh)*0.2,
      camera.x + camera.vw/2, camera.y + camera.vh/2, Math.max(camera.vw,camera.vh)*0.8
    );
    g.addColorStop(0, '#0a1020'); g.addColorStop(1, '#06101a');
    ctx.fillStyle=g;
    ctx.fillRect(camera.x, camera.y, camera.vw, camera.vh);

    if (!CFG.bgHex) return;
    // гекс-сетка
    const size=46, h=size*Math.sqrt(3)/2;
    ctx.save();
    ctx.globalAlpha=.22;
    ctx.strokeStyle='#1ad19e'; ctx.lineWidth=1;
    let startX = Math.floor(camera.x / (size*1.5)) - 1;
    let endX   = Math.ceil((camera.x+camera.vw) / (size*1.5)) + 1;
    let startY = Math.floor(camera.y / h) - 2;
    let endY   = Math.ceil((camera.y+camera.vh) / h) + 2;
    for (let i=startX; i<endX; i++){
      for (let j=startY; j<endY; j++){
        const cx = i*size*1.5;
        const cy = j*h + (i%2? h/2:0);
        hexPath(cx, cy, size/2.0);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function hexPath(cx,cy,r){
    ctx.beginPath();
    for(let k=0;k<6;k++){
      const a = Math.PI/3*k;
      const x = cx + r*Math.cos(a), y = cy + r*Math.sin(a);
      if (k===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
  }

  // main draw
  function draw(){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    drawBackground();
    drawFood();
    for (const s of snakes) drawSnake(s);
  }

  // loop
  function step(ts){
    if(!running) return;
    const dt = ts - lastTime || 16; lastTime = ts;
    for (const s of snakes) s.update(dt);
    handleCollisions();
    updateCamera();
    draw();
    rafId = requestAnimationFrame(step);
  }

  // setup
  function spawnFoods(n=90){
    foods.length=0;
    for (let i=0;i<n;i++){
      foods.push({x:rand(60, CFG.worldSize-60), y:rand(60, CFG.worldSize-60)});
    }
  }
  function spawnSnakes(){
    snakes.length=0; score=0; try{ window.updateUIScore?.(0); }catch(e){}
    const palette = ['#6bf2ff','#7eff6b','#ff6be6','#ffaa6b','#7aa3ff','#ffd86b'];
    player = new Snake(rand(600,1000), rand(600,1000), true, 'player', palette[0]);
    snakes.push(player);
    const names=['Земля','Марс','Юпитер','Венера','Сатурн','Нептун','Меркурий','Уран'];
    for (let i=0;i<CFG.bots;i++){
      const col = palette[1 + (i % (palette.length-1))];
      snakes.push(new Snake(rand(200, CFG.worldSize-200), rand(200, CFG.worldSize-200), false, names[i%names.length], col));
    }
    spawnFoods();
    updateCamera();
  }

  function start(){
    if (running) return;
    canvas = document.createElement('canvas');
    canvas.id='worm-canvas'; canvas.style.position='fixed'; canvas.style.inset='0';
    canvas.style.zIndex='50'; canvas.style.touchAction='none';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resize);
    resize();
    bindInput();
    spawnSnakes();
    running=true; lastTime=0; document.body.classList.add('playing-worm');
    rafId=requestAnimationFrame(step);
    console.log('🐍 Worm v3 loaded');
  }
  function stop(){
    running=false;
    if(rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    if (canvas) canvas.remove(); canvas=null; ctx=null;
    snakes.length=0; foods.length=0;
    document.body.classList.remove('playing-worm');
  }
  function gameOver(){ running=false; setTimeout(stop, 450); }

  // input
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

  // color helpers
  function hexToRgb(h){
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return m ? {r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16)} : {r:255,g:255,b:255};
  }
  function rgbToHex(r,g,b){
    const to = v=>('0'+Math.round(v).toString(16)).slice(-2);
    return '#'+to(r)+to(g)+to(b);
  }
  function lighten(hex, k){ const {r,g,b}=hexToRgb(hex); return rgbToHex(r+(255-r)*k, g+(255-g)*k, b+(255-b)*k); }
  function darken(hex, k){ const {r,g,b}=hexToRgb(hex); return rgbToHex(r*(1-k), g*(1-k), b*(1-k)); }

  // UI link
  document.addEventListener('ui:start-worm', start);
  document.addEventListener('ui:menu', stop);
  window.__worm = { start, stop };
})();
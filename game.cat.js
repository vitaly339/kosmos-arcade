/* Kosmos.Cat — упрощённый режим "котик"
   • Кот — шарик с ушками.
   • Движение стрелками или свайпами.
   • Отскоки от стен.
*/

(function(){
  let canvas, ctx, rafId=null, running=false;
  const cat = { x:300, y:300, r:30, dir:0, speed:3 };
  const touch={active:false, sx:0,sy:0,ex:0,ey:0};

  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function drawCat(){
    const {x,y,r} = cat;

    // тело
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle="#ffcc66";
    ctx.fill();

    // ушки
    ctx.beginPath();
    ctx.moveTo(x-r*0.6,y-r*0.2);
    ctx.lineTo(x-r*1.0,y-r*1.2);
    ctx.lineTo(x-r*0.2,y-r*0.8);
    ctx.closePath();
    ctx.fillStyle="#ff9966"; ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x+r*0.6,y-r*0.2);
    ctx.lineTo(x+r*1.0,y-r*1.2);
    ctx.lineTo(x+r*0.2,y-r*0.8);
    ctx.closePath();
    ctx.fillStyle="#ff9966"; ctx.fill();

    // глаза
    ctx.beginPath();
    ctx.arc(x-r*0.4,y-r*0.2,r*0.18,0,Math.PI*2);
    ctx.arc(x+r*0.4,y-r*0.2,r*0.18,0,Math.PI*2);
    ctx.fillStyle="#222"; ctx.fill();

    // рот
    ctx.beginPath();
    ctx.arc(x,y+r*0.2,r*0.25,0,Math.PI);
    ctx.strokeStyle="#222"; ctx.lineWidth=2; ctx.stroke();
  }

  function draw(){
    ctx.fillStyle="#0b1020";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    drawCat();
  }

  function update(){
    cat.x += Math.cos(cat.dir)*cat.speed;
    cat.y += Math.sin(cat.dir)*cat.speed;

    // отскоки от стен
    if (cat.x<cat.r || cat.x>canvas.width-cat.r){
      cat.dir = Math.PI - cat.dir;
    }
    if (cat.y<cat.r || cat.y>canvas.height-cat.r){
      cat.dir = -cat.dir;
    }
  }

  function step(){
    if(!running) return;
    update();
    draw();
    rafId=requestAnimationFrame(step);
  }

  function start(){
    if (running) return;
    canvas=document.createElement('canvas');
    canvas.style.position='fixed'; canvas.style.inset='0'; canvas.style.zIndex='50';
    document.body.appendChild(canvas);
    ctx=canvas.getContext('2d');
    window.addEventListener('resize',resize);
    resize();
    bindInput();
    running=true;
    rafId=requestAnimationFrame(step);
    document.body.classList.add('playing-cat');
  }

  function stop(){
    running=false;
    if(rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize',resize);
    if(canvas) canvas.remove();
    document.body.classList.remove('playing-cat');
  }

  function bindInput(){
    window.addEventListener('keydown', e=>{
      if (e.key==='ArrowLeft'||e.key==='a') cat.dir -=0.2;
      if (e.key==='ArrowRight'||e.key==='d') cat.dir +=0.2;
      if (e.key==='ArrowUp'||e.key==='w') cat.speed=4.5;
      if (e.key==='ArrowDown'||e.key==='s') cat.speed=2;
    });
    window.addEventListener('keyup', e=>{
      if (['ArrowUp','w','ArrowDown','s'].includes(e.key)) cat.speed=3;
    });

    const onStart=(e)=>{ const t=e.touches?e.touches[0]:e;
      touch.active=true; touch.sx=touch.ex=t.clientX; touch.sy=touch.ey=t.clientY; };
    const onMove=(e)=>{ if(!touch.active)return; const t=e.touches?e.touches[0]:e; touch.ex=t.clientX; touch.ey=t.clientY;
      const dx=touch.ex-touch.sx, dy=touch.ey-touch.sy;
      cat.dir=Math.atan2(dy,dx);
    };
    const onEnd=()=>{ touch.active=false; cat.speed=3; };
    canvas.addEventListener('touchstart', onStart,{passive:true});
    canvas.addEventListener('touchmove', onMove,{passive:true});
    canvas.addEventListener('touchend', onEnd,{passive:true});
  }

  document.addEventListener('ui:start-cat', start);
  document.addEventListener('ui:menu', stop);

  window.__cat={start,stop};
})();
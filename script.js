/* Kosmos.Worm — управление кнопками меню и связка с игрой */

function vibe(ms=15){
  try{ navigator.vibrate?.(ms); }catch(e){}
}

// кнопки
const btnWorm   = document.getElementById('btn-worm');
const btnCat    = document.getElementById('btn-cat');
const btnMenu   = document.getElementById('btn-menu');
const btnShop   = document.getElementById('btn-shop');
const btnSwitch = document.getElementById('btn-switch');
const btnRecs   = document.getElementById('btn-records');

// счётчик
const scoreChip = document.getElementById('score-chip');

// обновление счёта из игры
window.updateUIScore = function(score){
  if (scoreChip) scoreChip.textContent = String(score);
};

// события для игры
btnWorm?.addEventListener('click', ()=>{
  vibe();
  document.dispatchEvent(new Event('ui:start-worm'));
});

btnCat?.addEventListener('click', ()=>{
  vibe();
  alert("Режим Cat пока не реализован 🚧");
});

btnMenu?.addEventListener('click', ()=>{
  vibe();
  document.dispatchEvent(new Event('ui:menu'));
});

btnShop?.addEventListener('click', ()=>{
  vibe();
  alert("Магазин скоро откроется 🛒");
});

btnSwitch?.addEventListener('click', ()=>{
  vibe();
  alert("Переключение игры 🚀");
});

btnRecs?.addEventListener('click', ()=>{
  vibe();
  alert("Рекорды ещё не добавлены 🏆");
});

console.log("script.js подключён: кнопки активны");
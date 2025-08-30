/* Kosmos.Worm UI → Game hooks
   Подключает кнопки меню к твоим игровым функциям.
   Если в твоем проекте уже есть глобальные функции, укажи их именна ниже.
*/

// === Настройка имен функций твоей игры ===
const API = {
  startWorm: (typeof window.startWormMode === 'function') ? window.startWormMode
             : (typeof window.switchGame === 'function') ? () => window.switchGame('worm')
             : null,
  startCat: (typeof window.startCatMode === 'function') ? window.startCatMode
            : (typeof window.switchGame === 'function') ? () => window.switchGame('cat')
            : null,
  goMenu: (typeof window.goToMenu === 'function') ? window.goToMenu : null,
  openShop: (typeof window.openShop === 'function') ? window.openShop : null,
  showRecords: (typeof window.showRecords === 'function') ? window.showRecords : null,
  setScore: (typeof window.onUIScoreUpdate === 'function') ? window.onUIScoreUpdate : null
};

// === Помощник: безопасный вызов + fallback на кастомные события ===
function callOrDispatch(name, fn, payload) {
  if (typeof fn === 'function') {
    try { return fn(payload); } catch(e){ console.error(e); }
  }
  // Fallback: бросаем CustomEvent, чтобы твой движок мог поймать
  try {
    document.dispatchEvent(new CustomEvent(name, { detail: payload }));
  } catch(e){}
}

// === Навешиваем обработчики ===
const $ = (s)=>document.querySelector(s);

$('#btn-worm')?.addEventListener('click', ()=>{
  callOrDispatch('ui:start-worm', API.startWorm);
});

$('#btn-cat')?.addEventListener('click', ()=>{
  callOrDispatch('ui:start-cat', API.startCat);
});

$('#btn-menu')?.addEventListener('click', ()=>{
  callOrDispatch('ui:menu', API.goMenu);
});

$('#btn-shop')?.addEventListener('click', ()=>{
  callOrDispatch('ui:shop', API.openShop);
});

$('#btn-records')?.addEventListener('click', ()=>{
  callOrDispatch('ui:records', API.showRecords);
});

// === Пример: как обновлять счёт из игры ===
// В твоём движке просто вызывай: window.updateUIScore(123)
window.updateUIScore = function(score){
  const chip = document.getElementById('score-chip');
  if (chip) chip.textContent = String(score);
  if (API.setScore) { try { API.setScore(score); } catch(e){} }
};

// Мобильный UX: небольшая вибрация при клике (если доступно)
function vibe(ms=12){ try{ navigator.vibrate?.(ms); }catch(e){} }
document.querySelectorAll('.mode, .chip').forEach(b=>{
  b.addEventListener('click', ()=>vibe());
});

// Фокус на кнопках по клавиатуре
document.addEventListener('keydown', (e)=>{
  if (e.key === '1') $('#btn-worm')?.focus();
  if (e.key === '2') $('#btn-cat')?.focus();
});

console.log('Kosmos.Worm UI ready');

// ====== 数字动画 + 页面入口增强 ======

const origGo = Router.go;
Router.go = function(pageName) {
  origGo.call(this, pageName);
  if (pageName === 'result') {
    setTimeout(() => {
      const el = document.getElementById('scoreValue');
      if (!el) return;
      const target = parseInt(el.textContent);
      animateScoreNumber(el, target, 1400);
    }, 350);
  }
};

function animateScoreNumber(el, target, duration) {
  const start = performance.now();
  const update = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
    el.textContent = Math.round(eased * target);
    if (t < 1) requestAnimationFrame(update);
    else el.textContent = target;
  };
  requestAnimationFrame(update);
}

/* Contrast · the one script: reveals, the scroll-led effects, the clock, the counters and the screens that step
   through their states. Everything here is decoration: without it, or for a visitor who asked for less motion,
   the page reads the same. */
(function () {
  var d = document, reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* keep moving */ }
  var $ = function (s, c) { return [].slice.call((c || d).querySelectorAll(s)); };
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  /* 1. reveal once, when a block comes into view */
  var watched = $('[data-in], .stage, .cells, .marq');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    watched.forEach(function (el) { io.observe(el); });
  } else watched.forEach(function (el) { el.classList.add('in'); });

  /* 2. Berlin's time in the nav */
  var clock = d.querySelector('[data-clock]');
  if (clock && window.Intl) {
    var fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
    var tick = function () { clock.textContent = 'Berlin ' + fmt.format(new Date()); };
    tick(); setInterval(tick, 15000);
  }

  /* 3. led by the scroll: the nav shrinks, a statement fills in word by word, covered cards step back,
        the service nearest the middle of the screen lights up, the footer name rises */
  var nav = d.querySelector('.nav'), fills = $('[data-fill]'), cards = $('.card'), rows = $('.svc li'), mark = d.querySelector('.mark');
  var queued = false;
  function frame() {
    queued = false;
    var vh = innerHeight;
    if (nav) nav.classList.toggle('is-small', scrollY > 120);
    fills.forEach(function (el) {
      var r = el.getBoundingClientRect(), ws = el._w || (el._w = $('.w', el));
      var n = reduce ? ws.length : Math.round(clamp((vh * 0.88 - r.top) / (vh * 0.42 + r.height * 0.7)) * ws.length);
      ws.forEach(function (w, i) { w.classList.toggle('on', i < n); });
    });
    if (!reduce && innerWidth >= 900) cards.forEach(function (c, i) {
      var nx = cards[i + 1]; if (!nx) return;
      var a = c.getBoundingClientRect(), b = nx.getBoundingClientRect();
      c.style.setProperty('--c', clamp(1 - (b.top - a.top) / a.height).toFixed(3));
    });
    if (rows.length) {
      var best = null, bd = 1e9;
      rows.forEach(function (r) { var b = r.getBoundingClientRect(), dist = Math.abs(b.top + b.height / 2 - vh * 0.5); if (dist < bd) { bd = dist; best = r; } });
      rows.forEach(function (r) { r.classList.toggle('is-lit', r === best && bd < vh * 0.42); });
    }
    if (mark && !reduce) { var m = mark.parentNode.getBoundingClientRect(); mark.style.setProperty('--f', clamp((vh - m.top) / m.height).toFixed(3)); }   /* the footer's own box: the name's moves with it */
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();

  /* 4. numbers count up to their value */
  $('[data-count]').forEach(function (el) {
    var to = +el.getAttribute('data-count');
    if (reduce || !('IntersectionObserver' in window)) return;
    el.textContent = '0';
    new IntersectionObserver(function (es, o) {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      var t0 = performance.now(), dur = 1300;
      (function step(t) { var p = clamp((t - t0) / dur), e = 1 - Math.pow(1 - p, 4); el.textContent = Math.round(to * e); if (p < 1) requestAnimationFrame(step); })(t0);
    }, { threshold: 0.6 }).observe(el);
  });

  /* 5. a screen fades in when it arrives; a cell with several states steps through them while in view, and its
        caption lets you pick one (which stops the stepping) */
  $('.frame img').forEach(function (img) {
    if (img.complete) return;
    var done = function () { img.classList.remove('is-loading'); };
    img.classList.add('is-loading'); img.addEventListener('load', done); img.addEventListener('error', done);
  });
  var HOLD = 3000;
  $('[data-flip]').forEach(function (el, n) {
    var frames = $('.frame', el), picks = $('.cap [data-i]', el), step = el.querySelector('.cap [data-step]');
    var i = 0, timer = 0, seen = false, held = false;
    function show(k) {
      i = (k + frames.length) % frames.length;
      frames.forEach(function (f, j) { f.classList.toggle('is-on', j === i); });
      picks.forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === i)); });
      if (step) step.textContent = (i + 1) + ' / ' + frames.length;
    }
    function tick() { var img = frames[(i + 1) % frames.length].querySelector('img'); if (!img || img.complete) show(i + 1); }
    function stop() { clearInterval(timer); clearTimeout(timer); timer = 0; }
    function play() { if (reduce || held || timer || !seen || d.hidden) return; timer = setTimeout(function () { tick(); timer = setInterval(tick, HOLD); }, HOLD - 900 + (n % 3) * 600); }
    picks.forEach(function (b, j) { b.addEventListener('click', function () { held = true; stop(); show(j); }); });
    if (step) step.addEventListener('click', function () { held = true; stop(); show(i + 1); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[es.length - 1].isIntersecting; if (seen) play(); else stop(); }, { threshold: 0.4 }).observe(el);
    d.addEventListener('visibilitychange', function () { if (d.hidden) stop(); else play(); });
  });
})();

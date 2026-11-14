/* Contrast · the hero alternatives' own script (heroes.html): a hero starts when it comes into view, Replay runs it
   again, the glass clears under the pointer, B's lines are drawn from where the full stop landed, D leans a little. */
(function () {
  var d = document;
  var $ = function (s, c) { return [].slice.call((c || d).querySelectorAll(s)); };
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  /* B: the crossing sits on the full stop, measured once the words have landed */
  function cross(sec) {
    var b = sec.querySelector('.body'), s = b && b.querySelector('h1 .stop');
    if (!s) return;
    /* the word may still be on its way up: take its current offset out, so this is where the stop will rest */
    var r = s.getBoundingClientRect(), o = b.getBoundingClientRect(), ty = 0;
    try { ty = new DOMMatrix(getComputedStyle(s.parentNode).transform).m42; } catch (e) { /* no transform: already there */ }
    b.style.setProperty('--sx', (r.left + r.width / 2 - o.left).toFixed(1) + 'px');
    b.style.setProperty('--sy', (r.top + r.height / 2 - ty - o.top).toFixed(1) + 'px');
  }
  function start(sec) {
    sec.classList.add('on');
    var g = sec.querySelector('.glass');
    if (g) setTimeout(function () { g.classList.add('live'); }, 2400);      /* after the ribs have formed, they answer fast */
    if (sec.classList.contains('hx-b')) { cross(sec); setTimeout(function () { cross(sec); }, 1250); }
    if (sec._follow) sec._follow();                                        /* C1: the grid lights up along the dot's way */
  }

  var secs = $('.hx'), picks = $('.hx-pick a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !e.target.classList.contains('on')) start(e.target);
        if (e.isIntersecting) picks.forEach(function (a) { if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      });
    }, { threshold: 0.45 });
    secs.forEach(function (s) { io.observe(s); });
  } else secs.forEach(start);
  /* B's crossing follows the headline: when the webfont arrives or the window changes, the stop has moved */
  var bsec = d.querySelector('.hx-b');
  if (bsec) {
    var again = function () { cross(bsec); };
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(again);
    if ('ResizeObserver' in window) new ResizeObserver(again).observe(bsec.querySelector('h1'));
    addEventListener('resize', again);
  }

  $('[data-replay]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var sec = btn.closest('.hx'), els = $('[data-in]', sec), g = sec.querySelector('.glass');
      sec.classList.remove('on'); els.forEach(function (e) { e.classList.remove('in'); }); if (g) g.classList.remove('live');
      void sec.offsetWidth;
      setTimeout(function () { els.forEach(function (e) { e.classList.add('in'); }); start(sec); }, 350);
    });
  });

  /* A: the ribs near the pointer straighten, so the portrait shows clear there */
  $('[data-glass]').forEach(function (g) {
    var scenes = $('.scene', g), n = scenes.length;
    g.addEventListener('pointermove', function (e) {
      var r = g.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * n;
      scenes.forEach(function (s, i) { var t = clamp(1 - Math.abs(x - (i + 0.5)) / 3.6); t = t * t * (3 - 2 * t); s.style.setProperty('--k', (0.4 + 0.6 * t).toFixed(3)); });
    });
    g.addEventListener('pointerleave', function () { scenes.forEach(function (s) { s.style.removeProperty('--k'); }); });
  });

  /* D: the line and the portrait move a few pixels against each other */
  $('[data-tilt]').forEach(function (p) {
    p.addEventListener('pointermove', function (e) { var r = p.getBoundingClientRect(); p.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3)); });
    p.addEventListener('pointerleave', function () { p.style.setProperty('--px', 0); });
  });
  /* C1: a square of the grid glows and fades. Under the pointer it is the square you are on; along the timeline it is
     the pair the dot is passing between, one above the line and one below, so the dot draws a short trail of light.
     The grid is 2400px tall with the timeline at 1200px, and starts one page margin in (css/heroes-c.css) */
  $('.cx-1').forEach(function (sec) {
    var grid = sec.querySelector('.grid'), dot = sec.querySelector('.ruler .dot'), last = '', run = 0, still = false;
    if (!grid) return;
    try { still = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* keep moving */ }
    function size() { return { c: parseFloat(getComputedStyle(grid).backgroundSize), m: parseFloat(getComputedStyle(sec).paddingLeft), r: grid.getBoundingClientRect() }; }
    function light(i, j, s) {
      var el = d.createElement('i');
      el.className = 'lit'; el.style.left = (s.m + i * s.c) + 'px'; el.style.top = (1200 + j * s.c) + 'px';
      grid.appendChild(el);
      var gone = function () { if (el.parentNode) el.parentNode.removeChild(el); };
      el.addEventListener('animationend', gone); setTimeout(gone, 1700);
    }
    sec.addEventListener('pointermove', function (e) {
      var s = size();
      if (!s.c) return;
      var i = Math.floor((e.clientX - s.r.left - s.m) / s.c), j = Math.floor((e.clientY - s.r.top - 1200) / s.c), key = i + ',' + j;
      if (key === last) return;
      last = key; light(i, j, s);
    });
    sec.addEventListener('pointerleave', function () { last = ''; });
    /* the dot's trail runs with the timeline (start calls this, and Replay with it), for as long as the dot travels */
    sec._follow = function () {
      if (!dot || still) return;
      var me = ++run, t0 = performance.now(), col = null;
      (function step(t) {
        if (me !== run || t - t0 > 6200) return;
        var s = size(), b = dot.getBoundingClientRect(), i = Math.floor((b.left + b.width / 2 - s.r.left - s.m) / s.c + 0.001);
        if (s.c && i !== col) { col = i; light(i, -1, s); light(i, 0, s); }
        requestAnimationFrame(step);
      })(t0);
    };
  });
})();

/* ============================================================
   אסתר מיכל כציר - מכשירים חזותיים
   כל רכיב כאן הוא חלק מהתוכן, לא קישוט רקע.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var paused = false;
  var listeners = [];

  function onMotionChange(fn) { listeners.push(fn); }
  function motionOff() { return paused || reduce.matches; }

  /* הכיוון קובע היכן מתחילה הקריאה, ולכן גם מאיזה צד מתחילים הוויזואלים */
  var RTL = document.documentElement.dir !== 'ltr';
  var EN = document.documentElement.lang === 'en';
  /* u=0 בתחילת הקריאה, u=1 בסופה - ממופה לציר X לפי הכיוון */
  function readX(u, W) { return RTL ? W * (1 - u) : W * u; }
  function readU(x, W) { return RTL ? 1 - x / W : x / W; }

  /* ---------- עזרים ---------- */
  function fit(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width));
    var h = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function d2(a, b) { var x = a.x - b.x, y = a.y - b.y; return x * x + y * y; }

  /* חיבור שכנים קרובים דרך רשת מרחבית - O(n) בקירוב */
  function buildEdges(pts, radius, maxDeg) {
    var grid = {}, i, j, k;
    function key(cx, cy) { return cx + '|' + cy; }
    for (i = 0; i < pts.length; i++) {
      k = key(Math.floor(pts[i].x / radius), Math.floor(pts[i].y / radius));
      (grid[k] || (grid[k] = [])).push(i);
    }
    var edges = [], deg = new Uint8Array(pts.length);
    for (i = 0; i < pts.length; i++) {
      if (deg[i] >= maxDeg) continue;
      var cx = Math.floor(pts[i].x / radius), cy = Math.floor(pts[i].y / radius);
      var cand = [];
      for (var a = -1; a <= 1; a++) {
        for (var b = -1; b <= 1; b++) {
          var arr = grid[key(cx + a, cy + b)];
          if (!arr) continue;
          for (var m = 0; m < arr.length; m++) if (arr[m] > i) cand.push(arr[m]);
        }
      }
      cand.sort(function (p, q) { return d2(pts[i], pts[p]) - d2(pts[i], pts[q]); });
      for (j = 0; j < cand.length; j++) {
        if (deg[i] >= maxDeg) break;
        var o = cand[j];
        if (deg[o] >= maxDeg) continue;
        var dd = Math.sqrt(d2(pts[i], pts[o]));
        if (dd > radius) break;
        edges.push([i, o, dd]);
        deg[i]++; deg[o]++;
      }
    }
    return edges;
  }

  /* מנוע פריימים משותף - עוצר כשהלשונית מוסתרת */
  var ticks = [];
  function addTick(fn) { ticks.push(fn); }
  var last = 0;
  function loop(now) {
    var dt = last ? Math.min(now - last, 50) : 16;
    last = now;
    for (var i = 0; i < ticks.length; i++) ticks[i](dt, now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', function () {
    paused = document.hidden || paused;
  });

  /* בורר: רכיב פועל רק כשהוא נראה על המסך */
  function whenVisible(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { cb(e.isIntersecting); });
    }, { rootMargin: '120px' }).observe(el);
  }

  /* ============================================================
     1. פס נוירונים בשוליים
     חי אך ורק בשוליים החיצוניים של מקטעים נבחרים - לעולם לא מאחורי
     טקסט. עוצמת הצבע דועכת פנימה ובקצוות, כך שהפס נמס אל תוך העמוד.
     ============================================================ */
  function NeuronField(canvas) {
    var fade = canvas.getAttribute('data-fade') || 'both';
    var g = fit(canvas), ctx = g.ctx, W = g.w, H = g.h;
    var nodes = [], edges = [], pulses = [], live = false, spawnAcc = 0, relink = 0;

    /* צמתים נעים אל מעבר לגבול לפני שהם עוטפים, ולכן u ו-v עלולים לחרוג
       מ-[0,1]. בלי הידוק, בסיס שלילי ב-Math.pow מחזיר NaN והצבע נפסל. */
    function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

    /* דעיכה אופקית: לאיזה כיוון הפס נמס */
    function hFade(u) {
      u = clamp01(u);
      if (fade === 'left')  return Math.pow(Math.min(1, u * 1.15), 1.15);
      if (fade === 'right') return Math.pow(Math.min(1, (1 - u) * 1.15), 1.15);
      return Math.sin(Math.PI * u);
    }
    /* דעיכה אנכית: הפס לא נחתך בקצוות המקטע */
    function vFade(v) { return Math.min(1, Math.sin(Math.PI * clamp01(v)) * 2.1); }

    function alphaAt(x, y) { return hFade(x / W) * vFade(y / H); }

    function build() {
      var target = Math.max(38, Math.min(150, Math.round((W * H) / 2200)));
      nodes = [];
      for (var i = 0; i < target; i++) {
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.09,
          vy: (Math.random() - 0.5) * 0.09,
          r: 0.6 + Math.random() * 1.0
        });
      }
      link();
    }

    /* טווח החיבור נגזר מהצפיפות בפועל - מארג עדין במקום משולשים גדולים */
    function link() {
      var spacing = Math.sqrt((W * H) / Math.max(1, nodes.length));
      edges = buildEdges(nodes, spacing * 1.5, 3);
    }

    function spawn() {
      if (!edges.length || pulses.length > 4) return;
      for (var t = 0; t < 6; t++) {
        var e = edges[(Math.random() * edges.length) | 0];
        var mx = (nodes[e[0]].x + nodes[e[1]].x) / 2;
        var my = (nodes[e[0]].y + nodes[e[1]].y) / 2;
        if (Math.random() < alphaAt(mx, my)) {
          pulses.push({ a: e[0], b: e[1], t: 0, dur: 1400 + Math.random() * 1400 });
          return;
        }
      }
    }

    function draw(dt) {
      ctx.clearRect(0, 0, W, H);
      var still = motionOff(), i, n;

      if (!still) {
        for (i = 0; i < nodes.length; i++) {
          n = nodes[i];
          n.x += n.vx * (dt / 16); n.y += n.vy * (dt / 16);
          if (n.x < -12) n.x = W + 12; else if (n.x > W + 12) n.x = -12;
          if (n.y < -12) n.y = H + 12; else if (n.y > H + 12) n.y = -12;
        }
        relink += dt;
        if (relink > 420) { link(); relink = 0; }
      }

      ctx.lineWidth = 1;
      for (i = 0; i < edges.length; i++) {
        var e = edges[i], A = nodes[e[0]], B = nodes[e[1]];
        var al = alphaAt((A.x + B.x) / 2, (A.y + B.y) / 2) * 0.30;
        if (al < 0.008) continue;
        ctx.strokeStyle = 'rgba(146,163,196,' + al.toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      }

      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        var na = alphaAt(n.x, n.y) * 0.52;
        if (na < 0.01) continue;
        ctx.fillStyle = 'rgba(180,194,220,' + na.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.2832); ctx.fill();
      }

      if (still) return;

      spawnAcc += dt;
      while (spawnAcc > 1500) { spawn(); spawnAcc -= 1500; }
      for (i = pulses.length - 1; i >= 0; i--) {
        var pu = pulses[i];
        pu.t += dt;
        var pr = pu.t / pu.dur;
        if (pr >= 1) { pulses.splice(i, 1); continue; }
        var na2 = nodes[pu.a], nb = nodes[pu.b];
        if (!na2 || !nb) { pulses.splice(i, 1); continue; }
        var ease = pr < 0.5 ? 2 * pr * pr : 1 - Math.pow(-2 * pr + 2, 2) / 2;
        var px = na2.x + (nb.x - na2.x) * ease;
        var py = na2.y + (nb.y - na2.y) * ease;
        var pa = Math.sin(pr * Math.PI) * 0.7 * alphaAt(px, py);
        if (pa < 0.012) continue;
        var gr = ctx.createRadialGradient(px, py, 0, px, py, 11);
        gr.addColorStop(0, 'rgba(236,212,150,' + pa.toFixed(3) + ')');
        gr.addColorStop(0.42, 'rgba(200,164,77,' + (pa * 0.26).toFixed(3) + ')');
        gr.addColorStop(1, 'rgba(200,164,77,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(px, py, 11, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(246,230,186,' + Math.min(1, pa * 1.2).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(px, py, 1.3, 0, 6.2832); ctx.fill();
      }
    }

    build();
    addTick(function (dt) { if (live) draw(dt); });
    whenVisible(canvas, function (v) { live = v; });
    draw(16);

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var gg = fit(canvas); ctx = gg.ctx; W = gg.w; H = gg.h;
        build(); draw(16);
      }, 240);
    });
    onMotionChange(function () { draw(16); });
  }


  /* ============================================================
     2. נ׳ - קוצב נשימה
     ============================================================ */
  function Breath(root) {
    var canvas = root.querySelector('canvas');
    var label = root.querySelector('[data-role="label"]');
    var btn = root.querySelector('[data-role="toggle"]');
    var g = fit(canvas), ctx = g.ctx, W = g.w, H = g.h;

    var NAMES = EN ? ['Inhale', 'Hold', 'Exhale', 'Rest']
                   : ['שאיפה', 'החזקה', 'נשיפה', 'מנוחה'];
    var PHASES = [
      { name: NAMES[0], ms: 4000, from: 0.34, to: 1 },
      { name: NAMES[1], ms: 1600, from: 1, to: 1 },
      { name: NAMES[2], ms: 6000, from: 1, to: 0.34 },
      { name: NAMES[3], ms: 1400, from: 0.34, to: 0.34 }
    ];
    var idx = 0, t = 0, on = false;

    function easeIO(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

    function draw(scale, prog) {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2;
      var rMax = Math.min(W, H) * 0.40;
      var r = rMax * scale;

      /* טבעת מנחה */
      ctx.strokeStyle = 'rgba(151,160,180,.20)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, rMax, 0, 6.2832); ctx.stroke();

      /* הילה */
      var gr = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.55);
      gr.addColorStop(0, 'rgba(200,164,77,.20)');
      gr.addColorStop(1, 'rgba(200,164,77,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.55, 0, 6.2832); ctx.fill();

      /* עיגול הנשימה */
      ctx.strokeStyle = 'rgba(232,206,138,.92)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = 'rgba(200,164,77,.09)';
      ctx.fill();

      /* קשת התקדמות על הטבעת החיצונית */
      if (on) {
        ctx.strokeStyle = 'rgba(232,206,138,.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, rMax, -Math.PI / 2, -Math.PI / 2 + prog * 6.2832);
        ctx.stroke();
      }
    }

    function tick(dt) {
      if (!on || motionOff()) return;
      t += dt;
      var ph = PHASES[idx];
      if (t >= ph.ms) { t -= ph.ms; idx = (idx + 1) % PHASES.length; ph = PHASES[idx]; label.textContent = ph.name; }
      var p = t / ph.ms;
      draw(ph.from + (ph.to - ph.from) * easeIO(p), p);
    }

    btn.addEventListener('click', function () {
      on = !on;
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? btn.dataset.on : btn.dataset.off;
      if (on) { idx = 0; t = 0; label.textContent = PHASES[0].name; }
      else { label.textContent = EN ? 'Ready' : 'מוכן'; draw(0.34, 0); }
    });

    addTick(tick);
    draw(0.34, 0);
    window.addEventListener('resize', function () {
      var gg = fit(canvas); ctx = gg.ctx; W = gg.w; H = gg.h; draw(0.34, 0);
    });
  }

  /* ============================================================
     3. ט׳ - גל טפיחה
     ============================================================ */
  function Tap(root) {
    var canvas = root.querySelector('canvas');
    var hint = root.querySelector('[data-role="hint"]');
    var g = fit(canvas), ctx = g.ctx, W = g.w, H = g.h;
    var nodes = [], waves = [], live = false;

    var lattice = [];
    function seed() {
      nodes = []; lattice = [];
      var step = Math.max(16, Math.min(W, H) / 10);
      for (var y = step * 0.6; y < H; y += step) {
        for (var x = step * 0.6; x < W; x += step) {
          nodes.push({
            x: x + (Math.random() - 0.5) * step * 0.45,
            y: y + (Math.random() - 0.5) * step * 0.45,
            e: 0, ph: Math.random() * 6.2832
          });
        }
      }
      lattice = buildEdges(nodes, step * 1.25, 3);
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      var i, n;

      /* קווי השדה במנוחה - נותנים לרשת נוכחות גם לפני נגיעה */
      ctx.lineWidth = 1;
      for (i = 0; i < lattice.length; i++) {
        var e = lattice[i], A = nodes[e[0]], B = nodes[e[1]];
        var hot = Math.max(A.e, B.e);
        var al = 0.10 + hot * 0.55;
        ctx.strokeStyle = hot > 0.12
          ? 'rgba(216,190,130,' + al.toFixed(3) + ')'
          : 'rgba(151,160,180,' + al.toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      }

      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        var shimmer = motionOff() ? 0 : (Math.sin(now / 1500 + n.ph) * 0.5 + 0.5) * 0.14;
        var a = 0.30 + shimmer + n.e * 0.68;
        var r = 1.4 + n.e * 2.6;
        if (n.e > 0.06) {
          var gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4.5);
          gr.addColorStop(0, 'rgba(232,206,138,' + (n.e * 0.55).toFixed(3) + ')');
          gr.addColorStop(1, 'rgba(200,164,77,0)');
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(n.x, n.y, r * 4.5, 0, 6.2832); ctx.fill();
        }
        ctx.fillStyle = n.e > 0.10
          ? 'rgba(240,222,170,' + Math.min(1, a).toFixed(3) + ')'
          : 'rgba(163,174,196,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 6.2832); ctx.fill();
      }
    }

    function tick(dt, now) {
      if (!live) return;
      for (var w = waves.length - 1; w >= 0; w--) {
        var wv = waves[w];
        wv.r += dt * 0.42;
        if (wv.r > wv.max) { waves.splice(w, 1); continue; }
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          var d = Math.sqrt((n.x - wv.x) * (n.x - wv.x) + (n.y - wv.y) * (n.y - wv.y));
          if (Math.abs(d - wv.r) < 28) {
            var hit = (1 - Math.abs(d - wv.r) / 28) * (1 - wv.r / wv.max);
            if (hit > n.e) n.e = hit;
          }
        }
      }
      for (var j = 0; j < nodes.length; j++) {
        if (nodes[j].e > 0.001) nodes[j].e *= Math.pow(0.9955, dt);
        else nodes[j].e = 0;
      }
      draw(now);
    }

    function fire(x, y) {
      if (motionOff()) {
        for (var i = 0; i < nodes.length; i++) {
          var d = Math.sqrt((nodes[i].x - x) * (nodes[i].x - x) + (nodes[i].y - y) * (nodes[i].y - y));
          nodes[i].e = Math.max(0, 1 - d / (Math.max(W, H) * 0.7));
        }
        draw(0);
        return;
      }
      waves.push({ x: x, y: y, r: 0, max: Math.max(W, H) * 1.15 });
      if (hint) hint.hidden = true;
    }

    canvas.addEventListener('pointerdown', function (e) {
      var r = canvas.getBoundingClientRect();
      fire(e.clientX - r.left, e.clientY - r.top);
    });
    canvas.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(W / 2, H / 2); }
    });

    seed(); draw(0); addTick(tick);
    whenVisible(root, function (v) { live = v; });
    window.addEventListener('resize', function () {
      var gg = fit(canvas); ctx = gg.ctx; W = gg.w; H = gg.h; seed(); draw(0);
    });
  }

  /* ============================================================
     4. כּ׳ - כיול: מפוזר → מכויל
     ============================================================ */
  function Calibrate(root) {
    var canvas = root.querySelector('canvas');
    var input = root.querySelector('input[type="range"]');
    var read = root.querySelector('[data-role="read"]');
    var g = fit(canvas), ctx = g.ctx, W = g.w, H = g.h;
    var P = [], k = 0, target = 0;

    var rings = [];
    function seed() {
      P = []; rings = [];
      var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.36;
      var spec = [[26, 0.44], [34, 0.72], [42, 1.0]];
      for (var r = 0; r < spec.length; r++) {
        var count = spec[r][0], rr = R * spec[r][1], ring = [];
        for (var i = 0; i < count; i++) {
          var ang = (i / count) * 6.2832 - Math.PI / 2;
          ring.push(P.length);
          P.push({
            sx: Math.random() * W, sy: Math.random() * H,
            tx: cx + Math.cos(ang) * rr, ty: cy + Math.sin(ang) * rr,
            ph: Math.random() * 6.2832,
            x: 0, y: 0
          });
        }
        rings.push(ring);
      }
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      var i, p;
      var jitter = (1 - k) * 7;
      for (i = 0; i < P.length; i++) {
        p = P[i];
        var e = k * k * (3 - 2 * k);
        var wob = motionOff() ? 0 : Math.sin(now / 700 + p.ph) * jitter;
        p.x = p.sx + (p.tx - p.sx) * e + wob;
        p.y = p.sy + (p.ty - p.sy) * e + wob * 0.6;
      }
      /* בכיול גבוה נסגרות הטבעות: חיבור בין שכנים על אותה טבעת בלבד */
      if (k > 0.42) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(200,164,77,' + ((k - 0.42) / 0.58 * 0.40).toFixed(3) + ')';
        ctx.beginPath();
        for (var r = 0; r < rings.length; r++) {
          var ring = rings[r];
          for (i = 0; i < ring.length; i++) {
            var a = P[ring[i]], b = P[ring[(i + 1) % ring.length]];
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          }
        }
        ctx.stroke();
      }
      for (i = 0; i < P.length; i++) {
        p = P[i];
        var a = 0.26 + k * 0.62;
        ctx.fillStyle = k > 0.55
          ? 'rgba(232,206,138,' + a.toFixed(3) + ')'
          : 'rgba(151,160,180,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.3 + k * 1.1, 0, 6.2832); ctx.fill();
      }
    }

    function tick(dt, now) {
      k += (target - k) * Math.min(1, dt / 220);
      draw(now);
    }

    input.addEventListener('input', function () {
      target = input.value / 100;
      var names = (input.getAttribute('data-labels') || 'מפוזר|מתארגן|מכויל').split('|');
      read.textContent = target < 0.34 ? names[0] : target < 0.72 ? names[1] : names[2];
    });

    seed(); addTick(tick);
    window.addEventListener('resize', function () {
      var gg = fit(canvas); ctx = gg.ctx; W = gg.w; H = gg.h; seed();
    });
  }

  /* ============================================================
     5. ציר עצירה → ויסות → בחירה
     גל שמשנה אופי לפי מיקום הגלילה: משונן, מתייצב, נקי.
     ============================================================ */
  function Axis(root) {
    var canvas = root.querySelector('canvas');
    var steps = root.querySelectorAll('[data-step]');
    var g = fit(canvas), ctx = g.ctx, W = g.w, H = g.h;
    var prog = 0, live = false;

    function noise(x, seed) {
      return Math.sin(x * 0.9 + seed) * Math.sin(x * 2.3 + seed * 1.7) * Math.sin(x * 5.1 + seed * .5);
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      var mid = H / 2;
      var t = motionOff() ? 0 : now / 1000;

      /* קו בסיס */
      ctx.strokeStyle = 'rgba(151,160,180,.14)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();

      /* הגל משונן היכן שהקריאה מתחילה, ונקי היכן שהיא נגמרת */
      ctx.beginPath();
      for (var px = 0; px <= W; px += 2) {
        var u = 1 - readU(px, W);           /* 1 בתחילת הקריאה → 0 בסופה */
        var chaos = Math.max(0, Math.min(1, (u - 0.12) / 0.62));
        var amp = H * 0.30;
        var y = mid
          + noise(px * 0.10 + t * 1.4, 1) * amp * chaos
          + Math.sin(px * 0.045 - t * 1.1) * amp * (1 - chaos) * 0.62;
        if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      var grad = RTL ? ctx.createLinearGradient(W, 0, 0, 0)
                     : ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, 'rgba(151,160,180,.55)');
      grad.addColorStop(0.5, 'rgba(180,178,160,.75)');
      grad.addColorStop(1, 'rgba(232,206,138,.95)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      /* ראש נוסע לפי הגלילה, מתחילת הקריאה לסופה */
      var hx = readX(prog, W);
      var hchaos = Math.max(0, Math.min(1, ((1 - readU(hx, W)) - 0.12) / 0.62));
      var hy = mid
        + noise(hx * 0.10 + t * 1.4, 1) * H * 0.30 * hchaos
        + Math.sin(hx * 0.045 - t * 1.1) * H * 0.30 * (1 - hchaos) * 0.62;
      var gr = ctx.createRadialGradient(hx, hy, 0, hx, hy, 16);
      gr.addColorStop(0, 'rgba(240,222,170,.9)');
      gr.addColorStop(1, 'rgba(200,164,77,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(hx, hy, 16, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,244,214,.95)';
      ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, 6.2832); ctx.fill();
    }

    function onScroll() {
      var r = root.getBoundingClientRect();
      var vh = window.innerHeight;
      prog = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (r.height + vh * 0.5)));
      var active = prog < 0.34 ? 0 : prog < 0.68 ? 1 : 2;
      for (var i = 0; i < steps.length; i++) steps[i].classList.toggle('on', i <= active);
    }

    addTick(function (dt, now) { if (live) draw(now); });
    whenVisible(root, function (v) { live = v; });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
      var gg = fit(canvas); ctx = gg.ctx; W = gg.w; H = gg.h; onScroll();
    });
    onScroll();
  }


  /* ============================================================
     6. שני המסלולים - הטיעון של ההרצאה
     אותו גירוי, שתי דרכי תגובה: האוטומטית יוצאת מיד וישר;
     הנבחרת עוצרת בנקודת ביניים ורק אז ממשיכה.
     ============================================================ */
  function Routes(root) {
    var canvas = root.querySelector('canvas');
    var g = fit(canvas), ctx = g.ctx, W = g.w, H = g.h;
    var t = 0, live = false;
    var CYCLE = 7200;

    function pts() {
      /* הגירוי בתחילת הקריאה, התוצאה בסופה */
      var x0 = readX(0.10, W), x1 = readX(0.90, W);
      return {
        start: { x: x0, y: H * 0.5 },
        end:   { x: x1, y: H * 0.5 },
        auto:  { y: H * 0.26 },
        pause: { x: readX(0.48, W), y: H * 0.78 }
      };
    }

    /* מסלול אוטומטי: קשת רדודה, מהירה */
    function autoAt(u, P) {
      var x = P.start.x + (P.end.x - P.start.x) * u;
      var y = P.start.y + (P.auto.y - P.start.y) * Math.sin(Math.PI * u);
      return { x: x, y: y };
    }
    /* מסלול נבחר: יורד אל נקודת העצירה ומשם ממשיך */
    function chosenAt(u, P) {
      var x = P.start.x + (P.end.x - P.start.x) * u;
      var y = P.start.y + (P.pause.y - P.start.y) * Math.sin(Math.PI * u);
      return { x: x, y: y };
    }

    function trace(fn, P) {
      ctx.beginPath();
      for (var i = 0; i <= 60; i++) {
        var q = fn(i / 60, P);
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
    }

    function dot(x, y, r, col) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }

    function glow(x, y, a) {
      var gr = ctx.createRadialGradient(x, y, 0, x, y, 15);
      gr.addColorStop(0, 'rgba(240,222,170,' + a.toFixed(3) + ')');
      gr.addColorStop(0.4, 'rgba(200,164,77,' + (a * 0.3).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(200,164,77,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 15, 0, 6.2832); ctx.fill();
    }

    function draw() {
      var P = pts();
      ctx.clearRect(0, 0, W, H);

      /* המסלולים עצמם */
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(151,160,180,.30)';
      ctx.setLineDash([3, 4]); trace(autoAt, P); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(200,164,77,.34)';
      trace(chosenAt, P); ctx.stroke();

      /* עוגנים */
      dot(P.start.x, P.start.y, 3.4, 'rgba(241,237,228,.9)');
      dot(P.end.x, P.end.y, 3.4, 'rgba(241,237,228,.55)');
      ctx.strokeStyle = 'rgba(200,164,77,.5)';
      ctx.beginPath(); ctx.arc(P.pause.x, P.pause.y, 8, 0, 6.2832); ctx.stroke();
      dot(P.pause.x, P.pause.y, 2.2, 'rgba(232,206,138,.9)');

      if (motionOff()) {
        var a = autoAt(0.62, P), c = chosenAt(0.34, P);
        dot(a.x, a.y, 3, 'rgba(196,206,226,.95)');
        dot(c.x, c.y, 3, 'rgba(240,222,170,.95)');
        return;
      }

      var ph = (t % CYCLE) / CYCLE;

      /* האוטומטית: יוצאת ראשונה ומגיעה מהר */
      if (ph > 0.05 && ph < 0.42) {
        var ua = Math.min(1, (ph - 0.05) / 0.26);
        var pa = autoAt(ua, P);
        var fade = ua < 1 ? 1 : Math.max(0, 1 - (ph - 0.31) / 0.11);
        ctx.strokeStyle = 'rgba(178,190,214,' + (0.75 * fade).toFixed(3) + ')';
        ctx.lineWidth = 1.6; ctx.setLineDash([]);
        ctx.beginPath();
        for (var i = 0; i <= 40; i++) {
          var q = autoAt((i / 40) * ua, P);
          if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
        }
        ctx.stroke();
        dot(pa.x, pa.y, 3.2, 'rgba(214,224,242,' + fade.toFixed(3) + ')');
      }

      /* הנבחרת: יוצאת מאוחר יותר, עוצרת באמצע וממשיכה */
      if (ph > 0.30) {
        var raw = (ph - 0.30) / 0.62;
        var uc;
        if (raw < 0.42)      uc = (raw / 0.42) * 0.5;               /* עד העצירה */
        else if (raw < 0.60) uc = 0.5;                               /* עוצרת */
        else                 uc = 0.5 + ((raw - 0.60) / 0.40) * 0.5; /* ממשיכה */
        uc = Math.min(1, uc);
        var pc = chosenAt(uc, P);
        ctx.strokeStyle = 'rgba(232,206,138,.85)';
        ctx.lineWidth = 1.8; ctx.setLineDash([]);
        ctx.beginPath();
        for (var j = 0; j <= 40; j++) {
          var r = chosenAt((j / 40) * uc, P);
          if (j === 0) ctx.moveTo(r.x, r.y); else ctx.lineTo(r.x, r.y);
        }
        ctx.stroke();
        if (raw >= 0.42 && raw < 0.60) glow(pc.x, pc.y, 0.55);
        dot(pc.x, pc.y, 3.4, 'rgba(246,230,186,.98)');
      }
    }

    addTick(function (dt) { if (!live) return; if (!motionOff()) t += dt; draw(); });
    whenVisible(root, function (v) { live = v; });
    draw();
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { var gg = fit(canvas); ctx = gg.ctx; W = gg.w; H = gg.h; draw(); }, 240);
    });
    onMotionChange(draw);
  }

  /* ---------- אתחול ---------- */
  function boot() {
    document.querySelectorAll('canvas[data-viz="rail"]').forEach(function (n) { new NeuronField(n); });
    document.querySelectorAll('[data-viz="breath"]').forEach(function (n) { new Breath(n); });
    document.querySelectorAll('[data-viz="tap"]').forEach(function (n) { new Tap(n); });
    document.querySelectorAll('[data-viz="calibrate"]').forEach(function (n) { new Calibrate(n); });
    document.querySelectorAll('[data-viz="axis"]').forEach(function (n) { new Axis(n); });
    document.querySelectorAll('[data-viz="routes"]').forEach(function (n) { new Routes(n); });

    var btn = document.getElementById('motionBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        paused = !paused;
        btn.setAttribute('aria-pressed', String(paused));
        btn.textContent = paused ? btn.dataset.on : btn.dataset.off;
        listeners.forEach(function (f) { f(); });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

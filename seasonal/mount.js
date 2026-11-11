/* Lights and snow for the Christmas skin. Nothing here is clickable.
   Snow is omitted entirely when the reader prefers reduced motion. */
(function () {
  if (!document.documentElement.classList.contains("season-christmas")) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function bulbRow(parent, count, className) {
    var row = document.createElement("div");
    row.className = className;
    row.setAttribute("aria-hidden", "true");
    var colors = ["#F3E6C8", "#C4473A", "#6E9A72", "#E0C17A"];
    for (var i = 0; i < count; i++) {
      var bulb = document.createElement("i");
      bulb.style.setProperty("--c", colors[i % colors.length]);
      bulb.style.setProperty("--d", (i % 7) * 0.45 + "s");
      row.appendChild(bulb);
    }
    parent.appendChild(row);
  }

  var nav = document.querySelector(".nav");
  if (nav) {
    var width = nav.clientWidth || window.innerWidth;
    var count = Math.max(8, Math.min(16, Math.round(width / 88)));
    bulbRow(nav, count, "season-lights");
  } else {
    bulbRow(document.body, 8, "season-lights season-lights--fixed");
  }

  var mnav = document.querySelector(".mnav");
  if (mnav) {
    var top = document.createElement("div");
    top.className = "season-drawer-top";
    top.setAttribute("aria-hidden", "true");
    var lights = document.createElement("div");
    lights.className = "season-drawer-lights";
    for (var i = 0; i < 8; i++) {
      var dot = document.createElement("i");
      dot.style.setProperty("--d", (i % 5) * 0.4 + "s");
      lights.appendChild(dot);
    }
    var mark = document.createElement("p");
    mark.className = "season-drawer-mark";
    mark.textContent = "CALLUM.B";
    top.appendChild(lights);
    top.appendChild(mark);
    mnav.insertBefore(top, mnav.firstChild);
  }

  if (reduce) return;
  var hero = document.getElementById("promise");
  if (!hero) return;

  function bootSnow() {
    if (!document.body.contains(hero)) return;
    var mobile = window.matchMedia("(max-width: 799px)").matches;
    var mem = navigator.deviceMemory || 8;
    var light = mobile || mem <= 2;
    var counts = light ? { bg: 36, mid: 14, fg: 4 } : { bg: 84, mid: 30, fg: 8 };
    var bands = {
      bg: { r: [8, 16], a: [0.12, 0.28], v: [12, 28], sway: [8, 18], spin: [0.04, 0.16] },
      mid: { r: [16, 28], a: [0.16, 0.36], v: [20, 42], sway: [12, 28], spin: [0.1, 0.32] },
      fg: { r: [36, 64], a: [0.1, 0.2], v: [14, 30], sway: [18, 40], spin: [0.06, 0.2] }
    };
    var canvas = document.createElement("canvas");
    canvas.className = "season-snow";
    canvas.setAttribute("aria-hidden", "true");
    hero.appendChild(canvas);
    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    var flakes = [];
    var running = false;
    var onScreen = true;
    var raf = 0;
    var prev = 0;
    var width = 0;
    var height = 0;

    function rand(a, b) { return a + Math.random() * (b - a); }
    function spawn(layer, y) {
      var band = bands[layer];
      return {
        layer: layer,
        x: Math.random() * width,
        y: y,
        r: rand(band.r[0], band.r[1]),
        a: rand(band.a[0], band.a[1]),
        v: rand(band.v[0], band.v[1]),
        swayAmp: rand(band.sway[0], band.sway[1]),
        sway: rand(0.35, 0.9),
        phase: Math.random() * 6.2832,
        rot: Math.random() * 6.2832,
        spin: (Math.random() < 0.5 ? -1 : 1) * rand(band.spin[0], band.spin[1]),
        squash: rand(0.7, 0.94)
      };
    }
    function fill() {
      flakes = [];
      var layers = ["bg", "mid", "fg"];
      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        for (var n = 0; n < counts[layer]; n++) flakes.push(spawn(layer, Math.random() * height));
      }
    }
    function layout() {
      var dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
      width = hero.clientWidth || window.innerWidth;
      height = hero.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fill();
    }
    function drawFlake(flake, x, t) {
      ctx.save();
      ctx.translate(x, flake.y);
      ctx.rotate(flake.rot);
      ctx.scale(1, flake.squash);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, flake.r);
      if (flake.layer === "fg") {
        g.addColorStop(0, "rgba(255,252,248," + (flake.a * 0.25) + ")");
        g.addColorStop(0.38, "rgba(255,252,248," + flake.a + ")");
        g.addColorStop(0.72, "rgba(228,222,212," + (flake.a * 0.28) + ")");
        g.addColorStop(1, "rgba(228,222,212,0)");
      } else if (flake.layer === "bg") {
        g.addColorStop(0, "rgba(255,252,248," + flake.a + ")");
        g.addColorStop(0.16, "rgba(236,232,224," + (flake.a * 0.3) + ")");
        g.addColorStop(1, "rgba(236,232,224,0)");
      } else {
        g.addColorStop(0, "rgba(255,252,248," + flake.a + ")");
        g.addColorStop(0.42, "rgba(236,232,224," + (flake.a * 0.4) + ")");
        g.addColorStop(1, "rgba(236,232,224,0)");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, flake.r, 0, 6.2832);
      ctx.fill();
      ctx.restore();
      void t;
    }
    function paint(t) {
      ctx.clearRect(0, 0, width, height);
      for (var n = 0; n < flakes.length; n++) {
        var flake = flakes[n];
        var x = flake.x + Math.sin(t * flake.sway + flake.phase) * flake.swayAmp;
        drawFlake(flake, x, t);
      }
    }
    function step(now) {
      var dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      var t = now / 1000;
      for (var n = 0; n < flakes.length; n++) {
        var flake = flakes[n];
        flake.y += flake.v * dt;
        flake.rot += flake.spin * dt;
        if (flake.y - flake.r > height) {
          var next = spawn(flake.layer, -flake.r - Math.random() * 40);
          flakes[n] = next;
        }
      }
      paint(t);
    }
    function loop(now) {
      raf = 0;
      if (!running) return;
      step(now);
      raf = window.requestAnimationFrame(loop);
    }
    function pause() {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    }
    function resume() {
      if (running || document.hidden || !onScreen) return;
      running = true;
      prev = performance.now();
      raf = window.requestAnimationFrame(loop);
    }
    layout();
    paint(0);
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) resume();
      else pause();
    }, { threshold: 0 }).observe(hero);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause();
      else resume();
    });
    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        layout();
        paint(performance.now() / 1000);
      }, 180);
    });
    resume();
  }

  function startSnow() {
    if ("requestIdleCallback" in window) window.requestIdleCallback(bootSnow, { timeout: 1200 });
    else window.setTimeout(bootSnow, 280);
  }
  if (document.readyState === "complete") startSnow();
  else window.addEventListener("load", startSnow, { once: true });
})();

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

  function bootSnow() {
    var mobile = window.matchMedia("(max-width: 799px)").matches;
    var count = mobile ? 8 : 16;
    var canvas = document.createElement("canvas");
    canvas.className = "season-snow";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    var flakes = [];
    var running = true;
    var raf = 0;
    var last = 0;

    function layout() {
      var dpr = mobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.25);
      var w = window.innerWidth;
      var h = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes = [];
      for (var n = 0; n < count; n++) {
        flakes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 5 + 2.4,
          s: Math.random() * 0.22 + 0.08,
          drift: Math.random() * 0.18 - 0.09,
          a: Math.random() * 0.22 + 0.08
        });
      }
    }

    function paint() {
      var w = window.innerWidth;
      var h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (var n = 0; n < flakes.length; n++) {
        var flake = flakes[n];
        var g = ctx.createRadialGradient(flake.x, flake.y, 0, flake.x, flake.y, flake.r);
        g.addColorStop(0, "rgba(244, 240, 232, " + flake.a + ")");
        g.addColorStop(0.45, "rgba(226, 220, 206, " + (flake.a * 0.35) + ")");
        g.addColorStop(1, "rgba(244, 240, 232, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.r, 0, 6.3);
        ctx.fill();
      }
    }

    function frame(now) {
      if (!running) return;
      raf = window.requestAnimationFrame(frame);
      if (now - last < 48) return;
      last = now;
      var w = window.innerWidth;
      var h = window.innerHeight;
      for (var n = 0; n < flakes.length; n++) {
        var flake = flakes[n];
        flake.y += flake.s;
        flake.x += flake.drift;
        if (flake.y - flake.r > h) {
          flake.y = -flake.r;
          flake.x = Math.random() * w;
        }
        if (flake.x < -8) flake.x = w + 8;
        if (flake.x > w + 8) flake.x = -8;
      }
      paint();
    }

    layout();
    paint();
    raf = window.requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        running = false;
        window.cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = 0;
        raf = window.requestAnimationFrame(frame);
      }
    });
    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        layout();
        paint();
      }, 180);
    });
  }

  if ("requestIdleCallback" in window) window.requestIdleCallback(bootSnow, { timeout: 900 });
  else window.setTimeout(bootSnow, 400);
})();

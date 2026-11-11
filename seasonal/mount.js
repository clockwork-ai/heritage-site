/* Decorative bits for the Christmas skin. Art is original SVG.
   Nothing here is interactive. Snow does not run when motion is reduced. */
(function () {
  if (!document.documentElement.classList.contains("season-christmas")) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function bulbRow(parent, count, className) {
    var row = document.createElement("div");
    row.className = className;
    row.setAttribute("aria-hidden", "true");
    var colors = ["#d24b4b", "#E8C987", "#6faf86", "#F3EAD6", "#d98a6a", "#C9A96E"];
    for (var i = 0; i < count; i++) {
      var bulb = document.createElement("i");
      bulb.style.setProperty("--c", colors[i % colors.length]);
      bulb.style.setProperty("--d", (i % 6) * 0.32 + "s");
      row.appendChild(bulb);
    }
    parent.appendChild(row);
    return row;
  }

  var nav = document.querySelector(".nav");
  if (nav) {
    var width = nav.clientWidth || window.innerWidth;
    var count = Math.max(8, Math.min(22, Math.round(width / 64)));
    bulbRow(nav, count, "season-lights");
  } else {
    bulbRow(document.body, 10, "season-lights season-lights--fixed");
  }

  var hero = document.getElementById("promise");
  if (hero && hero.classList.contains("hero")) {
    var host = hero.querySelector(".hero__media") || hero;
    var tree = document.createElement("img");
    tree.className = "season-tree";
    tree.alt = "";
    tree.setAttribute("aria-hidden", "true");
    tree.src = "/seasonal/tree.svg";
    tree.width = 200;
    tree.height = 260;
    host.appendChild(tree);

    var globe = document.createElement("img");
    globe.className = "season-globe";
    globe.alt = "";
    globe.setAttribute("aria-hidden", "true");
    globe.src = "/seasonal/globe.svg";
    globe.width = 148;
    globe.height = 174;
    host.appendChild(globe);
  }

  var options = document.getElementById("options");
  if (options && !hero) {
    var linkGlobe = document.createElement("img");
    linkGlobe.className = "season-globe season-globe--links";
    linkGlobe.alt = "";
    linkGlobe.setAttribute("aria-hidden", "true");
    linkGlobe.src = "/seasonal/globe.svg";
    linkGlobe.width = 86;
    linkGlobe.height = 102;
    options.appendChild(linkGlobe);
  }

  var mnav = document.querySelector(".mnav");
  if (mnav) {
    var top = document.createElement("div");
    top.className = "season-drawer-top";
    top.setAttribute("aria-hidden", "true");
    var lights = document.createElement("div");
    lights.className = "season-drawer-lights";
    for (var i = 0; i < 9; i++) {
      var dot = document.createElement("i");
      dot.style.setProperty("--d", (i % 5) * 0.28 + "s");
      lights.appendChild(dot);
    }
    var mark = document.createElement("p");
    mark.className = "season-drawer-mark";
    mark.textContent = "CALLUM.B";
    top.appendChild(lights);
    top.appendChild(mark);
    mnav.insertBefore(top, mnav.firstChild);
  }

  function bootSnow() {
    var mobile = window.matchMedia("(max-width: 799px)").matches;
    var count = mobile ? 10 : 22;
    var canvas = document.createElement("canvas");
    canvas.className = "season-snow";
    canvas.setAttribute("aria-hidden", "true");
    if (reduce) canvas.setAttribute("data-static", "1");
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    var flakes = [];
    var running = !reduce;
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
          r: Math.random() * 1.5 + 0.5,
          s: Math.random() * 0.35 + 0.12,
          drift: Math.random() * 0.3 - 0.15,
          a: Math.random() * 0.35 + 0.18
        });
      }
    }

    function paint() {
      var w = window.innerWidth;
      var h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#F7FBFF";
      for (var n = 0; n < flakes.length; n++) {
        var flake = flakes[n];
        ctx.globalAlpha = flake.a;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.r, 0, 6.3);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
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
        if (flake.y > h + 4) {
          flake.y = -4;
          flake.x = Math.random() * w;
        }
        if (flake.x < -4) flake.x = w + 4;
        if (flake.x > w + 4) flake.x = -4;
      }
      paint();
    }

    layout();
    paint();
    if (running) raf = window.requestAnimationFrame(frame);

    document.addEventListener("visibilitychange", function () {
      if (reduce) return;
      if (document.hidden) {
        running = false;
        window.cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
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

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(bootSnow, { timeout: 900 });
  } else {
    window.setTimeout(bootSnow, 400);
  }
})();

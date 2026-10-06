(() => {
  "use strict";

  /* ------------------------------------------------------------------------------------------------
   * The loader bar fills in step with the days leading up to the opening. Nothing about the date is
   * shown on the page; these two dates only decide how far along the bar is.
   * ---------------------------------------------------------------------------------------------- */
  const CONFIG = {
    progressStart: "2026-09-29T00:00:00+05:30",
    progressEnd: "2026-10-30T00:00:00+05:30",
    floor: 8,         // the bar is never emptier than this (%)
    ceiling: 96,      // ...and never completes until the real opening
    fillMs: 2100,     // how long the bar takes to fill when the page appears
    minLoaderMs: 1000 // the loading screen is never shorter than this
  };

  const html = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (selector) => document.querySelector(selector);

  /* ---------- progress bar ---------- */
  const fill = $("#progressFill");
  const value = $("#progressValue");
  const bar = $("#progressBar");

  function progressTarget() {
    const start = new Date(CONFIG.progressStart).getTime();
    const end = new Date(CONFIG.progressEnd).getTime();
    const raw = ((Date.now() - start) / (end - start)) * 100;
    return Math.min(CONFIG.ceiling, Math.max(CONFIG.floor, Math.round(raw)));
  }

  function runProgress() {
    if (!fill || !value) return;
    const target = progressTarget();
    if (bar) bar.setAttribute("aria-valuenow", String(target));
    if (reduceMotion) {
      fill.style.transition = "none";
      fill.style.width = `${target}%`;
      value.textContent = `${target}%`;
      return;
    }
    fill.style.width = `${target}%`;
    const begin = performance.now() + 200;
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - begin) / CONFIG.fillMs));
      const eased = 1 - Math.pow(1 - t, 3);
      value.textContent = `${Math.round(eased * target)}%`;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- floating gold dust (subtle, over the photo) ---------- */
  function startParticles() {
    if (reduceMotion) return;
    const canvas = $("#scene");
    const ctx = canvas && canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let particles = [];
    let running = true;

    const make = () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: (Math.random() * 1.6 + 0.5) * dpr,
      speed: (Math.random() * 0.16 + 0.03) * dpr,
      drift: (Math.random() - 0.5) * 0.1 * dpr,
      alpha: Math.random() * 0.3 + 0.08,
      twinkle: Math.random() * Math.PI * 2,
    });
    const resize = () => {
      width = canvas.width = Math.round(window.innerWidth * dpr);
      height = canvas.height = Math.round(window.innerHeight * dpr);
      const count = window.innerWidth < 640 ? 14 : 28;
      particles = Array.from({ length: count }, make);
    };
    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y -= p.speed;
        p.x += Math.sin(p.twinkle) * p.drift;
        p.twinkle += 0.008;
        if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
        ctx.beginPath();
        ctx.fillStyle = `rgba(192, 138, 62, ${p.alpha * 1.5 * (0.7 + 0.3 * Math.sin(p.twinkle))})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running) requestAnimationFrame(draw);
    });
  }

  /* ---------- loading screen: logo + progress line, then the page rises in ---------- */
  const loader = $("#loader");
  const waitForLoad = new Promise((resolve) => {
    if (document.readyState === "complete") resolve();
    else window.addEventListener("load", resolve, { once: true });
  });
  const waitForFonts = document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();
  const minimum = new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 250 : CONFIG.minLoaderMs));
  const failsafe = new Promise((resolve) => window.setTimeout(resolve, 5000)); // never trap a visitor behind the loader

  function reveal() {
    if (html.classList.contains("is-ready")) return;
    html.classList.add("is-ready");
    runProgress();
    startParticles();
    if (!loader) return;
    loader.classList.add("is-finishing");
    window.setTimeout(() => {
      loader.classList.add("is-done");
      window.setTimeout(() => loader.remove(), 800);
    }, reduceMotion ? 0 : 280);
  }

  Promise.race([Promise.all([waitForLoad, waitForFonts, minimum]), failsafe]).then(reveal);
})();

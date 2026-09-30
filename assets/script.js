(() => {
  "use strict";

  const PROGRESS_TARGET = 62;
  const PROGRESS_DURATION_MS = 2100;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- progress bar ---------- */

  const fill = document.getElementById("progressFill");
  const value = document.getElementById("progressValue");

  if (fill && value) {
    const start = performance.now() + 900;

    const tick = (now) => {
      const elapsed = now - start;
      if (elapsed < 0) {
        requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, elapsed / PROGRESS_DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(eased * PROGRESS_TARGET);
      value.textContent = `${current}%`;
      if (t < 1) requestAnimationFrame(tick);
    };

    window.setTimeout(() => {
      fill.style.width = `${PROGRESS_TARGET}%`;
    }, 900);
    requestAnimationFrame(tick);
  }

  /* ---------- notify form ---------- */

  const form = document.getElementById("notifyForm");
  const message = document.getElementById("notifyMessage");

  if (form && message) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = /** @type {HTMLInputElement} */ (document.getElementById("notifyEmail")).value.trim();
      if (!email) return;

      try {
        const stored = JSON.parse(localStorage.getItem("chikit_notify_list") || "[]");
        if (!stored.includes(email)) stored.push(email);
        localStorage.setItem("chikit_notify_list", JSON.stringify(stored));
      } catch (_) {
        /* localStorage unavailable — still show confirmation */
      }

      message.textContent = "Thank you — we'll let you know the moment Chikit launches.";
      message.classList.add("visible");
      form.reset();
    });
  }

  /* ---------- bokeh dust overlay (sits above the photo) ---------- */

  if (reduceMotion) return;

  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d");
  let width, height, particles;

  const PARTICLE_COUNT = window.innerWidth < 640 ? 16 : 30;

  function resize() {
    width = canvas.width = window.innerWidth * devicePixelRatio;
    height = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }

  function makeParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: (Math.random() * 1.6 + 0.5) * devicePixelRatio,
      speed: (Math.random() * 0.16 + 0.03) * devicePixelRatio,
      drift: (Math.random() - 0.5) * 0.1 * devicePixelRatio,
      alpha: Math.random() * 0.3 + 0.06,
      twinkle: Math.random() * Math.PI * 2,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, makeParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.y -= p.speed;
      p.x += Math.sin(p.twinkle) * p.drift;
      p.twinkle += 0.008;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(243, 217, 153, ${p.alpha * (0.7 + 0.3 * Math.sin(p.twinkle))})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  init();
  draw();
  window.addEventListener("resize", () => {
    resize();
  });
})();

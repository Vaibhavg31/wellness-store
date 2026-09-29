(() => {
  "use strict";

  const PROGRESS_TARGET = 62;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- progress bar ---------- */

  const fill = document.getElementById("progressFill");
  const value = document.getElementById("progressValue");

  if (fill && value) {
    let current = 0;
    const animateValue = () => {
      current += Math.max(1, Math.round((PROGRESS_TARGET - current) * 0.08));
      if (current >= PROGRESS_TARGET) current = PROGRESS_TARGET;
      value.textContent = `${current}%`;
      if (current < PROGRESS_TARGET) requestAnimationFrame(animateValue);
    };

    window.setTimeout(() => {
      fill.style.width = `${PROGRESS_TARGET}%`;
      requestAnimationFrame(animateValue);
    }, 900);
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

  /* ---------- bokeh particles ---------- */

  if (reduceMotion) return;

  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d");
  let width, height, particles;

  const PARTICLE_COUNT = window.innerWidth < 640 ? 22 : 42;

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
      r: (Math.random() * 1.8 + 0.4) * devicePixelRatio,
      speed: (Math.random() * 0.18 + 0.04) * devicePixelRatio,
      drift: (Math.random() - 0.5) * 0.12 * devicePixelRatio,
      alpha: Math.random() * 0.35 + 0.08,
      twinkle: Math.random() * Math.PI * 2,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, makeParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#050f0a";
    ctx.fillRect(0, 0, width, height);

    const grad1 = ctx.createRadialGradient(width * 0.5, height * 0.05, 0, width * 0.5, height * 0.05, width * 0.6);
    grad1.addColorStop(0, "rgba(240, 205, 133, 0.14)");
    grad1.addColorStop(1, "rgba(240, 205, 133, 0)");
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, width, height);

    const grad2 = ctx.createRadialGradient(width * 0.15, height, 0, width * 0.15, height, width * 0.7);
    grad2.addColorStop(0, "rgba(22, 49, 31, 0.9)");
    grad2.addColorStop(1, "rgba(7, 23, 17, 0)");
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, width, height);

    const grad3 = ctx.createRadialGradient(width * 0.85, height, 0, width * 0.85, height, width * 0.7);
    grad3.addColorStop(0, "rgba(13, 42, 29, 0.9)");
    grad3.addColorStop(1, "rgba(7, 23, 17, 0)");
    ctx.fillStyle = grad3;
    ctx.fillRect(0, 0, width, height);

    for (const p of particles) {
      p.y -= p.speed;
      p.x += Math.sin(p.twinkle) * p.drift;
      p.twinkle += 0.01;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(240, 205, 133, ${p.alpha * (0.7 + 0.3 * Math.sin(p.twinkle))})`;
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

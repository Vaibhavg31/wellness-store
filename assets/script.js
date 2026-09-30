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

  /* ---------- animated cream aurora background + drifting dust ---------- */

  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d");
  let width, height, particles;

  const PARTICLE_COUNT = window.innerWidth < 640 ? 14 : 26;

  const BLOBS = [
    { baseX: 0.18, baseY: 0.2, r: 0.55, color: "168, 87, 143", amp: 0.05, speed: 0.00018, phase: 0 },
    { baseX: 0.85, baseY: 0.75, r: 0.5, color: "224, 149, 96", amp: 0.06, speed: 0.00014, phase: 2 },
    { baseX: 0.75, baseY: 0.15, r: 0.4, color: "212, 178, 90", amp: 0.04, speed: 0.00021, phase: 4 },
  ];

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
      r: (Math.random() * 1.6 + 0.6) * devicePixelRatio,
      speed: (Math.random() * 0.14 + 0.03) * devicePixelRatio,
      drift: (Math.random() - 0.5) * 0.1 * devicePixelRatio,
      alpha: Math.random() * 0.22 + 0.06,
      twinkle: Math.random() * Math.PI * 2,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, makeParticle);
  }

  function drawBase(elapsed) {
    ctx.fillStyle = "#fbe6cf";
    ctx.fillRect(0, 0, width, height);

    for (const b of BLOBS) {
      const wobble = Math.sin(elapsed * b.speed + b.phase);
      const x = (b.baseX + wobble * b.amp) * width;
      const y = (b.baseY + Math.cos(elapsed * b.speed * 0.8 + b.phase) * b.amp) * height;
      const r = b.r * Math.max(width, height);

      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${b.color}, 0.16)`);
      grad.addColorStop(1, `rgba(${b.color}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(122, 52, 104, ${p.alpha * (0.7 + 0.3 * Math.sin(p.twinkle))})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw(now) {
    drawBase(now);

    for (const p of particles) {
      p.y -= p.speed;
      p.x += Math.sin(p.twinkle) * p.drift;
      p.twinkle += 0.008;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
    }
    drawParticles();

    requestAnimationFrame(draw);
  }

  init();

  if (reduceMotion) {
    drawBase(0);
    drawParticles();
  } else {
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", () => {
    resize();
  });
})();

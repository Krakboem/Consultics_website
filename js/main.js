/* ============================================================
   Consultics – Main JavaScript
   Future WordPress theme: js/main.js
   ============================================================ */

/* ── HAMBURGER MENU ── */
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
});

// Close mobile menu when a link is clicked
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
  });
});

/* ── NAV HIDE ON SCROLL ── */
let lastScrollY = window.scrollY;
const nav = document.querySelector('nav');

window.addEventListener('scroll', () => {
  if (window.scrollY > lastScrollY && window.scrollY > 60) {
    nav.style.transform = 'translateY(-100%)';
  } else {
    nav.style.transform = 'translateY(0)';
  }
  lastScrollY = window.scrollY;
});

/* ── NETWORK CANVAS ANIMATION ── */
(function () {
  const canvas = document.getElementById('networkCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let nodes = [];
  let animFrame;

  const CONFIG = {
    nodeCount: 60,
    maxDist: 140,
    nodeRadius: 2,
    nodeColor: 'rgba(255,255,255,0.55)',
    lineColor: 'rgba(255,255,255,',
    bgColor: '#1a1a1a',
    speed: 0.4,
  };

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function createNodes() {
    nodes = [];
    for (let i = 0; i < CONFIG.nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * CONFIG.speed,
        vy: (Math.random() - 0.5) * CONFIG.speed,
      });
    }
  }

  function draw() {
    ctx.fillStyle = CONFIG.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.maxDist) {
          const alpha = (1 - dist / CONFIG.maxDist) * 0.4;
          ctx.beginPath();
          ctx.strokeStyle = CONFIG.lineColor + alpha + ')';
          ctx.lineWidth = 0.8;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, CONFIG.nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.nodeColor;
      ctx.fill();
    });
  }

  function update() {
    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
      if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
    });
  }

  function loop() {
    update();
    draw();
    animFrame = requestAnimationFrame(loop);
  }

  function init() {
    resize();
    createNodes();
    cancelAnimationFrame(animFrame);
    loop();
  }

  window.addEventListener('resize', init);
  init();
})();

/* ── SCROLL TO TOP BUTTON ── */
const scrollBtn = document.getElementById('scrollToTop');
if (scrollBtn) {
  window.addEventListener('scroll', () => {
    scrollBtn.style.opacity = window.scrollY > 400 ? '1' : '0';
    scrollBtn.style.pointerEvents = window.scrollY > 400 ? 'auto' : 'none';
  });

  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

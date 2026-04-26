let W = window.innerWidth;
let H = window.innerHeight;

function mkCanvas(id) {
  const el = document.getElementById(id);
  el.width = W; el.height = H;
  return { el, ctx: el.getContext('2d') };
}
const bg  = mkCanvas('bg');
const mid = mkCanvas('mid');
const fg  = mkCanvas('fg');

// ── time-based variation ──────────────────────────────────────────────────────
// Hue drifts across the year (golden angle) and shifts with the hour.
// Speed is slightly higher at midday, quieter at night.
const _now  = new Date();
const _day  = Math.floor((_now - new Date(_now.getFullYear(), 0, 1)) / 86400000);
const _hour = _now.getHours() + _now.getMinutes() / 60;
const BASE_HUE   = (_day * 137.508 + _hour * 6) % 360;
const BASE_SPEED = 0.55 + 0.9 * Math.sin(Math.PI * _hour / 24);

// ── helpers ───────────────────────────────────────────────────────────────────
const rand   = (a, b) => a + Math.random() * (b - a);
const randI  = (n)    => Math.floor(Math.random() * n);
const hshift = (h)    => (h + BASE_HUE) % 360;
const clamp01 = (v)   => Math.max(0, Math.min(1, v));
const MINUTES_PER_DAY = 24 * 60;

function circularMinuteDistance(a, b) {
  const d = Math.abs(a - b) % MINUTES_PER_DAY;
  return Math.min(d, MINUTES_PER_DAY - d);
}

// ── Particle ──────────────────────────────────────────────────────────────────
class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x  = rand(0, W);
    this.y  = rand(0, H);
    this.vx = rand(-2.5, 2.5) * BASE_SPEED;
    this.vy = rand(-2.5, 2.5) * BASE_SPEED;
    this.r  = rand(0.5, 4.5);
    this.hue   = hshift(rand(0, 360));
    this.alpha = rand(0.3, 1);
    this.life  = 0;
    this.max   = rand(120, 500);
  }
  tick() {
    this.x += this.vx; this.y += this.vy;
    this.hue = (this.hue + 0.6) % 360;
    if (++this.life > this.max ||
        this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
  }
  draw(ctx) {
    ctx.globalAlpha = this.alpha * (1 - this.life / this.max);
    ctx.fillStyle = `hsl(${this.hue},80%,60%)`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Shape ─────────────────────────────────────────────────────────────────────
class Shape {
  constructor(init) { this.life = 0; this.reset(init); }
  reset(anywhere) {
    this.x    = anywhere ? rand(0, W) : rand(-150, -10);
    this.y    = rand(0, H);
    this.kind = randI(6);
    this.size = rand(5, 130);
    this.vx   = rand(-1.5, 1.5) * BASE_SPEED;
    this.vy   = rand(-1.5, 1.5) * BASE_SPEED;
    this.rot  = rand(0, Math.PI * 2);
    this.drot = rand(-0.03, 0.03);
    this.hue  = hshift(rand(0, 360));
    this.alpha = rand(0.04, 0.45);
    this.filled = Math.random() > 0.5;
    this.lw   = rand(0.5, 3);
    this.life  = 0;
    this.max   = rand(400, 1000);
  }
  tick() {
    this.x += this.vx; this.y += this.vy;
    this.rot = (this.rot + this.drot) % (Math.PI * 2);
    this.hue = (this.hue + 0.15) % 360;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.alpha * fade;
    ctx.strokeStyle = `hsl(${this.hue},60%,55%)`;
    ctx.fillStyle   = `hsl(${(this.hue + 30) % 360},60%,40%)`;
    ctx.lineWidth   = this.lw;
    ctx.beginPath();
    const s = this.size;
    if (this.kind === 0) {
      ctx.arc(0, 0, s, 0, Math.PI * 2);
    } else if (this.kind === 1) {
      ctx.rect(-s/2, -s/2, s, s);
    } else if (this.kind === 2) {
      ctx.moveTo(0, -s); ctx.lineTo(s*.866, s*.5); ctx.lineTo(-s*.866, s*.5); ctx.closePath();
    } else if (this.kind === 3) {
      for (let i = 0; i < 5; i++) {
        const a = (i/5)*Math.PI*2 - Math.PI/2;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a)*s, Math.sin(a)*s);
      } ctx.closePath();
    } else if (this.kind === 4) {
      for (let i = 0; i < 10; i++) {
        const a = (i/10)*Math.PI*2 - Math.PI/2;
        const r = i%2 === 0 ? s : s*.38;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a)*r, Math.sin(a)*r);
      } ctx.closePath();
    } else {
      for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a)*s, Math.sin(a)*s);
      } ctx.closePath();
    }
    if (this.filled) ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Eye (mysterious, not scary) ────────────────────────────────────────────────
// Round, galaxy-like iris; sparkle highlights; soft glow; no slit pupil.
class Eye {
  constructor() {
    this.life = 0;
    this.x     = rand(0, W);
    this.y     = rand(0, H);
    this.size  = rand(18, 80);
    this.hue   = hshift(rand(160, 300));
    this.phase = rand(0, Math.PI * 2);
    this.speed = rand(0.008, 0.025);
    this.alpha = rand(0.1, 0.42);
    this.vx    = rand(-0.4, 0.4);
    this.vy    = rand(-0.4, 0.4);
    this.sparkAngle = rand(0, Math.PI * 2);
    this.max   = rand(420, 1200);
  }
  reset() {
    this.x     = rand(0, W);
    this.y     = rand(0, H);
    this.size  = rand(18, 80);
    this.hue   = hshift(rand(160, 300));
    this.phase = rand(0, Math.PI * 2);
    this.speed = rand(0.008, 0.025);
    this.alpha = rand(0.1, 0.42);
    this.vx    = rand(-0.4, 0.4);
    this.vy    = rand(-0.4, 0.4);
    this.sparkAngle = rand(0, Math.PI * 2);
    this.life  = 0;
    this.max   = rand(420, 1200);
  }
  tick(t) {
    this.x = (this.x + this.vx + W) % W;
    this.y = (this.y + this.vy + H) % H;
    this.phase += this.speed;
    this.hue = (this.hue + 0.08) % 360;
    this.sparkAngle += 0.025;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx, t) {
    const open = (Math.sin(this.phase) + 1) / 2;
    if (open < 0.03) return;
    const s  = this.size;
    // pupil drifts in a gentle lemniscate (figure-8), never menacing
    const px = Math.sin(t * 0.0011) * s * 0.22;
    const py = Math.sin(t * 0.0022) * s * 0.10;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = this.alpha * open;

    // soft diffuse glow
    const glow = ctx.createRadialGradient(0, 0, s * 0.3, 0, 0, s * 1.2);
    glow.addColorStop(0, `hsla(${this.hue},80%,70%,0.18)`);
    glow.addColorStop(1, `hsla(${this.hue},80%,50%,0)`);
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // sclera — soft pearl-white ellipse
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.5 * open, 0, 0, Math.PI * 2);
    const sg = ctx.createRadialGradient(0, -s * 0.1, 0, 0, 0, s);
    sg.addColorStop(0, `hsl(${(this.hue+40)%360},30%,96%)`);
    sg.addColorStop(1, `hsl(${this.hue},20%,82%)`);
    ctx.fillStyle = sg;
    ctx.fill();

    // iris — galaxy radial gradient
    const ir = s * 0.34;
    ctx.beginPath();
    ctx.ellipse(px * 0.4, py * 0.4, ir, ir * open, 0, 0, Math.PI * 2);
    const ig = ctx.createRadialGradient(px*.4, py*.4, 0, px*.4, py*.4, ir);
    ig.addColorStop(0,   `hsl(${(this.hue+60)%360},90%,78%)`);
    ig.addColorStop(0.5, `hsl(${this.hue},80%,45%)`);
    ig.addColorStop(1,   `hsl(${(this.hue+180)%360},60%,22%)`);
    ctx.fillStyle = ig;
    ctx.fill();

    // pupil — round, deep, hint of inner colour
    const pr = s * 0.14;
    ctx.beginPath();
    ctx.ellipse(px * 0.4, py * 0.4, pr, pr * open, 0, 0, Math.PI * 2);
    const pg = ctx.createRadialGradient(
      px*.4 - s*.03, py*.4 - s*.03, 0,
      px*.4, py*.4, pr
    );
    pg.addColorStop(0, `hsl(${this.hue},50%,18%)`);
    pg.addColorStop(1, '#000');
    ctx.fillStyle = pg;
    ctx.fill();

    // main sparkle highlight
    ctx.globalAlpha = this.alpha * open * 0.92;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px*.4 - s*.1, py*.4 - s*.12, s*.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px*.4 + s*.06, py*.4 - s*.08, s*.025, 0, Math.PI * 2);
    ctx.fill();

    // tiny rotating sparkles on iris rim
    ctx.globalAlpha = this.alpha * open * 0.55;
    for (let i = 0; i < 4; i++) {
      const a  = this.sparkAngle + (i / 4) * Math.PI * 2;
      const sx = px*.4 + Math.cos(a) * ir * 0.75;
      const sy = py*.4 + Math.sin(a) * ir * 0.75 * open;
      ctx.fillStyle = `hsl(${(this.hue + i * 35) % 360},100%,90%)`;
      ctx.beginPath();
      ctx.arc(sx, sy, s * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ── NoiseLine ─────────────────────────────────────────────────────────────────
class NoiseLine {
  constructor() { this.reset(); }
  reset() {
    const n = 4 + randI(14);
    this.pts = Array.from({ length: n }, () => ({
      x: rand(0, W), y: rand(0, H),
      vx: rand(-2, 2) * BASE_SPEED, vy: rand(-2, 2) * BASE_SPEED,
    }));
    this.hue   = hshift(rand(0, 360));
    this.alpha = rand(0.04, 0.3);
    this.lw    = rand(0.2, 2.5);
    this.life  = 0;
    this.max   = rand(150, 600);
  }
  tick() {
    this.pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });
    this.hue = (this.hue + 0.35) % 360;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.globalAlpha = this.alpha * fade;
    ctx.strokeStyle = `hsl(${this.hue},60%,55%)`;
    ctx.lineWidth = this.lw;
    ctx.beginPath();
    this.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    ctx.restore();
  }
}

// ── Bubble ────────────────────────────────────────────────────────────────────
class Bubble {
  constructor(init) { this.reset(init); }
  reset(anywhere) {
    this.x      = rand(0, W);
    this.y      = anywhere ? rand(0, H) : H + rand(10, 60);
    this.r      = rand(10, 65);
    this.vy     = -rand(0.3, 1.2) * BASE_SPEED;
    this.vx     = rand(-0.4, 0.4);
    this.hue    = hshift(rand(0, 360));
    this.alpha  = rand(0.06, 0.35);
    this.wobble = rand(0, Math.PI * 2);
    this.life   = 0;
    this.max    = rand(400, 1000);
  }
  tick() {
    this.wobble += 0.03;
    this.x += this.vx + Math.sin(this.wobble) * 0.3;
    this.y += this.vy;
    this.hue = (this.hue + 0.2) % 360;
    if (++this.life > this.max || this.y < -this.r * 2) this.reset();
  }
  draw(ctx) {
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.globalAlpha = this.alpha * fade;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(
      this.x - this.r * 0.3, this.y - this.r * 0.3, this.r * 0.05,
      this.x, this.y, this.r
    );
    g.addColorStop(0,   `hsla(${(this.hue+40)%360},80%,90%,0.4)`);
    g.addColorStop(0.4, `hsla(${this.hue},70%,60%,0.15)`);
    g.addColorStop(1,   `hsla(${(this.hue+180)%360},60%,40%,0.35)`);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = `hsla(${this.hue},70%,80%,0.5)`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // inner highlight
    ctx.globalAlpha = this.alpha * fade * 0.65;
    ctx.beginPath();
    ctx.ellipse(
      this.x - this.r * 0.3, this.y - this.r * 0.3,
      this.r * 0.22, this.r * 0.14, -0.5, 0, Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.restore();
  }
}

// ── Ribbon ────────────────────────────────────────────────────────────────────
class Ribbon {
  constructor() { this.reset(); }
  reset() {
    this.pts = Array.from({ length: 5 }, () => ({
      x: rand(0, W), y: rand(0, H),
      vx: rand(-1.2, 1.2) * BASE_SPEED,
      vy: rand(-1.2, 1.2) * BASE_SPEED,
    }));
    this.hue   = hshift(rand(0, 360));
    this.alpha = rand(0.05, 0.3);
    this.lw    = rand(1, 5);
    this.life  = 0;
    this.max   = rand(300, 800);
  }
  tick() {
    this.pts.forEach(p => {
      p.x = (p.x + p.vx + W) % W;
      p.y = (p.y + p.vy + H) % H;
    });
    this.hue = (this.hue + 0.2) % 360;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    if (this.pts.length < 2) return;
    const fade = Math.sin(Math.PI * this.life / this.max);
    const last  = this.pts[this.pts.length - 1];
    const grd   = ctx.createLinearGradient(
      this.pts[0].x, this.pts[0].y, last.x, last.y
    );
    grd.addColorStop(0,   `hsla(${this.hue},80%,65%,0)`);
    grd.addColorStop(0.5, `hsla(${(this.hue+60)%360},80%,65%,1)`);
    grd.addColorStop(1,   `hsla(${(this.hue+120)%360},80%,65%,0)`);
    ctx.save();
    ctx.globalAlpha = this.alpha * fade;
    ctx.lineWidth = this.lw;
    ctx.lineCap = 'round';
    ctx.strokeStyle = grd;
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 1; i < this.pts.length - 1; i++) {
      const mx = (this.pts[i].x + this.pts[i+1].x) / 2;
      const my = (this.pts[i].y + this.pts[i+1].y) / 2;
      ctx.quadraticCurveTo(this.pts[i].x, this.pts[i].y, mx, my);
    }
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Mandala ───────────────────────────────────────────────────────────────────
class Mandala {
  constructor(init) { this.reset(init); }
  reset() {
    this.x      = rand(0, W);
    this.y      = rand(0, H);
    this.r      = rand(30, 120);
    this.petals = 3 + randI(6);
    this.layers = 2 + randI(3);
    this.rot    = rand(0, Math.PI * 2);
    this.drot   = rand(-0.008, 0.008);
    this.hue    = hshift(rand(0, 360));
    this.alpha  = rand(0.04, 0.28);
    this.lw     = rand(0.4, 1.8);
    this.vx     = rand(-0.4, 0.4);
    this.vy     = rand(-0.4, 0.4);
    this.life   = 0;
    this.max    = rand(500, 1200);
  }
  tick() {
    this.rot = (this.rot + this.drot) % (Math.PI * 2);
    this.hue = (this.hue + 0.1) % 360;
    this.x   = (this.x + this.vx + W) % W;
    this.y   = (this.y + this.vy + H) % H;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.alpha * fade;
    for (let layer = 1; layer <= this.layers; layer++) {
      const lr = this.r * (layer / this.layers);
      ctx.strokeStyle = `hsl(${(this.hue + layer * 30) % 360},70%,60%)`;
      ctx.lineWidth = this.lw;
      for (let i = 0; i < this.petals; i++) {
        const a  = (i / this.petals) * Math.PI * 2;
        const a2 = a + Math.PI / this.petals;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          Math.cos(a)  * lr * 0.5, Math.sin(a)  * lr * 0.5,
          Math.cos(a2) * lr * 0.5, Math.sin(a2) * lr * 0.5,
          Math.cos((a + a2) / 2) * lr, Math.sin((a + a2) / 2) * lr
        );
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, lr * 0.18, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Ripple ────────────────────────────────────────────────────────────────────
class Ripple {
  constructor() { this.reset(); }
  reset() {
    this.x     = rand(0, W);
    this.y     = rand(0, H);
    this.r     = 0;
    this.maxR  = rand(40, 200);
    this.speed = rand(0.5, 2) * BASE_SPEED;
    this.hue   = hshift(rand(0, 360));
    this.alpha = rand(0.06, 0.35);
    this.rings = 2 + randI(3);
    this.lw    = rand(0.4, 1.5);
    this.life  = 0;
    this.max   = Math.ceil(this.maxR / this.speed);
  }
  tick() {
    this.r   += this.speed;
    this.hue  = (this.hue + 0.4) % 360;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const pct = this.r / this.maxR;
    ctx.save();
    for (let k = 0; k < this.rings; k++) {
      const kr = this.r * (1 - k * 0.18);
      if (kr <= 0) continue;
      ctx.globalAlpha = this.alpha * (1 - pct) * (1 - k * 0.3);
      ctx.strokeStyle = `hsl(${(this.hue + k * 40) % 360},70%,65%)`;
      ctx.lineWidth   = this.lw;
      ctx.beginPath();
      ctx.arc(this.x, this.y, kr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── WaveSweep ─────────────────────────────────────────────────────────────────
class WaveSweep {
  constructor() { this.reset(); }
  reset() {
    this.phase  = rand(0, Math.PI * 2);
    this.amp    = rand(20, 120);
    this.freq   = rand(0.003, 0.015);
    this.y0     = rand(0, H);
    this.vy     = rand(-0.5, 0.5) * BASE_SPEED;
    this.hue    = hshift(rand(0, 360));
    this.alpha  = rand(0.04, 0.2);
    this.lw     = rand(0.3, 2);
    this.dphase = rand(0.01, 0.04);
    this.life   = 0;
    this.max    = rand(300, 900);
  }
  tick() {
    this.phase = (this.phase + this.dphase) % (Math.PI * 2);
    this.y0    = (this.y0 + this.vy + H) % H;
    this.hue   = (this.hue + 0.3) % 360;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.globalAlpha = this.alpha * fade;
    ctx.strokeStyle = `hsl(${this.hue},65%,60%)`;
    ctx.lineWidth   = this.lw;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 3) {
      const y = this.y0 + Math.sin(x * this.freq + this.phase) * this.amp;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ── Spiral ────────────────────────────────────────────────────────────────────
class Spiral {
  constructor(init) { this.reset(init); }
  reset() {
    this.x     = rand(0, W);
    this.y     = rand(0, H);
    this.turns = 2 + randI(4);
    this.maxR  = rand(20, 100);
    this.rot   = rand(0, Math.PI * 2);
    this.drot  = rand(-0.012, 0.012);
    this.hue   = hshift(rand(0, 360));
    this.alpha = rand(0.05, 0.3);
    this.lw    = rand(0.3, 2);
    this.dir   = Math.random() > 0.5 ? 1 : -1;
    this.vx    = rand(-0.5, 0.5);
    this.vy    = rand(-0.5, 0.5);
    this.life  = 0;
    this.max   = rand(400, 1000);
  }
  tick() {
    this.rot = (this.rot + this.drot) % (Math.PI * 2);
    this.hue = (this.hue + 0.2) % 360;
    this.x   = (this.x + this.vx + W) % W;
    this.y   = (this.y + this.vy + H) % H;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const fade  = Math.sin(Math.PI * this.life / this.max);
    const steps = this.turns * 120;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.alpha * fade;
    ctx.strokeStyle = `hsl(${this.hue},70%,60%)`;
    ctx.lineWidth   = this.lw;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a  = this.dir * (i / steps) * this.turns * Math.PI * 2;
      const r  = (i / steps) * this.maxR;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ── Tendril ───────────────────────────────────────────────────────────────────
// A branching organic line that grows from a seed point.
class Tendril {
  constructor() { this.reset(); }
  reset() {
    this.x     = rand(0, W);
    this.y     = rand(0, H);
    this.angle = rand(0, Math.PI * 2);
    this.len   = 0;
    this.maxLen = rand(80, 320);
    this.speed  = rand(1.5, 4) * BASE_SPEED;
    this.curve  = rand(-0.05, 0.05);
    this.hue    = hshift(rand(0, 360));
    this.alpha  = rand(0.06, 0.28);
    this.lw     = rand(0.4, 2.5);
    this.pts    = [{ x: this.x, y: this.y }];
    this.life   = 0;
    this.max    = rand(200, 700);
  }
  tick() {
    this.angle += this.curve + rand(-0.04, 0.04);
    const nx = this.pts[this.pts.length-1].x + Math.cos(this.angle) * this.speed;
    const ny = this.pts[this.pts.length-1].y + Math.sin(this.angle) * this.speed;
    this.pts.push({ x: nx, y: ny });
    this.len += this.speed;
    this.hue = (this.hue + 0.3) % 360;
    if (++this.life > this.max || this.len > this.maxLen) this.reset();
  }
  draw(ctx) {
    if (this.pts.length < 2) return;
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.globalAlpha = this.alpha * fade;
    ctx.strokeStyle = `hsl(${this.hue},65%,58%)`;
    ctx.lineWidth   = this.lw;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 1; i < this.pts.length; i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.stroke();
    ctx.restore();
  }
}

// ── ArcBurst ──────────────────────────────────────────────────────────────────
// Radiating arc segments from a centre — like a diffracted star.
class ArcBurst {
  constructor() { this.reset(); }
  reset() {
    this.x     = rand(0, W);
    this.y     = rand(0, H);
    this.r     = rand(20, 110);
    this.spokes = 5 + randI(9);
    this.rot   = rand(0, Math.PI * 2);
    this.drot  = rand(-0.015, 0.015);
    this.hue   = hshift(rand(0, 360));
    this.alpha = rand(0.05, 0.3);
    this.lw    = rand(0.4, 2);
    this.arc   = rand(0.1, 0.5);
    this.vx    = rand(-0.5, 0.5);
    this.vy    = rand(-0.5, 0.5);
    this.life  = 0;
    this.max   = rand(300, 900);
  }
  tick() {
    this.rot = (this.rot + this.drot) % (Math.PI * 2);
    this.hue = (this.hue + 0.18) % 360;
    this.x   = (this.x + this.vx + W) % W;
    this.y   = (this.y + this.vy + H) % H;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.alpha * fade;
    ctx.lineWidth   = this.lw;
    for (let i = 0; i < this.spokes; i++) {
      const a0 = (i / this.spokes) * Math.PI * 2;
      const a1 = a0 + this.arc;
      ctx.strokeStyle = `hsl(${(this.hue + i * (360/this.spokes)) % 360},75%,62%)`;
      ctx.beginPath();
      ctx.arc(0, 0, this.r, a0, a1);
      ctx.stroke();
      // radial spoke
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a0) * this.r, Math.sin(a0) * this.r);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── LissajousGhost ────────────────────────────────────────────────────────────
// Parametric Lissajous figure whose phase slowly drifts — alien loop patterns.
class LissajousGhost {
  constructor() { this.reset(); }
  reset() {
    this.x      = rand(0, W);
    this.y      = rand(0, H);
    this.rx     = rand(25, 130);
    this.ry     = rand(25, 130);
    this.a      = 1 + randI(5);
    this.b      = 1 + randI(5);
    this.delta  = rand(0, Math.PI * 2);
    this.ddelta = rand(0.004, 0.018);
    this.hue    = hshift(rand(0, 360));
    this.alpha  = rand(0.05, 0.28);
    this.lw     = rand(0.4, 2);
    this.vx     = rand(-0.55, 0.55);
    this.vy     = rand(-0.55, 0.55);
    this.life   = 0;
    this.max    = rand(500, 1400);
  }
  tick() {
    this.delta = (this.delta + this.ddelta) % (Math.PI * 2);
    this.hue   = (this.hue + 0.14) % 360;
    this.x     = (this.x + this.vx + W) % W;
    this.y     = (this.y + this.vy + H) % H;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = this.alpha * fade;
    ctx.strokeStyle = `hsl(${this.hue},75%,62%)`;
    ctx.lineWidth   = this.lw;
    ctx.beginPath();
    for (let i = 0; i <= 360; i++) {
      const t_ = (i / 360) * Math.PI * 2;
      const px = Math.sin(this.a * t_ + this.delta) * this.rx;
      const py = Math.sin(this.b * t_) * this.ry;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ── PolygonMorph ──────────────────────────────────────────────────────────────
// A polygon whose vertices continuously lerp toward random new target positions.
class PolygonMorph {
  constructor() { this.reset(); }
  _newTargets() {
    const n = this.verts.length;
    this.verts.forEach((v, i) => {
      const a = (i / n) * Math.PI * 2 + rand(-0.8, 0.8);
      const r = rand(10, 130);
      v.tx = Math.cos(a) * r;
      v.ty = Math.sin(a) * r;
    });
    this.nextMorph = rand(50, 180);
  }
  reset() {
    const n    = 4 + randI(9);
    this.verts = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const r = rand(15, 100);
      return { cx: Math.cos(a) * r, cy: Math.sin(a) * r, tx: 0, ty: 0 };
    });
    this._newTargets();
    this.x      = rand(0, W);
    this.y      = rand(0, H);
    this.rot    = rand(0, Math.PI * 2);
    this.drot   = rand(-0.012, 0.012);
    this.hue    = hshift(rand(0, 360));
    this.alpha  = rand(0.04, 0.25);
    this.lw     = rand(0.4, 2);
    this.filled = Math.random() > 0.65;
    this.vx     = rand(-0.45, 0.45);
    this.vy     = rand(-0.45, 0.45);
    this.life   = 0;
    this.max    = rand(500, 1300);
  }
  tick() {
    this.verts.forEach(v => {
      v.cx += (v.tx - v.cx) * 0.025;
      v.cy += (v.ty - v.cy) * 0.025;
    });
    this.rot = (this.rot + this.drot) % (Math.PI * 2);
    this.hue = (this.hue + 0.12) % 360;
    this.x   = (this.x + this.vx + W) % W;
    this.y   = (this.y + this.vy + H) % H;
    if (--this.nextMorph <= 0) this._newTargets();
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.alpha * fade;
    ctx.strokeStyle = `hsl(${this.hue},70%,58%)`;
    ctx.fillStyle   = `hsl(${(this.hue + 45) % 360},60%,28%)`;
    ctx.lineWidth   = this.lw;
    ctx.beginPath();
    this.verts.forEach((v, i) => i ? ctx.lineTo(v.cx, v.cy) : ctx.moveTo(v.cx, v.cy));
    ctx.closePath();
    if (this.filled) ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ── MeshWeb ───────────────────────────────────────────────────────────────────
// Moving nodes connected by edges when within threshold — elastic web.
class MeshWeb {
  constructor() { this.reset(); }
  reset() {
    const n    = 5 + randI(10);
    this.nodes = Array.from({ length: n }, () => ({
      x: rand(0, W), y: rand(0, H),
      vx: rand(-1.2, 1.2) * BASE_SPEED,
      vy: rand(-1.2, 1.2) * BASE_SPEED,
    }));
    this.thresh = rand(90, 280);
    this.hue    = hshift(rand(0, 360));
    this.alpha  = rand(0.04, 0.22);
    this.lw     = rand(0.2, 1.2);
    this.life   = 0;
    this.max    = rand(400, 1100);
  }
  tick() {
    this.nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });
    this.hue = (this.hue + 0.18) % 360;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.lineWidth = this.lw;
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = this.nodes[i].x - this.nodes[j].x;
        const dy = this.nodes[i].y - this.nodes[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d > this.thresh) continue;
        ctx.globalAlpha = this.alpha * fade * (1 - d / this.thresh);
        ctx.strokeStyle = `hsl(${(this.hue + d * 0.4) % 360},65%,60%)`;
        ctx.beginPath();
        ctx.moveTo(this.nodes[i].x, this.nodes[i].y);
        ctx.lineTo(this.nodes[j].x, this.nodes[j].y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// ── OrbitingDots ──────────────────────────────────────────────────────────────
// Dots orbiting around a central point at varying speeds and radii.
class OrbitingDots {
  constructor() { this.reset(); }
  reset() {
    this.x      = rand(0, W);
    this.y      = rand(0, H);
    this.dots   = Array.from({ length: 3 + randI(4) }, () => ({
      angle: rand(0, Math.PI * 2),
      radius: rand(15, 80),
      speed: rand(0.008, 0.03),
      size: rand(2, 7),
    }));
    this.hue    = hshift(rand(0, 360));
    this.alpha  = rand(0.08, 0.35);
    this.vx     = rand(-0.3, 0.3);
    this.vy     = rand(-0.3, 0.3);
    this.life   = 0;
    this.max    = rand(500, 1200);
  }
  tick() {
    this.x = (this.x + this.vx + W) % W;
    this.y = (this.y + this.vy + H) % H;
    this.dots.forEach(d => d.angle = (d.angle + d.speed) % (Math.PI * 2));
    this.hue = (this.hue + 0.12) % 360;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = this.alpha * fade;
    this.dots.forEach((d, i) => {
      const dx = Math.cos(d.angle) * d.radius;
      const dy = Math.sin(d.angle) * d.radius;
      ctx.fillStyle = `hsl(${(this.hue + i * 60) % 360},80%,60%)`;
      ctx.beginPath();
      ctx.arc(dx, dy, d.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

// ── PulsingRing ───────────────────────────────────────────────────────────────
// Concentric rings that pulse and fade.
class PulsingRing {
  constructor() { this.reset(); }
  reset() {
    this.x      = rand(0, W);
    this.y      = rand(0, H);
    this.radius = rand(20, 120);
    this.rings  = 2 + randI(3);
    this.phase  = rand(0, Math.PI * 2);
    this.speed  = rand(0.02, 0.06);
    this.hue    = hshift(rand(0, 360));
    this.alpha  = rand(0.06, 0.28);
    this.lw     = rand(0.5, 2.5);
    this.vx     = rand(-0.4, 0.4);
    this.vy     = rand(-0.4, 0.4);
    this.life   = 0;
    this.max    = rand(400, 900);
  }
  tick() {
    this.x = (this.x + this.vx + W) % W;
    this.y = (this.y + this.vy + H) % H;
    this.phase = (this.phase + this.speed) % (Math.PI * 2);
    this.hue = (this.hue + 0.15) % 360;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = this.alpha * fade;
    for (let i = 1; i <= this.rings; i++) {
      const r = this.radius * (i / this.rings);
      const pulseFactor = 1 + 0.15 * Math.sin(this.phase + i);
      ctx.strokeStyle = `hsl(${(this.hue + i * 40) % 360},75%,65%)`;
      ctx.lineWidth = this.lw;
      ctx.beginPath();
      ctx.arc(0, 0, r * pulseFactor, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── FloatingGlyph ────────────────────────────────────────────────────────────
// Abstract geometric glyphs that float and rotate.
class FloatingGlyph {
  constructor() { this.reset(); }
  reset() {
    this.x      = rand(0, W);
    this.y      = rand(0, H);
    this.size   = rand(12, 60);
    this.rot    = rand(0, Math.PI * 2);
    this.drot   = rand(-0.02, 0.02);
    this.type   = randI(4);
    this.hue    = hshift(rand(0, 360));
    this.alpha  = rand(0.07, 0.32);
    this.lw     = rand(0.4, 1.8);
    this.vx     = rand(-0.5, 0.5);
    this.vy     = rand(-0.5, 0.5);
    this.life   = 0;
    this.max    = rand(350, 900);
  }
  tick() {
    this.x = (this.x + this.vx + W) % W;
    this.y = (this.y + this.vy + H) % H;
    this.rot = (this.rot + this.drot) % (Math.PI * 2);
    this.hue = (this.hue + 0.18) % 360;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.alpha * fade;
    ctx.strokeStyle = `hsl(${this.hue},70%,60%)`;
    ctx.fillStyle = `hsl(${(this.hue + 120) % 360},60%,30%)`;
    ctx.lineWidth = this.lw;
    const s = this.size;
    ctx.beginPath();
    if (this.type === 0) {
      ctx.moveTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.lineTo(0, -s); ctx.closePath();
    } else if (this.type === 1) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * s, Math.sin(a) * s);
      }
      ctx.closePath();
    } else if (this.type === 2) {
      ctx.arc(0, 0, s, 0, Math.PI * 2);
    } else {
      ctx.moveTo(s, 0); ctx.lineTo(-s * 0.5, s * 0.866); ctx.lineTo(-s * 0.5, -s * 0.866); ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ── VortexSwirl ───────────────────────────────────────────────────────────────
// Spiral arms radiating from center, rotating.
class VortexSwirl {
  constructor() { this.reset(); }
  reset() {
    this.x      = rand(0, W);
    this.y      = rand(0, H);
    this.radius = rand(25, 110);
    this.arms   = 2 + randI(4);
    this.rot    = rand(0, Math.PI * 2);
    this.drot   = rand(-0.015, 0.015);
    this.hue    = hshift(rand(0, 360));
    this.alpha  = rand(0.06, 0.3);
    this.lw     = rand(0.5, 2);
    this.vx     = rand(-0.35, 0.35);
    this.vy     = rand(-0.35, 0.35);
    this.life   = 0;
    this.max    = rand(450, 1000);
  }
  tick() {
    this.x = (this.x + this.vx + W) % W;
    this.y = (this.y + this.vy + H) % H;
    this.rot = (this.rot + this.drot) % (Math.PI * 2);
    this.hue = (this.hue + 0.13) % 360;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.alpha * fade;
    for (let arm = 0; arm < this.arms; arm++) {
      const armAngle = (arm / this.arms) * Math.PI * 2;
      ctx.strokeStyle = `hsl(${(this.hue + arm * (360 / this.arms)) % 360},75%,62%)`;
      ctx.lineWidth = this.lw;
      ctx.beginPath();
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const r = this.radius * t;
        const a = armAngle + t * Math.PI * 1.5;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        ctx[i ? 'lineTo' : 'moveTo'](px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── ParticleTrail ────────────────────────────────────────────────────────────
// Trailing particles that follow a curved path.
class ParticleTrail {
  constructor() { this.reset(); }
  reset() {
    this.x      = rand(0, W);
    this.y      = rand(0, H);
    this.vx     = rand(-1, 1) * BASE_SPEED;
    this.vy     = rand(-1, 1) * BASE_SPEED;
    this.curve  = rand(-0.04, 0.04);
    this.trailLength = 8 + randI(12);
    this.trail  = [{ x: this.x, y: this.y }];
    this.hue    = hshift(rand(0, 360));
    this.alpha  = rand(0.08, 0.35);
    this.lw     = rand(0.5, 2.5);
    this.life   = 0;
    this.max    = rand(400, 1000);
  }
  tick() {
    this.vx += this.curve;
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > W) this.vx *= -1;
    if (this.y < 0 || this.y > H) this.vy *= -1;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.trailLength) this.trail.shift();
    this.hue = (this.hue + 0.2) % 360;
    if (++this.life > this.max) this.reset();
  }
  draw(ctx) {
    if (this.trail.length < 2) return;
    const fade = Math.sin(Math.PI * this.life / this.max);
    ctx.save();
    ctx.globalAlpha = this.alpha * fade;
    ctx.lineWidth = this.lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < this.trail.length; i++) {
      const t = i / this.trail.length;
      ctx.strokeStyle = `hsl(${(this.hue + i * 15) % 360},80%,${50 + t * 20}%)`;
      ctx.beginPath();
      ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
      ctx.lineTo(this.trail[i].x, this.trail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── build scene ───────────────────────────────────────────────────────────────
const particles  = Array.from({ length: 280 }, () => new Particle());
const shapes     = Array.from({ length: 45  }, () => new Shape(true));
const eyes       = Array.from({ length: 14  }, () => new Eye());
const noiseLines = Array.from({ length: 22  }, () => new NoiseLine());
const bubbles    = Array.from({ length: 32  }, () => new Bubble(true));
const ribbons    = Array.from({ length: 18  }, () => new Ribbon());
const mandalas   = Array.from({ length: 14  }, () => new Mandala(true));
const ripples    = Array.from({ length: 20  }, () => new Ripple());
const waveSweeps = Array.from({ length: 10  }, () => new WaveSweep());
const spirals    = Array.from({ length: 18  }, () => new Spiral(true));
const tendrils   = Array.from({ length: 22  }, () => new Tendril());
const arcBursts  = Array.from({ length: 16  }, () => new ArcBurst());
const lissajous  = Array.from({ length: 14  }, () => new LissajousGhost());
const polyMorphs = Array.from({ length: 14  }, () => new PolygonMorph());
const meshWebs   = Array.from({ length: 10  }, () => new MeshWeb());
const orbitDots  = Array.from({ length: 12  }, () => new OrbitingDots());
const pulsRings  = Array.from({ length: 10  }, () => new PulsingRing());
const glyphs     = Array.from({ length: 16  }, () => new FloatingGlyph());
const vortexes   = Array.from({ length: 11  }, () => new VortexSwirl());
const trails     = Array.from({ length: 14  }, () => new ParticleTrail());

const baseSets = [
  { items: particles,  max: 280, tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: shapes,     max: 45,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: noiseLines, max: 22,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: bubbles,    max: 32,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: ribbons,    max: 18,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: mandalas,   max: 14,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: ripples,    max: 20,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: waveSweeps, max: 10,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: spirals,    max: 18,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: tendrils,   max: 22,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: arcBursts,  max: 16,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: lissajous,  max: 14,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: polyMorphs, max: 14,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: meshWebs,   max: 10,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: orbitDots,  max: 12,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: pulsRings,  max: 10,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: glyphs,     max: 16,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: vortexes,   max: 11,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
  { items: trails,     max: 14,  tick: o => o.tick(),     draw: (o, ctx) => o.draw(ctx),       spawnAnywhere: true },
];

const eyeSet = {
  items: eyes,
  max: 14,
  tick: o => o.tick(t),
  draw: (o, ctx) => o.draw(ctx, t),
  spawnAnywhere: true,
};

[...baseSets, eyeSet].forEach(set => {
  set.items.forEach(obj => {
    obj.active = false;
    obj.retiring = false;
    obj.spawnWeight = Math.random();
  });
});

let lastMinuteKey = -1;
let manualMinuteOfDay = null;
let currentOtherDensity = 0;
let currentEyeDensity = 0;

function parseTime24(text) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(text).trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function formatMinuteOfDay(minuteOfDay) {
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getMinuteOfDay() {
  if (manualMinuteOfDay !== null) return manualMinuteOfDay;
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

window.setVoidTime = function setVoidTime(time24) {
  const parsed = parseTime24(time24);
  if (parsed === null) {
    console.warn('Invalid time. Use HH:MM in 24-hour format, e.g. 00:30 or 14:30.');
    return false;
  }
  manualMinuteOfDay = parsed;
  lastMinuteKey = -1;
  console.info(`Void time fixed at ${formatMinuteOfDay(parsed)} until changed.`);
  return true;
};

window.clearVoidTime = function clearVoidTime() {
  manualMinuteOfDay = null;
  lastMinuteKey = -1;
  console.info('Void time override cleared. Using real clock time.');
};

window.getVoidTime = function getVoidTime() {
  if (manualMinuteOfDay === null) return null;
  return formatMinuteOfDay(manualMinuteOfDay);
};

console.info('Time override commands: setVoidTime("HH:MM"), getVoidTime(), clearVoidTime()');

function getOtherDensity(minuteOfDay) {
  const pm130 = 13 * 60 + 30;
  const dist = circularMinuteDistance(minuteOfDay, pm130);
  return Math.pow(clamp01(dist / 720), 2.8);
}

function getEyeDensity(minuteOfDay) {
  const windowStart = 30;
  const windowEnd = 4 * 60 + 30;
  if (minuteOfDay < windowStart || minuteOfDay >= windowEnd) return 0;

  const pos = (minuteOfDay - windowStart) / (windowEnd - windowStart);
  const edgeFade = 1 - Math.abs(pos * 2 - 1);
  const pm230 = 14 * 60 + 30;
  const towardPm = 1 - circularMinuteDistance(minuteOfDay, pm230) / 720;
  return clamp01(Math.pow(edgeFade, 1.45) * (0.45 + 0.55 * clamp01(towardPm)));
}

function activateObject(obj, spawnAnywhere) {
  obj.active = true;
  obj.retiring = false;
  if (typeof obj.reset === 'function') obj.reset(spawnAnywhere);
}

function markRetiring(obj) {
  if (obj.retiring) return;
  obj.retiring = true;
  if (typeof obj.life === 'number' && typeof obj.max === 'number') {
    const remaining = Math.max(24, Math.min(180, Math.floor(obj.max * 0.2)));
    obj.max = Math.min(obj.max, obj.life + remaining);
  }
}

function applyDensityToSet(set, density) {
  set.items.forEach(obj => {
    const shouldBeActive = obj.spawnWeight < density;
    if (shouldBeActive) {
      if (!obj.active) activateObject(obj, set.spawnAnywhere);
      else if (obj.retiring) obj.retiring = false;
      return;
    }
    if (obj.active) markRetiring(obj);
  });
}

function updateSpawnTargetsByMinute() {
  const minuteOfDay = getMinuteOfDay();
  if (minuteOfDay === lastMinuteKey) return;
  lastMinuteKey = minuteOfDay;

  currentOtherDensity = getOtherDensity(minuteOfDay);
  currentEyeDensity = getEyeDensity(minuteOfDay);

  baseSets.forEach(set => applyDensityToSet(set, currentOtherDensity));
  applyDensityToSet(eyeSet, currentEyeDensity);
}

function runSet(set, ctx) {
  set.items.forEach(o => {
    if (!o.active) return;
    set.tick(o);
    if (o.retiring && o.life === 0) {
      o.active = false;
      o.retiring = false;
      return;
    }
    set.draw(o, ctx);
  });
}

// ── main loop ─────────────────────────────────────────────────────────────────
let t = 0;

function animate() {
  t++;
  updateSpawnTargetsByMinute();

  // ── background layer ────────────────────────────────────────────────────────
  const bgCtx = bg.ctx;
  bgCtx.globalAlpha = 0.035;
  bgCtx.fillStyle = '#000';
  bgCtx.fillRect(0, 0, W, H);
  bgCtx.globalAlpha = 1;

  runSet(baseSets[2], bgCtx);   // noiseLines
  runSet(baseSets[1], bgCtx);   // shapes
  runSet(baseSets[5], bgCtx);   // mandalas
  runSet(baseSets[7], bgCtx);   // waveSweeps
  runSet(baseSets[11], bgCtx);  // lissajous
  runSet(baseSets[12], bgCtx);  // polyMorphs
  runSet(baseSets[14], bgCtx);  // orbitDots
  runSet(baseSets[16], bgCtx);  // glyphs

  // multi-strip scanline glitch (non-eye density controlled)
  if (t % 23 === 0 && Math.random() < currentOtherDensity) {
    const n = 1 + randI(3);
    for (let i = 0; i < n; i++) {
      bgCtx.globalAlpha = rand(0.04, 0.22) * currentOtherDensity;
      bgCtx.fillStyle = `hsl(${hshift(rand(0, 360))},80%,60%)`;
      bgCtx.fillRect(0, rand(0, H), W, rand(1, 7));
    }
    bgCtx.globalAlpha = 1;
  }

  // ── mid layer ───────────────────────────────────────────────────────────────
  const midCtx = mid.ctx;
  midCtx.globalAlpha = 0.045;
  midCtx.fillStyle = '#000';
  midCtx.fillRect(0, 0, W, H);
  midCtx.globalAlpha = 1;

  runSet(baseSets[3], midCtx);   // bubbles
  runSet(baseSets[4], midCtx);   // ribbons
  runSet(baseSets[8], midCtx);   // spirals
  runSet(baseSets[10], midCtx);  // arcBursts
  runSet(baseSets[9], midCtx);   // tendrils
  runSet(eyeSet, midCtx);        // eyes
  runSet(baseSets[6], midCtx);   // ripples
  runSet(baseSets[13], midCtx);  // meshWebs
  runSet(baseSets[15], midCtx);  // pulsRings
  runSet(baseSets[17], midCtx);  // vortexes

  // chromatic aberration: non-eye density controlled
  if (t % 37 === 0 && Math.random() < 0.42 * currentOtherDensity) {
    const sy = rand(0, H - 80);
    const sh = rand(15, 75);
    midCtx.save();
    midCtx.globalAlpha = 0.18 * currentOtherDensity;
    midCtx.globalCompositeOperation = 'screen';
    midCtx.drawImage(mid.el, 0, sy, W, sh, -5, sy, W, sh);
    midCtx.drawImage(mid.el, 0, sy, W, sh,  5, sy, W, sh);
    midCtx.restore();
  }

  // ── foreground layer ─────────────────────────────────────────────────────────
  const fgCtx = fg.ctx;
  fgCtx.globalAlpha = 0.07;
  fgCtx.fillStyle = '#000';
  fgCtx.fillRect(0, 0, W, H);
  fgCtx.globalAlpha = 1;

  runSet(baseSets[0], fgCtx); // particles
  runSet(baseSets[18], fgCtx); // trails

  // glitch block (non-eye density controlled)
  if (t % 22 === 0 && Math.random() < 0.52 * currentOtherDensity) {
    fgCtx.save();
    fgCtx.globalAlpha = rand(0.08, 0.4) * currentOtherDensity;
    if (Math.random() < 0.3) fgCtx.globalCompositeOperation = 'screen';
    fgCtx.fillStyle = `hsl(${hshift(rand(0, 360))},100%,60%)`;
    fgCtx.fillRect(rand(0, W), rand(0, H), rand(15, 250), rand(3, 65));
    fgCtx.restore();
  }

  // void flash: full-canvas colour wash (non-eye density controlled)
  if (t % 83 === 0 && Math.random() < 0.32 * currentOtherDensity) {
    fgCtx.save();
    fgCtx.globalAlpha = rand(0.04, 0.18) * currentOtherDensity;
    fgCtx.globalCompositeOperation = 'screen';
    fgCtx.fillStyle = `hsl(${hshift(rand(0, 360))},100%,50%)`;
    fgCtx.fillRect(0, 0, W, H);
    fgCtx.restore();
  }

  // horizontal tear (non-eye density controlled)
  if (t % 47 === 0 && Math.random() < 0.38 * currentOtherDensity) {
    const y    = rand(0, H);
    const srcX = rand(0, W * 0.5);
    fgCtx.globalAlpha = rand(0.1, 0.45) * currentOtherDensity;
    fgCtx.drawImage(fg.el, srcX, y, rand(50, 320), rand(2, 22),
                           srcX + rand(-55, 55), y, rand(50, 320), rand(2, 22));
    fgCtx.globalAlpha = 1;
  }

  // diagonal streak (non-eye density controlled)
  if (t % 59 === 0 && Math.random() < 0.28 * currentOtherDensity) {
    fgCtx.save();
    fgCtx.globalAlpha = rand(0.06, 0.22) * currentOtherDensity;
    fgCtx.strokeStyle = `hsl(${hshift(rand(0, 360))},90%,65%)`;
    fgCtx.lineWidth   = rand(1, 4);
    fgCtx.beginPath();
    const sx = rand(0, W); const sy = rand(0, H);
    fgCtx.moveTo(sx, sy);
    fgCtx.lineTo(sx + rand(-300, 300), sy + rand(-300, 300));
    fgCtx.stroke();
    fgCtx.restore();
  }

  requestAnimationFrame(animate);
}

// ── disable pointer/selection interaction (keep browser shortcuts intact) ────
['contextmenu','selectstart','dragstart','mousedown','touchstart'].forEach(ev => {
  document.addEventListener(ev, e => e.preventDefault(), { passive: false });
});

// ── resize: rescale canvases to new viewport ──────────────────────────────────
window.addEventListener('resize', () => {
  const nW = window.innerWidth, nH = window.innerHeight;
  W = nW; H = nH;
  [bg, mid, fg].forEach(({ el }) => { el.width = nW; el.height = nH; });
});

animate();

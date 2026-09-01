/* Motor del juego (rebotes) y demo automática de previsualización.
   El estado de partida vive aquí, no en React: la UI solo recibe avisos. */
(function () {
  var W = 640;
  var DIFF = { 'FÁCIL': 3.1, 'NORMAL': 4.1, 'DIFÍCIL': 5.3 };

  function bricks(h, rows) {
    var cols = 8, pad = 30, gap = 6;
    var w = (W - pad * 2 - gap * (cols - 1)) / cols;
    var colors = ['#00f5ff', '#ff006e', '#f5ff00', '#9b5cff'];
    var out = [];
    for (var r = 0; r < rows; r++) for (var i = 0; i < cols; i++) {
      out.push({ x: pad + i * (w + gap), y: h * 0.11 + r * 25, w: w, h: 17, c: colors[r % colors.length], alive: true });
    }
    return out;
  }

  function paint(ctx, h, g) {
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, W, h);
    ctx.strokeStyle = 'rgba(0,245,255,.06)';
    for (var x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (var y = 0; y <= h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    g.bricks.forEach(function (b) {
      if (!b.alive) return;
      ctx.shadowColor = b.c; ctx.shadowBlur = 11; ctx.fillStyle = b.c;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(b.x, b.y + b.h - 5, b.w, 5);
    });
    ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 16; ctx.fillStyle = '#00f5ff';
    ctx.fillRect(g.px, g.paddleY, g.pw, 11);
    ctx.shadowColor = '#f5ff00'; ctx.fillStyle = '#f5ff00';
    ctx.fillRect(g.ball.x - 6, g.ball.y - 6, 12, 12);
    ctx.shadowBlur = 0;
  }

  /* Partida jugable. events: onScore(total), onLives(n), onLevel(n), onOver(total) */
  function Breakout(canvas, opts) {
    this.c = canvas;
    this.opts = opts || {};
    this.h = 460;
    this.paused = false;
    canvas.width = W;
    canvas.height = this.h;
    this.bindInput();
  }

  Breakout.prototype.bindInput = function () {
    var self = this;
    this.keyHandler = function (e) {
      if (!self.g) return;
      if (e.key === 'ArrowLeft') self.g.px -= 34;
      if (e.key === 'ArrowRight') self.g.px += 34;
      if (e.key === 'p' || e.key === 'P') self.opts.onPauseKey && self.opts.onPauseKey();
    };
    window.addEventListener('keydown', this.keyHandler);
    var move = function (clientX) {
      if (!self.g) return;
      var r = self.c.getBoundingClientRect();
      self.g.px = ((clientX - r.left) / r.width) * W - self.g.pw / 2;
    };
    this.c.onmousemove = function (e) { move(e.clientX); };
    this.c.ontouchmove = function (e) { move(e.touches[0].clientX); e.preventDefault(); };
  };

  Breakout.prototype.start = function (lives, level) {
    var sp = (DIFF[this.opts.difficulty] || DIFF.NORMAL) + (level - 1) * 0.55;
    this.g = {
      pw: 104, px: 268, paddleY: 424, sp: sp, lives: lives, level: level, score: 0,
      ball: { x: 320, y: 330, vx: sp * 0.75, vy: -sp },
      bricks: bricks(this.h, 4), over: false
    };
    if (this.opts.keepScore) this.g.score = this.opts.keepScore;
    this.paused = false;
    this.loop();
  };

  Breakout.prototype.setPaused = function (p) { this.paused = p; };

  Breakout.prototype.stop = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  };

  Breakout.prototype.destroy = function () {
    this.stop();
    window.removeEventListener('keydown', this.keyHandler);
    this.c.onmousemove = null;
    this.c.ontouchmove = null;
    this.g = null;
  };

  Breakout.prototype.loop = function () {
    var self = this;
    this.stop();
    var frame = function () {
      self.raf = requestAnimationFrame(frame);
      if (!self.g || !self.c) return;
      if (!self.paused && !self.g.over) self.step();
      paint(self.c.getContext('2d'), self.h, self.g);
    };
    frame();
  };

  Breakout.prototype.step = function () {
    var g = this.g, b = g.ball, o = this.opts;
    g.px = Math.max(0, Math.min(W - g.pw, g.px));
    b.x += b.vx; b.y += b.vy;
    if (b.x < 8 || b.x > W - 8) { b.vx *= -1; b.x = Math.max(8, Math.min(W - 8, b.x)); }
    if (b.y < 8) { b.vy *= -1; b.y = 8; }
    if (b.y > g.paddleY - 6 && b.y < g.paddleY + 12 && b.x > g.px - 6 && b.x < g.px + g.pw + 6 && b.vy > 0) {
      b.vy = -Math.abs(b.vy);
      b.vx = ((b.x - (g.px + g.pw / 2)) / (g.pw / 2)) * g.sp;
    }
    for (var i = 0; i < g.bricks.length; i++) {
      var k = g.bricks[i];
      if (!k.alive) continue;
      if (b.x > k.x - 6 && b.x < k.x + k.w + 6 && b.y > k.y - 6 && b.y < k.y + k.h + 6) {
        k.alive = false; b.vy *= -1;
        g.score += 120;
        o.onScore && o.onScore(g.score);
        break;
      }
    }
    var left = g.bricks.some(function (k) { return k.alive; });
    if (!left) {
      g.score += 1500;
      o.onScore && o.onScore(g.score);
      var keep = g.score, lives = g.lives, level = g.level + 1;
      this.opts.keepScore = keep;
      this.start(lives, level);
      o.onLevel && o.onLevel(level);
      this.opts.keepScore = 0;
      return;
    }
    if (b.y > this.h - 8) {
      g.lives -= 1;
      if (g.lives <= 0) {
        g.over = true;
        o.onLives && o.onLives(0);
        o.onOver && o.onOver(g.score);
        return;
      }
      o.onLives && o.onLives(g.lives);
      b.x = 320; b.y = 330; b.vy = -Math.abs(g.sp); b.vx = g.sp * 0.7;
    }
  };

  /* Demo automática para la previsualización del detalle (sin interacción). */
  function Demo(canvas) {
    this.c = canvas;
    this.h = 360;
    canvas.width = W;
    canvas.height = this.h;
    this.reset();
    this.loop();
  }

  Demo.prototype.reset = function () {
    this.g = { pw: 104, px: 268, paddleY: 332, sp: 3.1, bricks: bricks(this.h, 3), ball: { x: 320, y: 250, vx: 2.6, vy: -3.1 }, over: false };
  };

  Demo.prototype.stop = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  };

  Demo.prototype.loop = function () {
    var self = this;
    var frame = function () {
      self.raf = requestAnimationFrame(frame);
      var g = self.g, b = g.ball;
      if (!self.c) return;
      b.x += b.vx; b.y += b.vy;
      if (b.x < 7 || b.x > W - 7) { b.vx *= -1; b.x = Math.max(7, Math.min(W - 7, b.x)); }
      if (b.y < 7) { b.vy *= -1; b.y = 7; }
      g.px += ((b.x - g.pw / 2) - g.px) * 0.09;
      g.px = Math.max(0, Math.min(W - g.pw, g.px));
      if (b.y > g.paddleY - 6 && b.y < g.paddleY + 10 && b.x > g.px - 5 && b.x < g.px + g.pw + 5 && b.vy > 0) {
        b.vy = -Math.abs(b.vy);
        b.vx = ((b.x - (g.px + g.pw / 2)) / (g.pw / 2)) * 3.1;
      }
      if (b.y > self.h - 4) { b.x = 320; b.y = 250; b.vy = -3.1; b.vx = 2.6; }
      for (var i = 0; i < g.bricks.length; i++) {
        var k = g.bricks[i];
        if (!k.alive) continue;
        if (b.x > k.x - 5 && b.x < k.x + k.w + 5 && b.y > k.y - 5 && b.y < k.y + k.h + 5) { k.alive = false; b.vy *= -1; break; }
      }
      if (!g.bricks.some(function (k) { return k.alive; })) g.bricks = bricks(self.h, 3);
      paint(self.c.getContext('2d'), self.h, g);
    };
    frame();
  };

  window.AVEngine = { Breakout: Breakout, Demo: Demo, WIDTH: W };
})();

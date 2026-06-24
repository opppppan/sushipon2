// Tiny circular-body 2D physics. Good enough for a Suika-style stacking feel.
// Not a full solver — we do position-based relaxation with a few iterations.
(function () {
  class Body {
    constructor(x, y, r, level) {
      this.x = x; this.y = y;
      this.px = x; this.py = y; // previous (Verlet)
      this.vx = 0; this.vy = 0;
      this.r = r;
      this.level = level;
      this.id = Math.random().toString(36).slice(2);
      this.angle = 0;
      this.angVel = (Math.random() - 0.5) * 0.02;
      this.asleep = false;
      this.merged = false;
      this.age = 0;
      this.spawnProtect = 0; // frames of no-merge after spawn
      this.pop = 0; // visual pulse timer when just created from a merge
    }
  }

  class World {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.bodies = [];
      this.gravity = 0.2;
      this.friction = 0.99;
      this.restitution = 0.18;
      this.groundY = h;
      this.leftX = 0;
      this.rightX = w;
      this.topY = 0;
      this.onMerge = null;
      this.onGameOver = null;
      this.dangerY = 80; // any body above this line triggers game over timer
      this.gameOverTimer = 0;
    }

    add(body) {
      this.bodies.push(body);
      return body;
    }

    step() {
      const g = this.gravity;
      // integrate
      for (const b of this.bodies) {
        if (b.merged) continue;
        b.age++;
        if (b.spawnProtect > 0) b.spawnProtect--;
        if (b.pop > 0) b.pop--;
        const vx = (b.x - b.px) * this.friction;
        const vy = (b.y - b.py) * this.friction;
        b.px = b.x; b.py = b.y;
        b.x += vx;
        b.y += vy + g;
        b.angle += b.angVel;
        b.angVel *= 0.75;
        if (Math.abs(b.angVel) < 0.002) b.angVel = 0;
      }

      // collide & resolve a few iterations
      const ITER = 6;
      for (let k = 0; k < ITER; k++) {
        // pair collisions
        for (let i = 0; i < this.bodies.length; i++) {
          const a = this.bodies[i];
          if (a.merged) continue;
          for (let j = i + 1; j < this.bodies.length; j++) {
            const b = this.bodies[j];
            if (b.merged) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            const rsum = a.r + b.r;
            if (d2 >= rsum * rsum) continue;
            const d = Math.sqrt(d2) || 0.0001;
            const overlap = rsum - d;
            const nx = dx / d;
            const ny = dy / d;
            // push apart proportionally (equal mass)
            a.x -= nx * overlap * 0.5;
            a.y -= ny * overlap * 0.5;
            b.x += nx * overlap * 0.5;
            b.y += ny * overlap * 0.5;
            // add tiny angular velocity based on collision (small + clamped)
            a.angVel = Math.max(-0.08, Math.min(0.08, a.angVel - ny * 0.0003));
            b.angVel = Math.max(-0.08, Math.min(0.08, b.angVel + ny * 0.0003));

            // merge? same level, within almost-touching, not already protected
            if (
              a.level === b.level &&
              a.spawnProtect === 0 && b.spawnProtect === 0 &&
              !a.merged && !b.merged
            ) {
              if (a.level < window.SUSHI_SPRITES.length - 1) {
                // queue merge after resolving
                this._pendingMerges = this._pendingMerges || [];
                this._pendingMerges.push([a, b]);
                a.merged = b.merged = true;
              } else if (this.onMaxClash) {
                // two final-form bodies collide → custom event (shooter mode)
                a.merged = b.merged = true;
                this._pendingClash = [a, b];
              }
            }
          }
          // walls
          if (a.x - a.r < this.leftX) { a.x = this.leftX + a.r; a.px = a.x + (a.x - a.px) * this.restitution; }
          if (a.x + a.r > this.rightX) { a.x = this.rightX - a.r; a.px = a.x + (a.x - a.px) * this.restitution; }
          if (a.y + a.r > this.groundY) {
            a.y = this.groundY - a.r;
            a.py = a.y + (a.y - a.py) * this.restitution;
          }
          // top is "soft" — no reflection, but tracked for game over
        }
      }

      // process max-level clash (shiroi pon x 2)
      if (this._pendingClash) {
        const [a, b] = this._pendingClash;
        this._pendingClash = null;
        this.bodies = this.bodies.filter((x) => !x.merged);
        if (this.onMaxClash) this.onMaxClash(a, b);
      }

      // process merges
      if (this._pendingMerges && this._pendingMerges.length) {
        for (const [a, b] of this._pendingMerges) {
          const nx = (a.x + b.x) / 2;
          const ny = (a.y + b.y) / 2;
          const newLevel = a.level + 1;
          const newSprite = window.SUSHI_SPRITES[newLevel];
          const nb = new Body(nx, ny, newSprite.radius, newLevel);
          nb.spawnProtect = 4;
          nb.pop = 18;
          this.bodies.push(nb);
          if (this.onMerge) this.onMerge(nb, a, b);
        }
        this._pendingMerges.length = 0;
        this.bodies = this.bodies.filter((x) => !x.merged);
      }

      // game over check: any body with age > 60 whose top sits above dangerY
      let over = false;
      for (const b of this.bodies) {
        if (b.age < 60) continue;
        if (b.y - b.r < this.dangerY && Math.abs(b.x - b.px) < 0.4 && Math.abs(b.y - b.py) < 0.4) {
          over = true; break;
        }
      }
      if (over) {
        this.gameOverTimer++;
        if (this.gameOverTimer > 120 && this.onGameOver) {
          this.onGameOver();
          this.gameOverTimer = -99999;
        }
      } else {
        this.gameOverTimer = Math.max(0, this.gameOverTimer - 2);
      }
    }
  }

  window.SushiPhysics = { Body, World };
})();

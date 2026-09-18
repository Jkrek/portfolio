/*
 * nebula.js — dependency-free WebGL GLSL nebula background.
 *
 * Drop-in replacement for the Canvas-2D starfield. One file, no Three.js, no
 * build step — works on file:// and GitHub Pages. Renders a domain-warped fbm
 * nebula in the site palette (cyan / purple / lime on near-black) with a
 * parallax star layer and a subtle mouse drift.
 *
 * Engineering discipline (per the research on award-caliber WebGL):
 *   - DPR capped at 1.5 so 3x phones don't do ~9x the pixel work
 *   - pauses rendering when the tab is hidden (saves battery)
 *   - prefers-reduced-motion  -> renders ONE static frame, no animation loop
 *   - graceful 2D fallback if WebGL is unavailable
 *
 * Usage:
 *   <canvas id="nebula"></canvas>
 *   <script src="nebula.js"></script>
 *   <script>initNebula(document.getElementById('nebula'));</script>
 */
(function (global) {
  'use strict';

  const VERT = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2  u_res;
    uniform float u_time;
    uniform vec2  u_mouse;   // -1..1

    // -- hash / value noise / fbm -----------------------------------------
    float hash(vec2 p){
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 6; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res.xy;
      // aspect-correct, centered coordinates
      vec2 p = (gl_FragCoord.xy - 0.5 * u_res.xy) / u_res.y;
      p += u_mouse * 0.06;                 // gentle parallax toward the cursor
      float t = u_time * 0.025;

      // domain warping -> wispy cloud structure
      vec2 q = vec2(fbm(p * 1.4 + t), fbm(p * 1.4 - t + 5.2));
      vec2 r = vec2(fbm(p * 1.4 + 1.7 * q + t * 1.2),
                    fbm(p * 1.4 + 1.7 * q - t * 0.9));
      float f = fbm(p * 1.4 + 2.0 * r);

      // palette
      vec3 base   = vec3(0.019, 0.023, 0.051);   // #05060d
      vec3 purple = vec3(0.545, 0.361, 0.965);   // #8b5cf6
      vec3 cyan   = vec3(0.133, 0.827, 0.933);   // #22d3ee
      vec3 lime   = vec3(0.639, 0.902, 0.208);   // #a3e635

      vec3 col = base;
      col = mix(col, purple, smoothstep(0.30, 0.80, f) * 0.55);
      col = mix(col, cyan,   smoothstep(0.55, 0.95, f) * clamp(length(q), 0.0, 1.0) * 0.6);
      col += lime * smoothstep(0.88, 1.02, f) * 0.16;

      // faint moving band of denser gas
      col += cyan * 0.05 * smoothstep(0.4, 0.0, abs(p.y - 0.15 * sin(t + p.x)));

      // stars: sparse, twinkling
      vec2 sc = floor(gl_FragCoord.xy / 2.0);
      float s = hash(sc);
      float star = smoothstep(0.9975, 1.0, s);
      star *= 0.4 + 0.6 * sin(u_time * 2.5 + s * 6.2831);
      col += vec3(star) * 0.9;

      // vignette
      col *= 1.0 - 0.55 * length(uv - 0.5);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('[nebula] shader error:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function fallback2D(canvas) {
    // Minimal static starfield if WebGL is unavailable.
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    resize();
    addEventListener('resize', resize);
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#05060d'); g.addColorStop(1, '#0b0d17');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 240; i++) {
      ctx.globalAlpha = Math.random() * 0.7 + 0.2;
      ctx.fillStyle = ['#22d3ee', '#8b5cf6', '#d2e1ff'][i % 3];
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
  }

  function initNebula(canvas, opts) {
    opts = opts || {};
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) { fallback2D(canvas); return { destroy() {} }; }

    const prog = gl.createProgram();
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { fallback2D(canvas); return { destroy() {} }; }
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    gl.useProgram(prog);

    // fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    const DPR = Math.min(window.devicePixelRatio || 1, opts.maxDPR || 1.5);
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    function resize() {
      const w = Math.floor(innerWidth * DPR), h = Math.floor(innerHeight * DPR);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }
    resize();
    addEventListener('resize', resize);

    const onMove = (e) => {
      mouse.tx = (e.clientX / innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / innerHeight) * 2 - 1);
    };
    addEventListener('mousemove', onMove, { passive: true });

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let raf = 0, running = true;

    function frame(now) {
      if (!running) return;
      const t = (now - start) / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!reduced) raf = requestAnimationFrame(frame);
    }

    if (reduced) {
      // one static frame, no loop
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, 12.0);
      gl.uniform2f(uMouse, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else {
      raf = requestAnimationFrame(frame);
    }

    // pause when tab hidden
    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!reduced && !running) { running = true; raf = requestAnimationFrame(frame); }
    };
    document.addEventListener('visibilitychange', onVis);

    return {
      destroy() {
        running = false;
        cancelAnimationFrame(raf);
        removeEventListener('resize', resize);
        removeEventListener('mousemove', onMove);
        document.removeEventListener('visibilitychange', onVis);
      },
    };
  }

  global.initNebula = initNebula;
})(window);

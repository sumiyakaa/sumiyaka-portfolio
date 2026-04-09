/* ========================================
   Navier-Stokes Fluid Simulation
   Ported from AKASHIKI Portfolio v1
   ======================================== */

// ---- Shader Sources (inline) ----

const VS = `attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const ADV_FS = `precision highp float;
varying vec2 v_uv;
uniform sampler2D u_vel;
uniform sampler2D u_src;
uniform vec2 u_ts;
uniform float u_dt;
uniform float u_diss;
void main() {
  vec2 coord = v_uv - u_dt * texture2D(u_vel, v_uv).xy * u_ts;
  gl_FragColor = u_diss * texture2D(u_src, coord);
}`;

const SPL_FS = `precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tgt;
uniform float u_ar;
uniform vec2 u_pt;
uniform vec3 u_clr;
uniform float u_rad;
void main() {
  vec2 p = v_uv - u_pt;
  p.x *= u_ar;
  vec3 s = exp(-dot(p, p) / u_rad) * u_clr;
  gl_FragColor = vec4(texture2D(u_tgt, v_uv).xyz + s, 1.0);
}`;

const CUR_FS = `precision highp float;
varying vec2 v_uv;
uniform sampler2D u_vel;
uniform vec2 u_ts;
void main() {
  float L = texture2D(u_vel, v_uv - vec2(u_ts.x, 0.0)).y;
  float R = texture2D(u_vel, v_uv + vec2(u_ts.x, 0.0)).y;
  float T = texture2D(u_vel, v_uv + vec2(0.0, u_ts.y)).x;
  float B = texture2D(u_vel, v_uv - vec2(0.0, u_ts.y)).x;
  gl_FragColor = vec4(R - L - T + B, 0.0, 0.0, 1.0);
}`;

const VOR_FS = `precision highp float;
varying vec2 v_uv;
uniform sampler2D u_vel;
uniform sampler2D u_curl;
uniform vec2 u_ts;
uniform float u_str;
uniform float u_dt;
void main() {
  float L = texture2D(u_curl, v_uv - vec2(u_ts.x, 0.0)).x;
  float R = texture2D(u_curl, v_uv + vec2(u_ts.x, 0.0)).x;
  float T = texture2D(u_curl, v_uv + vec2(0.0, u_ts.y)).x;
  float B = texture2D(u_curl, v_uv - vec2(0.0, u_ts.y)).x;
  float C = texture2D(u_curl, v_uv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f /= length(f) + 1e-4;
  f *= u_str * C;
  f.y *= -1.0;
  vec2 vel = texture2D(u_vel, v_uv).xy;
  gl_FragColor = vec4(vel + f * u_dt, 0.0, 1.0);
}`;

const DIV_FS = `precision highp float;
varying vec2 v_uv;
uniform sampler2D u_vel;
uniform vec2 u_ts;
void main() {
  float L = texture2D(u_vel, v_uv - vec2(u_ts.x, 0.0)).x;
  float R = texture2D(u_vel, v_uv + vec2(u_ts.x, 0.0)).x;
  float T = texture2D(u_vel, v_uv + vec2(0.0, u_ts.y)).y;
  float B = texture2D(u_vel, v_uv - vec2(0.0, u_ts.y)).y;
  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const PRE_FS = `precision highp float;
varying vec2 v_uv;
uniform sampler2D u_pres;
uniform sampler2D u_div;
uniform vec2 u_ts;
void main() {
  float L = texture2D(u_pres, v_uv - vec2(u_ts.x, 0.0)).x;
  float R = texture2D(u_pres, v_uv + vec2(u_ts.x, 0.0)).x;
  float T = texture2D(u_pres, v_uv + vec2(0.0, u_ts.y)).x;
  float B = texture2D(u_pres, v_uv - vec2(0.0, u_ts.y)).x;
  float D = texture2D(u_div, v_uv).x;
  gl_FragColor = vec4((L + R + B + T - D) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRD_FS = `precision highp float;
varying vec2 v_uv;
uniform sampler2D u_pres;
uniform sampler2D u_vel;
uniform vec2 u_ts;
void main() {
  float L = texture2D(u_pres, v_uv - vec2(u_ts.x, 0.0)).x;
  float R = texture2D(u_pres, v_uv + vec2(u_ts.x, 0.0)).x;
  float T = texture2D(u_pres, v_uv + vec2(0.0, u_ts.y)).x;
  float B = texture2D(u_pres, v_uv - vec2(0.0, u_ts.y)).x;
  vec2 vel = texture2D(u_vel, v_uv).xy;
  gl_FragColor = vec4(vel - 0.5 * vec2(R - L, T - B), 0.0, 1.0);
}`;

function makeDisplayFS(bgBase: number): string {
  return `precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_bri;
void main() {
  float d = texture2D(u_tex, v_uv).x;
  float ink = clamp(d * u_bri, 0.0, 1.0);
  gl_FragColor = vec4(vec3(${bgBase.toFixed(3)} + ink), 1.0);
}`;
}

// ---- Types ----

interface FBO {
  fbo: WebGLFramebuffer;
  tex: WebGLTexture;
}

interface DblFBO {
  r: FBO;
  w: FBO;
  swap(): void;
}

export interface FluidSimConfig {
  resolution?: number;
  brightness?: number;
  velocityDissipation?: number;
  dyeDissipation?: number;
  vorticity?: number;
  pressureIterations?: number;
  bgBase?: number;
}

export interface FluidSimAPI {
  splat(x: number, y: number, forceX: number, forceY: number, density: number, radius: number): void;
  step(dt: number): void;
  destroy(): void;
}

// ---- Main factory ----

type GL = WebGLRenderingContext | WebGL2RenderingContext;

export function createFluidSim(
  canvas: HTMLCanvasElement,
  config?: FluidSimConfig
): FluidSimAPI | null {
  const resolution = config?.resolution ?? 0.5;
  const BRI = config?.brightness ?? 0.35;
  const VEL_DISS = config?.velocityDissipation ?? 0.985;
  const DYE_DISS = config?.dyeDissipation ?? 0.998;
  const VORT = config?.vorticity ?? 30.0;
  const PRES_ITER = config?.pressureIterations ?? 20;
  const bgBase = config?.bgBase ?? 0.0;

  const glOpts: WebGLContextAttributes = {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
  };

  let gl = canvas.getContext("webgl2", glOpts) as GL | null;
  const isGL2 = !!gl;
  if (!gl) gl = canvas.getContext("webgl", glOpts) as GL | null;
  if (!gl) return null;

  // Float texture support
  let halfFloat: number;
  let intFmt: number;
  if (isGL2) {
    (gl as WebGL2RenderingContext).getExtension("EXT_color_buffer_float");
    halfFloat = (gl as WebGL2RenderingContext).HALF_FLOAT;
    intFmt = (gl as WebGL2RenderingContext).RGBA16F;
  } else {
    const hfExt = gl.getExtension("OES_texture_half_float");
    gl.getExtension("OES_texture_half_float_linear");
    if (!hfExt) return null;
    halfFloat = hfExt.HALF_FLOAT_OES;
    intFmt = gl.RGBA;
  }

  // Resolution — use clientWidth or fallback to window dimensions
  const cw = canvas.clientWidth || window.innerWidth;
  const ch = canvas.clientHeight || window.innerHeight;
  const W = Math.max(1, Math.floor(cw * resolution));
  const H = Math.max(1, Math.floor(ch * resolution));
  canvas.width = W;
  canvas.height = H;

  // FBO support test
  const testTex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, testTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, intFmt, 4, 4, 0, gl.RGBA, halfFloat, null);
  const testFBO = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, testFBO);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, testTex, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteTexture(testTex);
    gl.deleteFramebuffer(testFBO);
    return null;
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteTexture(testTex);
  gl.deleteFramebuffer(testFBO);

  // ---- Utilities ----

  function compile(type: number, src: string): WebGLShader {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    return s;
  }

  function mkProg(vs: string, fs: string): WebGLProgram {
    const p = gl!.createProgram()!;
    gl!.attachShader(p, compile(gl!.VERTEX_SHADER, vs));
    gl!.attachShader(p, compile(gl!.FRAGMENT_SHADER, fs));
    gl!.linkProgram(p);
    return p;
  }

  function ulocs(p: WebGLProgram, names: string[]): Record<string, WebGLUniformLocation | null> {
    const u: Record<string, WebGLUniformLocation | null> = {};
    for (const n of names) u[n] = gl!.getUniformLocation(p, n);
    return u;
  }

  // Fullscreen quad
  const qBuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, qBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  function use(p: WebGLProgram): void {
    gl!.useProgram(p);
    const loc = gl!.getAttribLocation(p, "a_position");
    gl!.bindBuffer(gl!.ARRAY_BUFFER, qBuf);
    gl!.enableVertexAttribArray(loc);
    gl!.vertexAttribPointer(loc, 2, gl!.FLOAT, false, 0, 0);
  }

  function texBind(unit: number, t: WebGLTexture): void {
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, t);
  }

  function blit(fbo: WebGLFramebuffer | null): void {
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.viewport(0, 0, W, H);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  // FBO creation
  function createFBO(): FBO {
    const t = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, t);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, intFmt, W, H, 0, gl!.RGBA, halfFloat, null);
    const f = gl!.createFramebuffer()!;
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, f);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, t, 0);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    return { fbo: f, tex: t };
  }

  function createDblFBO(): DblFBO {
    const a = createFBO();
    const b = createFBO();
    return {
      r: a,
      w: b,
      swap() {
        const tmp = this.r;
        this.r = this.w;
        this.w = tmp;
      },
    };
  }

  // ---- Programs ----
  const dspFS = makeDisplayFS(bgBase);

  const pAdv = mkProg(VS, ADV_FS);
  const uAdv = ulocs(pAdv, ["u_vel", "u_src", "u_ts", "u_dt", "u_diss"]);

  const pSpl = mkProg(VS, SPL_FS);
  const uSpl = ulocs(pSpl, ["u_tgt", "u_ar", "u_pt", "u_clr", "u_rad"]);

  const pCur = mkProg(VS, CUR_FS);
  const uCur = ulocs(pCur, ["u_vel", "u_ts"]);

  const pVor = mkProg(VS, VOR_FS);
  const uVor = ulocs(pVor, ["u_vel", "u_curl", "u_ts", "u_str", "u_dt"]);

  const pDiv = mkProg(VS, DIV_FS);
  const uDiv = ulocs(pDiv, ["u_vel", "u_ts"]);

  const pPre = mkProg(VS, PRE_FS);
  const uPre = ulocs(pPre, ["u_pres", "u_div", "u_ts"]);

  const pGrd = mkProg(VS, GRD_FS);
  const uGrd = ulocs(pGrd, ["u_pres", "u_vel", "u_ts"]);

  const pDsp = mkProg(VS, dspFS);
  const uDsp = ulocs(pDsp, ["u_tex", "u_bri"]);

  // ---- FBOs ----
  const velFB = createDblFBO();
  const dyeFB = createDblFBO();
  const curFB = createFBO();
  const divFB = createFBO();
  const preFB = createDblFBO();

  // ---- Constants ----
  const ts: [number, number] = [1.0 / W, 1.0 / H];
  const ar = W / H;

  // ---- Splat ----
  function addSplat(target: DblFBO, x: number, y: number, cx: number, cy: number, cz: number, radius: number): void {
    use(pSpl);
    texBind(0, target.r.tex);
    gl!.uniform1i(uSpl.u_tgt, 0);
    gl!.uniform1f(uSpl.u_ar, ar);
    gl!.uniform2f(uSpl.u_pt, x, y);
    gl!.uniform3f(uSpl.u_clr, cx, cy, cz);
    gl!.uniform1f(uSpl.u_rad, radius);
    blit(target.w.fbo);
    target.swap();
  }

  // ---- Simulation step ----
  function simStep(dt: number): void {
    // 1. Curl
    use(pCur);
    texBind(0, velFB.r.tex);
    gl!.uniform1i(uCur.u_vel, 0);
    gl!.uniform2f(uCur.u_ts, ts[0], ts[1]);
    blit(curFB.fbo);

    // 2. Vorticity Confinement
    use(pVor);
    texBind(0, velFB.r.tex);
    texBind(1, curFB.tex);
    gl!.uniform1i(uVor.u_vel, 0);
    gl!.uniform1i(uVor.u_curl, 1);
    gl!.uniform2f(uVor.u_ts, ts[0], ts[1]);
    gl!.uniform1f(uVor.u_str, VORT);
    gl!.uniform1f(uVor.u_dt, dt);
    blit(velFB.w.fbo);
    velFB.swap();

    // 3. Divergence
    use(pDiv);
    texBind(0, velFB.r.tex);
    gl!.uniform1i(uDiv.u_vel, 0);
    gl!.uniform2f(uDiv.u_ts, ts[0], ts[1]);
    blit(divFB.fbo);

    // 4. Pressure Solve (Jacobi iteration)
    use(pPre);
    gl!.uniform2f(uPre.u_ts, ts[0], ts[1]);
    for (let i = 0; i < PRES_ITER; i++) {
      texBind(0, preFB.r.tex);
      texBind(1, divFB.tex);
      gl!.uniform1i(uPre.u_pres, 0);
      gl!.uniform1i(uPre.u_div, 1);
      blit(preFB.w.fbo);
      preFB.swap();
    }

    // 5. Gradient Subtract
    use(pGrd);
    texBind(0, preFB.r.tex);
    texBind(1, velFB.r.tex);
    gl!.uniform1i(uGrd.u_pres, 0);
    gl!.uniform1i(uGrd.u_vel, 1);
    gl!.uniform2f(uGrd.u_ts, ts[0], ts[1]);
    blit(velFB.w.fbo);
    velFB.swap();

    // 6. Advect Velocity
    use(pAdv);
    texBind(0, velFB.r.tex);
    texBind(1, velFB.r.tex);
    gl!.uniform1i(uAdv.u_vel, 0);
    gl!.uniform1i(uAdv.u_src, 1);
    gl!.uniform2f(uAdv.u_ts, ts[0], ts[1]);
    gl!.uniform1f(uAdv.u_dt, dt);
    gl!.uniform1f(uAdv.u_diss, VEL_DISS);
    blit(velFB.w.fbo);
    velFB.swap();

    // 7. Advect Dye
    texBind(0, velFB.r.tex);
    texBind(1, dyeFB.r.tex);
    gl!.uniform1i(uAdv.u_vel, 0);
    gl!.uniform1i(uAdv.u_src, 1);
    gl!.uniform1f(uAdv.u_diss, DYE_DISS);
    blit(dyeFB.w.fbo);
    dyeFB.swap();
  }

  // ---- Display ----
  function display(): void {
    use(pDsp);
    texBind(0, dyeFB.r.tex);
    gl!.uniform1i(uDsp.u_tex, 0);
    gl!.uniform1f(uDsp.u_bri, BRI);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, W, H);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  // ---- Public API ----
  return {
    splat(x, y, forceX, forceY, density, radius) {
      addSplat(velFB, x, y, forceX, forceY, 0, radius);
      addSplat(dyeFB, x, y, density, 0, 0, radius);
    },
    step(dt) {
      simStep(dt);
      display();
    },
    destroy() {
      const ext = gl!.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
    },
  };
}

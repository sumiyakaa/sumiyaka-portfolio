/* ========================================
   墨塵（ぼくじん）— GPU 粒子シミュレーション（WebGL2）
   ----------------------------------------
   数万粒の墨の粒が暗い紙の上を漂い、誰も触らないのに集まって題字を書き上げ、
   文字として静止する。マウスで吹き散らしてもまた戻る。

   構成
   - 状態（位置 xy・速度 xy）は ping-pong の FBO テクスチャ（幅 256 × 行数）。
       EXT_color_buffer_float あり → RGBA32F 1枚に (x, y, vx, vy)
       なし                        → RGBA8 2枚（位置・速度）に 16bit 固定小数点を
                                      2ch へ分割して書く（MRT で同時出力）
   - 目標（題字の画素）は RGBA32F の静的テクスチャ (tx, ty, 書き順, 種)。
     読むだけなので拡張は不要（WebGL2 コアの float テクスチャ）。
   - 力：① curl noise の流れ場（漂い）② 目標への引力（seek＝墨の流れ込み）
         ③ マウス反発（吹く）④ クリックの破裂 ⑤ 漂う粒の保護帯反発 ⑥ スクロール退場 ⑦ 減衰
   - 描画：gl.POINTS の柔らかいスプライトを「軌跡バッファ」（R16F・減衰付き）へ加算し、
     表示パスでトーンカーブ 1−exp(−x) を掛けて暖色白で紙の上へ合成する。
     軌跡バッファは css 解像度 × min(dpr,2) × 0.7＝墨の柔らかさとフィルレート節約。
   - 座標系は u 空間（x∈[0,aspect]・y∈[0,1] 下向き）＝距離が等方。
   - 可読性の防御①：粒の輝度は速度・定着・トーンカーブで上限が決まり、定着後の内側の粒は
     DOM の題字の下へ沈む（縁だけ薄く残る）。
   ======================================== */

export const TEX_W = 256;
/** 粒子数の段階（256 の倍数）。端末の実測 fps で drawCount を下げる */
export const BOKUJIN_TIERS = [8192, 16384, 32768, 49152, 61440] as const;

export interface BokujinTargetSet {
  /** u 空間の目標座標（2 × count） */
  pos: Float32Array;
  /** 書き順 0..1 */
  order: Float32Array;
  /** 縁=1 / 内側=0 */
  edge: Uint8Array;
  count: number;
}

export interface BokujinFrame {
  dt: number;
  time: number;
  /** 書き順の掃引 0..1 */
  phase: number;
  /** 定着後の減光 0..1 */
  settle: number;
  /** スクロール退場 0..1 */
  exit: number;
  /** 全体フェード 0..1 */
  alpha: number;
  /** マウス（u 空間）・on=1 で有効 */
  mouseX: number;
  mouseY: number;
  mouseOn: number;
  /** クリックの破裂（u 空間・強さ 0..1） */
  burstX: number;
  burstY: number;
  burstK: number;
  /** 灯（u 空間 [x, y, I] × 3） */
  lights: Float32Array;
}

export interface BokujinSimOptions {
  /** 粒子の容量（256 の倍数へ切り上げ・上限 65536） */
  count: number;
  dpr: number;
  /** 8bit 分割経路を強制（検証用） */
  forcePacked?: boolean;
  /** 墨の色（0-1 RGB・暖色白） */
  tint?: [number, number, number];
}

export interface BokujinSimAPI {
  readonly capacity: number;
  readonly packed: boolean;
  /** 実際に更新・描画する粒の数（先頭から）。段階調整で下げる */
  drawCount: number;
  setTargets(t: BokujinTargetSet | null): void;
  resize(cssW: number, cssH: number, dpr: number): void;
  step(f: BokujinFrame): void;
  isLost(): boolean;
  destroy(): void;
}

/* ---------------- Shaders ---------------- */

const PACK_GLSL = `
const float POS_LO = -0.4;
const float POS_SPAN = 3.2;
const float VEL_LO = -5.0;
const float VEL_SPAN = 10.0;
vec2 pack16(float v) {
  float s = floor(clamp(v, 0.0, 1.0) * 65535.0 + 0.5);
  float hi = floor(s / 256.0);
  float lo = s - hi * 256.0;
  return vec2(hi, lo) / 255.0;
}
float unpack16(vec2 c) {
  return (floor(c.x * 255.0 + 0.5) * 256.0 + floor(c.y * 255.0 + 0.5)) / 65535.0;
}
vec2 unpackPos(vec4 c) { return vec2(unpack16(c.xy), unpack16(c.zw)) * POS_SPAN + POS_LO; }
vec2 unpackVel(vec4 c) { return vec2(unpack16(c.xy), unpack16(c.zw)) * VEL_SPAN + VEL_LO; }
vec4 packPos(vec2 p) { vec2 n = (p - POS_LO) / POS_SPAN; return vec4(pack16(n.x), pack16(n.y)); }
vec4 packVel(vec2 v) { vec2 n = (v - VEL_LO) / VEL_SPAN; return vec4(pack16(n.x), pack16(n.y)); }
`;

const FULL_VS = `#version 300 es
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const SIM_FS = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
__DEFINES__
#ifdef PACKED
uniform sampler2D u_pos;
uniform sampler2D u_vel;
layout(location = 0) out vec4 o_pos;
layout(location = 1) out vec4 o_vel;
#else
uniform sampler2D u_state;
out vec4 o_state;
#endif
uniform sampler2D u_tA;
uniform sampler2D u_tB;
uniform float u_dt;
uniform float u_time;
uniform float u_phase;
uniform float u_settle;
uniform float u_exit;
uniform float u_aspect;
uniform float u_hasT;
uniform vec3 u_mouse;
uniform vec3 u_burst;
uniform vec4 u_band;
${PACK_GLSL}
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  return vnoise(p) * 0.62 + vnoise(p * 2.03 + 7.3) * 0.26 + vnoise(p * 4.11 + 3.1) * 0.12;
}
vec2 curl(vec2 p) {
  const float e = 0.03;
  float n1 = fbm(p + vec2(0.0, e));
  float n2 = fbm(p - vec2(0.0, e));
  float n3 = fbm(p + vec2(e, 0.0));
  float n4 = fbm(p - vec2(e, 0.0));
  return vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
}
void main() {
  ivec2 tc = ivec2(gl_FragCoord.xy);
#ifdef PACKED
  vec2 p = unpackPos(texelFetch(u_pos, tc, 0));
  vec2 v = unpackVel(texelFetch(u_vel, tc, 0));
#else
  vec4 s = texelFetch(u_state, tc, 0);
  vec2 p = s.xy;
  vec2 v = s.zw;
#endif
  vec4 ta = texelFetch(u_tA, tc, 0);
  vec4 tb = texelFetch(u_tB, tc, 0);
  vec2 tg = ta.xy;
  float order = ta.z;
  float seed = ta.w;
  float kind = tb.x;
  float gainVar = tb.z;
  float dt = u_dt;

  bool glyph = kind < 0.5 && u_hasT > 0.5;
  float g = glyph ? smoothstep(order - 0.10, order + 0.03, u_phase) : 0.0;
  g *= 1.0 - u_exit;

  /* ① 流れ場＝漂い（定着に近づくほど弱く） */
  vec2 fl = curl(p * 1.25 + vec2(seed * 3.0, -seed * 2.0) + u_time * 0.05);
  float flowAmp = mix(0.14, 0.015, g) * (1.0 - 0.7 * u_settle * g);
  v += fl * flowAmp * dt;

  /* ② 目標への引力＝題字へ流れ込む。遠いあいだは接線方向へ回り込む（墨の流れ） */
  if (g > 0.0) {
    vec2 d = tg - p;
    float dist = length(d);
    float gain = (9.0 + 6.0 * gainVar) * g;
    if (u_mouse.z > 0.5) {
      float dm = distance(p, u_mouse.xy);
      gain *= 1.0 - 0.75 * exp(-dm * dm / 0.012);
    }
    vec2 desired = d * gain;
    float dl = length(desired);
    const float vmax = 3.2;
    if (dl > vmax) desired *= vmax / dl;
    vec2 perp = vec2(-d.y, d.x) / max(dist, 1e-4);
    desired += perp * (seed - 0.5) * 2.2 * smoothstep(0.0, 0.35, dist) * min(dl, vmax);
    v = mix(v, desired, clamp(dt * 9.0 * g, 0.0, 1.0));
  }

  /* ③ マウス反発＝吹く（控えめ・離れれば②で戻る） */
  if (u_mouse.z > 0.5) {
    vec2 dm = p - u_mouse.xy;
    float dd = length(dm);
    float f = exp(-dd * dd / 0.009);
    v += (dm / max(dd, 1e-4)) * f * 3.4 * dt;
  }

  /* ④ クリック＝一瞬の破裂 */
  if (u_burst.z > 0.001) {
    vec2 db = p - u_burst.xy;
    float dd = length(db);
    float f = exp(-dd * dd / 0.08) * u_burst.z;
    v += (db / max(dd, 1e-4)) * f * 12.0 * dt;
  }

  /* ⑤ 漂う粒は題字・宣言の帯へ入らない（可読性の防御②） */
  if (!glyph) {
    vec2 c = (u_band.xy + u_band.zw) * 0.5;
    vec2 h = (u_band.zw - u_band.xy) * 0.5;
    vec2 q = abs(p - c) - h;
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    const float m = 0.1;
    if (sd < m) {
      vec2 away = p - c;
      away = away / max(length(away), 1e-4);
      v += away * (1.0 - max(sd, 0.0) / m) * 0.9 * dt;
    }
    v.y -= 0.01 * dt;
  }

  /* ⑥ スクロール退場＝上へ流れ去る */
  v.y -= u_exit * u_exit * 2.4 * dt;
  v.x += u_exit * fl.x * 0.3 * dt;

  /* ⑦ 減衰（定着した粒ほど強く＝墨が紙に定着する） */
  float damp = mix(2.2, 12.0, g);
  v *= exp(-damp * dt);
  float sp = length(v);
  if (sp > 4.0) v *= 4.0 / sp;

  p += v * dt;

  if (g < 0.02) {
    if (p.x < -0.08) p.x += u_aspect + 0.16;
    if (p.x > u_aspect + 0.08) p.x -= u_aspect + 0.16;
    if (p.y < -0.08) p.y += 1.16;
    if (p.y > 1.08) p.y -= 1.16;
  } else {
    p = clamp(p, vec2(-0.3), vec2(u_aspect + 0.3, 1.3));
  }

#ifdef PACKED
  o_pos = packPos(p);
  o_vel = packVel(v);
#else
  o_state = vec4(p, v);
#endif
}`;

const POINT_VS = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
__DEFINES__
#ifdef PACKED
uniform sampler2D u_pos;
uniform sampler2D u_vel;
#else
uniform sampler2D u_state;
#endif
uniform sampler2D u_tA;
uniform sampler2D u_tB;
uniform float u_aspect;
uniform float u_scale;
uniform float u_settle;
uniform float u_exit;
uniform float u_alpha;
uniform float u_time;
uniform float u_hasT;
uniform vec3 u_l0;
uniform vec3 u_l1;
uniform vec3 u_l2;
out float v_a;
${PACK_GLSL}
float lit(vec3 L, vec2 p) {
  float d = distance(p, L.xy);
  return L.z * exp(-d * d * 2.4);
}
void main() {
  int id = gl_VertexID;
  ivec2 tc = ivec2(id % ${TEX_W}, id / ${TEX_W});
#ifdef PACKED
  vec2 p = unpackPos(texelFetch(u_pos, tc, 0));
  vec2 v = unpackVel(texelFetch(u_vel, tc, 0));
#else
  vec4 s = texelFetch(u_state, tc, 0);
  vec2 p = s.xy;
  vec2 v = s.zw;
#endif
  vec4 ta = texelFetch(u_tA, tc, 0);
  vec4 tb = texelFetch(u_tB, tc, 0);
  float seed = ta.w;
  float kind = tb.x;
  float edge = tb.y;
  bool glyph = kind < 0.5 && u_hasT > 0.5;
  float speed = length(v);

  /* 呼吸：定着した縁の粒は目標の周りでわずかに揺れる（物理でなく描画側） */
  float near = glyph ? 1.0 - smoothstep(0.002, 0.012, distance(p, ta.xy)) : 0.0;
  vec2 br = vec2(sin(u_time * 1.7 + seed * 41.0), cos(u_time * 1.3 + seed * 23.0))
          * 0.0012 * u_settle * near * (0.4 + edge);
  vec2 q = p + br;
  gl_Position = vec4(q.x / u_aspect * 2.0 - 1.0, 1.0 - q.y * 2.0, 0.0, 1.0);

  float size = glyph ? 1.7 * (0.75 + 0.5 * seed) : 2.4 * (0.6 + 0.8 * seed);
  size *= 1.0 + 0.25 * u_settle * edge * near;
  gl_PointSize = max(1.0, size * u_scale);

  /* 明るさ＝灯からの距離の減衰 × 速度（速いほど淡く・止まると濃い） */
  float L = 0.42 + 0.58 * min(1.0, lit(u_l0, q) + lit(u_l1, q) + lit(u_l2, q));
  float calm = 1.0 - smoothstep(0.1, 1.4, speed);
  float a = (glyph ? 0.5 : 0.2) * L * mix(0.45, 1.0, calm);
  /* 定着後：内側の粒は DOM の題字の下へ沈み、縁だけ薄く残る。吹かれて離れた粒は見える */
  a *= mix(1.0, mix(0.12, 0.55, edge), u_settle * near);
  a *= 1.0 - u_exit * 0.85;
  v_a = a * u_alpha;
}`;

const POINT_FS = `#version 300 es
precision mediump float;
in float v_a;
out vec4 o;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float d = dot(q, q);
  if (d > 1.0) discard;
  float k = 1.0 - d;
  k *= k;
  o = vec4(v_a * k);
}`;

const DECAY_FS = `#version 300 es
precision mediump float;
uniform float u_a;
out vec4 o;
void main() { o = vec4(0.0, 0.0, 0.0, u_a); }`;

const SUB_FS = `#version 300 es
precision mediump float;
uniform float u_e;
out vec4 o;
void main() { o = vec4(u_e); }`;

const DISPLAY_FS = `#version 300 es
precision mediump float;
uniform sampler2D u_trail;
uniform vec3 u_tint;
uniform float u_expo;
in vec2 v_uv;
out vec4 o;
void main() {
  float x = texture(u_trail, v_uv).r;
  float c = 1.0 - exp(-x * u_expo);
  o = vec4(u_tint * c, c);
}`;

/* ---------------- Factory ---------------- */

type Uniforms = Record<string, WebGLUniformLocation | null>;

export function createBokujinSim(
  canvas: HTMLCanvasElement,
  opts: BokujinSimOptions
): BokujinSimAPI | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  }) as WebGL2RenderingContext | null;
  if (!gl || gl.isContextLost()) return null;

  const floatExt = gl.getExtension("EXT_color_buffer_float");
  const packed = !floatExt || !!opts.forcePacked;
  const TINT = opts.tint ?? [0.945, 0.918, 0.925];

  const capacity = Math.min(65536, Math.max(TEX_W, Math.ceil(opts.count / TEX_W) * TEX_W));
  const texH = capacity / TEX_W;

  let lost = false;
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
  };
  canvas.addEventListener("webglcontextlost", onLost);

  const disposables: (() => void)[] = [() => canvas.removeEventListener("webglcontextlost", onLost)];

  /* ---- utilities ---- */
  function compile(type: number, src: string): WebGLShader | null {
    const s = gl!.createShader(type);
    if (!s) return null;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
      gl!.deleteShader(s);
      return null;
    }
    return s;
  }
  function program(vs: string, fs: string): WebGLProgram | null {
    const v = compile(gl!.VERTEX_SHADER, vs);
    const f = compile(gl!.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p = gl!.createProgram();
    if (!p) return null;
    gl!.attachShader(p, v);
    gl!.attachShader(p, f);
    gl!.linkProgram(p);
    gl!.deleteShader(v);
    gl!.deleteShader(f);
    if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) {
      gl!.deleteProgram(p);
      return null;
    }
    disposables.push(() => gl!.deleteProgram(p));
    return p;
  }
  function ulocs(p: WebGLProgram, names: string[]): Uniforms {
    const u: Uniforms = {};
    for (const n of names) u[n] = gl!.getUniformLocation(p, n);
    return u;
  }
  function makeTex(
    internal: number,
    w: number,
    h: number,
    format: number,
    type: number,
    data: ArrayBufferView | null,
    filter: number
  ): WebGLTexture | null {
    const t = gl!.createTexture();
    if (!t) return null;
    gl!.bindTexture(gl!.TEXTURE_2D, t);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, filter);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, filter);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
    disposables.push(() => gl!.deleteTexture(t));
    return t;
  }
  function fboOf(texs: WebGLTexture[]): WebGLFramebuffer | null {
    const f = gl!.createFramebuffer();
    if (!f) return null;
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, f);
    const bufs: number[] = [];
    texs.forEach((t, i) => {
      gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0 + i, gl!.TEXTURE_2D, t, 0);
      bufs.push(gl!.COLOR_ATTACHMENT0 + i);
    });
    if (texs.length > 1) gl!.drawBuffers(bufs);
    const ok = gl!.checkFramebufferStatus(gl!.FRAMEBUFFER) === gl!.FRAMEBUFFER_COMPLETE;
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    if (!ok) {
      gl!.deleteFramebuffer(f);
      return null;
    }
    disposables.push(() => gl!.deleteFramebuffer(f));
    return f;
  }
  function fail(): null {
    disposables.forEach((d) => d());
    disposables.length = 0;
    return null;
  }

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

  /* ---- programs ---- */
  const defines = packed ? "#define PACKED 1" : "";
  const pSim = program(FULL_VS, SIM_FS.replace("__DEFINES__", defines));
  const pPoint = program(POINT_VS.replace("__DEFINES__", defines), POINT_FS);
  const pDecay = program(FULL_VS, DECAY_FS);
  const pSub = program(FULL_VS, SUB_FS);
  const pDisp = program(FULL_VS, DISPLAY_FS);
  if (!pSim || !pPoint || !pDecay || !pSub || !pDisp) return fail();

  const uSim = ulocs(pSim, [
    "u_state", "u_pos", "u_vel", "u_tA", "u_tB", "u_dt", "u_time", "u_phase", "u_settle",
    "u_exit", "u_aspect", "u_hasT", "u_mouse", "u_burst", "u_band",
  ]);
  const uPoint = ulocs(pPoint, [
    "u_state", "u_pos", "u_vel", "u_tA", "u_tB", "u_aspect", "u_scale", "u_settle", "u_exit",
    "u_alpha", "u_time", "u_hasT", "u_l0", "u_l1", "u_l2",
  ]);
  const uDecay = ulocs(pDecay, ["u_a"]);
  const uSub = ulocs(pSub, ["u_e"]);
  const uDisp = ulocs(pDisp, ["u_trail", "u_tint", "u_expo"]);

  const vao = gl.createVertexArray();
  if (!vao) return fail();
  disposables.push(() => gl.deleteVertexArray(vao));

  /* ---- 粒の固定属性と初期状態 ---- */
  let aspect = Math.max(0.2, (canvas.clientWidth || window.innerWidth) / (canvas.clientHeight || window.innerHeight));
  const seedArr = new Float32Array(capacity);
  const kindArr = new Uint8Array(capacity);
  const gainArr = new Float32Array(capacity);
  const spawnX = new Float32Array(capacity);
  const spawnY = new Float32Array(capacity);
  for (let i = 0; i < capacity; i++) {
    seedArr[i] = Math.random();
    kindArr[i] = i % 6 === 5 ? 1 : 0; // 1/6 は漂う粒（題字に集まらない）
    gainArr[i] = Math.random();
    spawnX[i] = Math.random() * aspect;
    spawnY[i] = Math.random();
  }

  const POS_LO = -0.4;
  const POS_SPAN = 3.2;
  const VEL_LO = -5.0;
  const VEL_SPAN = 10.0;
  function pack16(v: number, out: Uint8Array, at: number) {
    const s = Math.round(Math.min(1, Math.max(0, v)) * 65535);
    out[at] = s >> 8;
    out[at + 1] = s & 255;
  }

  interface StateBuf {
    fbo: WebGLFramebuffer;
    texs: WebGLTexture[];
  }
  function makeState(): StateBuf | null {
    if (!packed) {
      const data = new Float32Array(capacity * 4);
      for (let i = 0; i < capacity; i++) {
        data[i * 4] = spawnX[i];
        data[i * 4 + 1] = spawnY[i];
        data[i * 4 + 2] = (Math.random() - 0.5) * 0.06;
        data[i * 4 + 3] = (Math.random() - 0.5) * 0.06;
      }
      const t = makeTex(gl!.RGBA32F, TEX_W, texH, gl!.RGBA, gl!.FLOAT, data, gl!.NEAREST);
      if (!t) return null;
      const f = fboOf([t]);
      if (!f) return null;
      return { fbo: f, texs: [t] };
    }
    const pd = new Uint8Array(capacity * 4);
    const vd = new Uint8Array(capacity * 4);
    for (let i = 0; i < capacity; i++) {
      pack16((spawnX[i] - POS_LO) / POS_SPAN, pd, i * 4);
      pack16((spawnY[i] - POS_LO) / POS_SPAN, pd, i * 4 + 2);
      pack16(((Math.random() - 0.5) * 0.06 - VEL_LO) / VEL_SPAN, vd, i * 4);
      pack16(((Math.random() - 0.5) * 0.06 - VEL_LO) / VEL_SPAN, vd, i * 4 + 2);
    }
    const tp = makeTex(gl!.RGBA8, TEX_W, texH, gl!.RGBA, gl!.UNSIGNED_BYTE, pd, gl!.NEAREST);
    const tv = makeTex(gl!.RGBA8, TEX_W, texH, gl!.RGBA, gl!.UNSIGNED_BYTE, vd, gl!.NEAREST);
    if (!tp || !tv) return null;
    const f = fboOf([tp, tv]);
    if (!f) return null;
    return { fbo: f, texs: [tp, tv] };
  }
  const stateA = makeState();
  const stateB = makeState();
  if (!stateA || !stateB) return fail();
  let read = stateA;
  let write = stateB;

  /* ---- 目標テクスチャ ---- */
  const tA = makeTex(gl.RGBA32F, TEX_W, texH, gl.RGBA, gl.FLOAT, null, gl.NEAREST);
  const tB = makeTex(gl.RGBA8, TEX_W, texH, gl.RGBA, gl.UNSIGNED_BYTE, null, gl.NEAREST);
  if (!tA || !tB) return fail();
  let hasT = 0;
  const band = new Float32Array([-1, -1, -1, -1]);

  function setTargets(t: BokujinTargetSet | null) {
    if (lost) return;
    const A = new Float32Array(capacity * 4);
    const B = new Uint8Array(capacity * 4);
    let perm: Uint32Array | null = null;
    if (t && t.count > 0) {
      perm = new Uint32Array(t.count);
      for (let i = 0; i < t.count; i++) perm[i] = i;
      for (let i = t.count - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = perm[i];
        perm[i] = perm[j];
        perm[j] = tmp;
      }
    }
    let gi = 0;
    for (let i = 0; i < capacity; i++) {
      let tx = spawnX[i];
      let ty = spawnY[i];
      let order = 0;
      let edge = 0;
      if (kindArr[i] === 0 && perm && t) {
        const j = perm[gi % t.count];
        // 同じ目標を複数の粒が共有するときの散らし（±0.4px 相当）
        const lap = Math.floor(gi / t.count);
        const jx = lap ? (seedArr[i] - 0.5) * 0.0008 : 0;
        const jy = lap ? (gainArr[i] - 0.5) * 0.0008 : 0;
        gi++;
        tx = t.pos[j * 2] + jx;
        ty = t.pos[j * 2 + 1] + jy;
        order = t.order[j];
        edge = t.edge[j];
      }
      A[i * 4] = tx;
      A[i * 4 + 1] = ty;
      A[i * 4 + 2] = order;
      A[i * 4 + 3] = seedArr[i];
      B[i * 4] = kindArr[i] * 255;
      B[i * 4 + 1] = edge * 255;
      B[i * 4 + 2] = Math.round(gainArr[i] * 255);
      B[i * 4 + 3] = 0;
    }
    gl!.bindTexture(gl!.TEXTURE_2D, tA);
    gl!.texSubImage2D(gl!.TEXTURE_2D, 0, 0, 0, TEX_W, texH, gl!.RGBA, gl!.FLOAT, A);
    gl!.bindTexture(gl!.TEXTURE_2D, tB);
    gl!.texSubImage2D(gl!.TEXTURE_2D, 0, 0, 0, TEX_W, texH, gl!.RGBA, gl!.UNSIGNED_BYTE, B);
    hasT = t && t.count > 0 ? 1 : 0;
  }
  setTargets(null);

  /* ---- 軌跡バッファ ---- */
  let trailTex: WebGLTexture | null = null;
  let trailFbo: WebGLFramebuffer | null = null;
  let trail8 = false;
  let trailW = 1;
  let trailH = 1;
  let pointScale = 1;
  const trailDisposers: (() => void)[] = [];

  function makeTrail(w: number, h: number): boolean {
    trailDisposers.forEach((d) => d());
    trailDisposers.length = 0;
    trailTex = null;
    trailFbo = null;
    const tries: { internal: number; format: number; type: number; eight: boolean }[] = packed
      ? [
          { internal: gl!.R8, format: gl!.RED, type: gl!.UNSIGNED_BYTE, eight: true },
          { internal: gl!.RGBA8, format: gl!.RGBA, type: gl!.UNSIGNED_BYTE, eight: true },
        ]
      : [
          { internal: gl!.R16F, format: gl!.RED, type: gl!.HALF_FLOAT, eight: false },
          { internal: gl!.RGBA16F, format: gl!.RGBA, type: gl!.HALF_FLOAT, eight: false },
          { internal: gl!.R8, format: gl!.RED, type: gl!.UNSIGNED_BYTE, eight: true },
          { internal: gl!.RGBA8, format: gl!.RGBA, type: gl!.UNSIGNED_BYTE, eight: true },
        ];
    for (const tr of tries) {
      const t = gl!.createTexture();
      if (!t) continue;
      gl!.bindTexture(gl!.TEXTURE_2D, t);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, tr.internal, w, h, 0, tr.format, tr.type, null);
      const f = gl!.createFramebuffer();
      if (!f) {
        gl!.deleteTexture(t);
        continue;
      }
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, f);
      gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, t, 0);
      const ok = gl!.checkFramebufferStatus(gl!.FRAMEBUFFER) === gl!.FRAMEBUFFER_COMPLETE;
      if (ok) {
        gl!.clearColor(0, 0, 0, 0);
        gl!.clear(gl!.COLOR_BUFFER_BIT);
      }
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      if (!ok) {
        gl!.deleteFramebuffer(f);
        gl!.deleteTexture(t);
        continue;
      }
      trailTex = t;
      trailFbo = f;
      trail8 = tr.eight;
      trailDisposers.push(() => {
        gl!.deleteFramebuffer(f);
        gl!.deleteTexture(t);
      });
      return true;
    }
    return false;
  }

  function resize(cssW: number, cssH: number, dpr: number) {
    if (lost) return;
    const w = Math.max(1, cssW);
    const h = Math.max(1, cssH);
    aspect = w / h;
    const s = Math.min(dpr || 1, 2) * 0.7;
    trailW = Math.max(1, Math.round(w * s));
    trailH = Math.max(1, Math.round(h * s));
    canvas.width = trailW;
    canvas.height = trailH;
    pointScale = trailW / w;
    if (!makeTrail(trailW, trailH)) lost = true;
  }
  resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, opts.dpr);
  if (lost) return fail();

  /* ---- step ---- */
  const api: BokujinSimAPI = {
    capacity,
    packed,
    drawCount: capacity,
    setTargets,
    resize,
    isLost: () => lost || gl.isContextLost(),
    step(f: BokujinFrame) {
      if (lost || gl.isContextLost()) {
        lost = true;
        return;
      }
      const n = Math.max(TEX_W, Math.min(capacity, Math.ceil(api.drawCount / TEX_W) * TEX_W));
      const rows = n / TEX_W;
      gl.bindVertexArray(vao);

      /* 1. 状態更新（ping-pong） */
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.fbo);
      gl.viewport(0, 0, TEX_W, rows);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, 0, TEX_W, rows);
      gl.useProgram(pSim);
      if (packed) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, read.texs[0]);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, read.texs[1]);
        gl.uniform1i(uSim.u_pos, 0);
        gl.uniform1i(uSim.u_vel, 1);
      } else {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, read.texs[0]);
        gl.uniform1i(uSim.u_state, 0);
      }
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, tA);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, tB);
      gl.uniform1i(uSim.u_tA, 2);
      gl.uniform1i(uSim.u_tB, 3);
      gl.uniform1f(uSim.u_dt, f.dt);
      gl.uniform1f(uSim.u_time, f.time);
      gl.uniform1f(uSim.u_phase, f.phase);
      gl.uniform1f(uSim.u_settle, f.settle);
      gl.uniform1f(uSim.u_exit, f.exit);
      gl.uniform1f(uSim.u_aspect, aspect);
      gl.uniform1f(uSim.u_hasT, hasT);
      gl.uniform3f(uSim.u_mouse, f.mouseX, f.mouseY, f.mouseOn);
      gl.uniform3f(uSim.u_burst, f.burstX, f.burstY, f.burstK);
      gl.uniform4f(uSim.u_band, band[0], band[1], band[2], band[3]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.SCISSOR_TEST);
      const tmp = read;
      read = write;
      write = tmp;

      /* 2. 軌跡バッファ：減衰 → 粒を加算 */
      gl.bindFramebuffer(gl.FRAMEBUFFER, trailFbo);
      gl.viewport(0, 0, trailW, trailH);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(pDecay);
      gl.uniform1f(uDecay.u_a, 1 - Math.exp(-f.dt / 0.09));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (trail8) {
        // 8bit の軌跡は掛け算だけでは 1/255 付近で止まるので、少しずつ引いて消し切る
        gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.useProgram(pSub);
        gl.uniform1f(uSub.u_e, 1.5 / 255);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.blendEquation(gl.FUNC_ADD);
      }
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(pPoint);
      if (packed) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, read.texs[0]);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, read.texs[1]);
        gl.uniform1i(uPoint.u_pos, 0);
        gl.uniform1i(uPoint.u_vel, 1);
      } else {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, read.texs[0]);
        gl.uniform1i(uPoint.u_state, 0);
      }
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, tA);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, tB);
      gl.uniform1i(uPoint.u_tA, 2);
      gl.uniform1i(uPoint.u_tB, 3);
      gl.uniform1f(uPoint.u_aspect, aspect);
      gl.uniform1f(uPoint.u_scale, pointScale);
      gl.uniform1f(uPoint.u_settle, f.settle);
      gl.uniform1f(uPoint.u_exit, f.exit);
      gl.uniform1f(uPoint.u_alpha, f.alpha);
      gl.uniform1f(uPoint.u_time, f.time);
      gl.uniform1f(uPoint.u_hasT, hasT);
      const L = f.lights;
      gl.uniform3f(uPoint.u_l0, L[0], L[1], L[2]);
      gl.uniform3f(uPoint.u_l1, L[3], L[4], L[5]);
      gl.uniform3f(uPoint.u_l2, L[6], L[7], L[8]);
      gl.drawArrays(gl.POINTS, 0, n);

      /* 3. 表示：トーンカーブ → 暖色白で紙の上へ（premultiplied） */
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.BLEND);
      gl.useProgram(pDisp);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, trailTex);
      gl.uniform1i(uDisp.u_trail, 0);
      gl.uniform3f(uDisp.u_tint, TINT[0], TINT[1], TINT[2]);
      gl.uniform1f(uDisp.u_expo, 0.95);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    },
    destroy() {
      lost = true;
      trailDisposers.forEach((d) => d());
      trailDisposers.length = 0;
      disposables.forEach((d) => d());
      disposables.length = 0;
      // ★ WEBGL_lose_context.loseContext() は呼ばない：React StrictMode の
      //   二重マウントで同じ canvas を再利用したとき、失われた context が返ってくる
    },
  };

  /** 保護帯（u 空間）。setTargets とは独立に更新できる */
  (api as BokujinSimAPI & { setBand(b: ArrayLike<number>): void }).setBand = (b) => {
    band[0] = b[0];
    band[1] = b[1];
    band[2] = b[2];
    band[3] = b[3];
  };

  return api;
}

/** setBand を持つ拡張 API（createBokujinSim の戻り値は常にこれを満たす） */
export interface BokujinSimFull extends BokujinSimAPI {
  setBand(b: ArrayLike<number>): void;
}

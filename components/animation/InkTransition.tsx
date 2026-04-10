"use client";

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

/* =================================================================
   Context
   ================================================================= */
interface InkCtx {
  navigate: (href: string, origin?: { x: number; y: number }) => void;
}

const InkContext = createContext<InkCtx>({ navigate: () => {} });

export function useInkTransition() {
  return useContext(InkContext);
}

/* =================================================================
   Shaders
   ================================================================= */
const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0,1);}`;

const FRAG = `
precision mediump float;
uniform vec2 uResolution;
uniform vec2 uOrigin;
uniform float uProgress;
uniform float uDirection;

vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec2 mod289v2(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 permute(vec3 x){return mod289((x*34.+1.)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(.211324865,.366025404,-.577350269,.024390244);
  vec2 i=floor(v+dot(v,C.yy)),x0=v-i+dot(i,C.xx),d=step(x0.yx,x0.xy);
  vec2 i1=vec2(d.x,1.-d.x),x1=x0+C.xx-i1,x2=x0+C.zz;
  i=mod289v2(i);
  vec3 p=permute(permute(i.y+vec3(0,i1.y,1.))+i.x+vec3(0,i1.x,1.));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x1,x1),dot(x2,x2)),0.);
  m=m*m;m=m*m;
  vec3 x=2.*fract(p*C.www)-1.,h=abs(x)-.5,ox=floor(x+.5),a0=x-ox;
  m*=1.79284-0.85373*(a0*a0+h*h);
  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.y=a0.y*x1.x+h.y*x1.y;g.z=a0.z*x2.x+h.z*x2.y;
  return 130.*dot(m,g);
}

void main(){
  vec2 uv=gl_FragCoord.xy/uResolution;
  float aspect=uResolution.x/uResolution.y;
  vec2 d=(uv-uOrigin)*vec2(aspect,1.);
  float dist=length(d);
  float n=snoise(uv*5.)*0.12+snoise(uv*10.+3.7)*0.08+snoise(uv*20.+7.1)*0.04;
  float maxDist=length(vec2(aspect,1.));
  float t=uProgress*maxDist*1.3;
  float edge=smoothstep(t-0.06,t+0.02,dist+n);
  float alpha=uDirection>0.?1.-edge:edge;
  gl_FragColor=vec4(vec3(0.039),alpha);
}
`;

/* =================================================================
   WebGL helpers — on-demand init / destroy
   ================================================================= */
interface GLState {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

function initGL(canvas: HTMLCanvasElement): GLState | null {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
  if (!gl) return null;

  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, VERT);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, FRAG);
  gl.compileShader(fs);

  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  gl.useProgram(prog);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return {
    gl,
    program: prog,
    uniforms: {
      uResolution: gl.getUniformLocation(prog, "uResolution"),
      uOrigin: gl.getUniformLocation(prog, "uOrigin"),
      uProgress: gl.getUniformLocation(prog, "uProgress"),
      uDirection: gl.getUniformLocation(prog, "uDirection"),
    },
  };
}

function destroyGL(state: GLState) {
  const { gl, program } = state;
  gl.deleteProgram(program);
  const ext = gl.getExtension("WEBGL_lose_context");
  if (ext) ext.loseContext();
}

/* =================================================================
   Provider Component
   ================================================================= */
export default function InkTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glStateRef = useRef<GLState | null>(null);
  const animRef = useRef<number>(0);
  const busyRef = useRef(false);
  const prevPathRef = useRef(pathname);

  // Resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Detect route change to play reveal
  useEffect(() => {
    if (prevPathRef.current !== pathname && busyRef.current) {
      prevPathRef.current = pathname;
      playReveal();
    } else {
      prevPathRef.current = pathname;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const ensureGL = useCallback((): GLState | null => {
    if (glStateRef.current) return glStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const state = initGL(canvas);
    glStateRef.current = state;
    return state;
  }, []);

  const releaseGL = useCallback(() => {
    if (glStateRef.current) {
      destroyGL(glStateRef.current);
      glStateRef.current = null;
    }
  }, []);

  const drawFrame = useCallback((state: GLState, progress: number, direction: number, ox: number, oy: number) => {
    const { gl, uniforms: u } = state;
    const canvas = canvasRef.current;
    if (!canvas) return;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(state.program);

    gl.uniform2f(u.uResolution, canvas.width, canvas.height);
    gl.uniform2f(u.uOrigin, ox, 1 - oy);
    gl.uniform1f(u.uProgress, progress);
    gl.uniform1f(u.uDirection, direction);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, []);

  const playReveal = useCallback(() => {
    const canvas = canvasRef.current;
    const state = ensureGL();
    if (!canvas || !state) { busyRef.current = false; return; }
    canvas.style.pointerEvents = "auto";

    const duration = 600;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - p) * (1 - p);
      drawFrame(state, eased, -1, 0.5, 0.5);

      if (p < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        canvas.style.pointerEvents = "none";
        busyRef.current = false;
        // Destroy WebGL after reveal completes
        releaseGL();
      }
    };

    animRef.current = requestAnimationFrame(tick);
  }, [ensureGL, releaseGL, drawFrame]);

  const navigate = useCallback(
    (href: string, origin?: { x: number; y: number }) => {
      if (busyRef.current) {
        router.push(href);
        return;
      }
      if (href === pathname) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        router.push(href);
        return;
      }

      // Init WebGL on-demand
      const state = ensureGL();
      if (!state) {
        router.push(href);
        return;
      }

      busyRef.current = true;
      canvas.style.pointerEvents = "auto";
      window.scrollTo({ top: 0, behavior: "instant" });

      const ox = origin ? origin.x / window.innerWidth : 0.5;
      const oy = origin ? origin.y / window.innerHeight : 0.5;

      const duration = 600;
      const start = performance.now();

      const tick = (now: number) => {
        const elapsed = now - start;
        const p = Math.min(elapsed / duration, 1);
        const eased = p * p;
        drawFrame(state, eased, 1, ox, oy);

        if (p < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          router.push(href);
        }
      };

      animRef.current = requestAnimationFrame(tick);
    },
    [router, pathname, ensureGL, drawFrame],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      releaseGL();
    };
  }, [releaseGL]);

  return (
    <InkContext.Provider value={{ navigate }}>
      {children}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          pointerEvents: "none",
          width: "100%",
          height: "100%",
        }}
      />
    </InkContext.Provider>
  );
}

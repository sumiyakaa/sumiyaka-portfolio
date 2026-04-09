"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { gsap } from "gsap";
import { createFluidSim, type FluidSimAPI } from "@/lib/webgl/fluidSim";
import { useLenisRef } from "@/components/animation/SmoothScroll";
import styles from "./OpeningAnimation.module.css";

// ---- Vertex color helpers (ported from v1) ----

function applyNormalColors(
  geometry: THREE.BufferGeometry,
  faceHex: number,
  sideHex: number
): void {
  const normals = geometry.attributes.normal;
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const faceCol = new THREE.Color(faceHex);
  const sideCol = new THREE.Color(sideHex);
  const tmp = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const nz = Math.abs(normals.getZ(i));
    const t = Math.pow(nz, 6);
    tmp.copy(sideCol).lerp(faceCol, t);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
}

function applyGradientColors(
  geometry: THREE.BufferGeometry,
  topHex: number,
  bottomHex: number
): void {
  geometry.computeBoundingBox();
  const minY = geometry.boundingBox!.min.y;
  const maxY = geometry.boundingBox!.max.y;
  const range = maxY - minY || 1;
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const topCol = new THREE.Color(topHex);
  const botCol = new THREE.Color(bottomHex);
  const tmp = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const yT = (positions.getY(i) - minY) / range;
    tmp.copy(botCol).lerp(topCol, yT);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
}

function removeDegenTriangles(geometry: THREE.BufferGeometry): void {
  const pos = geometry.attributes.position;
  const idx = geometry.index;
  if (!idx) return;
  const arr = idx.array;
  const keep: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();
  for (let i = 0; i < arr.length; i += 3) {
    a.fromBufferAttribute(pos, arr[i]);
    b.fromBufferAttribute(pos, arr[i + 1]);
    c.fromBufferAttribute(pos, arr[i + 2]);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    cross.crossVectors(ab, ac);
    if (cross.length() * 0.5 > 1e-6) {
      keep.push(arr[i], arr[i + 1], arr[i + 2]);
    }
  }
  geometry.setIndex(keep);
}

// ---- Component ----

interface OpeningAnimationProps {
  onComplete: () => void;
}

export default function OpeningAnimation({ onComplete }: OpeningAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [fallback, setFallback] = useState(false);
  const lenisRef = useLenisRef();

  // Safety timeout refs shared between initScene and runAnimation
  const safetyFiredRef = useRef(false);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initScene = useCallback(() => {
    const container = containerRef.current;
    const inkCanvas = inkCanvasRef.current;
    const threeCanvas = threeCanvasRef.current;
    if (!container || !inkCanvas || !threeCanvas) return;

    // sessionStorage check — skip if already played
    if (sessionStorage.getItem("akashiki-splash") === "done") {
      onComplete();
      return;
    }

    // body lock
    document.body.classList.add("is-locked");

    // Lenis stop
    lenisRef.current?.stop();

    // SP: skip WebGL
    if (window.innerWidth <= 768) {
      setFallback(true);
      return;
    }

    // WebGL support check
    try {
      const testCanvas = document.createElement("canvas");
      if (!testCanvas.getContext("webgl") && !testCanvas.getContext("experimental-webgl")) {
        setFallback(true);
        return;
      }
    } catch {
      setFallback(true);
      return;
    }

    // Use window dimensions (container may not be laid out yet)
    const W = container.clientWidth || window.innerWidth;
    const H = container.clientHeight || window.innerHeight;
    if (W === 0 || H === 0) {
      setFallback(true);
      return;
    }

    // Safety timeout (10s)
    safetyFiredRef.current = false;
    safetyTimeoutRef.current = setTimeout(() => {
      if (safetyFiredRef.current) return;
      safetyFiredRef.current = true;
      document.body.classList.remove("is-locked");
      lenisRef.current?.start();
      if (cleanupRef.current) cleanupRef.current();
      sessionStorage.setItem("akashiki-splash", "done");
      onComplete();
    }, 10000);

    // ---- Ink fluid ----
    inkCanvas.style.width = W + "px";
    inkCanvas.style.height = H + "px";
    const ink = createFluidSim(inkCanvas, {
      resolution: 0.5,
      brightness: 0.35,
      bgBase: 0.0,
    });

    // ---- Three.js scene ----
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const scene = new THREE.Scene();
    const frustumSize = 8;
    const aspect = W / H;
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      100
    );
    camera.position.set(0, 0.3, 15);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: threeCanvas,
        antialias: true,
        alpha: true,
      });
    } catch {
      setFallback(true);
      if (ink) ink.destroy();
      return;
    }
    renderer.setSize(W, H);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Lights
    const ambLight = new THREE.AmbientLight(0x100800, 0.008);
    scene.add(ambLight);
    const topLight = new THREE.DirectionalLight(0xffffff, 0);
    topLight.position.set(0, 10, -3);
    scene.add(topLight);
    const rimLight = new THREE.DirectionalLight(0xffcc88, 0);
    rimLight.position.set(0, 4, -8);
    scene.add(rimLight);
    const fillLight = new THREE.DirectionalLight(0x884422, 0);
    fillLight.position.set(0, -8, 0.5);
    scene.add(fillLight);
    const frontLight = new THREE.DirectionalLight(0xffeedd, 0);
    frontLight.position.set(0, 0, 10);
    scene.add(frontLight);
    const topSurfLight = new THREE.DirectionalLight(0xffffff, 0);
    topSurfLight.position.set(0, 10, -2);
    scene.add(topSurfLight);

    // Render state
    let rafId: number | null = null;
    let inkRafId: number | null = null;

    // Light proxy
    const lightState = {
      ambient: 0.008,
      topIntensity: 0,
      rimIntensity: 0,
      fillIntensity: 0,
      frontIntensity: 0,
      topSurfIntensity: 0,
    };

    // Ink loop
    let inkT0 = -1;
    let inkTPrev = 0;
    function inkLoop(timestamp: number) {
      if (!ink) return;
      if (inkT0 < 0) {
        inkT0 = timestamp;
        inkTPrev = timestamp;
      }
      const dt = Math.min((timestamp - inkTPrev) * 0.001, 0.033);
      inkTPrev = timestamp;
      ink.step(dt);
      inkRafId = requestAnimationFrame(inkLoop);
    }
    if (ink) {
      inkRafId = requestAnimationFrame(inkLoop);
    }

    // Font loading + text creation
    const loader = new FontLoader();
    let fontsLoaded = 0;
    let antonFont: Font | null = null;
    let yujisyukuFont: Font | null = null;

    function onFontLoaded() {
      fontsLoaded++;
      if (fontsLoaded < 2 || !antonFont || !yujisyukuFont) return;
      buildText(antonFont, yujisyukuFont);
    }

    function onFontError() {
      setFallback(true);
    }

    loader.load("/fonts/anton-regular.json", (font) => {
      antonFont = font;
      onFontLoaded();
    }, undefined, onFontError);

    loader.load("/fonts/yujisyuku-regular-subset.json", (font) => {
      yujisyukuFont = font;
      onFontLoaded();
    }, undefined, onFontError);

    function buildText(aFont: Font, jFont: Font) {
      try {
        const CHARS = ["A", "K", "A", "S", "H", "I", "K", "I", "\u2014", "\u706F", "\u6577"];
        const enOpts = {
          font: aFont,
          size: 1.331,
          depth: 1.037,
          curveSegments: 16,
          bevelEnabled: true,
          bevelThickness: 0.001,
          bevelSize: 0.02,
          bevelSegments: 1,
        };
        const EN_STRETCH_X = 1.3;
        const jpOpts = {
          font: jFont,
          size: 0.778,
          depth: 0.45,
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.005,
          bevelSize: 0.003,
          bevelSegments: 1,
        };
        const jpOptsFallback = {
          font: jFont,
          size: 0.864,
          depth: 0.691,
          curveSegments: 8,
          bevelEnabled: false,
        };

        const vertexColorMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          vertexColors: true,
          metalness: 0.15,
          roughness: 0.40,
        });

        const group = new THREE.Group();
        const charMeshes: (THREE.Mesh | null)[] = [];
        const charWidths: number[] = [];
        const LETTER_SPACING = 0.08;
        const DASH_SPACING = 0.15;
        const JP_SPACING = 0.15;

        for (let ci = 0; ci < CHARS.length; ci++) {
          const ch = CHARS[ci];
          const isJP = ci >= 9;
          const isDash = ci === 8;
          let mesh: THREE.Mesh | null = null;
          let w = 0;

          if (isJP) {
            try {
              const jpGeom = new TextGeometry(ch, jpOpts);
              jpGeom.computeBoundingBox();
              applyGradientColors(jpGeom, 0xfcff38, 0xf77123);
              mesh = new THREE.Mesh(jpGeom, vertexColorMat);
              w = jpGeom.boundingBox!.max.x - jpGeom.boundingBox!.min.x;
            } catch {
              try {
                const jpGeom2 = new TextGeometry(ch, jpOptsFallback);
                jpGeom2.computeBoundingBox();
                applyGradientColors(jpGeom2, 0xfcff38, 0xf77123);
                mesh = new THREE.Mesh(jpGeom2, vertexColorMat);
                w = jpGeom2.boundingBox!.max.x - jpGeom2.boundingBox!.min.x;
              } catch {
                // skip char
              }
            }
          } else {
            const geom = new TextGeometry(ch, enOpts);
            if (ch === "S") {
              removeDegenTriangles(geom);
              geom.scale(1.04, 1.06, 1.04);
            }
            geom.scale(EN_STRETCH_X, 1, 1);
            geom.computeBoundingBox();
            applyNormalColors(geom, 0x3a3a3e, 0x08080a);
            mesh = new THREE.Mesh(geom, vertexColorMat);
            w = geom.boundingBox!.max.x - geom.boundingBox!.min.x;
            if (isDash) {
              geom.scale(0.25, 1, 1);
              geom.computeBoundingBox();
              w = geom.boundingBox!.max.x - geom.boundingBox!.min.x;
            }
          }

          if (mesh) {
            mesh.visible = false;
            group.add(mesh);
          }
          charMeshes.push(mesh);
          charWidths.push(w);
        }

        // Layout X
        let cursor = 0;
        const charLocalXCenters: number[] = [];
        for (let li = 0; li < CHARS.length; li++) {
          if (li === 8) cursor += DASH_SPACING;
          else if (li === 9) cursor += JP_SPACING;
          else if (li > 0 && li < 8) cursor += LETTER_SPACING;

          if (charMeshes[li]) {
            charMeshes[li]!.position.x = cursor;
            if (li >= 9) charMeshes[li]!.position.y = 0.05;
            if (li === 3) charMeshes[li]!.position.x = cursor - 0.03;
          }
          charLocalXCenters.push(cursor + charWidths[li] / 2);
          cursor += charWidths[li];
        }

        const totalWidth = cursor;
        group.position.x = -totalWidth / 2;
        group.position.y = -0.42;
        scene.add(group);

        // Screen positions for ink splats
        const charPositions: { x: number; y: number }[] = [];
        for (let pi = 0; pi < CHARS.length; pi++) {
          const worldX = group.position.x + charLocalXCenters[pi];
          const worldY = group.position.y + 0.3;
          const vec = new THREE.Vector3(worldX, worldY, 0);
          vec.project(camera);
          charPositions.push({
            x: (vec.x + 1) / 2,
            y: 1 - (vec.y + 1) / 2,
          });
        }

        runAnimation(group, charMeshes, charPositions);
      } catch {
        setFallback(true);
      }
    }

    function runAnimation(
      textGroup: THREE.Group,
      charMeshes: (THREE.Mesh | null)[],
      charPositions: { x: number; y: number }[]
    ) {
      const TILT_X = THREE.MathUtils.degToRad(-18);
      const camState = { x: 0, y: 0.3, z: 15 };
      const textState = {
        rotY: 0,
        rotX: TILT_X,
        rotZ: 0,
        posX: textGroup.position.x,
        posY: textGroup.position.y,
        posZ: 0,
      };

      function renderLoop() {
        ambLight.intensity = lightState.ambient;
        topLight.intensity = lightState.topIntensity;
        rimLight.intensity = lightState.rimIntensity;
        fillLight.intensity = lightState.fillIntensity;
        frontLight.intensity = lightState.frontIntensity;
        topSurfLight.intensity = lightState.topSurfIntensity;
        camera.position.set(camState.x, camState.y, camState.z);
        camera.lookAt(0, 0, 0);
        textGroup.rotation.set(textState.rotX, textState.rotY, textState.rotZ);
        textGroup.position.set(textState.posX, textState.posY, textState.posZ);
        renderer.render(scene, camera);
        rafId = requestAnimationFrame(renderLoop);
      }
      renderLoop();

      // GSAP Master Timeline
      const master = gsap.timeline();

      // Phase 1: Darkness
      master.to(lightState, { ambient: 0.015, duration: 0.4, ease: "power2.out" }, 0.2);

      // Phase 2: Characters appear + ink splats
      const CHAR_DELAY = 0.25;
      const CHAR_START = 0.5;

      charMeshes.forEach((mesh, i) => {
        if (!mesh) return;
        const t = CHAR_START + i * CHAR_DELAY;
        master.call(
          () => {
            mesh.visible = true;
            mesh.scale.set(0.01, 0.01, 0.01);
            gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "back.out(1.7)" });
            if (ink && charPositions[i]) {
              const pos = charPositions[i];
              const force = 400;
              const angle = Math.random() * Math.PI * 2;
              ink.splat(pos.x, pos.y, Math.cos(angle) * force, Math.sin(angle) * force, 0.4, 0.008);
              for (let j = 0; j < 4; j++) {
                const a2 = (j / 4) * Math.PI * 2 + Math.random() * 0.5;
                ink.splat(pos.x, pos.y, Math.cos(a2) * force * 0.5, Math.sin(a2) * force * 0.5, 0.2, 0.004);
              }
            }
          },
          [],
          t
        );
      });

      const CHAR_TOTAL = charMeshes.length * CHAR_DELAY;
      master.to(
        lightState,
        {
          ambient: 0.06,
          topIntensity: 0.5,
          fillIntensity: 0.1,
          frontIntensity: 0.04,
          topSurfIntensity: 0.3,
          duration: CHAR_TOTAL,
          ease: "power1.out",
        },
        CHAR_START
      );

      // Phase 3: Full lighting
      const LIGHT_FADE_START = CHAR_START + CHAR_TOTAL + 0.3;
      master.to(
        lightState,
        {
          topIntensity: 2.8,
          rimIntensity: 0.5,
          fillIntensity: 0.4,
          frontIntensity: 0.18,
          topSurfIntensity: 1.8,
          ambient: 0.12,
          duration: 1.8,
          ease: "power2.inOut",
        },
        LIGHT_FADE_START
      );

      // Phase 4-7: Cinematic transitions
      const P5 = LIGHT_FADE_START + 1.8;

      master.to(
        lightState,
        {
          ambient: 0.14,
          topIntensity: 3.2,
          rimIntensity: 0.6,
          fillIntensity: 0.45,
          frontIntensity: 0.2,
          topSurfIntensity: 2.0,
          duration: 0.6,
          ease: "power2.out",
        },
        P5
      );

      // Step 1: Orbit
      master.to(camState, { x: 5.25, y: 1.2, z: 12, duration: 0.8, ease: "power2.inOut" }, P5);
      master.to(textState, { rotY: -0.35, duration: 0.8, ease: "power2.inOut" }, P5);

      // Step 2: Flip + camera pull
      const S2 = P5 + 0.8;
      master.to(textState, { rotY: Math.PI, duration: 0.6, ease: "power2.in" }, S2);
      master.to(camState, { x: 1.5, y: 1.5, z: 18, duration: 0.6, ease: "power2.inOut" }, S2);

      // Step 3: 3D rotation + Canvas自体を左上ロゴ位置へCSS transform移動+縮小 (1.2s)
      const S3 = S2 + 0.5;

      master.to(
        textState,
        {
          rotY: Math.PI * 2,
          rotX: TILT_X * 0.3,
          duration: 1.2,
          ease: "cubic-bezier(0.16, 1, 0.3, 1)",
        },
        S3
      );

      // Three.js canvasをロゴ位置へCSS transform移動
      if (threeCanvasRef.current) {
        const canvasRect = threeCanvasRef.current.getBoundingClientRect();
        // ロゴの目標位置: 画面左上 (left: 24px, top: 18px)
        const targetX = 24 + 60 - canvasRect.width / 2;
        const targetY = 18 + 10 - canvasRect.height / 2;
        const targetScale = 0.015;

        master.to(threeCanvasRef.current, {
          x: targetX,
          y: targetY,
          scale: targetScale,
          duration: 1.2,
          ease: "cubic-bezier(0.16, 1, 0.3, 1)",
        }, S3);
      }

      // inkCanvas fadeout
      if (inkCanvasRef.current) {
        master.to(inkCanvasRef.current, {
          opacity: 0,
          duration: 1.0,
          ease: "power2.out",
        }, S3);
      }

      // Step 4: オーバーレイfadeout → 完了 (0.4s)
      const S4 = S3 + 1.0;
      if (containerRef.current) {
        master.to(containerRef.current, {
          opacity: 0,
          duration: 0.4,
          ease: "power2.out",
          onComplete: () => {
            safetyFiredRef.current = true;
            if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
            // クリーンアップ
            if (cleanupRef.current) cleanupRef.current();
            // body unlock + Lenis再開
            document.body.classList.remove("is-locked");
            lenisRef.current?.start();
            // sessionStorage記録
            sessionStorage.setItem("akashiki-splash", "done");
            // 親に完了通知
            onComplete();
          },
        }, S4);
      }
    }

    // Cleanup
    cleanupRef.current = () => {
      gsap.killTweensOf("*");
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (inkRafId !== null) cancelAnimationFrame(inkRafId);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      if (ink) ink.destroy();
      const glCtx = renderer.getContext();
      const ext = glCtx.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback handling — call onComplete when fallback triggers
  useEffect(() => {
    if (fallback) {
      document.body.classList.remove("is-locked");
      sessionStorage.setItem("akashiki-splash", "done");
      onComplete();
    }
  }, [fallback, onComplete]);

  useEffect(() => {
    // Wait one frame for DOM layout to complete
    const frameId = requestAnimationFrame(() => {
      initScene();
    });
    return () => {
      cancelAnimationFrame(frameId);
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [initScene]);

  if (fallback) {
    return <div className={styles.fallback} />;
  }

  return (
    <div ref={containerRef} className={styles.container}>
      <canvas ref={inkCanvasRef} className={styles.inkCanvas} />
      <canvas ref={threeCanvasRef} className={styles.threeCanvas} />
    </div>
  );
}

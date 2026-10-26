import {
    AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, PerspectiveCamera, Points, Scene, ShaderMaterial, WebGLRenderer,
} from 'three';
import { SHAPES } from './shapes';

/**
 * The herb story's WebGL layer: one Points mesh, one draw call. Every particle carries its position in all six shapes;
 * the vertex shader blends from the current shape to the next as `morph` moves (0 = seed dust ... 5 = the pack), with
 * a per-particle delay and a swirl in between, so a shape dissolves and regrows rather than sliding. React never
 * renders here: the section pushes `morph` and the pointer, and the loop only runs while the canvas is on screen.
 */

const VERTEX = /* glsl */ `
attribute vec4 aS0; attribute vec4 aS1; attribute vec4 aS2; attribute vec4 aS3; attribute vec4 aS4; attribute vec4 aS5;
attribute vec4 aRnd;
uniform float uMorph; uniform float uTime; uniform float uScale; uniform float uSize;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uC4; uniform vec3 uC5; uniform vec3 uSpark;
varying vec3 vColor; varying float vAlpha;

vec4 shapeAt(float k) { if (k < 0.5) return aS0; if (k < 1.5) return aS1; if (k < 2.5) return aS2; if (k < 3.5) return aS3; if (k < 4.5) return aS4; return aS5; }
vec3 colourAt(float k) { if (k < 0.5) return uC0; if (k < 1.5) return uC1; if (k < 2.5) return uC2; if (k < 3.5) return uC3; if (k < 4.5) return uC4; return uC5; }

void main() {
    float k0 = floor(uMorph);
    float k1 = min(k0 + 1.0, 5.0);
    float f = uMorph - k0;
    float t = clamp((f - aRnd.x * 0.45) / 0.55, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec4 a = shapeAt(k0);
    vec4 b = shapeAt(k1);
    vec3 p = mix(a.xyz, b.xyz, t);

    // in between two shapes the particles lift into a swirl
    float burst = sin(t * 3.14159);
    float ang = burst * (0.9 + aRnd.w * 1.6);
    float c = cos(ang); float s = sin(ang);
    p.xz = mat2(c, -s, s, c) * p.xz;
    p += burst * 0.42 * vec3(
        sin(p.y * 2.3 + uTime * 0.7 + aRnd.w * 6.0),
        cos(p.x * 1.9 - uTime * 0.6 + aRnd.w * 5.0) * 0.6,
        sin(p.z * 2.1 + uTime * 0.5 + aRnd.w * 4.0));
    // and at rest they breathe a little
    p += 0.014 * vec3(sin(uTime * 1.3 + aRnd.w * 20.0), cos(uTime * 1.1 + aRnd.w * 17.0), sin(uTime * 0.9 + aRnd.w * 11.0));

    float shade = mix(a.w, b.w, t);
    vec3 col = mix(colourAt(k0), colourAt(k1), t);
    col = mix(col, uSpark, step(0.88, aRnd.z) * 0.9);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.55 + aRnd.y * 0.9) * (1.0 + burst * 0.5) * uScale / -mv.z;
    float twinkle = 0.78 + 0.22 * sin(uTime * 2.2 + aRnd.w * 40.0);
    vColor = col * (0.3 + 0.72 * shade);
    vAlpha = (0.5 + 0.5 * shade) * twinkle * (1.0 - burst * 0.3);
}`;

const FRAGMENT = /* glsl */ `
varying vec3 vColor; varying float vAlpha;
void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vColor, a * a * vAlpha);
}`;

const FOV = 35;

export function createHerbScene(canvas, { count, palette }) {
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    const scene = new Scene();
    const camera = new PerspectiveCamera(FOV, 1, 0.1, 50);
    camera.position.set(0, 0, 6);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3)); // unused, keeps three happy
    SHAPES.forEach((make, i) => geometry.setAttribute(`aS${i}`, new BufferAttribute(make(count), 4)));
    const rnd = new Float32Array(count * 4);
    for (let i = 0; i < rnd.length; i += 1) rnd[i] = Math.random();
    geometry.setAttribute('aRnd', new BufferAttribute(rnd, 4));

    const uniforms = {
        uMorph: { value: 0 }, uTime: { value: 0 }, uScale: { value: 1 }, uSize: { value: 0.03 },
        uSpark: { value: new Color(palette.spark) },
        ...Object.fromEntries(palette.stages.map((hex, i) => [`uC${i}`, { value: new Color(hex) }])),
    };
    const material = new ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, transparent: true, depthWrite: false, blending: AdditiveBlending });
    const points = new Points(geometry, material);
    points.frustumCulled = false; // real positions live in the shape attributes, so three cannot bound them
    const group = new Group();
    group.add(points);
    scene.add(group);

    const state = { target: 0, morph: 0, px: 0, py: 0, tx: 0, ty: 0, running: false, raf: 0, last: 0, time: 0 };

    const resize = () => {
        const w = canvas.clientWidth; const h = canvas.clientHeight;
        if (!w || !h) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        uniforms.uScale.value = (h * dpr) / (2 * Math.tan((FOV * Math.PI) / 360));
        const wide = w / h > 1.1;
        // wide: the herb sits on the right, beside the words; narrow: above them
        group.position.set(wide ? Math.min(1.55, camera.aspect * 0.78) : 0, wide ? 0 : 0.85, 0);
        group.scale.setScalar(wide ? 1 : Math.min(1, camera.aspect * 1.55) * 0.9);
        uniforms.uSize.value = wide ? 0.03 : 0.036;
    };

    const frame = (now) => {
        state.raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - (state.last || now)) / 1000);
        state.last = now;
        state.time += dt;
        state.morph += (state.target - state.morph) * Math.min(1, dt * 5);
        state.px += (state.tx - state.px) * Math.min(1, dt * 3);
        state.py += (state.ty - state.py) * Math.min(1, dt * 3);
        uniforms.uMorph.value = state.morph;
        uniforms.uTime.value = state.time;
        // one full turn per chapter, so every shape faces the viewer while it is being read, and sways a little
        group.rotation.y = state.morph * Math.PI * 2 + Math.sin(state.time * 0.28) * 0.32 + state.px * 0.35;
        group.rotation.x = state.py * 0.18;
        renderer.render(scene, camera);
    };

    resize();
    return {
        setMorph(v) { state.target = v; },
        jumpMorph(v) { state.target = v; state.morph = v; },
        setPointer(x, y) { state.tx = x; state.ty = y; },
        resize,
        start() { if (state.running) return; state.running = true; state.last = 0; state.raf = requestAnimationFrame(frame); },
        stop() { state.running = false; cancelAnimationFrame(state.raf); },
        dispose() { cancelAnimationFrame(state.raf); geometry.dispose(); material.dispose(); renderer.dispose(); },
    };
}

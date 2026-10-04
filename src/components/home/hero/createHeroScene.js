import {
    AmbientLight,
    CircleGeometry,
    Color,
    DirectionalLight,
    DoubleSide,
    DynamicDrawUsage,
    Group,
    InstancedMesh,
    MathUtils,
    MeshBasicMaterial,
    MeshLambertMaterial,
    Object3D,
    PerspectiveCamera,
    Scene,
    Shape,
    ShapeGeometry,
    WebGLRenderer,
} from 'three';

// Brand palette (plum family + gold + soft tint) — weighted so plum leads and gold sparkles.
const LEAF_COLORS = [
    ['#602460', 4],
    ['#7A3380', 3],
    ['#4E1C4E', 2],
    ['#C08A3E', 3],
    ['#D8A860', 1],
    ['#E9CFE9', 2],
];

const TAU = Math.PI * 2;
const FOV = 32;
const CAMERA_Z = 14;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function pickColor(rand) {
    const total = LEAF_COLORS.reduce((s, [, w]) => s + w, 0);
    let r = rand * total;
    for (const [hex, w] of LEAF_COLORS) {
        r -= w;
        if (r <= 0) return new Color(hex);
    }
    return new Color(LEAF_COLORS[0][0]);
}

/** A pointed, slightly cupped leaf — one shared geometry for every instance. */
function createLeafGeometry() {
    const shape = new Shape();
    shape.moveTo(0, -0.55);
    shape.quadraticCurveTo(0.5, -0.1, 0, 0.55);
    shape.quadraticCurveTo(-0.5, -0.1, 0, -0.55);
    const geometry = new ShapeGeometry(shape, 10);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
        pos.setZ(i, Math.abs(pos.getX(i)) * 0.5); // cup the blade along its midrib
    }
    geometry.computeVertexNormals();
    return geometry;
}

/**
 * A wreath of botanical leaves (plus drifting gold pollen) that orbits an anchor rectangle —
 * the product image — on a transparent canvas laid over the hero. Some leaves pass in front of
 * the image, some behind, which is what gives it depth.
 *
 * Controls: setAnchor({cx,cy,hw,hh} in canvas px), setScroll(0..1), setPointer(x,y in -1..1),
 * resize(), start(), stop(), dispose().
 */
export function createHeroScene(canvas, { count = 100, antialias = true } = {}) {
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);

    const scene = new Scene();
    const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
    camera.position.set(0, 0, CAMERA_Z);

    scene.add(new AmbientLight('#ffffff', 1.2));
    const key = new DirectionalLight('#fff4e6', 1.7);
    key.position.set(3, 5, 7);
    scene.add(key);
    const rim = new DirectionalLight('#e9cfe9', 0.8);
    rim.position.set(-4, -2, 3);
    scene.add(rim);

    const group = new Group();
    scene.add(group);

    // ---- leaves ----
    const leafGeometry = createLeafGeometry();
    const leafMaterial = new MeshLambertMaterial({ side: DoubleSide });
    const leafMesh = new InstancedMesh(leafGeometry, leafMaterial, count);
    leafMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    group.add(leafMesh);

    const r = Math.random;
    const leaves = Array.from({ length: count }, (_, i) => ({
        lane: r(),
        angle: (i / count) * TAU + r() * 0.5,
        speed: (0.05 + r() * 0.08) * (r() < 0.8 ? 1 : -0.7),
        bob: 0.12 + r() * 0.25,
        bobSpeed: 0.35 + r() * 0.5,
        phase: r() * TAU,
        size: 0.45 + r() * 0.6,
        sway: [0.35 + r() * 0.6, 0.3 + r() * 0.5],
        swaySpeed: [0.25 + r() * 0.4, 0.2 + r() * 0.35],
        spin: (r() - 0.5) * 0.7,
        depth: 0.2 + r() * 0.8,
    }));
    leaves.forEach((leaf, i) => leafMesh.setColorAt(i, pickColor(r())));
    leafMesh.instanceColor.needsUpdate = true;

    // ---- pollen (tiny gold discs rising slowly around the anchor) ----
    const pollenCount = Math.round(count * 0.45);
    const pollenGeometry = new CircleGeometry(0.5, 10);
    const pollenMaterial = new MeshBasicMaterial({ color: '#D8A860', transparent: true, opacity: 0.85 });
    const pollenMesh = new InstancedMesh(pollenGeometry, pollenMaterial, pollenCount);
    pollenMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    group.add(pollenMesh);
    const pollen = Array.from({ length: pollenCount }, () => ({
        x: (r() - 0.5) * 2.6,
        y: r(),
        z: (r() - 0.5) * 2,
        rise: 0.025 + r() * 0.05,
        size: 0.05 + r() * 0.11,
        drift: r() * TAU,
    }));

    const dummy = new Object3D();
    const state = {
        scroll: 0, px: 0, py: 0, tx: 0, ty: 0,
        anchor: { cx: 0, cy: 0, hw: 200, hh: 250 },
        ppu: 100, width: 1, height: 1,
        running: false, raf: 0, last: 0, time: 0,
    };

    function resize() {
        const w = canvas.clientWidth || 1;
        const h = canvas.clientHeight || 1;
        state.width = w;
        state.height = h;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        state.ppu = h / (2 * Math.tan(MathUtils.degToRad(FOV / 2)) * CAMERA_Z); // canvas px per world unit at z = 0
    }

    function update(dt) {
        state.time += dt;
        const t = state.time;
        state.px += (state.tx - state.px) * Math.min(1, dt * 3);
        state.py += (state.ty - state.py) * Math.min(1, dt * 3);
        const s = state.scroll;

        const { cx, cy, hw, hh } = state.anchor;
        const unit = state.ppu;
        // Anchor centre in world space (canvas y runs downward, world y upward).
        const ax = (cx - state.width / 2) / unit;
        const ay = -(cy - state.height / 2) / unit;
        const rx0 = hw / unit;
        const ry0 = hh / unit;
        const sizeScale = Math.min(1.15, Math.max(0.55, rx0 / 2.8));

        group.position.set(ax + state.px * 0.3, ay - state.py * 0.2 + s * 2.4, 0);
        group.rotation.y = state.px * 0.22;
        group.rotation.x = -state.py * 0.12;

        const expand = 1 + s * 1.4;
        const spin = 1 + s * 2.4;
        const shrink = Math.max(0.001, 1 - s * 0.8);

        for (let i = 0; i < count; i += 1) {
            const l = leaves[i];
            const a = l.angle + t * l.speed * spin;
            // Hug the image's silhouette: just outside its edge, with the outer lanes reaching a little further.
            const k = (1.04 + l.lane * 0.2) * expand;
            const along = Math.sin(a);
            dummy.position.set(
                Math.cos(a) * rx0 * k,
                along * ry0 * k + Math.sin(t * l.bobSpeed + l.phase) * l.bob,
                Math.cos(a + l.phase) * l.depth + (along > 0 ? 0.3 : -0.3), // some in front of the image, some behind
            );
            // Face the viewer, gently swaying — never edge-on.
            dummy.rotation.set(
                Math.sin(t * l.swaySpeed[0] + l.phase) * l.sway[0],
                Math.sin(t * l.swaySpeed[1] + l.phase * 1.7) * l.sway[1],
                a + Math.PI / 2 + t * l.spin * 0.4,
            );
            const sc = l.size * sizeScale * shrink;
            dummy.scale.set(sc, sc, sc);
            dummy.updateMatrix();
            leafMesh.setMatrixAt(i, dummy.matrix);
        }
        leafMesh.instanceMatrix.needsUpdate = true;

        for (let i = 0; i < pollenCount; i += 1) {
            const p = pollen[i];
            const life = (p.y + t * p.rise) % 1;
            dummy.position.set(
                p.x * rx0 * 1.25 + Math.sin(t * 0.6 + p.drift) * 0.25,
                (life - 0.5) * ry0 * 2.6,
                p.z,
            );
            dummy.rotation.set(0, 0, 0);
            const fade = Math.sin(life * Math.PI);
            const sc = p.size * sizeScale * fade * shrink;
            dummy.scale.set(sc, sc, sc);
            dummy.updateMatrix();
            pollenMesh.setMatrixAt(i, dummy.matrix);
        }
        pollenMesh.instanceMatrix.needsUpdate = true;
    }

    function frame(now) {
        if (!state.running) return;
        const dt = Math.min(0.05, (now - state.last) / 1000 || 0.016);
        state.last = now;
        update(dt);
        renderer.render(scene, camera);
        state.raf = requestAnimationFrame(frame);
    }

    resize();

    return {
        resize() {
            resize();
            update(0);
            renderer.render(scene, camera);
        },
        setAnchor(anchor) {
            state.anchor = anchor;
            update(0);
            renderer.render(scene, camera);
        },
        setScroll(value) { state.scroll = clamp01(value); },
        setPointer(x, y) { state.tx = x; state.ty = y; },
        start() {
            if (state.running) return;
            state.running = true;
            state.last = performance.now();
            state.raf = requestAnimationFrame(frame);
        },
        stop() {
            state.running = false;
            cancelAnimationFrame(state.raf);
        },
        dispose() {
            state.running = false;
            cancelAnimationFrame(state.raf);
            leafGeometry.dispose();
            leafMaterial.dispose();
            leafMesh.dispose();
            pollenGeometry.dispose();
            pollenMaterial.dispose();
            pollenMesh.dispose();
            renderer.dispose();
        },
    };
}

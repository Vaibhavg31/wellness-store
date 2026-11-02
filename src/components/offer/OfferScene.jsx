import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Float, Lightformer, Sparkles } from '@react-three/drei';
import { MathUtils } from 'three';
import { MODELS } from '@/components/home/PackExplorer/models';

/**
 * The 3D stage of an offer: the real Chikit packs standing side by side on a soft shadow, floating a little and turning
 * to follow the pointer. No orbit controls and no zoom, so it never fights page scrolling; the loop stops while it is
 * off screen. Light comes from light panels (nothing to download).
 */

/** x position, depth, turn and size of each pack for a row of 1, 2 or 3. */
const LAYOUT = {
    1: [{ x: 0, z: 0, ry: 0, s: 1.1 }],
    2: [{ x: -1.25, z: 0, ry: 0.28, s: 1 }, { x: 1.25, z: 0, ry: -0.28, s: 1 }],
    3: [{ x: -2.15, z: -0.35, ry: 0.4, s: 0.88 }, { x: 0, z: 0.45, ry: 0, s: 1.08 }, { x: 2.15, z: -0.35, ry: -0.4, s: 0.88 }],
};

function Studio() {
    return (
        <Environment resolution={256}>
            <Lightformer form="rect" intensity={2.6} position={[0, 4, 3]} scale={[9, 3, 1]} />
            <Lightformer form="rect" intensity={1.4} position={[-5, 1, 2]} scale={[2, 6, 1]} rotation-y={Math.PI / 2} />
            <Lightformer form="rect" intensity={1.4} position={[5, 1, 2]} scale={[2, 6, 1]} rotation-y={-Math.PI / 2} />
            <Lightformer form="ring" intensity={1.4} position={[0, 1, -5]} scale={6} color="#FEE1C5" />
        </Environment>
    );
}

/** The row: grows in when it appears, sways gently and leans toward the pointer. */
function Row({ packs, mobile }) {
    const group = useRef(null);
    const spots = LAYOUT[Math.min(3, packs.length)] ?? LAYOUT[1];
    useFrame((state, dt) => {
        const g = group.current;
        if (!g) return;
        g.scale.setScalar(MathUtils.damp(g.scale.x, mobile ? 0.8 : 1, 4, dt));
        const target = state.pointer.x * 0.35 + Math.sin(state.clock.elapsedTime * 0.45) * 0.1;
        g.rotation.y = MathUtils.damp(g.rotation.y, target, 3, dt);
    });
    return (
        <group ref={group} scale={0.6}>
            {packs.map((pack, i) => {
                const Model = MODELS[pack.kind] ?? MODELS.jar;
                const spot = spots[i] ?? spots[0];
                return (
                    <Float key={`${pack.name}-${i}`} speed={1.2 + i * 0.25} rotationIntensity={0.06} floatIntensity={0.3} floatingRange={[-0.05, 0.12]}>
                        <group position={[spot.x, 0, spot.z]} rotation={[0, spot.ry, 0]} scale={spot.s}><Model pack={pack} /></group>
                    </Float>
                );
            })}
        </group>
    );
}

export default function OfferScene({ packs, visible = true, mobile = false, onReady, className }) {
    return (
        <div className={className}>
            <Canvas
                camera={{ position: [0, 0.35, mobile ? 9.6 : 8.4], fov: 30, near: 0.1, far: 50 }}
                dpr={[1, mobile ? 1.5 : 1.8]}
                frameloop={visible ? 'always' : 'never'}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                onCreated={() => onReady?.()}
                style={{ background: 'transparent' }}
                resize={{ scroll: false, debounce: { resize: 200 } }}
            >
                <Suspense fallback={null}>
                    <ambientLight intensity={0.55} />
                    <directionalLight position={[4, 6, 5]} intensity={1.1} />
                    <Studio />
                    <Row packs={packs} mobile={mobile} />
                    <ContactShadows position={[0, -1.2, 0]} opacity={0.55} scale={11} blur={2.6} far={3.2} color="#12051a" />
                    <Sparkles count={mobile ? 14 : 28} scale={[9, 4, 3]} position={[0, 0.4, 0]} size={2.4} speed={0.25} opacity={0.55} color="#FEE1C5" />
                </Suspense>
            </Canvas>
        </div>
    );
}

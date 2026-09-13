import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import figureSrc from '@/assets/hero-figure-silhouette.png';

/** The figure plane + particle field, mouse-parallaxed and eased in on
 *  mount. Lives inside <Canvas> — everything here runs in the R3F render
 *  loop, not React state, so the parallax and entrance never trigger a
 *  React re-render. */
function FigureRig() {
    const texture = useTexture(figureSrc);
    const groupRef = useRef(null);
    const startRef = useRef(null);

    // Plane sized to the source image's own aspect ratio so it never
    // stretches, scaled up to comfortably fill the viewport height.
    const aspect = texture.image ? texture.image.width / texture.image.height : 900 / 1600;
    const height = 7.2;
    const width = height * aspect;

    useFrame((state, delta) => {
        if (startRef.current === null) startRef.current = state.clock.elapsedTime;
        const elapsed = state.clock.elapsedTime - startRef.current;

        // Entrance: eased scale/opacity over the first ~1.1s.
        const t = Math.min(1, elapsed / 1.1);
        const eased = 1 - (1 - t) * (1 - t) * (1 - t);
        if (groupRef.current) {
            const targetScale = 0.88 + eased * 0.12;
            groupRef.current.scale.setScalar(THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 6, delta));

            // Mouse parallax: gentle tilt toward the pointer, damped so it
            // trails smoothly rather than snapping.
            const targetRotY = state.pointer.x * 0.12;
            const targetRotX = -state.pointer.y * 0.06;
            groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, 5, delta);
            groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX, 5, delta);
            groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, -0.35 + eased * 0.35, 6, delta);
        }
        if (texture) texture.needsUpdate = false;
    });

    return (
        <group ref={groupRef} position={[0, -0.35, 0]} scale={0.88}>
            <mesh>
                <planeGeometry args={[width, height]} />
                <meshBasicMaterial map={texture} transparent opacity={0.98} toneMapped={false} />
            </mesh>
            {/* The "add something" extra layer — rising bioluminescent
                particles, echoing the figure's inner-glow skin texture. */}
            <Sparkles
                count={60}
                scale={[width * 0.9, height, 1.2]}
                size={2.5}
                speed={0.25}
                opacity={0.55}
                color="#F5C563"
                position={[0, 0, 0.4]}
            />
        </group>
    );
}

/** Lazy-loaded Three.js canvas for the Opening Intro — kept to this one
 *  hero moment rather than used page-wide, per the usual R3F cost
 *  trade-off on an e-commerce site. */
export default function FigureScene() {
    const [ready, setReady] = useState(false);

    return (
        <Canvas
            camera={{ position: [0, 0, 8], fov: 32 }}
            dpr={[1, 1.75]}
            gl={{ antialias: true, alpha: true }}
            onCreated={() => setReady(true)}
            style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.6s ease' }}
        >
            <FigureRig />
        </Canvas>
    );
}

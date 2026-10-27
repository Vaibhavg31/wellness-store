import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Float, Lightformer, OrbitControls, Sparkles } from '@react-three/drei';
import { MODELS } from './models';

/**
 * The 3D viewer: soft studio light (built from light panels, so nothing is downloaded), one pack floating gently,
 * drag to turn it, scroll or pinch to zoom, and it turns by itself. On a phone a vertical swipe still scrolls the
 * page (only sideways drags turn the pack), and the loop stops while the viewer is off screen.
 */

function useIsMobile() {
    const [mobile, setMobile] = useState(false);
    useEffect(() => {
        const mql = window.matchMedia('(max-width: 640px)');
        const update = () => setMobile(mql.matches);
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, []);
    return mobile;
}

function Studio() {
    return (
        <Environment resolution={256}>
            <Lightformer form="rect" intensity={2.4} position={[0, 4, 3]} scale={[9, 3, 1]} />
            <Lightformer form="rect" intensity={1.3} position={[-5, 1, 2]} scale={[2, 6, 1]} rotation-y={Math.PI / 2} />
            <Lightformer form="rect" intensity={1.3} position={[5, 1, 2]} scale={[2, 6, 1]} rotation-y={-Math.PI / 2} />
            <Lightformer form="rect" intensity={0.8} position={[0, -3, 3]} scale={[8, 1.5, 1]} />
            <Lightformer form="ring" intensity={1.2} position={[0, 1, -5]} scale={6} color="#FBF1E1" />
        </Environment>
    );
}

function Content({ pack, mobile }) {
    const Model = MODELS[pack.kind] ?? MODELS.jar;
    const controls = useRef(null);
    useEffect(() => {
        // OrbitControls claims every touch; give vertical swipes back to the page
        const el = controls.current?.domElement;
        if (el) el.style.touchAction = 'pan-y';
    }, []);
    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[4, 6, 5]} intensity={1.1} />
            <Studio />
            <Float speed={1.3} rotationIntensity={0.08} floatIntensity={0.25}>
                <group scale={mobile ? 0.85 : 0.9}><Model pack={pack} /></group>
            </Float>
            <Sparkles count={mobile ? 20 : 36} scale={5} size={2.2} speed={0.25} opacity={0.4} color="#C08A3E" />
            <OrbitControls
                ref={controls}
                makeDefault
                enablePan={false}
                enableDamping
                dampingFactor={0.06}
                rotateSpeed={0.9}
                minDistance={mobile ? 3.2 : 3}
                maxDistance={mobile ? 6 : 6.5}
                minPolarAngle={Math.PI / 3}
                maxPolarAngle={Math.PI / 1.7}
                autoRotate
                autoRotateSpeed={1.4}
            />
        </>
    );
}

export default function PackScene({ pack, visible = true, onReady, className }) {
    const mobile = useIsMobile();
    return (
        <div className={className}>
            <Canvas
                camera={{ position: [0, 0.3, mobile ? 4.5 : 4.8], fov: 38, near: 0.1, far: 50 }}
                dpr={[1, mobile ? 1.5 : 2]}
                frameloop={visible ? 'always' : 'never'}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                onCreated={() => onReady?.()}
                style={{ background: 'transparent' }}
                resize={{ scroll: false, debounce: { resize: 200 } }}
            >
                <Suspense fallback={null}>
                    <Content pack={pack} mobile={mobile} />
                </Suspense>
            </Canvas>
        </div>
    );
}

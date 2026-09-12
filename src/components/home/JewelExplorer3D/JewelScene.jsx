import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
    Environment,
    OrbitControls,
    Float,
    Sparkles,
} from '@react-three/drei';
import { JEWEL_PIECES } from './jewelryModels';

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia('(max-width: 640px)');
        const update = () => setIsMobile(mql.matches);
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, []);

    return isMobile;
}

function Pedestal() {
    return (
        <group position={[0, -1.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh renderOrder={-1}>
                <ringGeometry args={[0.75, 2.6, 64]} />
                <meshBasicMaterial color="#F2B8B5" transparent opacity={0.14} />
            </mesh>
            <mesh renderOrder={-1}>
                <ringGeometry args={[0.68, 0.78, 64]} />
                <meshBasicMaterial color="#D9B26F" transparent opacity={0.4} />
            </mesh>
        </group>
    );
}

function SceneContent({ pieceId, isMobile }) {
    const piece = JEWEL_PIECES.find((p) => p.id === pieceId) ?? JEWEL_PIECES[0];
    const Model = piece.Model;
    // Mobile was 1.15 (too much empty space) then 1.55 (clipped at the top
    // of the frame) — this is the middle ground.
    const modelScale = isMobile ? 1.2 : 0.8;

    return (
        <>
            <ambientLight intensity={0.35} />
            <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
            <directionalLight position={[-4, 2, -3]} intensity={0.4} color="#F2B8B5" />
            <spotLight position={[0, 6, 2]} angle={0.35} penumbra={1} intensity={0.8} color="#FFF8F0" />

            <Pedestal />

            <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.25}>
                <group scale={modelScale}>
                    <Model />
                </group>
            </Float>

            <Sparkles
                count={isMobile ? 45 : 90}
                scale={6}
                size={2.8}
                speed={0.3}
                opacity={0.55}
                color="#F2B8B5"
            />

            <Environment preset="studio" />
            <OrbitControls
                enablePan={false}
                // Pieces aren't modeled centered at the origin (e.g. the ring's
                // gems sit up around y=0.5-0.87) — without a target, the camera
                // orbits around world (0,0,0) and any size increase pushes the
                // piece further past the top of the frame instead of just
                // looking bigger.
                target={[0, 0.27, 0]}
                enableDamping
                dampingFactor={0.04}
                rotateSpeed={4.5}
                minDistance={isMobile ? 1.3 : 1.8}
                maxDistance={isMobile ? 3.8 : 5.2}
                minPolarAngle={Math.PI / 6}
                maxPolarAngle={Math.PI / 1.8}
                autoRotate
                autoRotateSpeed={1.1}
                makeDefault
            />
        </>
    );
}

function SceneLoader() {
    return (
        <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#F2B8B5" wireframe />
        </mesh>
    );
}

export default function JewelScene({ pieceId, className }) {
    const isMobile = useIsMobile();

    return (
        <div
            className={className}
            style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)', isolation: 'isolate' }}
        >
            {/* Static CSS shadow — a WebGL ContactShadows here caused a
                persistent flicker on mobile GPUs (re-rendered/re-composited
                shadow render-target flickering against the transparent
                canvas). A plain blurred ellipse can never flicker, since
                it's not GPU shadow-mapped at all. */}
            <div
                className="absolute left-1/2 bottom-[14%] -translate-x-1/2 rounded-full pointer-events-none"
                style={{
                    width: '48%',
                    height: '9%',
                    background: 'radial-gradient(ellipse at center, rgba(90,0,9,0.35) 0%, rgba(90,0,9,0.12) 55%, rgba(90,0,9,0) 75%)',
                    filter: 'blur(6px)',
                }}
                aria-hidden="true"
            />
            <Canvas
                camera={{ position: [0, 0.27, isMobile ? 3.7 : 3.6], fov: isMobile ? 50 : 44, near: 0.1, far: 100 }}
                dpr={[1, isMobile ? 1.5 : 2]}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                style={{ background: 'transparent', transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
                resize={{ scroll: false, debounce: { resize: 200 } }}
            >
                <Suspense fallback={<SceneLoader />}>
                    <SceneContent pieceId={pieceId} isMobile={isMobile} />
                </Suspense>
            </Canvas>
        </div>
    );
}

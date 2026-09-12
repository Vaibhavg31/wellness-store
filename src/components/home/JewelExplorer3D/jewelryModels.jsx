import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Rose-gold PVD band material */
const GOLD = {
    color: '#D9B26F',
    metalness: 1,
    roughness: 0.18,
    envMapIntensity: 1.2,
};

/** Diamond / crystal gem — physically based transmission */
const GEM = {
    color: '#FFF8F5',
    metalness: 0,
    roughness: 0.02,
    transmission: 0.95,
    thickness: 0.6,
    ior: 2.42,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
};

/** Blush pearl */
const PEARL = {
    color: '#F2B8B5',
    metalness: 0.3,
    roughness: 0.35,
    envMapIntensity: 0.8,
};

function Gem({ position = [0, 0, 0], scale = 1, geometry = 'octahedron' }) {
    const ref = useRef(null);
    useFrame((_, delta) => {
        if (ref.current) ref.current.rotation.y += delta * 0.15;
    });

    return (
        <mesh ref={ref} position={position} scale={scale}>
            {geometry === 'octahedron' && <octahedronGeometry args={[0.2, 0]} />}
            {geometry === 'dodecahedron' && <dodecahedronGeometry args={[0.18, 0]} />}
            {geometry === 'sphere' && <sphereGeometry args={[0.14, 32, 32]} />}
            <meshPhysicalMaterial {...GEM} />
        </mesh>
    );
}

/** Solitaire ring — band + prongs + centre stone */
export function RingModel() {
    const group = useRef(null);

    useFrame((_, delta) => {
        if (group.current) group.current.rotation.y += delta * 0.12;
    });

    const prongAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

    return (
        <group ref={group} rotation={[0.35, 0, 0]} scale={1.1}>
            <mesh>
                <torusGeometry args={[0.52, 0.075, 32, 80]} />
                <meshPhysicalMaterial {...GOLD} />
            </mesh>
            {/* Basket / setting */}
            <mesh position={[0, 0.48, 0]}>
                <cylinderGeometry args={[0.18, 0.22, 0.12, 32]} />
                <meshPhysicalMaterial {...GOLD} />
            </mesh>
            {prongAngles.map((angle, i) => (
                <mesh
                    key={i}
                    position={[Math.sin(angle) * 0.14, 0.58, Math.cos(angle) * 0.14]}
                    rotation={[0, -angle, 0]}
                >
                    <cylinderGeometry args={[0.012, 0.018, 0.22, 8]} />
                    <meshPhysicalMaterial {...GOLD} />
                </mesh>
            ))}
            <Gem position={[0, 0.72, 0]} scale={1.15} />
        </group>
    );
}

/** Pearl necklace on a draped curve */
export function NecklaceModel() {
    const group = useRef(null);
    const curve = useRef(
        new THREE.CatmullRomCurve3([
            new THREE.Vector3(-1.4, 0.35, 0),
            new THREE.Vector3(-0.9, -0.15, 0.15),
            new THREE.Vector3(-0.4, -0.45, 0),
            new THREE.Vector3(0, -0.55, -0.05),
            new THREE.Vector3(0.4, -0.45, 0),
            new THREE.Vector3(0.9, -0.15, 0.15),
            new THREE.Vector3(1.4, 0.35, 0),
        ])
    );

    const pearls = [];
    for (let i = 0; i <= 28; i++) {
        const t = i / 28;
        pearls.push(curve.current.getPoint(t));
    }

    useFrame((_, delta) => {
        if (group.current) group.current.rotation.y += delta * 0.08;
    });

    return (
        <group ref={group} rotation={[0.15, 0, 0]}>
            {pearls.map((p, i) => (
                <mesh key={i} position={[p.x, p.y, p.z]}>
                    <sphereGeometry args={[0.055 + (i % 3) * 0.008, 16, 16]} />
                    <meshPhysicalMaterial {...PEARL} />
                </mesh>
            ))}
            {/* Pendant */}
            <group position={[0, -0.62, 0]}>
                <mesh>
                    <torusGeometry args={[0.12, 0.025, 16, 32]} />
                    <meshPhysicalMaterial {...GOLD} />
                </mesh>
                <Gem position={[0, -0.22, 0]} scale={1.3} geometry="dodecahedron" />
            </group>
        </group>
    );
}

/** Drop earrings pair */
export function EarringsModel() {
    const group = useRef(null);

    useFrame((_, delta) => {
        if (group.current) group.current.rotation.y += delta * 0.1;
    });

    const Earring = ({ x }) => (
        <group position={[x, 0, 0]}>
            {/* Hook */}
            <mesh position={[0, 0.75, 0]} rotation={[0, 0, x > 0 ? 0.3 : -0.3]}>
                <torusGeometry args={[0.08, 0.015, 12, 32, Math.PI]} />
                <meshPhysicalMaterial {...GOLD} />
            </mesh>
            {/* Chain links */}
            {[0.55, 0.35, 0.15].map((y, i) => (
                <mesh key={i} position={[0, y, 0]}>
                    <torusGeometry args={[0.04, 0.012, 12, 24]} />
                    <meshPhysicalMaterial {...GOLD} />
                </mesh>
            ))}
            {/* Drop gem */}
            <Gem position={[0, -0.08, 0]} scale={0.9} geometry="sphere" />
            <mesh position={[0, 0.02, 0]}>
                <cylinderGeometry args={[0.03, 0.05, 0.06, 16]} />
                <meshPhysicalMaterial {...GOLD} />
            </mesh>
        </group>
    );

    return (
        <group ref={group} rotation={[0.1, 0, 0]} scale={1.05}>
            <Earring x={-0.55} />
            <Earring x={0.55} />
        </group>
    );
}

/** Tennis bracelet — gem-studded band */
export function BraceletModel() {
    const group = useRef(null);
    const gems = 14;

    useFrame((_, delta) => {
        if (group.current) group.current.rotation.y += delta * 0.1;
    });

    return (
        <group ref={group} rotation={[0.5, 0, 0]} scale={1.05}>
            <mesh>
                <torusGeometry args={[0.65, 0.06, 24, 80]} />
                <meshPhysicalMaterial {...GOLD} />
            </mesh>
            {Array.from({ length: gems }).map((_, i) => {
                const angle = (i / gems) * Math.PI * 2;
                return (
                    <mesh
                        key={i}
                        position={[Math.sin(angle) * 0.65, Math.cos(angle) * 0.08, Math.cos(angle) * 0.65]}
                        rotation={[0, angle, 0]}
                    >
                        <boxGeometry args={[0.08, 0.08, 0.04]} />
                        <meshPhysicalMaterial {...GEM} />
                    </mesh>
                );
            })}
        </group>
    );
}

export const JEWEL_PIECES = [
    {
        id: 'ring',
        label: 'Solitaire Ring',
        description: 'Rose-gold band with brilliant-cut centre stone',
        Model: RingModel,
    },
    {
        id: 'necklace',
        label: 'Pearl Cascade',
        description: 'Lustrous pearls with a crystal pendant drop',
        Model: NecklaceModel,
    },
    {
        id: 'earrings',
        label: 'Aurora Drops',
        description: 'Elegant drop earrings with crystal spheres',
        Model: EarringsModel,
    },
    {
        id: 'bracelet',
        label: 'Tennis Bracelet',
        description: 'Continuous line of handset crystals',
        Model: BraceletModel,
    },
];

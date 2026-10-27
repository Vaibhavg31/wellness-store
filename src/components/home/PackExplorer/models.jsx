import { useEffect, useMemo, useState } from 'react';
import { DoubleSide, Vector2 } from 'three';
import { RoundedBox } from '@react-three/drei';
import { makeLabelTexture } from './labelTexture';

/**
 * The five pack shapes, all about 2.2 units tall and centred on the origin. Bodies are lathed profiles with a glossy
 * clear-coat; the printed label is a wrap of the same radius (a hair larger) so it reads as paper on the pack.
 */

const lathe = (pairs) => pairs.map(([r, y]) => new Vector2(r, y));

/** Rounded profile helper: a straight wall with a rounded foot and shoulder. */
function bodyProfile({ r, bottom, top, foot = 0.12, shoulder = 0.16, steps = 8 }) {
    const pts = [[0.001, bottom]];
    for (let i = 0; i <= steps; i += 1) { const a = (i / steps) * (Math.PI / 2); pts.push([r - foot + Math.sin(a) * foot, bottom + foot - Math.cos(a) * foot]); }
    for (let i = 0; i <= steps; i += 1) { const a = (i / steps) * (Math.PI / 2); pts.push([r - shoulder + Math.cos(a) * shoulder, top - shoulder + Math.sin(a) * shoulder]); }
    return lathe(pts);
}

function useLabel(pack) {
    const [map, setMap] = useState(null);
    useEffect(() => {
        let alive = true;
        let tex;
        makeLabelTexture(pack).then((t) => { tex = t; if (alive) setMap(t); else t.dispose(); });
        return () => { alive = false; tex?.dispose(); };
    }, [pack]);
    return map;
}

const gloss = { roughness: 0.22, metalness: 0.02, clearcoat: 1, clearcoatRoughness: 0.08 };

/** Only the printed front of the label texture (the middle 42%), for packs whose label covers just the front. */
const FRONT = 0.42;
function useFront(map) {
    return useMemo(() => {
        if (!map) return null;
        const t = map.clone();
        t.repeat.set(FRONT, 1);
        t.offset.set((1 - FRONT) / 2, 0);
        t.needsUpdate = true;
        return t;
    }, [map]);
}

/** A wrap around the pack. With `front`, a front-only band: the arc spans 42% of the circle and shows the printed front. */
function Label({ map, radius, height, y, scaleZ = 1, front = false }) {
    const cropped = useFront(map);
    const arc = Math.PI * 2 * FRONT;
    return (
        <mesh visible={Boolean(map)} position={[0, y, 0]} scale={[1, 1, scaleZ]} rotation={[0, Math.PI, 0]}>
            <cylinderGeometry args={front ? [radius, radius, height, 64, 1, true, Math.PI - arc / 2, arc] : [radius, radius, height, 96, 1, true, 0, Math.PI * 2]} />
            <meshStandardMaterial map={front ? cropped : map} roughness={0.5} metalness={0} side={DoubleSide} />
        </mesh>
    );
}

/** A flat label panel for packs with a flat front (the pouch). */
function FlatLabel({ map, width, y, z }) {
    const cropped = useFront(map);
    const height = (width * 700) / (2048 * FRONT);
    return (
        <mesh visible={Boolean(map)} position={[0, y, z]}>
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial map={cropped} roughness={0.5} metalness={0} />
        </mesh>
    );
}

export function Bottle({ pack }) {
    const map = useLabel(pack);
    const body = useMemo(() => lathe([
        [0.001, -1.1], [0.38, -1.1], [0.5, -1.04], [0.54, -0.92], [0.54, 0.2], [0.51, 0.42], [0.4, 0.62], [0.27, 0.78], [0.22, 0.92], [0.22, 1.02],
        [0.26, 1.04], [0.26, 1.08], [0.001, 1.08],
    ]), []);
    return (
        <group>
            <mesh><latheGeometry args={[body, 96]} /><meshPhysicalMaterial color={pack.body} {...gloss} /></mesh>
            <Label map={map} radius={0.548} height={1.12} y={-0.38} />
            <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.285, 0.285, 0.34, 64]} /><meshPhysicalMaterial color={pack.cap} roughness={0.35} clearcoat={0.5} /></mesh>
            <mesh position={[0, 1.04, 0]}><cylinderGeometry args={[0.3, 0.3, 0.04, 64]} /><meshPhysicalMaterial color={pack.cap} roughness={0.4} /></mesh>
        </group>
    );
}

export function Jar({ pack }) {
    const map = useLabel(pack);
    const body = useMemo(() => bodyProfile({ r: 0.84, bottom: -0.9, top: 0.62, foot: 0.14, shoulder: 0.18 }), []);
    return (
        <group position={[0, -0.05, 0]}>
            <mesh><latheGeometry args={[body, 96]} /><meshPhysicalMaterial color={pack.body} {...gloss} /></mesh>
            <Label map={map} radius={0.846} height={1.1} y={-0.2} />
            <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.88, 0.88, 0.5, 96]} /><meshPhysicalMaterial color={pack.cap} roughness={0.38} clearcoat={0.6} clearcoatRoughness={0.2} /></mesh>
            <mesh position={[0, 1.16, 0]}><cylinderGeometry args={[0.8, 0.88, 0.04, 96]} /><meshPhysicalMaterial color={pack.cap} roughness={0.4} /></mesh>
            <mesh position={[0, 0.66, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.84, 0.025, 16, 96]} /><meshStandardMaterial color={pack.cap} roughness={0.5} /></mesh>
        </group>
    );
}

export function Tube({ pack }) {
    const map = useLabel(pack);
    const squash = 0.46;
    return (
        <group position={[0, 0, 0]}>
            <group scale={[1, 1, squash]}>
                <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.52, 0.52, 1.78, 64]} /><meshPhysicalMaterial color={pack.body} {...gloss} /></mesh>
            </group>
            <Label map={map} radius={0.526} height={1.12} y={0.05} scaleZ={squash} front />
            {/* flat crimped top */}
            <mesh position={[0, 1.02, 0]} scale={[1, 1, 0.06]}><boxGeometry args={[1.04, 0.2, 1]} /><meshPhysicalMaterial color={pack.body} roughness={0.35} clearcoat={0.6} /></mesh>
            {/* cap at the foot: the tube stands on it */}
            <mesh position={[0, -1.0, 0]} scale={[1, 1, squash * 1.1]}><cylinderGeometry args={[0.42, 0.46, 0.34, 64]} /><meshPhysicalMaterial color={pack.cap} roughness={0.35} clearcoat={0.5} /></mesh>
            <mesh position={[0, -0.8, 0]} scale={[1, 1, squash]}><cylinderGeometry args={[0.52, 0.42, 0.14, 64]} /><meshPhysicalMaterial color={pack.body} roughness={0.35} clearcoat={0.6} /></mesh>
        </group>
    );
}

export function Pouch({ pack }) {
    const map = useLabel(pack);
    return (
        <group>
            <RoundedBox args={[1.5, 2.0, 0.62]} radius={0.16} smoothness={6} position={[0, -0.04, 0]}>
                <meshPhysicalMaterial color={pack.body} {...gloss} roughness={0.3} />
            </RoundedBox>
            {/* the label panel on the front and a quiet one on the back */}
            <FlatLabel map={map} width={1.14} y={-0.12} z={0.316} />
            <mesh position={[0, 1.0, 0]}><boxGeometry args={[1.5, 0.12, 0.16]} /><meshPhysicalMaterial color={pack.cap} roughness={0.4} /></mesh>
            <mesh position={[0, 0.82, 0.32]}><boxGeometry args={[1.2, 0.04, 0.02]} /><meshStandardMaterial color="#FFFFFF" roughness={0.5} /></mesh>
        </group>
    );
}

export function Pump({ pack }) {
    const map = useLabel(pack);
    const body = useMemo(() => bodyProfile({ r: 0.5, bottom: -1.1, top: 0.55, foot: 0.12, shoulder: 0.2 }), []);
    return (
        <group position={[0, -0.12, 0]}>
            <mesh><latheGeometry args={[body, 96]} /><meshPhysicalMaterial color={pack.body} {...gloss} /></mesh>
            <Label map={map} radius={0.506} height={1.15} y={-0.3} />
            <mesh position={[0, 0.66, 0]}><cylinderGeometry args={[0.22, 0.24, 0.16, 48]} /><meshPhysicalMaterial color={pack.cap} roughness={0.4} clearcoat={0.4} /></mesh>
            <mesh position={[0, 1.0, 0]}><cylinderGeometry args={[0.06, 0.06, 0.62, 24]} /><meshPhysicalMaterial color={pack.cap} roughness={0.4} /></mesh>
            <mesh position={[0.1, 1.36, 0]}><boxGeometry args={[0.5, 0.14, 0.17]} /><meshPhysicalMaterial color={pack.cap} roughness={0.4} clearcoat={0.4} /></mesh>
            <mesh position={[0.32, 1.31, 0]}><cylinderGeometry args={[0.04, 0.04, 0.16, 20]} /><meshPhysicalMaterial color={pack.cap} roughness={0.4} /></mesh>
        </group>
    );
}

export const MODELS = { bottle: Bottle, jar: Jar, tube: Tube, pouch: Pouch, pump: Pump };

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Connection3DArrow({ edge, nodes, connectionStyle = 'curved' }) {
    const tubeRef = useRef();
    // Usaremos un grupo para contener las múltiples flechas
    const arrowsGroupRef = useRef();

    // Encontrar nodos de origen y destino
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode || !sourceNode.data || !targetNode || !targetNode.data) return null;

    // Calcular índices para fallback de posición
    const sourceIndex = nodes.indexOf(sourceNode);
    const targetIndex = nodes.indexOf(targetNode);

    // Posiciones 3D
    const sourcePos = sourceNode.data.position3D || {
        x: (sourceIndex % 5) * 3 - 6,
        y: 0,
        z: Math.floor(sourceIndex / 5) * 3 - 3
    };

    const targetPos = targetNode.data.position3D || {
        x: (targetIndex % 5) * 3 - 6,
        y: 0,
        z: Math.floor(targetIndex / 5) * 3 - 3
    };

    // Crear curva para la flecha
    const curve = useMemo(() => {
        const start = new THREE.Vector3(sourcePos.x, sourcePos.y + 0.5, sourcePos.z);
        const end = new THREE.Vector3(targetPos.x, targetPos.y + 0.5, targetPos.z);

        if (connectionStyle === 'straight') {
            return new THREE.LineCurve3(start, end);
        }

        // Calcular distancia para altura proporcional
        const dist = start.distanceTo(end);

        // Punto de control para curva cuadrática - Altura dinámica basada en distancia
        const mid = new THREE.Vector3(
            (start.x + end.x) / 2,
            Math.max(start.y, end.y) + (dist * 0.3), // Altura proporcional a la distancia (min 2)
            (start.z + end.z) / 2
        );

        return new THREE.QuadraticBezierCurve3(start, mid, end);
    }, [sourcePos, targetPos, connectionStyle]);

    // Color
    const getColor = () => {
        const colorMap = {
            'Mezcladora': '#00F0FF', // Cyan
            'Extrusora': '#8B5CF6', // Purple
            'Molino': '#10b981',    // Emerald
            'Secadora': '#f59e0b',  // Amber
            'Empacadora': '#ec4899',// Pink
            'Transportador': '#06b6d4', // Cyan dark
        };
        const typeKey = Object.keys(colorMap).find(k => k.toLowerCase() === (sourceNode.data.type || '').toLowerCase());
        return sourceNode.data.color || (typeKey ? colorMap[typeKey] : '#00F0FF');
    };
    const color = getColor();

    // Geometría de Flecha Sólida (Extruida)
    const arrowGeometry = useMemo(() => {
        const shape = new THREE.Shape();
        // Dibujar forma de flecha plana
        // Cuerpo ancho
        shape.moveTo(-0.15, -0.3);
        shape.lineTo(0.15, -0.3);
        shape.lineTo(0.15, 0.1);
        // Cabeza
        shape.lineTo(0.3, 0.1);
        shape.lineTo(0, 0.5); // Punta
        shape.lineTo(-0.3, 0.1);
        shape.lineTo(-0.15, 0.1);
        shape.lineTo(-0.15, -0.3);

        const extrudeSettings = {
            steps: 1,
            depth: 0.1, // Grosor 3D
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 2
        };

        const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        // Ajuste de pivote
        geom.translate(0, -0.1, -0.05);
        return geom;
    }, []);

    const arrowCount = 4; // Número de flechas circulando
    const arrows = useMemo(() => {
        return new Array(arrowCount).fill(0).map((_, i) => ({
            offset: i / arrowCount,
            speed: 0.3
        }));
    }, [arrowCount]);

    useFrame(({ clock }) => {
        const time = clock.elapsedTime;

        if (arrowsGroupRef.current) {
            arrowsGroupRef.current.children.forEach((child, i) => {
                const arrowData = arrows[i];
                const t = (time * arrowData.speed + arrowData.offset) % 1;

                const point = curve.getPoint(t);
                const tangent = curve.getTangent(t).normalize();

                child.position.copy(point);
                child.lookAt(point.clone().add(tangent));

                // Alineación correcta de flechas (invertida 180 grados a petición)
                child.rotateX(Math.PI / 2);
                // Rotar sobre su eje para que las aletas queden verticales
                child.rotateY(Math.PI / 2);
            });
        }
    });

    return (
        <group>
            {/* Tubo Base (Más grueso según petición: 0.15) */}
            <mesh ref={tubeRef}>
                <tubeGeometry args={[curve, 64, 0.15, 8, false]} />
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={0.3}
                    roughness={0.4}
                    metalness={0.1}
                    emissive={color}
                    emissiveIntensity={0.1}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Núcleo interno (Línea sólida delgada) */}
            <mesh>
                <tubeGeometry args={[curve, 64, 0.015, 8, false]} />
                <meshBasicMaterial color={color} />
            </mesh>

            {/* Grupo de Flechas 3D Sólidas en Movimiento */}
            <group ref={arrowsGroupRef}>
                {arrows.map((_, i) => (
                    <mesh key={i} geometry={arrowGeometry}>
                        <meshStandardMaterial
                            color={color}
                            emissive={color}
                            emissiveIntensity={0.5}
                            roughness={0.2}
                            metalness={0.8}
                        />
                    </mesh>
                ))}
            </group>

            {/* Marcador final estático */}
            <mesh position={[targetPos.x, targetPos.y + 0.5, targetPos.z]}>
                <cylinderGeometry args={[0.01, 0.2, 0.5, 8]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.8}
                />
            </mesh>
        </group>
    );
}

export default React.memo(Connection3DArrow);

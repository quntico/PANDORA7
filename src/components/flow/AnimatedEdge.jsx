import React from 'react';
import { getBezierPath } from 'reactflow';

function AnimatedEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}) {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    return (
        <>
            {/* Glow background */}
            <path
                id={`${id}-glow`}
                style={{
                    ...style,
                    strokeWidth: 8,
                    stroke: style.stroke || '#00F0FF',
                    opacity: 0.2,
                    filter: 'blur(4px)',
                }}
                className="react-flow__edge-path"
                d={edgePath}
            />

            {/* Main path */}
            <path
                id={id}
                style={{
                    ...style,
                    strokeWidth: 3,
                }}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
            />

            {/* Animated particles */}
            {/* Animated particles (Arrows) */}
            <g>
                <path
                    d="M-4,-4 L4,0 L-4,4 z"
                    fill={style.stroke || '#00F0FF'}
                >
                    <animateMotion
                        dur="1.5s"
                        repeatCount="indefinite"
                        path={edgePath}
                        rotate="auto"
                    />
                </path>
            </g>
            <g>
                <path
                    d="M-3,-3 L3,0 L-3,3 z"
                    fill={style.stroke || '#00F0FF'}
                    opacity="0.6"
                >
                    <animateMotion
                        dur="1.5s"
                        repeatCount="indefinite"
                        path={edgePath}
                        begin="0.5s"
                        rotate="auto"
                    />
                </path>
            </g>
        </>
    );
}

export default AnimatedEdge;

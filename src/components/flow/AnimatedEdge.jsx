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
            <circle r="4" fill={style.stroke || '#00F0FF'} className="opacity-80">
                <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
            </circle>
            <circle r="4" fill={style.stroke || '#00F0FF'} className="opacity-60">
                <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="0.5s" />
            </circle>
            <circle r="3" fill="white" className="opacity-40">
                <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="1s" />
            </circle>
        </>
    );
}

export default AnimatedEdge;

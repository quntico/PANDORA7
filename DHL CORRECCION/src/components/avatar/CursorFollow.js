import { useEffect, useRef } from 'react';
import { useAvatarStore } from './AvatarState';

export function useCursorFollow() {
  const rotationRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const handleMouseMove = (event) => {
      // Reset inactivity on movement
      useAvatarStore.getState().resetActivity();

      // Normalize cursor coordinate to [-1, 1] range
      const normX = (event.clientX / window.innerWidth) * 2 - 1;
      const normY = -(event.clientY / window.innerHeight) * 2 + 1;

      // Limits:
      // rotación horizontal (Y axis rotation): +-10 deg (+-0.174 rad)
      // rotación vertical (X axis rotation): +-6 deg (+-0.104 rad)
      const maxRadY = (10 * Math.PI) / 180;
      const maxRadX = (6 * Math.PI) / 180;

      rotationRef.current.targetY = normX * maxRadY; // rotate left/right
      rotationRef.current.targetX = -normY * maxRadX; // rotate up/down
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const updateRotation = () => {
    const current = rotationRef.current;
    
    // Apply inertia/decay decay to target coordinates (dampening)
    current.targetX *= 0.98;
    current.targetY *= 0.98;

    // Smooth transition using requested lerp = 0.018
    current.x += (current.targetX - current.x) * 0.018;
    current.y += (current.targetY - current.y) * 0.018;

    return { x: current.x, y: current.y };
  };

  return { updateRotation };
}

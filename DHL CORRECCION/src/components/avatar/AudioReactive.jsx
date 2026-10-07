import React, { useEffect, useRef } from 'react';
import { useAvatarStore } from './AvatarState';

export default function AudioReactive() {
  const canvasRef = useRef(null);
  const amplitude = useAvatarStore(state => state.audioAmplitude);
  const currentState = useAvatarStore(state => state.currentState);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = 80;
    };
    
    resize();
    window.addEventListener('resize', resize);

    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isActive = currentState === 'SPEAKING' || currentState === 'LISTENING';
      const amp = isActive ? amplitude : 0.05 + Math.sin(phase * 2) * 0.02; // soft idle wave
      
      phase += 0.07;

      // Draw 3 layers of glowing neon waves
      const lines = [
        { color: 'rgba(0, 229, 255, 0.6)', glow: '#00E5FF', speed: 1, height: 25 * amp, offset: 0 },
        { color: 'rgba(192, 38, 255, 0.4)', glow: '#C026FF', speed: 1.5, height: 18 * amp, offset: Math.PI / 2 },
        { color: 'rgba(0, 229, 255, 0.2)', glow: '#00E5FF', speed: 0.8, height: 10 * amp, offset: Math.PI }
      ];

      lines.forEach((line) => {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = line.glow;
        ctx.shadowBlur = isActive ? 10 : 2;

        for (let x = 0; x < canvas.width; x++) {
          const angle = (x / canvas.width) * Math.PI * 4 + phase * line.speed + line.offset;
          // Centered vertically (canvas.height / 2)
          const y = canvas.height / 2 + Math.sin(angle) * line.height * Math.sin(x / canvas.width * Math.PI);
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [amplitude, currentState]);

  return (
    <div className="w-full h-[80px] relative">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  isActive: boolean;
  color?: string;
  barsCount?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isActive,
  color = '#14b8a6',
  barsCount = 28
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / barsCount;
      const centerY = height / 2;

      for (let i = 0; i < barsCount; i++) {
        let barHeight = 4;
        if (isActive) {
          const sinFactor = Math.sin(phase + i * 0.35) * Math.cos(phase * 0.8 + i * 0.2);
          barHeight = Math.max(4, Math.abs(sinFactor) * (height * 0.85));
        }

        ctx.fillStyle = color;
        const x = i * barWidth + barWidth * 0.2;
        const y = centerY - barHeight / 2;
        const w = barWidth * 0.6;
        const radius = Math.min(w / 2, barHeight / 2);

        ctx.beginPath();
        ctx.roundRect(x, y, w, barHeight, radius);
        ctx.fill();
      }

      phase += 0.12;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, color, barsCount]);

  return (
    <div className="flex items-center justify-center p-2 bg-slate-900/60 rounded-xl border border-slate-800">
      <canvas
        ref={canvasRef}
        width={240}
        height={36}
        className="w-full h-9"
      />
    </div>
  );
};

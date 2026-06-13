import { useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';

export const useCanvas = (roomId: string, role: string) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { socket } = useSocket();
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('drawEvent', (data: { x: number, y: number, type: 'start' | 'draw' | 'end', color: string }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { x, y, type, color } = data;
      const actualX = x * canvas.width;
      const actualY = y * canvas.height;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      if (type === 'start') {
        ctx.beginPath();
        ctx.moveTo(actualX, actualY);
      } else if (type === 'draw') {
        ctx.lineTo(actualX, actualY);
        ctx.stroke();
      } else if (type === 'end') {
        ctx.closePath();
      }
    });

    socket.on('clearCanvas', () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      socket.off('drawEvent');
      socket.off('clearCanvas');
    };
  }, [socket]);

  const emitDrawEvent = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, type: 'start' | 'draw' | 'end') => {
    // Only agents are allowed to draw annotations
    if (role !== 'agent' || !socket) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX;
      clientY = e.touches[0]?.clientY;
      if (!clientX) return; // Touch end
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    socket.emit('drawEvent', { roomId, x, y, type, color: '#10b981' });
    
    // Draw locally as well
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const actualX = x * canvas.width;
    const actualY = y * canvas.height;

    if (type === 'start') {
      ctx.beginPath();
      ctx.moveTo(actualX, actualY);
      setIsDrawing(true);
    } else if (type === 'draw' && isDrawing) {
      ctx.lineTo(actualX, actualY);
      ctx.stroke();
    } else if (type === 'end') {
      ctx.closePath();
      setIsDrawing(false);
    }
  };

  const startDrawing = (e: any) => emitDrawEvent(e, 'start');
  const draw = (e: any) => {
    if (!isDrawing) return;
    emitDrawEvent(e, 'draw');
  };
  const stopDrawing = (e: any) => emitDrawEvent(e, 'end');

  const clearCanvas = () => {
    if (role !== 'agent' || !socket) return;
    socket.emit('clearCanvas', { roomId });
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Keep canvas size synced
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    });
    
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  return { canvasRef, startDrawing, draw, stopDrawing, clearCanvas };
};

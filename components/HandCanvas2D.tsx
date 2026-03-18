"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";

// MediaPipe hand bone connections
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],       // thumb
  [0,5],[5,6],[6,7],[7,8],       // index
  [0,9],[9,10],[10,11],[11,12],  // middle
  [0,13],[13,14],[14,15],[15,16],// ring
  [0,17],[17,18],[18,19],[19,20],// pinky
  [5,9],[9,13],[13,17],          // palm
];

export function HandCanvas2D({
  videoRef,
  mirror = true,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mirror?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Continuous RAF loop — draws video every frame, overlays landmarks when available
  useEffect(() => {
    let rafId: number;

    function draw() {
      const canvas = canvasRef.current;
      const video  = videoRef.current;

      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const W = canvas.width;
          const H = canvas.height;

          ctx.clearRect(0, 0, W, H);

          // Draw video feed
          if (video && video.readyState >= 2) {
            if (mirror) {
              ctx.save();
              ctx.translate(W, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(video, 0, 0, W, H);
              ctx.restore();
            } else {
              ctx.drawImage(video, 0, 0, W, H);
            }
          }

          // Overlay hand landmarks (read latest from store without subscribing)
          const { landmarks } = useAppStore.getState();
          if (landmarks) {
            if (landmarks.right_hand) drawHand(ctx, W, H, landmarks.right_hand, "#3ea89f");
            if (landmarks.left_hand)  drawHand(ctx, W, H, landmarks.left_hand,  "#e0686a");
            ctx.globalAlpha = 1;
          }
        }
      }

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [videoRef, mirror]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(([entry]) => {
      canvas.width  = entry.contentRect.width;
      canvas.height = entry.contentRect.height;
    });
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 2,
      }}
    />
  );
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  arr: Float32Array,
  color: string,
) {
  const lm = (i: number) => ({
    x: (1 - arr[i * 3])    * W,
    y:      arr[i * 3 + 1] * H,
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.75;
  for (const [a, b] of HAND_CONNECTIONS) {
    const pa = lm(a), pb = lm(b);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  for (let i = 0; i < 21; i++) {
    const p = lm(i);
    ctx.beginPath();
    ctx.arc(p.x, p.y, i === 0 ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

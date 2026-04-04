"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { extractFeatures } from "@/lib/features";
import { pushToFeatureBuffer } from "@/lib/featureBuffer";
import { fingerspellingH } from "@/lib/phonology";
import { inferenceWorkerBridge } from "@/lib/inferenceWorkerBridge";
import type { MediaPipeWorkerOut, Landmarks } from "@/types";

// Pre-allocated transfer buffers — avoids .slice() copy on every frame.
// We alternate between two buffers so we always have one ready to fill
// while the previous one may still be in-flight via postMessage transfer.
const SIGN_FV_DIM = 46;
const FS_FV_DIM   = 13;
let signBufIdx = 0;
const signTransferBufs = [new ArrayBuffer(SIGN_FV_DIM * 4), new ArrayBuffer(SIGN_FV_DIM * 4)];
let fsBufIdx = 0;
const fsTransferBufs = [new ArrayBuffer(FS_FV_DIM * 4), new ArrayBuffer(FS_FV_DIM * 4)];

interface UseMediaPipeOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
}

export function useMediaPipe({ videoRef, enabled = true }: UseMediaPipeOptions) {
  const workerRef   = useRef<Worker | null>(null);
  const rafRef      = useRef(0);
  const pendingRef  = useRef(false);
  const lastFpsRef  = useRef(0);
  const fpsCountRef = useRef(0);
  const enabledRef  = useRef(enabled);

  // Sync without restarting the camera stream
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const setStatus = useAppStore((s) => s.setStatus);
  const setFps    = useAppStore((s) => s.setFps);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let cameraStream: MediaStream | null = null;

    const worker = new Worker(
      new URL("../workers/mediapipe.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<MediaPipeWorkerOut>) => {
      const msg = e.data;
      if (msg.type === "ready") {
        setStatus("live");
        rafRef.current = requestAnimationFrame(sendFrame);
      } else if (msg.type === "error") {
        console.error("[mediapipe worker]", msg.message);
        setStatus("error");
      } else if (msg.type === "landmarks") {
        pendingRef.current = false;
        const d = msg.data;
        const landmarks: Landmarks = {
          timestamp_ms: d.timestamp_ms,
          ...(d.left_hand  && { left_hand:  new Float32Array(d.left_hand)  }),
          ...(d.right_hand && { right_hand: new Float32Array(d.right_hand) }),
          ...(d.pose       && { pose:       new Float32Array(d.pose)       }),
          ...(d.face       && { face:       new Float32Array(d.face)       }),
        };
        const features = extractFeatures(landmarks);
        pushToFeatureBuffer(features.feature_vector_51);
        useAppStore.setState({
          landmarks,
          phonology: features,
          latency_ms: Math.round(performance.now() - d.timestamp_ms),
        });

        // Forward feature vector directly to inference worker — bypasses
        // Zustand/React so the phonology update above doesn't have to wait
        // for a React re-render cycle before inference sees the frame.
        const infWorker = inferenceWorkerBridge.current;
        if (infWorker && enabledRef.current) {
          const mode = useAppStore.getState().modelMode;
          if (mode === "fingerspelling") {
            // Use raw (pre-Sim3) landmarks — fingerspellingH normalizes internally
            const hand = landmarks.right_hand ?? landmarks.left_hand;
            if (hand) {
              const fsFeats = fingerspellingH(hand);
              // Double-buffer: copy into pre-allocated buffer, transfer it,
              // then swap to the other buffer for next frame
              const buf = fsTransferBufs[fsBufIdx];
              fsBufIdx = 1 - fsBufIdx;
              new Float32Array(buf).set(fsFeats);
              infWorker.postMessage({ type: "features_fs", data: buf }, [buf]);
              // Replace the transferred buffer so the pool stays filled
              fsTransferBufs[1 - fsBufIdx] = new ArrayBuffer(FS_FV_DIM * 4);
            }
          } else {
            const fv  = features.feature_vector;
            const buf = signTransferBufs[signBufIdx];
            signBufIdx = 1 - signBufIdx;
            new Float32Array(buf).set(fv);
            infWorker.postMessage({ type: "features", data: buf }, [buf]);
            signTransferBufs[1 - signBufIdx] = new ArrayBuffer(SIGN_FV_DIM * 4);
          }
        }
      }
    };

    function sendFrame() {
      if (cancelled) return;
      rafRef.current = requestAnimationFrame(sendFrame);

      if (!enabledRef.current) return;

      const video = videoRef.current;
      if (!video) return;

      const appStatus = useAppStore.getState().status;
      if (appStatus === "paused") return;

      if (video.readyState < 2) return;

      const now = performance.now();
      fpsCountRef.current++;
      if (now - lastFpsRef.current >= 1000) {
        setFps(fpsCountRef.current);
        fpsCountRef.current = 0;
        lastFpsRef.current = now;
      }

      if (pendingRef.current) return;
      pendingRef.current = true;

      createImageBitmap(video).then((bitmap) => {
        if (cancelled) { bitmap.close(); return; }
        workerRef.current?.postMessage(
          { type: "frame", bitmap, timestamp_ms: now },
          [bitmap]
        );
      }).catch(() => {
        pendingRef.current = false;
      });
    }

    async function setup() {
      const video = videoRef.current;
      if (!video) return;

      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        if (cancelled) { cameraStream.getTracks().forEach(t => t.stop()); return; }
        video.removeAttribute("src");
        video.load();
        video.srcObject = cameraStream;
        await video.play();
      } catch {
        setStatus("error");
        return;
      }

      setStatus("loading");
      worker.postMessage({ type: "init" });
    }

    setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      worker.terminate();
      workerRef.current = null;
      pendingRef.current = false;

      const v = videoRef.current;
      if (v) { v.pause(); v.srcObject = null; v.removeAttribute("src"); v.load(); }

      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}

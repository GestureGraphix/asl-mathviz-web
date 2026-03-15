"use client";

import { useEffect, useRef } from "react";
import {
  HandLandmarker,
  PoseLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import { useAppStore } from "@/store/appStore";
import { extractFeatures } from "@/lib/features";
import { pushToFeatureBuffer } from "@/lib/featureBuffer";
import type { Landmarks } from "@/types";

interface UseMediaPipeOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
}

export function useMediaPipe({ videoRef, enabled = true }: UseMediaPipeOptions) {
  const animFrameRef  = useRef<number>(0);
  const handRef       = useRef<HandLandmarker | null>(null);
  const poseRef       = useRef<PoseLandmarker | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsRef    = useRef(0);
  const fpsCountRef   = useRef(0);

  const setStatus = useAppStore((s) => s.setStatus);
  const setFps    = useAppStore((s) => s.setFps);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function setup() {
      // 1 — request webcam
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
      } catch {
        setStatus("error");
        return;
      }

      setStatus("loading");

      // 2 — initialise MediaPipe from local WASM (no CDN dependency)
      try {
        const vision = await FilesetResolver.forVisionTasks("/wasm");
        if (cancelled) return;

        // "GPU" = WebGL2-accelerated inference; falls back to XNNPACK CPU
        // automatically if WebGL2 is unavailable — both are fast.
        const delegate = "GPU";

        [handRef.current, poseRef.current] = await Promise.all([
          HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate,
            },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          }),
          PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
              delegate,
            },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          }),
        ]);
      } catch (err) {
        console.error("[MediaPipe init]", err);
        setStatus("error");
        return;
      }

      if (cancelled) return;
      setStatus("live");
      animFrameRef.current = requestAnimationFrame(processFrame);
    }

    function processFrame() {
      const video = videoRef.current;
      const hand  = handRef.current;
      const pose  = poseRef.current;

      if (!video || !hand || !pose || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const t0 = performance.now();
      frameCountRef.current++;

      const handResult = hand.detectForVideo(video, t0);
      const poseResult = pose.detectForVideo(video, t0);

      // ── Build landmark arrays ──────────────────────────────
      let left_hand: Float32Array | undefined;
      let right_hand: Float32Array | undefined;

      for (let i = 0; i < handResult.landmarks.length; i++) {
        const lms  = handResult.landmarks[i];
        const side = handResult.handedness[i]?.[0]?.categoryName;
        const arr  = new Float32Array(63);
        for (let j = 0; j < 21; j++) {
          arr[j * 3]     = lms[j].x;
          arr[j * 3 + 1] = lms[j].y;
          arr[j * 3 + 2] = lms[j].z;
        }
        // Front-facing camera: labels are mirrored
        if (side === "Left") right_hand = arr;
        else left_hand = arr;
      }

      let poseLms: Float32Array | undefined;
      if (poseResult.landmarks?.[0]) {
        poseLms = new Float32Array(99);
        for (let j = 0; j < 33; j++) {
          poseLms[j * 3]     = poseResult.landmarks[0][j].x;
          poseLms[j * 3 + 1] = poseResult.landmarks[0][j].y;
          poseLms[j * 3 + 2] = poseResult.landmarks[0][j].z;
        }
      }

      const landmarks: Landmarks = {
        timestamp_ms: t0,
        ...(left_hand  && { left_hand }),
        ...(right_hand && { right_hand }),
        ...(poseLms    && { pose: poseLms }),
      };

      // Skip feature extraction + store updates when paused
      const currentStatus = useAppStore.getState().status;
      if (currentStatus === "paused") {
        animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const features = extractFeatures(landmarks);
      pushToFeatureBuffer(features.feature_vector_51);
      useAppStore.setState({
        landmarks,
        phonology: features,
        latency_ms: Math.round(performance.now() - t0),
      });

      // FPS counter
      fpsCountRef.current++;
      if (t0 - lastFpsRef.current >= 1000) {
        setFps(fpsCountRef.current);
        fpsCountRef.current = 0;
        lastFpsRef.current  = t0;
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    }

    setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach(t => t.stop());
      handRef.current?.close();
      poseRef.current?.close();
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}

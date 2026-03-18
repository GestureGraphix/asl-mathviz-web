/// <reference lib="webworker" />

import {
  HandLandmarker,
  PoseLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import type { MediaPipeWorkerIn, MediaPipeWorkerOut } from "@/types";

declare const self: DedicatedWorkerGlobalScope;

const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";

let handLandmarker: HandLandmarker | null = null;
let poseLandmarker: PoseLandmarker | null = null;

async function init() {
  try {
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

    [handLandmarker, poseLandmarker] = await Promise.all([
      HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
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
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }),
    ]);

    self.postMessage({ type: "ready" } satisfies MediaPipeWorkerOut);
  } catch (err) {
    self.postMessage({
      type: "error",
      message: String(err),
    } satisfies MediaPipeWorkerOut);
  }
}

function processFrame(bitmap: ImageBitmap, timestamp_ms: number) {
  if (!handLandmarker || !poseLandmarker) return;

  const handResult = handLandmarker.detectForVideo(bitmap, timestamp_ms);
  const poseResult = poseLandmarker.detectForVideo(bitmap, timestamp_ms);

  bitmap.close();

  // Extract hand landmarks
  let left_hand: Float32Array | undefined;
  let right_hand: Float32Array | undefined;

  if (handResult.landmarks && handResult.handedness) {
    for (let i = 0; i < handResult.landmarks.length; i++) {
      const hand = handResult.landmarks[i];
      const side = handResult.handedness[i]?.[0]?.categoryName;
      const arr = new Float32Array(63);
      for (let j = 0; j < 21; j++) {
        arr[j * 3]     = hand[j].x;
        arr[j * 3 + 1] = hand[j].y;
        arr[j * 3 + 2] = hand[j].z;
      }
      // Front-facing camera: MediaPipe labels are mirrored
      if (side === "Left") right_hand = arr;
      else left_hand = arr;
    }
  }

  // Extract pose landmarks
  let pose: Float32Array | undefined;
  if (poseResult.landmarks?.[0]) {
    pose = new Float32Array(99);
    for (let j = 0; j < 33; j++) {
      pose[j * 3]     = poseResult.landmarks[0][j].x;
      pose[j * 3 + 1] = poseResult.landmarks[0][j].y;
      pose[j * 3 + 2] = poseResult.landmarks[0][j].z;
    }
  }

  // Zero-copy transfer to main thread
  const transferables: ArrayBuffer[] = [];
  const payload: MediaPipeWorkerOut = {
    type: "landmarks",
    data: {
      timestamp_ms,
      ...(left_hand  && { left_hand:  left_hand.buffer  as ArrayBuffer }),
      ...(right_hand && { right_hand: right_hand.buffer as ArrayBuffer }),
      ...(pose       && { pose:       pose.buffer       as ArrayBuffer }),
    },
  };

  if (left_hand)  transferables.push(left_hand.buffer  as ArrayBuffer);
  if (right_hand) transferables.push(right_hand.buffer as ArrayBuffer);
  if (pose)       transferables.push(pose.buffer       as ArrayBuffer);

  self.postMessage(payload, transferables);
}

self.onmessage = (e: MessageEvent<MediaPipeWorkerIn>) => {
  if (e.data.type === "init")  init();
  if (e.data.type === "frame") processFrame(e.data.bitmap, e.data.timestamp_ms);
};

/**
 * Module-level reference to the inference worker.
 * Set by useInference on mount so useMediaPipe can forward feature
 * vectors directly — without going through Zustand or React re-renders.
 */
export const inferenceWorkerBridge: { current: Worker | null } = { current: null };

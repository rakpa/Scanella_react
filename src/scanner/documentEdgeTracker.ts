/**
 * Port of scan2 `lib/features/camera/domain/document_edge_tracker.dart`.
 */
import { Quad } from './geometry';

export const ScanPhase = {
  searching: 'Point the camera at a document',
  positioning: 'Fit the whole page in view',
  tooFar: 'Move closer to the document',
  holdSteady: 'Hold steady…',
  capturing: 'Capturing',
  captured: 'Page captured',
} as const;

export type ScanPhaseKey = keyof typeof ScanPhase;

export type ScanState = {
  quad: Quad;
  phase: ScanPhaseKey;
  message: string;
  confidence: number;
  holdProgress: number;
  hasDocument: boolean;
};

export const idleScanState = (): ScanState => ({
  quad: Quad.centered(),
  phase: 'searching',
  message: ScanPhase.searching,
  confidence: 0,
  holdProgress: 0,
  hasDocument: false,
});

export class DocumentEdgeTracker {
  static readonly minTrackConfidence = 0.5;
  static readonly minAutoCaptureArea = 0.12;
  static readonly autoCaptureConfidence = 0.78;
  static readonly steadyMotionThreshold = 0.014;
  static readonly framesBeforeRelease = 5;
  static readonly cooldownMs = 1200;
  static readonly duplicateThreshold = 0.03;

  private readonly holdDurationMs: number;
  private readonly onAutoCapture: () => void;
  private readonly onState: (state: ScanState) => void;

  private quad = Quad.centered();
  private confidence = 0;
  private lastDetection: Quad | null = null;
  private missedFrames = 0;
  private steadyForMs = 0;
  private lastTick = Date.now();
  private ticker: ReturnType<typeof setInterval> | null = null;
  private autoCaptureEnabled = true;
  private capturing = false;
  private cooldownUntil: number | null = null;
  private lastCapturedQuad: Quad | null = null;

  constructor(options: {
    onAutoCapture: () => void;
    onState: (state: ScanState) => void;
    holdDurationMs?: number;
  }) {
    this.onAutoCapture = options.onAutoCapture;
    this.onState = options.onState;
    this.holdDurationMs = options.holdDurationMs ?? 900;
  }

  start() {
    this.stop();
    this.lastTick = Date.now();
    this.ticker = setInterval(() => this.tick(), 50);
  }

  stop() {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  setAutoCapture(enabled: boolean) {
    if (this.autoCaptureEnabled === enabled) return;
    this.autoCaptureEnabled = enabled;
    this.steadyForMs = 0;
    this.publish();
  }

  updateFromFrame(detected: Quad | null, confidence: number) {
    if (detected && confidence >= DocumentEdgeTracker.minTrackConfidence) {
      this.missedFrames = 0;
      const previous = this.lastDetection;
      const motion = previous ? detected.averageCornerDistance(previous) : 1;
      this.lastDetection = detected;
      const blend = Math.min(0.85, Math.max(0.3, motion * 12));
      this.quad = this.quad.lerp(detected, blend);
      this.confidence = this.confidence * 0.35 + confidence * 0.65;
      if (motion > DocumentEdgeTracker.steadyMotionThreshold) {
        this.steadyForMs = 0;
      }
    } else {
      this.missedFrames += 1;
      this.confidence *= 0.7;
      this.steadyForMs = 0;
      if (this.missedFrames >= DocumentEdgeTracker.framesBeforeRelease) {
        this.lastDetection = null;
        this.quad = this.quad.lerp(Quad.centered(), 0.15);
      }
    }
    this.publish();
  }

  lockAfterCapture(capturedAt: Quad) {
    this.capturing = false;
    this.steadyForMs = 0;
    this.cooldownUntil = Date.now() + DocumentEdgeTracker.cooldownMs;
    this.lastCapturedQuad = capturedAt;
    this.publish('captured');
  }

  releaseCaptureLock() {
    this.capturing = false;
    this.steadyForMs = 0;
    this.publish();
  }

  dispose() {
    this.stop();
  }

  private tick() {
    const now = Date.now();
    const elapsed = now - this.lastTick;
    this.lastTick = now;
    if (this.capturing) return;

    const steady =
      this.confidence >= DocumentEdgeTracker.autoCaptureConfidence &&
      this.lastDetection !== null &&
      this.missedFrames === 0 &&
      !this.isTooFar;

    if (steady) {
      this.steadyForMs += elapsed;
      if (
        this.autoCaptureEnabled &&
        this.steadyForMs >= this.holdDurationMs &&
        !this.inCooldown(now) &&
        !this.isDuplicate()
      ) {
        this.capturing = true;
        this.steadyForMs = 0;
        this.publish('capturing');
        this.onAutoCapture();
        return;
      }
    } else {
      this.steadyForMs = 0;
    }
    this.publish();
  }

  private get isTooFar(): boolean {
    const detection = this.lastDetection;
    return !!detection && detection.areaRatio < DocumentEdgeTracker.minAutoCaptureArea;
  }

  private inCooldown(now: number): boolean {
    return this.cooldownUntil !== null && now < this.cooldownUntil;
  }

  private isDuplicate(): boolean {
    const last = this.lastCapturedQuad;
    const current = this.lastDetection;
    if (!last || !current) return false;
    if (!this.inCooldownWindow()) return false;
    return current.averageCornerDistance(last) < DocumentEdgeTracker.duplicateThreshold;
  }

  private inCooldownWindow(): boolean {
    if (this.cooldownUntil === null) return false;
    return Date.now() < this.cooldownUntil + 3000;
  }

  private publish(phase?: ScanPhaseKey) {
    const resolved = phase ?? this.resolvePhase();
    const progress =
      this.holdDurationMs === 0
        ? 0
        : Math.min(1, Math.max(0, this.steadyForMs / this.holdDurationMs));
    this.onState({
      quad: this.quad,
      phase: resolved,
      message: ScanPhase[resolved],
      confidence: Math.min(1, Math.max(0, this.confidence)),
      holdProgress: this.autoCaptureEnabled ? progress : 0,
      hasDocument: this.lastDetection !== null,
    });
  }

  private resolvePhase(): ScanPhaseKey {
    if (this.capturing) return 'capturing';
    if (this.inCooldown(Date.now())) return 'captured';
    if (!this.lastDetection || this.confidence < DocumentEdgeTracker.minTrackConfidence) {
      return 'searching';
    }
    if (this.isTooFar) return 'tooFar';
    if (this.confidence < DocumentEdgeTracker.autoCaptureConfidence) return 'positioning';
    return 'holdSteady';
  }
}

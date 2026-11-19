"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { analyzeScannerFrame, sampleVideoLuma } from "@/lib/client/book-photo";
import { validPhotoIsbn } from "@/lib/domain/book-photo";

const SCAN_TICK_MS = 250;
const CAMERA_WARMUP_MS = 700;
const STEADY_FRAMES_REQUIRED = 3;

export type CameraState =
  | "idle"
  | "starting"
  | "ready"
  | "denied"
  | "unavailable";

interface DetectedBarcode {
  rawValue?: string;
}

interface BarcodeDetectorInstance {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  getSupportedFormats?: () => Promise<string[]>;
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

async function createIsbnDetector(): Promise<BarcodeDetectorInstance | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const ctor = (
    window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }
  ).BarcodeDetector;
  if (typeof ctor !== "function") {
    return null;
  }
  const desired = ["ean_13", "ean_8", "upc_a"];
  try {
    if (ctor.getSupportedFormats) {
      const supported = await ctor.getSupportedFormats();
      const formats = desired.filter((f) => supported.includes(f));
      return formats.length > 0 ? new ctor({ formats }) : null;
    }
    return new ctor({ formats: desired });
  } catch {
    return null;
  }
}

export function useBookScanner({
  active,
  busy,
  onLockChange,
  onBarcode,
  onAutoCapture,
}: {
  active: boolean;
  busy: boolean;
  onLockChange: (locking: boolean) => void;
  onBarcode: (isbn: string, video: HTMLVideoElement) => void;
  onAutoCapture: (video: HTMLVideoElement) => void;
}) {
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevLumaRef = useRef<Uint8Array | null>(null);
  const steadyStreakRef = useRef(0);
  const streamStartedAtRef = useRef(0);
  const autoArmedRef = useRef(true);
  const barcodeDetectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const sessionTokenRef = useRef(0);
  const activeRef = useRef(active);
  const busyRef = useRef(busy);
  activeRef.current = active;
  busyRef.current = busy;

  const stopCamera = useCallback(() => {
    sessionTokenRef.current += 1;
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    prevLumaRef.current = null;
    steadyStreakRef.current = 0;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    if (!activeRef.current) {
      setCameraState("idle");
      return;
    }
    const token = sessionTokenRef.current;
    setCameraState("starting");
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      if (sessionTokenRef.current === token) {
        setCameraState("unavailable");
      }
      return;
    }

    const detector = await createIsbnDetector();
    if (sessionTokenRef.current !== token) {
      return;
    }
    barcodeDetectorRef.current = detector;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      if (sessionTokenRef.current !== token) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
        setCameraState("unavailable");
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
      if (sessionTokenRef.current !== token) {
        return;
      }
      streamStartedAtRef.current = Date.now();
      prevLumaRef.current = null;
      steadyStreakRef.current = 0;
      setCameraState("ready");
    } catch (error) {
      if (sessionTokenRef.current !== token) {
        return;
      }
      const name = error instanceof DOMException ? error.name : "";
      setCameraState(
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "denied"
          : "unavailable"
      );
    }
  }, [stopCamera]);

  const disarmAutoScan = useCallback(() => {
    autoArmedRef.current = false;
    steadyStreakRef.current = 0;
  }, []);

  const armAutoScan = useCallback(() => {
    autoArmedRef.current = true;
    steadyStreakRef.current = 0;
    prevLumaRef.current = null;
  }, []);

  useEffect(() => {
    if (active) {
      void startCamera();
      return () => {
        stopCamera();
      };
    }
    stopCamera();
    setCameraState("idle");
  }, [active, startCamera, stopCamera]);

  // Executa detecção de código de barras antes da captura visual no mesmo tick para evitar corrida.
  useEffect(() => {
    if (!(active && cameraState === "ready")) {
      return;
    }

    let tickInFlight = false;
    const timer = window.setInterval(() => {
      if (tickInFlight) {
        return;
      }
      const video = videoRef.current;
      if (
        !(video && autoArmedRef.current) ||
        busyRef.current ||
        video.readyState < 2 ||
        video.videoWidth === 0
      ) {
        return;
      }
      if (Date.now() - streamStartedAtRef.current < CAMERA_WARMUP_MS) {
        return;
      }

      tickInFlight = true;
      void (async () => {
        try {
          const detector = barcodeDetectorRef.current;
          if (detector) {
            const codes = await detector.detect(video).catch(() => []);
            if (
              !autoArmedRef.current ||
              busyRef.current ||
              !activeRef.current
            ) {
              return;
            }
            for (const code of codes) {
              const isbn = validPhotoIsbn(code.rawValue ?? null);
              if (isbn) {
                disarmAutoScan();
                onBarcode(isbn, video);
                return;
              }
            }
          }

          if (!autoArmedRef.current || busyRef.current || !activeRef.current) {
            return;
          }
          if (!sampleCanvasRef.current) {
            sampleCanvasRef.current = document.createElement("canvas");
          }
          const luma = sampleVideoLuma(video, sampleCanvasRef.current);
          if (!luma) {
            return;
          }
          const { hasDetail, isSteady } = analyzeScannerFrame(
            prevLumaRef.current,
            luma
          );
          prevLumaRef.current = luma;

          if (hasDetail && isSteady) {
            steadyStreakRef.current += 1;
            if (steadyStreakRef.current >= STEADY_FRAMES_REQUIRED) {
              disarmAutoScan();
              onAutoCapture(video);
            } else {
              onLockChange(true);
            }
          } else {
            steadyStreakRef.current = 0;
            onLockChange(false);
          }
        } finally {
          tickInFlight = false;
        }
      })();
    }, SCAN_TICK_MS);

    return () => window.clearInterval(timer);
  }, [
    active,
    cameraState,
    disarmAutoScan,
    onAutoCapture,
    onBarcode,
    onLockChange,
  ]);

  return {
    armAutoScan,
    cameraState,
    disarmAutoScan,
    startCamera,
    stopCamera,
    videoRef,
  };
}

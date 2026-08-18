"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";

// Certificate QR codes encode `${origin}/verify/${qrToken}` (see
// src/app/api/certificates/[tenantDueId]/pdf/route.tsx). We only ever pull
// the token back out and route to it locally -- never navigate to whatever
// host is embedded in the scanned text -- so a scanned code can't be used to
// send a gate device to an arbitrary external URL.
const VERIFY_TOKEN_PATTERN = /\/verify\/([A-Za-z0-9_-]+)/;

export function QrScanButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);

  const stopScanning = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const close = useCallback(() => {
    stopScanning();
    setOpen(false);
    setError(null);
  }, [stopScanning]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        tick();
      } catch {
        if (!cancelled) {
          setError("Couldn't access the camera. Check permissions and try again.");
        }
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        const match = code.data.match(VERIFY_TOKEN_PATTERN);
        if (match) {
          stopScanning();
          setOpen(false);
          router.push(`/verify/${match[1]}`);
          return;
        }
        setError("That QR code isn't an estate certificate. Still scanning…");
      }

      frameRef.current = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelled = true;
      stopScanning();
    };
  }, [open, router, stopScanning]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        Scan a certificate QR code
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Scan QR code</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close scanner"
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 aspect-square w-full overflow-hidden rounded-lg bg-slate-900">
              <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <p className="mt-3 text-xs text-slate-500">
              Point the camera at a tenant&apos;s certificate QR code.
            </p>
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}

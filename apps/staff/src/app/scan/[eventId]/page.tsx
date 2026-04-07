"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import jsQR from "jsqr";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Camera,
  CameraOff,
  WifiOff,
  Wifi,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { Button, Badge } from "@vybx/ui";
import { api } from "@/lib/api";
import { verifyTotp } from "@/lib/totp";
import type { CheckInResult, TicketSecret } from "@/lib/types";

type ScanState = "idle" | "scanning" | "processing" | "result";

// ── Offline check-in ─────────────────────────────────────────────────────────

async function tryOfflineCheckIn(
  qrValue: string,
  secretsMap: Map<string, TicketSecret>,
  usedLocally: Set<string>,
): Promise<CheckInResult | null> {
  const dot = qrValue.lastIndexOf(".");
  if (dot === -1) return null;

  const ticketId = qrValue.slice(0, dot);
  const totpToken = qrValue.slice(dot + 1);
  const entry = secretsMap.get(ticketId);
  if (!entry) return null;

  if (usedLocally.has(ticketId)) {
    return { success: false, message: "❌ Boleto ya escaneado en esta sesión", source: "offline", scannedAt: new Date().toISOString() };
  }

  const valid = await verifyTotp(totpToken, entry.secret);
  if (!valid) {
    return { success: false, message: "❌ Código inválido o expirado. Pide al asistente que refresque su boleto.", source: "offline", scannedAt: new Date().toISOString() };
  }

  usedLocally.add(ticketId);
  return {
    success: true,
    message: "✅ Boleto válido (offline)",
    ticket: { id: ticketId, type: entry.tierName, event: null, attendeeEmail: null },
    source: "offline",
    scannedAt: new Date().toISOString(),
  };
}

// ── Online check-in ──────────────────────────────────────────────────────────

async function tryOnlineCheckIn(qrValue: string): Promise<CheckInResult> {
  try {
    const encoded = encodeURIComponent(qrValue);
    const res = await api.post<{ success: boolean; message: string; ticket?: CheckInResult["ticket"]; scannedAt?: string }>(
      `/event-staff/check-in/qr/${encoded}`,
      {},
    );
    return { ...(res as object), source: "online", scannedAt: (res as any).scannedAt ?? new Date().toISOString() } as CheckInResult;
  } catch (err: unknown) {
    const msg = (err as any)?.response?.data?.message ?? (err instanceof Error ? err.message : "Error al validar boleto.");
    return { success: false, message: `❌ ${msg}`, source: "online", scannedAt: new Date().toISOString() };
  }
}

// ── Scanner page ─────────────────────────────────────────────────────────────

export default function ScanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const secretsMap = useRef<Map<string, TicketSecret>>(new Map());
  const usedLocally = useRef<Set<string>>(new Set());
  const scanStateRef = useRef<ScanState>("idle");
  const lastQrRef = useRef<string | null>(null);
  const lastQrTimeRef = useRef<number>(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [secretsReady, setSecretsReady] = useState(false);
  const [secretsCount, setSecretsCount] = useState(0);
  const [scanned, setScanned] = useState(0);

  // Online / offline
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  // Preload secrets for offline mode
  useEffect(() => {
    if (!eventId) return;
    api.get<{ secrets: TicketSecret[]; count: number }>(`/event-staff/events/${eventId}/ticket-secrets`)
      .then((res) => {
        const map = new Map<string, TicketSecret>();
        for (const s of (res as any).secrets ?? []) map.set(s.ticketId, s);
        secretsMap.current = map;
        setSecretsCount((res as any).count ?? map.size);
        setSecretsReady(true);
      })
      .catch(() => setSecretsReady(true));
  }, [eventId]);

  // Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setScanState("scanning");
        scanStateRef.current = "scanning";
      }
    } catch {
      setCameraError("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
    setScanState("idle");
    scanStateRef.current = "idle";
  }, []);

  useEffect(() => { void startCamera(); return () => stopCamera(); }, [startCamera, stopCamera]);

  // QR process
  const processQr = useCallback(async (qrValue: string) => {
    const now = Date.now();
    if (qrValue === lastQrRef.current && now - lastQrTimeRef.current < 3000) return;
    lastQrRef.current = qrValue;
    lastQrTimeRef.current = now;

    setScanState("processing");
    scanStateRef.current = "processing";

    let result: CheckInResult;
    if (isOnline) {
      result = await tryOnlineCheckIn(qrValue);
    } else {
      result = (await tryOfflineCheckIn(qrValue, secretsMap.current, usedLocally.current)) ?? {
        success: false,
        message: "❌ Boleto no encontrado en caché. Reconecta para validar.",
        source: "offline",
        scannedAt: new Date().toISOString(),
      };
    }

    if (result.success) setScanned((n) => n + 1);
    setLastResult(result);
    setScanState("result");
    scanStateRef.current = "result";

    setTimeout(() => {
      setScanState("scanning");
      scanStateRef.current = "scanning";
    }, 2500);
  }, [isOnline]);

  // Decode loop
  useEffect(() => {
    if (!cameraReady) return;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (scanStateRef.current !== "scanning") return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const { videoWidth: w, videoHeight: h } = video;
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });
      if (code?.data) void processQr(code.data);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [cameraReady, processQr]);

  const resultBorder = lastResult?.success
    ? "border-emerald-500/40 bg-emerald-500/10"
    : "border-destructive/40 bg-destructive/10";

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-black">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0 bg-black/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="size-8 text-white/70 hover:text-white hover:bg-white/10" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">Escanear boletos</h1>
          <p className="text-xs text-white/50">
            {secretsReady ? `${secretsCount} cargados · ${scanned} escaneados` : "Cargando…"}
          </p>
        </div>
        {isOnline ? (
          <Badge variant="outline" className="gap-1 text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-xs">
            <Wifi className="size-3" /> Online
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-amber-400 border-amber-500/30 bg-amber-500/10 text-xs">
            <WifiOff className="size-3" /> Offline
          </Badge>
        )}
      </div>

      {/* Camera */}
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder */}
        {cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72">
              {[
                "top-0 left-0 border-t-2 border-l-2 rounded-tl-xl",
                "top-0 right-0 border-t-2 border-r-2 rounded-tr-xl",
                "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl",
                "bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl",
              ].map((cls) => (
                <span key={cls} className={`absolute w-8 h-8 border-white/80 ${cls}`} />
              ))}
              {scanState === "scanning" && (
                <div className="absolute inset-x-2 top-0 h-0.5 bg-primary/90 animate-[scan_2s_ease-in-out_infinite]" />
              )}
            </div>
          </div>
        )}

        {/* Camera error */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-black">
            <CameraOff className="size-10 text-white/40" />
            <p className="text-sm text-white/60 max-w-xs">{cameraError}</p>
            <Button size="sm" onClick={() => void startCamera()} className="bg-white/10 hover:bg-white/20 text-white border-white/20">
              <RotateCcw className="size-4 mr-2" /> Reintentar
            </Button>
          </div>
        )}

        {/* Processing */}
        {scanState === "processing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <Loader2 className="size-10 text-white animate-spin" />
          </div>
        )}

        {/* Result */}
        {scanState === "result" && lastResult && (
          <div className="absolute inset-x-4 bottom-20 sm:bottom-24">
            <div className={`rounded-2xl border p-4 ${resultBorder} backdrop-blur-md`}>
              <div className="flex items-start gap-3">
                {lastResult.success
                  ? <CheckCircle2 className="size-6 text-emerald-400 shrink-0 mt-0.5" />
                  : <XCircle className="size-6 text-destructive shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{lastResult.message}</p>
                  {lastResult.ticket?.type && (
                    <p className="text-xs text-white/60 mt-0.5">
                      Tier: <span className="text-white/80">{lastResult.ticket.type}</span>
                    </p>
                  )}
                  {lastResult.ticket?.attendeeEmail && (
                    <p className="text-xs text-white/60 truncate mt-0.5">{lastResult.ticket.attendeeEmail}</p>
                  )}
                  <p className="text-[10px] text-white/40 mt-1.5 flex items-center gap-1">
                    {lastResult.source === "offline"
                      ? <><WifiOff className="size-2.5" /> Offline</>
                      : <><Wifi className="size-2.5" /> Online</>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Not started */}
        {!cameraReady && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
            <Camera className="size-10 text-white/30 animate-pulse" />
            <p className="text-xs text-white/40">Iniciando cámara…</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/10 bg-black/80 text-center">
        <p className="text-xs text-white/50">
          {scanState === "scanning"
            ? "Apunta la cámara al código QR del boleto"
            : scanState === "processing"
              ? "Verificando…"
              : "Listo para el siguiente boleto"}
        </p>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(15rem); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { X, Camera, Keyboard } from "lucide-react";

// Web BarcodeDetector types (available on Chrome/Edge Android + desktop)
type DetectedBarcode = { rawValue: string; format?: string };
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

export function isBarcodeSupported() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [supported] = useState(isBarcodeSupported());

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const Ctor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor })
      .BarcodeDetector;
    const detector = new Ctor({
      formats: [
        "ean_13",
        "ean_8",
        "code_128",
        "code_39",
        "upc_a",
        "upc_e",
        "qr_code",
        "itf",
      ],
    });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play();
        }
        const tick = async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes[0]?.rawValue) {
              onDetected(codes[0].rawValue);
              return;
            }
          } catch {
            // ignore per-frame errors
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        setError(
          (e as Error)?.message ||
            "Não foi possível acessar a câmera. Verifique a permissão.",
        );
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [supported, onDetected]);

  const submitManual = () => {
    const v = manual.trim();
    if (!v) return;
    onDetected(v);
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3
            className="flex items-center gap-2 text-sm font-bold"
            style={{ color: "var(--gold)" }}
          >
            <Camera size={16} /> Ler código de barras
          </h3>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-accent"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {supported && !error ? (
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-[color:var(--gold)]/80" />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            {error ||
              "Seu navegador não suporta leitura por câmera. Digite o código manualmente abaixo (ou use um leitor USB que funciona como teclado)."}
          </div>
        )}

        <div className="mt-3">
          <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Keyboard size={12} /> Digitar / colar código
          </div>
          <div className="flex gap-2">
            <input
              autoFocus={!supported}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitManual()}
              placeholder="Ex: 7891234567895"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--gold)]"
            />
            <button
              onClick={submitManual}
              className="rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

export function ImageViewer({
  images,
  index,
  onClose,
  title,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  title?: string;
}) {
  const [i, setI] = useState(index);

  useEffect(() => setI(index), [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((v) => (v + 1) % images.length);
      if (e.key === "ArrowLeft") setI((v) => (v - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  if (images.length === 0) return null;
  const src = images[Math.min(i, images.length - 1)];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="truncate text-sm font-semibold">
          {title ? `${title} · ` : ""}
          {i + 1}/{images.length}
        </span>
        <div className="flex gap-2">
          <a
            href={src}
            download={`foto-${i + 1}.jpg`}
            className="grid h-9 w-9 place-items-center rounded-lg bg-white/10"
            aria-label="Baixar foto"
          >
            <Download size={16} />
          </a>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg bg-white/10"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-3">
        <img src={src} alt="Foto da ordem de serviço" className="max-h-full max-w-full object-contain" />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setI((v) => (v - 1 + images.length) % images.length)}
              className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"
              aria-label="Anterior"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setI((v) => (v + 1) % images.length)}
              className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"
              aria-label="Próxima"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3">
          {images.map((src2, idx) => (
            <button key={idx} onClick={() => setI(idx)} className="shrink-0">
              <img
                src={src2}
                alt=""
                className={
                  "h-14 w-14 rounded-lg object-cover " +
                  (idx === i ? "ring-2 ring-[color:var(--gold)]" : "opacity-60")
                }
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

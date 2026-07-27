// PWA service worker registration with Lovable preview guards.
// Only registers on the published production site.

const SW_PATH = "/sw.js";

function shouldSkip(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true; // in iframe (Lovable preview shell)
  } catch {
    return true;
  }
  const host = window.location.hostname;
  const protocol = window.location.protocol;
  const localHttp =
    protocol === "http:" && (host === "localhost" || host === "127.0.0.1");
  if (protocol !== "https:" && !localHttp) return true;
  const badHost =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");
  if (badHost) return true;
  if (new URL(window.location.href).searchParams.get("sw") === "off") return true;
  return false;
}

async function unregisterOurs() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.map(async (r) => {
      const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
      if (url.endsWith(SW_PATH)) await r.unregister();
    }),
  );
}

export function registerPWA() {
  if (typeof window === "undefined") return;
  if (shouldSkip()) {
    void unregisterOurs();
    return;
  }
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(SW_PATH, { scope: "/" })
      .then((registration) => {
        void registration.update();
      })
      .catch(() => {
        /* ignore */
      });
  });
}

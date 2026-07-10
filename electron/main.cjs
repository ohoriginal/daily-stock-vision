const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

// STOKMASTER runs as a TanStack Start SSR app. We load the published URL,
// and the PWA service worker caches the full app-shell on first launch — from
// then on it works fully offline. localStorage persists in the Electron
// userData folder (%APPDATA%/STOKMASTER on Windows), so all business data
// stays on the local machine.
const APP_URL = process.env.STOKMASTER_URL || "https://daily-stock-vision.lovable.app";
const OFFLINE_FALLBACK = path.join(__dirname, "offline.html");

app.setName("STOKMASTER");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: "#141210",
    autoHideMenuBar: true,
    title: "STOKMASTER",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null);

  const load = () => {
    win.loadURL(APP_URL).catch(() => win.loadFile(OFFLINE_FALLBACK));
  };
  load();

  win.webContents.on("did-fail-load", (_e, code) => {
    // -105 name not resolved, -106 internet disconnected, -21 network changed
    if (code <= -100 || code === -21) win.loadFile(OFFLINE_FALLBACK);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:|^mailto:/.test(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

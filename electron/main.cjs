const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

// STOKMASTER is bundled with the desktop app and opens from local files,
// so it does not depend on the published site or internet access.
const OFFLINE_FALLBACK = path.join(__dirname, "offline.html");
const LOCAL_APP_CANDIDATES = [
  path.join(__dirname, "..", "dist", "index.html"),
  path.join(__dirname, "..", "dist", "client", "index.html"),
];

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
    const localApp = LOCAL_APP_CANDIDATES.find((candidate) => fs.existsSync(candidate));
    if (localApp) {
      win.loadFile(localApp).catch(() => win.loadFile(OFFLINE_FALLBACK));
      return;
    }
    win.loadFile(OFFLINE_FALLBACK);
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

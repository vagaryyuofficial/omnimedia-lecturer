import { app, BrowserWindow, shell } from "electron";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DESKTOP_PORT, startLocalServer } from "./local-server.mjs";

const desktopDirectory = dirname(fileURLToPath(import.meta.url));
const hasSingleInstanceLock = app.requestSingleInstanceLock();

let mainWindow;
let localServer;

if (!hasSingleInstanceLock) app.quit();

function runtimeRoot() {
  return app.isPackaged ? join(process.resourcesPath, "app-dist") : resolve(desktopDirectory, "../dist");
}

function isExternalAddress(target, localOrigin) {
  try {
    const url = new URL(target);
    return (url.protocol === "http:" || url.protocol === "https:") && url.origin !== localOrigin;
  } catch {
    return false;
  }
}

async function createWindow() {
  localServer ??= await startLocalServer({ runtimeRoot: runtimeRoot(), port: DESKTOP_PORT });

  mainWindow = new BrowserWindow({
    title: "深度语言专家 · Deep Language Expert",
    width: 1440,
    height: 920,
    minWidth: 390,
    minHeight: 680,
    backgroundColor: "#f5f5f7",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalAddress(url, localServer.origin)) void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isExternalAddress(url, localServer.origin)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  await mainWindow.loadURL(localServer.origin);
}

if (hasSingleInstanceLock) {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(createWindow).catch((error) => {
    console.error("Could not start Deep Language Expert:", error);
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    if (localServer) void localServer.close().catch(() => {});
  });
}

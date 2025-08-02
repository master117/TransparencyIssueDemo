import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";

let mainWindow: BrowserWindow | null = null;
let popoutWindow: BrowserWindow | null = null;

function createWindow(): void {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        ...(process.platform === "linux" ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, "../preload/index.js"),
            sandbox: false,
        },
    });

    mainWindow.on("ready-to-show", () => {
        mainWindow?.show();
    });

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: "deny" };
    });

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
        mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    } else {
        mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
    }
}

function createPopoutWindow(): void {
    console.log("Creating popout window...");

    if (popoutWindow) {
        console.log("Popout window already exists, focusing...");
        popoutWindow.focus();
        return;
    }

    popoutWindow = new BrowserWindow({
        width: 400,
        height: 600,
        transparent: true,
        frame: false,
        titleBarStyle: "hidden",
        webPreferences: {
            preload: join(__dirname, "../preload/index.js"),
            sandbox: false,
        },
    });

    console.log("Popout window created");

    popoutWindow.on("closed", () => {
        console.log("Popout window closed");
        popoutWindow = null;
    });

    popoutWindow.on("ready-to-show", () => {
        console.log("Popout window ready to show");
        popoutWindow?.show();
    });

    // Load the popout HTML file
    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
        const popoutUrl = `${process.env["ELECTRON_RENDERER_URL"]}/popout.html`;
        console.log("Loading popout URL (dev):", popoutUrl);
        popoutWindow.loadURL(popoutUrl);
    } else {
        const popoutPath = join(__dirname, "../renderer/popout.html");
        console.log("Loading popout file (prod):", popoutPath);
        popoutWindow.loadFile(popoutPath);
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId("com.electron");

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on("browser-window-created", (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    // IPC test
    ipcMain.on("ping", () => console.log("pong"));

    // Config file handling
    const configPath = join(app.getPath("userData"), "config.json");

    ipcMain.handle("get-config-path", () => {
        return configPath;
    });

    ipcMain.handle("read-config-file", () => {
        try {
            if (existsSync(configPath)) {
                return readFileSync(configPath, "utf-8");
            } else {
                // Return default config if file doesn't exist
                const defaultConfig = {
                    twitch: {
                        username: "",
                        accessToken: "",
                        channel: "",
                        clientId: "",
                    },
                    queue: {
                        saveCredentials: true,
                        settings: {
                            isOpen: true,
                            requireMessage: false,
                            joinMessage: "{username} has joined the queue! Position: {position}",
                            leaveMessage: "{username} has left the queue.",
                            queueFullMessage: "The queue is currently full. Please try again later.",
                            queueClosedMessage: "The queue is currently closed.",
                            alreadyInQueueMessage: "{username}, you are already in the queue at position {position}.",
                            notInQueueMessage: "{username}, you are not in the queue.",
                            positionMessage: "{username}, you are position {position} in the queue. Wait time: {waitTime} minutes.",
                            requireMessageText: "{username}, please provide a message when joining the queue. Example: !join YourGameUsername",
                            maxQueueSize: 50,
                            popoutSettings: {
                                enabled: false,
                                displayCount: 5,
                                showPosition: true,
                                showMessage: true,
                                showWaitTime: false,
                            },
                        },
                    },
                };
                return JSON.stringify(defaultConfig, null, 2);
            }
        } catch (error) {
            console.error("Failed to read config file:", error);
            throw error;
        }
    });

    ipcMain.handle("write-config-file", (_, data: string) => {
        try {
            writeFileSync(configPath, data, "utf-8");
            return true;
        } catch (error) {
            console.error("Failed to write config file:", error);
            throw error;
        }
    });

    // Popout window handlers
    ipcMain.handle("open-popout-window", () => {
        console.log("Received request to open popout window");
        createPopoutWindow();
        return true;
    });

    ipcMain.handle("close-popout-window", () => {
        console.log("Received request to close popout window");
        if (popoutWindow) {
            popoutWindow.close();
            popoutWindow = null;
        }
        return true;
    });

    ipcMain.handle("update-popout-queue", (_, queueData) => {
        console.log("Updating popout queue data");
        if (popoutWindow && !popoutWindow.isDestroyed()) {
            popoutWindow.webContents.send("queue-update", queueData);
        }
        return true;
    });

    ipcMain.on("request-queue-data", () => {
        console.log("Request for queue data from popout");
        // Forward request to main window
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("request-queue-data-from-popout");
        }
    });

    createWindow();

    app.on("activate", function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

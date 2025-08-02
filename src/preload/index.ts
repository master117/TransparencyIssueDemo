import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Import types
type QueueData = {
    queue: Array<{
        id: string;
        username: string;
        message?: string;
        joinedAt: Date;
        playingStartedAt?: Date;
        isPlaying: boolean;
    }>;
    settings: {
        isOpen: boolean;
        requireMessage: boolean;
        joinMessage: string;
        leaveMessage: string;
        queueFullMessage: string;
        queueClosedMessage: string;
        alreadyInQueueMessage: string;
        notInQueueMessage: string;
        positionMessage: string;
        requireMessageText: string;
        maxQueueSize?: number;
        popoutSettings: {
            enabled: boolean;
            displayCount: number;
            showPosition: boolean;
            showMessage: boolean;
            showWaitTime: boolean;
        };
    };
};

// Custom APIs for renderer
const api = {
    getConfigPath: () => ipcRenderer.invoke("get-config-path"),
    readConfigFile: () => ipcRenderer.invoke("read-config-file"),
    writeConfigFile: (data: string) => ipcRenderer.invoke("write-config-file", data),

    // Popout window APIs
    openPopoutWindow: () => ipcRenderer.invoke("open-popout-window"),
    closePopoutWindow: () => ipcRenderer.invoke("close-popout-window"),
    updatePopoutQueue: (queueData: QueueData) => ipcRenderer.invoke("update-popout-queue", queueData),
    onQueueUpdate: (callback: (data: QueueData) => void) => {
        ipcRenderer.on("queue-update", (_, data) => callback(data));
    },
    requestQueueData: () => ipcRenderer.send("request-queue-data"),
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld("electron", electronAPI);
        contextBridge.exposeInMainWorld("api", api);
    } catch (error) {
        console.error(error);
    }
} else {
    // @ts-ignore (define in dts)
    window.electron = electronAPI;
    // @ts-ignore (define in dts)
    window.api = api;
}

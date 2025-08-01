import { ElectronAPI } from "@electron-toolkit/preload";

interface QueueData {
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
            backgroundOpacity: number;
        };
    };
}

interface ConfigAPI {
    getConfigPath: () => Promise<string>;
    readConfigFile: () => Promise<string>;
    writeConfigFile: (data: string) => Promise<boolean>;
    openPopoutWindow: () => Promise<void>;
    closePopoutWindow: () => Promise<void>;
    updatePopoutQueue: (queueData: QueueData) => Promise<void>;
    onQueueUpdate: (callback: (data: QueueData) => void) => void;
    requestQueueData: () => void;
}

declare global {
    interface Window {
        electron: ElectronAPI;
        api: ConfigAPI;
    }
}

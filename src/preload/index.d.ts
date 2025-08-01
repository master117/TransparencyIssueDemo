import { ElectronAPI } from "@electron-toolkit/preload";

interface ConfigAPI {
    getConfigPath: () => Promise<string>;
    readConfigFile: () => Promise<string>;
    writeConfigFile: (data: string) => Promise<boolean>;
}

declare global {
    interface Window {
        electron: ElectronAPI;
        api: ConfigAPI;
    }
}

import { QueueSettings } from "../types/queue";

export interface TwitchConfig {
    username: string;
    accessToken: string;
    channel: string;
    clientId: string;
}

export interface QueueConfig {
    saveCredentials: boolean;
    settings: QueueSettings;
}

export interface AppConfig {
    twitch: TwitchConfig;
    queue: QueueConfig;
}

const DEFAULT_CONFIG: AppConfig = {
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
        },
    },
};
class ConfigService {
    private config: AppConfig = DEFAULT_CONFIG;

    async initialize(): Promise<void> {
        try {
            await this.loadConfig();
        } catch (error) {
            console.warn("Failed to initialize config service:", error);
            this.config = { ...DEFAULT_CONFIG };
        }
    }

    async loadConfig(): Promise<void> {
        try {
            let configData: string;

            if (window.api) {
                // Use Electron's file system API
                configData = await window.api.readConfigFile();
            } else {
                // Fallback for development - use localStorage
                const stored = localStorage.getItem("app-config");
                if (stored) {
                    configData = stored;
                } else {
                    this.config = { ...DEFAULT_CONFIG };
                    return;
                }
            }

            const parsed = JSON.parse(configData);
            this.config = { ...DEFAULT_CONFIG, ...parsed };
        } catch (error) {
            console.warn("Failed to load config, using defaults:", error);
            this.config = { ...DEFAULT_CONFIG };
        }
    }

    async saveConfig(): Promise<void> {
        try {
            const configData = JSON.stringify(this.config, null, 2);

            if (window.api) {
                // Use Electron's file system API
                await window.api.writeConfigFile(configData);
            } else {
                // Fallback for development - use localStorage
                localStorage.setItem("app-config", configData);
            }
        } catch (error) {
            console.error("Failed to save config:", error);
        }
    }

    getTwitchConfig(): TwitchConfig {
        return { ...this.config.twitch };
    }

    getQueueConfig(): QueueConfig {
        return { ...this.config.queue };
    }

    async updateTwitchConfig(updates: Partial<TwitchConfig>): Promise<void> {
        this.config.twitch = { ...this.config.twitch, ...updates };

        if (this.config.queue.saveCredentials) {
            await this.saveConfig();
        }
    }

    async updateQueueConfig(updates: Partial<QueueConfig>): Promise<void> {
        this.config.queue = { ...this.config.queue, ...updates };
        await this.saveConfig();
    }

    async updateQueueSettings(updates: Partial<QueueSettings>): Promise<void> {
        this.config.queue.settings = { ...this.config.queue.settings, ...updates };
        await this.saveConfig();
    }

    getQueueSettings(): QueueSettings {
        return { ...this.config.queue.settings };
    }

    getFullConfig(): AppConfig {
        return { ...this.config };
    }
}

export const configService = new ConfigService();

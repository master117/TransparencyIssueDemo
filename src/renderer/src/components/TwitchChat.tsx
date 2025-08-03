import React, { useEffect, useRef } from "react";
import styles from "../assets/twitch-chat.module.scss";
import QueueManagement from "./QueueManagement";
import { useQueue } from "../hooks/useQueue";
import { QueueSettings } from "../types/queue";
import { configService } from "../services/configService";

const TwitchChat: React.FC = () => {
    // Queue management
    const { queue, settings, processCommand, updateSettings } = useQueue(undefined);

    // Use ref to ensure message handler always has the latest processCommand
    const processCommandRef = useRef(processCommand);
    processCommandRef.current = processCommand;

    // Send queue updates to popout window
    useEffect(() => {
        const sendQueueUpdate = async (): Promise<void> => {
            if (settings.popoutSettings.enabled && window.api) {
                try {
                    await window.api.updatePopoutQueue({ queue, settings });
                } catch (error) {
                    console.error("Failed to update popout queue:", error);
                }
            }
        };

        sendQueueUpdate();
    }, [queue, settings]);

    const handleQueueSettingsUpdate = async (newSettings: Partial<QueueSettings>): Promise<void> => {
        updateSettings(newSettings);
        try {
            await configService.updateQueueSettings(newSettings);
        } catch (error) {
            console.error("Failed to save queue settings:", error);
        }
    };

    return (
        <div className={styles.twitchChat}>
            <QueueManagement settings={settings} onUpdateSettings={handleQueueSettingsUpdate} />
        </div>
    );
};

export default TwitchChat;

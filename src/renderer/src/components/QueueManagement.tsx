import React from "react";
import { QueueSettings } from "../types/queue";
import styles from "../assets/queue-management.module.scss";

interface QueueManagementProps {
    settings: QueueSettings;
    onUpdateSettings: (settings: Partial<QueueSettings>) => void;
}

const QueueManagement: React.FC<QueueManagementProps> = ({ settings, onUpdateSettings }) => {
    // Handle opening/closing the popout window
    const handlePopoutToggle = async (isEnabled: boolean): Promise<void> => {
        try {
            if (window.api) {
                if (isEnabled) {
                    console.log("Opening popout window...");
                    if (window.api.openPopoutWindow) {
                        await window.api.openPopoutWindow();
                        console.log("Popout window opened successfully");
                    }
                } else {
                    console.log("Closing popout window...");
                    if (window.api.closePopoutWindow) {
                        await window.api.closePopoutWindow();
                        console.log("Popout window closed successfully");
                    }
                }
            } else {
                console.error("API not available");
            }
        } catch (error) {
            console.error("Failed to handle popout window:", error);
        }
    };

    return (
        <div className={styles.queueManagement}>
            <div className={styles.controls}>
                <div className={styles.buttonsAndSettings}>
                    <div className={styles.buttonGroup}>
                        <label className={styles.quickSetting}>
                            <input
                                type="checkbox"
                                checked={settings.popoutSettings.enabled}
                                onChange={async (e) => {
                                    const isEnabled = e.target.checked;
                                    onUpdateSettings({
                                        popoutSettings: { ...settings.popoutSettings, enabled: isEnabled },
                                    });

                                    await handlePopoutToggle(isEnabled);
                                }}
                            />
                            Enable queue popout window
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QueueManagement;

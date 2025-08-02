import React, { useState } from "react";
import { QueueEntry, QueueSettings } from "../types/queue";
import { DEFAULT_SETTINGS } from "../hooks/useQueue";
import styles from "../assets/queue-management.module.scss";

interface QueueManagementProps {
    queue: QueueEntry[];
    settings: QueueSettings;
    onMoveUser: (fromIndex: number, toIndex: number) => void;
    onMarkAsPlaying: (username: string) => void;
    onMarkAsNotPlaying: (username: string) => void;
    onRemoveUser: (username: string) => void;
    onClearQueue: () => void;
    onUpdateSettings: (settings: Partial<QueueSettings>) => void;
}

const QueueManagement: React.FC<QueueManagementProps> = ({
    queue,
    settings,
    onMoveUser,
    onMarkAsPlaying,
    onMarkAsNotPlaying,
    onRemoveUser,
    onClearQueue,
    onUpdateSettings,
}) => {
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

    // Helper function to handle input changes and revert to default if empty
    const handleMessageInputChange = (field: keyof QueueSettings, value: string): void => {
        if (value.trim() === "") {
            // Revert to default value if input is empty
            const defaultValue = DEFAULT_SETTINGS[field];
            if (typeof defaultValue === "string") {
                onUpdateSettings({ [field]: defaultValue });
            }
        } else {
            onUpdateSettings({ [field]: value });
        }
    };

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

    const formatTime = (date: Date): string => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        if (diff < 60) return `${diff}m`;
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        return `${hours}h ${minutes}m`;
    };

    const handleDragStart = (index: number): void => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent): void => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number): void => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== targetIndex) {
            onMoveUser(draggedIndex, targetIndex);
        }
        setDraggedIndex(null);
    };

    return (
        <div className={styles.queueManagement}>
            <div className={styles.header}>
                <h3>Queue Management</h3>
                <div className={styles.queueStats}>
                    <span>Total: {queue.length}</span>
                    <span>Playing: {queue.filter((entry) => entry.isPlaying).length}</span>
                    <span>
                        Status: <span className={settings.isOpen ? styles.open : styles.closed}>{settings.isOpen ? "Open" : "Closed"}</span>
                    </span>
                </div>
            </div>

            <div className={styles.controls}>
                <div className={styles.buttonsAndSettings}>
                    <div className={styles.buttonGroup}>
                        <button
                            onClick={() => onUpdateSettings({ isOpen: !settings.isOpen })}
                            className={`${styles.toggleBtn} ${settings.isOpen ? styles.openBtn : styles.closedBtn}`}
                        >
                            {settings.isOpen ? "Close Queue" : "Open Queue"}
                        </button>
                        <button onClick={onClearQueue} className={styles.clearBtn} disabled={queue.length === 0}>
                            Clear Queue
                        </button>
                        <label className={styles.quickSetting}>
                            <input
                                type="checkbox"
                                checked={settings.requireMessage}
                                onChange={(e) => onUpdateSettings({ requireMessage: e.target.checked })}
                            />
                            Require message when joining
                        </label>
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

            <div className={styles.settingsAccordion}>
                <button className={styles.accordionToggle} onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
                    Advanced Settings {isSettingsOpen ? "▼" : "▶"}
                </button>

                {isSettingsOpen && (
                    <div className={styles.accordionContent}>
                        <div className={styles.settingGroup}>
                            <label htmlFor="maxQueueSize">Max queue size:</label>
                            <input
                                id="maxQueueSize"
                                type="number"
                                value={settings.maxQueueSize || ""}
                                onChange={(e) =>
                                    onUpdateSettings({
                                        maxQueueSize: e.target.value ? parseInt(e.target.value) : undefined,
                                    })
                                }
                                placeholder="No limit"
                                min="1"
                                max="1000"
                            />
                        </div>

                        <div className={styles.settingGroup}>
                            <label htmlFor="joinMessage">Join message:</label>
                            <input
                                id="joinMessage"
                                type="text"
                                value={settings.joinMessage}
                                onChange={(e) => handleMessageInputChange("joinMessage", e.target.value)}
                                placeholder="Use {username} and {position} as placeholders"
                            />
                        </div>

                        <div className={styles.settingGroup}>
                            <label htmlFor="leaveMessage">Leave message:</label>
                            <input
                                id="leaveMessage"
                                type="text"
                                value={settings.leaveMessage}
                                onChange={(e) => handleMessageInputChange("leaveMessage", e.target.value)}
                                placeholder="Use {username} as placeholder"
                            />
                        </div>

                        <div className={styles.settingGroup}>
                            <label htmlFor="queueFullMessage">Queue full message:</label>
                            <input
                                id="queueFullMessage"
                                type="text"
                                value={settings.queueFullMessage}
                                onChange={(e) => handleMessageInputChange("queueFullMessage", e.target.value)}
                                placeholder="Message when queue is full"
                            />
                        </div>

                        <div className={styles.settingGroup}>
                            <label htmlFor="queueClosedMessage">Queue closed message:</label>
                            <input
                                id="queueClosedMessage"
                                type="text"
                                value={settings.queueClosedMessage}
                                onChange={(e) => handleMessageInputChange("queueClosedMessage", e.target.value)}
                                placeholder="Message when queue is closed"
                            />
                        </div>

                        <div className={styles.settingGroup}>
                            <label htmlFor="alreadyInQueueMessage">Already in queue message:</label>
                            <input
                                id="alreadyInQueueMessage"
                                type="text"
                                value={settings.alreadyInQueueMessage}
                                onChange={(e) => handleMessageInputChange("alreadyInQueueMessage", e.target.value)}
                                placeholder="Use {username} and {position} as placeholders"
                            />
                        </div>

                        <div className={styles.settingGroup}>
                            <label htmlFor="notInQueueMessage">Not in queue message:</label>
                            <input
                                id="notInQueueMessage"
                                type="text"
                                value={settings.notInQueueMessage}
                                onChange={(e) => handleMessageInputChange("notInQueueMessage", e.target.value)}
                                placeholder="Use {username} as placeholder"
                            />
                        </div>

                        <div className={styles.settingGroup}>
                            <label htmlFor="positionMessage">Position message:</label>
                            <input
                                id="positionMessage"
                                type="text"
                                value={settings.positionMessage}
                                onChange={(e) => handleMessageInputChange("positionMessage", e.target.value)}
                                placeholder="Use {username}, {position}, and {waitTime} as placeholders"
                            />
                        </div>

                        <div className={styles.settingGroup}>
                            <label htmlFor="requireMessageText">Require message text:</label>
                            <input
                                id="requireMessageText"
                                type="text"
                                value={settings.requireMessageText}
                                onChange={(e) => handleMessageInputChange("requireMessageText", e.target.value)}
                                placeholder="Use {username} as placeholder"
                            />
                        </div>

                        <div className={styles.settingGroup}>
                            <h4>Popout Window Settings</h4>
                        </div>

                        <div className={styles.settingGroup}>
                            <label htmlFor="displayCount">Number of users to display:</label>
                            <input
                                id="displayCount"
                                type="number"
                                value={settings.popoutSettings.displayCount}
                                onChange={(e) =>
                                    onUpdateSettings({
                                        popoutSettings: {
                                            ...settings.popoutSettings,
                                            displayCount: Math.max(1, parseInt(e.target.value) || 1),
                                        },
                                    })
                                }
                                min="1"
                                max="50"
                            />
                        </div>

                        <div className={styles.settingGroup}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.popoutSettings.showPosition}
                                    onChange={(e) =>
                                        onUpdateSettings({
                                            popoutSettings: { ...settings.popoutSettings, showPosition: e.target.checked },
                                        })
                                    }
                                />
                                Show position numbers
                            </label>
                        </div>

                        <div className={styles.settingGroup}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.popoutSettings.showMessage}
                                    onChange={(e) =>
                                        onUpdateSettings({
                                            popoutSettings: { ...settings.popoutSettings, showMessage: e.target.checked },
                                        })
                                    }
                                />
                                Show user messages
                            </label>
                        </div>

                        <div className={styles.settingGroup}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.popoutSettings.showWaitTime}
                                    onChange={(e) =>
                                        onUpdateSettings({
                                            popoutSettings: { ...settings.popoutSettings, showWaitTime: e.target.checked },
                                        })
                                    }
                                />
                                Show wait times
                            </label>
                        </div>

                        <div className={styles.settingGroup}>
                            <label>
                                Background Opacity: {Math.round(settings.popoutSettings.backgroundOpacity * 100)}%
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={settings.popoutSettings.backgroundOpacity}
                                    onChange={(e) =>
                                        onUpdateSettings({
                                            popoutSettings: {
                                                ...settings.popoutSettings,
                                                backgroundOpacity: parseFloat(e.target.value),
                                            },
                                        })
                                    }
                                    className={styles.rangeInput}
                                />
                            </label>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.queueList}>
                <h4>Current Queue ({queue.length})</h4>
                {queue.length === 0 ? (
                    <div className={styles.emptyQueue}>Queue is empty</div>
                ) : (
                    <div className={styles.queueItems}>
                        {queue.map((entry, index) => (
                            <div
                                key={entry.id}
                                className={`${styles.queueItem} ${entry.isPlaying ? styles.playing : ""} ${selectedUser === entry.username ? styles.selected : ""}`}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                                onClick={() => setSelectedUser(entry.username)}
                            >
                                <div className={styles.position}>#{index + 1}</div>
                                <div className={styles.userInfo}>
                                    <div className={styles.username}>{entry.username}</div>
                                    {entry.message && <div className={styles.message}>&quot;{entry.message}&quot;</div>}
                                    <div className={styles.timeInfo}>
                                        <span>In queue: {formatTime(entry.joinedAt)}</span>
                                        {entry.isPlaying && entry.playingStartedAt && <span>Playing: {formatTime(entry.playingStartedAt)}</span>}
                                    </div>
                                </div>
                                <div className={styles.actions}>
                                    {!entry.isPlaying ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onMarkAsPlaying(entry.username);
                                            }}
                                            className={styles.playBtn}
                                        >
                                            Mark Playing
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onMarkAsNotPlaying(entry.username);
                                            }}
                                            className={styles.stopBtn}
                                        >
                                            Stop Playing
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveUser(entry.username);
                                        }}
                                        className={styles.removeBtn}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QueueManagement;

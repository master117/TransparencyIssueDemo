import React, { useState } from "react";
import { QueueEntry, QueueSettings } from "../types/queue";
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
                <button
                    onClick={() => onUpdateSettings({ isOpen: !settings.isOpen })}
                    className={`${styles.toggleBtn} ${settings.isOpen ? styles.openBtn : styles.closedBtn}`}
                >
                    {settings.isOpen ? "Close Queue" : "Open Queue"}
                </button>
                <button onClick={onClearQueue} className={styles.clearBtn} disabled={queue.length === 0}>
                    Clear Queue
                </button>
            </div>

            <div className={styles.settings}>
                <h4>Settings</h4>
                <div className={styles.settingGroup}>
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.requireMessage}
                            onChange={(e) => onUpdateSettings({ requireMessage: e.target.checked })}
                        />
                        Require message when joining
                    </label>
                </div>

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
                        onChange={(e) => onUpdateSettings({ joinMessage: e.target.value })}
                        placeholder="Use {username} and {position} as placeholders"
                    />
                </div>

                <div className={styles.settingGroup}>
                    <label htmlFor="leaveMessage">Leave message:</label>
                    <input
                        id="leaveMessage"
                        type="text"
                        value={settings.leaveMessage}
                        onChange={(e) => onUpdateSettings({ leaveMessage: e.target.value })}
                        placeholder="Use {username} as placeholder"
                    />
                </div>
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
                                    {entry.message && <div className={styles.message}>"{entry.message}"</div>}
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

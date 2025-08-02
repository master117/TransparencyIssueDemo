import React, { useState, useEffect } from "react";
import { QueueEntry, QueueSettings } from "../types/queue";

interface PopoutData {
    queue: QueueEntry[];
    settings: QueueSettings;
}

const QueuePopout: React.FC = () => {
    const [queueData, setQueueData] = useState<PopoutData>({
        queue: [],
        settings: {
            isOpen: true,
            requireMessage: false,
            joinMessage: "",
            leaveMessage: "",
            queueFullMessage: "",
            queueClosedMessage: "",
            alreadyInQueueMessage: "",
            notInQueueMessage: "",
            positionMessage: "",
            requireMessageText: "",
            maxQueueSize: 50,
            popoutSettings: {
                enabled: true,
                displayCount: 5,
                showPosition: true,
                showMessage: true,
                showWaitTime: false,
                backgroundOpacity: 0.7,
            },
        },
    });

    useEffect(() => {
        console.log("QueuePopout component mounted");

        // Listen for queue updates from the main window
        const handleQueueUpdate = (data: PopoutData): void => {
            console.log("Received queue update:", data);
            setQueueData(data);
        };

        // Set up IPC listener for queue updates
        if (window.api && window.api.onQueueUpdate) {
            console.log("Setting up queue update listener");
            window.api.onQueueUpdate(handleQueueUpdate);
        } else {
            console.log("window.api.onQueueUpdate not available");
        }

        // Request initial queue data
        if (window.api && window.api.requestQueueData) {
            console.log("Requesting initial queue data");
            window.api.requestQueueData();
        } else {
            console.log("window.api.requestQueueData not available");
        }

        return () => {
            console.log("QueuePopout component unmounting");
        };
    }, []);

    const formatTime = (date: Date): string => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        if (diff < 60) return `${diff}m`;
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        return `${hours}h ${minutes}m`;
    };

    const displayedQueue = queueData.queue.slice(0, queueData.settings.popoutSettings.displayCount);

    console.log("Rendering QueuePopout with:", {
        queueLength: queueData.queue.length,
        displayCount: queueData.settings.popoutSettings.displayCount,
        displayed: displayedQueue.length,
    });

    return (
        <div className="queue-popout" style={{ "--bg-opacity": queueData.settings.popoutSettings.backgroundOpacity } as React.CSSProperties}>
            <div className="queue-title">Queue ({queueData.queue.length})</div>
            {displayedQueue.length === 0 ? (
                <div className="empty-queue">{queueData.queue.length === 0 ? "Queue is empty" : "Popout window initialized"}</div>
            ) : (
                displayedQueue.map((entry, index) => (
                    <div key={entry.id} className={`queue-entry ${entry.isPlaying ? "playing" : ""}`}>
                        {queueData.settings.popoutSettings.showPosition && <div className="position">#{index + 1}</div>}
                        <div className="username">{entry.username}</div>
                        {queueData.settings.popoutSettings.showMessage && entry.message && <div className="message">{entry.message}</div>}
                        {queueData.settings.popoutSettings.showWaitTime && <div className="wait-time">{formatTime(entry.joinedAt)}</div>}
                    </div>
                ))
            )}
        </div>
    );
};

export default QueuePopout;

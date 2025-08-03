import React, { useState, useEffect } from "react";
import { QueueEntry, QueueSettings } from "../types/queue";
import styles from "../assets/queue-popout.module.scss";

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

    const displayedQueue = queueData.queue.slice(0, queueData.settings.popoutSettings.displayCount);

    console.log("Rendering QueuePopout with:", {
        backgroundOpacity: queueData.settings.popoutSettings.backgroundOpacity,
        queueLength: queueData.queue.length,
        displayCount: queueData.settings.popoutSettings.displayCount,
        displayed: displayedQueue.length,
    });

    return (
        <div
            className={styles.queuePopout}
            style={{
                backgroundColor: `rgba(0, 0, 0, ${queueData.settings.popoutSettings.backgroundOpacity})`,
            }}
        >
            <div className={styles.queueTitle}>TEST</div>
        </div>
    );
};

export default QueuePopout;

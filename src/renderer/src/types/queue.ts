export interface QueueEntry {
    id: string;
    username: string;
    message?: string;
    joinedAt: Date;
    playingStartedAt?: Date;
    isPlaying: boolean;
}

export interface QueueSettings {
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
}

export interface QueueCommand {
    type: "join" | "leave" | "pos";
    username: string;
    message?: string;
}

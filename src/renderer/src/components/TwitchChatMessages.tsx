import React, { useRef, useEffect } from "react";
import styles from "../assets/twitch-chat.module.scss";

interface ChatMessage {
    id: string;
    username: string;
    message: string;
    timestamp: Date;
}

interface TwitchChatMessagesProps {
    messages: ChatMessage[];
    onClearMessages: () => void;
}

const TwitchChatMessages: React.FC<TwitchChatMessagesProps> = ({ messages, onClearMessages }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (): void => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className={styles.chatContainer}>
            <div className={styles.header}>
                <h3>Chat Messages</h3>
                <div className={styles.chatStats}>
                    <span>Total: {messages.length}</span>
                    {messages.length > 0 && <span>Latest: {messages[messages.length - 1]?.timestamp.toLocaleTimeString()}</span>}
                </div>
            </div>
            <div className={styles.controls}>
                <button onClick={onClearMessages} className={styles.clearBtn}>
                    Clear Messages
                </button>
            </div>
            <div className={styles.messagesContainer}>
                {messages.length === 0 ? (
                    <div className={styles.noMessages}>No messages yet. Connect to a channel to start reading chat!</div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={styles.message}>
                            <span className={styles.timestamp}>{msg.timestamp.toLocaleTimeString()}</span>
                            <span className={styles.username}>{msg.username}:</span>
                            <span className={styles.messageText}>{msg.message}</span>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};

export default TwitchChatMessages;

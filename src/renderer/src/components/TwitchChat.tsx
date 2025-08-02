import React, { useState, useEffect, useRef } from "react";
import tmi from "tmi.js";
import styles from "../assets/twitch-chat.module.scss";
import QueueManagement from "./QueueManagement";
import { useQueue } from "../hooks/useQueue";
import { QueueCommand, QueueSettings } from "../types/queue";
import { configService } from "../services/configService";

interface ChatMessage {
    id: string;
    username: string;
    message: string;
    timestamp: Date;
}

const TwitchChat: React.FC = () => {
    const [botUsername, setBotUsername] = useState("");
    const [accessToken, setAccessToken] = useState("");
    const [channel, setChannel] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [client, setClient] = useState<tmi.Client | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected");
    const [saveCredentials, setSaveCredentials] = useState(true);
    const [queueSettings, setQueueSettings] = useState<QueueSettings | undefined>(undefined);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Queue management
    const { queue, settings, processCommand, moveUser, markAsPlaying, markAsNotPlaying, removeUser, clearQueue, updateSettings } =
        useQueue(queueSettings);

    // Use ref to ensure message handler always has the latest processCommand
    const processCommandRef = useRef(processCommand);
    processCommandRef.current = processCommand;

    // Initialize config service and load settings
    useEffect(() => {
        const initializeConfig = async (): Promise<void> => {
            try {
                await configService.initialize();
                const twitchConfig = configService.getTwitchConfig();
                const queueConfig = configService.getQueueConfig();

                // Load saved credentials
                setBotUsername(twitchConfig.username);
                setAccessToken(twitchConfig.accessToken);
                setChannel(twitchConfig.channel);
                setSaveCredentials(queueConfig.saveCredentials);

                // Load queue settings
                setQueueSettings(queueConfig.settings);
            } catch (error) {
                console.error("Failed to initialize config:", error);
            }
        };

        initializeConfig();
    }, []);

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

    // Queue command processing
    const parseQueueCommand = (message: string, username: string): QueueCommand | null => {
        const trimmed = message.trim().toLowerCase();

        if (trimmed.startsWith("!join")) {
            const parts = message.trim().split(" ");
            const commandMessage = parts.slice(1).join(" ");
            return {
                type: "join",
                username,
                message: commandMessage || undefined,
            };
        }

        if (trimmed === "!leave") {
            return {
                type: "leave",
                username,
            };
        }

        if (trimmed === "!pos" || trimmed === "!position") {
            return {
                type: "pos",
                username,
            };
        }

        return null;
    };

    const scrollToBottom = (): void => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const connectToTwitch = async (): Promise<void> => {
        if (!channel.trim()) {
            alert("Please enter a channel name");
            return;
        }

        try {
            // Disconnect existing client if any
            if (client) {
                await client.disconnect();
            }

            // Clean up channel name
            const cleanChannel = channel.toLowerCase().replace("#", "").trim();

            // Simple configuration - try anonymous first, then with token
            const baseConfig = {
                options: { debug: false },
                connection: {
                    reconnect: true,
                    secure: true,
                },
                channels: [`#${cleanChannel}`],
            };

            let clientConfig;
            // If access token and username is provided, add identity
            if (botUsername && botUsername.trim() && accessToken && accessToken.trim()) {
                const token = accessToken.replace("oauth:", "").trim();
                const username = botUsername.trim();
                clientConfig = {
                    ...baseConfig,
                    identity: {
                        username: username,
                        password: `oauth:${token}`,
                    },
                };
                setConnectionStatus("Connecting with authentication...");
            } else {
                clientConfig = baseConfig;
                setConnectionStatus("Connecting anonymously (read-only)...");
            }

            const twitchClient = new tmi.Client(clientConfig);

            twitchClient.on("message", (_, tags, message, self) => {
                if (self) {
                    return; // Ignore echoed messages
                }

                const username = tags["display-name"] || tags.username || "Unknown";

                // Process queue commands
                const queueCommand = parseQueueCommand(message, username);
                if (queueCommand) {
                    console.log(`Queue command detected: ${queueCommand.type} from ${username}`);
                    const response = processCommandRef.current(queueCommand);
                    if (response) {
                        console.log(`Sending response: ${response}`);
                        // Use the local twitchClient directly instead of state
                        if (twitchClient && response.trim()) {
                            twitchClient.say(`#${cleanChannel}`, response).catch((error) => {
                                console.error("Error sending chat message:", error);
                                // Show user-friendly error message
                                if (error.message && error.message.includes("No response from Twitch")) {
                                    console.warn(
                                        "Cannot send messages - likely connected anonymously. Please provide an access token to enable chat responses."
                                    );
                                }
                            });
                        }
                    }
                }

                const newMessage: ChatMessage = {
                    id: tags.id || Math.random().toString(36),
                    username,
                    message: message || "[Empty Message]",
                    timestamp: new Date(),
                };

                setMessages((prev) => [...prev, newMessage]);
            });

            twitchClient.on("connected", async () => {
                setIsConnected(true);
                if (botUsername && botUsername.trim() && accessToken && accessToken.trim()) {
                    setConnectionStatus("Connected and authenticated (can send messages)");
                } else {
                    setConnectionStatus("Connected anonymously (read-only mode)");
                }

                // Save credentials to config if saveCredentials is enabled
                try {
                    const queueConfig = configService.getQueueConfig();
                    if (queueConfig.saveCredentials) {
                        await configService.updateTwitchConfig({
                            username: botUsername.trim() || "",
                            accessToken: accessToken.trim() || "",
                            channel: channel.trim() || "",
                        });
                        console.log("Credentials saved to config");
                    }
                } catch (error) {
                    console.warn("Failed to save credentials:", error);
                }
            });

            twitchClient.on("disconnected", () => {
                setIsConnected(false);
                setConnectionStatus("Disconnected");
                setClient(null);
                setMessages([]);
            });

            // Add error handling
            twitchClient.on("notice", (_, msgid) => {
                if (msgid === "msg_channel_suspended") {
                    alert("Channel is suspended");
                } else if (msgid === "no_permission") {
                    alert("No permission to access this channel");
                }
            });

            console.log("Twitch connect attempt");

            await twitchClient.connect();

            console.log("Setting client to twitchClient");
            setClient(twitchClient);
        } catch (error) {
            setIsConnected(false);
            setConnectionStatus("Disconnected");
            setClient(null);
            setMessages([]);

            // Convert error to string for consistent handling
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Error:", error);

            // More specific error messages
            if (errorMessage.includes("Login authentication failed")) {
                alert("Authentication failed. Please check your access token and try again.");
            } else if (errorMessage.includes("No response from Twitch")) {
                alert("No response from Twitch. Please check your internet connection.");
            } else if (errorMessage.includes("Connection closed")) {
                alert("Connection was closed. Please try again.");
            } else if (errorMessage.includes("timeout")) {
                alert("Connection timeout. Please check your internet connection and try again.");
            } else {
                alert(`Connection error: ${errorMessage}`);
            }
        }
    };

    const disconnectFromTwitch = async (): Promise<void> => {
        if (client) {
            console.log("Disconnect from twitch");
            await client.disconnect();
        }
    };

    const clearMessages = (): void => {
        setMessages([]);
    };

    const handleSaveCredentialsChange = async (enabled: boolean): Promise<void> => {
        setSaveCredentials(enabled);
        try {
            await configService.updateQueueConfig({ saveCredentials: enabled });
        } catch (error) {
            console.error("Failed to save credentials setting:", error);
        }
    };

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
            <div className={styles.instructions}>
                <div>
                    Quick Start: Enter any Twitch channel name and connect to start reading chat messages.
                    <br />
                    ⚠️ Important for Queue Bot: To enable automatic chat responses for queue commands, you need to authenticate. Get an access token
                    from{" "}
                    <a href="https://twitchtokengenerator.com/" target="_blank" rel="noreferrer noopener">
                        twitchtokengenerator.com
                    </a>{" "}
                    with Chat:Read and Chat:Edit scopes.{" "}
                </div>
            </div>

            <div className={styles.apiSettings}>
                <h3>API Configuration</h3>
                <div className={styles.inputGroups}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="botUsername">Chat Bot Username (Optional):</label>
                        <input
                            id="botUsername"
                            type="text"
                            value={botUsername}
                            onChange={(e) => setBotUsername(e.target.value)}
                            placeholder="Your Bot's Username"
                            disabled={isConnected}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="accessToken">Access Token (Optional):</label>
                        <input
                            id="accessToken"
                            type="password"
                            value={accessToken}
                            onChange={(e) => setAccessToken(e.target.value)}
                            placeholder="Your Twitch Access Token"
                            disabled={isConnected}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="channel">Channel Name:</label>
                        <input
                            id="channel"
                            type="text"
                            value={channel}
                            onChange={(e) => setChannel(e.target.value)}
                            placeholder="Enter channel name (without #)"
                            disabled={isConnected}
                        />
                    </div>
                </div>

                <div className={styles.buttonGroup}>
                    {!isConnected ? (
                        <button onClick={connectToTwitch} className={styles.connectBtn}>
                            Connect to Chat
                        </button>
                    ) : (
                        <button onClick={disconnectFromTwitch} className={styles.disconnectBtn}>
                            Disconnect
                        </button>
                    )}
                    <button onClick={clearMessages} className={styles.clearBtn}>
                        Clear Messages
                    </button>
                    <div className={`${styles.connectionStatus} ${isConnected ? styles.connected : styles.disconnected}`}>
                        <strong>Status:</strong> {connectionStatus}
                    </div>
                </div>

                <div className={styles.configOptions}>
                    <label>
                        <input type="checkbox" checked={saveCredentials} onChange={(e) => handleSaveCredentialsChange(e.target.checked)} /> Save
                        credentials to config file on connect
                    </label>
                </div>
            </div>
            <div className={styles.chatContainer}>
                <h3>Chat Messages</h3>
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

            <QueueManagement
                queue={queue}
                settings={settings}
                onMoveUser={moveUser}
                onMarkAsPlaying={markAsPlaying}
                onMarkAsNotPlaying={markAsNotPlaying}
                onRemoveUser={removeUser}
                onClearQueue={clearQueue}
                onUpdateSettings={handleQueueSettingsUpdate}
            />
        </div>
    );
};

export default TwitchChat;

import React, { useState, useEffect, useRef } from "react";
import tmi from "tmi.js";
import styles from "../assets/twitch-chat.module.scss";
import QueueManagement from "./QueueManagement";
import { useQueue } from "../hooks/useQueue";
import { QueueCommand } from "../types/queue";
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Queue management
    const { queue, settings, processCommand, moveUser, markAsPlaying, markAsNotPlaying, removeUser, clearQueue, updateSettings } = useQueue();

    // Use ref to ensure message handler always has the latest processCommand
    const processCommandRef = useRef(processCommand);
    processCommandRef.current = processCommand;

    // Initialize config service and load settings
    useEffect(() => {
        const initializeConfig = async () => {
            try {
                await configService.initialize();
                const twitchConfig = configService.getTwitchConfig();
                const queueConfig = configService.getQueueConfig();

                // Load saved credentials
                setBotUsername(twitchConfig.username);
                setAccessToken(twitchConfig.accessToken);
                setChannel(twitchConfig.channel);
                setSaveCredentials(queueConfig.saveCredentials);
            } catch (error) {
                console.error("Failed to initialize config:", error);
            }
        };

        initializeConfig();
    }, []);

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
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
            // If access token is provided, add identity
            if (accessToken && accessToken.trim()) {
                const token = accessToken.replace("oauth:", "").trim();
                const username = botUsername.trim() || `bot_${Math.floor(Math.random() * 100000)}`;
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
                if (accessToken && accessToken.trim()) {
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
            console.log(twitchClient);
            await twitchClient
                .connect()
                .then((data) => {
                    console.log(data);
                })
                .catch((err) => {
                    console.log(err);
                });
            console.log(twitchClient);

            console.log("setting client to twitchClient");
            setClient(twitchClient);
            console.log(client);
        } catch (error) {
            setIsConnected(false);

            // More specific error messages
            if (error instanceof Error) {
                if (error.message.includes("Login authentication failed")) {
                    alert("Authentication failed. Please check your access token and try again.");
                } else if (error.message.includes("No response from Twitch")) {
                    alert("No response from Twitch. Please check your internet connection.");
                } else if (error.message.includes("Connection closed")) {
                    alert("Connection was closed. Please try again.");
                } else if (error.message.includes("timeout")) {
                    alert("Connection timeout. Please check your internet connection and try again.");
                } else {
                    alert(`Connection error: ${error.message}`);
                }
            } else {
                alert("Failed to connect to Twitch. Please try again.");
            }
        }
    };

    const disconnectFromTwitch = async (): Promise<void> => {
        if (client) {
            console.log("Disconnect from twitch");
            await client.disconnect();
            setClient(null);
            setIsConnected(false);
            setConnectionStatus("Disconnected");
            setMessages([]);
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

    return (
        <div className={styles.twitchChat}>
            <h2>Twitch Chat Reader</h2>

            <div className={styles.instructions}>
                <p>
                    <strong>Quick Start:</strong>
                    <span> Enter any Twitch channel name and connect to start reading chat messages.</span>
                </p>
                <p>
                    <strong>⚠️ Important for Queue Bot:</strong> To enable automatic chat responses for queue commands (!join, !leave, !pos), you need
                    to authenticate with Twitch. Get an access token from{" "}
                    <a href="https://twitchtokengenerator.com/" target="_blank" rel="noreferrer noopener">
                        twitchtokengenerator.com
                    </a>{" "}
                    with Chat:Read and Chat:Edit scopes.
                </p>
            </div>

            <div className={styles.apiSettings}>
                <h3>API Configuration</h3>
                <div className={styles.inputGroup}>
                    <label htmlFor="botUsername">Username of chat bot (Optional):</label>
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
                </div>

                <div className={styles.statusInfo}>
                    <p>
                        <strong>Status:</strong> {connectionStatus}
                    </p>
                </div>

                <div className={styles.configOptions}>
                    <h4>Configuration Options</h4>
                    <div className={styles.checkboxGroup}>
                        <label>
                            <input type="checkbox" checked={saveCredentials} onChange={(e) => handleSaveCredentialsChange(e.target.checked)} />
                            Save credentials to config file
                        </label>
                    </div>
                </div>
            </div>

            <div className={`${styles.connectionStatus} ${isConnected ? styles.connected : styles.disconnected}`}>
                Status: <span>{isConnected ? "Connected" : "Disconnected"}</span>
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
                onUpdateSettings={updateSettings}
            />
        </div>
    );
};

export default TwitchChat;

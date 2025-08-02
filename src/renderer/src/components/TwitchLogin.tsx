import React from "react";
import styles from "../assets/twitch-chat.module.scss";

interface TwitchLoginProps {
    botUsername: string;
    accessToken: string;
    channel: string;
    isConnected: boolean;
    connectionStatus: string;
    saveCredentials: boolean;
    errorMessage: string;
    onBotUsernameChange: (value: string) => void;
    onAccessTokenChange: (value: string) => void;
    onChannelChange: (value: string) => void;
    onConnect: () => void;
    onDisconnect: () => void;
    onSaveCredentialsChange: (enabled: boolean) => void;
    onClearError: () => void;
}

const TwitchLogin: React.FC<TwitchLoginProps> = ({
    botUsername,
    accessToken,
    channel,
    isConnected,
    connectionStatus,
    saveCredentials,
    errorMessage,
    onBotUsernameChange,
    onAccessTokenChange,
    onChannelChange,
    onConnect,
    onDisconnect,
    onSaveCredentialsChange,
    onClearError,
}) => {
    return (
        <div className={styles.apiSettings}>
            <h3>API Configuration</h3>
            <div className={styles.inputGroups}>
                <div className={styles.inputGroup}>
                    <label htmlFor="botUsername">Chat Bot Username (Optional):</label>
                    <input
                        id="botUsername"
                        type="text"
                        value={botUsername}
                        onChange={(e) => onBotUsernameChange(e.target.value)}
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
                        onChange={(e) => onAccessTokenChange(e.target.value)}
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
                        onChange={(e) => onChannelChange(e.target.value)}
                        placeholder="Enter channel name (without #)"
                        disabled={isConnected}
                    />
                </div>
            </div>

            <div className={styles.buttonGroup}>
                {!isConnected ? (
                    <button onClick={onConnect} className={styles.connectBtn}>
                        Connect to Chat
                    </button>
                ) : (
                    <button onClick={onDisconnect} className={styles.disconnectBtn}>
                        Disconnect
                    </button>
                )}
                <div className={`${styles.connectionStatus} ${isConnected ? styles.connected : styles.disconnected}`}>
                    <strong>Status:</strong> {connectionStatus}
                </div>
            </div>

            {errorMessage && (
                <div className={styles.errorMessage}>
                    <strong>Error:</strong> {errorMessage}
                    <button onClick={onClearError} className={styles.closeErrorBtn}>
                        ×
                    </button>
                </div>
            )}

            <div className={styles.configOptions}>
                <label>
                    <input type="checkbox" checked={saveCredentials} onChange={(e) => onSaveCredentialsChange(e.target.checked)} />
                    Save credentials to config file on connect
                </label>
            </div>
        </div>
    );
};

export default TwitchLogin;

import React from "react";
import styles from "../assets/twitch-chat.module.scss";

const TwitchInstructions: React.FC = () => {
    return (
        <div className={styles.instructions}>
            <div>
                Quick Start: Enter any Twitch channel name and connect to start reading chat messages.
                <br />
                ⚠️ Important for Queue Bot: To enable automatic chat responses for queue commands, you need to authenticate. Get an access token from{" "}
                <a href="https://twitchtokengenerator.com/" target="_blank" rel="noreferrer noopener">
                    twitchtokengenerator.com
                </a>{" "}
                with Chat:Read and Chat:Edit scopes.
            </div>
        </div>
    );
};

export default TwitchInstructions;

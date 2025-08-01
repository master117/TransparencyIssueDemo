import TwitchChat from "./components/TwitchChat";

function App(): React.JSX.Element {
    return (
        <>
            <div className="app-container">
                <h1>RunaQueue Tool</h1>
                <p>Manage a queue of Twitch viewers!</p>
                <TwitchChat />
            </div>
        </>
    );
}

export default App;

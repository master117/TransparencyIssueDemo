import TwitchChat from "./components/TwitchChat";

function App(): React.JSX.Element {
    return (
        <>
            <div className="app-container">
                <h1>RunaQueue Tool</h1>
                <p>Manager a queue of Twitch viewers!</p>
                <TwitchChat />
            </div>
        </>
    );
}

export default App;

import TwitchChat from "./components/TwitchChat";

function App(): React.JSX.Element {
  return (
    <>
      <div className="app-container">
        <h1>RunaQueue Tool</h1>
        <p>Twitch Chat Command Reader</p>
        <TwitchChat />
      </div>
    </>
  );
}

export default App;

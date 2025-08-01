import "./assets/main.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import QueuePopout from "./components/QueuePopout";

createRoot(document.getElementById("popout-root")!).render(
    <StrictMode>
        <QueuePopout />
    </StrictMode>
);

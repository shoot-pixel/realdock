import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Default to dark mode (Studio Dark theme)
if (!document.documentElement.classList.contains("light")) {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);

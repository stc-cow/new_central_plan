import "./global.css";
import { createRoot } from "react-dom/client";

const App = () => null;

const container = document.getElementById("root");
if (container) {
  const anyWin = window as any;
  let root = anyWin.__REACT_APP_ROOT__;
  if (!root) {
    root = createRoot(container);
    anyWin.__REACT_APP_ROOT__ = root;
  }
  root.render(<App />);
}

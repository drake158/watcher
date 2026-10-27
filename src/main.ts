import { AppController } from "./app/AppController";
import "./styles/layout.css";
import "./styles/visualizer.css";

const appRoot = document.querySelector<HTMLElement>("#app");

if (appRoot === null) {
  throw new Error("WATCHER application root is missing.");
}

new AppController(appRoot).mount();

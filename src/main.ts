import { RockSmashGame } from "./game/game";
import "./style.css";

const app = document.querySelector("#app");
if (!(app instanceof HTMLElement)) throw new Error("Missing #app root");

new RockSmashGame(app);

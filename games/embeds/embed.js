import { Game } from "../utils/p2p/Game.js";

const game = new Game(
  { version: "", count: 0 },
  {
    increment: {},
  },
  {
    actions: {
      syncUsers(state, payload, actor) {
        return state;
      },
      increment(state, payload, actor) {
        state.count++;
        return state;
      },
    },
  },
);

game.onStateChange((state) => {
  document.querySelector("button").innerText = state.count;
});

document.querySelector("button").addEventListener("click", () => {
  game.action("increment", {});
});

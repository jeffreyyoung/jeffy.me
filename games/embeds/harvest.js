import { Game } from "../utils/p2p/Game.js";
import { enumType } from "../utils/p2p/types.js";

var game = new Game(
  {
    version: "0",
    harvesters: 0,
    seeds: 0,
  },
  {
    increment: { kind: enumType("harvester", "seed"), amount: 0 },
  },
  {
    actions: {
      syncUsers(state, payload, actor) {
        return state;
      },
      increment(state, { kind, amount }, actor) {
        if (kind === "harvester") {
          state.harvesters += amount;
        } else if (kind === "seed") {
          state.seeds += amount;
        }
        return state;
      },
    },
  }
);

const gameDom = document.querySelector("#root");

game.onStateChange((state) => {
  gameDom.innerHTML = `
        <h1>Harvest</h1>
        <p>Harvesters: ${state.harvesters}</p>
        <p>Seeds: ${state.seeds}</p>
        <button onclick="game.action('increment', { kind: 'harvester', amount: 1 })">+1 Harvester</button>
        <button onclick="game.action('increment', { kind: 'seed', amount: 1 })">+1 Seed</button>
    `;
});

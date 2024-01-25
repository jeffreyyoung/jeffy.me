import { h, render } from "https://esm.sh/preact@10.19.3";
import {
  signal,
  useComputed,
} from "https://esm.sh/@preact/signals@1.2.2?deps=preact@10.19.3";
import { P2pState } from "../games/utils/p2p-state.js";

/**
 * @typedef {{
 *    increment: {}
 * }} ActionMap
 *
 * @typedef {{
 *  version: string,
 *   players: {
 *     name: string,
 *     count: number,
 *   }[]
 * }} GameState
 */

const gameState = signal(
  /** @type {GameState} */
  ({
    version: "0",
    players: [],
  })
);

const server = new P2pState(
  /** @type {ActionMap} */
  ({}),
  gameState.value,
  {
    autoConnect: false,
    isHost: false,
    actorUsername: "",
    roomId: "",
    actions: {
      increment: (state, _, actor) => {
        if (!state.players.find((p) => p.name === actor)) {
          state.players.push({
            name: actor,
            count: 0,
          });
        }

        state.players.find((p) => p.name === actor).count++;

        return state;
      },
    },
    onStateChange: (state) => {
      gameState.value = { ...state };
    },
    onConnectionChange: () => {},
  }
);

/**
 *
 * @param {string} name
 * @returns
 */
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

const username = getQueryParam("username") || Math.random() + "";
const isHost = getQueryParam("host") === "1";
// server.connect({
//   username,
//   isHost,
//   roomId: "test",
// });

function MyButton() {
  const count = useComputed(
    () => gameState.value.players.find((p) => p.name === username)?.count || 0
  );
  return h(
    "button",
    {
      onClick: () => server.send("increment", {}),
    },
    count,
    " clicks"
  );
}

// Create your app
const app = h(
  "h1",
  null,
  "Hello World!",
  h("a", { "data-meow": "meow", href: "a" }, "hi"),
  h(MyButton, null)
);

render(app, document.body);

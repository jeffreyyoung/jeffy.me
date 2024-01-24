import {
  html,
  render,
} from "https://cdn.jsdelivr.net/npm/lit-html@1/+esm";
import { P2pState } from "./utils/p2p-state.js";
import { words } from "./cross-clues-words.js";
import { shuffle } from "./utils/random.js";
/**
 * @typedef Player
 * @type {{
 * name: string,
 * isHost: boolean,
 * coord: string
 * }}
 */

/**
 * @typedef GameState
 * @type {{
 * version: string,
 * players: Record<string, Player>
 * words: Record<string, string>
 * guesses: Record<string, "correct" | "miss">
 * shuffledCoords: string[]
 * }}
 */

/**
 * @typedef ActionMap
 * @type {{
 *      join: { actor: string },
 *      kick: { username: string },
 *      guess: { actor: string, coord: string, result: "correct" | "miss" }
 * }}
 */
const urlSearchParams = new URLSearchParams(
  window.location.search.split("?")?.[1] || ""
);
const params = Object.fromEntries(urlSearchParams.entries());
const username = localStorage.getItem("username") || "";
const lobbyId = params.lobbyId || "";
const isHost = window.localStorage.getItem(`isHost-${lobbyId}`) === "true";

function wordGetter() {
  let usedWords = new Set();

  return () => {
    while (usedWords.size < words.length) {
      const word = words[Math.floor(Math.random() * words.length)];
      if (!usedWords.has(word)) {
        usedWords.add(word);
        return word;
      }
    }
    throw new Error("no more words");
  };
}

const getWord = wordGetter();

/**
 *
 * @param {GameState=} gameState
 * @returns
 */
function getUsedCoordsSet(
  gameState = {
    version: "0",
    players: {},
    guesses: {},
    words: {},
    shuffledCoords: [],
  }
) {
  const playerCoords = Object.values(gameState?.players || {})
    .map((player) => player.coord)
    .filter(Boolean)

  const coords = new Set([
    ...playerCoords,
    ...Object.keys(gameState?.guesses || {}),
  ]);

  return coords;
}

/**
 * @param {GameState} gameState
 * @returns {number}
 */
function getUnguessedCoordCount(gameState) {
  const coords = getUsedCoordsSet(gameState);
  let playerCoords = 0;
  for (const player of Object.values(gameState.players)) {
    if (player.coord) {
      playerCoords++;
    }
  }
  return 25 - coords.size + playerCoords;
}

/**
 * @param {GameState} gameState
 * @returns {number}
 */
function getMistakeCount(gameState) {
  return Object.values(gameState.guesses).filter((kind) => kind === "miss")
    .length;
}

/**
 * @param {GameState=} gameState
 * @returns {string}
 */
function getUnusedCoord(gameState) {
  const coords = getUsedCoordsSet(gameState);
  return gameState.shuffledCoords.find((coord) => !coords.has(coord)) || "";
}

/**
 *
 * @returns {string[]}
 */
function createShuffledCoords() {
  let coords = [];
  for (let letter of "ABCDE") {
    for (let number of range(1, 5)) {
      coords.push(`${letter}${number}`);
    }
  }
  return shuffle(coords);
}

var server = new P2pState(
  /** @type {ActionMap} */
  ({}),
  /** @type {GameState} */
  ({
    version: "0",
    players: {
      [username]: {
        name: username,
        isHost,
        coord: createShuffledCoords()[0],
      },
    },
    words: {
      A: getWord(),
      B: getWord(),
      C: getWord(),
      D: getWord(),
      E: getWord(),
      1: getWord(),
      2: getWord(),
      3: getWord(),
      4: getWord(),
      5: getWord(),
    },
    guesses: {},
    shuffledCoords: createShuffledCoords(),
  }),
  {
    isHost,
    roomId: lobbyId,
    actorUsername: username,
    actions: {
      guess: (state, { coord, result }, actor) => {
        return {
          ...state,
          guesses: {
            ...state.guesses,
            [coord]: result,
          },
          players: {
            ...state.players,
            [actor]: {
              ...state.players[actor],
              coord: getUnusedCoord(state),
            },
          },
        };
      },
      join: (state, payload, actor) => {
        if (!actor) {
          return state;
        }
        if (state.players[actor]) {
          return state;
        }
        return {
          ...state,
          players: {
            ...state.players,
            [actor]: {
              name: actor,
              isHost: actor === username && isHost,
              coord: getUnusedCoord(state),
            },
          },
        };
      },
      kick: (state, payload) => {
        let toKick = payload.username
        if (!toKick) {
          return state;
        }
        if (!state.players[toKick]) {
          return state;
        }
        const { [toKick]: _, ...players } = state.players;
        return {
          ...state,
          players,
        };
      },
    },
  }
);
server.on("change:state", (state) => {
  window.state = state;
  update();
});

server.on("change:connected", (connected) => {
  if (connected) {
    server.send("join", { actor: username });
  }
});

function ui() {
  if (!username) {
    return html`
      <form
        @submit=${
          // @ts-ignore
          (e) => {
            e.preventDefault();
            const username = e.target.username.value;
            localStorage.setItem("username", username.trim());
            // refresh page
            window.location = window.location;
          }
        }
      >
        <input
          type="text"
          name="username"
          value=${username}
          placeholder="Your username"
        />
        <button type="submit">Join</button>
      </form>
    `;
  }

  if (!lobbyId) {
    return html`
      <form
        @submit=${
          // @ts-ignore
          (e) => {
            e.preventDefault();
            const lobbyId = e.target.lobbyId.value;
            window.location.href = `/games/cross-clues.html?lobbyId=${lobbyId}`;
          }
        }
      >
        <p>join game with lobby code</p>
        <input type="text" name="lobbyId" placeholder="lobby code" />
        <button type="submit">join</button>
      </form>
      <hr />
      <form
        @submit=${
          // @ts-ignore
          (e) => {
            e.preventDefault();
            const gameId = Math.floor(Math.random()*9999+1000);
            window.localStorage.setItem(`isHost-${gameId}`, "true");
            window.location.href = `/games/cross-clues.html?lobbyId=${gameId}`;
          }
        }
      >
        <p>host a game</p>
        <button type="submit">create</button>
      </form>
    `;
  }
  let gameState = server.state;

  /**
   *
   * @param {GameState} gameState
   * @param {string} rowLetter
   * @returns
   */
  function renderRows(gameState, rowLetter) {
    const actorState = gameState.players[username];
    return range(1, 5).map((number) => {
      const coord = `${rowLetter}${number}`;
      const myCoord = actorState?.coord;
      const isMyTile = myCoord === coord;
      const isGuessed = gameState.guesses[`${rowLetter}${number}`];
      return html`<td
        data-row="${rowLetter}"
        data-col="${number}"
        class="needs-guess ${isGuessed}"
      >
        ${isMyTile
          ? html`
              <div class="my-tile fadeInUp-animation">this is your tile 🤫</div>
            `
          : html``}
        ${isGuessed === "correct"
          ? html`<div class="correct fadeInUp-animation">✅</div>`
          : html``}
        ${isGuessed === "miss"
          ? html`<div class="correct fadeInUp-animation">❌</div>`
          : html``}
      </td>`;
    });
  }

  const remainingTileCount = getUnguessedCoordCount(gameState);
  const mistakeCount = getMistakeCount(gameState);
  let playerCoord = gameState.players[username]?.coord;
  let timeoutId = -1;
  return html`
    <table>
      <tr>
        <th></th>
        <th>
          1
          <div><small>${gameState.words["1"]}</small></div>
        </th>
        <th>
          2
          <div><small>${gameState.words["2"]}</small></div>
        </th>
        <th>
          3
          <div><small>${gameState.words["3"]}</small></div>
        </th>
        <th>
          4
          <div><small>${gameState.words["4"]}</small></div>
        </th>
        <th>
          5
          <div><small>${gameState.words["5"]}</small></div>
        </th>
      </tr>
      <tr>
        <th>
          A
          <div><small>${gameState.words["A"]}</small></div>
        </th>
        ${renderRows(gameState, "A")}
      </tr>
      <tr>
        <th>
          B
          <div><small>${gameState.words["B"]}</small></div>
        </th>
        ${renderRows(gameState, "B")}
      </tr>
      <tr>
        <th>
          C
          <div><small>${gameState.words["C"]}</small></div>
        </th>
        ${renderRows(gameState, "C")}
      </tr>
      <tr>
        <th>
          D
          <div><small>${gameState.words["D"]}</small></div>
        </th>
        ${renderRows(gameState, "D")}
      </tr>
      <tr>
        <th>
          E
          <div><small>${gameState.words["E"]}</small></div>
        </th>
        ${renderRows(gameState, "E")}
      </tr>
    </table>

    ${playerCoord
      ? html`
          <p style="text-align: center;">
            <strong>${playerCoord}</strong> is your tile
          </p>
          <p style="text-align: center;">Did your team guess correctly?</p>
          <div
            style="display: flex; justify-content: center; align-items: center; gap: 12px;"
          >
            <button
              @click=${() =>
                server.send("guess", {
                  actor: username,
                  coord: playerCoord,
                  result: "correct",
                })}
            >
              ✅ correct
            </button>
            <button
              @click=${() =>
                server.send("guess", {
                  actor: username,
                  coord: playerCoord,
                  result: "miss",
                })}
            >
              ❌ miss
            </button>
          </div>
        `
      : html``}
    <hr />
    <p style="text-align: center;">
      ${remainingTileCount} tiles remaining - ${mistakeCount}
      mistake${mistakeCount === 1 ? "" : "s"} so far
    </p>
    ${!playerCoord && remainingTileCount > 0
      ? html`
          <p>
            Waiting for
            ${Object.entries(gameState.players)
              .filter(([name, player]) => player.coord)
              .map(([name, player]) => name)
              .join(", ")}
            to give clues
          </p>
        `
      : ""}
    ${remainingTileCount === 0
      ? html`
          <p>
            🎉🎉${Object.values(gameState.guesses).filter(
              (result) => result === "correct"
            ).length}/25
            correct🎉🎉
          </p>
        `
      : ""}
    <h4>players</h4>
    <ul>
      ${Object.values(gameState.players || {}).map(
        (player) =>
          html`
            <li>
              ${player?.name} ${player?.isHost ? "(host)" : ""}
              ${player?.name === username ? "(you)" : ""}
              ${isHost && player?.name !== username ? html`<button @click=${() => {
                server.send("kick", { username: player.name });
              }}>kick</button>` : ``}
            </li>
          `
      )}
    </ul>
  `;
}

/**
 *
 * @param {any} children
 * @returns
 */
function layout(children) {
  return html` ${children} `;
}

function update() {
  let lobbySlot = document.getElementById("lobby-slot");
  if (lobbyId) {
    render(lobbyInfo(), lobbySlot);
  } else {
    render(html``, lobbySlot);
  }
  render(layout(ui()), document.getElementById("game"));
}
let timeoutId = 0;
function lobbyInfo() {
  return html`
    <div style="">
      <button
        id="copy-link"
        @click=${() => {
          navigator.clipboard.writeText(window.location.href);
          document.getElementById("copy-link").innerText = "copied!";
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            document.getElementById("copy-link").innerText = "copy invite link";
          }, 1000);
        }}
      >
        copy invite link
      </button>
      <br />
      <small style="text-align: end">lobby code: ${lobbyId}</small>
    </div>
  `;
}

/**
 *
 * @param {number} start
 * @param {number} end
 * @returns
 */
function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

update();

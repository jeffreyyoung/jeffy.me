import { html, render } from "https://esm.sh/lit-html@3.1.1";
import { words } from "./cross-clues-words.js";
import { shuffle } from "./utils/random.js";
import { Game } from "./utils/p2p/Game.js";
/**
 * @typedef Player
 * @type {{
 * id: string,
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
 * shuffledCoords: string[],
 * shouldShowWrongGuesses: boolean
 * }}
 */

/**
 * @typedef ActionMap
 * @type {{
 *      guess: { actor: string, coord: string, result: "correct" | "miss" },
 *      updateShouldShowWrongGuesses: { shouldShowWrongGuesses: boolean }
 * }}
 */

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
    shouldShowWrongGuesses: false,
  },
) {
  const playerCoords = Object.values(gameState?.players || {})
    .map((player) => player.coord)
    .filter(Boolean);

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

var server = new Game(
  /** @type {GameState} */
  ({
    version: "0",
    players: {},
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
    shouldShowWrongGuesses: false,
    shuffledCoords: createShuffledCoords(),
  }),
  /** @type {ActionMap} */
  ({}),
  {
    actions: {
      syncUsers: (state, { room }) => {
        for (const user of room.users) {
          if (!state.players[user.id]) {
            state.players[user.id] = {
              id: user.id,
              name: user.name,
              isHost: user.isHost,
              coord: getUnusedCoord(state),
            };
          }
        }
        return state;
      },
      updateShouldShowWrongGuesses: (state, { shouldShowWrongGuesses }) => {
        return {
          ...state,
          shouldShowWrongGuesses,
        };
      },
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
    },
  },
);
let username = "";
server.gameLogic.emitter.on("change:state", (state, action) => {
  username = server.userId;
  update();
});

function ui() {
  let gameState = server.gameLogic.state;
  server.userId;

  /**
   *
   * @param {GameState} gameState
   * @param {string} rowLetter
   * @returns
   */
  function renderRows(gameState, rowLetter) {
    const actorState = gameState.players[server.userId];
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
        ${isGuessed === "miss" && gameState.shouldShowWrongGuesses
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
                server.action("guess", {
                  actor: username,
                  coord: playerCoord,
                  result: "correct",
                })}
            >
              ✅ correct
            </button>
            <button
              @click=${() =>
                server.action("guess", {
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
              (result) => result === "correct",
            ).length}/25
            correct🎉🎉
          </p>
        `
      : ""}
    <h4>players</h4>
    <ul>
      ${Object.values(gameState.players || {}).map(
        (player) => html`
          <li>${player?.name} ${player?.isHost ? "(host)" : ""}</li>
        `,
      )}
    </ul>
    <h4>settings</h4>

    <label style="display: inline-flex; align-items: center;">
      <input
        type="checkbox"
        ?checked=${gameState.shouldShowWrongGuesses}
        @change=${(e) =>
          server.action("updateShouldShowWrongGuesses", {
            shouldShowWrongGuesses: e.target.checked,
          })}
      />
      show wrong guesses
    </label>
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
  render(layout(ui()), document.getElementById("game"));
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

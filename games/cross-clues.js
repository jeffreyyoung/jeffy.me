import {
  html,
  render,
} from "https://cdn.jsdelivr.net/npm/lit-html@3.0.2/lit-html.min.js";
import { getGameServer } from "./utils/game-server.js";
import { words } from "./cross-clues-words.js";

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
    return;
  };
}

const getWord = wordGetter();

function getUsedCoordsSet(gameState = {}) {
  const playerCoords = Object.values(gameState?.players || {})
    .map((player) => player.coord)
    .filter(Boolean);

  const coords = new Set([
    ...playerCoords,
    ...Object.keys(gameState?.guesses || {}),
  ]);

  return coords;
}

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

function getUnusedCoord(gameState) {
  const coords = getUsedCoordsSet(gameState);
  while (coords.size < 25) {
    const letter = "ABCDE"[Math.floor(Math.random() * 5)];
    const number = Math.floor(Math.random() * 5) + 1;
    const coord = `${letter}${number}`;
    if (!coords.has(coord)) {
      return coord;
    }
  }
  return "";
}

const server = getGameServer({
  isHost,
  roomId: lobbyId,
  enabled: username && lobbyId,
  initialState: {
    players: {
      [username]: {
        name: username,
        isHost,
        coord: getUnusedCoord({}),
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
  },
  onAction(state, action) {
    if (action.type === "join") {
      return {
        ...state,
        players: {
          ...state.players,
          [action.actor]: {
            name: action.actor,
            isHost: action.actor === username && isHost,
            coord: getUnusedCoord(state),
          },
        },
      };
    }
    if (action.type === "update") {
      return {
        ...state,
        board: action.board,
      };
    }
    console.log("action", action);
    if (action.type === "guess") {
      return {
        ...state,
        guesses: {
          ...state.guesses,
          [action.coord]: action.result,
        },
        players: {
          ...state.players,
          [action.actor]: {
            ...state.players[action.actor],
            coord: getUnusedCoord(state),
          },
        },
      };
    }

    return state;
  },
  onStateChange(state) {
    console.log("on state change", state);
    update();
  },
});
server.send({
  type: "join",
  actor: username,
});

function ui() {
  if (!username) {
    return html`
      <form
        @submit=${(e) => {
          e.preventDefault();
          const username = e.target.username.value;
          localStorage.setItem("username", username.trim());
          // refresh page
          window.location = window.location;
        }}
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
      <form @submit=${(e) => {}}>
        <p>join game with lobby code</p>
        <input type="text" name="lobbyId" placeholder="lobby code" />
        <button type="submit">join</button>
      </form>
      <hr />
      <form
        @submit=${(e) => {
          e.preventDefault();
          const gameId = Math.random().toString(36).substring(4);
          window.localStorage.setItem(`isHost-${gameId}`, true);
          window.location.href = `/games/cross-clues.html?lobbyId=${gameId}`;
        }}
      >
        <p>host a game</p>
        <button type="submit">create</button>
      </form>
    `;
  }
  let gameState = server.getLatestState();

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
          ? html` <div class="my-tile">this is your tile 🤫</div> `
          : html``}
        ${isGuessed === "correct"
          ? html`<div class="correct">✅</div>`
          : html``}
      </td>`;
    });
  }
  const remainingTileCount = getUnguessedCoordCount(gameState);
  console.log("ishost", isHost);
  let playerCoord = gameState.players[username]?.coord;
  return html`
    <p>
      <small
        ><a href="/games/cross-clues.html?lobbyId=${lobbyId}"
          >lobby: ${lobbyId}</a
        >
        - invite others with this link</small
      >
    </p>

    <h4>board:</h4>
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
          <h4>Your tile is <strong>${playerCoord}</strong></h4>
          <p><small>
            Give a 1 word hint associated associated with the row and column of your tile (${gameState.words[playerCoord[0]]} and ${gameState.words[playerCoord[1]]}). If your team guesses correctly, click "correct". If they guess incorrectly, click "miss".
          </small></p>
          <p>Did your team guess correctly?</p>
          <button
            @click=${() =>
              server.send({
                type: "guess",
                actor: username,
                coord: playerCoord,
                result: "correct",
              })}
          >
            correct
          </button>
          <button
            @click=${() =>
              server.send({
                type: "guess",
                actor: username,
                coord: playerCoord,
                result: "miss",
              })}
          >
            miss
          </button>
        `
      : html``}
    <hr />
    <p>${remainingTileCount} tiles remaining</p>
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
    <h4>players:</h4>
    <ul>
      ${Object.values(gameState.players || {}).map(
        (player) =>
          html`
            <li>
              ${player?.name} ${player?.isHost ? "(host)" : ""}
              ${player?.name === username ? "(you)" : ""}
            </li>
          `
      )}
    </ul>
    <h4>how to play</h4>
    <p>
      announce a 1 word clue to your team that relates to the two words of your
      tile. if your team guesses your tile correctly, click "correct". If they
      guess incorrectly, click "miss".
    </p>
  `;
}

function layout(children) {
  return html`
    <a href="/">home</a>
    <h3>cross clues 🕵️</h3>
    ${children}
  `;
}

function update() {
  render(layout(ui()), document.body);
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

update();

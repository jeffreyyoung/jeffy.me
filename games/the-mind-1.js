import {
  reactive,
  html,
  watch,
} from "https://esm.sh/@arrow-js/core@1.0.0-alpha.9";
import {
  createGameServer,
  getSingletonGameServer,
} from "./utils/game-server.js";

const urlSearchParams = new URLSearchParams(
  window.location.search.split("?")?.[1] || "",
);

/**
 * @typedef Player
 * @type {{
 *  username: string,
 *  isHost: boolean,
 *  status: "ready" | "waiting" | "playing",
 *  cards: { name: number, status: "in-hand" | "played-correct" | "played-incorrect" }[],
 * }}
 */

/**
 * @typedef GameState
 * @type {{
 *  players: Record<string, Player>,
 *  level: number,
 *  history: string[],
 *  status: "before-start" | "in-level" | "level-complete",
 * }}
 */

/**
 * @typedef AppState
 * @type {{
 * username: string,
 * lobbyId: string,
 * game: GameState,
 * }}
 */

/**
 * @typedef Action
 * @type {{
 *   actor: string,
 * } & ({
 *  type: "join-game",
 * } | {
 *  type: "play-card"
 * } | {
 *  type: "ready"
 * } | {
 *  type: "kick-player",
 * player: string,
 * })}
 */

/**
 * @type {AppState}
 */
const appState = reactive({
  username: localStorage.getItem("username") || "",
  lobbyId: Object.fromEntries(urlSearchParams.entries())?.lobbyId || "",
  game: {
    players: {},
    level: 0,
    isHost: false,
    history: [],
    status: "before-start",
  },
});

watch(() => appState.username, console.log.bind(console, "username"));
const isHost =
  window.localStorage.getItem(`isHost-${appState.lobbyId}`) === "true";

/**
 *
 * @returns {ReturnType<typeof createGameServer<GameState, Action>>}
 */
let server = () =>
  getSingletonGameServer({
    isHost,
    roomId: appState.lobbyId,
    initialState: /** @type {GameState} */ ({
      players: {},
      level: 0,
      history: [],
      status: "before-start",
    }),
    onAction(state, action) {
      console.log("onAction", state, action);
      let usedNums = new Set(
        Object.values(state.players).flatMap((player) =>
          player.cards.map((card) => card.name),
        ),
      );

      function getUnusedNumber() {
        while (usedNums.size < 100) {
          let num = Math.floor(Math.random() * 100) + 1;
          if (!usedNums.has(num)) {
            return num;
          }
        }
        return null;
      }
      function getHand() {
        /** @type {Player['cards']} */
        let hand = [];
        for (let i = 0; i < state.level; i++) {
          let num = getUnusedNumber();
          if (num === null) {
            return hand;
          }
          hand.push({ name: num, status: "in-hand" });
          hand.sort((a, b) => a.name - b.name);
        }

        return hand;
      }

      if (
        action.type === "join-game" &&
        action.actor &&
        !state.players[action.actor]
      ) {
        console.log("player joined", action.actor);
        state.players[action.actor] = {
          username: action.actor,
          isHost: action.actor === appState.username && isHost,
          status: state.status === "before-start" ? "waiting" : "playing",
          cards: getHand(),
        };
        state.history.unshift(`👋 ${action.actor} joined`);
      }

      if (
        action.type === "ready" &&
        state.players[action.actor] &&
        ["before-start", "level-complete"].includes(state.status)
      ) {
        state.players[action.actor].status = "ready";
      }

      if (state.status !== "in-level") {
        if (
          Object.values(state.players).every(
            (player) => player.status === "ready",
          )
        ) {
          state.status = "in-level";
          state.level++;
          Object.values(state.players).forEach((player) => {
            player.status = "playing";
            player.cards = getHand();
          });
        }
      }
      let allCardsInHand = Object.values(state.players)
        .flatMap((player) => player.cards)
        .filter((card) => card.status === "in-hand")
        .sort((a, b) => a.name - b.name);
      if (
        action.type === "play-card" &&
        state.status === "in-level" &&
        state.players[action.actor]
      ) {
        let player = state.players[action.actor];

        let card = player.cards.find((card) => card.status === "in-hand");
        if (!card) {
          return state;
        }
        let isCorrect = card.name === allCardsInHand[0].name;
        card.status = isCorrect ? "played-correct" : "played-incorrect";
        state.history.unshift(
          `${isCorrect ? "✅" : "❌"} ${action.actor} played ${card.name}`,
        );
        if (allCardsInHand.length <= 1) {
          state.status = "level-complete";
          state.history.unshift(`🎉 level ${state.level} complete`);
          Object.values(state.players).forEach((player) => {
            player.status = "waiting";
          });
        }
      }
      console.log("action", action);
      console.log("state", state);
      return state;
    },
    onStateChange(state) {
      console.log("state changed", state);
      appState.game = state;
    },
  });

watch(
  () => appState.username && appState.lobbyId,
  (lobbyId) => {
    console.log("sending join-game", appState.username, appState.lobbyId);
    if (appState.lobbyId && appState.username) {
      server().send({
        type: "join-game",
        actor: appState.username,
      });
    }
  },
);

function App() {
  return html`
    <a href="/">home</a>
    <h4>the mind 🧠</h4>
    ${() => !appState.username && UserNameForm().key("user-form")}
    ${() =>
      appState.username && !appState.lobbyId && LobbyIdForm().key("lobby-form")}
    ${() => appState.username && appState.lobbyId && Game().key("game")}
  `;
}

App()(document.getElementById("app"));

function UserNameForm() {
  return html`
    <form
      @submit="${
        // @ts-ignore
        (e) => {
          e.preventDefault();
          let form = new FormData(e.target);
          let username = form.get("username");
          if (typeof username !== "string") {
            return;
          }
          username = username.trim();
          if (!username) {
            return;
          }

          localStorage.setItem("username", username);
          appState.username = username;
        }
      }"
    >
      <label for="username">What is your name?</label>
      <br />
      <input type="text" name="username" />
      <button type="submit">join</button>
    </form>
  `;
}

function LobbyIdForm() {
  return html`
    <p>create new game</p>
    <button
      @click="${() => {
        let lobbyId = Math.random()
          .toString(36)
          .substring(4, 8)
          .toLocaleUpperCase();
        window.localStorage.setItem(`isHost-${lobbyId}`, "true");
        window.location.href =
          window.location.href.split("?")[0] + "?lobbyId=" + lobbyId;
      }}"
    >
      create
    </button>
    <hr />
    <p>join existing game</p>
    <form
      @submit="${
        // @ts-ignore
        (e) => {
          e.preventDefault();
          let form = new FormData(e.target);
          let lobbyId = form.get("lobbyId");
          if (typeof lobbyId !== "string") {
            return;
          }
          lobbyId = lobbyId.trim();
          if (!lobbyId) {
            return;
          }
          window.location.href =
            window.location.href.split("?")[0] + "?lobbyId=" + lobbyId;
        }
      }"
    >
      <input type="text" name="lobbyId" placeholder="game code" />
      <button type="submit">join</button>
    </form>
    <hr />
  `;
}

let inviteLinkTimeoutId = 0;
function InviteLink() {
  return html`
    <div>
      <button
        @click="${(e) => {
          clearTimeout(inviteLinkTimeoutId);
          // copy to clipboard
          navigator.clipboard.writeText(window.location.href);
          e.target.innerText = "copied!";
          inviteLinkTimeoutId = setTimeout(() => {
            e.target.innerText = "copy invite link";
          }, 1000);
        }}"
      >
        copy invite link
      </button>
      <br />
      <small>game code ${() => appState.lobbyId}</small>
    </div>
  `;
}

function Game() {
  return html`
    <div>
      ${() => InviteLink()} ${() => PlayersSection()}
      ${() =>
        ["before-start", "level-complete"].includes(appState.game.status) &&
        ReadySection()}
      ${() => appState.game.status === "in-level" && CardsSection()}
      <h4>actions</h4>
      <ul>
        ${() =>
          appState.game.history.map((action, i) => html`<li>${action}</li>`)}
      </ul>
    </div>
  `;
}

function ReadySection() {
  const notReadyPlayers = Object.values(appState.game.players).filter(
    (player) => player.status !== "ready",
  );
  const me = () => appState.game.players[appState.username];
  return html` <div>
    <h4>ready for level ${() => appState.game.level + 1}?</h4>
    ${() =>
      me()?.status === "ready"
        ? html`
            <p>
              waiting for
              ${notReadyPlayers.map((player) => player.username).join(", ")}
            </p>
          `
        : html`
            <button
              @click="${() => {
                server().send({
                  type: "ready",
                  actor: appState.username,
                });
              }}"
            >
              ready
            </button>
          `}
  </div>`;
}

function CardsSection() {
  let cards = () => appState.game.players[appState.username].cards;
  let lastAction = () => appState.game.history[0];
  let playableCard = cards().find((card) => card.status === "in-hand");
  return html`
    <div>
      <section style="position: sticky; top: 0; background-color: white;">
        <h4>
          level ${() => appState.game.level}
          ${lastAction() ? ` - ${lastAction()}` : ""}
        </h4>
      </section>
      <h4>your cards</h4>
      <div style="display: flex; flex-direction: row; flex-wrap: wrap;">
        ${() =>
          appState.game.players[appState.username].cards.map((card) =>
            Card(card, card === playableCard),
          )}
      </div>
    </div>
  `;
}

/**
 *
 * @param {Player['cards'][number]} card
 * @param {boolean} playable
 */
function Card(card, playable) {
  const statusToEmoji = {
    "in-hand": "⬜️",
    "played-correct": "✅",
    "played-incorrect": "❌",
  };
  const body = html`
    <p>${card.name}</p>
    <p>${playable ? "play" : statusToEmoji[card.status]}</p>
  `.key(card.name);
  if (playable) {
    return html`
      <button
        class="card"
        @click="${() => {
          server().send({
            type: "play-card",
            actor: appState.username,
          });
        }}"
      >
        ${body}
      </button>
    `.key(card.name);
  }
  return html` <div class="card">${body}</div> `;
}

function PlayersSection() {
  return html`
    <h4>players</h4>
    <ul>
      ${() =>
        Object.values(appState.game.players).map((player) =>
          html`
            <li class="fadeInUp-animation">
              ${player.username}
              ${player.username === appState.username ? " (you)" : ""}
              ${player.isHost ? " (host)" : ""}
              ${() =>
                player.cards.length > 0
                  ? player.cards
                      .map(
                        (card) =>
                          ({
                            "played-correct": "✅",
                            "played-incorrect": "❌",
                            "in-hand": "⬜️",
                          })[card.status],
                      )
                      .join("")
                  : ""}
              ${() => (player.status === "waiting" ? " (not ready)" : "")}
              ${() => (player.status === "ready" ? " (ready)" : "")}
            </li>
          `.key(player.username),
        )}
    </ul>
  `;
}

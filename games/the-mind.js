import van from "../deps/van.js";
import { server as getServer } from "./the-mind-game-server.js";
import {
  username,
  lobbyId,
  isHost,
  LobbySelection,
  SetUserName,
} from "./utils/pre-game.js";
const {
  form,
  ul,
  li,
  p,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  div,
  span,
  summary,
  details,
  small,
  input,
  button,
} = van.tags;

// generics
// https://github.com/microsoft/TypeScript/issues/27387#issuecomment-659671940
/**
 * @typedef {import('./the-mind-game-server.js').GameState} GameState
 */


let actor = username.val;
van.derive(() => {
  actor = username.val;
});

const mostRecentCard = van.state(
  /** @type {GameState['mostRecentCard']} */
  (null)
);

const cardIndicator = van.derive(() => {
  if (mostRecentCard.val === null) {
    return {
      color: "black",
      text: "nothing played",
      name: 0,
    };
  }
  return {
    color: mostRecentCard.val.status === "played-correct" ? "green" : "red",
    text: mostRecentCard.val.playerName,
    name: mostRecentCard.val.name,
  };
});

const gameState = van.state(
  /** @type {GameState} */
  ({
    history: [],
    level: 0,
    players: {},
    status: "before-start",
  })
);

const mistakeCount = van.state(0);

const gameStatus = van.state(
  /** @type {GameState['status']} */
  ("before-start")
);

let server = van.derive(() => {
  if (!lobbyId.val) {
    return null;
  }
  if (!username.val) {
    return null;
  }
  const _server = getServer({
    isHost: isHost.val,
    lobbyId: lobbyId.val,
    onStateChange(state) {
      mistakeCount.val = state.mistakeCount;
      if (state.status !== gameStatus.val) {
        gameStatus.val = state.status;
      }
      if (state.status !== "in-level") {
        mostRecentCard.val = null;
      } else {
        mostRecentCard.val = state.mostRecentCard || null;
      }
      gameState.val = { ...state };
    },
    actor,
  });
  _server.send({
    type: "join-game",
    actor: username.val,
  });
  return _server;
});

const iAmReady = van.derive(() => {
  return gameState.val.players[actor]?.status === "waiting";
});

const waitingOnText = van.derive(() => {
  return (
    "Waiting on " +
    Object.values(gameState.val.players)
      .filter((p) => p.status === "waiting")
      .map((p) => (p.username === actor ? "you" : p.username))
      .join(", ")
  );
});

function App() {
  let allSetup = van.derive(() => {
    return lobbyId.val && username.val;
  });

  return div(
    () => (username.val && !lobbyId.val ? LobbySelection() : span()),
    () => (!username.val ? SetUserName() : span()),
    () => (allSetup.val && gameStatus.val === "in-level" ? Game() : span()),
    () =>
      allSetup.val && gameStatus.val === "before-start" ? Waiting() : span(),
    () =>
      allSetup.val && gameStatus.val === "level-complete"
        ? LevelComplete()
        : span(),
    () => (allSetup.val ? PlayerList() : span())
  );
}

function PlayerList() {
  const players = van.derive(() => {
    let res = Object.values(gameState.val.players);
    return res.map((p) => {
      return [
        p.username,
        p.username === actor ? " (you)" : null,
        p.isHost ? " (host)" : null,
        " ",
        p.cards.map((c) => statusToEmoji[c.status]).join(""),
      ]
        .filter((s) => s !== null)
        .join("");
    });
  });
  return div(
    h4("players"),
    () =>
      ul(
        ...players.val.map((p) => {
          return li(p);
        })
      ),
    p(small(mistakeCount, " mistakes so far"))
  );
}

function Waiting() {
  return MainLayout(
    h1({ style: "text-align: center", class: "fadeInUp-animation" }, "Welcome"),
    p(waitingOnText),
    () =>
      iAmReady.val
        ? button(
            { onclick: () => server.val?.send({ actor, type: "ready" }) },
            "ready"
          )
        : p()
  );
}

function LevelComplete() {
  const level = van.derive(() => {
    return gameState.val.level;
  });
  return MainLayout(
    h1(
      { style: "text-align: center", class: "fadeInUp-animation" },
      level,
      " complete!"
    ),
    p(waitingOnText),
    () =>
      iAmReady.val
        ? button(
            { onclick: () => server.val?.send({ actor, type: "ready" }) },
            "ready"
          )
        : p()
  );
}

function MainLayout(middle, bottom, button) {
  return div(
    div(
      {
        style:
          "display: flex; min-height: 50vh; display: flex; flex-direction: column; align-items: center; justify-content: space-between",
      },
      div(),
      middle,
      bottom
    ),
    div(
      {
        style:
          "margin: 15 0; display: flex; flex-direction: column; align-items: space-between; justify-content: center",
      },
      button
    )
  );
}

function Game() {
  const myCards = van.derive(() => {
    let me = gameState.val.players[actor];
    if (!me) {
      return [];
    }
    return me.cards.concat([]);
  });

  const nextNumber = van.derive(() => {
    return myCards.val.find((card) => card.status === "in-hand")?.name;
  });

  return MainLayout(
    () =>
      cardIndicator.val !== null
        ? div(
            {
              class: "fadeInUp-animation",
            },
            h1(
              { style: "text-align: center; margin-bottom: 0;" },
              cardIndicator.val.name
            ),
            h6(
              {
                style: `text-align: center; margin-top: 0; margin-bottom: 12px; color: ${cardIndicator.val.color}`,
              },
              cardIndicator.val.text
            )
          )
        : span(),
    div(
      h6(
        { style: "text-align: center; margin: 0; margin-top: 15px;" },
        "your cards"
      ),
      p(
        { style: "text-align: center; margin-top: 0" },
        ...myCards.val
          .map((c) => `${c.name}(${statusToEmoji[c.status]})`)
          .join(", ")
      )
    ),
    button(
      { onclick: () => server.val.send({ actor, type: "play-card" }) },
      "play ",
      nextNumber
    )
  );
}

van.add(document.getElementById("game"), App());
let timeoutId = 0;
van.add(document.getElementById("invite-slot"), () =>
  lobbyId.val && username.val
    ? div(
        button(
          {
            style: "padding: 3px 6px; font-size: 0.8em;",

            onclick: (e) => {
              e.preventDefault();
              navigator.clipboard.writeText(window.location.href);
              e.target.innerText = "copied!";
              clearTimeout(timeoutId);
              timeoutId = setTimeout(() => {
                e.target.innerText = "copy invite link";
              }, 1000);
            },
          },
          "copy invite link"
        ),
        h6(
          { style: "margin-top: 10px; margin-bottom: 0px; text-align: end;" },
          `lobby id: ${lobbyId.val}`
        )
      )
    : span()
);
var statusToEmoji = {
  "played-correct": "✅",
  "played-incorrect": "❌",
  "in-hand": "⬜️",
};

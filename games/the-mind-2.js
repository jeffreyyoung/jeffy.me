import van from "../deps/van.js";
import { server } from "./the-mind-game-server.js";
import { needsLobbyId, needsUserName, username, lobbyId, isHost, LobbySelection, SetUserName } from "./utils/pre-game.js";
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
    }
});

const fullState = van.state(
  /** @type {GameState} */
  ({
    history: [],
    level: 0,
    players: {},
    status: "before-start",
  })
);

const gameStatus = van.state(
  /** @type {GameState['status']} */
  ("before-start")
);

let s = van.derive(() => {
    if (!lobbyId.val) {
      return null;
    }
    if (!username.val) {
      return null;
    }
    const _server = server({
        isHost: isHost.val,
        lobbyId: lobbyId.val,
        onStateChange(state) {
          if (state.status !== gameStatus.val) {
            gameStatus.val = state.status;
          }
          if (state.status !== "in-level") {
            mostRecentCard.val = null;
          } else {
            mostRecentCard.val = state.mostRecentCard || null;
          }
          fullState.val = { ...state };
        },
        actor,
      });
    _server.send({
        type: 'join-game',
        actor: username.val,
    })
    return _server;
})

const amReady = van.derive(() => {
    return fullState.val.players[actor]?.status === 'waiting';
});

const waitingOnText = van.derive(() => {
    return 'Waiting on ' +
        Object.values(fullState.val.players).filter(p => p.status === 'waiting').map(p => p.username === actor ? 'you' : p.username).join(', ');
})

function App() {
    let allSetup = van.derive(() => {
        return lobbyId.val && username.val;
    })

  return div(
    () => (username.val && !lobbyId.val ? LobbySelection() : span()),
    () => (!username.val ? SetUserName() : span()),
    () => (allSetup.val && gameStatus.val === "in-level" ? Game() : span()),
    () => (allSetup.val && gameStatus.val === "before-start" ? Waiting() : span()),
    () => (allSetup.val && gameStatus.val === "level-complete" ? LevelComplete() : span()),
    () => allSetup.val ? PlayerState() : span(),
    () => (allSetup.val) ? div(
        { style: 'margin-top: 30px;'},
        button({ onclick: () => ''}, 'copy invite link'),
        h6({ style: 'margin-top: 15px;'}, `lobby id: ${lobbyId.val}`),
    ) : span(),
  );
}

function PlayerState() {
  const players = van.derive(() => {
    let res = Object.values(fullState.val.players);
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
  return div(h4("players"), () =>
    ul(
      ...players.val.map((p) => {
        return li(p);
      })
    )
  );
}

function Waiting() {
  return MainLayout(
    h1({ style: "text-align: center", class: "fadeInUp-animation" }, "Welcome"),
    p(waitingOnText),
    () => amReady.val ? button({ onclick: () => s.val?.send({ actor, type: "ready" }) }, "ready") : p()
  );
}

function LevelComplete() {
  const level = van.derive(() => {
    return fullState.val.level;
  });
  return MainLayout(
    h1(
      { style: "text-align: center", class: "fadeInUp-animation" },
      level,
      " complete!"
    ),
    p(waitingOnText),
    () => amReady.val ? button({ onclick: () => s.val?.send({ actor, type: "ready" }) }, "ready") : p()
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
    let me = fullState.val.players[actor];
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
      { onclick: () => s.val.send({ actor, type: "play-card" }) },
      "play ",
      nextNumber
    )
  );
}

van.add(document.getElementById("game"), App());
var statusToEmoji = {
  "played-correct": "✅",
  "played-incorrect": "❌",
  "in-hand": "⬜️",
};

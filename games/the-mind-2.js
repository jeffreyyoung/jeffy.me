import van from "../deps/van.js";
import { server } from "./the-mind-game-server.js";
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

const lobbyId = van.state("123");
const actor = van.state("456").val;

const defaultHighestNumber = {
  number: 0,
  color: "black",
  text: "nothing played",
};
const highestNumber = van.state(defaultHighestNumber);

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

let s = server({
  isHost: true,
  lobbyId: "123",
  onStateChange(state) {
    if (state.status !== gameStatus.val) {
      gameStatus.val = state.status;
    }
    if (state.status !== "in-level") {
      highestNumber.val = defaultHighestNumber;
    } else {
      let allCards = Object.values(state.players).flatMap((player) =>
        player.cards
          .filter((c) => c.status !== "in-hand")
          .map((c) => ({ ...c, playerName: player.username }))
      );

      allCards = allCards.sort((a, b) => a.name - b.name);
      if (allCards.at(-1)) {
        const c = allCards.at(-1);
        highestNumber.val = {
          text: `${c.playerName}`,
          number: c.name,
          color: c.status === "played-correct" ? "green" : "red",
        };
      } else {
        highestNumber.val = defaultHighestNumber;
      }
    }
    fullState.val = { ...state };
  },
  actor,
});

s.send({
  type: "join-game",
  actor,
});

function App() {
  return div(
    () => (gameStatus.val === "in-level" ? Game() : span()),
    () => (gameStatus.val === "before-start" ? Waiting() : span()),
    () => (gameStatus.val === "level-complete" ? LevelComplete() : span()),
    PlayerState()
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
    div(),
    button({ onclick: () => s.send({ actor, type: "ready" }) }, "ready")
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
    div(),
    button(
      { onclick: () => s.send({ actor, type: "ready" }) },
      "ready for next level"
    )
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
      highestNumber.val !== null
        ? div(
            {
              class: "fadeInUp-animation",
            },
            h1(
              { style: "text-align: center; margin-bottom: 0;" },
              highestNumber.val.number
            ),
            h6(
              {
                style: `text-align: center; margin-top: 0; margin-bottom: 12px; color: ${highestNumber.val.color}`,
              },
              highestNumber.val.text
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
      { onclick: () => s.send({ actor, type: "play-card" }) },
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

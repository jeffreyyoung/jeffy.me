import { Game } from "./utils/p2p/Game.js";

/**
 * @param {number} start
 * @param {number} end
 * @returns {number[]}
 * */
function range(start, end) {
  let nums = [];
  for (let i = start; i < end; i++) {
    nums.push(i);
  }
  return nums;
}

/**
 * @typedef Player
 * @type {{
 *  id: string,
 *  name: string,
 *  isHost: boolean,
 *  status: "ready" | "waiting" | "playing",
 *  cards: { name: number, status: "in-hand" | "played-correct" | "played-incorrect" }[],
 * }}
 */

/**
 * @typedef GameState
 * @type {{
 *  version: string,
 *  players: Record<string, Player>,
 *  level: number,
 *  history: string[],
 *  status: "before-start" | "in-level" | "level-complete",
 *  mistakeCount: number,
 *  mostRecentCard: { playerName: string, name: number, status: "played-correct" | "played-incorrect" } | null,
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

const createDeck = (deck = range(1, 100)) => {
  const allCards = range(1, 100);

  return {
    drawCard: () => {
      const index = Math.floor(Math.random() * allCards.length);
      const card = allCards[index];
      allCards.splice(index, 1);
      return card;
    },
    hasMoreCards: () => {
      return allCards.length > 0;
    },
  };
};

/**
 * @typedef ActionMap
 * @type {{
 *   "play-card": {},
 *   "ready": {},
 * }}
 */

export const game = new Game(
  /** @type {GameState} */
  ({
    version: "0",
    players: {},
    level: 0,
    history: [],
    mistakeCount: 0,
    mostRecentCard: null,
    status: "before-start",
  }),
  /** @type {ActionMap} */
  ({}),
  {
    actions: {
      syncUsers: (state, payload, actor, { room }) => {
        for (let user of room.users) {
          if (!state.players[user.id]) {
            state.players[user.id] = {
              id: user.id,
              name: user.name,
              isHost: user.isHost,
              status: "waiting",
              cards: [],
            };

            if (state.status === "in-level") {
              state.players[user.id].status = "playing";
              let dealer = createDeck(
                Object.values(state.players)
                  .flatMap((player) => player.cards)
                  .map((card) => card.name)
              );
              for (let i = 0; i < state.level; i++) {
                if (!dealer.hasMoreCards()) {
                  break;
                }
                state.players[user.id].cards.push({
                  name: dealer.drawCard(),
                  status: "in-hand",
                });
              }
            }
            state.history.unshift(`👋 ${user.name} joined`);
          }
        }
        return state;
      },
      ready: (state, _, actor) => {
        if (!state.players[actor]) {
          return state;
        }

        state.players[actor].status = "ready";

        if (
          Object.values(state.players).every(
            (player) => player.status === "ready"
          )
        ) {
          const dealer = createDeck();
          state.status = "in-level";
          state.level++;
          Object.values(state.players).forEach((player) => {
            player.status = "playing";
            player.cards = [];
            for (let i = 0; i < state.level; i++) {
              if (!dealer.hasMoreCards()) {
                break;
              }
              player.cards.push({
                name: dealer.drawCard(),
                status: "in-hand",
              });
            }
            player.cards.sort((a, b) => a.name - b.name);
          });
        }
        return state;
      },
      "play-card": (state, _, actor) => {
        if (state.status !== "in-level" || !state.players[actor]) {
          return state;
        }
        let player = state.players[actor];
        let card = player.cards.find((card) => card.status === "in-hand");
        if (!card) {
          return state;
        }
        let allCardsInHand = Object.values(state.players)
          .flatMap((player) => player.cards)
          .filter((card) => card.status === "in-hand")
          .sort((a, b) => a.name - b.name);
        let isCorrect = card.name <= allCardsInHand[0].name;

        card.status = isCorrect ? "played-correct" : "played-incorrect";
        state.history.unshift(
          `${isCorrect ? "✅" : "❌"} ${actor} played ${card.name}`
        );
        if (!isCorrect) {
          state.mistakeCount++;
        }

        if (allCardsInHand.length <= 1) {
          state.status = "level-complete";
          state.history.unshift(`🎉 level ${state.level} complete`);
          Object.values(state.players).forEach((player) => {
            player.status = "waiting";
          });
          state.mostRecentCard = null;
        } else {
          state.mostRecentCard = {
            playerName: player.name,
            name: card.name,
            status: card.status,
          };
        }
        return state;
      },
    },
  }
);

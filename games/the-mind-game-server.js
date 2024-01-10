import { P2pState } from "./utils/p2p-state.js";
import { singleton } from "./utils/singleton.js";
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
    }
  }
}

/**
 * @typedef ActionMap
 * @type {{
 *   "join": {},
 *   "play-card": {},
 *   "ready": {},
 * }}
 */

export let server = ({ isHost, lobbyId, actor, onStateChange }) =>
  singleton(
    "the-mind",
    () =>
      new P2pState(
        /** @type {ActionMap} */
        ({}),
        /** @type {GameState} */
        ({
          players: {},
          level: 0,
          history: [],
          mistakeCount: 0,
          mostRecentCard: null,
          status: "before-start",
        }),
        {
          isHost,
          roomId: lobbyId,
          actorUsername: actor,
          onStateChange,
          actions: {
            join: (state, _, actor) => {
              if (state.players[actor]) {
                return state;
              }
              state.players[actor] = {
                username: actor,
                isHost: actor === actor && isHost,
                status: state.status === "in-level" ? "playing" : "waiting",
                cards: [],
              };
              if (state.status === 'in-level') {
                let dealer = createDeck(
                  Object.values(state.players).flatMap((player) => player.cards).map((card) => card.name)
                );
                for (let i = 0; i < state.level; i++) {
                  if (!dealer.hasMoreCards()) {
                    break;
                  }
                  state.players[actor].cards.push({
                    name: dealer.drawCard(),
                    status: "in-hand",
                  });
                }
              }
              state.history.unshift(`👋 ${actor} joined`);
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
                  playerName: actor,
                  name: card.name,
                  status: card.status,
                };
              }
              return state;
            },
          },
        }
      )
  );

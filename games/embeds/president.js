import { Game } from "../utils/p2p/Game";

/**
 * @typedef {1|2|3|4|5|6|7|8|9|10|11|12|13} CardValue
 * @typedef {"spades"|"hearts"|"clubs"|"diamonds"} CardSuite
 * @typedef {`${CardSuite}${CardValue}`} CardKey
 * @typedef {"deck" | "discard" | "removed" | `player-${string}`} Pile
 * @typedef {{ key: CardKey, value: CardValue, suite: CardSuite, pile: Pile }} Card
 * @typedef {{ id: string, name: string, emoji: string, bid: number }} Player
 *
 * @typedef {{ pass: {}, bid: { bid: number }, play: { cardKey: CardKey } }} ActionMap
 * @typedef {{
 *      version: string,
 *      players: Player[],
 *      cards: Record<CardKey, Card>,
 *      piles: Record<Pile, CardKey[]>,
 *      turn: "",
 *      phase: "pre-game" | "bid" | "play"
 * }} GameState
 */

function genCards() {
  /** @type {Record<CardKey, Card>} */
  // @ts-expect-error
  const cards = {};
  for (let value of range(1, 13)) {
    const suites = ["spades", "hearts", "clubs", "diamonds"];
    for (let suite of ["spades", "hearts", "clubs", "diamonds"]) {
      const key = `${value}${suite}`;
      cards[key] = { key, value, suite, pile: "deck" };
    }
  }
  return cards;
}

/** @type {GameState} */
const initialState = {
  version: "",
  players: [],
  cards: genCards(),
  piles: {
    // @ts-expect-error
    deck: Object.keys(genCards()),
    discard: [],
    removed: [],
  },
  turn: "",
  phase: "bid",
};

const game = new Game(initialState, /** @type {ActionMap} */ ({}), {
  actions: {
    pass: (state) => {
        return state;
    },
    play: (state) => { return state },
    syncUsers: (state, { room }) => {
      for (const user of room.users) {
        if (!state.players.find((p) => p.id === user.id)) {
          state.players.push({
            id: user.id,
            name: user.name,
            emoji: user.emoji,
            bid: 0,
          });
        }
      }
      return state;
    },
    bid: (state, { bid }, actor) => {
      if (state.phase !== "bid") {
        return state;
      }
      const player = state.players.find((p) => p.id === actor);
      if (!player) {
        return state;
      }

      player.bid = bid;
      return state;
    },

  },
});

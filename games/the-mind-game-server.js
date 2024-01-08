import {
  createGameServer,
  getSingletonGameServer,
} from "./utils/game-server.js";

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
 * @param {{
 *  isHost: boolean,
 *  lobbyId: string,
 *  actor: string,
 *  onStateChange: (state: GameState) => void
 * }} args
 * @returns {ReturnType<typeof createGameServer<GameState, Action>>}
 */
export let server = ({ isHost, lobbyId, actor, onStateChange }) =>
  getSingletonGameServer({
    isHost,
    roomId: lobbyId,
    initialState: /** @type {GameState} */ ({
      players: {},
      level: 0,
      history: [],
      mistakeCount: 0,
      mostRecentCard: null,
      status: "before-start",
    }),
    onAction(state, action) {
      let usedNums = new Set(
        Object.values(state.players).flatMap((player) =>
          player.cards.map((card) => card.name)
        )
      );

      function getUnusedNumber() {
        while (usedNums.size < 100) {
          let num = Math.floor(Math.random() * 100) + 1;
          if (!usedNums.has(num)) {
            usedNums.add(num);
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
        state.players[action.actor] = {
          username: action.actor,
          isHost: action.actor === actor && isHost,
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
            (player) => player.status === "ready"
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
          `${isCorrect ? "✅" : "❌"} ${action.actor} played ${card.name}`
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
                playerName: action.actor,
                name: card.name,
                status: card.status,
            };
        }
      }
      return state;
    },
    onStateChange(state) {
        onStateChange(state);
    },
  });

import { games } from "../game-index.js";
import { getQueryParam } from "../utils/random.js";

const game = getQueryParam("game");
if (games.find((g) => g.url === game) || game.startsWith("/games/")) {
  import(game);
}

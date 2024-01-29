import { games } from "../game-index";
import { getQueryParam } from "../utils/random";

const game = getQueryParam("game");

if (games.find((g) => g.url === game)) {
  import(game);
}

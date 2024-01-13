import van from "../deps/van.js";
import { reactive, stateFields } from "../deps/van-x.js";
import { InviteSlot } from "./utils/pre-game.js";
import { div } from "./utils/tags.js";

van.add(document.getElementById('invite-slot'), InviteSlot());

let state = reactive({
    thing: 1,
})

/**
 * 
 * @typedef {{
 *   value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14,
 *   suit: 'spade' | 'heart' | 'diamond' | 'club',
 * }} Card
 * 
 * @typedef {{
 *    x: number,
 *    y: number,
 *    stackId: string,
 * } & Card} CardWithLocation
 * 
 * 
 * @typedef {{
 *   players: {
 *     name: string,
 *     isHost: boolean,
 *   }[],
 *   stacks: {
 *     id: number,
 *   }[]
 *   cards: CardWithLocation[],
 * }} State
 */

setInterval(() => {
    console.log('increment')
    state.thing++;
}, 1000)
stateFields(state).thing;

van.add(document.getElementById('game-slot'), div(() => state.thing));
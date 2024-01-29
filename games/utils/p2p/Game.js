import { State } from "./State.js";

/**
 *
 * @template ActionMap
 * @template {keyof ActionMap} Key
 * @typedef {{
 *    actor: string,
 *    kind: 'action',
 *    type: Key,
 *    payload: ActionMap[Key]
 * }} ActionObject
 *
 * @typedef {import('./Room-types.js').RoomActionMap} HostActionMap
 */

/**
 * @template ActionMap
 * @template {{ version: string }} State
 * @typedef {{
 *    actions: {
 *      [K in keyof ActionMap]: (state: State, payload: ActionMap[K] & { room: RoomState }, actor: string) => State
 *    },
 * }} StateLogicArgs
 */

/**
 * @typedef {import('./Room-types.js').RoomState} RoomState
 */

/**
 * @template {{ version: string }} StateShape
 * @template {{
 *   'init': { }
 *   'user-joined': { userId: string },
 *   'user-left': { userId: string },
 *   'user-updated': { userId: string },
 * }} ActionMap
 */
class Game {
  /** @type {State<import("./Room-types.js").AddRoom<ActionMap>, StateShape>} */
  gameLogic;

  /** @type {RoomState} */
  room;

  /**
   * @param {StateShape} initialState
   * @param {ActionMap} actionMap
   * @param {StateLogicArgs<ActionMap, StateShape> & { gameName: string, userId: string, isHost: boolean }} logicArgs
   */
  constructor(initialState, actionMap, logicArgs) {
    this.gameName = logicArgs.gameName;
    this.isHost = logicArgs.isHost;
    this.gameName = logicArgs.gameName;
    this.userId = logicArgs.userId;
    // @ts-ignore
    this.gameLogic = new State(actionMap, initialState, logicArgs);

    this.onStateChange = this.gameLogic.onStateChange.bind(this.gameLogic);

    // figure out user id

    // listen for messages from parent
    this.listenForMessages();
  }

  listenForMessages() {
    window.addEventListener("message", (event) => {
      if (event.data?.game === this.gameName) {
        this.handleMessage(event.data);
      }
    });
  }

  /**
   *
   * @param {import('./Room-types.js').IFrameMessageIn<ActionMap, State>} message
   */
  handleMessage(message) {
    // todo: handle room stuff
    if (message.type === "action-result") {
      // we just apply the state
      this.gameLogic.reconcileState(message.resultState);
    }

    if (message.type === "action") {
      const result = this.gameLogic.handleAction({
        ...message.action,
        payload: {
          ...message.action.payload,
          room: message.room,
        },
      });
      this.sendMessage({
        ...message,
        type: "action-result",
        resultState: result,
      });
    }
  }

  /**
   *
   * @param {import('./Room-types.js').IFrameMessageBase<ActionMap, StateShape>} message
   */
  sendMessage(message) {
    console.log("iframe message sent", message);
    window.parent.postMessage(message, "*");
  }

  /**
   * @param {keyof ActionMap} type
   * @param {ActionMap[keyof ActionMap]} payload
   */
  action(type, payload) {
    this.sendMessage({
      gameName: this.gameName,
      action: {
        kind: "action",
        type: type,
        actor: this.userId,
        payload: payload,
      },
      kind: "iframe-message",
      type: "action",
    });
  }
}

const myGame = new Game(
  { version: "", food: 0, wood: 0, stone: 0, iron: 0, gold: 0 },
  {
    init: {},
    "user-joined": { userId: "" },
    "user-left": { userId: "" },
    "user-updated": { userId: "" },
    update: { resource: "", amount: 0 },
  },
  {
    gameName: "resource-game",
    userId: "123",
    isHost: true,
    actions: {
      init: (state, payload, actor, extra) => {
        return state;
      },
      "user-joined": (state, payload, actor, extra) => {
        return state;
      },
      "user-left": (state, payload, actor, extra) => {
        return state;
      },
      "user-updated": (state, payload, actor, extra) => {
        return state;
      },
      update: (state, payload, actor, extra) => {
        state[payload.resource] += payload.amount;
        return state;
      },
    },
  }
);

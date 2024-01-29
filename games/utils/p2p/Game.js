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
 * @template CustomActions
 * @template {CustomActions & import('./Room-types.js').GameCommonActionMap} ActionMap
 */
export class Game {
  /** @type {State<import("./Room-types.js").AddRoom<ActionMap>, StateShape>} */
  gameLogic;

  /** @type {RoomState} */
  room;

  userId = "";

  /**
   * @param {StateShape} initialState
   * @param {CustomActions} customActions
   * @param {StateLogicArgs<ActionMap, StateShape>} logicArgs
   */
  constructor(initialState, customActions, logicArgs) {
    this.gameName = window.location.pathname;
    // @ts-ignore
    this.gameLogic = new State(
      /** @type {ActionMap} */ ({}),
      initialState,
      logicArgs
    );

    this.onStateChange = this.gameLogic.onStateChange.bind(this.gameLogic);

    // listen for messages from parent
    this.listenForMessages();

    // if we're not in an iframe, redirect to the player
    if (window.location === window.parent.location) {
        window.location.href = `/games/party.html?game=${encodeURIComponent(window.location.pathname)}`
    }

    this.action('syncUsers', {
        isFirstSync: true,
    });
  }

  listenForMessages() {
    window.addEventListener("message", (event) => {
        console.log("iframe message received", event.data);
      if (event.data?.gameName === this.gameName) {
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
      this.gameLogic.reconcileState(
        // @ts-expect-error
        message.resultState,
        message.action
    );
    }

    if (message.type === "action") {
      this.userId = message.viewerUserId;
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
   * @template {keyof ActionMap} ActionType
   * @param {ActionType} type
   * @param {ActionMap[ActionType]} payload
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

console.log("game loaded");
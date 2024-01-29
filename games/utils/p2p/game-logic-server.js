import { recursiveAssign } from "../recursiveAssign.js";
import { EventEmitter } from "./event-emitter.js";

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
 * @typedef {{
 *     'init': { }
 *     'user-joined': { userId: string },
 *     'user-left': { userId: string },
 *     'user-updated': { userId: string },
 * }} HostActionMap
 */

/**
 * @template ActionMap
 * @template {{ version: string }} State
 * @template ExtraMeta
 * @typedef {{
 *    actions: {
 *      [K in keyof ActionMap]: (state: State, payload: ActionMap[K], actor: string, extra: ExtraMeta) => State
 *    },
 * }} StateLogicArgs
 */

/**
 * @template ActionMap
 * @template {{ version: string }} State
 * @template ExtraMeta
 */
export class StateLogic {
  /** @type {EventEmitter<{ "change:state": State }>} */
  emitter = new EventEmitter();

  /** @type {State} */
  state;

  /** @type {StateLogicArgs<ActionMap, State, ExtraMeta>} */
  args;

  /** @type {ExtraMeta} */
  extraMeta;

  isHost = false;

  /**
   * @param {ActionMap} actionMap
   * @param {State} initialState
   * @param {ExtraMeta} extraMeta
   * @param {StateLogicArgs<ActionMap, State, ExtraMeta>} args
   */
  constructor(actionMap, initialState, extraMeta, args) {
    this.state = initialState;
    this.args = args;
  }

  /**
   * @param {State} val
   * */
  setState(val) {
    this.state = val;
    this.emitter.emit("change:state", val);
  }

  /**
   *
   * @param {(arg: State) => void} cb
   */
  onStateChange(cb) {
    return this.emitter.on("change:state", cb);
  }

  /**
   * @param {ActionObject<ActionMap, keyof ActionMap>} action;
   */
  produceNextState(action, version = Math.floor(Math.random() * 100000) + "") {
    let newState = this.args.actions[action.type]?.(
      this.state,
      action.payload,
      action.actor,
      this.extraMeta
    );
    newState.version = version;

    return newState;
  }

  /**
   *
   * @template {keyof ActionMap} ActionType
   * @param {ActionType} actionType
   * @param {ActionMap[ActionType]} params
   * @param {string} userId
   * @returns {ActionObject<ActionMap, ActionType>}
   */
  createAction(actionType, params, userId) {
    return {
      kind: "action",
      type: actionType,
      payload: params,
      actor: userId,
    };
  }

  /**
   * @param {ActionObject<ActionMap, keyof ActionMap>} action
   */
  handleAction(action) {
    let resultState = this.produceNextState(action);
    this.setState(resultState);
    return resultState;
  }

  reconcileState(resultState) {
    recursiveAssign(this.state, resultState);
    return resultState;
  }
}

/**
 * @template State
 * @template ActionMap
 * @template RoomState
 * @typedef {{ room?: RoomState } & ({
 *   game: string, kind: 'new-state', state: State } |
 * { game: string, kind: 'init', userId: string, state: State | null } |
 * { game: string, kind: 'action', action: ActionObject<ActionMap, keyof ActionMap>, resultState: State })
 * } NetworkMessage
 */

/**
 * @typedef {{
 *   version: string,
 *   users: User[],
 *   game: string,
 * }} RoomState
 */

/**
 * @template {{ version: string }} State
 * @template {{
 *   'init': { }
 *   'user-joined': { userId: string },
 *   'user-left': { userId: string },
 *   'user-updated': { userId: string },
 * }} ActionMap
 */
class Game {
  /**
   * @param {State} initialState
   * @param {ActionMap} actionMap
   * @param {StateLogicArgs<ActionMap, State, RoomState> & { gameName: string, userId: string, isHost: boolean }} logicArgs
   */
  constructor(initialState, actionMap, logicArgs) {
    this.gameName = logicArgs.gameName;
    this.isHost = logicArgs.isHost;
    this.gameName = logicArgs.gameName;
    this.userId = logicArgs.userId;
    this.gameLogic = new StateLogic(
      actionMap,
      initialState,
      {
        version: '',
        users: [],
        game: this.gameName,
      },
      logicArgs
    );

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
   * @param {NetworkMessage<State, ActionMap, RoomState>} message
   */
  handleMessage(message) {
    console.log("iframe message recieved", message);

    if (message.room) {
      this.gameLogic.extraMeta = message.room;
    }
    if (message.kind === "init") {
      this.userId = message.userId;
      this.userId = message.userId;
      if (message.state) {
        this.gameLogic.setState(message.state);
      } else {
        this.gameLogic.handleAction(
          this.gameLogic.createAction("init", {}, this.userId)
        );
      }
    } else if (message.kind === "action") {
      // only the host receives actions
      let result = this.gameLogic.handleAction(message.action);
      this.sendMessage({
        game: this.gameName,
        kind: "new-state",
        state: result,
      });
      this.gameLogic.reconcileState(message.resultState);
    } else if (message.kind === "new-state") {
      // only non-hosts receive new states
      this.gameLogic.reconcileState(message.state);
    }
  }

  /**
   *
   * @param {NetworkMessage<State, ActionMap, RoomState>} message
   */
  sendMessage(message) {
    console.log("iframe message sent", message);
    window.parent.postMessage(message, "*");
  }

  /**
   * @param {keyof ActionMap} kind
   * @param {ActionMap[keyof ActionMap]} payload
   */
  action(kind, payload) {
    // send action to server and do local prediction
    const action = this.gameLogic.createAction(kind, payload, this.userId);

    // handle action locally
    this.gameLogic.handleAction(action);

    if (this.isHost) {
      this.sendMessage({
        game: this.gameName,
        kind: "new-state",
        state: this.gameLogic.state,
      });
    } else {
      this.sendMessage({
        game: this.gameName,
        kind: "action",
        action: action,
        resultState: this.gameLogic.state,
      });
    }
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

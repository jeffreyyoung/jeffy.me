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
 * @typedef {{
 *    actions: {
 *      [K in keyof ActionMap]: (state: State, payload: ActionMap[K], actor: string) => State
 *    },
 * }} StateLogicArgs
 */

/**
 * @template ActionMap
 * @template {{ version: string }} State
 * @template ExtraMeta
 */
export class State {
  /** @type {EventEmitter<{ "change:state": State }>} */
  emitter = new EventEmitter();

  /** @type {State} */
  state;

  /** @type {StateLogicArgs<ActionMap, State>} */
  args;

  /**
   * @param {ActionMap} actionMap
   * @param {State} initialState
   * @param {StateLogicArgs<ActionMap, State>} args
   */
  constructor(actionMap, initialState, args) {
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
    this.setState(this.state);
    return resultState;
  }
}

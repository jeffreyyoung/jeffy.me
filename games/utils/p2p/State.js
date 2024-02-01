import { recursiveAssign } from "../recursiveAssign.js";
import { EventEmitter } from "./event-emitter.js";

/**
 *
 * @template ActionMap
 * @template {keyof ActionMap} Key
 * @template {any} Meta
 * @typedef {{
 *    actor: string,
 *    kind: 'action',
 *    type: Key,
 *    payload: ActionMap[Key]
 *    meta: Meta | null
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
 * @template Meta
 * @typedef {{
 *    actions: {
 *      [K in keyof ActionMap]: (state: State, payload: ActionMap[K], actor: string, meta: Meta, invoke: (k: keyof ActionMap, payload: ActionMap[typeof k]) => State) => State
 *    },
 * }} StateLogicArgs
 */

/**
 * @template ActionMap
 * @template {{ version: string }} Shape
 * @template Meta
 */
export class State {
  /** @type {EventEmitter<{ "change:state": [Shape, ActionObject<ActionMap, keyof ActionMap, Meta>] }>} */
  emitter = new EventEmitter();

  /** @type {Shape} */
  state;

  /** @type {StateLogicArgs<ActionMap, Shape, Meta>} */
  args;

  /**
   * @param {ActionMap} actionMap
   * @param {Shape} initialState
   * @param {StateLogicArgs<ActionMap, Shape, Meta>} args
   */
  constructor(actionMap, initialState, args) {
    this.state = initialState;
    this.args = args;
  }

  /**
   * @param {Shape} val
   * @param {ActionObject<ActionMap, keyof ActionMap, Meta>} action;
   * */
  setState(val, action) {
    this.state = val;
    this.emitter.emit("change:state", val, action);
  }

  /**
   *
   * @param {(arg: Shape) => void} cb
   */
  onStateChange(cb) {
    return this.emitter.on("change:state", cb);
  }

  /**
   * @param {ActionObject<ActionMap, keyof ActionMap, Meta>} action;
   */
  produceNextState(action, version = Math.floor(Math.random() * 100000) + "") {
    let newState = this.args.actions[action.type]?.(
      this.state,
      action.payload,
      action.actor,
      action.meta,
      (k, p) =>
        this.produceNextState(
          this.createAction(k, p, action.actor, action.meta),
          version
        )
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
   * @param {Meta} meta
   * @returns {ActionObject<ActionMap, ActionType, Meta>}
   */
  createAction(actionType, params, userId, meta) {
    return {
      kind: "action",
      type: actionType,
      payload: params,
      actor: userId,
      meta,
    };
  }

  /**
   * @param {ActionObject<ActionMap, keyof ActionMap, Meta>} action
   */
  handleAction(action) {
    let resultState = this.produceNextState(action);
    this.setState(resultState, action);
    return resultState;
  }

  /**
   * @param {Shape} resultState
   * @param {ActionObject<ActionMap, keyof ActionMap, Meta>} action
   * @returns
   */
  reconcileState(resultState, action) {
    recursiveAssign(this.state, resultState);
    this.setState(this.state, action);
    return resultState;
  }
}

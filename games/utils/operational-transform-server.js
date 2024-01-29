/**
 * @template Schema
 * @template {keyof Schema} Type
 * @template {{ type: Type, meta: Schema[Type], sender: string }} OperationBase
 * @template {OperationBase & { sentAtId: number }} SentOperation
 * @template {OperationBase & { id: number }} AppliedOperation
 * @template State
 * @template {(state: State, payload: OperationBase) => [OperationBase[], State]} Apply
 * @template {(alreadyApplied: AppliedOperation, candidateOperation: SentOperation) => SentOperation | null} Transform
 */
class Server {
  /** @type {State} */
  state;

  /** @type {AppliedOperation[]} */
  operations;

  /** @type {number} */
  lastRecievedId = -1;

  /**
   * @param {{
   *    initialState: State,
   *    apply: Apply,
   *    transform: Transform,
   *    $$schema: Schema
   * }} args
   */
  constructor(args) {}

  /**
   * @param {OperationBase} operation
   */
  send(operation) {}
}

/**
 * @typedef Schema
 * @type {{
 *   eat: {
 *      lbs: number
 *   },
 *   sleep: {
 *     hrs: number
 *   }
 * }}
 */
const s = new Server({
  /** @type Schema */
  // @ts-ignore
  $$schema,
  initialState: {
    players: {},
  },
  apply: (s, operation) => {
    return [[s], operation];
  },
  transform: (operation, candidate) => {
    return candidate;
  },
});

s.send({
  type: "eat",
  meta: { lbs: 10 },
  sender: "me",
});
s.send({
  type: "sleep",
  meta: { hrs: 10 },
  sender: "me",
});

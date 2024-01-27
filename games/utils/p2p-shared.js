/**
 * @template T
 * @template {keyof T} K
 * @typedef {{
 *    type: K,
 *    data: T[K],
 *    actorId: string,
 *    messageId: string,
 * }} Message
 */
 

/** 
 * 
 * @typedef {{
 *     'game-over': {
 *           usersByRank: { userId: string, primaryText: string }[]
 *      },
 *      'game-update': {
 *          gameState: object & { version: string },
 *          gameAction?: {
 *              type: string,
 *              data: string,
 *              gameVersionBeforeAction: string,
 *              gameVersionAfterAction: string,
 *          }
 *       },
 *      'acknowledge': { messageId: string }
 * }} ClientToHostMessageMap
 * 
 * @typedef {{
 *   'user-joined': { user: User, curUsers: User[]},
 *   'user-left': { userId: string, curUsers: User[]},
 *    'user-update': { user: User, curUsers: User[]},
 *    'acknowledge': { messageId: string, curUsers: User[]},
 *   'game-update': ClientToHostMessageMap['game-update'],
 * }} HostToClientMessageMap
 */

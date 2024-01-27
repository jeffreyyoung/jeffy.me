/**
 * @typedef {{
 *  id: string,
 *  name: string,
 *  color: string,
 *  emoji: string,
 * }} User
 */

/**
 * @typedef {{
 *   id: string,
 *   game: string,
 *   users: User[],
 *   gameState: object,
 * }} PeerState
 * 
 * @typedef {{
 * 
 * }}
 */

class Peer {

    /**
     * 
     * @param {User} user 
     */
    setMyUser(user) {}

    /**
     * 
     * @param {*} partyId 
     */
    setPartyId(partyId) {}

}
import van from "../../deps/van.js";
import { getQueryParam, setQueryParam } from "./random.js";

export const partyId = van.state(getQueryParam("party") || "");

/**
 * 
 * @returns {{name: string, id: string, color: string, emoji: string} | null}
 */
function loadUser() {
    const userStr = localStorage.getItem("user");
    try {
        const user = JSON.parse(userStr);
        if (!user.name || !user.id || !user.color || !user.emoji) {
            return null;
        }
        return user;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export const user = van.state(loadUser() || {
    name: "",
    id: "",
    color: "",
    emoji: "",
});

van.derive(() => {
    localStorage.setItem("user", JSON.stringify(user.val));
});

van.derive(() => {
    setQueryParam("party", partyId.val);
})

const getAlphaNumeric = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789".toLocaleUpperCase();
    return chars[Math.floor(Math.random() * chars.length)];
}

export const makeUserId = () => {
    return Array.from({ length: 4 }).map(getAlphaNumeric).join("");
}

export const makePartyId = (hostUserId) => {
    return hostUserId + Array.from({ length: 3 }).map(getAlphaNumeric).join("");
}

export function isHostOfParty({ userId = '', partyId = '' }) {
    return userId.length === 4 && partyId.length === 7 && partyId.startsWith(userId);
}

export const isHost = van.derive(() => {
    return isHostOfParty({ userId: user.val.id, partyId: partyId.val });
});

export const colors = [
    "red",
    "blue",
    "green",
    "purple",
    "orange",
    "yellow",
    "pink",
    "brown",
    "black",
    "gray",
    "white",
];

export const emojis = ["👻", "🤖", "👽", "👾", "🤡", "👺", "👹", "👿", "🎃", "💀"];


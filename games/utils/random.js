/**
 * 
 * @param {number} min 
 * @param {number} max 
 * @returns 
 */
export const randomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @returns {number[]}
 */
export const nUniqueRandomNumbers = (n, min, max) => {
    let set = new Set();
    while (set.size < n) {
        set.add(randomNumber(min, max));
    }
    return [...set];
}

/**
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
export const randomItem = (arr) => {
    return arr[randomNumber(0, arr.length - 1)];
}

/**
 * @template T
 * @param {number} n
 * @param {T[]} arr
 * @returns {T[]}
 */
export const nRandomItems = (n, arr) => {
    return nUniqueRandomNumbers(n, 0, arr.length - 1).map((i) => arr[i]);
}
export const string = () => '';
export const number = () => 0;

/**
 * @template {string} T
 * @param {T} value 
 * @returns T
 */
export const literal = (value) => value;


export const boolean = () => false;

/**
 * @template T
 * @param {T} thing 
 * @returns T[]
 */
export const array = (thing) => [];

/**
 * @template T
 * @param {T[]} values 
 * @returns T
 */
export const enumType = (...values) => values[0];


const j = enumType('a', 'b', 'c');
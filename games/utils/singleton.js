let registry = {};

/**
 * @template Thing
 * @param {string} name
 * @param {() => Thing} create
 * @returns {Thing}
 */
export const singleton = (name, create) => {
  if (!registry[name]) {
    registry[name] = create();
  }
  return registry[name];
};

/**
 * @template T
 * @param {T} target
 * @param {Partial<T>} source
 * @returns {T}
 */
export function recursiveAssign(target, source) {
  if (Array.isArray(source) && Array.isArray(target)) {
    target.length = source.length;
  }
  for (let k in source) {
    if (target[k] instanceof Object && source[k] instanceof Object) {
      recursiveAssign(target[k], source[k]);
    } else {
      target[k] = source[k];
    }
  }
  return target;
}

window.recursiveAssign = recursiveAssign;

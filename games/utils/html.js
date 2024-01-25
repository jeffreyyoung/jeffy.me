/* Example:
var someUnsafeStr = '<img>';
var result = escapeHTMLTag`<input value="${someUnsafeStr}">`;
console.log(result); // <input value="&lt;img&gt;">
// Questions? rob {at} robwu.nl
// */

/**
 * 
 * @param {string} str 
 * @returns 
 */
export function escapeHtml(str) {
    // Note: string cast using String; may throw if `str` is non-serializable, e.g. a Symbol.
    // Most often this is not the case though.
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// A tag for template literals that escapes any value as HTML.
/**
 * 
 * @param {string[]} strings 
 * @param  {...any} values 
 * @returns 
 */
export function html(strings, ...values) {
   let results = [];
   for (let i = 0; i < strings.length; ++i) {
       results.push(strings[i]);
       if (i < values.length) { // values[strings.length-1] can be undefined
           results.push(/*escapeHtml*/(values[i]));
       }
   }
   return results.join('');
}
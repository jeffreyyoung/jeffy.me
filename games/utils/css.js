/**
 * @param {TemplateStringsArray} strings
 * @param  {...any} values
 * @returns void
 */
export const css = (strings, ...values) => {
  let stylesheet = document.createElement("style");
  stylesheet.innerHTML = String.raw({ raw: strings }, ...values);
  document.head.appendChild(stylesheet);
};

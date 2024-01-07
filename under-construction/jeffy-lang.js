import van from "../deps/van.js";

const {
  form,
  br,
  h1,
  h2,
  h3,
  pre,
  h6,
  span,
  div,
  button,
  p,
  ul,
  li,
  a,
  textarea,
  input,
} = van.tags;

// todo: add start and end lines
/**
 * @typedef Token
 * @type {{
 *   type: "paren",
 *   value: "(" | ")"
 * } | {
 *  type: "number",
 *  value: number
 * } | {
 *   type: "string",
 *   value: string
 * } | {
 *   type: "identifier",
 *   value: string
 * }}
 */

/**
 *
 * @typedef AST
 * @type {{
 *  type: "program",
 *  body: AST[]
 * } | {
 *  type: "expression",
 *  body: AST[]
 * } | {
 *   type: 'number',
 *   value: number
 * } | {
 *   type: 'string',
 *   value: string
 * } | {
 *  type: 'identifier',
 *  value: string
 * }}
 */
const lowercase = "abcdefghijklmnopqrstuvwxyz";
const alphaChars = lowercase + lowercase.toUpperCase();

let isDigit = (char) => "0123456789".includes(char);
let isAlpha = (char) => alphaChars.includes(char);
let isWhiteSpace = (char) => " \n\t\r".includes(char);
/**
 *
 * @param {string} str
 * @returns {Token[]}
 */
function tokenize(str) {
  /** @type {Token[]} */
  let tokens = [];
  let i = 0;
  while (i < str.length) {
    const char = str[i];
    if (char === "(" || char === ")") {
      tokens.push({
        type: "paren",
        value: char,
      });
      i++;
    } else if (char === '"') {
      let value = "";
      i++;
      while (str[i] !== '"' && i < str.length) {
        value += str[i];
        i++;
      }
      tokens.push({
        type: "string",
        value,
      });
      i++;
      // string
    } else if (isDigit(char)) {
      let value = 0;
      while (isDigit(str[i])) {
        value = value * 10 + parseInt(str[i]);
        i++;
      }
      tokens.push({
        type: "number",
        value,
      });
    } else if (isWhiteSpace(char)) {
      i++;
    } else if (isAlpha(char)) {
      let value = "";
      while (isAlpha(str[i])) {
        value += str[i];
        i++;
      }
      tokens.push({
        type: "identifier",
        value,
      });
    } else {
      throw new Error("invalid character at " + i + `:${char}`);
    }
  }

  return tokens;
}

/**
 * @param {Token[]} tokens
 * @returns {Extract<AST, {type: 'program'}>}
 */
function toAST(tokens) {
  /** @type {Extract<AST, {type: 'program'}>} */
  let program = {
    type: "program",
    body: [],
  };

  let i = 0;

  /** @type {Extract<AST, { type: 'program' | 'expression' }>[]} */
  let stack = [program];
  while (i < tokens.length) {
    let token = tokens[i];

    if (token.type === "paren" && token.value === "(") {
      /** @type {Extract<AST, { type: 'expression' }>} */
      let expression = {
        type: "expression",
        body: [],
      };
      stack.at(-1).body.push(expression);
      stack.push(expression);
    } else if (token.type === "paren" && token.value === ")") {
      if (stack.length === 1) {
        throw new Error("unexpected closing parenthesis");
      }
      stack.pop();
    } else if (
      token.type === "identifier" ||
      token.type === "number" ||
      token.type === "string"
    ) {
      stack.at(-1).body.push(token);
    } else {
      throw new Error(`unexpected token: ${JSON.stringify(token)}`);
    }
    i++;
  }

  return program;
}

/**
 *
 * @param {string} name
 * @param {number} actual
 * @param {ArgCountExpression} expression
 */
function assertArgCountExpression(name, actual, expression) {
  if (!expression) {
    return true;
  }
  if (expression.startsWith("=")) {
    const expected = parseInt(expression.slice(1));
    if (actual !== expected) {
      throw new Error(
        `${name} expects to be called with ${expected} arguments but was called with ${actual}`
      );
    }
  }
  if (expression.startsWith(">=")) {
    const expected = parseInt(expression.slice(2));
    if (actual < expected) {
      throw new Error(
        `${name} expects to be called with at least ${expected} arguments but was called with ${actual}`
      );
    }
  }
}

/**
 *
 * @typedef ArgCountExpression
 * @type { `=${number}` | `>=${number}`}
 *
 * @typedef InterpretResult
 * @type {{
 *   type: 'func',
 *   name?: string | undefined,
 *   argCount: ArgCountExpression
 *   value: (args: AST[], stack: Stack) => InterpretResult
 * } | {
 *    type: 'number',
 *    value: number
 * } | {
 *    type: 'string',
 *    value: string
 * } | {
 *   type: 'list',
 *   value: AST[]
 * }}
 *
 * @typedef StackFrame
 * @type {Record<string, InterpretResult>}
 *
 * @typedef Stack
 * @type {StackFrame[]}
 */

/**
 *
 * @param {AST} ast
 * @param {Stack} stack
 * @returns {InterpretResult}
 */
export function interpret(ast, stack) {
  /**
   *
   * @param {string} name
   */
  const deref = (name) => {
    for (let i = stack.length - 1; i >= 0; i--) {
      let frame = stack[i];
      if (Object.hasOwn(frame, name)) {
        return frame[name];
      }
    }
    throw new Error(`no value for ${name}`);
  };

  if (ast.type === "string") {
    return ast;
  } else if (ast.type === "number") {
    return ast;
  } else if (ast.type === "identifier") {
    let ref = deref(ast.value);
    return ref;
  } else if (ast.type === "expression") {
    if (ast.body.length === 0) {
      return {
        type: "number",
        value: 0,
      };
    }
    let first = interpret(ast.body.at(0), stack);

    if (first.type === "func") {
      let name = first.name;
      let node = ast.body.at(0);
      if (!name && node.type === "identifier") {
        name = node.value;
      }
      // validate args
      assertArgCountExpression(name, ast.body.length - 1, first.argCount);
      let res = first.value(ast.body.slice(1), stack);
      return res;
    }
    if (ast.body.length === 1) {
      return first;
    }

    let res = ast.body
      .slice(1)
      .map((item) => interpret(item, stack))
      .at(-1);
    return res;
  } else if (ast.type === "program") {
    let results = ast.body.map((item) => interpret(item, stack));
    return results.at(-1);
  } else {
    throw new Error(`unknown ast node: ${JSON.stringify(ast)}`);
  }
}

const lib = `
(fn first (l) (get l 0))
(fn last (l) (get l (sub 0 1)))
(fn map (myList mapper)
    (fold
        myList
        (list)
        (fn (res cur) (append res (mapper cur)))
    )
)
`;

/**
 *
 * @param {Extract<AST, {type: 'program'}>} ast
 * @param {(out: string) => void} out
 */
function run(ast, out) {
  /** @type {Stack} */
  let stack = [
    {
      throw: {
        type: "func",
        argCount: "=1",
        value: ([m], stack) => {
          let msg = interpret(m, stack);
          if (msg.type !== "string") {
            throw new Error("throw should recieve string");
          }
          throw new Error(msg.value);
        },
      },
      type: {
        type: "func",
        argCount: "=1",
        value: ([n], stack) => {
          let r = interpret(n, stack);
          return {
            type: "string",
            value: r.type,
          };
        },
      },

      fn: {
        type: "func",
        argCount: ">=2",
        value: (nodes, stack) => {
          let i = 0;
          let maybeName = nodes[i];
          let name = undefined;
          if (maybeName.type === "identifier") {
            name = maybeName.value;
            i++;
          }
          const argNames = nodes[i];
          if (argNames.type !== "expression") {
            throw new Error(`fn should receive named arguments`);
          }
          if (!argNames.body.every((ast) => ast.type === "identifier")) {
            throw new Error(
              `fn - only identifiers should be passed into fn args`
            );
          }
          i++;
          /**
           * @type {AST}
           */
          const body = {
            type: "expression",
            body: nodes.slice(i),
          };

          /** @type InterpretResult */
          let func = {
            type: "func",
            argCount: `=${argNames.body.length}`,
            value: (args, stack) => {
              /** @type{StackFrame} */
              let frame = {};
              let s = stack.concat(frame);
              for (let i = 0; i < argNames.body.length; i++) {
                let name = argNames.body[i];
                if (name.type !== "identifier") {
                  throw new Error("we should never get here");
                }

                frame[name.value] = interpret(args[i], s);
              }
              // pass variables into body
              let val = interpret(body, s);
              return val;
            },
          };

          if (name) {
            stack.at(-1)[name] = func;
          }

          return func;
        },
      },
      print: {
        type: "func",
        argCount: ">=0",
        value: (args, stack) => {
          for (let i = 0; i < args.length; i++) {
            let res = interpret(args[i], stack);
            if (res.type === "list") {
              out(
                `(list ${res.value
                  .map((i) => interpret(i, stack).value)
                  .join(" ")})`
              );
            } else {
              out(String(res.value));
            }

            if (i === args.length - 1) {
              out("\n");
              return res;
            } else {
              out(" ");
            }
          }
          throw new Error("should not get here");
        },
      },
      sub: {
        type: "func",
        argCount: "=2",
        value: ([_a, _b], stack) => {
          let a = interpret(_a, stack),
            b = interpret(_b, stack);
          return {
            type: "number",
            // @ts-ignore
            value: a.value - b.value,
          };
        },
      },
      append: {
        type: "func",
        argCount: "=2",
        value: ([l, i], stack) => {
          let list = interpret(l, stack);
          if (list.type !== "list") {
            throw new Error("append expected list as first arg");
          }
          return {
            type: "list",
            value: list.value.concat(i).map((a) => interpret(a, stack)),
          };
        },
      },
      add: {
        type: "func",
        argCount: "=2",
        value: (args, stack) => {
          let [a, b] = args
            .map((ast) => interpret(ast, stack))
            .map((res) =>
              res.type === "func" ? `<function ${res.name}>` : res.value
            );
          return {
            type: "number",
            // @ts-ignore
            value: a + b,
          };
        },
      },
      or: {
        type: "func",
        argCount: "=2",
        value: ([a, b], stack) => {
          if (interpret(a, stack).value || interpret(b, stack).value) {
            return {
              type: "number",
              value: 1,
            };
          }
          return {
            type: "number",
            value: 0,
          };
        },
      },
      greaterThan: {
        type: "func",
        argCount: "=2",
        value: ([_a, _b], stack) => {
          const [a, b] = [interpret(_a, stack), interpret(_b, stack)];
          if (a.value > b.value) {
            return {
              type: "number",
              value: 1,
            };
          }
          return {
            type: "number",
            value: 0,
          };
        },
      },
      lessThan: {
        type: "func",
        argCount: "=2",
        value: ([_a, _b], stack) => {
          const [a, b] = [interpret(_a, stack), interpret(_b, stack)];
          if (a.value < b.value) {
            return {
              type: "number",
              value: 1,
            };
          }
          return {
            type: "number",
            value: 0,
          };
        },
      },
      eq: {
        type: "func",
        argCount: "=2",
        value: (args, stack) => {
          let a = interpret(args.at(0), stack);
          let b = interpret(args.at(1), stack);
          return {
            type: "number",
            value: a.value === b.value ? 1 : 0,
          };
        },
      },
      not: {
        type: "func",
        argCount: "=1",
        value: (args, stack) => {
          if (args.length !== 1) {
            throw new Error(
              `not accepts 1 arg but was called with ${args.length}`
            );
          }
          return {
            type: "number",
            value: !interpret(args.at(0), stack).value ? 1 : 0,
          };
        },
      },
      list: {
        type: "func",
        argCount: ">=0",
        value: (args, stack) => {
          return {
            type: "list",
            value: args,
          };
        },
      },
      get: {
        type: "func",
        argCount: "=2",
        value: ([l, i], stack) => {
          let list = interpret(l, stack);
          if (list.type !== "list") {
            throw new Error("first - expected first as first arg");
          }
          let index = interpret(i, stack);
          if (index.type !== "number") {
            throw new Error("first - expected number as second arg");
          }
          return interpret(list.value.at(index.value), stack);
        },
      },
      fold: {
        type: "func",
        argCount: "=3",
        value: ([_list, initial, fn], stack) => {
          let list = interpret(_list, stack);
          if (list.type !== "list") {
            throw new Error("fold - expected first arg to be of type list");
          }

          let res = interpret(initial, stack);
          let func = interpret(fn, stack);
          if (func.type !== "func") {
            throw new Error("fold - expected third arg to be of type func");
          }
          let i = 0;
          for (const item of list.value) {
            i++;
            res = func.value(
              [
                { type: "identifier", value: "rrrresult" },
                item,
                { type: "number", value: i },
              ],
              stack.concat({
                rrrresult: res,
              })
            );
          }
          return res;
        },
      },
      size: {
        type: "func",
        argCount: "=1",
        value: ([subject], stack) => {
          let l = interpret(subject, stack);
          if (l.type !== "list") {
            throw new Error("size - expected list as first arg");
          }
          return {
            type: "number",
            value: l.value.length,
          };
        },
      },
      if: {
        type: "func",
        argCount: "=3",
        value: (args, stack) => {
          let [condition, a, b] = args;
          let conditionResult = interpret(condition, stack);
          if (conditionResult.value) {
            return interpret(a, stack);
          } else {
            return interpret(b, stack);
          }
        },
      },
    },
  ];
  try {
    interpret(toAST(tokenize(lib)), stack);
    interpret(ast, stack);
    return 0;
  } catch (e) {
    console.error(e);
    out("\nerror: " + e.message);
    out("\n");
    return 1;
  }
}

/**
 * @template ReturnType
 * @param {() => ReturnType} cb
 * @returns {ReturnType | Error}
 */
function attempt(cb) {
  try {
    return cb();
  } catch (e) {
    return new Error(e);
  }
}
function stringify(thing) {
  if (typeof thing === "string") {
    return thing;
  }
  if (thing instanceof Error) {
    return thing.message;
  }
  return JSON.stringify(thing, null, 2);
}
function App() {
  const code = van.state(
    `(fn sayHello (name) (print "hi" name))\n(sayHello "pam")`
  );
  van.derive(() => {
    console.log("lang updated! ", code);
  });
  const tokens = van.derive(() => attempt(() => tokenize(code.val)));
  const ast = van.derive(() =>
    attempt(() => (Array.isArray(tokens.val) ? toAST(tokens.val) : null))
  );
  const output = van.derive(() => {
    if (ast.val instanceof Error) {
      return "";
    }
    let output = "";
    let result = run(ast.val, (v) => (output += v));
    output += `${result}`;
    // @ts-ignore
    return output;
  });

  return div(
    br(),
    h3("jeffy-lang"),
    form(
      {
        onsubmit: (e) => {
          e.preventDefault();
          let form = new FormData(e.target);
          const newVal = String(form.get("code"));
          console.log("onsubmit", newVal);
          code.val = newVal;
        },
      },
      textarea({
        name: "code",
        defaultValue: code.val,
        style: "height: 200px;",
      }),
      button("run")
    ),
    h3("output"),
    pre(() => stringify(output.val)),
    h3("tokens"),
    pre(() => stringify(tokens.val)),
    h3("ast"),
    pre(() => stringify(ast.val))
  );
}

function getResult(a) {
  let result = "";
  try {
    run(toAST(tokenize(a)), (str) => (result += str));
  } catch (e) {
    console.error(e);
    result += `error: ${e}`;
  }
  return result;
}

/**
 * @param {string=} description
 * @param {string} code
 * @param {string} expected
 * @returns string
 */
function EqualTest(code, expected, description = "") {
  let actual = getResult(code).trim();
  const preStyle = { style: "background-color: rgba(255, 255, 255, 0.7)" };
  const isPass = actual === expected;
  return div(
    {
      style: `border: 1px solid gray; margin: 15px; padding: 5px; background-color: ${
        isPass ? "lightgreen" : "red"
      }`,
    },
    p(
      { style: `background-color: ${isPass ? "lightgreen" : "red"}` },
      isPass ? "✅ pass" : "❌ fail",
      description ? " - " : "",
      description
    ),
    pre(preStyle, code),
    span(isPass ? "result" : "expected result: "),
    pre(preStyle, expected),

    isPass ? null : span("actual result: "),
    isPass ? null : pre(preStyle, actual)
  );
}

function Tests() {
  return div(
        EqualTest("(print (add 1 1))", "2"),
        EqualTest(
          "(print (add 1 2 3))",
          "error: add expects to be called with 2 arguments but was called with 3"
        ),
        EqualTest("(fn addOne (n) (add 1 n))\n(print (addOne 1))", "2"),
        EqualTest('(print ((("hi"))) )', "hi"),
        EqualTest("(print (1 2 3)", "3"),
        EqualTest('(print ("a" "b"))', "b"),
        EqualTest('(print (if (lessThan 4 5) "less" "more"))', "less"),
        EqualTest(
          `
    (fn lessThanFive (n)
        (if (lessThan n 5) "less" "more")
    )
    (print (lessThanFive 4))`,
          "less"
        ),
        EqualTest(
          `
    (fn fib (n)
        (if (lessThan n 2)
            n
            (add
                (fib (sub n 1))
                (fib (sub n 2))
            )
        )
    )

    (print "(fib 0) =" (fib 0))
    (print "(fib 1) =" (fib 1))
    (print "(fib 2) =" (fib 2))
    (print "(fib 3) =" (fib 3))
    (print "(fib 4) =" (fib 4))
    (print "(fib 5) =" (fib 5))
    (print "(fib 14) =" (fib 13))
            `,
          `(fib 0) = 0\n(fib 1) = 1\n(fib 2) = 1\n(fib 3) = 2\n(fib 4) = 3\n(fib 5) = 5\n(fib 14) = 233`
        ),
        EqualTest(
          `
        (print (fold
              (list 1 2 3)
              0
              (fn (res cur) (add res cur))
        ))
        `,
          "6",
          "fold works with anonymous function"
        ),
        EqualTest(
          `
          (print (fold
                (list 1 2 3)
                0
                (fn sum (res cur) (add res cur))
          ))
          `,
          "6",
          "fold works with named function"
        ),
        EqualTest(
          `
        (print (list 1 2))
        `,
          "(list 1 2)"
        ),
        EqualTest(`(print (first (list 1 2)))`, `1`),
        EqualTest(`(print (last (list 1 2)))`, `2`),
        EqualTest(`(print (size (list "a" "b" "c")))`, `3`),
        EqualTest(
          `
            (fn yay ()
                1
                2
                3
            )

            (print (yay))
        `,
          "3"
        ),
        EqualTest(
          `
        (fn yay (a)
            a
            2
            3
        )

        (print (yay 4))
    `,
          "3"
        ),
        EqualTest(
          `
    (fn yay (a)
        a
        2
        a
    )

    (print (yay 4))
    `,
          "4",
          "function returns last statement"
        ),
        EqualTest(`(print (append (list 1) 2))`, "(list 1 2)"),
        EqualTest('(print (type 1))', 'number'),
        EqualTest('(print (type "s"))', 'string'),
        EqualTest('(print (type (list)))', 'list'),
    EqualTest(
      `(print 
          (fold
              (list 1 2)
              (list)
              (fn (myList cur) (append myList 1))
          )
      )`,
      "(list 1 1)"
    ),
    EqualTest(
      `(print 
        (map
            (list 1 2 3)
            (fn (a) (add a 1))
        )
    )`,
      "(list 2 3 4)"
    )
  );
}

van.add(document.getElementById("app"), Tests);

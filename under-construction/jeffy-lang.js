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
 *   argCount: ArgCountExpression,
 *   argNames: string[],
 *   value: (args: (() => InterpretResult)[], stack: Stack, ast: AST[]) => InterpretResult
 * } | {
 *    type: 'number',
 *    value: number
 * } | {
 *    type: 'string',
 *    value: string
 * } | {
 *   type: 'list',
 *   value: InterpretResult[]
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
 * @param {InterpretResult | (() => InterpretResult)} r
 */
function get(r) {
  if (typeof r === "function") {
    return r();
  }
  return r;
}

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
      let func = first;
      let name = func.name;
      let node = ast.body.at(0);
      if (!name && node.type === "identifier") {
        name = node.value;
      }
      // move this inside func def
      // validate args
      assertArgCountExpression(name, ast.body.length - 1, first.argCount);
      let res = first.value(
        ast.body.slice(1).map((node) => () => interpret(node, stack)),
        stack,
        ast.body.slice(1)
      );
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
(fn isType (thing ofType) 
    (eq (type thing) ofType)
)
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
        argNames: ["msg"],
        value: ([m], stack) => {
          let msg = get(m);
          if (msg.type !== "string") {
            throw new Error("throw should recieve string");
          }
          throw new Error(msg.value);
        },
      },
      type: {
        type: "func",
        argCount: "=1",
        argNames: ["subject"],
        value: ([r], stack) => {
          return {
            type: "string",
            value: get(r).type,
          };
        },
      },

      fn: {
        type: "func",
        argNames: [],
        argCount: ">=2",
        value: (args, stack, asts) => {
          let i = 0;
          let maybeName = asts[i];
          let name = undefined;
          if (maybeName.type === "identifier") {
            name = maybeName.value;
            i++;
          }

          const argNamesExpression = asts[i];
          if (argNamesExpression.type !== "expression") {
            throw new Error(`fn should receive named arguments`);
          }
          let argNames = argNamesExpression.body.flatMap((name) =>
            name.type === "identifier" ? [name.value] : []
          );

          if (argNamesExpression.body.length !== argNames.length) {
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
            body: asts.slice(i),
          };

          /** @type InterpretResult */
          let func = {
            type: "func",
            argCount: `=${argNames.length}`,
            argNames,
            value: (args, stack) => {
              /** @type{StackFrame} */
              let frame = {};
              let s = stack.concat(frame);
              for (let i = 0; i < argNames.length; i++) {
                let name = argNames[i];

                frame[name] = get(args[i]);
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
        argNames: [],
        value: (args, stack) => {
          for (let i = 0; i < args.length; i++) {
            let res = get(args[i]);
            if (res.type === "list") {
              out(`(list ${res.value.map((i) => i.value).join(" ")})`);
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
        argNames: [],
        value: ([a, b], stack) => {
          return {
            type: "number",
            // @ts-ignore
            value: get(a).value - get(b).value,
          };
        },
      },
      append: {
        type: "func",
        argCount: "=2",
        argNames: [],
        value: ([l, item], stack) => {
          let list = get(l);
          if (list.type !== "list") {
            throw new Error("append expected list as first arg");
          }
          return {
            type: "list",
            value: list.value.concat(get(item)),
          };
        },
      },
      add: {
        type: "func",
        argCount: "=2",
        argNames: [],
        value: (args, stack) => {
          let [a, b] = args
            .map(get)
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
        argNames: [],
        value: ([a, b], stack) => {
          if (get(a).value || get(b).value) {
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
        argNames: [],
        value: ([_a, _b], stack) => {
          const [a, b] = [get(_a), get(_b)];
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
        argNames: [],
        value: ([_a, _b], stack) => {
          const [a, b] = [get(_a), get(_b)];
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
        argNames: [],
        value: (args, stack) => {
          let a = get(args.at(0));
          let b = get(args.at(1));
          return {
            type: "number",
            value: a.value === b.value ? 1 : 0,
          };
        },
      },
      not: {
        type: "func",
        argCount: "=1",
        argNames: [],
        value: (args, stack) => {
          if (args.length !== 1) {
            throw new Error(
              `not accepts 1 arg but was called with ${args.length}`
            );
          }
          return {
            type: "number",
            value: !get(args.at(0)).value ? 1 : 0,
          };
        },
      },
      list: {
        type: "func",
        argCount: ">=0",
        argNames: [],
        value: (args, stack) => {
          return {
            type: "list",
            value: args.map(get),
          };
        },
      },
      get: {
        type: "func",
        argCount: "=2",
        argNames: ["list", "n"],
        value: ([l, i], stack) => {
          let list = get(l);
          if (list.type !== "list") {
            throw new Error("first - expected first as first arg");
          }
          let index = get(i);
          if (index.type !== "number") {
            throw new Error("first - expected number as second arg");
          }
          return get(list.value.at(index.value));
        },
      },
      fold: {
        type: "func",
        argCount: "=3",
        argNames: [],
        value: ([_list, initial, fn], stack) => {
          let list = get(_list);
          if (list.type !== "list") {
            throw new Error("fold - expected first arg to be of type list");
          }

          let res = get(initial);
          let func = get(fn);
          if (func.type !== "func") {
            throw new Error("fold - expected third arg to be of type func");
          }
          let i = 0;
          for (const item of list.value) {
            i++;
            res = func.value(
              [() => res, () => item, () => ({ type: "number", value: i })],
              stack.concat(),
              []
            );
          }
          return res;
        },
      },
      size: {
        type: "func",
        argCount: "=1",
        argNames: ["subject"],
        value: ([subject], stack) => {
          let l = get(subject);
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
        argNames: ["condition", "ifTrue", "ifFalse"],
        value: (args, stack) => {
          let [condition, a, b] = args;
          let conditionResult = get(condition);
          if (conditionResult.value) {
            return get(a);
          } else {
            return get(b);
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
    EqualTest("(print (type 1))", "number"),
    EqualTest('(print (type "s"))', "string"),
    EqualTest("(print (type (list)))", "list"),
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
    ),
    EqualTest(`(print (isType 5 "number"))`, "1"),
    EqualTest(`(print (isType "5" "number"))`, "0")
  );
}

van.add(document.getElementById("app"), Tests);

import { readLines } from "https://deno.land/std/io/buffer.ts";
import * as t from "./token.ts";

type StateIn = { state: "s" } | { state: "0"; n: number } | {
  state: "+";
  op: string;
};
type State = StateIn | { state: "E"; token: t.Token };

const opRegex = /[+\-*\/$!&|\^\\.,<>=]/;

const trans = (s: StateIn, char: string | null): State | string=> {
  switch (s.state) {
    case "s":
      if (char === null) {
        return { state: "s" };
      } else if (/\s/u.test(char)) {
        return { state: "s" };
      } else if (/\d/.test(char)) {
        return { state: "0", n: Number(char) };
      } else if (opRegex.test(char)) {
        return { state: "+", op: char };
      } else {
        return "cannot accept char:" + char;
      }
    case "0":
      if (char === null) {
        return { state: "E", token: { tag: "number", value: s.n } };
      } else if (/\s/u.test(char)) {
        return { state: "E", token: { tag: "number", value: s.n } };
      } else if (/\d/.test(char)) {
        return { state: "0", n: s.n * 10 + Number(char) };
      } else if (opRegex.test(char)) {
        return { state: "E", token: { tag: "number", value: s.n } };
      } else {
        return "cannot accept char:" + char;
      }
    case "+":
      if (char === null) {
        return { state: "E", token: { tag: "operator", operator: s.op } };
      } else if (/\s/u.test(char)) {
        return { state: "E", token: { tag: "operator", operator: s.op } };
      } else if (/\d/.test(char)) {
        return { state: "E", token: { tag: "operator", operator: s.op } };
      } else if (opRegex.test(char)) {
        return { state: "+", op: s.op + char };
      } else {
        return "cannot accept char:" + char;
      }
  }
};

class Lexer {
  lineno: number;
  colno: number;
  line = "";
  lines: AsyncIterator<string>;
  state: StateIn = { state: "s" };

  constructor(file: Deno.Reader) {
    this.lineno = 0;
    this.colno = 1;
    this.lines = readLines(file);
  }

  async aSetup() {
    const result = await this.lines.next();
    if (!result.done) {
      this.line = result.value;
      this.lineno = 1;
    }
  }

  async nextC(): Promise<string | null> {
    if (this.colno > this.line.length) {
      do {
        const result = await this.lines.next();
        if (result.done) {
          return null;
        } else {
          this.line = result.value;
          this.lineno++;
          this.colno = 1;
        }
      } while (this.line.length == 0);
    }
    return this.line[this.colno++ - 1];
  }

  peek(): string | null {
    return this.colno > this.line.length ? null : this.line[this.colno - 1];
  }

  async grab(): Promise<t.Token | null> {
    let nextState;
    while (true) {
      nextState = trans(this.state, await this.peek());
      if (typeof nextState === "string") {
        this.error(nextState);
      }
      if (nextState.state == "E") {
        break;
      }
      this.state = nextState;
      if (await this.nextC() === null) {
        return null;
      }
    }
    this.state = { state: "s" };
    return nextState.token;
  }

  error(msg: string): never {
    throw new Error(`${this.lineno}:${this.colno}: ${msg} at\n${this.line}\n${" ".repeat(this.colno - 1)}^`)
  }
}

class Parser {
  lexer: Lexer;
  constructor(lexer: Lexer) {
    this.lexer = lexer;
  }
}

(async () => {
  if (Deno.args[0] === "lex") {
    const lexer = new Lexer(Deno.stdin);
    let token;
    try {
      while ((token = await lexer.grab())) {
        console.log(token);
      }
    } catch(e) {
      console.log(e);
    }
  } else if (Deno.args[0] === "parse") {
    const parser = new Parser(new Lexer(Deno.stdin));
  }
})();

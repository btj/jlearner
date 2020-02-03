class Scanner {
  constructor(text) {
    this.text = text;
    this.pos = -1;
    this.eat();
  }

  eat() {
    this.pos++;
    this.c = (this.pos == this.text.length ? "EOF" : this.text.charAt(this.pos));
  }

  nextToken() {
    while (this.c == ' ' || this.c == '\t' || this.c == '\n' || this.c == '\r')
      this.eat();
    this.tokenStart = this.pos;
    if ('0' <= this.c && this.c <= '9') {
      this.eat();
      while ('0' <= this.c && this.c <= '9')
        this.eat();
      this.value = this.text.substring(this.tokenStart, this.pos);
      return "NUMBER";
    }
    if (this.c == 'EOF')
      return 'EOF';
    let token = this.c;
    this.eat();
    return token;
  }
}

class ASTNode {
  constructor(loc) {
    this.loc = loc;
  }
}

class Expression extends ASTNode {
  constructor(loc) {
    super(loc);
  }
}

class IntLiteral extends Expression {
  constructor(loc, value) {
    super(loc);
    this.value = value;
  }

  eval(env) {
    return +this.value;
  }
}

class BinaryOperatorExpression extends Expression {
  constructor(loc, leftOperand, operator, rightOperand) {
    super(loc);
    this.leftOperand = leftOperand;
    this.operator = operator;
    this.rightOperand = rightOperand;
  }

  eval(env) {
    let v1 = this.leftOperand.eval(env);
    let v2 = this.rightOperand.eval(env);
    switch (this.operator) {
      case '+': return (v1 + v2)|0;
      case '-': return (v1 - v2)|0;
      case '*': return (v1 * v2)|0;
      case '/': return (v1 / v2)|0;
      default: throw new Error("Operator '" + this.operator + "' not supported.");
    }
  }
}

class Loc {
  constructor(doc, start, end) {
    this.doc = doc;
    this.start = start;
    this.end = end;
  }
}

class ParseError extends Error {
  constructor(loc, msg) {
    super();
    this.loc = loc;
    this.msg = msg;
  }
}

class Parser {
  constructor(doc, text) {
    this.doc = doc;
    this.scanner = new Scanner(text);
    this.token = this.scanner.nextToken();
    this.posStack = [];
  }

  pushStart() {
    this.posStack.push(this.scanner.tokenStart);
  }

  popLoc() {
    return new Loc(this.doc, this.posStack.pop(), this.lastPos);
  }

  dupLoc() {
    return new Loc(this.doc, this.posStack[this.posStack.length - 1], this.lastPos);
  }

  tokenLoc() {
    return new Loc(this.doc, this.scanner.tokenStart, this.lastPos);
  }

  parseError(msg) {
    throw new ParseError(this.tokenLoc(), msg);
  }

  next() {
    this.lastValue = this.scanner.value;
    this.lastPos = this.scanner.pos;
    this.token = this.scanner.nextToken();
  }

  expect(token) {
    if (this.token != token)
      this.parseError(token + " expected");
    this.next();
    return this.lastValue;
  }

  parsePrimaryExpression() {
    this.pushStart();
    this.expect("NUMBER");
    return new IntLiteral(this.popLoc(), this.lastValue);
  }

  parseMultiplicativeExpression() {
    this.pushStart();
    let e = this.parsePrimaryExpression();
    for (;;) {
      switch (this.token) {
        case '*':
        case '/':
          let op = this.token;
          this.next();
          let rightOperand = this.parsePrimaryExpression();
          e = new BinaryOperatorExpression(this.dupLoc(), e, op, rightOperand);
          break;
        default:
          this.popLoc();
          return e;
      }
    }
  }

  parseAdditiveExpression() {
    this.pushStart();
    let e = this.parseMultiplicativeExpression();
    for (;;) {
      switch (this.token) {
        case '+':
        case '-':
          let op = this.token;
          this.next();
          let rightOperand = this.parseMultiplicativeExpression();
          e = new BinaryOperatorExpression(this.dupLoc(), e, op, rightOperand);
          break;
        default:
          this.popLoc();
          return e;
      }
    }
  }

  parseExpression() {
    return this.parseAdditiveExpression();
  }
}

function evaluateExpression() {
  let exprText = expressionEditor.getValue();
  let parser = new Parser(expressionEditor, exprText);
  let e = parser.parseExpression();
  parser.expect("EOF");
  let env = null;
  let v = e.eval(env);
  resultsEditor.replaceRange("> " + exprText + "\r\n" + v + "\r\n", {line: resultsEditor.lastLine()});
}

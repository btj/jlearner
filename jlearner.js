function isDigit(c) { return '0' <= c && c <= '9'; }
function isAlpha(c) { return 'A' <= c && c <= 'Z' || 'a' <= c && c <= 'z' || c == '_'; }

function has(object, propertyName) { return Object.prototype.hasOwnProperty.call(object, propertyName); }

keywords = {'int': true};

class Scanner {
  constructor(text) {
    this.text = text;
    this.pos = -1;
    this.eat();
  }

  eat() {
    this.pos++;
    this.c = (this.pos == this.text.length ? "<EOF>" : this.text.charAt(this.pos));
  }

  nextToken() {
    while (this.c == ' ' || this.c == '\t' || this.c == '\n' || this.c == '\r')
      this.eat();
    this.tokenStart = this.pos;
    if (isDigit(this.c)) {
      this.eat();
      while (isDigit(this.c))
        this.eat();
      this.value = this.text.substring(this.tokenStart, this.pos);
      return "NUMBER";
    }
    if (isAlpha(this.c)) {
      this.eat();
      while (isAlpha(this.c) || isDigit(this.c))
        this.eat();
      this.value = this.text.substring(this.tokenStart, this.pos);
      if (has(keywords, this.value))
        return this.value;
      return "IDENT";
    }
    if (this.c == '<EOF>')
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
  
  executionError(msg) {
    throw new ExecutionError(this.loc, msg);
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

  evaluate(env) {
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

  evaluate(env) {
    let v1 = this.leftOperand.evaluate(env);
    let v2 = this.rightOperand.evaluate(env);
    switch (this.operator) {
      case '+': return (v1 + v2)|0;
      case '-': return (v1 - v2)|0;
      case '*': return (v1 * v2)|0;
      case '/': return (v1 / v2)|0;
      default: throw new Error("Operator '" + this.operator + "' not supported.");
    }
  }
}

class VariableExpression extends Expression {
  constructor(loc, name) {
    super(loc);
    this.name = name;
  }
  
  evaluate(env) {
    if (!has(env, this.name))
      this.executionError("No such variable: '" + this.lhs.name + "'");
    return env[this.name].value;
  }
}

class AssignmentExpression extends Expression {
  constructor(loc, lhs, rhs) {
    super(loc);
    this.lhs = lhs;
    this.rhs = rhs;
  }
  
  evaluate(env) {
    if (this.lhs instanceof VariableExpression) {
      if (!has(env, this.lhs.name))
        this.executionError("No such variable: '" + this.lhs.name + "'");
      let v = this.rhs.evaluate(env);
      env[this.lhs.name].value = v;
      return v;
    }
    this.executionError("The left-hand side of an assignment must be a variable name");
  }
}

class TypeExpression extends ASTNode {
  constructor(loc, name) {
    super(loc);
    this.name = name;
  }
}

class Statement extends ASTNode {
  constructor(loc) {
    super(loc);
  }
}

class VariableDeclarationStatement extends Statement {
  constructor(loc, type, nameLoc, name, init) {
    super(loc);
    this.type = type;
    this.nameLoc = nameLoc;
    this.name = name;
    this.init = init;
  }
  
  execute(env) {
    if (has(env, this.name))
      this.executionError("Variable '"+x+"' already exists in this scope.");
    let v = this.init.evaluate(env);
    env[this.name] = {declaration: this, value: v};
  }
}

class ExpressionStatement extends Statement {
  constructor(loc, expr) {
    super(loc);
    this.expr = expr;
  }
  
  execute(env) {
    this.expr.evaluate(env);
  }
}

class Loc {
  constructor(doc, start, end) {
    this.doc = doc;
    this.start = start;
    this.end = end;
  }
}

class LocError extends Error {
  constructor(loc, msg) {
    super();
    this.loc = loc;
    this.msg = msg;
  }
}

class ParseError extends LocError {
  constructor(loc, msg) {
    super(loc, msg);
  }
}

class ExecutionError extends LocError {
  constructor(loc, msg) {
    super(loc, msg);
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
    switch (this.token) {
      case "NUMBER":
        this.next();
        return new IntLiteral(this.popLoc(), this.lastValue);
      case "IDENT":
        this.next();
        return new VariableExpression(this.popLoc(), this.lastValue);
      default:
        this.parseError("Number or identifier expected");
    }
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
  
  parseAssignmentExpression() {
    this.pushStart();
    let e = this.parseAdditiveExpression();
    switch (this.token) {
      case '=':
        this.next();
        let rightOperand = this.parseExpression();
        return new AssignmentExpression(this.popLoc(), e, rightOperand);
      default:
        this.popLoc();
        return e;
    }
  }

  parseExpression() {
    return this.parseAssignmentExpression();
  }
  
  tryParseType() {
    this.pushStart();
    switch (this.token) {
      case "int":
        this.next();
        return new TypeExpression(this.popLoc(), this.lastValue);
      default:
        this.popLoc();
        return null;
    }
  }
  
  parseStatement() {
    this.pushStart();
    let type = this.tryParseType();
    if (type != null) {
      this.pushStart();
      let x = this.expect("IDENT");
      let nameLoc = this.popLoc();
      this.expect("=");
      let e = this.parseExpression();
      this.expect(";");
      return new VariableDeclarationStatement(this.popLoc(), type, nameLoc, x, e);
    }
    let e = this.parseExpression();
    this.expect(";");
    return new ExpressionStatement(this.popLoc(), e);
  }
  
  parseStatements(terminators) {
    let statements = [];
    while (!(this.token in terminators)) {
      let stmt = this.parseStatement();
      statements.push(stmt);
    }
    return statements;
  }
}

let variablesTable = document.getElementById('variables');
let mainEnv = {};
let mainStackFrame = {title: "(toplevel)", env: mainEnv}
let callStack = [mainStackFrame]

function updateCallStack() {
  let callStackTable = document.getElementById('callstack');
  while (callStackTable.firstChild != null)
    callStackTable.removeChild(callStackTable.firstChild);
  for (let stackFrame of callStack) {
    if (stackFrame !== callStack[0]) {
      let titleRow = document.createElement('tr');
      callStackTable.appendChild(titleRow);
      let titleTd = document.createElement('td');
      titleRow.appendChild(titleTd);
      titleTd.colSpan = 2;
      titleTd.className = "stackframe-title";
      titleTd.innerText = stackFrame.title;
    }
    for (let x in stackFrame.env) {
      let row = document.createElement('tr');
      callStackTable.appendChild(row);
      let nameCell = document.createElement('td');
      row.appendChild(nameCell);
      nameCell.className = "stack-variable-name";
      let typeSpan = document.createElement('span');
      typeSpan.className = "keyword";
      typeSpan.innerText = stackFrame.env[x].declaration.type.name;
      nameCell.innerText = " " + stackFrame.env[x].declaration.name;
      nameCell.insertBefore(typeSpan, nameCell.firstChild);
      if (stackFrame === callStack[0]) {
        let removeButton = document.createElement('button');
        removeButton.innerText = "Remove";
        removeButton.style.display = "none";
        removeButton.onclick = () => {
          delete stackFrame.env[x];
          callStackTable.removeChild(row);
        };
        nameCell.insertBefore(removeButton, nameCell.firstChild);
        nameCell.onmouseenter = () => {
          removeButton.style.display = "inline";
        };
        nameCell.onmouseleave = () => {
          removeButton.style.display = "none";
        };
      }
      let valueCell = document.createElement('td');
      row.appendChild(valueCell);
      valueCell.className = "stack-value-td";
      let valueDiv = document.createElement('div');
      valueCell.appendChild(valueDiv);
      valueDiv.className = "stack-value-div";
      valueDiv.innerText = stackFrame.env[x].value;
    }
  }
}

function executeStatements() {
  let stmtsText = statementsEditor.getValue();
  let parser = new Parser(statementsEditor, stmtsText);
  let stmts = parser.parseStatements({'EOF': true});
  for (let stmt of stmts) {
    stmt.execute(mainEnv);
  }
  updateCallStack();
}

function evaluateExpression() {
  let exprText = expressionEditor.getValue();
  let parser = new Parser(expressionEditor, exprText);
  let e = parser.parseExpression();
  parser.expect("EOF");
  let v = e.evaluate(mainEnv);
  resultsEditor.replaceRange(exprText + "\r\n", {line: resultsEditor.lastLine()});
  let lastLine = resultsEditor.lastLine();
  resultsEditor.replaceRange("==> " + v + "\r\n\r\n", {line: lastLine});
  resultsEditor.markText({line: lastLine, ch: 0}, {line: lastLine}, {className: 'result'});
  resultsEditor.scrollIntoView({line: lastLine});
  updateCallStack();
}

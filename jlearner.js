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

class LocalBinding {
  constructor(declaration, value) {
    this.declaration = declaration;
    this.value = value;
  }
}

class Scope {
  constructor(outerScope) {
    this.outerScope = outerScope;
    this.bindings = {};
  }
  
  tryLookup(x) {
    if (has(this.bindings, x))
      return this.bindings[x];
    if (this.outerScope != null)
      return this.outerScope.tryLookup(x);
    return null;
  }
  
  lookup(loc, x) {
    let result = this.tryLookup(x);
    if (result == null)
      throw new ExecutionError(loc, "No such variable in scope: " + x);
    return result;
  }
  
  *allBindings() {
    if (this.outerScope != null)
      yield* this.outerScope.allBindings();
    for (let x in this.bindings)
      yield this.bindings[x];
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
    return env.lookup(this.loc, this.name).value;
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
      let binding = env.lookup(this.lhs.loc, this.lhs.name);
      let v = this.rhs.evaluate(env);
      binding.value = v;
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
    if (env.tryLookup(this.name) != null)
      throw new ExecutionError(this.nameLoc, "Variable '"+this.name+"' already exists in this scope.");
    let v = this.init.evaluate(env);
    env.bindings[this.name] = new LocalBinding(this, v);
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

class Declaration extends ASTNode {
  constructor(loc) {
    super(loc);
  }
}

class MethodDeclaration extends Declaration {
  constructor(loc, returnType, name, parameterDeclarations, bodyBlock) {
    super(loc);
    this.returnType = returnType;
    this.name = name;
    this.parameterDeclarations = parameterDeclarations;
    this.bodyBlock = bodyBlock;
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
    return new Loc(this.doc, this.scanner.tokenStart, this.scanner.pos);
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
      this.parseError((token == 'EOF' ? "end of input " : token) + " expected");
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
let toplevelScope = new Scope(null);
let mainStackFrame = {title: "(toplevel)", env: toplevelScope}
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
    for (let binding of stackFrame.env.allBindings()) {
      let row = document.createElement('tr');
      callStackTable.appendChild(row);
      let nameCell = document.createElement('td');
      row.appendChild(nameCell);
      nameCell.className = "stack-variable-name";
      let typeSpan = document.createElement('span');
      typeSpan.className = "keyword";
      typeSpan.innerText = binding.declaration.type.name;
      nameCell.innerText = " " + binding.declaration.name;
      nameCell.insertBefore(typeSpan, nameCell.firstChild);
      if (stackFrame === callStack[0]) {
        let removeButton = document.createElement('button');
        removeButton.innerText = "Remove";
        removeButton.style.display = "none";
        removeButton.onclick = () => {
          delete toplevelScope.bindings[binding.declaration.name];
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
      valueDiv.innerText = binding.value;
    }
  }
}

function executeStatements() {
  handleError(() => {
    let stmtsText = statementsEditor.getValue();
    let parser = new Parser(statementsEditor, stmtsText);
    let stmts = parser.parseStatements({'EOF': true});
    for (let stmt of stmts) {
      stmt.execute(toplevelScope);
    }
  });
  updateCallStack();
}

function getTextCoordsFromOffset(text, offset) {
  let line = 0;
  let lineStart = 0;
  for (;;) {
    let nextBreak = text.indexOf('\n', lineStart);
    if (nextBreak < 0 || offset < nextBreak)
      return {line, ch: offset - lineStart};
    line++;
    lineStart = nextBreak + 1;
  }
}

let errorWidgets = [];

function clearErrorWidgets() {
  for (let widget of errorWidgets)
    widget.clear();
  errorWidgets = [];
}

function addErrorWidget(editor, line, msg) {
  var widget = document.createElement("div");
  var icon = widget.appendChild(document.createElement("span"));
  icon.innerHTML = "!";
  icon.className = "lint-error-icon";
  widget.appendChild(document.createTextNode(msg));
  widget.className = "lint-error";
  errorWidgets.push(editor.addLineWidget(line, widget, {coverGutter: false, noHScroll: true}));
}

function handleError(body) {
  clearErrorWidgets();
  try {
    body();
  } catch (ex) {
    if (ex instanceof LocError) {
      let editor = ex.loc.doc;
      let text = editor.getValue();
      let start = getTextCoordsFromOffset(text, ex.loc.start);
      let end = getTextCoordsFromOffset(text, ex.loc.end);
      if (ex.loc.start == text.length) { // error at EOF
        if (!(text.length >= 2 && text.charAt(text.length - 1) == ' ' && text.charAt(text.length - 2) == ' ')) {
          if (text.charAt(text.length - 1) == ' ')
            editor.replaceRange(' ', start);
          else {
            editor.replaceRange('  ', start);
            start.ch++;
          }
        } else {
          start.ch--;
        }
        errorWidgets.push(editor.markText(start, {line: editor.lastLine()}, {className: "syntax-error"}));
        addErrorWidget(editor, editor.lastLine(), ex.msg);
    } else {
        errorWidgets.push(editor.markText(start, end, {className: "syntax-error"}));
        addErrorWidget(editor, start.line, ex.msg);
      }
    } else {
      alert(ex);
    }
  }
}

function evaluateExpression() {
  handleError(() => {
    let exprText = expressionEditor.getValue();
    let parser = new Parser(expressionEditor, exprText);
    let e = parser.parseExpression();
    parser.expect("EOF");
    let v = e.evaluate(toplevelScope);
    resultsEditor.replaceRange(exprText + "\r\n", {line: resultsEditor.lastLine()});
    let lastLine = resultsEditor.lastLine();
    resultsEditor.replaceRange("==> " + v + "\r\n\r\n", {line: lastLine});
    resultsEditor.markText({line: lastLine, ch: 0}, {line: lastLine}, {className: 'result'});
    resultsEditor.scrollIntoView({line: lastLine});
  });
  updateCallStack();
}

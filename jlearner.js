function isDigit(c) { return '0' <= c && c <= '9'; }
function isAlpha(c) { return 'A' <= c && c <= 'Z' || 'a' <= c && c <= 'z' || c == '_'; }

function has(object, propertyName) { return Object.prototype.hasOwnProperty.call(object, propertyName); }

keywordsList = [
  'abstract', 'assert',
  'boolean', 'break', 'byte',
  'case', 'catch', 'char', 'class', 'const', 'continue',
  'default', 'do', 'double',
  'else', 'enum', 'extends',
  'final', 'finally', 'float', 'for',
  'goto',
  'if', 'implements', 'import', 'instanceof', 'int', 'interface',
  'long',
  'native', 'new',
  'package', 'private', 'protected', 'public',
  'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized',
  'this', 'throw', 'throws', 'transient', 'try',
  'void', 'volatile', 'while'
];

keywords = {};

for (let keyword of keywordsList)
  keywords[keyword] = true;

operatorsList = [
  '(', ')', '{', '}', '[', ']', ';', ',', '.', '...', '@', '::',
  '=', '>', '<', '!', '-', '?', ':', '->',
  '==', '>=', '<=', '!=', '&&', '||', '++', '--',
  '+', '-', '*', '/', '&', '|', '^', '%', '<<', '>>', '>>>',
  '+=', '-=', '*=', '/=', '&=', '|=', '^=', '%=', '<<=', '>>=', '>>>='
]

operators = {};
operatorPrefixes = {};

for (let operator of operatorsList) {
  operators[operator] = true;
  for (let i = 1; i < operator.length; i++)
    operatorPrefixes[operator.substring(0, i)] = true;
}

class Scanner {
  constructor(doc, text) {
    this.doc = doc;
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
      let c0 = this.c;
      this.eat();
      while (isAlpha(this.c) || isDigit(this.c))
        this.eat();
      this.value = this.text.substring(this.tokenStart, this.pos);
      if (has(keywords, this.value))
        return this.value;
      return 'A' <= c0 && c0 <= 'Z' ? "TYPE_IDENT" : "IDENT";
    }
    if (this.c == '<EOF>')
      return 'EOF';
    
    let newPos = this.pos + 1;
    let longestOperatorFound = null;
    for (;;) {
      let operatorCandidate = this.text.substring(this.tokenStart, newPos);
      if (has(operators, operatorCandidate))
        longestOperatorFound = operatorCandidate;
      if (has(operatorPrefixes, operatorCandidate) && newPos < this.text.length)
        newPos++;
      else
        break;
    }
    if (longestOperatorFound === null)
      throw new LocError({doc: this.doc, start: this.tokenStart, end: this.tokenStart + 1}, "Bad character");
    this.pos += longestOperatorFound.length - 1;
    this.eat();
    return longestOperatorFound;
  }
}

class LocalBinding {
  constructor(declaration, value) {
    this.declaration = declaration;
    this.value = value;
  }
  
  setValue(value) {
    return this.value = value;
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
  
  evaluateBinding(env) {
    this.executionError("This expression cannot appear on the left-hand side of an assignment");
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
  
  evaluateBinding(env) {
    return env.lookup(this.loc, this.name);
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
    return this.lhs.evaluateBinding(env).setValue(this.rhs.evaluate(env));
  }
}

let objectsCount = 0;
let objectsShown = [];

function collectGarbage() {
  for (let o of objectsShown)
    o.marked = false;
  for (let stackFrame of callStack)
    for (let binding of stackFrame.env.allBindings())
      if (binding.value instanceof JavaObject)
        binding.value.mark();
  let newObjectsShown = [];
  for (let o of objectsShown) {
    if (o.marked)
      newObjectsShown.push(o);
    else
      o.hide();
  }
  objectsShown = newObjectsShown;
}

let nextObjectY = 0;

function createHeapObjectDOMNode(object) {
  let heap = document.getElementById('heap');
  let node = document.createElement('table');
  heap.appendChild(node);
  node.className = 'object-table';
  node.style.left = "0px";
  node.style.top = nextObjectY + "px";
  node.onmousedown = event0 => {
    event0.preventDefault();
    let left0 = node.offsetLeft;
    let top0 = node.offsetTop;
    let moveListener = event => {
      event.preventDefault();
      node.style.left = (left0 + event.x - event0.x) + "px";
      node.style.top = (top0 + event.y - event0.y) + "px";
      updateArrows();
    };
    let upListener = event => {
      document.removeEventListener('mousemove', moveListener);
      document.removeEventListener('mouseup', upListener);
    };
    document.addEventListener('mousemove', moveListener);
    document.addEventListener('mouseup', upListener);
  };
  
  objectsShown.push(object);
  node.className = 'object-table';
  let titleRow = document.createElement('tr');
  node.appendChild(titleRow);
  let titleCell = document.createElement('td');
  titleRow.appendChild(titleCell);
  titleCell.colSpan = 2;
  titleCell.className = 'object-title-td';
  titleCell.innerText = object.toString();
  for (let field in object.fields) {
    let fieldRow = document.createElement('tr');
    node.appendChild(fieldRow);
    let nameCell = document.createElement('td');
    fieldRow.appendChild(nameCell);
    nameCell.className = 'field-name';
    nameCell.innerText = field;
    let valueCell = document.createElement('td');
    fieldRow.appendChild(valueCell);
    valueCell.className = 'field-value';
    valueCell.innerText = object.fields[field].value;
    object.fields[field].valueCell = valueCell;
  }
  return node;
}

function updateFieldArrows() {
  for (let o of objectsShown)
    o.updateFieldArrows();
}

class FieldBinding {
  constructor(value) {
    this.value = value;
    this.arrow = null;
  }
  
  setValue(value) {
    if (this.arrow != null) {
      this.arrow.parentNode.removeChild(this.arrow);
      this.arrow = null;
    }
    this.value = value;
    if (value instanceof JavaObject) {
      this.arrow = createArrow(this.valueCell, value.domNode);
      this.valueCell.innerText = "()";
      this.valueCell.style.color = "white";
    } else {
      this.valueCell.innerText = value;
      this.valueCell.style.color = "black";
    }
    return value;
  }
  
  updateArrow() {
    this.setValue(this.value);
  }
}

class JavaObject {
  constructor(class_) {
    this.id = ++objectsCount;
    this.class_ = class_;
    this.fields = {};
    for (let field in class_.fields)
      this.fields[field] = new FieldBinding(class_.fields[field].type.defaultValue());
    this.domNode = createHeapObjectDOMNode(this);
  }
  
  toString() {
    return this.class_.name + " (id=" + this.id + ")";
  }
  
  mark() {
    if (!this.marked) {
      this.marked = true;
      for (let field in this.fields) {
        let value = this.fields[field].value;
        if (value instanceof JavaObject)
          value.mark();
      }
    }
  }
  
  hide() {
    this.domNode.parentNode.removeChild(this.domNode);
    for (let field in this.fields) // Remove arrows
      this.fields[field].setValue(null);
  }
  
  updateFieldArrows() {
    for (let field in this.fields)
      this.fields[field].updateArrow();
  }
}

class NewExpression extends Expression {
  constructor(loc, className) {
    super(loc);
    this.className = className;
  }
  
  evaluate(env) {
    if (!has(classes, this.className))
      this.executionError("No such class: " + this.className);
    return new JavaObject(classes[this.className]);
  }
}

class SelectExpression extends Expression {
  constructor(loc, target, selectorLoc, selector) {
    super(loc);
    this.target = target;
    this.selectorLoc = selectorLoc;
    this.selector = selector;
  }
  
  evaluateBinding(env) {
    let target = this.target.evaluate(env);
    if (!(target instanceof JavaObject))
      this.executionError("Cannot access field of " + target);
    if (!has(target.fields, this.selector))
      this.executionError("Target does not have a field named " + selector);
    return target.fields[this.selector];
  }
  
  evaluate(env) {
    return this.evaluateBinding(env).value;
  }
}

class TypeExpression extends ASTNode {
  constructor(loc, name) {
    super(loc);
    this.name = name;
  }
  
  defaultValue() {
    switch (this.name) {
      case 'int': return 0;
      default: return null;
    }
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

class FieldDeclaration extends Declaration {
  constructor(loc, type, name) {
    super(loc);
    this.type = type;
    this.name = name;
  }
}

class Class extends Declaration {
  constructor(loc, name, fields) {
    super(loc);
    this.name = name;
    this.fields = {};
    for (let field of fields) {
      if (has(this.fields, field.name))
        field.executionError("A field with this name already exists in this class");
      this.fields[field.name] = field;
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
    this.scanner = new Scanner(doc, text);
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
      case "new":
        this.next();
        let className = this.expect('TYPE_IDENT');
        this.expect('(');
        this.expect(')');
        return new NewExpression(this.popLoc(), className);
      case "(":
        this.next();
        let e = this.parseExpression();
        this.expect(")");
        this.popLoc();
        return e;
      default:
        this.parseError("Number or identifier expected");
    }
  }
  
  parsePostfixExpression() {
    this.pushStart();
    let e = this.parsePrimaryExpression();
    for (;;) {
      switch (this.token) {
        case '.':
          this.next();
          this.pushStart();
          let x = this.expect('IDENT');
          let nameLoc = this.popLoc();
          e = new SelectExpression(this.dupLoc(), e, nameLoc, x);
          break;
        default:
          this.popLoc();
          return e;
      }
    }
  }

  parseMultiplicativeExpression() {
    this.pushStart();
    let e = this.parsePostfixExpression();
    for (;;) {
      switch (this.token) {
        case '*':
        case '/':
          let op = this.token;
          this.next();
          let rightOperand = this.parsePostfixExpression();
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
      case "TYPE_IDENT":
        this.next();
        return new TypeExpression(this.popLoc(), this.lastValue);
      default:
        this.popLoc();
        return null;
    }
  }
  
  parseType() {
    let type = this.tryParseType();
    if (type == null)
      this.parseError("Type expected");
    return type;
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
  
  parseClassMemberDeclaration() {
    this.pushStart();
    let type = this.parseType();
    let x = this.expect('IDENT');
    this.expect(';');
    return new FieldDeclaration(this.popLoc(), type, x);
  }
  
  parseDeclaration() {
    this.pushStart();
    switch (this.token) {
      case 'class':
        this.next();
        let x = this.expect('TYPE_IDENT');
        this.expect('{');
        let fields = [];
        while (this.token != '}')
          fields.push(this.parseClassMemberDeclaration());
        this.expect('}');
        return new Class(this.popLoc(), x, fields);
      default:
        this.parseError("Keyword 'class' expected");
    }
  }
  
  parseDeclarations() {
    let declarations = [];
    while (this.token != 'EOF')
      declarations.push(this.parseDeclaration());
    return declarations;
  }
}

let classes;

function checkDeclarations(declarations) {
  classes = {};
  for (let declaration of declarations) {
    if (has(classes, declaration.name))
      throw new LocError(declaration.loc, "A class with the same name already exists");
    classes[declaration.name] = declaration;
  }
}

let variablesTable = document.getElementById('variables');
let toplevelScope = new Scope(null);
let mainStackFrame = {title: "(toplevel)", env: toplevelScope}
let callStack = [mainStackFrame]

let callStackArrows = []

function createArrow(fromNode, toNode) {
  let svg = document.getElementById('arrows-svg');
  let arrow = document.createElementNS('http://www.w3.org/2000/svg','line');
  svg.appendChild(arrow);
  let fromRect = fromNode.getClientRects()[0];
  let toRect = toNode.getClientRects()[0];
  let svgRect = svg.getClientRects()[0];
  let fromX = (fromRect.left + fromRect.right) / 2 - svgRect.left;
  let fromY = (fromRect.top + fromRect.bottom) / 2 - svgRect.top;
  arrow.x1.baseVal.value = fromX;
  arrow.y1.baseVal.value = fromY;
  let toX = toRect.left - svgRect.left;
  let toY = toRect.top - svgRect.top;
  arrow.x2.baseVal.value = toX;
  arrow.y2.baseVal.value = toY;
  arrow.style = "stroke:rgb(0,0,0);stroke-width:1";
  arrow.setAttribute('marker-end', "url(#arrowhead)");
  
  let maxX = Math.max(fromX, toX);
  if (svg.width.baseVal.value < maxX)
    svg.width.baseVal.newValueSpecifiedUnits(1, maxX);
  let maxY = Math.max(fromY, toY);
  if (svg.height.baseVal.value < maxY)
    svg.height.baseVal.newValueSpecifiedUnits(1, maxY);
  return arrow;
}

function updateStackArrows() {
  for (let arrow of callStackArrows) {
    arrow.arrow.parentNode.removeChild(arrow.arrow);
    arrow.arrow = createArrow(arrow.fromNode, arrow.toNode);
  }
}

function updateArrows() {
  updateStackArrows();
  updateFieldArrows();
}

function updateCallStack() {
  for (let arrow of callStackArrows)
    arrow.arrow.parentNode.removeChild(arrow.arrow);
  callStackArrows = [];
  
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
          updateMachineView();
        };
        nameCell.insertBefore(removeButton, nameCell.firstChild);
        nameCell.onmouseenter = () => {
          removeButton.style.display = "inline";
          setTimeout(updateArrows, 0);
        };
        nameCell.onmouseleave = () => {
          removeButton.style.display = "none";
          setTimeout(updateArrows, 0);
        };
      }
      let valueCell = document.createElement('td');
      row.appendChild(valueCell);
      valueCell.className = "stack-value-td";
      let valueDiv = document.createElement('div');
      valueCell.appendChild(valueDiv);
      valueDiv.className = "stack-value-div";
      if (binding.value instanceof JavaObject) {
        valueDiv.innerText = "()";
        valueDiv.style.color = "white";
        setTimeout(() => callStackArrows.push({arrow: createArrow(valueCell, binding.value.domNode), fromNode: valueCell, toNode: binding.value.domNode}), 0);
      } else
        valueDiv.innerText = binding.value;
    }
  }
}

function updateMachineView() {
  collectGarbage();
  updateCallStack();
  updateFieldArrows();
}

function executeStatements() {
  handleError(() => {
    parseDeclarations();
    let stmtsText = statementsEditor.getValue();
    let parser = new Parser(statementsEditor, stmtsText);
    let stmts = parser.parseStatements({'EOF': true});
    for (let stmt of stmts) {
      stmt.execute(toplevelScope);
    }
  });
  updateMachineView();
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

function parseDeclarations() {
  let text = declarationsEditor.getValue();
  let parser = new Parser(declarationsEditor, text);
  let decls = parser.parseDeclarations();
  checkDeclarations(decls);
}

function evaluateExpression() {
  handleError(() => {
    parseDeclarations();
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
  updateMachineView();
}

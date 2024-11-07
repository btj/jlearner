function assert(b) { if (!b) throw new Error("Assertion failure"); }

function isDigit(c) { return '0' <= c && c <= '9'; }
function isAlpha(c) { return 'A' <= c && c <= 'Z' || 'a' <= c && c <= 'z' || c == '_'; }

function has(object, propertyName) { return Object.prototype.hasOwnProperty.call(object, propertyName); }

keywordsList = [
  'abstract', 'assert',
  'boolean', 'break', 'byte',
  'case', 'catch', 'char', 'class', 'const', 'continue',
  'default', 'do', 'double',
  'else', 'enum', 'extends',
  'false', 'final', 'finally', 'float', 'for',
  'goto',
  'if', 'implements', 'import', 'instanceof', 'int', 'interface',
  'long',
  'native', 'new', 'null',
  'package', 'private', 'protected', 'public',
  'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized',
  'this', 'throw', 'throws', 'transient', 'true', 'try',
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
    this.startOfLine = 0;
    this.isOnNewLine = true;
    this.eat();
  }

  eat() {
    this.pos++;
    this.c = (this.pos == this.text.length ? "<EOF>" : this.text.charAt(this.pos));
  }

  getIndentation() {
    return this.text.slice(this.startOfLine, this.tokenStart);
  }

  nextToken() {
    eatWhite:
    for (;;) {
      switch (this.c) {
        case ' ':
        case '\t':
          this.eat();
          break;
        case '\n':
        case '\r':
          this.eat();
          this.startOfLine = this.pos;
          this.isOnNewLine = true;
          break;
        case '/':
          let commentStart = this.pos;
          if (this.pos + 1 < this.text.length) {
            switch (this.text.charAt(this.pos + 1)) {
              case '/':
                this.eat();
                this.eat();
                while (this.c != '<EOF>' && this.c != '\n' && this.c != '\r')
                  this.eat();
                continue eatWhite;
              case '*':
                this.eat();
                this.eat();
                for (;;) {
                  if (this.c == '<EOF>')
                    throw new LocError({doc: this.doc, start: commentStart, end: this.pos}, "Missing terminator for multiline comment");
                  else if (this.c == '*' && this.pos + 1 < this.text.length && this.text.charAt(this.pos + 1) == '/') {
                    this.eat();
                    this.eat();
                    continue eatWhite;
                  } else
                    this.eat();
                }
              default:
                break eatWhite;    
            }
          } else
            break eatWhite;
        default:
          break eatWhite;
      }
    }
    this.tokenStart = this.pos;
    this.tokenIsOnNewLine = this.isOnNewLine;
    this.isOnNewLine = false;
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

  getNameHTML() {
    return this.declaration.type.resolve().toHTML() + " " + this.declaration.name;
  }
}

class OperandBinding {
  constructor(expression, value) {
    this.expression = expression;
    this.value = value;
  }

  getNameHTML() {
    return "(operand)";
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

class StackFrame {
  constructor(title, env) {
    this.title = title;
    this.env = env;
    this.operands = [];
  }

  *allBindings() {
    yield* this.env.allBindings();
    for (let operand of this.operands)
      yield operand;
  }
}

class ASTNode {
  constructor(loc, instrLoc) {
    this.loc = loc;
    this.instrLoc = instrLoc;
  }

  async breakpoint() {
    await checkBreakpoint(this);
  }
  
  executionError(msg) {
    throw new ExecutionError(this.instrLoc, msg);
  }
}

class Expression extends ASTNode {
  constructor(loc, instrLoc) {
    super(loc, instrLoc);
  }

  check_(env) {
    this.type = this.check(env);
    return this.type;
  }

  checkAgainst(env, targetType, targetTypeExplanation) {
    let t = this.check_(env);
    if (targetType instanceof ReferenceType && t == nullType)
      return;
    if (!targetType.equals(t))
      this.executionError("Expression has type " + t + ", but an expression of type " + targetType + (targetTypeExplanation ? " (" + targetTypeExplanation + ")" : "") + " was expected");
  }
  
  async evaluateBinding(env) {
    this.executionError("This expression cannot appear on the left-hand side of an assignment");
  }

  push(value) {
    push(new OperandBinding(this, value));
  }
}

class IntLiteral extends Expression {
  constructor(loc, value, silent) {
    super(loc, loc);
    this.value = value;
    this.silent = silent;
  }

  check(env) {
    return intType;
  }

  async evaluate(env) {
    if (this.silent !== true)
      await this.breakpoint();
    this.push(+this.value);
  }
}

class BooleanLiteral extends Expression {
  constructor(loc, value, silent) {
    super(loc, loc);
    this.value = value;
    this.silent = silent;
  }

  check(env) {
    return booleanType;
  }

  async evaluate(env) {
    if (this.silent !== true)
      await this.breakpoint();
    this.push(this.value);
  }
}

class NullLiteral extends Expression {
  constructor(loc) {
    super(loc, loc);
  }

  check(env) {
    return nullType;
  }

  async evaluate(env) {
    await this.breakpoint();
    this.push(null);
  }
}

class UnaryOperatorExpression extends Expression {
  constructor(loc, instrLoc, operator, operand) {
    super(loc, instrLoc);
    this.operator = operator;
    this.operand = operand;
  }

  check(env) {
    switch (this.operator) {
      case '!':
        this.operand.checkAgainst(env, booleanType);
        return booleanType;
        default:
          this.executionError("Operator not supported");
    }
  }

  eval(v) {
    switch (this.operator) {
      case '!': return !v;
      default: this.executionError("Operator '" + this.operator + "' not supported.");
    }
  }
  
  async evaluate(env) {
    await this.operand.evaluate(env);
    await this.breakpoint();
    let [v] = pop(1);
    this.push(this.eval(v));
  }
}

class BinaryOperatorExpression extends Expression {
  constructor(loc, instrLoc, leftOperand, operator, rightOperand) {
    super(loc, instrLoc);
    this.leftOperand = leftOperand;
    this.operator = operator;
    this.rightOperand = rightOperand;
  }

  check(env) {
    switch (this.operator) {
      case '+':
      case '-':
      case '*':
      case '/':
      case '%':
      case '>>':
      case '>>>':
      case '<<':
      case '&':
      case '|':
      case '^':
        this.leftOperand.checkAgainst(env, intType);
        this.rightOperand.checkAgainst(env, intType);
        return intType;
      case '<':
      case '<=':
      case '>':
      case '>=':
        this.leftOperand.checkAgainst(env, intType);
        this.rightOperand.checkAgainst(env, intType);
        return booleanType;
      case '&&':
      case '||':
        this.leftOperand.checkAgainst(env, booleanType);
        this.rightOperand.checkAgainst(env, booleanType);
        return booleanType;
      case '==':
      case '!=':
        let lt = this.leftOperand.check_(env);
        let rt = this.rightOperand.check_(env);
        if (!(lt instanceof ReferenceType && rt instanceof ReferenceType))
         if (lt != rt)
           this.executionError("Cannot compare a " + lt + " and a " + rt);
        if (this.leftOperand instanceof NewExpression)
          this.executionError("An expression of the form 'new ... == ...' will always evaluate to 'false' because it compares the objects' identity, not their contents. To compare the objects' contents, compare their fields one by one.");
        if (this.leftOperand instanceof AbstractNewArrayExpression)
          this.executionError("An expression of the form 'new ... == ...' will always evaluate to 'false' because it compares the arrays' identity, not their contents. To compare the arrays' contents, compare their elements one by one.");
        if (this.rightOperand instanceof NewExpression)
          this.executionError("An expression of the form '... == new ...' will always evaluate to 'false' because it compares the objects' identity, not their contents. To compare the objects' contents, compare their fields one by one.");
        if (this.rightOperand instanceof AbstractNewArrayExpression)
          this.executionError("An expression of the form '... == new ...' will always evaluate to 'false' because it compares the arrays' identity, not their contents. To compare the arrays' contents, compare their elements one by one.");
        return booleanType;
      default:
        this.executionError("Operator not supported");
    }
  }

  eval(v1, v2) {
    switch (this.operator) {
      case '+': return (v1 + v2)|0;
      case '-': return (v1 - v2)|0;
      case '*': return (v1 * v2)|0;
      case '/': return (v1 / v2)|0;
      case '%': return (v1 % v2)|0;
      case '&': return v1 & v2;
      case '|': return v1 | v2;
      case '^': return v1 ^ v2;
      case '>>': return v1 >> v2;
      case '>>>': return v1 >>> v2;
      case '<<': return v1 << v2;
      case '==': return v1 == v2;
      case '!=': return v1 != v2;
      case '<': return v1 < v2;
      case '<=': return v1 <= v2;
      case '>': return v1 > v2;
      case '>=': return v1 >= v2;
      default: this.executionError("Operator '" + this.operator + "' not supported.");
    }
  }
  
  async evaluate(env) {
    await this.leftOperand.evaluate(env);
    if (this.operator == '&&' || this.operator == '||') {
      await this.breakpoint();
      let [b] = pop(1);
      if (b == (this.operator == '&&'))
        await this.rightOperand.evaluate(env);
      else
        this.push(b);
    } else {
      await this.rightOperand.evaluate(env);
      await this.breakpoint();
      let [v1, v2] = pop(2);
      this.push(this.eval(v1, v2));
    }
  }
}

class VariableExpression extends Expression {
  constructor(loc, name) {
    super(loc, loc);
    this.name = name;
  }

  check(env) {
    return env.lookup(this.loc, this.name).declaration.type.type;
  }
  
  async evaluateBinding(env) {
    return () => env.lookup(this.loc, this.name);
  }
  
  async evaluate(env) {
    await this.breakpoint();
    this.push(env.lookup(this.loc, this.name).value);
  }
}

class AssignmentExpression extends Expression {
  constructor(loc, instrLoc, lhs, op, rhs) {
    super(loc, instrLoc);
    this.lhs = lhs;
    this.op = op;
    this.rhs = rhs;
  }

  check(env) {
    if (this.op == '=') {
      let t = this.lhs.check_(env);
      let explanation;
      if (this.lhs instanceof VariableExpression)
        explanation = `the declared type of variable '${this.lhs.name}'`;
      else if (this.lhs instanceof SelectExpression)
        explanation = `the declared type of field '${this.lhs.selector}'`;
      else if (this.lhs instanceof SubscriptExpression)
        explanation = "the array's element type";
      this.rhs.checkAgainst(env, t, explanation);
      return t;
    } else  {
      this.lhs.checkAgainst(env, intType);
      this.rhs.checkAgainst(env, intType);
      return intType;
    }
  }

  evaluateOperator(lhs, rhs) {
    switch (this.op) {
      case '=': return rhs;
      case '+=': return (lhs + rhs)|0;
      case '-=': return (lhs - rhs)|0;
      case '*=': return (lhs * rhs)|0;
      case '/=': return (lhs / rhs)|0;
      case '%=': return (lhs % rhs)|0;
      case '&=': return lhs & rhs;
      case '|=': return lhs | rhs;
      case '^=': return lhs ^ rhs;
      case '>>=': return lhs >> rhs;
      case '>>>=': return lhs >>> rhs;
      case '<<=': return lhs << rhs;
      default:
        this.executionError("Operator not supported");
    }
  }
  
  async evaluate(env) {
    let bindingThunk = await this.lhs.evaluateBinding(env);
    if (this.op != '=')
      this.push(bindingThunk(peek).value);
    await this.rhs.evaluate(env);
    await this.breakpoint();
    let [rhs] = pop(1);
    let [lhsValue] = this.op == '=' ? [undefined] : pop(1);
    let lhs = bindingThunk(pop);
    let result = this.evaluateOperator(lhsValue, rhs);
    this.push(lhs.setValue(result));
  }
}

class IncrementExpression extends Expression {
  constructor(loc, instrLoc, operand, isDecrement, isPostfix) {
    super(loc, instrLoc);
    this.operand = operand;
    this.isDecrement = isDecrement;
    this.isPostfix = isPostfix;
  }

  check(env) {
    this.operand.checkAgainst(env, intType);
    return intType;
  }

  async evaluate(env) {
    let bindingThunk = await this.operand.evaluateBinding(env);
    await this.breakpoint();
    let lhs = bindingThunk(pop);
    let oldValue = lhs.value;
    if (this.isDecrement)
      lhs.value = (lhs.value - 1)|0;
    else
      lhs.value = (lhs.value + 1)|0;
    this.push(this.isPostfix ? oldValue : lhs.value);
  }
}

let objectsCount = 0;
let objectsShown = [];

function collectGarbage() {
  for (let o of objectsShown)
    o.marked = false;
  for (let stackFrame of callStack)
    for (let binding of stackFrame.allBindings())
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

function computeNextObjectY() {
  let svg = document.getElementById('arrows-svg');
  let svgRect = svg.getClientRects()[0];

  let nextObjectY = 0;
  
  for (let o of objectsShown) {
    let rect = o.domNode.getClientRects()[0];
    nextObjectY = Math.max(nextObjectY, rect.bottom - svgRect.top + 15);
  }

  return nextObjectY;
}

function createHeapObjectDOMNode(object) {
  let heap = document.getElementById('heap');
  let node = document.createElement('table');
  heap.appendChild(node);
  node.className = 'object-table';
  node.style.left = "0px";
  node.style.top = computeNextObjectY() + "px";
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
  updateHeapObjectDOMNode(node, object.fields);
  return node;
}

function updateHeapObjectDOMNode(node, fields) {
  while (node.lastChild != node.firstChild)
    node.removeChild(node.lastChild);

  for (let field in fields) {
    let fieldRow = document.createElement('tr');
    node.appendChild(fieldRow);
    let nameCell = document.createElement('td');
    fieldRow.appendChild(nameCell);
    nameCell.className = 'field-name';
    nameCell.innerText = field;
    let valueCell = document.createElement('td');
    fieldRow.appendChild(valueCell);
    valueCell.className = 'field-value';
    valueCell.innerText = fields[field].value;
    fields[field].valueCell = valueCell;
  }
}

function updateFieldArrows() {
  for (let o of objectsShown)
    o.updateFieldArrows();
}

async function updateAbstractFields() {
  for (let o of objectsShown)
    await o.updateAbstractFields();
}

async function setObjectsViewMode(abstract) {
  for (let o of objectsShown)
    o.setViewMode(abstract);
  if (abstract)
    await updateAbstractFields();
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
    if (value instanceof JavaObject && !isInAbstractViewMode()) {
      this.arrow = createArrow(this.valueCell, value.domNode);
      this.valueCell.innerText = "()";
      this.valueCell.style.color = "white";
    } else {
      this.valueCell.innerText = value == null ? "null" : value;
      this.valueCell.style.color = "black";
    }
    return value;
  }
  
  updateArrow() {
    this.setValue(this.value);
  }
}

class JavaObject {
  constructor(type, fields) {
    this.id = ++objectsCount;
    this.type = type;
    this.fields = fields;
    this.domNode = createHeapObjectDOMNode(this);
  }

  toString() {
    return this.type.toString() + " (id=" + this.id + ")";
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

  setViewMode(abstract) {
  }

  updateAbstractFields() {}
}

function initialClassFieldBindings(class_) {
  let fields = {};
  for (let field in class_.fields)
    fields[field] = new FieldBinding(class_.fields[field].type.resolve().defaultValue());
  return fields;
}

class JavaClassObject extends JavaObject {
  constructor(class_) {
    super(class_.type, initialClassFieldBindings(class_));
    this.class_ = class_;
    this.abstractViewMode = false;
    this.abstractFields = {};
    for (const [methodName, method] of Object.entries(this.class_.methods)) {
      if (method.parameterDeclarations.length == 0 && method.name.startsWith('get'))
        this.abstractFields[method.name + '()'] = new FieldBinding(null);
    }
    if (isInAbstractViewMode())
      this.setViewMode(true);
  }

  setViewMode(abstract) {
    this.abstractViewMode = abstract;
    updateHeapObjectDOMNode(this.domNode, abstract ? this.abstractFields : this.fields);
  }

  async updateAbstractFields() {
    for (const [methodName, method] of Object.entries(this.class_.methods)) {
      if (method.parameterDeclarations.length == 0 && method.name.startsWith('get')) {
        await method.call(undefined, [], this);
        const result = pop(1);
        this.abstractFields[method.name + '()'].setValue(result);
      }
    }
  }
}

function initialArrayFieldBindings(initialContents) {
  let fields = {};
  for (let i = 0; i < initialContents.length; i++)
    fields[i] = new FieldBinding(initialContents[i]);
  return fields;
}

class JavaArrayObject extends JavaObject {
  constructor(elementType, initialContents) {
    super(new ArrayType(elementType), initialArrayFieldBindings(initialContents));
    this.length = initialContents.length;
  }
}

class NewExpression extends Expression {
  constructor(loc, instrLoc, className, args) {
    super(loc, instrLoc);
    this.className = className;
    this.arguments = args;
  }

  check(env) {
    if (!has(classes, this.className))
      this.executionError("No such class: " + this.className);
    let class_ = classes[this.className];
    let parameterDeclarations = [];
    if (class_.ctor) {
      parameterDeclarations = class_.ctor.parameterDeclarations;
    }
    if (parameterDeclarations.length != this.arguments.length)
      this.executionError("Incorrect number of constructor arguments");
    for (let i = 0; i < this.arguments.length; i++)
      this.arguments[i].checkAgainst(env, parameterDeclarations[i].type.type, `the declared type of parameter '${parameterDeclarations[i].name}'`);
    return class_.type;
  }
  
  async evaluate(env) {
    if (!has(classes, this.className))
      this.executionError("No such class: " + this.className);
    let class_ = classes[this.className];
    let parameterDeclarations = [];
    if (class_.ctor) {
      parameterDeclarations = class_.ctor.parameterDeclarations;
    }
    if (parameterDeclarations.length != this.arguments.length)
      this.executionError("Incorrect number of constructor arguments");
    for (let e of this.arguments)
      await e.evaluate(env);
    await this.breakpoint();
    let args = pop(this.arguments.length);
    let newObject = new JavaClassObject(class_);
    if (class_.ctor) {
      await class_.ctor.call(this, args, newObject);
      pop(1);
    }
    this.push(newObject);
  }
}

class AbstractNewArrayExpression extends Expression {
  constructor(loc, instrLoc) {
    super(loc, instrLoc);
  }
}

class NewArrayExpression extends AbstractNewArrayExpression {
  constructor(loc, instrLoc, elementType, lengthExpr) {
    super(loc, instrLoc);
    this.elementType = elementType;
    this.lengthExpr = lengthExpr;
  }

  check(env) {
    this.elementType.resolve();
    this.lengthExpr.checkAgainst(env, intType);
    return new ArrayType(this.elementType.type);
  }

  async evaluate(env) {
    await this.lengthExpr.evaluate(env);
    await this.breakpoint();
    let [length] = pop(1);
    if (length < 0)
      this.executionError("Negative array length");
    this.elementType.resolve();
    this.push(new JavaArrayObject(this.elementType.type, Array(length).fill(this.elementType.type.defaultValue())));
  }
}

class NewArrayWithInitializerExpression extends AbstractNewArrayExpression {
  constructor(loc, instrLoc, elementType, elementExpressions) {
    super(loc, instrLoc);
    this.elementType = elementType;
    this.elementExpressions = elementExpressions;
  }

  check(env) {
    this.elementType.resolve();
    for (let e of this.elementExpressions)
      e.checkAgainst(env, this.elementType.type);
    return new ArrayType(this.elementType.type);
  }

  async evaluate(env) {
    for (let e of this.elementExpressions)
      await e.evaluate(env);
    await this.breakpoint();
    let elements = pop(this.elementExpressions.length);
    this.elementType.resolve();
    this.push(new JavaArrayObject(this.elementType.type, elements));
  }
}

class ReadOnlyBinding {
  constructor(value) {
    this.value = value;
  }
}

class SelectExpression extends Expression {
  constructor(loc, instrLoc, target, selectorLoc, selector) {
    super(loc, instrLoc);
    this.target = target;
    this.selectorLoc = selectorLoc;
    this.selector = selector;
  }

  check(env) {
    let targetType = this.target.check_(env);
    if (targetType instanceof ArrayType) {
      if (this.selector != "length")
        this.executionError("Arrays do not have a field named '" + this.selector + "'");
      return intType;
    }
    if (!(targetType instanceof ClassType))
      this.executionError("Target expression must be of class type");
    if (!has(targetType.class_.fields, this.selector))
      this.executionError("Class " + targetType.class_.name + " does not have a field named '" + this.selector + "'");
    return targetType.class_.fields[this.selector].type.type;
  }
  
  async evaluateBinding(env, allowReadOnly) {
    await this.target.evaluate(env);
    return pop => {
      let [target] = pop(1);
      if (target instanceof JavaArrayObject) {
        if (this.selector != "length")
          this.executionError(target + " does not have a field named '" + this.selector + "'");
        if (allowReadOnly !== true)
          this.executionError("Cannot modify an array's length");
        return new ReadOnlyBinding(target.length);
      }
      if (!(target instanceof JavaObject))
        this.executionError(target + " is not an object");
      if (!has(target.fields, this.selector))
        this.executionError("Target does not have a field named " + this.selector);
      return target.fields[this.selector];
    }
  }
  
  async evaluate(env) {
    let bindingThunk = await this.evaluateBinding(env, true);
    await this.breakpoint();
    this.push(bindingThunk(pop).value);
  }
}

class SubscriptExpression extends Expression {
  constructor(loc, instrLoc, target, index) {
    super(loc, instrLoc);
    this.target = target;
    this.index = index;
  }

  check(env) {
    let targetType = this.target.check_(env);
    if (!(targetType instanceof ArrayType))
      this.executionError("Target of subscript expression must be of array type");
    this.index.checkAgainst(env, intType);
    return targetType.elementType;
  }

  async evaluateBinding(env) {
    await this.target.evaluate(env);
    await this.index.evaluate(env);
    return pop => {
      let [target, index] = pop(2);
      if (!(target instanceof JavaArrayObject))
        this.executionError(target + " is not an array");
      if (index < 0)
        this.executionError("Negative array index " + index);
      if (target.length <= index)
        this.executionError("Array index " + index + " not less than array length " + target.length);
      return target.fields[index];
    }
  }

  async evaluate(env) {
    let bindingThunk = await this.evaluateBinding(env);
    await this.breakpoint();
    this.push(bindingThunk(pop).value);
  }
}

class CallExpression extends Expression {
  constructor(loc, instrLoc, callee, args) {
    super(loc, instrLoc);
    this.callee = callee;
    this.arguments = args;
  }

  check(env) {
    let method;
    if (this.callee instanceof VariableExpression) {
      if (!has(toplevelMethods, this.callee.name))
        this.executionError("No such top-level method: " + this.callee.name);
      method = toplevelMethods[this.callee.name];
    } else if (this.callee instanceof SelectExpression) {
      let targetType = this.callee.target.check(env);
      if (targetType instanceof ClassType) {
        if (!has(targetType.class_.methods, this.callee.selector))
          this.executionError(`No method called ${this.callee.selector} in class ${this.callee.target.class_.name}`);
        method = targetType.class_.methods[this.callee.selector];
      } else if (targetType instanceof ArrayType) {
        if (this.callee.selector != 'clone')
          this.executionError(`Array objects do not have a method called ${this.callee.selector}`);
        return targetType;
      } else
        this.executionError(`Cannot call a method on an expression of type ${targetType}`);
    } else
      this.executionError("The callee expression must be a method name");
    if (method.parameterDeclarations.length != this.arguments.length)
      this.executionError("Incorrect number of arguments");
    for (let i = 0; i < this.arguments.length; i++)
      this.arguments[i].checkAgainst(env, method.parameterDeclarations[i].type.type, `the declared type of parameter '${method.parameterDeclarations[i].name}'`);
    return method.returnType.type;
  }

  async evaluate(env) {
    let targetObject;
    let method;
    if (this.callee instanceof VariableExpression) {
      if (!has(toplevelMethods, this.callee.name))
        this.executionError("No such method: " + this.callee.name);
      method = toplevelMethods[this.callee.name];
    } else if (this.callee instanceof SelectExpression) {
      await this.callee.target.evaluate(env);
      let [targetObject_] = pop(1);
      targetObject = targetObject_;
      if (targetObject === null)
        this.executionError("Cannot call a method on null");
      if (targetObject.type instanceof ArrayType) {
        assert(this.callee.selector == 'clone');
        await this.breakpoint();
        let elements = [];
        for (let i = 0; i < targetObject.length; i++)
          elements.push(targetObject.fields[i].value);
        this.push(new JavaArrayObject(targetObject.type.elementType, elements));
        return;
      }
      method = targetObject.type.class_.methods[this.callee.selector];
    } else
      this.executionError("Callee expression must be a method name");
    if (method.parameterDeclarations.length != this.arguments.length)
      this.executionError("Incorrect number of arguments");
    for (let e of this.arguments)
      await e.evaluate(env);
    await this.breakpoint();
    let args = pop(this.arguments.length);
    await method.call(this, args, targetObject);
  }
}

class Type {
  constructor() {}
  toHTML() {
    let text = this.toString();
    if (has(keywords, text))
      return "<span class='keyword'>" + text + "</span>";
    return text;
  }
  equals(other) {
    return this == other;
  }
}

class IntType extends Type {
  constructor() { super(); }
  defaultValue() { return 0; }
  toString() { return "int"; }
}

let intType = new IntType();

class VoidType extends Type {
  constructor() { super(); }
  toString() { return "void"; }
}

let voidType = new VoidType();

class BooleanType extends Type {
  constructor() { super(); }
  defaultValue() { return false; }
  toString() { return "boolean"; }
}

let booleanType = new BooleanType();

class ReferenceType extends Type {
  constructor() { super(); }
  defaultValue() { return null; }
}

class NullType extends ReferenceType {
  constructor() { super(); }
  toString() { return "nulltype"; }
}

let nullType = new NullType();

class ClassType extends ReferenceType {
  constructor(class_) {
    super();
    this.class_ = class_;
  }
  toString() { return this.class_.name; }
}

class ArrayType extends ReferenceType {
  constructor(elementType) {
    super();
    this.elementType = elementType;
  }
  toString() { return this.elementType.toString() + "[]"; }
  toHTML() { return this.elementType.toHTML() + "[]"; }
  equals(other) {
    return other instanceof ArrayType && this.elementType.equals(other.elementType);
  }
}

class TypeExpression extends ASTNode {
  constructor(loc) {
    super(loc, loc);
  }
}

class LiteralTypeExpression extends TypeExpression {
  constructor(loc, type) {
    super(loc);
    this.type = type;
  }
  resolve() {
    return this.type;
  }
}

class ClassTypeExpression extends TypeExpression {
  constructor(loc, name) {
    super(loc);
    this.name = name;
  }
  resolve() {
    if (!has(classes, this.name))
      throw new LocError(this.loc, "No such class");
    return this.type = classes[this.name].type;;
  }
}

class ArrayTypeExpression extends TypeExpression {
  constructor(loc, elementTypeExpression) {
    super(loc);
    this.elementTypeExpression = elementTypeExpression;
  }
  resolve() {
    this.elementType = this.elementTypeExpression.resolve();
    this.type = new ArrayType(this.elementType);
    return this.type;
  }
}

class Statement extends ASTNode {
  constructor(loc, instrLoc) {
    super(loc, instrLoc);
  }
}

class VariableDeclarationStatement extends Statement {
  constructor(loc, instrLoc, type, nameLoc, name, init) {
    super(loc, instrLoc);
    this.type = type;
    this.nameLoc = nameLoc;
    this.name = name;
    this.init = init;
  }

  check(env) {
    this.type.resolve();
    if (env.tryLookup(this.name) != null)
      throw new ExecutionError(this.nameLoc, "Variable '" + this.name + "' already exists in this scope.");
    this.init.checkAgainst(env, this.type.type);
    env.bindings[this.name] = new LocalBinding(this, this.type.type);
  }
  
  async execute(env) {
    if (env.tryLookup(this.name) != null)
      throw new ExecutionError(this.nameLoc, "Variable '"+this.name+"' already exists in this scope.");
    await this.init.evaluate(env);
    await this.breakpoint();
    let [v] = pop(1);
    env.bindings[this.name] = new LocalBinding(this, v);
  }
}

class ExpressionStatement extends Statement {
  constructor(loc, instrLoc, expr) {
    super(loc, instrLoc);
    this.expr = expr;
  }

  check(env) {
    this.expr.check_(env);
  }
  
  async execute(env) {
    await this.expr.evaluate(env);
    pop(1);
  }
}

class ReturnStatement extends Statement {
  constructor(loc, instrLoc, operand) {
    super(loc, instrLoc);
    this.operand = operand;
  }

  check(env) {
    let resultType = env.tryLookup("#result");
    if (resultType == null)
      this.executionError("Cannot return here");
    if (this.operand == null) {
      if (resultType.value != voidType)
        this.executionError("Return value expected");
    } else {
      this.operand.checkAgainst(env, resultType.value, "the return type specified before the method name in the method header");
    }
  }

  async execute(env) {
    if (this.operand != null) {
      await this.operand.evaluate(env);
      await this.breakpoint();
      let [v] = pop(1);
      return v;
    } else {
      return "void";
    }
  }
}

class BlockStatement extends Statement {
  constructor(loc, stmts) {
    super(loc, loc);
    this.stmts = stmts;
  }

  check(env) {
    let scope = new Scope(env);
    for (let stmt of this.stmts)
      stmt.check(scope);
  }

  async execute(env) {
    let scope = new Scope(env);
    callStack[callStack.length - 1].env = scope;
    let result;
    for (let stmt of this.stmts) {
      result = await stmt.execute(scope);
      if (result !== undefined)
        break;
    }
    callStack[callStack.length - 1].env = env;
    return result;
  }
}

let iterationCount = 0;
let maxIterationCount = new URLSearchParams(window.location.search).get('maxIterationCount') || 1000;
const inModularMode = new URLSearchParams(window.location.search).get('modular') != null;

if (inModularMode)
  document.getElementById('abstractViewSpan').style.display = 'inline';

class WhileStatement extends Statement {
  constructor(loc, instrLoc, condition, body) {
    super(loc, instrLoc);
    this.condition = condition;
    this.body = body;
  }

  check(env) {
    this.condition.checkAgainst(env, booleanType);
    this.body.check(env);
  }

  async execute(env) {
    let result;
    while (result === undefined) {
      iterationCount++;
      if (iterationCount == maxIterationCount)
        this.executionError("Too many loop iterations. Possible infinite loop.");
      await this.condition.evaluate(env);
      await this.breakpoint();
      let [b] = pop(1);
      if (!b)
        break;
      result = await this.body.execute(env);
    }
    return result;
  }
}

class IfStatement extends Statement {
  constructor(loc, instrLoc, condition, thenBody, elseBody) {
    super(loc, instrLoc);
    this.condition = condition;
    this.thenBody = thenBody;
    this.elseBody = elseBody;
  }

  check(env) {
    this.condition.checkAgainst(env, booleanType);
    this.thenBody.check(env);
    if (this.elseBody != null)
      this.elseBody.check(env);
  }

  async execute(env) {
    await this.condition.evaluate(env);
    await this.breakpoint();
    let [b] = pop(1);
    if (b)
      return await this.thenBody.execute(env);
    else if (this.elseBody != null)
      return await this.elseBody.execute(env);
  }
}

class AssertStatement extends Statement {
  constructor(loc, instrLoc, condition) {
    super(loc, instrLoc);
    this.condition = condition;
  }
  
  check(env) {
    this.condition.checkAgainst(env, booleanType);
  }
  
  async execute(env) {
    await this.condition.evaluate(env);
    await this.breakpoint();
    let [b] = pop(1);
    if (!b)
      this.executionError("The assertion is false");
  }
}

class Declaration extends ASTNode {
  constructor(loc) {
    super(loc, null);
  }
}

class ParameterDeclaration extends Declaration {
  constructor(loc, type, nameLoc, name) {
    super(loc);
    this.type = type;
    this.nameLoc = nameLoc;
    this.name = name;
  }

  check() {
    this.type.resolve();
  }
}

let maxCallStackDepth = 100;

class ClassMemberDeclaration extends Declaration {
  constructor(loc, locIncludingLeadingWhitespace, isPrivate) {
    super(loc);
    this.locIncludingLeadingWhitespace = locIncludingLeadingWhitespace;
    this.isPrivate = isPrivate;
  }
}

class MethodDeclaration extends ClassMemberDeclaration {
  constructor(loc, locIncludingLeadingWhitespace, isPrivate, returnType, nameLoc, name, parameterDeclarations, bodyLoc, bodyBlock) {
    super(loc, locIncludingLeadingWhitespace, isPrivate);
    this.returnType = returnType;
    this.nameLoc = nameLoc;
    this.name = name;
    this.parameterDeclarations = parameterDeclarations;
    this.bodyLoc = bodyLoc;
    this.bodyBlock = bodyBlock;
    let closeBraceLoc = {doc: loc.doc, start: loc.end - 1, end: loc.end};
    this.implicitReturnStmt = new ReturnStatement(closeBraceLoc, closeBraceLoc);
  }

  enter(receiverClass) {
    this.receiverClass = receiverClass;
    if (this.receiverClass) {
      this.receiverParameter = new ParameterDeclaration(this.loc, new ClassTypeExpression(this.loc, this.receiverClass.name), this.loc, 'this');
      this.receiverParameter.check();
    }
    this.returnType.resolve();
    for (let p of this.parameterDeclarations)
      p.check();
  }

  check() {
    let env = new Scope(null);
    if (this.receiverClass)
      env.bindings['this'] = new LocalBinding(this.receiverParameter, this.receiverClass.type);
    for (let p of this.parameterDeclarations) {
      if (has(env.bindings, p.name))
        this.executionError("Duplicate parameter name");
      env.bindings[p.name] = new LocalBinding(p, p.type.type);
    }
    env.bindings["#result"] = new LocalBinding(this, this.returnType.type);
    for (let stmt of this.bodyBlock)
      stmt.check(env);
  }

  async call(callExpr, args, receiver) {
    let env = new Scope(null);
    if (callStack.length >= maxCallStackDepth)
      throw new LocError(callExpr.loc, "Maximum call stack depth (= " + maxCallStackDepth + ") exceeded");
    let stackFrame = new StackFrame(this.name, env);
    callStack.push(stackFrame);
    if (this.receiverClass)
      env.bindings['this'] = new LocalBinding(this.receiverParameter, receiver);
    for (let i = 0; i < args.length; i++)
      env.bindings[this.parameterDeclarations[i].name] = new LocalBinding(this.parameterDeclarations[i], args[i]);
    let result;
    for (let stmt of this.bodyBlock) {
      result = await stmt.execute(env);
      if (result !== undefined)
        break;
    }
    if (result === undefined) {
      if (this.returnType.type !== voidType)
        throw new LocError(this.implicitReturnStmt.loc, "Non-void method returns without a specifying a return value");
      await checkBreakpoint(this.implicitReturnStmt);
      result = "void";
    }
    callStack.pop();
    push(new OperandBinding(callExpr, result));
  }
}

class ConstructorDeclaration extends MethodDeclaration {
  constructor(loc, locIncludingLeadingWhitespace, isPrivate, nameLoc, name, parameterDeclarations, bodyLoc, bodyBlock) {
    super(loc, locIncludingLeadingWhitespace, isPrivate, new LiteralTypeExpression(loc, voidType), nameLoc, name, parameterDeclarations, bodyLoc, bodyBlock);
  }
}

class FieldDeclaration extends ClassMemberDeclaration {
  constructor(loc, locIncludingLeadingWhitespace, isPrivate, type, name) {
    super(loc, locIncludingLeadingWhitespace, isPrivate);
    this.type = type;
    this.name = name;
  }

  enter() {
    this.type.resolve();
  }
}

class Class extends Declaration {
  constructor(loc, name, members) {
    super(loc);
    this.name = name;
    this.type = new ClassType(this);
    this.fields = {};
    this.ctor = null;
    this.methods = {};
    for (let member of members) {
      if (member instanceof FieldDeclaration) {
        if (has(this.fields, member.name))
          member.executionError("A field with this name already exists in this class");
        this.fields[member.name] = member;
      } else if (member instanceof ConstructorDeclaration) {
        if (this.ctor != null)
          member.executionError("A constructor already exists in this class. JLearner does not support constructor overloading.");
        this.ctor = member;
      } else {
        assert(member instanceof MethodDeclaration);
        if (has(this.methods, member.name))
          member.executionError("A method with this name already exists in this class. JLearner does not support method overloading.");
        this.methods[member.name] = member;
      }
    }
  }

  enter() {
    for (let field in this.fields)
      this.fields[field].enter();
    if (this.ctor)
      this.ctor.enter(this);
    for (let method in this.methods)
      this.methods[method].enter(this);
  }

  check() {
    if (this.ctor)
      this.ctor.check();
    for (let method in this.methods)
      this.methods[method].check();
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
    this.lastPos = 0;
    this.token = this.scanner.nextToken();
    this.posStack = [];
  }

  pushStartIncludingLeadingWhitespace() {
    this.posStack.push(this.lastPos);
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
      if (token == 'IDENT')
        if (this.token == 'TYPE_IDENT')
          this.parseError("A variable or method name must start with a lowercase letter");
        else
          this.parseError("Name expected");
      else if (token == 'TYPE_IDENT')
        if (this.token == 'IDENT')
          this.parseError("A class name must start with an uppercase letter");
        else
          this.parseError("Class name expected");
      else
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
      case "this":
        this.next();
        return new VariableExpression(this.popLoc(), 'this');
      case "new":
        this.next();
        let instrLoc = this.dupLoc();
        let type = this.tryParsePrimaryType();
        if (type == null)
          this.parseError("Type expected");
        if (this.token == '[') {
          this.next();
          let lengthExpr = null;
          if (this.token != ']')
            lengthExpr = this.parseExpression();
          this.expect(']');
          while (this.token == '[') {
            this.next();
            this.expect(']');
            type = new ArrayTypeExpression(type.loc, type);
          }
          let elementExpressions = null;
          if (this.token == '{') {
            this.next();
            elementExpressions = [];
            if (this.token != '}') {
              for (;;) {
                elementExpressions.push(this.parseExpression());
                if (this.token != ',')
                  break;
                this.next();
              }
            }
            this.expect('}');
          }
          let loc = this.popLoc();
          if (lengthExpr != null) {
            if (elementExpressions != null)
              throw new LocError(loc, "Mention either a length or an initializer; not both.");
            return new NewArrayExpression(loc, instrLoc, type, lengthExpr);
          } else {
            if (elementExpressions == null)
              throw new LocError(loc, "Mention either a length or an initializer");
            return new NewArrayWithInitializerExpression(loc, instrLoc, type, elementExpressions);
          }
        }
        if (!(type instanceof ClassTypeExpression))
          throw new LocError(type.loc, "Class type expected");
        this.expect('(');
        let args = [];
        if (this.token != ')') {
          for (;;) {
            args.push(this.parseExpression());
            if (this.token != ',')
              break;
            this.next();
          }
        }
        this.expect(')');
        return new NewExpression(this.popLoc(), instrLoc, type.name, args);
      case "(":
        this.next();
        let e = this.parseExpression();
        this.expect(")");
        this.popLoc();
        return e;
      case "null":
        this.next();
        return new NullLiteral(this.popLoc());
      case "true":
      case "false": {
        let kwd = this.token;
        this.next();
        return new BooleanLiteral(this.popLoc(), kwd == "true");
      }
      case "++":
      case "--": {
        this.pushStart();
        let op = this.token;
        this.next();
        let instrLoc = this.popLoc();
        let e = this.parsePostfixExpression();
        return new IncrementExpression(this.popLoc(), instrLoc, e, op == '--', false);
      }
      case "-": {
        this.pushStart();
        let op = this.token;
        this.next();
        let instrLoc = this.popLoc();
        let e = this.parsePostfixExpression();
        return new BinaryOperatorExpression(this.popLoc(), instrLoc, new IntLiteral(instrLoc, 0, true), '-', e);
      }
      case "!": {
        this.pushStart();
        let op = this.token;
        this.next();
        let instrLoc = this.popLoc();
        let e = this.parsePostfixExpression();
        return new UnaryOperatorExpression(this.popLoc(), instrLoc, op, e);
      }
      case "{":
      case "[":
        this.parseError("A Java expression cannot start with { or [. To create an array, write 'new ElementType[] {Elements}'. For example: 'new int[] {10, 20, 30}'.");
      default:
        this.parseError("Number or identifier expected");
    }
  }
  
  parsePostfixExpression() {
    this.pushStart();
    let e = this.parsePrimaryExpression();
    for (;;) {
      switch (this.token) {
        case '.': {
          this.pushStart();
          this.next();
          this.pushStart();
          if (this.token != 'IDENT')
            this.parseError("Field name expected");
          let x = this.expect('IDENT');
          let nameLoc = this.popLoc();
          let instrLoc = this.popLoc();
          e = new SelectExpression(this.dupLoc(), instrLoc, e, nameLoc, x);
          break;
        }
        case '(': {
          this.pushStart();
          this.next();
          let instrLoc = this.popLoc();
          let args = [];
          if (this.token != ')') {
            for (;;) {
              args.push(this.parseExpression());
              if (this.token != ',')
                break;
              this.next();
            }
          }
          this.expect(')');
          e = new CallExpression(this.dupLoc(), instrLoc, e, args);
          break;
        }
        case '[': {
          this.pushStart();
          this.next();
          let instrLoc = this.popLoc();
          let index = this.parseExpression();
          this.expect(']');
          e = new SubscriptExpression(this.dupLoc(), instrLoc, e, index);
          break;
        }
        case '++':
        case '--': {
          this.pushStart();
          let op = this.token;
          this.next();
          let instrLoc = this.popLoc();
          e = new IncrementExpression(this.dupLoc(), instrLoc, e, op == '--', true);
          break;
        }
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
        case '%':
          this.pushStart();
          let op = this.token;
          this.next();
          let instrLoc = this.popLoc();
          let rightOperand = this.parsePostfixExpression();
          e = new BinaryOperatorExpression(this.dupLoc(), instrLoc, e, op, rightOperand);
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
          this.pushStart();
          let op = this.token;
          this.next();
          let instrLoc = this.popLoc();
          let rightOperand = this.parseMultiplicativeExpression();
          e = new BinaryOperatorExpression(this.dupLoc(), instrLoc, e, op, rightOperand);
          break;
        default:
          this.popLoc();
          return e;
      }
    }
  }

  parseRelationalExpression() {
    this.pushStart();
    let e = this.parseAdditiveExpression();
    switch (this.token) {
      case '==':
      case '!=':
      case '<':
      case '<=':
      case '>':
      case '>=':
        this.pushStart();
        let op = this.token;
        this.next();
        let instrLoc = this.popLoc();
        let rhs = this.parseAdditiveExpression();
        return new BinaryOperatorExpression(this.popLoc(), instrLoc, e, op, rhs);
      default:
        this.popLoc();
        return e;
    }
  }
  
  parseConjunction() {
    this.pushStart();
    let e = this.parseRelationalExpression();
    if (this.token == '&&') {
      this.pushStart();
      this.next();
      let instrLoc = this.popLoc();
      let rhs = this.parseConjunction();
      return new BinaryOperatorExpression(this.popLoc(), instrLoc, e, '&&', rhs);
    } else {
      this.popLoc();
      return e;
    }
  }
  
  parseDisjunction() {
    this.pushStart();
    let e = this.parseConjunction();
    if (this.token == '||') {
      this.pushStart();
      this.next();
      let instrLoc = this.popLoc();
      let rhs = this.parseDisjunction();
      return new BinaryOperatorExpression(this.popLoc(), instrLoc, e, '||', rhs);
    } else {
      this.popLoc();
      return e;
    }
  }
  
  parseAssignmentExpression() {
    this.pushStart();
    let e = this.parseDisjunction();
    switch (this.token) {
      case '=':
      case '+=':
      case '-=':
      case '*=':
      case '/=':
      case '%=':
      case '>>=':
      case '<<=':
      case '>>>=':
      case '|=':
      case '&=':
      case '^=':
        this.pushStart();
        let op = this.token;
        this.next();
        let instrLoc = this.popLoc();
        let rightOperand = this.parseExpression();
        return new AssignmentExpression(this.popLoc(), instrLoc, e, op, rightOperand);
      default:
        this.popLoc();
        return e;
    }
  }

  parseExpression() {
    return this.parseAssignmentExpression();
  }

  tryParsePrimaryType() {
    this.pushStart();
    switch (this.token) {
      case "int":
        this.next();
        return new LiteralTypeExpression(this.popLoc(), intType);
      case "boolean":
        this.next();
        return new LiteralTypeExpression(this.popLoc(), booleanType);
      case "void":
        this.next();
        return new LiteralTypeExpression(this.popLoc(), voidType);
      case "TYPE_IDENT":
        this.next();
        return new ClassTypeExpression(this.popLoc(), this.lastValue);
      case "byte":
      case "short":
      case "long":
      case "float":
      case "double":
      case "char":
        this.parseError("Type '" + this.token + "' is not (yet) supported by JLearner. Use type 'int'.");
      default:
        this.popLoc();
        return null;
    }
  }
  
  tryParseType() {
    this.pushStart();
    let type = this.tryParsePrimaryType();
    if (type == null) {
      this.popLoc();
      return null;
    }
    while (this.token == '[') {
      this.next();
      this.expect(']');
      type = new ArrayTypeExpression(this.dupLoc(), type);
    }
    this.popLoc();
    return type;
  }
  
  parseType() {
    let type = this.tryParseType();
    if (type == null)
      this.parseError("Type expected");
    return type;
  }

  parseIndentedStatementBlock(parentIndentation, parentConstruct) {
    if (this.token == '{')
      return this.parseStatement();
    if (!this.scanner.tokenIsOnNewLine)
      this.parseError("In JLearner, this statement must be on a separate line");
    const blockIndentation = this.scanner.getIndentation();
    if (blockIndentation == parentIndentation || !blockIndentation.startsWith(parentIndentation))
      this.parseError(`This statement must be indented with respect to the ${parentConstruct} it is a part of`);
    this.pushStart();
    let stmts = [];
    for (;;) {
      stmts.push(this.parseStatement());
      if (!this.scanner.tokenIsOnNewLine || this.scanner.getIndentation() != blockIndentation)
        break;
    }
    const loc = this.popLoc();
    if (stmts.length != 1)
      throw new LocError(loc, `Only the first statement of this indented block is part of the ${parentConstruct}, because Java ignores indentation. Surround the block by { } to make Java recognize it as such.`);
    return stmts[0];
  }

  parseIfStatement(parentIndentation) {
    this.pushStart();
    this.next();
    let instrLoc = this.popLoc();
    this.expect('(');
    let condition = this.parseExpression();
    this.expect(')');
    let thenBody = this.parseIndentedStatementBlock(parentIndentation, "'if' statement");
    let elseBody = null;
    if (this.token == 'else') {
      this.next();
      if (this.token == 'if' && !this.scanner.tokenIsOnNewLine)
        elseBody = this.parseIfStatement(parentIndentation);
      else
        elseBody = this.parseIndentedStatementBlock(parentIndentation, "'else' branch");
    }
    return new IfStatement(this.popLoc(), instrLoc, condition, thenBody, elseBody);
  }
  
  parseStatement() {
    this.pushStart();
    switch (this.token) {
      case '{': {
        this.next();
        let stmts = this.parseStatements({'}': true, 'EOF': true});
        this.expect('}');
        return new BlockStatement(this.popLoc(), stmts);
      }
      case 'while': {
        const parentIndentation = this.scanner.getIndentation();
        this.pushStart();
        this.next();
        let instrLoc = this.popLoc();
        this.expect('(');
        let condition = this.parseExpression();
        this.expect(')');
        let body = this.parseIndentedStatementBlock(parentIndentation, "'while' statement");
        return new WhileStatement(this.popLoc(), instrLoc, condition, body);
      }
      case 'for': {
        let parentIndentation = this.scanner.getIndentation();
        this.pushStart();
        this.next();
        let instrLoc = this.popLoc();
        this.expect('(');
        let stmts = [];
        if (this.token != ';')
          stmts.push(this.parseStatement());
        else
          this.next();
        let condition;
        if (this.token == ';')
          condition = new BooleanLiteral(instrLoc, true, true);
        else
          condition = this.parseExpression();
        this.expect(';');
        let incrs = [];
        if (this.token != ')')
          for (;;) {
            incrs.push(this.parseExpression());
            if (this.token != ',')
              break;
            this.next();
          }
        this.expect(')');
        let body = this.parseIndentedStatementBlock(parentIndentation, "'for' statement");
        let loc = this.popLoc();
        let bodyStmts = [body];
        for (let incr of incrs)
          bodyStmts.push(new ExpressionStatement(incr.loc, incr.instrLoc, incr));
        stmts.push(new WhileStatement(loc, instrLoc, condition, new BlockStatement(loc, bodyStmts)));
        return new BlockStatement(loc, stmts);
      }
      case 'return': {
        this.pushStart();
        this.next();
        let instrLoc = this.popLoc();
        let e;
        if (this.token == ';')
          e = null;
        else
          e = this.parseExpression();
        this.expect(';');
        return new ReturnStatement(this.popLoc(), instrLoc, e);
      }
      case 'if': {
        let parentIndentation = this.scanner.getIndentation();
        return this.parseIfStatement(parentIndentation);
      }
      case 'assert': {
        this.pushStart();
        this.next();
        let instrLoc = this.popLoc();
        let condition = this.parseExpression();
        this.expect(';');
        return new AssertStatement(this.popLoc(), instrLoc, condition);
      }
    }
    this.pushStart();
    let type = this.tryParseType();
    if (type != null) {
      this.pushStart();
      if (this.token != 'IDENT')
        if (this.token == 'TYPE_IDENT')
          this.parseError("A variable name must start with a lowercase letter");
        else
          this.parseError("Variable name expected");
      let x = this.expect("IDENT");
      let nameLoc = this.popLoc();
      this.expect("=");
      let instrLoc = this.popLoc();
      let e;
      if (this.token == '{') {
        if (!(type instanceof ArrayTypeExpression))
          this.parseError("Cannot initialize this variable with an array initializer; its type is not an array type.");
        this.pushStart();
        this.pushStart();
        this.next();
        let newArrayInstrLoc = this.popLoc();
        let elementExpressions = [];
        if (this.token != '}') {
          for (;;) {
            elementExpressions.push(this.parseExpression());
            if (this.token != ',')
              break;
            this.next();
          }
        }
        this.expect('}');
        e = new NewArrayWithInitializerExpression(this.popLoc(), newArrayInstrLoc, type.elementTypeExpression, elementExpressions);
      } else
        e = this.parseExpression();
      this.expect(";");
      return new VariableDeclarationStatement(this.popLoc(), instrLoc, type, nameLoc, x, e);
    }
    this.popLoc();
    let e = this.parseExpression();
    this.pushStart();
    this.expect(";");
    let instrLoc = this.popLoc();
    return new ExpressionStatement(this.popLoc(), instrLoc, e);
  }
  
  parseStatements(terminators) {
    let statements = [];
    let indentation = null;
    while (!(this.token in terminators)) {
      if (!this.scanner.tokenIsOnNewLine)
        this.parseError("In JLearner, each statement must be on a separate line");
      if (indentation === null)
        indentation = this.scanner.getIndentation();
      else {
        const stmtIndentation = this.scanner.getIndentation();
        if (stmtIndentation !== indentation) {
          if (stmtIndentation.startsWith(indentation))
            this.parseError("Less indentation expected");
          else if (indentation.startsWith(stmtIndentation))
            this.parseError("More indentation expected. To end the block, insert a '}'");
          else
            this.parseError("Indentation does not match earlier statements in this block");
        }
      }
      let stmt = this.parseStatement();
      statements.push(stmt);
    }
    return statements;
  }
  
  parseModifiers() {
    switch (this.token) {
      case "public":
      case "protected":
      case "private":
      case "static":
      case "final":
        this.parseError("This modifier is not supported by JLearner");
    }
  }
  
  parseClassMemberDeclaration() {
    this.pushStartIncludingLeadingWhitespace();
    this.pushStart();
    let accessibility = null;
    for (;;) {
      switch (this.token) {
        case 'public':
        case 'private':
          if (accessibility != null)
            this.parseError("Multiple accessibility modifiers are not allowed for a single declaration");
          accessibility = this.token;
          this.next();
          break;
        case 'protected':
        case 'static':
        case 'final':
          this.parseError("This modifier is not supported by JLearner");
        default:
          let type = this.parseType();
          if (this.token == '(' && type instanceof ClassTypeExpression) {
            let nameLoc = this.dupLoc();
            let parameters = this.parseParameterList();
            this.pushStart();
            this.expect('{');
            let body = this.parseStatements({'}': true, 'EOF': true});
            this.expect('}');
            const bodyLoc = this.popLoc();
            return new ConstructorDeclaration(this.popLoc(), this.popLoc(), accessibility === 'private', nameLoc, type.name, parameters, bodyLoc, body);
          }
          if (this.token != 'IDENT')
            if (this.token == 'TYPE_IDENT')
              this.parseError("A field or method name must start with a lowercase letter");
            else
              this.parseError("Field or method name expected");
          this.pushStart();
          let x = this.expect('IDENT');
          let nameLoc = this.popLoc();
          if (this.token == '(') {
            let parameters = this.parseParameterList();
            this.pushStart();
            this.expect('{');
            let body = this.parseStatements({'}': true, 'EOF': true});
            this.expect('}');
            const bodyLoc = this.popLoc();
            return new MethodDeclaration(this.popLoc(), this.popLoc(), accessibility === 'private', type, nameLoc, x, parameters, bodyLoc, body);
          }
          if (this.token == '=')
            this.parseError("Field initializers are not (yet) supported by JLearner.");
          this.expect(';');
          return new FieldDeclaration(this.popLoc(), this.popLoc(), accessibility === 'private', type, x);
      }
    }
  }

  parseParameterList() {
    this.expect('(');
    let parameters = [];
    if (this.token != ')') {
      for (;;) {
        this.pushStart();
        let paramType = this.parseType();
        this.pushStart();
        if (this.token != 'IDENT')
          if (this.token == 'TYPE_IDENT')
            this.parseError("A parameter name must start with a lowercase letter");
          else
            this.parseError("Parameter name expected");
        let paramName = this.expect('IDENT');
        let paramNameLoc = this.popLoc();
        parameters.push(new ParameterDeclaration(this.popLoc(), paramType, paramNameLoc, paramName));
        if (this.token != ',')
          break;
        this.next();
      }
    }
    this.expect(')');
    return parameters;
  }
  
  parseDeclaration() {
    this.pushStartIncludingLeadingWhitespace();
    this.pushStart();
    let accessibility = null;
    for (;;) {
      switch (this.token) {
        case 'public':
          if (accessibility !== null)
            this.parseError("Only one accessibility modifier is allowed per declaration");
          this.next();
          accessibility = 'public';
          break;
        case 'class':
          this.next();
          let x = this.expect('TYPE_IDENT');
          this.expect('{');
          let members = [];
          while (this.token != '}')
            members.push(this.parseClassMemberDeclaration());
          this.expect('}');
          const loc = this.popLoc();
          this.popLoc();
          return new Class(loc, x, members);
        default:
          // Parse method
          let type = this.parseType();
          this.pushStart();
          if (this.token != 'IDENT')
            if (this.token == 'TYPE_IDENT')
              this.parseError("A method name must start with a lowercase letter");
            else
              this.parseError("Method name expected");
          let name = this.expect('IDENT');
          let nameLoc = this.popLoc();
          let parameters = this.parseParameterList();
          this.pushStart();
          this.expect('{');
          let body = this.parseStatements({'}': true, 'EOF': true});
          this.expect('}');
          const bodyLoc = this.popLoc();
          return new MethodDeclaration(this.popLoc(), this.popLoc(), false, type, nameLoc, name, parameters, bodyLoc, body);
      }
    }
  }
  
  parseDeclarations() {
    let declarations = [];
    while (this.token != 'EOF')
      declarations.push(this.parseDeclaration());
    return declarations;
  }
}

let lastCheckedDeclarations = null;
let classes;
let toplevelMethods;

let undoAbstractCodeView = null;

function setCodeViewMode(abstract) {
  if (abstract) {
    try {
      parseDeclarations();
      const marks = [];
      function collapseLoc(loc) {
        const {start, end} = getTextCoordsFromLoc(loc);
        const mark = loc.doc.markText(start, end, {collapsed: true});
        marks.push(mark);
      }
      for (const [methodName, method] of Object.entries(toplevelMethods))
        collapseLoc(method.bodyLoc);
      for (const [className, class_] of Object.entries(classes)) {
        for (const [fieldName, field] of Object.entries(class_.fields))
          if (field.isPrivate)
            collapseLoc(field.locIncludingLeadingWhitespace);
        if (class_.ctor)
          if (class_.ctor.isPrivate)
            collapseLoc(class_.ctor.locIncludingLeadingWhitespace);
          else
            collapseLoc(class_.ctor.bodyLoc);
        for (const [methodBody, method] of Object.entries(class_.methods))
          if (method.isPrivate)
            collapseLoc(method.locIncludingLeadingWhitespace);
          else
            collapseLoc(method.bodyLoc);
      }
      undoAbstractCodeView = () => {
        undoAbstractCodeView = null;
        for (const mark of marks) mark.clear();
      };
    } catch (e) {
      document.getElementById('abstractViewCheckbox').checked = false;
      throw e;
    }
  } else {
    undoAbstractCodeView();
  }
}

function isInAbstractViewMode() {
  return document.getElementById('abstractViewCheckbox').checked;
}

function setViewMode(abstract) {
  handleError(async () => {
    setCodeViewMode(abstract);
    await setObjectsViewMode(abstract);
  });
}

function checkDeclarations(declarations) {
  classes = {};
  toplevelMethods = {};
  for (let declaration of declarations) {
    if (declaration instanceof Class) {
      if (has(classes, declaration.name))
        throw new LocError(declaration.loc, "A class with the same name already exists");
      classes[declaration.name] = declaration;
    } else {
      if (has(toplevelMethods, declaration.name))
        throw new LocError(declaration.loc, "A method with the same name already exists");
      toplevelMethods[declaration.name] = declaration;
    }
  }
  for (let c in classes)
    classes[c].enter();
  for (let m in toplevelMethods)
    toplevelMethods[m].enter();
  for (let c in classes)
    classes[c].check();
  for (let m in toplevelMethods)
    toplevelMethods[m].check();
}

let variablesTable = document.getElementById('variables');
let toplevelScope;
let mainStackFrame;
let callStack;

function resetMachine() {
  toplevelScope = new Scope(null);
  mainStackFrame = new StackFrame("(toplevel)", toplevelScope);
  callStack = [mainStackFrame];
}

resetMachine();

function push(binding) {
  callStack[callStack.length - 1].operands.push(binding);
}

function peek(N) {
  let operands = callStack[callStack.length - 1].operands;
  let result = operands.slice(operands.length - N, operands.length);
  return result.map(binding => binding.value);
}

function pop(N) {
  let operands = callStack[callStack.length - 1].operands;
  let result = operands.slice(operands.length - N, operands.length);
  operands.length -= N;
  return result.map(binding => binding.value);
}

let callStackArrows = []

function createArrow(fromNode, toNode) {
  let svg = document.getElementById('arrows-svg');
  let arrow = document.getElementById('arrow').cloneNode(true);
  svg.appendChild(arrow);
  let fromRect = fromNode.getClientRects()[0];
  let toRect = toNode.getClientRects()[0];
  let svgRect = svg.getClientRects()[0];
  let fromX = (fromRect.left + fromRect.right) / 2 - svgRect.left;
  let fromY = (fromRect.top + fromRect.bottom) / 2 - svgRect.top;
  arrow.x1.baseVal.value = fromX;
  arrow.y1.baseVal.value = fromY;

  let toLeft = toRect.left - svgRect.left;
  let toRight = toRect.right - svgRect.left;
  let toTop = toRect.top - svgRect.top;
  let toBottom = toRect.bottom - svgRect.top;

  let toX = fromX < toLeft ? toLeft : fromX < toRight ? fromX : toRight;
  let toY = fromY < toTop ? toTop : fromY < toBottom ? fromY : toBottom;

  if ((toX - fromX) * (toX - fromX) + (toY - fromY) * (toY - fromY) < 400) {
    toX = fromX < (toLeft + toRight) / 2 ? toRight : toLeft;
    toY = fromY < (toTop + toBottom) / 2 ? toBottom : toTop;
  }

  arrow.x2.baseVal.value = toX;
  arrow.y2.baseVal.value = toY;
  arrow.style = "stroke:rgb(0,0,0);stroke-width:1";
  
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
    for (let binding of stackFrame.allBindings()) {
      let row = document.createElement('tr');
      callStackTable.appendChild(row);
      let nameCell = document.createElement('td');
      row.appendChild(nameCell);
      nameCell.className = "stack-variable-name";
      nameCell.innerHTML = binding.getNameHTML();
      if (resumeFunc == null && (binding instanceof LocalBinding || binding instanceof SyntheticVariableBinding)) {
        let removeButton = document.createElement('button');
        removeButton.innerText = "Remove";
        removeButton.style.display = "none";
        removeButton.onclick = () => {
          let name = binding instanceof LocalBinding ? binding.declaration.name : binding.name;
          delete toplevelScope.bindings[name];
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
        valueDiv.innerText = binding.value == null ? "null" : binding.value;
    }
  }
}

function updateMachineView() {
  iterationCount = 0;
  collectGarbage();
  updateCallStack();
  updateFieldArrows();
  updateButtonStates();
}

async function executeStatements(step) {
  await handleError(async () => {
    parseDeclarations();
    let stmtsText = statementsEditor.getValue();
    let parser = new Parser(statementsEditor, stmtsText);
    let stmts = parser.parseStatements({'EOF': true});
    let typeScope = new Scope(toplevelScope); // The type bindings should not be present when executing
    for (let stmt of stmts)
      stmt.check(typeScope);
    currentBreakCondition = () => step;
    for (let stmt of stmts) {
      if (await stmt.execute(toplevelScope) !== undefined)
        break;
    }
  });
  updateMachineView();
}

function resetAndExecute() {
  reset();
  executeStatements(false);
}

function getTextCoordsFromOffset(text, offset) {
  let line = 0;
  let lineStart = 0;
  for (;;) {
    let nextBreak = text.indexOf('\n', lineStart);
    if (nextBreak < 0 || offset <= nextBreak)
      return {line, ch: offset - lineStart};
    line++;
    lineStart = nextBreak + 1;
  }
}

function getTextCoordsFromLoc(loc) {
  const text = loc.doc.getValue();
  const start = getTextCoordsFromOffset(text, loc.start);
  const end = getTextCoordsFromOffset(text, loc.end);
  return {start, end};
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

async function handleError(body) {
  clearErrorWidgets();
  try {
    await body();
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
        editor.scrollIntoView(start);
    } else {
        errorWidgets.push(editor.markText(start, end, {className: "syntax-error"}));
        addErrorWidget(editor, start.line, ex.msg);
        editor.scrollIntoView({from: start, to: end}, 20);
      }
    } else {
      alert(ex);
    }
  }
}

function parseDeclarations() {
  let text = declarationsEditor.getValue();
  if (lastCheckedDeclarations != null && lastCheckedDeclarations == text)
    return;
  lastCheckedDeclarations = null;
  resetMachine();
  updateMachineView();
  let parser = new Parser(declarationsEditor, text);
  let decls = parser.parseDeclarations();
  checkDeclarations(decls);
  lastCheckedDeclarations = text;
}

class SyntheticVariableBinding {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }

  getNameHTML() {
    return this.name;
  }
}

let syntheticVariableCount = 0;

async function evaluateExpression(step) {
  await handleError(async () => {
    parseDeclarations();
    let exprText = expressionEditor.getValue();
    let parser = new Parser(expressionEditor, exprText);
    let e = parser.parseExpression();
    parser.expect("EOF");
    e.check_(toplevelScope);
    currentBreakCondition = () => step;
    await e.evaluate(toplevelScope);
    let [v] = pop(1);
    let valueText;
    if (e.type instanceof ReferenceType) {
      let varName = '$' + ++syntheticVariableCount;
      toplevelScope.bindings[varName] = new SyntheticVariableBinding(varName, v);
      valueText = varName;
    } else {
      valueText = "" + v;
    }
    resultsEditor.replaceRange(exprText, {line: resultsEditor.lastLine()});
    let resultsText = resultsEditor.getValue();
    let {line, ch} = getTextCoordsFromOffset(resultsText, resultsText.length);
    let text = " ==> " + valueText + "\r\n";
    resultsEditor.replaceRange(text, {line});
    resultsEditor.markText({line, ch}, {line}, {className: 'result', inclusiveRight: false});
    resultsEditor.scrollIntoView({line});
  });
  updateMachineView();
}

function markLoc(loc, className) {
  let text = loc.doc.getValue();
  return loc.doc.markText(getTextCoordsFromOffset(text, loc.start), getTextCoordsFromOffset(text, loc.end), {className});
}

let currentNode = null;
let currentBreakCondition = null;
let currentInstructionMark = null;
let resumeFunc = null;

function checkBreakpoint(node) {
  return new Promise((resolve, reject) => {
    if ((!isInAbstractViewMode() || callStack.length <= 1) && currentBreakCondition(node)) {
      currentNode = node;
      currentBreakCondition = null;
      currentInstructionMark = markLoc(node.instrLoc, "current-instruction");
      resumeFunc = () => {
        currentNode = null;
        currentInstructionMark.clear();
        resolve();
      };
      updateMachineView();
      if (isInAbstractViewMode())
        updateAbstractFields();
    } else {
      resolve();
    }
  });
}

function resume() {
  let f = resumeFunc;
  resumeFunc = null;
  f();
}

function isDifferentLine(loc1, loc2) {
  if (loc1.doc != loc2.doc)
    return true;
  let text = loc1.doc.getValue();
  let coords1 = getTextCoordsFromOffset(text, loc1.start);
  let coords2 = getTextCoordsFromOffset(text, loc2.start);
  return coords1.line != coords2.line;
}

function step() {
  let oldNode = currentNode;
  let oldStackSize = callStack.length;
  let oldStackFrame = callStack[oldStackSize - 1];
  currentBreakCondition = node => {
    if (callStack.length != oldStackSize || callStack[oldStackSize - 1] !== oldStackFrame)
      return true;
    return isDifferentLine(node.loc, oldNode.loc);
  };
  resume();
}

function smallStep() {
  currentBreakCondition = node => true;
  resume();
}

function stepOver() {
  let oldNode = currentNode;
  let oldStackSize = callStack.length;
  let oldStackFrame = callStack[oldStackSize - 1];
  currentBreakCondition = node => {
    if (callStack.length < oldStackSize || callStack[oldStackSize - 1] !== oldStackFrame)
      return true;
    if (callStack.length > oldStackSize)
      return false;
    return isDifferentLine(node.loc, oldNode.loc);
  };
  resume();
}

function stepOut() {
  let oldStackSize = callStack.length;
  let oldStackFrame = callStack[oldStackSize - 1];
  currentBreakCondition = node => {
    return callStack.length < oldStackSize || callStack[oldStackSize - 1] !== oldStackFrame;
  };
  resume();
}

function continue_() {
  currentBreakCondition = node => false;
  resume();
}

function reset() {
  currentNode = null;
  if (currentInstructionMark != null) {
    currentInstructionMark.clear();
    currentInstructionMark = null;
  }
  resumeFunc = null;

  resetMachine();
  updateMachineView();
}

function updateButtonStates() {
  let stepping = resumeFunc != null;
  document.getElementById('executeButton').disabled = stepping;
  document.getElementById('resetAndExecuteButton').disabled = stepping;
  document.getElementById('stepThroughStatementsButton').disabled = stepping;
  document.getElementById('evaluateButton').disabled = stepping;
  document.getElementById('stepThroughExpressionButton').disabled = stepping;

  document.getElementById('stepButton').disabled = !stepping;
  document.getElementById('smallStepButton').disabled = !stepping;
  document.getElementById('stepOverButton').disabled = !stepping;
  document.getElementById('stepOutButton').disabled = !stepping;
  document.getElementById('continueButton').disabled = !stepping;
}

modularExamples = [{
  title: 'squareRoot',
  declarations:
`/**
 * @pre | 0 <= x
 * @post | 0 <= result
 * @post | result * result <= x
 * @post | x < (result + 1) * (result + 1)
 */
int sqrt(int x) {
  int result = 0;
  while ((result + 1) * (result + 1) <= x)
    result++;
  return result;
}`,
  statements:
`assert sqrt(9) == 3;
assert sqrt(10) == 3;`,
  expression: `sqrt(0)`
}, {
  title: 'Interval',
  declarations:
`public class Interval {
  
  private int lowerBound;
  private int length;

  public int getLowerBound() {
    return this.lowerBound;
  }

  public int getLength() {
    return this.length;
  }

  public int getUpperBound() {
    return this.lowerBound + this.length;
  }
  
  public Interval(int lowerBound, int length) {
    this.lowerBound = lowerBound;
    this.length = length;
  }

  public void setLowerBound(int newLowerBound) {
    this.lowerBound = newLowerBound;
  }

  public void setLength(int newLength) {
    this.length = newLength;
  }

  public void setUpperBound(int newUpperBound) {
    this.length = newUpperBound - this.lowerBound;
  }

}`,
  statements:
`Interval myInterval = new Interval(3, 4);
assert myInterval.getLowerBound() == 3;
assert myInterval.getLength() == 4;
assert myInterval.getUpperBound() == 7;
myInterval.setUpperBound(9);
assert myInterval.getLength() == 6;`,
  expression: 'myInterval.getUpperBound()'
}, {
  title: 'IntList - flawed impl. (repr. exposure 1)',
  declarations:
`/**
 * Each instance of this class represents a sequence of int values.
 *
 * @immutable
 */
public class IntList {

  /** @invar | elements != null */
  private int[] elements;

  /**
   * @post | result != null
   * @creates | result
   */
  public int[] getElements() {
    return this.elements;
  }

  /**
   * @pre | 0 <= index && index < getElements().length
   * @post | result == getElements()[index]
   */
  public int getElementAt(int index) {
    return this.elements[index];
  }

  /**
   * @pre | elements != null
   * @post | Arrays.equals(getElements(), elements)
   */
  public IntList(int[] elements) {
    this.elements = elements; // FLAW: REPRESENTATION EXPOSURE!
  }
}`,
  statements:
`int[] myInts = {10, 20, 30};
IntList myIntList = new IntList(myInts);
assert myIntList.getElementAt(0) == 10;

myInts[0] = 11;
assert myIntList.getElementAt(0) == 10; // Fails!
// IntList objects are not immutable,
// even though the documentation for class IntList
// claims they are immutable.
// This implementation of class IntList is flawed: it
// performs representation exposure.`,
  expression: ''
}, {
  title: 'IntList - flawed impl. (repr. exposure 2)',
  declarations:
`/**
 * Each instance of this class represents a sequence of int values.
 *
 * @immutable
 */
public class IntList {

  /** @invar | elements != null */
  private int[] elements;

  /**
   * @post | result != null
   * @creates | result
   */
  public int[] getElements() {
    return this.elements; // FLAW: REPRESENTATION EXPOSURE!
  }

  /**
   * @pre | 0 <= index && index < getElements().length
   * @post | result == getElements()[index]
   */
  public int getElementAt(int index) {
    return this.elements[index];
  }

  /**
   * @pre | elements != null
   * @post | Arrays.equals(getElements(), elements)
   */
  public IntList(int[] elements) {
    this.elements = elements.clone();
  }
}`,
  statements:
`int[] myInts = {10, 20, 30};
IntList myIntList = new IntList(myInts);
assert myIntList.getElementAt(0) == 10;

myInts[0] = 11;
assert myIntList.getElementAt(0) == 10; // Succeeds!

int[] yourInts = myIntList.getElements();
yourInts[0] = 12;
assert myIntList.getElementAt(0) == 10; // Fails!
// IntList objects are not immutable,
// even though the documentation for class IntList
// claims they are immutable.
// This implementation of class IntList is flawed: it
// performs representation exposure.`,
  expression: ''
}, {
  title: 'IntList - correct impl.',
  declarations:
`/**
 * Each instance of this class represents a sequence of int values.
 *
 * @immutable
 */
public class IntList {

  /** @invar | elements != null */
  private int[] elements;

  /**
   * @post | result != null
   * @creates | result
   */
  public int[] getElements() {
    return this.elements.clone();
  }

  /**
   * @pre | 0 <= index && index < getElements().length
   * @post | result == getElements()[index]
   */
  public int getElementAt(int index) {
    return this.elements[index];
  }

  /**
   * @pre | elements != null
   * @post | Arrays.equals(getElements(), elements)
   */
  public IntList(int[] elements) {
    this.elements = elements.clone();
  }
}`,
  statements:
`int[] myInts = {10, 20, 30};
IntList myIntList = new IntList(myInts);
assert myIntList.getElementAt(0) == 10;

myInts[0] = 11;
assert myIntList.getElementAt(0) == 10; // Succeeds!

int[] yourInts = myIntList.getElements();
yourInts[0] = 12;
assert myIntList.getElementAt(0) == 10; // Succeeds!
// IntList objects are immutable.
// This implementation of class IntList complies with
// its documentation. It prevents
// representation exposure.`,
  expression: ''
}];

regularExamples = [{
  title: 'Factorial',
  declarations:
`/** @pre x is positive */
int fac(int x) {
  if (x == 1)
    return 1;
  else
    return x * fac(x - 1);
}`,
  statements:
`assert fac(2) == 2;
assert fac(4) == 24;`,
  expression: `fac(3)`
}, {
  title: 'Find an element in an array',
  declarations:
`int find(int[] haystack, int needle) {
  int index = 0;
  for (;;) {
    if (index == haystack.length)
      return -1;
    if (haystack[index] == needle)
      return index;
    index++;
  }
}`,
  statements:
`int[] numbers = {3, 13, 7, 2};
assert find(numbers, 13) == 1;
assert find(numbers, 8) == -1;`,
  expression: 'find(numbers, 7)'
}, {
  title: 'Copy an array',
  declarations:
`int[] copy(int[] array) {
  int[] copy = new int[array.length];
  for (int i = 0; i < array.length; i++)
    copy[i] = array[i];
  return copy;
}`,
  statements:
`int[] numbers = {10, 20, 30, 40};
int[] numbersCopy = copy(numbers);
assert numbersCopy != numbers;
assert numbersCopy.length == numbers.length;
for (int i = 0; i < numbers.length; i++)
  assert numbersCopy[i] == numbers[i];`,
  expression: ''
}, {
  title: 'Transpose a matrix (copy)',
  declarations:
`/** @pre The given matrix is square */
int[][] transpose(int[][] matrix) {
  int[][] t = new int[matrix.length][];
  for (int row = 0; row < matrix.length; row++)
    t[row] = new int[matrix.length];
  for (int row = 0; row < matrix.length; row++)
    for (int column = 0; column < matrix.length; column++)
      t[column][row] = matrix[row][column];
  return t;
}`,
  statements:
`int[][] myMatrix = {
  new int[] {1, 2, 3},
  new int[] {4, 5, 6},
  new int[] {7, 8, 9}
};
int[][] myTranspose = transpose(myMatrix);`,
  expressions: ''
}, {
  title: 'Transpose a matrix (in place)',
  declarations:
`/** @pre The given matrix is square */
void transpose(int[][] matrix) {
  for (int row = 0; row < matrix.length; row++)
    for (int column = row + 1; column < matrix.length; column++) {
      int element = matrix[row][column];
      matrix[row][column] = matrix[column][row];
      matrix[column][row] = element;
    }
}`,
  statements:
`int[][] myMatrix = {
  new int[] {1, 2, 3},
  new int[] {4, 5, 6},
  new int[] {7, 8, 9}
};
transpose(myMatrix);`,
  expressions: ''
}, {
  title: 'Account transfer',
  declarations:
`class Account {
  int balance;
}
void transfer(Account from, Account to, int amount) {
  from.balance -= amount;
  to.balance += amount;
}`,
  statements:
`Account account1 = new Account();
Account account2 = new Account();
transfer(account1, account2, 500);
assert account1.balance == -500;
assert account2.balance == 500;
transfer(account1, account1, 200);
assert account1.balance == -500;`,
  expression: ''
}, {
  title: 'Linked list: sum (iterative)',
  declarations:
`class Node {
  int value;
  Node next;
}
int sum(Node node) {
  int sum = 0;
  while (node != null) {
    sum += node.value;
    node = node.next;
  }
  return sum;
}`,
  statements:
`Node first = new Node();
first.value = 1;
Node second = new Node();
second.value = 2;
Node third = new Node();
third.value = 3;
first.next = second;
second.next = third;
assert sum(first) == 6;`,
  expression: 'sum(first)'
}, {
  title: 'Linked list: sum (recursive)',
  declarations:
`class Node {
  int value;
  Node next;
}
int sum(Node node) {
  if (node == null)
    return 0;
  else
    return node.value + sum(node.next);
}`,
  statements:
`Node first = new Node();
first.value = 1;
Node second = new Node();
second.value = 2;
Node third = new Node();
third.value = 3;
first.next = second;
second.next = third;
assert sum(first) == 6;`,
  expression: 'sum(first)'
}, {
  title: 'linked list: copy',
  declarations:
`class Node {
  int value;
  Node next;
}
Node copy(Node node) {
  if (node == null)
    return null;
  Node newNode = new Node();
  newNode.value = node.value;
  newNode.next = copy(node.next);
  return newNode;
}`,
  statements:
`Node first = new Node();
first.value = 1;
Node second = new Node();
second.value = 2;
Node third = new Node();
third.value = 3;
first.next = second;
second.next = third;
Node copied = copy(first);
assert copied != first;
assert copied.value == first.value;
assert copied.next != first.next;
assert copied.next.value == first.next.value;`,
  expression: ''
}];

examples = inModularMode ? modularExamples : regularExamples;

function setExample(example) {
  reset();
  declarationsEditor.setValue(example.declarations || "");
  statementsEditor.setValue(example.statements || "");
  expressionEditor.setValue(example.expression || "");
  if (isInAbstractViewMode())
    setViewMode(true);
}

setExample(examples[0]);

{
  let examplesNode = document.getElementById('examples');
examplesNode.onchange = event => { if (event.target.selectedOptions.length > 0) event.target.selectedOptions[0].my_onselected(); };
  for (let example of examples) {
    let exampleOption = document.createElement('option');
    examplesNode.appendChild(exampleOption);
    exampleOption.innerText = example.title;
    exampleOption.my_onselected = () => setExample(example);
  }
}

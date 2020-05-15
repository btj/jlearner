# The JLearner Programming Language

JLearner is a small subset of Java. It includes enough features of Java to be
able to serve as a vehicle for conveying the essential principles of
programming in Java, while remaining small enough to be able to be presented
fully to students taking a second programming course.

## JLearner Expressions

The JLearner *expressions* are:
- the *literal expressions*, e.g. `true`, `42`, `null`
- the *operator expressions*, e.g. `3 + 5` or `x = y * 3`
- the *variable expressions*, e.g. `x` or `myVariable`
- the *object creation expressions*, e.g. `new Rectangle()` or `new int[7]`
- the *field selection expressions*, e.g. `myRectangle.width`
- the *array element selection expressions*, e.g. `myArray[5]`
- the *method call expressions*, e.g. `myMethod(42, false)`
- the *parenthesized expressions*, e.g. `(7 - 1)`

The literal expressions are:
- the *boolean literal expressions*, `true` and `false`
- the *integer literal expressions*, e.g. `10`, `42`, `739`
- the *null literal expression*, `null`

The operator expressions are:
- the *unary operator expressions*, e.g. `-3`, `++x`, `y--`, `-myMethod(77)`
- the *binary operator expressions*, e.g. `myVariable / myMethod(10)`, `myVariable = 33`

The unary operator expressions are:
- the *negation expressions*, of the form `-Expression`, i.e. a negation sign followed by an expression.
- the *pre-decrement expressions*, of the form `--Expression`
- the *pre-increment expressions*, of the form `++Expression`
- the *post-decrement expressions*, of the form `Expression--`
- the *post-increment expressions*, of the form `Expression++`

The subexpression of a unary expression, e.g. the expression `E` in negation expression `-E`, is called the *operand expression* of the unary expression.

The binary operator expressions are:
- the *addition expressions*, of the form `Expression + Expression`
- the *subtraction expressions*, of the form `Expression - Expression`
- the *multiplication expressions*, of the form `Expression * Expression`
- the *division expressions*, of the form `Expression / Expression`
- the *remainder expressions*, of the form `Expression % Expression`
- the *equality expressions*, of the form `Expression == Expression`
- the *inequality expressions*, of the form `Expression != Expression`
- the *less-than expressions*, of the form `Expression < Expression`
- the *less-than-or-equals expressions*, of the form `Expression <= Expression`
- the *greater-than expressions*, of the form `Expression > Expression`
- the *greater-than-or-equals expressions*, of the form `Expression >= Expression`
- the *conjunction expressions*, of the form `Expression && Expression`
- the *disjunction expressions*, of the form `Expression || Expression`
- the *assignment expressions*, of the form `Expression = Expression`
- the *compound assignment expressions*, of the form `Expression op= Expression`, where `op` is one of `+`, `-`, `*`, `/`, `%`. For example: `x += 3` or `y *= 5`

The subexpressions of a binary operator expression, e.g. the expressions `E1` and `E2` in addition expression `E1 + E2`, are called the *left operand expression* (or *left-hand side*, abbreviated LHS) and the *right operand expression* (or *right-hand side*, abbreviated RHS) of the binary operator expression, respectively.

The variable expressions are the expressions of the form `VariableName`.

The object creation expressions are:
- the *class instance creation expressions*, of the form `new ClassName()`
- the *array creation expressions*, of the form `new Type[Expression]`

The field selection expressions are the expressions of the form `Expression.FieldName`.

The array element selection expressions are the expressions of the form `Expression[Expression]`.

The method call expressions are the expressions of the form `MethodName()` or `MethodName(Arguments)`, where `Arguments` is either an `Expression` or of the form `Arguments, Expression`.

The parenthesized expressions are the expressions of the form `(Expression)`.

### Precedence and associativity

The expression `1 + 2 * 3` is an addition expression whose right operand is a multiplication expression; it is not a multiplication expression whose left operand is an addition expression. This is because the multiplication operator has *higher precedence* than the addition operator.

Furthermore, `1 - 2 - 3` is a subtraction expression whose left operand is a subtraction expression; it is not a subtraction expression whose right operand is a subtraction expression. This is because the negation operator is *left-associative*.

The following table lists the operators in order of decreasing precedence.

| Operators | Associativity |
| --- | --- |
| Unary (`-`, `++`, `--`) | |
| `*` `/` `%` | Left |
| `+` `-` | Left |
| `==` `!=` `<` `<=` `>` `>=` | |
| `&&` | |
| `\|\|` | |
| `=` `op=` | Right |


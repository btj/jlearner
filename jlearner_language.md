# The JLearner Programming Language

JLearner is a small subset of Java. It includes enough features of Java to be
able to serve as a vehicle for conveying the essential principles of
programming in Java, while remaining small enough to be able to be presented
fully to students taking a second programming course.

## The syntax of JLearner

### Expressions

A JLearner *expression* is one of the following:
- a *literal expression*, e.g. `true`, `42`, `null`
- an *operator expression*, e.g. `3 + 5` or `x = y * 3`
- a *variable expression*, e.g. `x` or `myVariable`
- an *object creation expression*, e.g. `new Rectangle()` or `new int[7]`
- a *field selection expression*, e.g. `myRectangle.width`
- an *array element selection expression*, e.g. `myArray[5]`
- a *method call expression*, e.g. `myMethod(42, false)`
- a *parenthesized expression*, e.g. `(7 - 1)`

A literal expression is one of the following:
- a *boolean literal expression*, `true` or `false`
- an *integer literal expression*, e.g. `10`, `42`, `739`
- a *null literal expression*, `null`

An operator expression is one of the following:
- a *unary operator expression*, e.g. `-3`, `++x`, `y--`, `-myMethod(77)`
  
- a *binary operator expression*

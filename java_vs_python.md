# Principles of programming in Java for Python programmers

This document provides a quick introduction to the principles of programming in Java by mentioning the main differences with Python.

<table>
<tr><th>Python</th><th>Java</th><th>Comments</th></tr>
<tr><td>

```python
def area(width, height):
    return width * height
```

</td><td>

```java
int area(int width, int height) {
    return width * height;
}
```

</td><td>
Statement blocks are delimited using braces; indentation is ignored.
Simple statements are terminated with a semicolon.
Parameter names are preceded by the parameter type. The function name is preceded by the function's return type (= the type of result values).
</td></tr>
<tr>
<td>

```python
def fac(x):
    if x == 1:
        return 1
    else:
        return x * fac(x - 1)
```

</td><td>

```java
int fac(int x) {
    if (x == 1)
        return 1;
    else
        return x * fac(x - 1);
}
```

</td></tr>
<tr><td>

```python
def divides(a, b):
    x = a
    while x > b:
        x -= b
    return x == 0
```

</td><td>

```java
boolean divides(int a, int b) {
    int x = a;
    while (x > b)
        x -= b;
    return x == 0;
}
```

</td><td>
Local variable declarations specify the variable type. While loop conditions are enclosed in parentheses.
</td></tr>
<tr><td>

```python
x = 3
y = 2
assert x / y == 1.5
assert x // y == 1
```

</td><td>

```java
int x = 3;
int y = 2;
assert x / y == 1;
```

```java
double x = 3;
double y = 2;
assert x / y == 1.5;
```

</td>
<td>

In Java, the rounding behavior of `x / y` (rounding to an integer or not) depends on the type of `x` and `y`.
</td>
</tr><tr>
<td>

```python
sum = 0
for x in range(3, 6):
    sum += x
assert sum == 3 + 4 + 5
```

</td><td>

```java
int sum = 0;
for (int x = 3; x < 6; x++)
    sum += x;
assert sum == 3 + 4 + 5;
```

</td><td>

`for` loops specify an initialization (e.g. `int x = 3`, a loop condition (e.g. `x < 6`), and an update (e.g. `x++`).

</td></tr>
<tr><td>

```python
[1, 3, 5]
```

</td><td>

```java
new int[] {1, 3, 5}
```

</td></tr>
<tr><td>

```python
xs = [1, 3, 5]
sum = 0
for x in xs:
    sum += x
assert sum == 1 + 3 + 5
```

</td><td>

```java
int[] xs = new int[] {1, 3, 5};
int sum = 0;
for (int i = 0; i < xs.length; i++)
    sum += xs[i];
assert sum == 1 + 3 + 5;
```

</td><td>

Note: `int[] xs = new int[] {1, 3, 5};` can be abbreviated as `int[] xs = {1, 3, 5};`.

</td></tr>
<tr><td>

```python
def same(xs, ys):
    return xs is ys
```

</td><td>

```java
boolean same(int[] xs, int[] ys) {
    return xs == ys;
}
```

</td><td>

In Java, if `xs` and `ys` are arrays, `xs == ys` compares the arrays' **identity**, not their **contents**. That is, it returns `true` only if `xs` and `ys` refer to the same array object, i.e. the same memory location. It corresponds to Python's `is` operator.

</td></tr>
<tr><td>

```python
def equals(xs, ys):
    return xs == ys
```

</td><td>

```java
boolean equals(int[] xs, int[] ys) {
    int m = xs.length;
    int n = ys.length;
    if (m != n)
        return false;
    for (int i = 0; i < m; i++)
        if (xs[i] != ys[i])
            return false;
    return true;
}
```

</td><td>

In Java, to compare the contents of two arrays you need to use a loop to compare the elements one-by-one. (In JLearner, you need to write such a loop yourself; in Java, you can use the library method `Arrays.equals`.)

</td></tr>
<tr><td>

```python
def slice(xs, a, b):
    return xs[a:b]
```

</td><td>

```java
int[] slice(int[] xs, int a, int b) {
    int[] s = new int[b - a];
    for (int i = a; i < b; i++)
        s[i - a] = xs[i];
    return s;
}
```
    
</td><td>

`new int[b - a]` creates a new zero-initialized array of length `b - a`.

</td></tr>
<tr><td>

```python
class Point2D:
    pass

p = Point2D()
p.x = 10
p.y = 20
```

</td><td>

```java
class Point2D {
    int x;
    int y;
}

Point2D p = new Point2D();
p.x = 10;
p.y = 20;
```

</td><td>

Attributes (called *fields* in Java) have to be declared.

</td></tr>
</table>

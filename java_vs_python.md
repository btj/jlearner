# Principles of programming in Java for Python programmers

This document provides a quick introduction to the principles of programming in Java by mentioning the main differences with Python.

<table>
<tr><th>Python</th><th>Java</th><th>Comments</th></tr>
<tr><td>

<pre><code class="language-python">
def area(width, height):
    return width * height
</code></pre>

</td><td>

<pre><code class="language-java">
int area(int width, int height) {
    return width * height;
}
</code></pre>

</td><td>
Statement blocks are delimited using braces; indentation is ignored.
Simple statements are terminated with a semicolon.
Parameter names are preceded by the parameter type. The function name is preceded by the function's return type (= the type of result values).
</td></tr>
<tr>
<td>

<pre><code class="language-python">
def fac(x):
    if x == 1:
        return 1
    else:
        return x * fac(x - 1)
</code></pre>

</td><td>

<pre><code class="language-java">
int fac(int x) {
    if (x == 1)
        return 1;
    else
        return x * fac(x - 1);
}
</pre>

</td></tr>
<tr><td>

<pre><code class="language-python">
def divides(a, b):
    x = a
    while x > b:
        x -= b
    return x == 0
</code></pre>

</td><td>

<pre><code class="language-java">
boolean divides(int a, int b) {
    int x = a;
    while (x > b)
        x -= b;
    return x == 0;
}
</code></pre>

</td><td>
Local variable declarations specify the variable type. While loop conditions are enclosed in parentheses.
</td></tr>
<tr><td>

<pre><code class="language-python">
x = 3
y = 2
assert x / y == 1.5
assert x // y == 1
</code></pre>

</td><td>

<pre><code class="language-java">
int x = 3;
int y = 2;
assert x / y == 1;
</code></pre>

<pre><code class="language-java">
double x = 3;
double y = 2;
assert x / y == 1.5;
</code></pre>

</td>
<td>

In Java, the rounding behavior of <code>x / y</code> (rounding to an integer or not) depends on the type of <code>x</code> and <code>y</code>.
</td>
</tr><tr>
<td>

<pre><code class="language-python">
sum = 0
for x in range(3, 6):
    sum += x
assert sum == 3 + 4 + 5
</code></pre>

</td><td>

<pre><code class="language-java">
int sum = 0;
for (int x = 3; x < 6; x++)
    sum += x;
assert sum == 3 + 4 + 5;
</code></pre>

</td><td>

<code>for</code> loops specify an initialization (e.g. <code>int x = 3</code>, a loop condition (e.g. <code>x &lt; 6</code>), and an update (e.g. <code>x++</code>).

</td></tr>
<tr><td>

<pre><code class="language-python">
xs = [1, 3, 5]
sum = 0
for x in xs:
    sum += x
assert sum == 1 + 3 + 5
</code></pre>

</td><td>

<pre><code class="language-java">
int[] xs = new int[] {1, 3, 5};
int sum = 0;
for (int i = 0; i < xs.length; i++)
    sum += xs[i];
assert sum == 1 + 3 + 5;
</code></pre>

</td><td>

Note: <code>int[] xs = new int[] {1, 3, 5};</code> can be abbreviated as <code>int[] xs = {1, 3, 5};</code>.

</td></tr>
<tr><td>

<pre><code class="language-python">
def equals(xs, ys):
    return xs == ys
</code></pre>

</td><td>

<pre><code class="language-java">
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
</code></pre>

</td></tr>
<tr><td>

<pre><code class="language-python">
def slice(xs, a, b):
    return xs[a:b]
</code></pre>

</td><td>

<pre><code class="language-java">
int[] slice(int[] xs, int a, int b) {
    int[] s = new int[b - a];
    for (int i = a; i < b; i++)
        s[i - a] = xs[i];
    return s;
}
</code></pre>
    
</td><td>

<code>new int[b - a]</code> creates a new zero-initialized array of length <code>b - a</code>.

</td></tr>
<tr><td>

<pre><code class="language-python">
class Point2D:
    pass

p = Point2D()
p.x = 10
p.y = 20
</code></pre>

</td><td>

<pre><code class="language-java">
class Point2D {
    int x;
    int y;
}

Point2D p = new Point2D();
p.x = 10;
p.y = 20;
</code></pre>

</td><td>

Attributes (called *fields* in Java) have to be declared.

</td></tr>
</table>

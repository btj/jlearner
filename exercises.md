# JLearner Exercises

For each exercise, write some `assert` statements that check that your solution works correctly. For example:
- Declarations:
  ```java
  int sum(int x, int y) { return x + y; }
  ```
- Statements:
  ```java
  assert sum(3, 4) == 7;
  assert sum(1, 2) == 3;
  ```

If you want to easily copy-paste all of your code into and out of JLearner in one step, write your statements inside a `main` method:
- Declarations:
  ```java
  int sum(int x, int y) { return x + y; }
  void main() {
    assert sum(3, 4) == 7;
    assert sum(1, 2) == 3;
  }
  ```
- Expression: `main()`

## Methods, loops

- Declare a method that computes the average (rounded toward zero) between two given integers (Note: in Java, if `x` and `y` are of type `int`, `x / y` is the quotient of `x` and `y`, rounded toward zero.)
- Declare a method that computes `x` to the power of `y`, for nonnegative `y` (recursive implementation)
- Declare a method that computes `x` to the power of `y`, for nonnegative `y` (iterative implementation)

## Arrays

- Declare a method that counts the number of zeroes in a given array
- Declare a method that replaces each element in an array by its negation
- Declare a method that returns a new array whose elements are the negation of the elements of a given array

## Objects:

- Declare a class of half-open intervals `[a, b)`, given by a lower bound `a` (inclusive) and an upper bound `b` (exclusive)
- Declare a method that returns the width of an interval
- Declare a method that returns whether a given number is in a given interval
- Declare a method that returns whether two given intervals overlap
- Declare a method that returns the narrowest interval that includes two given intervals
- Declare a method that shifts a given interval by a given amount
- Declare a method that returns a new interval object that is equal to a given interval, shifted by a given amount

## Linked lists:

- Declare a class of linked list nodes, given by a value and a pointer to the next node
- Declare a method that counts the number of zeros in a given linked list (recursive implementation)
- Declare a method that counts the number of zeros in a given linked list (iterative implementation)
- Declare a method that replaces each element of a given linked list by its negation (recursive implementation)
- Declare a method that replaces each element of a given linked list by its negation (iterative implementation)
- Declare a method that returns a new linked list whose elements are the negation of a given linked list (recursive implementation)

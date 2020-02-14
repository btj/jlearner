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
- Declare a method that computes `x` to the power of `y`, for nonnegative `y` (iterative implementation)
- Declare a method that computes `x` to the power of `y`, for nonnegative `y` (recursive implementation)
- Declare a method that computes the square root (rounded down) of a given nonnegative integer. (Find the largest integer whose square is not greater than the given number.)

## Arrays

- Declare a method that counts the number of zeroes in a given array
- Declare a method that replaces each element in an array by its negation
- Declare a method that returns a new array whose elements are the negation of the elements of a given array

## Objects

- Declare a class `Vector` such that an object of this class can be used to store a two-dimensional vector with integer coordinates `x` and `y`. (That is, declare a class `Vector` with a field `x` and a field `y`.)
- Declare a method that returns the size (rounded down) of the vector stored in a given `Vector` object. (Use the square root method you declared earlier.)
- Declare a method that returns whether the vector stored in one given `Vector` object is larger than the vector stored in another given `Vector` object. Use the size method you declared in the previous exercise.
- Declare a method that returns a new `Vector` object that stores the sum of the vectors stored in two given `Vector` objects.
- Declare a method that translates (shifts) the vector stored in a given `Vector` object by the vector stored in another given `Vector` object. It updates the first `Vector` object; it does not create a new object.

## Siblings

A person is a sibling of another person if they are either a brother or a sister of the other person. For these exercises, assume no two siblings have the same age.

- Declare a class such that an object of this class can be used to store the age and the next oldest sibling of a person. (That is, declare a class `Person` with a field `age` and a field `nextOldestSibling`.) (The next oldest sibling of a person is the oldest sibling of that person that is younger than that person.) If a person has no younger siblings, store `null` in the corresponding `nextOldestSibling` field.
- Declare a method that counts the number of younger siblings of some person, given a `Person` object corresponding to that person (iterative implementation).
- Declare a method that counts the number of younger siblings of some person, given a `Person` object corresponding to that person (recursive implementation).
- Declare a method that counts the number of adult younger siblings of a some person, given a `Person` object corresponding to that person  (iterative implementation).
- Declare a method that counts the number of adult younger siblings of a some person, given a `Person` object corresponding to that person  (recursive implementation).
- Declare a method that increments the age stored for some person, as well the ages stored for the person's younger siblings by one, given a `Person` object corresponding to that person (iterative implementation).
- Declare a method that increments the age stored for some person, as well the ages stored for the person's younger siblings by one, given a `Person` object corresponding to that person (recursive implementation).
- Declare a method that updates the `Person` object corresponding to the youngest sibling of some person _p_ to reflect the fact that a new sibling (age 0) was born, given a `Person` object corresponding to person _p_ (iterative implementation).
- Declare a method that updates the `Person` object corresponding to the youngest sibling of some person _p_ to reflect the fact that a new sibling (age 0) was born, given a `Person` object corresponding to person _p_ (recursive implementation).

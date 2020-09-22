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

## Sorting

### Insertion sort

- Declare a method `insert` such that `insert(array, n, v)` inserts value `v` into the sorted sequence of values stored at indices 0 (inclusive) through `n` (exclusive) of `array`, such that afterwards, the sequence of values stored at indices 0 (inclusive) through `n + 1` (exclusive) is sorted. You will need to shift the elements of the sequence that are greater than `v` one position to the right. You may assume that the given array has length `n + 1` or greater.
- Declare a method `insertionSort` such that `insertionSort(array)` replaces the sequence of values stored in `array` with a sorted version of that sequence. Hint: first use `insert` to insert the second element into the sequence at indices 0 (inclusive) through 1 (exclusive). Then use `insert` to insert the third element into the sequence at indices 0 (inclusive) through 2 (exclusive). And so on.

### Selection sort

- Declare a method `removeGreatest` such that `removeGreatest(array, n)` returns the greatest element of the sequence of values stored at indices 0 (inclusive) through `n` (exclusive) in `array`, and removes one occurrence of that element from the sequence. You will need to shift the elements that appear after the removed element to the left by one position.
- Declare a method `selectionSort` such that `selectionSort(array)` replaces the sequence of values stored in `array` with a sorted version of that sequence. Hint: first use `removeGreatest` to remove the greatest element of the sequence and then put that element in the last position. Then use `removeGreatest` to remove the greatest element of the remaining sequence and then put that element in the one-but-last position. And so on.

### Merge sort

- Declare a method `merge` such that `merge(array1, array2)` returns an array that satisfies the following properties:
  - for each value V, the number of occurrences of V in the result array equals the number of occurrences of V in `array1` plus the number of occurrences of V in `array2`
  - if `array1` and `array2` are sorted (i.e. the elements stored in the array are in stored ascending order), then the result array is sorted as well.
- Declare a method `subarray` such that `subarray(array, a, b)` returns an array of length `b - a` that contains the elements at indices `a` (inclusive) through `b` (exclusive) of `array`.
- Declare a method `mergeSort` such that `mergeSort(array)` returns a new array that stores the sequence of values obtained by sorting the sequence of values stored in `array`. Hint: if the length of the array is 0 or 1, just return a copy of the array. Otherwise, use `subarray` to get the two halves of `array`, sort them using a recursive call of `mergeSort`, and then merge them using `merge`.

## Search tree

- Declare a class `TreeNode` that represents a node in a search tree. Each node stores a reference to its first child node (or `null` if it has no children), its next sibling node (or `null` if it has no further siblings), and its value. The *children* of a node are the first child and its siblings.
- Declare a method that counts the number of children of a given node.
- Declare a method that returns an array containing the sequence of children of a given node.
- A node is called a *leaf* if it has no children. Declare a method that counts the number of descendants of a given node that are leaves. (Hint: use recursion.)
- Declare a method `addLeafValues(node, array, i)` that writes the values of the descendants of `node` that are leaves into `array` starting at index `i` and returns the number of values written. (Hint: use recursion.)
- Declare a method that returns an array containing the values of the descendants of a given node that are leaves. One can think of the tree rooted in the given node as storing this set of values.
- Declare a method that checks that the values of all descendants of a given node are less than or equal to a given value.
- Declare a method that checks that for each descendant D of a given node that has a next sibling, the values of the descendants of D that are leaves are less than or equal to the value of D. In this case, we say the tree is *valid*. We say a node is an *interior node* if it is not a leaf. The value of an interior node that has a next sibling serves as an *upper bound* on the values stored by the tree rooted in that node. (The value of an interior node that does not have a next sibling has no meaning.)
- A sequence of trees is called a *forest*. Declare a method that adds a given value to the forest rooted in a given node and returns the new root node. Specifically:
  - If the given node is a leaf and the given value is less than the node's value, create a new node with the given value as its value and the given node as its next sibling, and return the new node.
  - If the given node is a leaf and the given value equals the node's value, simply return the given node. (The tree already contains the value, so no action is required.)
  - If the given node is a leaf and the given value is greater than the node's value, recursively add the given value to the given node's next sibling, set the given node's next sibling reference to the return value, and return the given node.
  - If the given node is not a leaf and the given value is not greater than the node's value, recursively add the given value to the given node's first child, set the given node's first child reference to the return value, and return the given node.
  - If the given node is not a leaf and the given value is greater than the node's value, recursively add the given value to the given node's next sibling, set the given node's next sibling reference to the return value, and return the given node.

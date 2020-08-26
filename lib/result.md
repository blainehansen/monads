# `type Result<T, E = string> = Ok<T> | Err<E>`

This type is a much safer and more predictable alternative to exceptions. Since a `Result` type can either be a successful `Ok` or a failed `Err`, it allows very granular control of how and when errors are dealt with, without threatening to crash programs and cause bad behavior.

Since a function that could fail can choose to return a `Result` rather than throwing an exception, this creates a clear contract between the caller and the callee, and requires the caller to make some intelligent decision about how to deal with that error, rather than being surprised with an exception.

```ts
import { Result, Ok, Err } from '@blainehansen/monads'

function requireEven(n: number): Result<number> {
  if (n % 2 === 0)
    return Ok(n)
  else
    return Err(`n must be an even number: ${n}`)
}
```

## `Result<T, E>` instances

### `isOk(): this is Ok<T>`

Says if the value is an `Ok`. This is a guard, so you may access the inner `T` at `value`.

```ts
Ok(1).isOk() === true
Err("error").isOk() === false

const ok = Ok(1)
if (ok.isOk())
  const n: number = ok.value
```

### `isErr(): this is Err<E>`

Says if the value is an `Err`. This is a guard, so you may access the inner `E` at `error`.

```ts
Ok(1).isErr() === false
Err("error").isErr() === true

const err = Err("error")
if (err.isErr())
  const n: string = err.error
```

### `okMaybe(): Maybe<T>`

Converts the ok into a [`Maybe`](./maybe.md), discarding any error value.

```ts
Ok(1).okMaybe() === Some(1)
Err("error").okMaybe() === None
```

### `okUndef(): T | undefined`

Converts the ok into the internal value or `undefined`, discarding any error value.

```ts
Ok(1).okUndef() === 1
Err("error").okUndef() === undefined
```

### `okNull(): T | null`

Converts the ok into the internal value or `null`, discarding any error value.

```ts
Ok(1).okNull() === 1
Err("error").okNull() === null
```

### `errMaybe(): Maybe<E>`

Converts the error into a [`Maybe`](./maybe.md), discarding any ok value.

```ts
Ok(1).errMaybe() === None
Err("error").errMaybe() === Some("error")
```

### `errUndef(): E | undefined`

Converts the error into the internal value or `undefined`, discarding any ok value.

```ts
Ok(1).errUndef() === undefined
Err("error").errUndef() === "error"
```

### `errNull(): E | null`

Converts the error into the internal value or `null`, discarding any ok value.

```ts
Ok(1).errNull() === null
Err("error").errNull() === "error"
```

### `match<U>(fn: ResultMatch<T, E, U>): U`

```ts
type ResultMatch<T, E, U> = {
  ok: TransformerOrValue<T, U>,
  err: TransformerOrValue<E, U>,
}

type TransformerOrValue<T, U> = ((input: T) => U) | U
```

Matches on the value, taking a function to call or value to return for both the `Ok` and `Err` cases.

```ts
Ok(1).match({
  ok: number => "have a number",
  err: "don't have a number",
}) // => "have a number"

Err("error").match({
  ok: "have a number",
  err: error => error,
}) // => "error"
```


### `change<U>(fn: (value: T) => U): Result<U, E>`

Changes the internal value if it is `Ok`, else does nothing.

```ts
Ok(1).change(number => number + 1) === Ok(2)
Err("error").change(number => number + 1) === Err("error")
```

### `tryChange<U>(fn: (value: T) => Result<U, E>): Result<U, E>`

Changes the internal value with a fallible operation if it is `Ok`, else does nothing.

```ts
const func = number => number >= 0 ? Ok(number + 1) : Err("negative number")
Ok(1).tryChange(func) === Ok(2)
Err("started bad").tryChange(func) === Err("started bad")

Ok(-1).tryChange(func) === Err("negative number")
```

### `changeErr<U>(fn: (err: E) => U): Result<T, U>`

Changes the error if it is `Err`, else does nothing.

```ts
const func = error => `something went wrong: ${error}`
Ok(1).changeErr(func) === Ok(1)
Err("error").changeErr(func) === Err("something went wrong: error")
```


### `and<U>(other: ProducerOrValue<Result<U, E>>): Result<U, E>`

Changes the internal value to `other` if both are `Ok`, else returns the first `Err`.

`other` can be a function that returns a value, for lazy execution.

```ts
Ok(1).and(Ok('a')) === Ok('a')
Err("error").and(Ok('a')) === Err("error")
Ok(1).and(Err("error")) === Err("error")
Err("one error").and(Err("two error")) === Err("one error")

Ok(1).and(() => Ok('a')) === Ok('a')
```

### `or(other: ProducerOrValue<Result<T, E>>): Result<T, E>`

Returns the first `Ok` if either is `Ok`, else the first `Err`.

`other` can be a function that returns a value, for lazy execution.

```ts
Ok(1).or(Ok(2)) === Ok(1)
Err("error").or(Ok(2)) === Ok(2)
Ok(1).or(Err("error")) === Ok(1)
Err("one error").or(Err("two error")) === Err("one error")

Ok(1).or(() => Ok(2)) === Ok(1)
```

### `xor(other: ProducerOrValue<Result<T, E>>, sameErr: ProducerOrValue<E>): Result<T, E>`

Returns `this` or `other` if exactly one of them is `Ok`, else `Err`.

Both `other` and `sameErr` can be a function that returns a value, for lazy execution.

```ts
Ok(1).xor(Ok(2), "both Ok") === Err("both Ok")
Err("error").xor(Ok(2), "both Ok") === Ok(2)
Ok(1).xor(Err("error"), "both Ok") === Ok(1)
Err("one error").xor(Err("two error"), "both Ok") === Err("one error")

Ok(1).xor(() => Ok(2), () => "both Ok") === Err("both Ok")
```

### `default(def: ProducerOrValue<T>): T`

Returns the ok value if it is `Ok`, else `def`.

`def` can be a function that returns a value, for lazy execution.

```ts
Ok(1).default(0) === 1
Err("error").default(0) === 0

Err("error").default(() => 0) === 0
```

### `defaultErr(defErr: ProducerOrValue<E>): E`

Returns the err value if it is `Err`, else `defErr`.

`defaultErr` can be a function that returns a value, for lazy execution.

```ts
Ok(1).defaultErr("Uh oh") === "Uh oh"
Err("error").defaultErr("Uh oh") === "error"

Ok(1).defaultErr(() => "Uh oh") === "Uh oh"
```

### `expect(message: string): T | never`

Returns the ok value if it is `Ok`, otherwise throws an error with `message`. Use this cautiously!

```ts
Ok(1).expect("Uh oh") === 1
Err("error").expect("Uh oh") // throws Error("Uh oh")
```

### `expectErr(message: string): E | never`

Returns the err value if it is `Err`, otherwise throws an error with `message`. Use this cautiously!

```ts
Err("error").expectErr("Uh oh") === "error"
Ok(1).expectErr("Uh oh") // throws Error("Uh oh")
```

### `join<L extends any[]>(...args: ResultTuple<L, E>): ResultJoin<Unshift<T, L>, E>`

Joins `this` and many more `Result`s into a `ResultJoin`, which is detailed more below. Joining allows you to perform computations on many `Result`s that rely on them all being successful. All the `Result`s may be of different types.

### `joinCollectErr<L extends any[]>(...args: ResultTuple<L, E>): ResultJoin<Unshift<T, L>, E[]>`

Same as `join`, but collects all errors into an array.

```ts
const combineErr = Ok(1).join(Err("one error"), Err("two error"))
  .combine((one, two, three) => one + two + three)

combineErr === Err(["one error", "two error"])
```


## `type ResultJoin<L extends any[], E = string>`

The type created from joining `Results`s. Has methods to either combine the internal values or convert the join into a `Result`.

### `combine<T>(fn: (...args: L) => T): Result<T, E>`

Combines the internal `Result`s if they were all `Ok`, else does nothing and returns the `Err` created at the time of join.

```ts
const combineOk = Ok(1).join(Ok(2), Ok(3))
  .combine((one, two, three) => one + two + three)

combineOk === Ok(6)

const combineErr = Ok(1).join(Err("one error"), Err("two error"))
  .combine((one, two, three) => one + two + three)

combineErr === Err("one error")
```

### `tryCombine<T>(fn: (...args: L) => Result<T, E>): Result<T, E>`

Combines the internal `Result`s if they were all `Ok` with a fallible computation, else does nothing and returns the `Err` created at the time of join.

```ts
const func = (one, two, three) => {
  if (one < 0)
    return Err("error")
  else
    return one + two + three
}

const combineOk = Ok(1).join(Ok(2), Ok(3))
  .tryCombine(func)

combineOk === Ok(6)

const combineErr = Ok(-1).join(Ok(2), Ok(3))
  .tryCombine(func)

combineErr === Err("error")
```

### `intoResult(): Result<L, E>`

Converts the `ResultJoin` into a normal `Result` where the internal value is a tuple.

```ts
const combineOk = Ok(1).join(Ok('a'), Ok(true))
  .intoResult()

combineOk === Ok([1, 'a', true])

const combineErr = Ok(1).join(Err("error"), Ok(true))
  .intoResult()

combineErr === Err("error")
```


## `Result` static functions

### `Result.fromNillable<T, E>(value: T | null | undefined, err: ProducerOrValue<E>): Result<T, E>`

Converts an ordinary javascript value that could be `null | undefined` into a `Result`.

`err` can be a function that returns a value, for lazy execution.

```ts
Result.fromNillable(1, "was nillable") === Ok(1)
Result.fromNillable(null, "was nillable") === Err("was nillable")
Result.fromNillable(undefined, () => "was nillable") === Err("was nillable")
```

### `Result.isResult(value: any): value is Result<unknown, unknown>`

Checks if a value is a `Result`.

```ts
Result.isResult(Ok(1)) === true
Result.isResult(Err("error")) === true
Result.isResult('a') === false
```

### `Result.all<T, E>(results: Result<T, E>[]): Result<T[], E>`

Takes an array of `Result`s and converts it to a `Result` where the internal value is an array. If any value is `Err`, the output is the first `Err`.

```ts
Result.all([Ok(1), Ok(2), Ok(3)]) === Ok([1, 2, 3])
Result.all([Ok(1), Err("error"), Ok(3)]) === Err("error")
```

### `Result.allCollectErr<T, E>(results: Result<T, E>[]): Result<T[], E[]>`

Takes an array of `Result`s and converts it to a `Result` where the internal value is an array. If any value is `Err`, the output is the collected `Err`s.

```ts
Result.all([Ok(1), Ok(2), Ok(3)]) === Ok([1, 2, 3])
Result.all([Ok(1), Err("one"), Ok(3), Err("two")]) === Err(["one", "two"])
```

### `Result.join<L extends any[], E>(...results: ResultTuple<L, E>): ResultJoin<L, E>`

A static counterpart to `instance.join`.

```ts
const combineOk = Result.join(Ok(1), Ok(2), Ok(3))
  .combine((one, two, three) => one + two + three)

combineOk === Ok(6)

const combineErr = Result.join(Ok(1), Err("error"), Ok(3))
  .combine((one, two, three) => one + two + three)

combineErr === Err("error")
```

### `Result.joinCollectErr<L extends any[], E>(...results: ResultTuple<L, E>): ResultJoin<L, E[]>`

A static counterpart to `instance.joinCollectErr`.

### `Result.filter<T, E>(results: Result<T, E>[]): T[]`

Takes an array of `Result`s, removes all `Err`s, and returns an array of the internal values.

```ts
const results = [Some(1), Err("error"), Some(2), Some(3), Err("error")]
Result.filter(results) === [1, 2, 3]
```

### `Result.split<T, E>(results: Result<T, E>[]): [T[], E[]]`

Takes an array of `Result`s, and splits it into two arrays, one of `Ok` values and one of `Err` values.

```ts
const results = [Ok(1), Err("two"), Ok(3), Err("four")]
Result.split(results) === [[1, 3], ["two", "four"]]
```

### `Result.attempt<T>(fn: () => T): Result<T, Error>`

Wraps a function that throws an exception, returning `Ok` if the function is successful and an `Err` containing the thrown exception otherwise.

```ts
Result.attempt(() => 1) === Ok(1)
Result.attempt(() => { throw new Error("Uh oh") }) === Err(Error("Uh oh"))
```

**Note:** only use this function with external functions that you can't control. For your own functions, it's better to simply use `Maybe` and `Result` values rather than throwing exceptions.

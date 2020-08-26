# `@blainehansen/monads`

> `Result` and `Maybe` types and accompanying `macro-ts` helper macros that allow a safe, functional way of dealing with errors and nullable values.

These types wrap successful or unsuccessful values in a way that allows very convenient chaining and recombination. Ever wanted to do a task on a value only if it is actually there? Or ever wanted to do some task with a bunch of values that all individually could fail or not? Are you sick of having to catch exceptions all the time that come out of nowhere and make your software buggy and unreliable? This library is for you.

## [`type Result<T, E = string> = Ok<T> | Err<E>`](./lib/result.md)

This type is a much safer and more predictable alternative to exceptions. Since a `Result` type can either be a successful `Ok` or a failed `Err`, it allows very granular control of how and when errors are dealt with, without threatening to crash programs and cause bad behavior.

Since a function that could fail can choose to return a `Result` rather than throwing an exception, this creates a clear contract between the caller and the callee, and requires the caller to make some intelligent decision about how to deal with that error, rather than being surprised with an exception.

**Full `Result` docs [here](./lib/result.md)**

```ts
import { Result, Ok, Err } from '@blainehansen/monads'

const a = Ok(5)
  // perform some infallible operation on a successful value
  .change(number => number + 1)
  // perform some *fallible* operation on a successful value
  .tryChange(number => number % 2 === 0 ? Ok(number + 1) : Err("number wasn't even"))

a === Ok(7)

const b = Err("starting off bad...")
  .change(number => number + 1)
  .tryChange(number => number % 2 === 0 ? Ok(number + 1) : Err("number wasn't even"))

b === Err("starting off bad...")

const c = Ok(6)
  .change(number => number + 1)
  .tryChange(number => number % 2 === 0 ? Ok(number + 1) : Err("number wasn't even"))

c === Err("number wasn't even")


const combineOk = Ok(1).join(Ok(2), Ok(3))
  .combine((one, two, three) => one + two + three)

combineOk === Ok(6)

const combineErr = Ok(1).join(Err("two failed..."), Ok(3))
  .combine((one, two, three) => one + two + three)

combineErr === Err("two failed...")
```


## [`type Maybe<T> = Some(T) | None`](./lib/maybe.md)

This type is an alternative to `null | undefined`, but it allows for chaining and joining in a functional style.

**Full `Maybe` docs [here](./lib/maybe.md)**

```ts
import { Maybe, Some, None } from '@blainehansen/monads'

const a = Some(5)
  // perform some infallible operation on a successful value
  .change(number => number + 1)
  // perform some *fallible* operation on a successful value
  .tryChange(number => number % 2 === 0 ? Some(number + 1) : None)

a === Some(7)

const b = None
  .change(number => number + 1)
  .tryChange(number => number % 2 === 0 ? Some(number + 1) : None)

b === None


const combineSome = Some(1).join(Some(2), Some(3))
  .combine((one, two, three) => one + two + three)

combineSome === Some(6)

const combineNone = Some(1).join(None, Some(3))
  .combine((one, two, three) => one + two + three)

combineNone === None
```


## `ok!!` and `some!!` helper macros.

This library includes two [`macro-ts`](https://github.com/blainehansen/macro-ts) helper macros that basically implements behavior equivalent to [Rust's short-circuiting question mark operator](https://doc.rust-lang.org/edition-guide/rust-2018/error-handling-and-panics/the-question-mark-operator-for-easier-error-handling.html).

```ts
function addResults(a: Result<number>, b: Result<number>) {
  // these macros will expand to code equivalent to this:
  // if (a.isErr()) return Err(a.error)
  // if (b.isErr()) return Err(b.error)
  // const sum = a.value + b.value
  const sum = ok!!(a) + ok!!(b)
  return Ok(sum)
}
addResults(Ok(1), Ok(1)) === Ok(2)
addResults(Ok(1), Err('boo')) === Err('boo')

function printDollarMaybes(...maybes: Maybe<number>[]) {
  // the `ok` and `some` macros
  // can be used on arbitrarily complex expressions
  const amounts = some!!(Maybe.all(maybes)).map(a => `$${a.toFixed(2)}`)
  return amounts.join(', ')
}
printDollarMaybes(Some(4.3), Some(9)) === '$4.30, $9.00'
printDollarMaybes(Some(4.3), None, Some(9)) === None
```

To use the macros, follow the directions to set up your project with [`macro-ts`](https://github.com/blainehansen/macro-ts), and then import and use the macros:

```ts
import { ok, some } from '@blainehansen/monads'

export const macros = {
  ok, some,
  // ... any other macros you're using ...
}
```

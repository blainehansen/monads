import 'mocha'
import { expect } from 'chai'

import { Result, Ok, Err, Maybe, Some, None } from '../lib'

describe('macros', () => it('work', () => {
	function simpleResult(r: Result<number>): Result<boolean> {
		return Ok(ok!!(r) !== 0)
	}
	expect(simpleResult(Ok(0))).eql(Ok(false))
	expect(simpleResult(Err('as'))).eql(Err('as'))

	function complexResult(r: Result<number>): Result<boolean, number> {
		return Ok(ok!!(r.changeErr(s => s.length)) !== 0)
	}
	expect(complexResult(Ok(1))).eql(Ok(true))
	expect(complexResult(Err('as'))).eql(Err(2))

	function simpleMaybe(m: Maybe<number>): Maybe<boolean> {
		return Some(some!!(m) !== 0)
	}
	expect(simpleMaybe(Some(1))).eql(Some(true))
	expect(simpleMaybe(None)).eql(None)

	function complexMaybe(a: Maybe<number>, b: Maybe<number>): Maybe<boolean> {
		return Some(some!!(a.join(b).combine((a, b) => a - b)) !== 0)
	}
	expect(complexMaybe(Some(1), Some(1))).eql(Some(false))
	expect(complexMaybe(None, Some(2))).eql(None)


	function addResults(a: Result<number>, b: Result<number>) {
	  // these macros will expand to code equivalent to this:
	  // if (a.isErr()) return Err(a.error)
	  // if (b.isErr()) return Err(b.error)
	  // const sum = a.value + b.value
	  const sum = ok!!(a) + ok!!(b)
	  return Ok(sum)
	}
	expect(addResults(Ok(1), Ok(1))).eql(Ok(2))
	expect(addResults(Ok(1), Err('boo'))).eql(Err('boo'))

	function printDollarMaybes(...maybes: Maybe<number>[]) {
	  // the `ok` and `some` macros
	  // can be used on arbitrarily complex expressions
	  const amounts = some!!(Maybe.all(maybes)).map(a => `$${a.toFixed(2)}`)
	  return Some(amounts.join(', '))
	}
	expect(printDollarMaybes(Some(4.3), Some(9))).eql(Some('$4.30, $9.00'))
	expect(printDollarMaybes(Some(4.3), None, Some(9))).eql(None)
}))

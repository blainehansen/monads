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
}))

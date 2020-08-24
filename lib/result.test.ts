import 'mocha'
import { expect } from 'chai'

import { Panic } from './common'
import { Result, Ok, Err, ResultTuple, ResultJoin } from './result'


const im = "type invariant broken!"
const pm = "actually should happen"

describe('Result basic api', () => {
	const cases: Result<number>[] = [Ok(1), Err('bad')]
	for (const r of cases) {
		const isOk = r.isOk()
		if (r.isOk()) {
			const t: number = r.value
		}
		if (r.isErr()) {
			const e: string = r.error
		}
		const message = isOk ? 'Ok' : 'Err'
		const changed: Result<string> = r.change(n => `n is: ${n}`)
		const changedErr: Result<number, number> = r.changeErr(e => e.length)
		const tryChangeOk: Result<boolean> = r.tryChange(n => n === 1 ? Ok(true) : Err('different'))
		const tryChangeErr: Result<string> = r.tryChange(n => n === 2 ? Ok('two') : Err('also'))
		const okUndef = r.okUndef()
		const okNull = r.okNull()
		const errUndef = r.errUndef()
		const errNull = r.errNull()

		const orOk = r.or(Ok(2))
		const orErr = r.or(Err('or'))
		const orOkFn = r.or(() => Ok(2))
		const orErrFn = r.or(() => Err('or'))

		const andOk = r.and(Ok(2))
		const andErr = r.and(Err('and'))
		const andOkFn = r.and(() => Ok(2))
		const andErrFn = r.and(() => Err('and'))

		const xorm = 'xor both same'
		const xorOk = r.xor(Ok(2), xorm)
		const xorErr = r.xor(Err('xor'), xorm)
		const xorOkFn = r.xor(() => Ok(2), xorm)
		const xorErrFn = r.xor(() => Err('xor'), xorm)

		const xorOkErrFn = r.xor(() => Ok(2), () => xorm)
		const xorErrErrFn = r.xor(() => Err('xor'), () => xorm)

		const defaultOk = r.default(2)
		const defaultErr = r.defaultErr('less bad')

		it(message, () => {
			if (isOk) {
				expect(r.unwrap()).equal(1)
				expect(r.expect(im)).equal(1)
				expect(() => r.expectErr(pm)).throw(Panic, pm)
				expect(() => r.unwrapErr()).throw(Panic)
				expect(r.isErr()).false
				expect(changed.expect(im)).equal(`n is: 1`)
				expect(changedErr.expect(im)).equal(1)
				expect(tryChangeOk.expect(im)).equal(true)
				expect(tryChangeErr.expectErr(im)).equal('also')
				expect(okUndef).equal(1)
				expect(okNull).equal(1)
				expect(errUndef).undefined
				expect(errNull).null

				expect(orOk.expect(im)).equal(1)
				expect(orErr.expect(im)).equal(1)
				expect(orOkFn.expect(im)).equal(1)
				expect(orErrFn.expect(im)).equal(1)

				expect(andOk.expect(im)).equal(2)
				expect(andErr.expectErr(im)).equal('and')
				expect(andOkFn.expect(im)).equal(2)
				expect(andErrFn.expectErr(im)).equal('and')

				expect(xorOk.expectErr(im)).equal(xorm)
				expect(xorErr.expect(im)).equal(1)
				expect(xorOkFn.expectErr(im)).equal(xorm)
				expect(xorErrFn.expect(im)).equal(1)
				expect(xorOkErrFn.expectErr(im)).equal(xorm)
				expect(xorErrErrFn.expect(im)).equal(1)

				expect(defaultOk).equal(1)
				expect(defaultErr).equal('less bad')
				r.match({
					ok: n => {},
					err: _ => { expect.fail("matched err on an ok") },
				})

				const correct = r.match({
					ok: true,
					err: false,
				})
				expect(correct).true
			}
			else {
				expect(() => r.unwrap()).throw(Panic)
				expect(() => r.expect(pm)).throw(Panic, pm)
				expect(r.unwrapErr()).equal('bad')
				expect(r.expectErr(im)).equal('bad')
				expect(r.isErr()).true
				expect(changed.expectErr(im)).equal('bad')
				expect(changedErr.expectErr(im)).equal(3)
				expect(tryChangeOk.expectErr(im)).equal('bad')
				expect(tryChangeErr.expectErr(im)).equal('bad')
				expect(okUndef).undefined
				expect(okNull).null
				expect(errUndef).equal('bad')
				expect(errNull).equal('bad')

				expect(orOk.expect(im)).equal(2)
				expect(orErr.expectErr(im)).equal('bad')
				expect(orOkFn.expect(im)).equal(2)
				expect(orErrFn.expectErr(im)).equal('bad')

				expect(andOk.expectErr(im)).equal('bad')
				expect(andErr.expectErr(im)).equal('bad')
				expect(andOkFn.expectErr(im)).equal('bad')
				expect(andErrFn.expectErr(im)).equal('bad')

				expect(xorOk.expect(im)).equal(2)
				expect(xorErr.expectErr(im)).equal(xorm)
				expect(xorOkFn.expect(im)).equal(2)
				expect(xorErrFn.expectErr(im)).equal(xorm)
				expect(xorOkErrFn.expect(im)).equal(2)
				expect(xorErrErrFn.expectErr(im)).equal(xorm)

				expect(defaultOk).equal(2)
				expect(defaultErr).equal('bad')

				r.match({
					ok: _ => { expect.fail("matched ok on an err") },
					err: _ => {},
				})

				const correct = r.match({
					ok: false,
					err: true,
				})
				expect(correct).true
			}
		})
	}

	it('fromNillable', () => {
		const nullErr = Result.fromNillable(null, 'is null').expectErr(im)
		const undefinedErr = Result.fromNillable(undefined, () => 'is undefined').expectErr(im)
		expect(nullErr).equal('is null')
		expect(undefinedErr).equal('is undefined')

		const okNull: number = Result.fromNillable(1 as number | null, 'never').expect(im)
		expect(okNull).equal(1)

		const okUndefined: number = Result.fromNillable(1 as number | undefined, 'never').expect(im)
		expect(okUndefined).equal(1)

		const okBoth: number = Result.fromNillable(1 as number | null | undefined, 'never').expect(im)
		expect(okBoth).equal(1)
	})

	it('attempt', () => {
		const err = Result.attempt(() => { throw new Error('bad'); return 1 })
			.changeErr(e => e.message)
			.expectErr(im)
		expect(err).equal('bad')

		const ok = Result.attempt(() => 1).expect(im)
		expect(ok).equal(1)

		const extra = Result.attempt((arg = 1) => arg === 1).expect(im)
		expect(extra).true
	})

	it('joinObject', () => {
		const r: Result<{ a: number, b: string }> = Result.joinObject({
			a: Ok(1), b: Ok('b')
		})

		expect(r).eql(Ok({ a: 1, b: 'b' }))

		expect(Result.joinObject({
			a: Err('a'),
			b: Ok('b'),
		})).eql(Err('a'))

		expect(Result.joinObject({
			a: Ok(1),
			b: Err('b'),
		})).eql(Err('b'))

		expect(Result.joinObject({
			a: Err('a'),
			b: Err('b'),
		})).eql(Err('a'))
	})
	it('joinObjectCollectErr', () => {
		const r: Result<{ a: number, b: string }, string[]> = Result.joinObjectCollectErr({
			a: Ok(1), b: Ok('b')
		})

		expect(r).eql(Ok({ a: 1, b: 'b' }))

		expect(Result.joinObjectCollectErr({
			a: Err('a'),
			b: Ok('b'),
		})).eql(Err(['a']))

		expect(Result.joinObjectCollectErr({
			a: Ok(1),
			b: Err('b'),
		})).eql(Err(['b']))

		expect(Result.joinObjectCollectErr({
			a: Err('a'),
			b: Err('b'),
		})).eql(Err(['a', 'b']))
	})

	it('isResult', () => {
		expect(Result.isResult(Ok(1))).true
		expect(Result.isResult(Ok('a'))).true
		expect(Result.isResult(Err('a'))).true
		expect(Result.isResult(Err(null))).true
		expect(Result.isResult(null)).false
		expect(Result.isResult(undefined)).false
		expect(Result.isResult('a')).false
		expect(Result.isResult({ value: 1 })).false
		expect(Result.isResult([])).false
	})
})

function sum(nums: number[]) {
	return nums.reduce((a, b) => a + b, 0)
}

function msg(e: string) {
	return `message is: ${e}`
}

function msgJoin(e: string[]) {
	return e.join(' ')
}

describe('Result joining functions', () => {
	type Triple = [number, number, number]
	type Case = [boolean, any, any, number[]]
	const cases: [string, ResultTuple<Triple, string>, Case][] = [[
		'all ok',
		[Ok(1), Ok(1), Ok(1)],
		[true, [1, 1, 1], 3, [1, 1, 1]],
	], [
		'first err',
		[Err('ugh'), Ok(1), Ok(1)],
		[false, 'ugh', ['ugh'], [1, 1]],
	], [
		'second err',
		[Ok(1), Err('ugh'), Ok(1)],
		[false, 'ugh', ['ugh'], [1, 1]],
	], [
		'third err',
		[Ok(1), Ok(1), Err('ugh')],
		[false, 'ugh', ['ugh'], [1, 1]],
	], [
		'firstlast err',
		[Err('ugh'), Ok(1), Err('ugh')],
		[false, 'ugh', ['ugh', 'ugh'], [1]],
	], [
		'lasttwo err',
		[Ok(1), Err('seen'), Err('notseen')],
		[false, 'seen', ['seen', 'notseen'], [1]],
	], [
		'firsttwo err',
		[Err('seen'), Err('notseen'), Ok(1)],
		[false, 'seen', ['seen', 'notseen'], [1]],
	], [
		'all err',
		[Err('seen'), Err('notseen'), Err('notseen')],
		[false, 'seen', ['seen', 'notseen', 'notseen'], []],
	]]

	const combiner = (a: number, b: number, c: number) => a + b + c

	for (const [message, triple, [isOk, single, combined, filtered]] of cases) {
		const all = Result.all(triple)
		it(`${message} all`, () => {
			expect(all.isOk()).equal(isOk)
			expect(all.isErr()).equal(!isOk)
			if (isOk)
				expect(all.expect(im)).eql(single)
			else
				expect(all.expectErr(im)).eql(single)
		})

		const allCollectErr = Result.allCollectErr(triple)
		it(`${message} allCollectErr`, () => {
			expect(allCollectErr.isOk()).equal(isOk)
			expect(allCollectErr.isErr()).equal(!isOk)
			if (isOk)
				expect(allCollectErr.expect(im)).eql(single)
			else
				expect(allCollectErr.expectErr(im)).eql(combined)
		})

		const join = Result.join(...triple)
		const joinRes = join.intoResult()
		const joinCombined = join.combine(combiner)
		// this always fails, so we're mostly checking *which* err is encountered
		const joinTryCombineOk = join
			.tryCombine((a: number, b: number, c: number) => true ? Ok(combiner(a, b, c)) : Err('nope'))
		const joinTryCombineErr = join
			.tryCombine((a: number, b: number, c: number) => false ? Ok(combiner(a, b, c)) : Err('nope'))

		it(`${message} join`, () => {
			expect(joinRes.isOk()).equal(isOk)
			expect(joinRes.isErr()).equal(!isOk)
			if (isOk) {
				expect(joinRes.expect(im)).eql(single)
				expect(joinCombined.expect(im)).eql(combined)
				expect(joinTryCombineOk.expect(im)).eql(combined)
				expect(joinTryCombineErr.expectErr(im)).eql('nope')
			}
			else {
				expect(joinRes.expectErr(im)).eql(single)
				expect(joinCombined.expectErr(im)).eql(single)
				expect(joinTryCombineOk.expectErr(im)).eql(single)
				expect(joinTryCombineErr.expectErr(im)).eql(single)
			}
		})

		const joinCollect = Result.joinCollectErr(...triple)
		const joinCollectRes = joinCollect.intoResult()
		const joinCollectCombined = joinCollect.combine(combiner)
		const joinCollectTryCombineOk = joinCollect
			.tryCombine((a: number, b: number, c: number) => true ? Ok(combiner(a, b, c)) : Err(['nope']))
		const joinCollectTryCombineErr = joinCollect
			.tryCombine((a: number, b: number, c: number) => false ? Ok(combiner(a, b, c)) : Err(['nope']))

		it(`${message} joinCollectErr`, () => {
			expect(joinCollectRes.isOk()).equal(isOk)
			expect(joinCollectRes.isErr()).equal(!isOk)
			if (isOk) {
				expect(joinCollectRes.expect(im)).eql(single)
				expect(joinCollectCombined.expect(im)).eql(combined)
				expect(joinCollectTryCombineOk.expect(im)).eql(combined)
				expect(joinCollectTryCombineErr.expectErr(im)).eql(['nope'])
			}
			else {
				expect(joinCollectRes.expectErr(im)).eql(combined)
				expect(joinCollectCombined.expectErr(im)).eql(combined)
				expect(joinCollectTryCombineOk.expectErr(im)).eql(combined)
				expect(joinCollectTryCombineErr.expectErr(im)).eql(combined)
			}
		})

		const [a, b, c] = triple
		const rJoin = a.join(b, c)
		const rJoinRes = rJoin.intoResult()
		const rJoinCombined = rJoin.combine(combiner)
		const rJoinTryCombineOk = rJoin
			.tryCombine((a: number, b: number, c: number) => true ? Ok(combiner(a, b, c)) : Err('nope'))
		const rJoinTryCombineErr = rJoin
			.tryCombine((a: number, b: number, c: number) => false ? Ok(combiner(a, b, c)) : Err('nope'))

		it(`${message} Result.join`, () => {
			expect(rJoinRes.isOk()).equal(isOk)
			expect(rJoinRes.isErr()).equal(!isOk)
			if (isOk) {
				expect(rJoinRes.expect(im)).eql(single)
				expect(rJoinCombined.expect(im)).eql(combined)
				expect(rJoinTryCombineOk.expect(im)).eql(combined)
				expect(rJoinTryCombineErr.expectErr(im)).eql('nope')
			}
			else {
				expect(rJoinRes.expectErr(im)).eql(single)
				expect(rJoinCombined.expectErr(im)).eql(single)
				expect(rJoinTryCombineOk.expectErr(im)).eql(single)
				expect(rJoinTryCombineErr.expectErr(im)).eql(single)
			}
		})

		const rJoinCollect = a.joinCollectErr(b, c)
		const rJoinCollectRes = rJoinCollect.intoResult()
		const rJoinCollectCombined = rJoinCollect.combine(combiner)
		const rJoinCollectTryCombineOk = rJoinCollect
			.tryCombine((a: number, b: number, c: number) => true ? Ok(combiner(a, b, c)) : Err(['nope']))
		const rJoinCollectTryCombineErr = rJoinCollect
			.tryCombine((a: number, b: number, c: number) => false ? Ok(combiner(a, b, c)) : Err(['nope']))

		it(`${message} Result.join`, () => {
			expect(rJoinCollectRes.isOk()).equal(isOk)
			expect(rJoinCollectRes.isErr()).equal(!isOk)
			if (isOk) {
				expect(rJoinCollectRes.expect(im)).eql(single)
				expect(rJoinCollectCombined.expect(im)).eql(combined)
				expect(rJoinCollectTryCombineOk.expect(im)).eql(combined)
				expect(rJoinCollectTryCombineErr.expectErr(im)).eql(['nope'])
			}
			else {
				expect(rJoinCollectRes.expectErr(im)).eql(combined)
				expect(rJoinCollectCombined.expectErr(im)).eql(combined)
				expect(rJoinCollectTryCombineOk.expectErr(im)).eql(combined)
				expect(rJoinCollectTryCombineErr.expectErr(im)).eql(combined)
			}
		})

		const tripleFiltered = Result.filter(triple)
		it(`${message} Result.filter`, () => {
			expect(tripleFiltered).eql(filtered)
		})

		const [tripleSplitOks, tripleSplitErrs] = Result.split(triple)
		it(`${message} Result.split`, () => {
			expect(tripleSplitOks).eql(filtered)

			if (isOk)
				expect(tripleSplitErrs).eql([])
			else
				expect(tripleSplitErrs).eql(combined)
		})
	}
})

describe('error inference', () => it('works', () => {
	const a: Result<true> = Result.join(Ok(3), Err('a'), Ok('b'))
		.combine((num, bool, str): true => { throw new Error() })

	const b: Result<true, number> = Result.join(
		Ok(3) as Result<3, number>,
		Err(1) as Result<'a', number>,
		Ok('b') as Result<'b', number>,
	)
		.combine((num, bool, str): true => { throw new Error() })

	const c: Result<any> = Result.joinObject({ a: Ok(5), b: Err('d') })

	const d: Result<any, number> = Result.joinObject({ a: Ok(5) as Result<number, number>, b: Err(5) })
}))

describe('transmutation', () => {
	it('convertible to other', () => {
		const a = Ok(1)
		const b: Result<number, boolean> = a
		const c: Result<number, string> = a

		const e = Err('a')
		const f: Result<number, string> = e
		const g: Result<boolean, string> = e
	})

	// it('overall', () => {
	// 	function f(r: Result<number>): Result<boolean> {
	// 		if (r.isErr()) return r
	// 		return Ok(r.value !== 0)
	// 	}
	// })
})

describe('Result dangerous any casts', () => {
	it('Ok.changeErr', () => {
		const r: Result<number, number> = (Ok(4) as Result<number>).changeErr(e => e.length)
		expect(r.isOk()).true
		expect(r.isErr()).false
		expect(r.expect(im)).a('number')
		expect(() => r.expectErr(pm)).throw(Panic, pm)
	})

	it('Err.change', () => {
		const r: Result<boolean> = (Err('bad') as Result<number>).change(n => n === 1)
		expect(r.isOk()).false
		expect(r.isErr()).true
		expect(() => r.expect(pm)).throw(Panic, pm)
		expect(r.expectErr(im)).a('string')
	})

	it("Err.tryChange", () => {
		const r: Result<boolean> = (Err('bad') as Result<number>).tryChange(n => n === 1 ? Ok(true) : Err('not one'))
		expect(r.isOk()).false
		expect(r.isErr()).true
		expect(() => r.expect(pm)).throw(Panic, pm)
		expect(r.expectErr(im)).a('string')
	})
})

describe('tap', () => it('works', () => {
	const o: Result<number> = Ok(1)
	const e: Result<number> = Err('nope')

	for (const r of [o, e]) {
		let tapCount = 0
		let tapOkCount = 0
		let tapErrCount = 0

		const a: boolean = r
			.tap((_: Result<number>) => {
				tapCount++
			})
			.tapOk((_: number) => {
				tapOkCount++
			})
			.tapErr((_: string) => {
				tapErrCount++
			})
			.change(n => n > 0)
			.default(false)

		if (r.isOk()) {
			expect(a).true
			expect(tapCount).equal(1)
			expect(tapOkCount).equal(1)
			expect(tapErrCount).equal(0)
		}
		else {
			expect(a).false
			expect(tapCount).equal(1)
			expect(tapOkCount).equal(0)
			expect(tapErrCount).equal(1)
		}
	}
}))

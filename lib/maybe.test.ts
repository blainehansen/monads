import 'mocha'
import { expect } from 'chai'

import { Panic } from './common'
import { Maybe, Some, None, MaybeTuple, MaybeJoin } from './maybe'

const im = "type invariant broken!"
const pm = "actually should happen"

describe('Maybe basic api', () => {
	const cases: Maybe<number>[] = [Some(1), None]
	for (const r of cases) {
		const isSome = r.isSome()
		if (r.isSome()) {
			const s: number = r.value
		}
		const message = isSome ? 'Some' : 'None'
		const changed: Maybe<string> = r.change(n => `n is: ${n}`)
		const orSome = r.or(Some(2))
		const orNone = r.or(None)
		const orSomeFn = r.or(() => Some(2))
		const orNoneFn = r.or(() => None)

		const andSome = r.and(Some(2))
		const andNone = r.and(None)
		const andSomeFn = r.and(() => Some(2))
		const andNoneFn = r.and(() => None)

		const xorSome = r.xor(Some(2))
		const xorNone = r.xor(None)
		const xorSomeFn = r.xor(() => Some(2))
		const xorNoneFn = r.xor(() => None)

		const tryChangeSome: Maybe<boolean> = r.tryChange(n => n === 1 ? Some(true) : None)
		const tryChangeNone: Maybe<string> = r.tryChange(n => n === 2 ? Some('two') : None)
		const toUndef = r.toUndef()
		const toNull = r.toNull()
		const toResult = r.toResult('toResult')

		const defaulted = r.default(2)
		const defaultedFn = r.default(() => 2)

		it(message, () => {
			if (isSome) {
				expect(r.unwrap()).equal(1)
				expect(r.expect(im)).equal(1)
				expect(r.isNone()).false
				expect(changed.expect(im)).equal(`n is: 1`)

				expect(orSome.expect(im)).equal(1)
				expect(orSomeFn.expect(im)).equal(1)
				expect(orNone.expect(im)).equal(1)
				expect(orNoneFn.expect(im)).equal(1)
				expect(andSome.expect(im)).equal(2)
				expect(andSomeFn.expect(im)).equal(2)
				expect(andNone.isNone()).true
				expect(andNoneFn.isNone()).true
				expect(xorSome.isNone()).true
				expect(xorSomeFn.isNone()).true
				expect(xorNone.expect(im)).equal(1)
				expect(xorNoneFn.expect(im)).equal(1)

				expect(tryChangeSome.expect(im)).equal(true)
				expect(tryChangeNone.isNone()).true
				expect(toUndef).equal(1)
				expect(toNull).equal(1)
				expect(toResult.isOk()).true
				expect(toResult.expect(im)).eql(1)
				expect(defaulted).equal(1)
				expect(defaultedFn).equal(1)
				r.match({
					some: n => {},
					none: () => { expect.fail("matched none on a some") },
				})

				const correct = r.match({
					some: true,
					none: false,
				})
				expect(correct).true
			}
			else {
				expect(() => r.unwrap()).throw(Panic)
				expect(() => r.expect(pm)).throw(Panic, pm)
				expect(r.isNone()).true
				expect(changed.isNone()).true

				expect(orSome.expect(im)).equal(2)
				expect(orSomeFn.expect(im)).equal(2)
				expect(orNone.isNone()).true
				expect(orNoneFn.isNone()).true
				expect(andSome.isNone()).true
				expect(andSomeFn.isNone()).true
				expect(andNone.isNone()).true
				expect(andNoneFn.isNone()).true
				expect(xorSome.expect(im)).equal(2)
				expect(xorSomeFn.expect(im)).equal(2)
				expect(xorNone.isNone()).true
				expect(xorNoneFn.isNone()).true

				expect(tryChangeSome.isNone()).true
				expect(tryChangeNone.isNone()).true
				expect(toUndef).undefined
				expect(toNull).null
				expect(toResult.isErr()).true
				expect(defaulted).equal(2)
				expect(defaultedFn).equal(2)

				r.match({
					some: _ => { expect.fail("matched some on a none") },
					none: () => {},
				})

				const correct = r.match({
					some: false,
					none: true,
				})
				expect(correct).true
			}
		})
	}

	it('fromNillable', () => {
		const nullNone = Maybe.fromNillable(null)
		const undefinedNone = Maybe.fromNillable(undefined)
		expect(nullNone.isNone()).true
		expect(undefinedNone.isNone()).true

		const someNull: number = Maybe.fromNillable(1 as number | null).expect(im)
		expect(someNull).equal(1)

		const someUndefined: number = Maybe.fromNillable(1 as number | undefined).expect(im)
		expect(someUndefined).equal(1)

		const someBoth: number = Maybe.fromNillable(1 as number | null | undefined).expect(im)
		expect(someBoth).equal(1)
	})

	it('attempt', () => {
		const none = Maybe.attempt(() => { throw new Error('bad'); return 1 })
		expect(() => none.expect(pm)).throw(Panic, pm)

		const some = Maybe.attempt(() => 1).expect(im)
		expect(some).equal(1)

		const extra = Maybe.attempt((arg = 1) => arg === 1).expect(im)
		expect(extra).true
	})

	it('joinObject', () => {
		const m: Maybe<{ a: number, b: string }> = Maybe.joinObject({
			a: Some(1), b: Some('b')
		})

		expect(m).eql(Some({ a: 1, b: 'b' }))

		expect(Maybe.joinObject({
			a: None,
			b: Some('b'),
		})).eql(None)

		expect(Maybe.joinObject({
			a: Some(1),
			b: None,
		})).eql(None)

		expect(Maybe.joinObject({
			a: None,
			b: None,
		})).eql(None)
	})

	it('isMaybe', () => {
		expect(Maybe.isMaybe(Some(1))).true
		expect(Maybe.isMaybe(Some('a'))).true
		expect(Maybe.isMaybe(None)).true
		expect(Maybe.isMaybe(null)).false
		expect(Maybe.isMaybe(undefined)).false
		expect(Maybe.isMaybe('a')).false
		expect(Maybe.isMaybe({ value: 1 })).false
		expect(Maybe.isMaybe([])).false
	})
})


function sum(nums: number[]) {
	return nums.reduce((a, b) => a + b, 0)
}

describe('Maybe joining functions', () => {
	type Triple = [number, number, number]
	type Case = [boolean, any, any, number[]]
	const cases: [string, MaybeTuple<Triple>, Case][] = [[
		'all some',
		[Some(1), Some(1), Some(1)],
		[true, [1, 1, 1], 3, [1, 1, 1]],
	], [
		'first none',
		[None, Some(1), Some(1)],
		[false, undefined, undefined, [1, 1]],
	], [
		'second none',
		[Some(1), None, Some(1)],
		[false, undefined, undefined, [1, 1]],
	], [
		'third none',
		[Some(1), Some(1), None],
		[false, undefined, undefined, [1, 1]],
	], [
		'firstlast none',
		[None, Some(1), None],
		[false, undefined, undefined, [1]],
	], [
		'lasttwo none',
		[Some(1), None, None],
		[false, undefined, undefined, [1]],
	], [
		'firsttwo none',
		[None, None, Some(1)],
		[false, undefined, undefined, [1]],
	], [
		'all none',
		[None, None, None],
		[false, undefined, undefined, []],
	]]

	const combiner = (a: number, b: number, c: number) => a + b + c
	// const allPanic =

	for (const [message, triple, [isSome, single, combined, filtered]] of cases) {
		const all = Maybe.all(triple)
		it(`${message} all`, () => {
			expect(all.isSome()).equal(isSome)
			expect(all.isNone()).equal(!isSome)
			if (isSome)
				expect(all.expect(im)).eql(single)
			else
				expect(() => all.expect(pm)).throw(Panic, pm)
		})


		const join = Maybe.join(...triple)
		const joinMaybe = join.intoMaybe()
		const joinCombined = join.combine(combiner)
		const joinTryCombineSome = join
			.tryCombine((a: number, b: number, c: number) => true ? Some(combiner(a, b, c)) : None)
		const joinTryCombineNone = join
			.tryCombine((a: number, b: number, c: number) => false ? Some(combiner(a, b, c)) : None)

		it(`${message} join`, () => {
			expect(joinMaybe.isSome()).equal(isSome)
			expect(joinMaybe.isNone()).equal(!isSome)
			if (isSome) {
				expect(joinMaybe.expect(im)).eql(single)
				expect(joinCombined.expect(im)).eql(combined)
				expect(joinTryCombineSome.expect(im)).eql(combined)
				expect(() => joinTryCombineNone.expect(pm)).throw(Panic, pm)
			}
			else {
				expect(() => joinMaybe.expect(pm)).throw(Panic, pm)
				expect(() => joinCombined.expect(pm)).throw(Panic, pm)
				expect(() => joinTryCombineSome.expect(pm)).throw(Panic, pm)
				expect(() => joinTryCombineNone.expect(pm)).throw(Panic, pm)
			}
		})

		const [a, b, c] = triple
		const mJoin = a.join(b, c)
		const mJoinMaybe = mJoin.intoMaybe()
		const mJoinCombined = mJoin.combine(combiner)
		const mJoinTryCombineSome = mJoin
			.tryCombine((a: number, b: number, c: number) => true ? Some(combiner(a, b, c)) : None)
		const mJoinTryCombineNone = mJoin
			.tryCombine((a: number, b: number, c: number) => false ? Some(combiner(a, b, c)) : None)

		it(`${message} Maybe.join`, () => {
			expect(mJoinMaybe.isSome()).equal(isSome)
			expect(mJoinMaybe.isNone()).equal(!isSome)
			if (isSome) {
				expect(mJoinMaybe.expect(im)).eql(single)
				expect(mJoinCombined.expect(im)).eql(combined)
				expect(mJoinTryCombineSome.expect(im)).eql(combined)
				expect(() => mJoinTryCombineNone.expect(pm)).throw(Panic, pm)
			}
			else {
				expect(() => mJoinMaybe.expect(pm)).throw(Panic, pm)
				expect(() => mJoinCombined.expect(pm)).throw(Panic, pm)
				expect(() => mJoinTryCombineSome.expect(pm)).throw(Panic, pm)
				expect(() => mJoinTryCombineNone.expect(pm)).throw(Panic, pm)
			}
		})

		const tripleFiltered = Maybe.filter(triple)
		it(`${message} Maybe.filter`, () => {
			expect(tripleFiltered).eql(filtered)
		})
	}
})

describe('Maybe.joinNillable', () => it('works', () => {
	const combiner = (a: string, b = '', c = '') => a + b + c
	const a = 'a'
	const b = null as string | null
	const c = undefined as string | undefined
	const d = 'd' as string | undefined
	expect(Maybe.joinNillable(a, b, c).combine(combiner)).eql(None)
	expect(Maybe.joinNillable(b, c, a).combine(combiner)).eql(None)
	expect(Maybe.joinNillable(b, a).combine(combiner)).eql(None)
	expect(Maybe.joinNillable(c, a).combine(combiner)).eql(None)
	expect(Maybe.joinNillable(a, c).combine(combiner)).eql(None)
	expect(Maybe.joinNillable(a, b).combine(combiner)).eql(None)

	expect(Maybe.joinNillable(a, d).combine(combiner)).eql(Some('ad'))
	expect(Maybe.joinNillable(d).combine(combiner)).eql(Some('d'))
	expect(Maybe.joinNillable(a).combine(combiner)).eql(Some('a'))
}))

describe('Maybe dangerous any casts', () => {
	it('None.change', () => {
		const m = None.change(n => n + 1)
		expect(m.isSome()).false
		expect(m.isNone()).true
		expect(() => m.expect(pm)).throw(Panic, pm)
	})

	it('None.tryChange', () => {
		const m = None.tryChange(() => Some(1))
		expect(m.isSome()).false
		expect(m.isNone()).true
		expect(() => m.expect(pm)).throw(Panic, pm)
	})

	it('None.and', () => {
		const m = None.and(Some(1))
		expect(m.isSome()).false
		expect(m.isNone()).true
		expect(() => m.expect(pm)).throw(Panic, pm)
	})
})


describe('tap', () => it('works', () => {
	const s = Some(1)
	const n = None as Maybe<number>

	for (const m of [s, n]) {
		let tapCount = 0
		let tapSomeCount = 0
		let tapNoneCount = 0

		const a: boolean = m
			.tap((_: Maybe<number>) => {
				tapCount++
			})
			.tapSome((_: number) => {
				tapSomeCount++
			})
			.tapNone(() => {
				tapNoneCount++
			})
			.change(n => n > 0)
			.default(false)

		if (m.isSome()) {
			expect(a).true
			expect(tapCount).equal(1)
			expect(tapSomeCount).equal(1)
			expect(tapNoneCount).equal(0)
		}
		else {
			expect(a).false
			expect(tapCount).equal(1)
			expect(tapSomeCount).equal(0)
			expect(tapNoneCount).equal(1)
		}
	}
}))

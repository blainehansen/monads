import { Result, Ok, Err } from './result'
import { Panic, TransformerOrValue, ProducerOrValue, Dict } from './common'

const MaybeType = {
	Some: Symbol("Maybe.Some"),
	None: Symbol("Maybe.None"),
} as const

export type MaybeMatch<T, U> = {
	some: TransformerOrValue<T, U>,
	none: ProducerOrValue<U>,
}

export interface MaybeLike<T> {
	isSome(): this is MaybeSome<T>
	isNone(): this is MaybeNone<T>
	toUndef(): T | undefined
	toNull(): T | null
	toResult<E>(err: E): Result<T, E>

	match<U>(fn: MaybeMatch<T, U>): U

	change<U>(fn: (value: T) => U): Maybe<U>
	tryChange<U>(fn: (value: T) => Maybe<U>): Maybe<U>

	and<U>(other: ProducerOrValue<Maybe<U>>): Maybe<U>
	or(other: ProducerOrValue<Maybe<T>>): Maybe<T>
	xor(other: ProducerOrValue<Maybe<T>>): Maybe<T>

	default(def: ProducerOrValue<T>): T
	unwrap(): T | never
	expect(message: string): T | never
	join<L extends any[]>(...args: MaybeTuple<L>): MaybeJoin<[T, ...L]>

	tap(fn: (m: Maybe<T>) => unknown): Maybe<T>
	tapSome(fn: (v: T) => unknown): Maybe<T>
	tapNone(fn: () => unknown): Maybe<T>
}

export type Maybe<T> = MaybeSome<T> | MaybeNone<T>

class MaybeSome<T> implements MaybeLike<T> {
	private readonly _type = MaybeType.Some
	constructor(readonly value: T) { this._type }

	isSome(): this is MaybeSome<T> {
		return true
	}
	isNone(): this is MaybeNone<T> {
		return false
	}
	toUndef(): T | undefined {
		return this.value
	}
	toNull(): T | null {
		return this.value
	}
	toResult<E>(_err: E): Result<T, E> {
		return Ok(this.value)
	}
	match<U>(fn: MaybeMatch<T, U>): U {
		return typeof fn.some === 'function'
			? (fn.some as (value: T) => U)(this.value)
			: fn.some
	}
	change<U>(fn: (value: T) => U): Maybe<U> {
		return Some(fn(this.value))
	}
	tryChange<U>(fn: (value: T) => Maybe<U>): Maybe<U> {
		return fn(this.value)
	}
	or(_other: ProducerOrValue<Maybe<T>>): Maybe<T> {
		return this
	}
	and<U>(other: ProducerOrValue<Maybe<U>>): Maybe<U> {
		return typeof other === 'function' ? other() : other
	}
	xor(other: ProducerOrValue<Maybe<T>>): Maybe<T> {
		const otherMaybe = typeof other === 'function' ? other() : other
		return otherMaybe.isSome()
			? None
			: this
	}
	default(_value: ProducerOrValue<T>): T {
		return this.value
	}
	unwrap(): T | never {
		return this.value
	}
	expect(_message: string): T | never {
		return this.value
	}
	join<L extends any[]>(...args: MaybeTuple<L>): MaybeJoin<[T, ...L]> {
		const othersMaybe = _join(args)
		return othersMaybe.isSome()
			? new MaybeJoinSome([this.value, ...othersMaybe.value])
			: new MaybeJoinNone()
	}

	tap(fn: (m: Maybe<T>) => unknown): Maybe<T> {
		fn(this)
		return this
	}
	tapSome(fn: (v: T) => unknown): Maybe<T> {
		fn(this.value)
		return this
	}
	tapNone(_fn: () => unknown): Maybe<T> {
		return this
	}
}

export function Some<T>(value: T): Maybe<T> {
	return new MaybeSome(value)
}


class MaybeNone<T> implements MaybeLike<T> {
	private readonly _type = MaybeType.None
	constructor() { this._type }

	isSome(): this is MaybeSome<T> {
		return false
	}
	isNone(): this is MaybeNone<T> {
		return true
	}
	toUndef(): T | undefined {
		return undefined
	}
	toNull(): T | null {
		return null
	}
	toResult<E>(err: E): Result<T, E> {
		return Err(err)
	}
	match<U>(fn: MaybeMatch<T, U>): U {
		return typeof fn.none === 'function'
			? (fn.none as () => U)()
			: fn.none
	}
	change<U>(_fn: (value: T) => U): Maybe<U> {
		return this as any as Maybe<U>
	}
	tryChange<U>(_fn: (value: T) => Maybe<U>): Maybe<U> {
		return this as any as Maybe<U>
	}
	or(other: ProducerOrValue<Maybe<T>>): Maybe<T> {
		return typeof other === 'function' ? other() : other
	}
	and<U>(_other: ProducerOrValue<Maybe<U>>): Maybe<U> {
		return this as any as Maybe<U>
	}
	xor(other: ProducerOrValue<Maybe<T>>): Maybe<T> {
		const otherMaybe = typeof other === 'function' ? other() : other
		return otherMaybe.isSome()
			? otherMaybe
			: this
	}
	default(other: ProducerOrValue<T>): T {
		return typeof other === 'function' ? (other as () => T)() : other
	}
	unwrap(): T | never {
		throw new Panic(`Maybe.unwrap was called on None.\n`)
	}
	expect(message: string): T | never {
		throw new Panic(`Maybe.expect was called on None.\nMessage: ${message}`)
	}
	join<L extends any[]>(..._args: MaybeTuple<L>): MaybeJoin<[T, ...L]> {
		return new MaybeJoinNone()
	}

	tap(fn: (m: Maybe<T>) => unknown): Maybe<T> {
		fn(this)
		return this
	}
	tapSome(_fn: (v: T) => unknown): Maybe<T> {
		return this
	}
	tapNone(fn: () => unknown): Maybe<T> {
		fn()
		return this
	}
}

export const None: Maybe<any> = new MaybeNone()

export type MaybeTuple<L extends any[]> = { [K in keyof L]: Maybe<L[K]> }
export type NillableTuple<L extends any[]> = { [K in keyof L]: L[K] | null | undefined }

export type MaybeJoin<L extends any[]> = MaybeJoinSome<L> | MaybeJoinNone<L>

class MaybeJoinSome<L extends any[]> {
	constructor(private readonly values: L) {}

	combine<T>(fn: (...args: L) => T): Maybe<T> {
		return Some(fn(...this.values))
	}

	tryCombine<T>(fn: (...args: L) => Maybe<T>): Maybe<T> {
		return fn(...this.values)
	}

	intoMaybe(): Maybe<L> {
		return Some(this.values)
	}
}

class MaybeJoinNone<L extends any[]> {
	combine<T>(_fn: (...args: L) => T): Maybe<T> {
		return None
	}

	tryCombine<T>(_fn: (...args: L) => Maybe<T>): Maybe<T> {
		return None
	}

	intoMaybe(): Maybe<L> {
		return None
	}
}


function _join<L extends any[]>(maybes: MaybeTuple<L>): Maybe<L> {
	// DANGER: test to ensure type invariant holds
	const args = [] as any as L
	for (const maybe of maybes) {
		if (maybe.isSome()) args.push(maybe.value)
		else return maybe
	}

	return Some(args)
}

function _joinNillable<L extends any[]>(nillables: NillableTuple<L>): Maybe<L> {
	// DANGER: test to ensure type invariant holds
	const args = [] as any as L
	for (const nillable of nillables) {
		if (nillable !== undefined && nillable !== null) args.push(nillable)
		else return None
	}

	return Some(args)
}

export namespace Maybe {
	export function fromNillable<T>(value: T | null | undefined): Maybe<T> {
		return value === null || value === undefined
			? None
			: Some(value)
	}

	export function isMaybe(value: unknown): value is Maybe<unknown> {
		return value !== null && value !== undefined
			&& ((value as any)._type === MaybeType.Some || (value as any)._type === MaybeType.None)
	}

	export function all<T>(maybes: Maybe<T>[]): Maybe<T[]> {
		return _join(maybes)
	}

	export function filter<T>(maybes: Maybe<T>[]): T[] {
		const give = [] as T[]
		for (const maybe of maybes) {
			if (maybe.isSome()) {
				give.push(maybe.value)
			}
		}

		return give
	}

	export function join<L extends any[]>(...maybes: MaybeTuple<L>): MaybeJoin<L> {
		const othersMaybe = _join(maybes)
		return othersMaybe.isSome()
			? new MaybeJoinSome(othersMaybe.value)
			: new MaybeJoinNone()
	}

	export function joinNillable<L extends any[]>(...nillables: NillableTuple<L>): MaybeJoin<L> {
		const othersMaybe = _joinNillable(nillables)
		return othersMaybe.isSome()
			? new MaybeJoinSome(othersMaybe.value)
			: new MaybeJoinNone()
	}

	export function joinObject<O extends Dict<any>>(
		obj: { [K in keyof O]: Maybe<O[K]> }
	): Maybe<O> {
		const give = {} as O
		for (const key in obj) {
			const maybe = obj[key] as Maybe<any>
			if (maybe.isNone())
				return None
			give[key] = maybe.value
		}

		return Some(give)
	}

	export function attempt<T>(fn: () => T): Maybe<T> {
		try {
			return Some(fn())
		}
		catch (_) {
			return None
		}
	}
}

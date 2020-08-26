import { Maybe, Some, None } from './maybe'
import { Panic, TransformerOrValue, ProducerOrValue, Dict }from './common'

const ResultType = {
	Ok: Symbol('Result.Ok'),
	Err: Symbol('Result.Err'),
} as const

export type ResultMatch<T, E, U> = {
	ok: TransformerOrValue<T, U>,
	err: TransformerOrValue<E, U>,
}

export interface ResultLike<T, E> {
	isOk(): this is ResultOk<T, any>,
	isErr(): this is ResultErr<any, E>,
	okMaybe(): Maybe<T>,
	okUndef(): T | undefined,
	okNull(): T | null,
	errMaybe(): Maybe<E>,
	errUndef(): E | undefined,
	errNull(): E | null,

	match<U>(fn: ResultMatch<T, E, U>): U,

	unwrap(): T | never,
	unwrapErr(): E | never,
	expect(message: string): T | never,
	expectErr(message: string): E | never,

	change<U>(fn: (value: T) => U): Result<U, E>,
	tryChange<U>(fn: (value: T) => Result<U, E>): Result<U, E>,

	changeErr<U>(fn: (err: E) => U): Result<T, U>,

	and<U>(other: ProducerOrValue<Result<U, E>>): Result<U, E>
	or(other: ProducerOrValue<Result<T, E>>): Result<T, E>
	xor(other: ProducerOrValue<Result<T, E>>, sameErr: ProducerOrValue<E>): Result<T, E>

	default(def: ProducerOrValue<T>): T,
	defaultErr(defErr: ProducerOrValue<E>): E,
	join<L extends any[]>(...args: ResultTuple<L, E>): ResultJoin<[T, ...L], E>
	joinCollectErr<L extends any[]>(...args: ResultTuple<L, E>): ResultJoin<[T, ...L], E[]>

	tap(fn: (r: Result<T, E>) => unknown): Result<T, E>
	tapOk(fn: (v: T) => unknown): Result<T, E>
	tapErr(fn: (e: E) => unknown): Result<T, E>
}

export type Result<T, E = string> = ResultOk<T, E> | ResultErr<T, E>

class ResultOk<T, E> implements ResultLike<T, E> {
	private readonly _type = ResultType.Ok
	constructor(readonly value: T) { this._type }

	isOk(): this is ResultOk<T, any> {
		return true
	}
	isErr(): this is ResultErr<any, E> {
		return false
	}
	okMaybe(): Maybe<T> {
		return Some(this.value)
	}
	okUndef(): T | undefined {
		return this.value
	}
	okNull(): T | null {
		return this.value
	}
	errMaybe(): Maybe<E> {
		return None
	}
	errUndef(): E | undefined {
		return undefined
	}
	errNull(): E | null {
		return null
	}
	default(_def: ProducerOrValue<T>): T {
		return this.value
	}
	defaultErr(defErr: ProducerOrValue<E>): E {
		return typeof defErr === 'function' ? (defErr as () => E)() : defErr
	}
	unwrap(): T | never {
		return this.value
	}
	unwrapErr(): E | never {
		throw new Panic(`Result.unwrapErr was called on Ok.\nUnderlying Ok value:\n${this.value}`)
	}
	expect(_message: string): T | never {
		return this.value
	}
	expectErr(message: string): E | never {
		throw new Panic(`Result.expectErr was called on Ok.\nMessage: ${message}\nUnderlying Ok value:\n${this.value}`)
	}
	match<U>(fn: ResultMatch<T, E, U>): U {
		return typeof fn.ok === 'function'
			? (fn.ok as (value: T) => U)(this.value)
			: fn.ok
	}
	change<U>(fn: (value: T) => U): Result<U, E> {
		return Ok(fn(this.value))
	}
	changeErr<U>(_fn: (err: E) => U): Result<T, U> {
		// DANGER: test to ensure type invariant holds
		return this as any as Result<T, U>
	}

	and<U>(other: ProducerOrValue<Result<U, E>>): Result<U, E> {
		return typeof other === 'function' ? other() : other
	}
	or(_other: ProducerOrValue<Result<T, E>>): Result<T, E> {
		return this
	}
	xor(other: ProducerOrValue<Result<T, E>>, sameErr: ProducerOrValue<E>): Result<T, E> {
		const otherResult = typeof other === 'function' ? other() : other
		return otherResult.isOk()
			? Err(typeof sameErr === 'function' ? (sameErr as () => E)() : sameErr)
			: this
	}

	tryChange<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
		return fn(this.value)
	}
	join<L extends any[]>(...others: ResultTuple<L, E>): ResultJoin<[T, ...L], E> {
		const othersResult = _join(others)
		return othersResult.isOk()
			? new ResultJoinOk([this.value as T, ...othersResult.value as L])
			: new ResultJoinErr(othersResult.error as E)
	}
	joinCollectErr<L extends any[]>(...others: ResultTuple<L, E>): ResultJoin<[T, ...L], E[]> {
		const othersResult = _joinCollectErr(others)
		return othersResult.isOk()
			? new ResultJoinOk([this.value as T, ...othersResult.value as L])
			: new ResultJoinErr(othersResult.error)
	}

	tap(fn: (r: Result<T, E>) => unknown): Result<T, E> {
		fn(this)
		return this
	}
	tapOk(fn: (v: T) => unknown): Result<T, E> {
		fn(this.value)
		return this
	}
	tapErr(_fn: (e: E) => unknown): Result<T, E> {
		return this
	}
}

export function Ok<T>(value: T): Result<T, any> {
	return new ResultOk(value)
}


class ResultErr<T, E> implements ResultLike<T, E> {
	private readonly _type = ResultType.Err
	constructor(readonly error: E) { this._type }

	isOk(): this is ResultOk<T, any> {
		return false
	}
	isErr(): this is ResultErr<any, E> {
		return true
	}
	okMaybe(): Maybe<T> {
		return None
	}
	okUndef(): T | undefined {
		return undefined
	}
	okNull(): T | null {
		return null
	}
	errMaybe(): Maybe<E> {
		return Some(this.error)
	}
	errUndef(): E | undefined {
		return this.error
	}
	errNull(): E | null {
		return this.error
	}
	default(def: ProducerOrValue<T>): T {
		return typeof def === 'function' ? (def as () => T)() : def
	}
	defaultErr(_defErr: ProducerOrValue<E>): E {
		return this.error
	}
	unwrap(): T | never {
		throw new Panic(`Result.unwrap was called on Err.\nUnderlying Err value:\n${this.error}`)
	}
	unwrapErr(): E | never {
		return this.error
	}
	expect(message: string): T | never {
		throw new Panic(`Result.expect was called on Err.\nMessage: ${message}\nUnderlying Err value:\n${this.error}`)
	}
	expectErr(_message: string): E | never {
		return this.error
	}
	match<U>(fn: ResultMatch<T, E, U>): U {
		return typeof fn.err === 'function'
			? (fn.err as (error: E) => U)(this.error)
			: fn.err
	}
	change<U>(_fn: (value: T) => U): Result<U, E> {
		// DANGER: test to ensure type invariant holds
		return this as any as Result<U, E>
	}
	changeErr<U>(fn: (err: E) => U): Result<T, U> {
		return Err(fn(this.error))
	}
	tryChange<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
		// DANGER: test to ensure type invariant holds
		return this as any as Result<U, E>
	}

	and<U>(_other: ProducerOrValue<Result<U, E>>): Result<U, E> {
		// DANGER: test to ensure type invariant holds
		return this as any as Result<U, E>
	}
	or(other: ProducerOrValue<Result<T, E>>): Result<T, E> {
		const otherResult = typeof other === 'function' ? other() : other
		return otherResult.isOk()
			? otherResult
			: this
	}
	xor(other: ProducerOrValue<Result<T, E>>, sameErr: ProducerOrValue<E>): Result<T, E> {
		const otherResult = typeof other === 'function' ? other() : other
		return otherResult.isOk()
			? otherResult
			: Err(typeof sameErr === 'function' ? (sameErr as () => E)() : sameErr)
	}


	join<L extends any[]>(..._others: ResultTuple<L, E>): ResultJoin<[T, ...L], E> {
		return new ResultJoinErr(this.error)
	}
	joinCollectErr<L extends any[]>(...others: ResultTuple<L, E>): ResultJoin<[T, ...L], E[]> {
		return new ResultJoinErr(others.reduce((errors, other) => {
			if (other.isErr())
				errors.push(other.error)
			return errors
		}, [this.error] as E[]) as E[])
	}

	tap(fn: (r: Result<T, E>) => unknown): Result<T, E> {
		fn(this)
		return this
	}
	tapOk(_fn: (v: T) => unknown): Result<T, E> {
		return this
	}
	tapErr(fn: (e: E) => unknown): Result<T, E> {
		fn(this.error)
		return this
	}
}

export function Err<E>(error: E): Result<any, E> {
	return new ResultErr(error)
}


export type ResultTuple<L extends any[], E> = { [K in keyof L]: Result<L[K], E> }

export type ResultTupleUnpack<L extends Result<any, any>[]> =
	{ [K in keyof L]: L[K] extends Result<infer T, any> ? T : never }

export type ResultTupleError<L extends Result<any, any>[]> =
	L extends Result<any, infer E>[] ? E : never

export type ResultObjectUnpack<O extends Dict<Result<any, any>>> =
	{ [K in keyof O]: O[K] extends Result<infer T, any> ? T : never }

export type ResultObjectError<O extends Dict<Result<any, any>>> =
	O extends Dict<Result<any, infer E>> ? E : never


export type ResultJoin<L extends any[], E = string> = ResultJoinOk<L, E> | ResultJoinErr<L, E>

class ResultJoinOk<L extends any[], E> {
	constructor(private readonly values: L) {}

	combine<T>(fn: (...args: L) => T): Result<T, E> {
		return Ok(fn(...this.values))
	}

	tryCombine<T>(fn: (...args: L) => Result<T, E>): Result<T, E> {
		return fn(...this.values)
	}

	intoResult(): Result<L, E> {
		return Ok(this.values as L)
	}
}

class ResultJoinErr<L extends any[], E> {
	constructor(private readonly error: E) {}

	combine<T>(_fn: (...args: L) => T): Result<T, E> {
		return Err(this.error)
	}

	tryCombine<T>(_fn: (...args: L) => Result<T, E>): Result<T, E> {
		return Err(this.error)
	}

	intoResult(): Result<L, E> {
		return Err(this.error)
	}
}


function _join<L extends Result<any, any>[]>(results: L): Result<ResultTupleUnpack<L>, ResultTupleError<L>> {
	// DANGER: test to ensure type invariant holds
	const args = [] as any as ResultTupleUnpack<L>
	for (const result of results)
		if (result.isOk())
			args.push(result.value)
		else return result

	return Ok(args)
}

function _joinCollectErr<L extends Result<any, any>[]>(results: L): Result<ResultTupleUnpack<L>, ResultTupleError<L>[]> {
	// DANGER: test to ensure type invariant holds
	const args = [] as any as ResultTupleUnpack<L>
	const errs = [] as ResultTupleError<L>[]
	let seenErr = false
	for (const result of results) {
		if (result.isOk()) {
			if (!seenErr)
				args.push(result.value)
		}
		else {
			seenErr = true
			errs.push(result.error)
		}
	}

	if (seenErr) return Err(errs)
	else return Ok(args)
}

export namespace Result {
	export function fromNillable<T, E>(value: T | null | undefined, err: ProducerOrValue<E>): Result<T, E> {
		return value === null || value === undefined
			? Err(typeof err === 'function' ? (err as () => E)() : err)
			: Ok(value)
	}

	export function isResult(value: unknown): value is Result<unknown, unknown> {
		return value !== null && value !== undefined
			&& ((value as any)._type === ResultType.Ok || (value as any)._type === ResultType.Err)
	}

	export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
		return _join(results)
	}

	export function allCollectErr<T, E>(results: Result<T, E>[]): Result<T[], E[]> {
		return _joinCollectErr(results)
	}

	export function join<L extends Result<any, any>[]>(...results: L): ResultJoin<ResultTupleUnpack<L>, ResultTupleError<L>> {
		const resultsJoin = _join(results)
		return resultsJoin.isOk()
			? new ResultJoinOk(resultsJoin.value)
			: new ResultJoinErr(resultsJoin.error)
	}

	export function joinCollectErr<L extends Result<any, any>[]>(...results: L): ResultJoin<ResultTupleUnpack<L>, ResultTupleError<L>[]> {
		const resultsJoin = _joinCollectErr(results)
		return resultsJoin.isOk()
			? new ResultJoinOk(resultsJoin.value)
			: new ResultJoinErr(resultsJoin.error)
	}

	export function joinObject<O extends Dict<Result<any, any>>>(
		obj: O,
	): Result<ResultObjectUnpack<O>, ResultObjectError<O>> {
		const give = {} as ResultObjectUnpack<O>
		for (const key in obj) {
			const result = obj[key] as Result<any, ResultObjectError<O>>
			if (result.isErr())
				return Err(result.error)
			give[key] = result.value
		}

		return Ok(give)
	}

	export function joinObjectCollectErr<O extends Dict<Result<any, any>>>(
		obj: O,
	): Result<ResultObjectUnpack<O>, ResultObjectError<O>[]> {
		const give = {} as ResultObjectUnpack<O>
		const errors = [] as ResultObjectError<O>[]
		for (const key in obj) {
			const result = obj[key] as Result<any, ResultObjectError<O>>
			if (result.isErr()) {
				errors.push(result.error)
				continue
			}
			give[key] = result.value
		}

		return errors.length === 0 ? Ok(give) : Err(errors)
	}

	export function filter<T, E>(results: Result<T, E>[]): T[] {
		const give = [] as T[]
		for (const result of results) {
			if (result.isOk()) {
				give.push(result.value)
			}
		}

		return give
	}

	export function split<T, E>(results: Result<T, E>[]): [T[], E[]] {
		const oks = [] as T[]
		const errs = [] as E[]
		for (const result of results) {
			if (result.isOk())
				oks.push(result.value)
			else
				errs.push(result.error)
		}

		return [oks, errs]
	}

	export function attempt<T>(fn: () => T): Result<T, Error> {
		try {
			return Ok(fn())
		}
		catch (e) {
			return Err(e)
		}
	}
}

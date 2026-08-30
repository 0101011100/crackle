import { test, expect } from 'vitest'

import { Schema, SchemaError, type Infer } from '@userscript/mini-schema.js'

test('parses primitive values', () => {
	expect(Schema.String().Parse('crackle')).toBe('crackle')
	expect(Schema.Number().Parse(3)).toBe(3)
	expect(Schema.Boolean().Parse(false)).toBe(false)
	expect(Schema.Unknown().Parse({ value: true })).toEqual({ value: true })
})

test('returns safe parse failures without throwing', () => {
	const Result = Schema.Number().SafeParse(Number.NaN)

	expect(Result.Success).toBe(false)

	if (!Result.Success) {
		expect(Result.Error instanceof SchemaError).toBe(true)
		expect(Result.Error.Issues[0]).toEqual({
			Path: [],
			Message: 'Expected number',
			Expected: 'number',
			Received: 'number'
		})
	}
})

test('throws schema errors from parse', () => {
	let CaughtError: SchemaError | undefined

	try {
		Schema.Boolean().Parse('no')
	} catch (Error) {
		CaughtError = Error as SchemaError
	}

	expect(CaughtError).toBeInstanceOf(SchemaError)
	expect(CaughtError?.Issues[0]?.Message).toBe('Expected boolean')
})

test('parses objects and strips unknown keys', () => {
	const UserSchema = Schema.Object({
		id: Schema.String(),
		meta: Schema.Object({
			active: Schema.Boolean()
		}),
		tags: Schema.Array(Schema.String()).Default([])
	})

	const ParsedUser: Infer<typeof UserSchema> = UserSchema.Parse({
		id: 'u-1',
		meta: {
			active: true
		},
		extra: 'ignored'
	})

	expect(ParsedUser).toEqual({
		id: 'u-1',
		meta: {
			active: true
		},
		tags: []
	})
})

test('strict objects reject unknown keys', () => {
	const UserSchema = Schema.StrictObject({
		id: Schema.String()
	})

	const Result = UserSchema.SafeParse({
		id: 'u-1',
		extra: true
	})

	expect(Result.Success).toBe(false)

	if (!Result.Success) {
		expect(Result.Error.Issues).toEqual([{
			Path: ['extra'],
			Message: 'Unrecognized key "extra"'
		}])
	}
})

test('strict object issues include nested unknown key paths', () => {
	const UserSchema = Schema.StrictObject({
		meta: Schema.StrictObject({
			active: Schema.Boolean()
		})
	})

	const Result = UserSchema.SafeParse({
		meta: {
			active: true,
			extra: 'ignored'
		}
	})

	expect(Result.Success).toBe(false)

	if (!Result.Success) {
		expect(Result.Error.Issues[0]).toEqual({
			Path: ['meta', 'extra'],
			Message: 'Unrecognized key "extra"'
		})
	}
})

test('loose objects preserve unknown keys', () => {
	const UserSchema = Schema.LooseObject({
		id: Schema.String()
	})

	expect(UserSchema.Parse({
		id: 'u-1',
		extra: true
	})).toEqual({
		id: 'u-1',
		extra: true
	})
})

test('reports nested object and array paths', () => {
	const ConfigSchema = Schema.Object({
		items: Schema.Array(Schema.Object({
			label: Schema.String()
		}))
	})

	const Result = ConfigSchema.SafeParse({
		items: [
			{
				label: 'ok'
			},
			{
				label: 42
			}
		]
	})

	expect(Result.Success).toBe(false)

	if (!Result.Success) {
		expect(Result.Error.Issues[0]?.Path).toEqual(['items', 1, 'label'])
		expect(Result.Error.Issues[0]?.Message).toBe('Expected string')
	}
})

test('supports optional nullable and default modifiers', () => {
	const OptionsSchema = Schema.Object({
		name: Schema.String().Optional(),
		count: Schema.Number().Default(1),
		note: Schema.String().Nullable()
	})

	expect(OptionsSchema.Parse({ note: null })).toEqual({
		name: undefined,
		count: 1,
		note: null
	})
})

test('supports literal enum union and record schemas', () => {
	const PreferenceSchema = Schema.Object({
		mode: Schema.Union([
			Schema.Literal('auto'),
			Schema.Enum(['light', 'dark'] as const)
		]),
		weights: Schema.Record(Schema.Number())
	})

	expect(PreferenceSchema.Parse({
		mode: 'dark',
		weights: {
			alpha: 1,
			beta: 2
		}
	})).toEqual({
		mode: 'dark',
		weights: {
			alpha: 1,
			beta: 2
		}
	})

	const Result = PreferenceSchema.SafeParse({
		mode: 'contrast',
		weights: {
			alpha: 1
		}
	})

	expect(Result.Success).toBe(false)

	if (!Result.Success) {
		expect(Result.Error.Issues[0]?.Message).toBe('Expected input to match one union member')
		expect(Result.Error.Issues[0]?.Path).toEqual(['mode'])
	}
})

test('supports refine and transform effects', () => {
	const PortSchema = Schema.Number()
		.Refine(Value => Number.isInteger(Value), 'Expected integer')
		.Refine(Value => Value > 0, 'Expected positive number')
		.Transform(Value => `:${Value}`)

	expect(PortSchema.Parse(443)).toBe(':443')

	const Result = PortSchema.SafeParse(-1)

	expect(Result.Success).toBe(false)

	if (!Result.Success) {
		expect(Result.Error.Issues[0]?.Message).toBe('Expected positive number')
	}
})

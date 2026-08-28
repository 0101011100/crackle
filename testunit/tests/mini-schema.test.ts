import Test from 'ava'

import { Schema, SchemaError, type Infer } from '@userscript/mini-schema.js'

Test('parses primitive values', T => {
	T.is(Schema.String().Parse('crackle'), 'crackle')
	T.is(Schema.Number().Parse(3), 3)
	T.is(Schema.Boolean().Parse(false), false)
	T.deepEqual(Schema.Unknown().Parse({ value: true }), { value: true })
})

Test('returns safe parse failures without throwing', T => {
	const Result = Schema.Number().SafeParse(Number.NaN)

	T.false(Result.Success)

	if (!Result.Success) {
		T.true(Result.Error instanceof SchemaError)
		T.deepEqual(Result.Error.Issues[0], {
			Path: [],
			Message: 'Expected number',
			Expected: 'number',
			Received: 'number'
		})
	}
})

Test('throws schema errors from parse', T => {
	const CaughtError = T.throws(() => Schema.Boolean().Parse('no'), { instanceOf: SchemaError })

	T.is(CaughtError?.Issues[0]?.Message, 'Expected boolean')
})

Test('parses objects and strips unknown keys', T => {
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

	T.deepEqual(ParsedUser, {
		id: 'u-1',
		meta: {
			active: true
		},
		tags: []
	})
})

Test('strict objects reject unknown keys', T => {
	const UserSchema = Schema.StrictObject({
		id: Schema.String()
	})

	const Result = UserSchema.SafeParse({
		id: 'u-1',
		extra: true
	})

	T.false(Result.Success)

	if (!Result.Success) {
		T.deepEqual(Result.Error.Issues, [{
			Path: ['extra'],
			Message: 'Unrecognized key "extra"'
		}])
	}
})

Test('strict object issues include nested unknown key paths', T => {
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

	T.false(Result.Success)

	if (!Result.Success) {
		T.deepEqual(Result.Error.Issues[0], {
			Path: ['meta', 'extra'],
			Message: 'Unrecognized key "extra"'
		})
	}
})

Test('loose objects preserve unknown keys', T => {
	const UserSchema = Schema.LooseObject({
		id: Schema.String()
	})

	T.deepEqual(UserSchema.Parse({
		id: 'u-1',
		extra: true
	}), {
		id: 'u-1',
		extra: true
	})
})

Test('reports nested object and array paths', T => {
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

	T.false(Result.Success)

	if (!Result.Success) {
		T.deepEqual(Result.Error.Issues[0]?.Path, ['items', 1, 'label'])
		T.is(Result.Error.Issues[0]?.Message, 'Expected string')
	}
})

Test('supports optional nullable and default modifiers', T => {
	const OptionsSchema = Schema.Object({
		name: Schema.String().Optional(),
		count: Schema.Number().Default(1),
		note: Schema.String().Nullable()
	})

	T.deepEqual(OptionsSchema.Parse({ note: null }), {
		name: undefined,
		count: 1,
		note: null
	})
})

Test('supports literal enum union and record schemas', T => {
	const PreferenceSchema = Schema.Object({
		mode: Schema.Union([
			Schema.Literal('auto'),
			Schema.Enum(['light', 'dark'] as const)
		]),
		weights: Schema.Record(Schema.Number())
	})

	T.deepEqual(PreferenceSchema.Parse({
		mode: 'dark',
		weights: {
			alpha: 1,
			beta: 2
		}
	}), {
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

	T.false(Result.Success)

	if (!Result.Success) {
		T.is(Result.Error.Issues[0]?.Message, 'Expected input to match one union member')
		T.deepEqual(Result.Error.Issues[0]?.Path, ['mode'])
	}
})

Test('supports refine and transform effects', T => {
	const PortSchema = Schema.Number()
		.Refine(Value => Number.isInteger(Value), 'Expected integer')
		.Refine(Value => Value > 0, 'Expected positive number')
		.Transform(Value => `:${Value}`)

	T.is(PortSchema.Parse(443), ':443')

	const Result = PortSchema.SafeParse(-1)

	T.false(Result.Success)

	if (!Result.Success) {
		T.is(Result.Error.Issues[0]?.Message, 'Expected positive number')
	}
})

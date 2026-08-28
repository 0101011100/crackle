export type SchemaPath = Array<string | number>

export type SchemaIssue = {
	Path: SchemaPath
	Message: string
	Expected?: string
	Received?: string
}

export type SafeParseResult<Value> =
	| {
			readonly Success: true
			readonly Data: Value
	  }
	| {
			readonly Success: false
			readonly Error: SchemaError
	  }

type ParseSuccess<Value> = {
	readonly Success: true
	readonly Data: Value
}

type ParseFailure = {
	readonly Success: false
	readonly Issues: SchemaIssue[]
}

type ParseResult<Value> = ParseSuccess<Value> | ParseFailure

type Parser<Value> = (Input: unknown, Path: SchemaPath) => ParseResult<Value>

type Shape = Record<string, SchemaDefinition<unknown>>

type InferShape<SchemaShape extends Shape> = {
	[Key in keyof SchemaShape]: Infer<SchemaShape[Key]>
}

type Literal = string | number | boolean | null

type EnumValues = readonly [string, ...string[]]

export type Infer<SchemaType extends SchemaDefinition<unknown>> = SchemaType extends SchemaDefinition<infer Value> ? Value : never

export class SchemaError extends Error {
	readonly Issues: readonly SchemaIssue[]

	constructor(Issues: readonly SchemaIssue[]) {
		super(Issues[0]?.Message ?? 'Invalid input')
		this.name = 'SchemaError'
		this.Issues = Issues
	}
}

export class SchemaDefinition<Value> {
	readonly #Parser: Parser<Value>

	constructor(Parser: Parser<Value>) {
		this.#Parser = Parser
	}

	ParseAt(Input: unknown, Path: SchemaPath): ParseResult<Value> {
		return this.#Parser(Input, Path)
	}

	Parse(Input: unknown): Value {
		const Result = this.ParseAt(Input, [])

		if (Result.Success) {
			return Result.Data
		}

		throw new SchemaError(Result.Issues)
	}

	SafeParse(Input: unknown): SafeParseResult<Value> {
		const Result = this.ParseAt(Input, [])

		if (Result.Success) {
			return {
				Success: true,
				Data: Result.Data
			}
		}

		return {
			Success: false,
			Error: new SchemaError(Result.Issues)
		}
	}

	Optional(): SchemaDefinition<Value | undefined> {
		return new SchemaDefinition<Value | undefined>((Input, Path) => {
			if (Input === undefined) {
				return Succeed(undefined)
			}

			return this.ParseAt(Input, Path)
		})
	}

	Nullable(): SchemaDefinition<Value | null> {
		return new SchemaDefinition<Value | null>((Input, Path) => {
			if (Input === null) {
				return Succeed(null)
			}

			return this.ParseAt(Input, Path)
		})
	}

	Default(DefaultValue: Value): SchemaDefinition<Value> {
		return new SchemaDefinition((Input, Path) => this.ParseAt(Input === undefined ? DefaultValue : Input, Path))
	}

	Refine(Predicate: (Value: Value) => boolean, Message = 'Invalid input'): SchemaDefinition<Value> {
		return new SchemaDefinition((Input, Path) => {
			const Result = this.ParseAt(Input, Path)

			if (!Result.Success) {
				return Result
			}

			if (!Predicate(Result.Data)) {
				return Fail(Path, Message)
			}

			return Result
		})
	}

	Transform<NextValue>(Mapper: (Value: Value) => NextValue): SchemaDefinition<NextValue> {
		return new SchemaDefinition((Input, Path) => {
			const Result = this.ParseAt(Input, Path)

			if (!Result.Success) {
				return Result
			}

			return Succeed(Mapper(Result.Data))
		})
	}
}

const Succeed = <Value>(Data: Value): ParseSuccess<Value> => ({
	Success: true,
	Data
})

const Fail = (Path: SchemaPath, Message: string, Expected?: string, Received?: string): ParseFailure => ({
	Success: false,
	Issues: [
		{
			Path,
			Message,
			Expected,
			Received
		}
	]
})

const TypeName = (Input: unknown): string => {
	if (Input === null) {
		return 'null'
	}

	if (Array.isArray(Input)) {
		return 'array'
	}

	return typeof Input
}

const IsPlainRecord = (Input: unknown): Input is Record<string, unknown> => {
	return typeof Input === 'object' && Input !== null && !Array.isArray(Input)
}

const Primitive = <Value>(Expected: string, Guard: (Input: unknown) => Input is Value): SchemaDefinition<Value> => {
	return new SchemaDefinition((Input, Path) => {
		if (Guard(Input)) {
			return Succeed(Input)
		}

		return Fail(Path, `Expected ${Expected}`, Expected, TypeName(Input))
	})
}

const LiteralLabel = (Value: Literal): string => JSON.stringify(Value)

type ObjectMode = 'strip' | 'strict' | 'loose'

const ObjectSchema = <SchemaShape extends Shape>(Shape: SchemaShape, Mode: ObjectMode) => {
	return new SchemaDefinition<InferShape<SchemaShape>>((Input, Path) => {
		if (!IsPlainRecord(Input)) {
			return Fail(Path, 'Expected object', 'object', TypeName(Input))
		}

		const Data = {} as InferShape<SchemaShape>
		const Issues: SchemaIssue[] = []

		for (const Key of Object.keys(Shape) as Array<keyof SchemaShape & string>) {
			const PropertyResult = Shape[Key].ParseAt(Input[Key], [...Path, Key])

			if (PropertyResult.Success) {
				Data[Key] = PropertyResult.Data as InferShape<SchemaShape>[typeof Key]
			} else {
				Issues.push(...PropertyResult.Issues)
			}
		}

		for (const Key of Object.keys(Input)) {
			if (Key in Shape) {
				continue
			}

			if (Mode === 'strict') {
				Issues.push({
					Path: [...Path, Key],
					Message: `Unrecognized key "${Key}"`
				})
			} else if (Mode === 'loose') {
				;(Data as Record<string, unknown>)[Key] = Input[Key]
			}
		}

		if (Issues.length > 0) {
			return {
				Success: false,
				Issues
			}
		}

		return Succeed(Data)
	})
}

export const Schema = {
	String: () => Primitive('string', (Input): Input is string => typeof Input === 'string'),
	Number: () => Primitive('number', (Input): Input is number => typeof Input === 'number' && Number.isFinite(Input)),
	Boolean: () => Primitive('boolean', (Input): Input is boolean => typeof Input === 'boolean'),
	Unknown: () => new SchemaDefinition((Input: unknown) => Succeed(Input)),
	Literal: <Value extends Literal>(Value: Value) => {
		return new SchemaDefinition<Value>((Input, Path) => {
			if (Input === Value) {
				return Succeed(Value)
			}

			return Fail(Path, `Expected ${LiteralLabel(Value)}`, LiteralLabel(Value), TypeName(Input))
		})
	},
	Enum: <Values extends EnumValues>(Values: Values) => {
		const AllowedValues = new Set<string>(Values)

		return new SchemaDefinition<Values[number]>((Input, Path) => {
			if (typeof Input === 'string' && AllowedValues.has(Input)) {
				return Succeed(Input as Values[number])
			}

			return Fail(Path, `Expected one of ${Values.join(', ')}`, Values.join(' | '), TypeName(Input))
		})
	},
	Array: <Item>(ItemSchema: SchemaDefinition<Item>) => {
		return new SchemaDefinition<Item[]>((Input, Path) => {
			if (!Array.isArray(Input)) {
				return Fail(Path, 'Expected array', 'array', TypeName(Input))
			}

			const Data: Item[] = []
			const Issues: SchemaIssue[] = []

			for (const [Index, Item] of Input.entries()) {
				const ItemResult = ItemSchema.ParseAt(Item, [...Path, Index])

				if (ItemResult.Success) {
					Data.push(ItemResult.Data)
				} else {
					Issues.push(...ItemResult.Issues)
				}
			}

			if (Issues.length > 0) {
				return {
					Success: false,
					Issues
				}
			}

			return Succeed(Data)
		})
	},
	Object: <SchemaShape extends Shape>(Shape: SchemaShape) => ObjectSchema(Shape, 'strip'),
	StrictObject: <SchemaShape extends Shape>(Shape: SchemaShape) => ObjectSchema(Shape, 'strict'),
	LooseObject: <SchemaShape extends Shape>(Shape: SchemaShape) => ObjectSchema(Shape, 'loose'),
	Union: <Options extends readonly [SchemaDefinition<unknown>, SchemaDefinition<unknown>, ...Array<SchemaDefinition<unknown>>]>(Options: Options) => {
		return new SchemaDefinition<Infer<Options[number]>>((Input, Path) => {
			const Issues: SchemaIssue[] = []

			for (const Option of Options) {
				const Result = Option.ParseAt(Input, Path)

				if (Result.Success) {
					return Succeed(Result.Data as Infer<Options[number]>)
				}

				Issues.push(...Result.Issues)
			}

			return {
				Success: false,
				Issues: [
					{
						Path,
						Message: 'Expected input to match one union member',
						Received: TypeName(Input)
					},
					...Issues
				]
			}
		})
	},
	Record: <Value>(ValueSchema: SchemaDefinition<Value>) => {
		return new SchemaDefinition<Record<string, Value>>((Input, Path) => {
			if (!IsPlainRecord(Input)) {
				return Fail(Path, 'Expected object', 'object', TypeName(Input))
			}

			const Data: Record<string, Value> = {}
			const Issues: SchemaIssue[] = []

			for (const [Key, Value] of Object.entries(Input)) {
				const Result = ValueSchema.ParseAt(Value, [...Path, Key])

				if (Result.Success) {
					Data[Key] = Result.Data
				} else {
					Issues.push(...Result.Issues)
				}
			}

			if (Issues.length > 0) {
				return {
					Success: false,
					Issues
				}
			}

			return Succeed(Data)
		})
	}
} as const

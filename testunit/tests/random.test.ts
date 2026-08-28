import Test from 'ava'

import { GenerateHex, GenerateNumber } from '@userscript/random.js'

function WithGetRandomValues(MockGetRandomValues: (Bytes: Uint8Array) => Uint8Array, TestBody: () => void): void {
	let OriginalDescriptor = Object.getOwnPropertyDescriptor(globalThis.crypto, 'getRandomValues')

	Object.defineProperty(globalThis.crypto, 'getRandomValues', {
		configurable: true,
		value: MockGetRandomValues
	})

	try {
		TestBody()
	} finally {
		if (OriginalDescriptor === undefined) {
			Reflect.deleteProperty(globalThis.crypto, 'getRandomValues')
		} else {
			Object.defineProperty(globalThis.crypto, 'getRandomValues', OriginalDescriptor)
		}
	}
}

Test('generates requested-length lowercase hex strings', T => {
	for (let Length of [0, 1, 2, 15, 32]) {
		let Result = GenerateHex(Length)

		T.is(Result.length, Length)
		T.regex(Result, /^[0-9a-f]*$/)
	}
})

Test('rejects invalid lengths', T => {
	for (let Length of [-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
		T.throws(() => GenerateHex(Length), { instanceOf: RangeError })
	}
})

Test('uses crypto getRandomValues for enough bytes', T => {
	let Called = false
	let RequestedByteLength = 0

	WithGetRandomValues(
		function MockGetRandomValues(Bytes: Uint8Array): Uint8Array {
			Called = true
			RequestedByteLength = Bytes.byteLength
			Bytes.set([0xab, 0xcd])

			return Bytes
		},
		() => {
			T.is(GenerateHex(3), 'abc')
			T.true(Called)
			T.is(RequestedByteLength, 2)
		}
	)
})

Test('generates numbers inside inclusive safe integer ranges', T => {
	for (let Index = 0; Index < 32; Index += 1) {
		let Result = GenerateNumber(-3, 7)

		T.true(Number.isInteger(Result))
		T.true(Result >= -3)
		T.true(Result <= 7)
	}
})

Test('returns fixed range values without random bytes', T => {
	let Called = false

	WithGetRandomValues(
		function MockGetRandomValues(Bytes: Uint8Array): Uint8Array {
			Called = true
			return Bytes
		},
		() => {
			T.is(GenerateNumber(42, 42), 42)
			T.false(Called)
		}
	)
})

Test('uses unbiased rejection sampling for generated numbers', T => {
	let Calls = 0
	let RequestedByteLength = 0

	WithGetRandomValues(
		function MockGetRandomValues(Bytes: Uint8Array): Uint8Array {
			Calls += 1
			RequestedByteLength = Bytes.byteLength
			Bytes[0] = Calls === 1 ? 255 : 7

			return Bytes
		},
		() => {
			T.is(GenerateNumber(10, 19), 17)
			T.is(Calls, 2)
			T.is(RequestedByteLength, 1)
		}
	)
})

Test('rejects invalid number ranges', T => {
	for (let Range of [
		[1.5, 2],
		[1, 2.5],
		[Number.NaN, 2],
		[1, Number.NaN],
		[Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 2],
		[2, 1]
	] as const) {
		T.throws(() => GenerateNumber(Range[0], Range[1]), { instanceOf: RangeError })
	}
})
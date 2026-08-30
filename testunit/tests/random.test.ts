import { test, expect } from 'vitest'

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

test('generates requested-length lowercase hex strings', () => {
	for (let Length of [0, 1, 2, 15, 32]) {
		let Result = GenerateHex(Length)

		expect(Result.length).toBe(Length)
		expect(Result).toMatch(/^[0-9a-f]*$/)
	}
})

test('rejects invalid lengths', () => {
	for (let Length of [-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
		expect(() => GenerateHex(Length)).toThrow(RangeError)
	}
})

test('uses crypto getRandomValues for enough bytes', () => {
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
			expect(GenerateHex(3)).toBe('abc')
			expect(Called).toBe(true)
			expect(RequestedByteLength).toBe(2)
		}
	)
})

test('generates numbers inside inclusive safe integer ranges', () => {
	for (let Index = 0; Index < 32; Index += 1) {
		let Result = GenerateNumber(-3, 7)

		expect(Number.isInteger(Result)).toBe(true)
		expect(Result >= -3).toBe(true)
		expect(Result <= 7).toBe(true)
	}
})

test('returns fixed range values without random bytes', () => {
	let Called = false

	WithGetRandomValues(
		function MockGetRandomValues(Bytes: Uint8Array): Uint8Array {
			Called = true
			return Bytes
		},
		() => {
			expect(GenerateNumber(42, 42)).toBe(42)
			expect(Called).toBe(false)
		}
	)
})

test('uses unbiased rejection sampling for generated numbers', () => {
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
			expect(GenerateNumber(10, 19)).toBe(17)
			expect(Calls).toBe(2)
			expect(RequestedByteLength).toBe(1)
		}
	)
})

test('rejects invalid number ranges', () => {
	for (let Range of [
		[1.5, 2],
		[1, 2.5],
		[Number.NaN, 2],
		[1, Number.NaN],
		[Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 2],
		[2, 1]
	] as const) {
		expect(() => GenerateNumber(Range[0], Range[1])).toThrow(RangeError)
	}
})
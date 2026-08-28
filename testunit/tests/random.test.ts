import Test from 'ava'

import { GenerateHex } from '@userscript/random.js'

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
	let OriginalDescriptor = Object.getOwnPropertyDescriptor(globalThis.crypto, 'getRandomValues')
	let Called = false
	let RequestedByteLength = 0

	Object.defineProperty(globalThis.crypto, 'getRandomValues', {
		configurable: true,
		value(Bytes: Uint8Array): Uint8Array {
			Called = true
			RequestedByteLength = Bytes.byteLength
			Bytes.set([0xab, 0xcd])

			return Bytes
		}
	})

	try {
		T.is(GenerateHex(3), 'abc')
		T.true(Called)
		T.is(RequestedByteLength, 2)
	} finally {
		if (OriginalDescriptor === undefined) {
			Reflect.deleteProperty(globalThis.crypto, 'getRandomValues')
		} else {
			Object.defineProperty(globalThis.crypto, 'getRandomValues', OriginalDescriptor)
		}
	}
})
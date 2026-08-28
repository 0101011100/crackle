import { OriginalUint8Array } from './intrinsics.js'

const HexCharacters = '0123456789abcdef'

export function GenerateHex(Length: number): string {
	if (!Number.isSafeInteger(Length) || Length < 0) {
		throw new RangeError('Length must be a non-negative safe integer')
	}

	if (Length === 0) {
		return ''
	}

	let Crypto = globalThis.crypto

	if (Crypto === undefined) {
		throw new Error('CSPRNG is not available')
	}

	let Bytes = new OriginalUint8Array(Math.ceil(Length / 2))
	Crypto.getRandomValues(Bytes)

	let Result = ''
	for (let Byte of Bytes) {
		Result += HexCharacters[Byte >> 4]
		Result += HexCharacters[Byte & 0x0f]
	}

	return Result.slice(0, Length)
}

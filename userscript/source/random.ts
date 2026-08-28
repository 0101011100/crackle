import { OriginalUint8Array } from './intrinsics.js'

const HexCharacters = '0123456789abcdef'

function GetCrypto(): Crypto {
	let Crypto = globalThis.crypto

	if (Crypto === undefined) {
		throw new Error('CSPRNG is not available')
	}

	return Crypto
}

function GenerateBigIntBelow(MaxExclusive: bigint): bigint {
	let ByteLength = Math.ceil(MaxExclusive.toString(2).length / 8)
	let RandomValueLimit = 1n << BigInt(ByteLength * 8)
	let AcceptedValueLimit = RandomValueLimit - (RandomValueLimit % MaxExclusive)
	let Bytes = new OriginalUint8Array(ByteLength)
	let Crypto = GetCrypto()

	while (true) {
		Crypto.getRandomValues(Bytes)

		let Value = 0n
		for (let Byte of Bytes) {
			Value = (Value << 8n) + BigInt(Byte)
		}

		if (Value < AcceptedValueLimit) {
			return Value % MaxExclusive
		}
	}
}

export function GenerateHex(Length: number): string {
	if (!Number.isSafeInteger(Length) || Length < 0) {
		throw new RangeError('Length must be a non-negative safe integer')
	}

	if (Length === 0) {
		return ''
	}

	let Bytes = new OriginalUint8Array(Math.ceil(Length / 2))
	let Crypto = GetCrypto()
	Crypto.getRandomValues(Bytes)

	let Result = ''
	for (let Byte of Bytes) {
		Result += HexCharacters[Byte >> 4]
		Result += HexCharacters[Byte & 0x0f]
	}

	return Result.slice(0, Length)
}

export function GenerateNumber(Min: number, Max: number): number {
	if (!Number.isSafeInteger(Min) || !Number.isSafeInteger(Max)) {
		throw new RangeError('Min and Max must be safe integers')
	}

	if (Min > Max) {
		throw new RangeError('Min must be less than or equal to Max')
	}

	if (Min === Max) {
		return Min
	}

	let Range = BigInt(Max) - BigInt(Min) + 1n
	return Number(BigInt(Min) + GenerateBigIntBelow(Range))
}

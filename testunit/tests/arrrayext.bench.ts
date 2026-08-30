import { bench, describe } from 'vitest'

import { UnionArrays } from '@userscript/arrrayext.js'

let SharedValues = Array.from({ length: 500 }, (UnusedValue, Index) => Index)
let FirstArray = [...SharedValues, ...SharedValues, ...Array.from({ length: 900 }, (UnusedValue, Index) => Index + 100)]
let SecondArray = [...SharedValues, ...Array.from({ length: 900 }, (UnusedValue, Index) => Index + 1_000)]
let ThirdArray = [...SharedValues, ...Array.from({ length: 900 }, (UnusedValue, Index) => Index + 2_000)]

describe('UnionArrays', () => {
	bench('intersects three arrays with duplicate values', () => {
		UnionArrays(FirstArray, SecondArray, ThirdArray)
	}, {time: 25_000})
})
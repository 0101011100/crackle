export function UnionArrays<T>(...Arrays: readonly (readonly T[])[]): T[] {
  if (Arrays.length === 0) {
    return []
  }

  const [FirstArray, ...RestArrays] = Arrays

  return [
    ...new Set(
      FirstArray.filter((Value) =>
        RestArrays.every((ThisArray) => ThisArray.includes(Value))
      )
    )
  ]
}

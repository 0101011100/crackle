type unsafeWindow = typeof globalThis
// oxlint-disable-next-line crackle/pascal-case
declare const unsafeWindow: unsafeWindow

export const Win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : globalThis
export const OriginalUint8Array = Win.Uint8Array
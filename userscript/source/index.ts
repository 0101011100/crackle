/*!
 * @license MPL-2.0
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Contributors:
 *   - See Git history at https://github.com/FilteringDev/crackle for detailed authorship information.
 */

// BUILD:START

type unsafeWindow = typeof window
// oxlint-disable-next-line crackle/pascal-case
declare const unsafeWindow: unsafeWindow

// oxlint-disable-next-line crackle/pascal-case
declare const EASYLIST_GENERIC_HIDE_SELECTORS: string[]

const Win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window
const UserscriptName = 'Crackle'

import { OriginalUint8Array } from './intrinsics.js'
import { IsGFPSchedule, IsNaverWaterfall } from './tunneled-schema.js'
import { GFPScheduleBlock, NaverWaterfallBlock } from './resource.js'
import { InstallXHRStatusMock, type XHRStatusMockRule } from './xhr-status-mock.js'
import { UnionArrays } from './arrrayext.js'
export { OriginalUint8Array }

Win.Uint8Array = new Proxy(Win.Uint8Array, {
  construct(Target: typeof Uint8Array, Args: ConstructorParameters<typeof Uint8Array>) {
    try {
      let TextDecoderInstance = new TextDecoder('utf-8', { fatal: true }).decode(Reflect.construct(Target, Args))
      let Msg = new OriginalUint8Array()
      switch (true) {
        case IsGFPSchedule(TextDecoderInstance):
          Msg = new TextEncoder().encode(JSON.stringify(GFPScheduleBlock()))
          console.debug(`[${UserscriptName}] Replaced GPF Schedule with a mock block`)
          // oxlint-disable-next-line typescript/no-unsafe-return 
          return Reflect.construct(Target, [Msg])
        case IsNaverWaterfall(TextDecoderInstance):
          Msg = new TextEncoder().encode(JSON.stringify(NaverWaterfallBlock()))
          console.debug(`[${UserscriptName}] Replaced Naver Waterfall with a mock block`)
          // oxlint-disable-next-line typescript/no-unsafe-return 
          return Reflect.construct(Target, [Msg])
        case TextDecoderInstance.includes('"dab"'): {
          const Json = JSON.parse(TextDecoderInstance)
          if (Json?.content?.dab) {
            Json.content.dab = false
            Msg = new TextEncoder().encode(JSON.stringify(Json))
            return Reflect.construct(Target, [Msg])
          }
          return Reflect.construct(Target, Args)
        }
        default:
          return Reflect.construct(Target, Args)
      }
    } catch {
      return Reflect.construct(Target, Args)
    }
  }
})

// CSS Style Properties Monkeying
const MonkeyedHTMLElement: WeakMap<CSSStyleProperties, boolean> = new WeakMap()

Win.getComputedStyle = new Proxy(Win.getComputedStyle, {
  apply(Target: typeof getComputedStyle, ThisArg: undefined, Args: Parameters<typeof getComputedStyle>) {
    const Result = Reflect.apply(Target, ThisArg, Args)
    if (Args[0] instanceof HTMLElement && UnionArrays(EASYLIST_GENERIC_HIDE_SELECTORS, [...Args[0].classList]).length > 0) {
      MonkeyedHTMLElement.set(Result, true)
    } else MonkeyedHTMLElement.set(Result, false)
    return Result
  }
})

Win.CSSStyleDeclaration.prototype.getPropertyValue = new Proxy(Win.CSSStyleDeclaration.prototype.getPropertyValue, {
  apply(Target: typeof Win.CSSStyleDeclaration.prototype.getPropertyValue, ThisArg: CSSStyleDeclaration, Args: Parameters<typeof Win.CSSStyleDeclaration.prototype.getPropertyValue>) {
    if (typeof Args[0] === 'string' && Args[0] === 'display' && MonkeyedHTMLElement.get(ThisArg)) {
      console.debug(`[${UserscriptName}] getPropertyValue('display') called on a monkeyed HTMLElement. Returning 'block' instead of the native value.`)
      return 'block'
    }
    return Reflect.apply(Target, ThisArg, Args)
  }
})

// Inject dab: false on core API endpoints
const OriginalFetch = Win.fetch
if (typeof OriginalFetch === 'function') {
  Win.fetch = async function (...Args: Parameters<typeof fetch>) {
    const ResponseInstance = await Reflect.apply(OriginalFetch, this, Args)
    const RequestUrl = Args[0] instanceof Request ? Args[0].url : String(Args[0] ?? '')

    if (RequestUrl && (RequestUrl.includes('/live-detail') || RequestUrl.includes('/live-status') || RequestUrl.includes('/videos/') || RequestUrl.includes('/clips/'))) {
      try {
        const ClonedResponse = ResponseInstance.clone()
        const JsonData = await ClonedResponse.json()
        if (JsonData?.content && JsonData.content.dab !== undefined) {
          JsonData.content.dab = false
          return new Response(JSON.stringify(JsonData), {
            status: ResponseInstance.status,
            statusText: ResponseInstance.statusText,
            headers: ResponseInstance.headers
          })
        }
      } catch { }
    }
    return ResponseInstance
  }
}

const XHRStatusMockRules: readonly XHRStatusMockRule[] = [{
  Method: 'OPTIONS',
  Url: /^https:\/\/nam\.veta\.naver\.com\//,
  Async: true,
  Status: 200,
  StatusText: 'OK'
}]
InstallXHRStatusMock(Win.XMLHttpRequest, XHRStatusMockRules, UserscriptName)

// BUILD:END

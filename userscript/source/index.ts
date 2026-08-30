/*!
 * @license MPL-2.0
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Contributors:
 *   - See Git history at https://github.com/0101011100/crackle for detailed authorship information.
 */

// BUILD:START

type unsafeWindow = typeof window
// oxlint-disable-next-line crackle/pascal-case
declare const unsafeWindow: unsafeWindow

const Win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window
const UserscriptName = 'Crackle'

import { OriginalUint8Array } from './intrinsics.js'
import { IsGFPSchedule, IsNaverWaterfall } from './tunneled-schema.js'
import { GFPScheduleBlock, NaverWaterfallBlock } from './resource.js'
import { InstallXHRStatusMock, type XHRStatusMockRule } from './xhr-status-mock.js'
import { UnionArrays } from './arrrayext.js'
export { OriginalUint8Array }

if (Win.crypto?.subtle?.decrypt) {
  const OriginalDecrypt = Win.crypto.subtle.decrypt
  Win.crypto.subtle.decrypt = async function (...Args: Parameters<typeof OriginalDecrypt>) {
    const PlainBuffer = await Reflect.apply(OriginalDecrypt, this, Args)

    try {
      const View = new Uint8Array(PlainBuffer)
      if (View.length >= 10 && View.length <= 131072) {
        const B0 = View[0]
        const IsJsonCandidate = B0 === 123 || (B0 === 239 && View[1] === 187 && View[2] === 191)
        if (IsJsonCandidate) {
          let TextDecoderInstance = new TextDecoder('utf-8').decode(View)
          let Replaced: string | undefined

          if (IsGFPSchedule(TextDecoderInstance)) {
            Replaced = JSON.stringify(GFPScheduleBlock())
            console.debug(`[${UserscriptName}] Replaced GFP Schedule with a mock block`)
          } else if (IsNaverWaterfall(TextDecoderInstance)) {
            Replaced = JSON.stringify(NaverWaterfallBlock())
            console.debug(`[${UserscriptName}] Replaced Naver Waterfall with a mock block`)
          } else if (TextDecoderInstance.includes('"dab"')) {
            const Json = JSON.parse(TextDecoderInstance)
            if (Json?.content?.dab) Json.content.dab = false, Replaced = JSON.stringify(Json)
          }

          if (Replaced !== undefined) {
            const Encoded = new TextEncoder().encode(Replaced)
            return Encoded.buffer
          }
        }
      }
    } catch { }

    return PlainBuffer
  }
}

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

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

const Win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window
const UserscriptName = 'Crackle'

import { OriginalUint8Array } from './intrinsics.js'
import { IsGFPSchedule, IsNaverWaterfall } from './tunneled-schema.js'
import { GFPScheduleBlock, NaverWaterfallBlock } from './resource.js'
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
        default:
          return Reflect.construct(Target, Args)
      }
    } catch {
      return Reflect.construct(Target, Args)
    }
  }
})

// BUILD:END

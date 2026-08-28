import { GenerateHex } from './random.js'

export function GFPScheduleBlock() {
  return {
    'head': {
      'version': '0.0.1',
      'description': 'GFP Video Ad Schedule'
    },
    'requestId': `vas-${crypto.randomUUID()}`,
    'videoAdScheduleId': 'LIVE_CHZZK_NDP_SCH',
    'adBreaks': []
  }
}

export function NaverWaterfallBlock() {
  return {
    'requestId': GenerateHex(32),
    'head': {
      'version': '0.0.1',
      'description': 'Naver SSP Waterfall List'
    },
    'eventTracking': {
      'ackImpressions': [
        {
          'url': 'https://siape.veta.naver.com/openrtb/nbackimp?'
        }
      ],
      'activeViewImpressions': [
        {
          'url': 'https://siape.veta.naver.com/openrtb/nbackimp?'
        }
      ],
      'clicks': [
        {
          'url': 'https://siape.veta.naver.com/openrtb/nbackimp?'
        }
      ],
      'completions': [
        {
          'url': 'https://siape.veta.naver.com/openrtb/nbackimp?'
        }
      ],
      'attached': [
        {
          'url': 'https://siape.veta.naver.com/openrtb/nbackimp?'
        }
      ],
      'renderedImpressions': [
        {
          'url': 'https://tivan.naver.com/sc2/11/'
        }
      ],
      'viewableImpressions': [
        {
          'url': 'https://tivan.naver.com/sc2/12/'
        }
      ],
      'loadErrors': [
        {
          'url': 'https://tivan.naver.com/sc2/91/'
        }
      ],
      'startErrors': [
        {
          'url': 'https://tivan.naver.com/sc2/92/'
        }
      ],
      'lazyRenderMediaFailed': [
        {
          'url': 'https://tivan.naver.com/sc2/93/'
        }
      ],
      'mute': [
        {
          'url': 'https://tivan.naver.com/sc2/5/'
        }
      ],
      'close': [
        {
          'url': 'https://tivan.naver.com/sc2/6/'
        }
      ]
    },
    'adUnit': 'w_live_chzzk_naver_va',
    'randomNumber': GenerateHex(2),
    'adDivId': 'live_player_layout',
    'videoSkipMin': 5,
    'videoSkipAfter': 5,
    'ads': []
    }
}
import { SimpleSecureReq } from '@typescriptprime/securereq'
import * as AGTree from '@adguard/agtree'
import { GenerateNumber } from '@userscript/random.js'

const ELSubscriptionUrl = new URL('https://easylist.to/easylist/easylist.txt')
const ELSelectorsConstant: string[] = ['.TopAdBox', '.ad--dart', '.ad-container-side',
  '.ad-tag__wrapper', '.ad_regular1', '.ad_slot_inread', '.adguru-modal-popup',
  '.ads_box_headline', '.adsmedrect', '.advert-loader', '.advertisementContainer',
  '.advertising-top-box', '.artnet-ads-ad', '.dianomi_context', '.divAdright',
  '.footer__ads--content', '.header-article-ads', '.header-bannerad', '.incontentAd',
  '.js-anchor-ad', '.module-box-ads', '.moduletable_advertisement', '.news-ad-square-a',
  '.nfy-ad-wrapper', '.rekl_left', '.sidebar-advert', '.slideshow-ad-wrapper', '.widget--local-ads',
  '.zaf-adhesion-container', '.zerg-widget'] 

async function FetchEL(): Promise<string> {
  return (await SimpleSecureReq.Request(ELSubscriptionUrl, { ExpectedAs: 'String' })).Body
}

function ConditionCosmeticFilter(Filter: AGTree.AnyRule): Filter is AGTree.ElementHidingRule {
  return Filter.category === 'Cosmetic' && Filter.type === 'ElementHidingRule' && Filter.domains.children.length === 0
}

function ExtractELSelectors(ELContent: string): string[] {
  const ELFiltersListTree = AGTree.FilterListParser.parse(ELContent)
  if (!ELFiltersListTree) {
    return []
  }
  
  const ELTree = new Set<AGTree.ElementHidingRule>()

  ELFiltersListTree.children.filter(ConditionCosmeticFilter).forEach(Filter => ELTree.add(Filter))
  return [...ELTree].map(Filter => Filter.body.selectorList.value ?? '').filter(Selector => Selector.length > 0)
}

function PickRandomSelectors(Selectors: string[], Count: number): string[] {
  const ShuffledSelectors = [...Selectors]
  const SelectionCount = Math.min(Count, ShuffledSelectors.length)

  for (let Index = 0; Index < SelectionCount; Index++) {
    const RandomIndex = GenerateNumber(Index, ShuffledSelectors.length - 1)
    ;[ShuffledSelectors[Index], ShuffledSelectors[RandomIndex]] = [ShuffledSelectors[RandomIndex], ShuffledSelectors[Index]]
  }

  return ShuffledSelectors.slice(0, SelectionCount)
}

export async function FetchEasyListGenericHideSelectors(): Promise<string[]> {
  const ELContent = await FetchEL()
  const ExtractedSelectors = ExtractELSelectors(ELContent)
  const SelectorsSet = new Set([...ELSelectorsConstant, ...PickRandomSelectors(ExtractedSelectors, 20)])
  return [...SelectorsSet]
}
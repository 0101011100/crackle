import { SimpleSecureReq } from '@typescriptprime/securereq'
import * as AGTree from '@adguard/agtree'

const ELSubscriptionUrl = new URL('https://easylist.to/easylist/easylist.txt')

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

export async function FetchEasyListGenericHideSelectors(): Promise<string[]> {
  const ELContent = await FetchEL()
  return ExtractELSelectors(ELContent)
}
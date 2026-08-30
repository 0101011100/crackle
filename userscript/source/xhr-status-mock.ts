export interface XHRStatusMockRule {
  readonly Method: string
  readonly Url: string | RegExp
  readonly Async: boolean
  readonly Status: number
  readonly StatusText: string
}

interface XHRStatusMockState {
  readonly Status?: number
  readonly StatusText?: string
}

function MatchesUrl(UrlMatcher: string | RegExp, Url: string): boolean {
  if (typeof UrlMatcher === 'string') return UrlMatcher === Url

  let LastIndex = UrlMatcher.lastIndex
  UrlMatcher.lastIndex = 0
  let Matches = UrlMatcher.test(Url)
  UrlMatcher.lastIndex = LastIndex
  return Matches
}

function FindStatusMockRule(Rules: readonly XHRStatusMockRule[], Method: string, Url: string, Async: boolean): XHRStatusMockRule | undefined {
  return Rules.find(Rule => Rule.Method.toUpperCase() === Method.toUpperCase() && Rule.Async === Async && MatchesUrl(Rule.Url, Url))
}

export function InstallXHRStatusMock(XMLHttpRequestConstructor: typeof XMLHttpRequest, Rules: readonly XHRStatusMockRule[], UserscriptName: string): void {
  const States: WeakMap<XMLHttpRequest, XHRStatusMockState> = new WeakMap()
  const OriginalStatusDescriptor = Object.getOwnPropertyDescriptor(XMLHttpRequestConstructor.prototype, 'status')

  if (OriginalStatusDescriptor?.get === undefined || OriginalStatusDescriptor.configurable === false) {
    throw new TypeError('XMLHttpRequest.prototype.status must be a configurable getter')
  }

  const OriginalStatusGetter = OriginalStatusDescriptor.get
  const OriginalOpen = XMLHttpRequestConstructor.prototype.open

  XMLHttpRequestConstructor.prototype.open = new Proxy(OriginalOpen, {
    apply(Target: typeof XMLHttpRequest.prototype.open, ThisArg: XMLHttpRequest, Args: Parameters<typeof XMLHttpRequest.prototype.open>) {
      let Method = String(Args[0])
      let Url = String(Args[1])
      let Async = Args[2] ?? true
      let Rule = FindStatusMockRule(Rules, Method, Url, Async)

      States.set(ThisArg, Rule === undefined ? {} : { Status: Rule.Status, StatusText: Rule.StatusText })
      if (Rule?.Status) console.debug(`[${UserscriptName}] XHR open() called with method=${Method}, url=${Url}, async=${Async}. Matched rule: ${Rule === undefined ? 'none' : JSON.stringify(Rule)}`)
      return Reflect.apply(Target, ThisArg, Args)
    }
  })

  Object.defineProperty(XMLHttpRequestConstructor.prototype, 'status', {
    configurable: OriginalStatusDescriptor.configurable,
    enumerable: OriginalStatusDescriptor.enumerable,
    get: function GetStatus(): number {
      let ThisArg = this as XMLHttpRequest
      let State = States.get(ThisArg)
      if (State?.Status !== undefined && ThisArg.readyState >= XMLHttpRequestConstructor.HEADERS_RECEIVED) {
        return State.Status
      }
      return Reflect.apply(OriginalStatusGetter, ThisArg, []) as number
    }
  })

  Object.defineProperty(XMLHttpRequestConstructor.prototype, 'statusText', {
    configurable: true,
    enumerable: true,
    get: function GetStatusText(): string {
      let ThisArg = this as XMLHttpRequest
      let State = States.get(ThisArg)
      if (State?.StatusText !== undefined && ThisArg.readyState >= XMLHttpRequestConstructor.HEADERS_RECEIVED) {
        return State.StatusText
      }
      return Reflect.apply(OriginalStatusGetter, ThisArg, []) === 200 ? 'OK' : 'Error'
    }
  })
}
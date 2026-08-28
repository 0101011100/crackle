import * as ESBuild from 'esbuild'
import PackageJson from '@npmcli/package-json'
import { CreateBanner } from './banner/index.js'
import { Build, type BuildOptions } from './build-core.js'

export class StandardBuild extends Build {
  constructor(FromOrOption: Build | BuildOptions, Option?: BuildOptions) {
    if (FromOrOption instanceof Build) {
      super(Option!)
      this.CopyStateFrom(FromOrOption)
      return
    }

    super(FromOrOption)
  }

  async Build() {
    const Banner = CreateBanner({
      Version: this.Options?.Version ?? (await PackageJson.load(this.ProjectRoot)).content.version ?? '0.0.0',
      BuildType: this.Options!.BuildType ?? 'production',
      Domains: new Set<string>(['chzzk.naver.com']),
      Name: 'crackle',
      Namespace: 'https://github.com/FilteringDev/crackle',
      DownloadURL: this.Options!.SubscriptionUrl,
      UpdateURL: this.Options!.SubscriptionUrl,
      HomepageURL: new URL('https://github.com/FilteringDev/crackle'),
      SupportURL: new URL('https://github.com/FilteringDev/crackle/issues'),
      License: 'MPL-2.0',
      Author: 'PiQuark6046 and contributors',
      Description: {
        en: 'Advert removal and anti-adblock bypass script for Naver Chzzk web site',
        ko: '네이버 치지직 웹 사이트에 대한 광고 제거 및 안티-애드블록 우회 스크립트'
      }
    })

    await ESBuild.build({
      entryPoints: [this.ProjectRoot + '/userscript/source/index.ts'],
      bundle: true,
      minify: this.Options!.Minify,
      outfile: `${this.ProjectRoot}/dist/crackle${this.Options!.BuildType === 'development' ? '.dev' : ''}.user.js`,
      banner: {
        js: Banner
      },
      target: ['es2024', 'chrome119', 'firefox142', 'safari26']
    })
  }
}

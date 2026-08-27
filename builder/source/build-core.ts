import * as Zod from 'zod'
import * as Process from 'node:process'
import { SafeInitCwd } from './utils/safe-init-cwd.js'

export type BuildOptions = {
  Minify: boolean
  BuildType: 'production' | 'development'
  SubscriptionUrl: string
  Version?: string
}

export class Build {
  protected Options: {
    Minify: boolean
    BuildType: 'production' | 'development'
    SubscriptionUrl: URL
    Version?: string
  } | undefined = undefined
  protected ProjectRoot = SafeInitCwd({ Cwd: Process.cwd(), InitCwd: Process.env.INIT_CWD })

  constructor(Option: BuildOptions) {
    this.Options = Zod.strictObject({
      Minify: Zod.boolean(),
      BuildType: Zod.enum(['production', 'development']),
      SubscriptionUrl: Zod.string().transform(Value => new URL(Value)),
      Version: Zod.string().optional()
    }).parse(Option)
  }

  protected CopyStateFrom(From: Build): void {
    this.Options = From.Options
    this.ProjectRoot = From.ProjectRoot
  }
}

import * as Zod from 'zod'
import * as Process from 'node:process'
import { ParseArgumentsAndOptions, FilterArgumentsForOptions } from '@typescriptprime/parsing'
import { StandardBuild } from './build.js'
import type { BuildOptions } from './build-core.js'

let ParsedArgv = (await ParseArgumentsAndOptions<BuildOptions>(FilterArgumentsForOptions(Process.argv))).Options
let Options = await Zod.strictObject({
  Minify: Zod.string().pipe(Zod.enum(['true', 'false'])).transform(Value => Value === 'true').default(true),
  BuildType: Zod.enum(['production', 'development']),
  SubscriptionUrl: Zod.string()
}).parseAsync(ParsedArgv)

await new StandardBuild(Options).Build()
console.log('StandardBuild completed successfully.')

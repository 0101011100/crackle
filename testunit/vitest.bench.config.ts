import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	resolve: {
		alias: [
			{
				find: /^@userscript\/(.*)\.js$/,
				replacement: fileURLToPath(new URL('../userscript/source/$1.ts', import.meta.url))
			},
			{
				find: /^@userscript\/(.*)$/,
				replacement: fileURLToPath(new URL('../userscript/source/$1', import.meta.url))
			}
		]
	},
	test: {
		include: ['tests/**/*.bench.ts']
	}
})
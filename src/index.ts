/**
 * astro-avdeb — Astro integration.
 *
 * Registers two virtual modules:
 *   virtual:astro-avdeb/config      validated options (server-only: holds the secret key)
 *   virtual:astro-avdeb/styles.css  the default stylesheet, or an empty file with `styles: false`
 *
 * Components live in `astro-avdeb/components`; headless data access in `astro-avdeb/data`.
 */

import { fileURLToPath } from "node:url";

import type { AstroIntegration } from "astro";

import { PACKAGE_NAME } from "./constants.ts";
import { resolveConfig, type AvdebOptions, type ResolvedConfig } from "./display.ts";
import { readEnv } from "./env.ts";

export type { AvdebOptions } from "./display.ts";
export type { CardStyle, Layout, Theme, ImageRatio, ProductVariant, ButtonVariant, Alignment } from "./constants.ts";

const CONFIG_ID = "virtual:astro-avdeb/config";
const STYLES_ID = "virtual:astro-avdeb/styles.css";
const RESOLVED_CONFIG = "\0" + CONFIG_ID;
const EMPTY_STYLES = "\0astro-avdeb-empty.css";
const STYLESHEET = fileURLToPath(new URL("./styles.css", import.meta.url));

/**
 * Show AVDEB products in Astro with your referral code on every link.
 *
 * @example
 * // astro.config.mjs
 * import avdeb from "astro-avdeb";
 * export default defineConfig({ integrations: [avdeb({ theme: "auto", accentColor: "#7c3aed" })] });
 */
export default function avdeb(options: AvdebOptions = {}): AstroIntegration {
	return {
		name: PACKAGE_NAME,
		hooks: {
			"astro:config:setup": ({ config, command, updateConfig, logger }) => {
				const mode = command === "build" ? "production" : "development";
				const root = fileURLToPath(config.root);
				const resolved: ResolvedConfig = resolveConfig(options, readEnv(root, mode));
				for (const w of resolved.warnings) logger.warn(w);
				if (resolved.apiKey) logger.info("Using AVDEB secret key (referral code added automatically).");
				else if (resolved.refCode) logger.info(`Using referral code "${resolved.refCode}".`);
				else logger.info("No AVDEB secret key or referral code set — product links won't earn commission.");
				// Warnings are logged here once; keep the runtime quiet.
				const runtime: ResolvedConfig = { ...resolved, warnings: [] };
				const styles = options.styles !== false;

				updateConfig({
					vite: {
						plugins: [
							{
								name: "astro-avdeb:virtual",
								enforce: "pre",
								resolveId(id: string) {
									if (id === CONFIG_ID) return RESOLVED_CONFIG;
									if (id === STYLES_ID) return styles ? STYLESHEET : EMPTY_STYLES;
									return undefined;
								},
								load(id: string) {
									if (id === RESOLVED_CONFIG) return `export default ${JSON.stringify(runtime)};`;
									if (id === EMPTY_STYLES) return "";
									return undefined;
								},
							},
						],
					},
				});
			},
		},
	};
}

export { avdeb };

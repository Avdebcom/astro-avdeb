// Virtual modules provided by the astro-avdeb integration (see src/index.ts).
declare module "virtual:astro-avdeb/config" {
	const config: import("../src/display.ts").ResolvedConfig;
	export default config;
}

declare module "virtual:astro-avdeb/styles.css" {}

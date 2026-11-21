// Dev-only: lets `tsc` resolve `.astro` imports in src/components/index.ts.
// (.astro files are compiled by Astro in the consuming site.) Not published.
declare module "*.astro" {
	const Component: (props: Record<string, unknown>) => unknown;
	export default Component;
}

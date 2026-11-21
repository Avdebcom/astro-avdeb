/**
 * Headless access: products and render-ready cards for your own markup.
 * Server-side only (Astro frontmatter, endpoints). Requires the `astro-avdeb` integration.
 */

export { getAvdebProducts, type AvdebProductsResult, type ProductsInput } from "./runtime.ts";
export type { CardView, DisplayOverrides } from "./view.ts";
export type { Product } from "./catalog.ts";

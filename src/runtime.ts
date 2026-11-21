/**
 * Server-side data loading for the components and for `getAvdebProducts()`.
 *
 * One catalog client per server process (or per build), backed by an in-memory store, so every page
 * that embeds the same products shares one API call. Identical in-flight requests are merged.
 * Imports the integration's config — server-only; never import this from client scripts.
 */

/// <reference path="../types/virtual.d.ts" />

import config from "virtual:astro-avdeb/config";

import { parseAvdebLink, sanitizeQuery, maxLimit, type CatalogQuery, type Product } from "./catalog.ts";
import { createCatalogClient, type CatalogClient, type KVLike } from "./client.ts";
import { PACKAGE_NAME } from "./constants.ts";
import type { DisplaySettings, ResolvedConfig } from "./display.ts";
import {
	buildCards,
	disclosureFor,
	resolveDisplay,
	viewAllHref,
	type CardView,
	type DisplayOverrides,
	type ResolvedDisplay,
} from "./view.ts";

export interface EmbedData {
	products: Product[];
	ref: string;
	query: CatalogQuery;
	display: DisplaySettings;
	locale: string;
}

/** Simple Map-backed store with the KV interface the catalog client expects. */
export class MemoryStore implements KVLike {
	private data = new Map<string, unknown>();

	async get<T>(key: string): Promise<T | null> {
		return this.data.has(key) ? (this.data.get(key) as T) : null;
	}

	async set(key: string, value: unknown): Promise<void> {
		this.data.set(key, value);
	}

	async delete(key: string): Promise<boolean> {
		return this.data.delete(key);
	}

	async list(prefix = ""): Promise<Array<{ key: string; value: unknown }>> {
		const out: Array<{ key: string; value: unknown }> = [];
		for (const [key, value] of this.data) if (key.startsWith(prefix)) out.push({ key, value });
		return out;
	}
}

interface State {
	client: CatalogClient;
	inflight: Map<string, Promise<Omit<EmbedData, "locale">>>;
	warned: boolean;
}

// Kept on globalThis so dev-server reloads of this module reuse the cache.
const STATE = Symbol.for("astro-avdeb.state");
type Global = typeof globalThis & { [STATE]?: Map<string, State> };

function state(cfg: ResolvedConfig = config): State {
	const g = globalThis as Global;
	const all = (g[STATE] ??= new Map());
	const id = `${cfg.apiKey}|${cfg.refCode}|${cfg.cacheMinutes}|${cfg.requestsPerMinute}`;
	let s = all.get(id);
	if (!s) {
		s = {
			client: createCatalogClient({
				kv: new MemoryStore(),
				fetch: (url, init) => fetch(url, init),
				apiKey: cfg.apiKey,
				refCode: cfg.refCode,
				cacheMinutes: cfg.cacheMinutes,
				budgetPerMinute: cfg.requestsPerMinute,
				log: { warn: (message, data) => console.warn(`[${PACKAGE_NAME}] ${message}`, data ?? "") },
			}),
			inflight: new Map(),
			warned: false,
		};
		all.set(id, s);
	}
	if (!s.warned) {
		s.warned = true;
		for (const w of cfg.warnings) console.warn(`[${PACKAGE_NAME}] ${w}`);
	}
	return s;
}

/** What an embed asks for. `url` may be any avdeb.com creator, category or product link. */
export interface ProductsInput {
	url?: string;
	creator?: string;
	tag?: string;
	type?: string;
	q?: string;
	handle?: string;
	limit?: number;
}

export function toQuery(input: ProductsInput, cfg: ResolvedConfig = config): CatalogQuery {
	const link = parseAvdebLink(input.url);
	return sanitizeQuery(
		{
			creator: input.creator,
			tag: input.tag,
			type: input.type,
			q: input.q,
			handle: input.handle,
			limit: input.limit,
			...(link ? { [link.kind]: link.value } : {}),
		},
		maxLimit(Boolean(cfg.apiKey)),
	);
}

/** Products for an embed (cached). Never throws: on failure the product list is empty. */
export function loadEmbed(input: ProductsInput, locale?: string): Promise<EmbedData> {
	const s = state();
	const query = toQuery(input);
	const key = JSON.stringify(query);
	let hit = s.inflight.get(key);
	if (!hit) {
		hit = s.client
			.products(query)
			.then((out) => ({ products: out.products, ref: out.ref, query, display: config.display }))
			.catch((error: unknown) => {
				console.warn(`[${PACKAGE_NAME}] products failed:`, error);
				return { products: [] as Product[], ref: "", query, display: config.display };
			})
			.finally(() => s.inflight.delete(key));
		s.inflight.set(key, hit);
	}
	const resolvedLocale = config.locale || locale || "en-US";
	return hit.then((data) => ({ ...data, locale: resolvedLocale }));
}

/** The referral code links carry (the key owner's with a secret key, else `refCode`). */
export async function loadRef(): Promise<string> {
	try {
		return await state().client.ref();
	} catch {
		return config.refCode;
	}
}

export function siteDisplay(): DisplaySettings {
	return config.display;
}

export interface AvdebProductsResult {
	/** Validated products as returned by the catalog API (links already carry your referral code). */
	products: Product[];
	/** Render-ready cards: formatted prices, discount, `rel`, `target`, image size. */
	cards: CardView[];
	/** Referral code in use ("" when none). */
	ref: string;
	/** "View all" link for a creator or category query, else null. */
	viewAll: string | null;
	/** Affiliate disclosure text to show near the products, or null. */
	disclosure: string | null;
	/** The display settings after your overrides. */
	display: ResolvedDisplay;
}

/**
 * Headless access for fully custom markup: fetch (cached) products and ready-to-render cards.
 *
 * @example
 * ---
 * import { getAvdebProducts } from "astro-avdeb/data";
 * const { cards, disclosure } = await getAvdebProducts({ creator: "cleo", limit: 4 });
 * ---
 * {cards.map((c) => <a href={c.href} rel={c.rel}>{c.title} — {c.price}</a>)}
 */
export async function getAvdebProducts(
	input: ProductsInput,
	options: DisplayOverrides & { locale?: string } = {},
): Promise<AvdebProductsResult> {
	const data = await loadEmbed(input, options.locale);
	const display = resolveDisplay(data.display, options);
	return {
		products: data.products,
		cards: buildCards(data.products, display, { locale: data.locale }),
		ref: data.ref,
		viewAll: viewAllHref(data.query, data.products, data.ref),
		disclosure: disclosureFor(display, data.ref),
		display,
	};
}

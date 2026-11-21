/**
 * Display settings: defaults, validation, and the integration's option parser.
 * Pure module (no Astro imports) — shared by the integration, the runtime and tests.
 */

import { cleanRef, keyProblem, usableKey } from "./catalog.ts";
import {
	CARD_STYLES,
	IMAGE_RATIOS,
	LAYOUTS,
	oneOf,
	THEMES,
	type CardStyle,
	type ImageRatio,
	type Layout,
	type Theme,
} from "./constants.ts";

export const DEFAULT_DISCLOSURE = "As an AVDEB affiliate, I earn a commission from qualifying purchases.";

/** Presentation settings — safe to render (no credentials). */
export interface DisplaySettings {
	layout: Layout;
	columns: number;
	cardStyle: CardStyle;
	theme: Theme;
	accentColor: string;
	radius: number;
	imageRatio: ImageRatio;
	ctaLabel: string;
	showPrice: boolean;
	showCreator: boolean;
	showBadges: boolean;
	newTab: boolean;
	showDisclosure: boolean;
	disclosureText: string;
}

export const DEFAULT_DISPLAY: DisplaySettings = {
	layout: "grid",
	columns: 3,
	cardStyle: "elevated",
	theme: "inherit",
	accentColor: "",
	radius: 16,
	imageRatio: "square",
	ctaLabel: "View product",
	showPrice: true,
	showCreator: true,
	showBadges: true,
	newTab: false,
	showDisclosure: true,
	disclosureText: DEFAULT_DISCLOSURE,
};

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** A hex colour or "" — the value is placed in a style attribute, so nothing else is accepted. */
export function safeColor(value: unknown): string {
	const v = typeof value === "string" ? value.trim() : "";
	return HEX_RE.test(v) ? v.toLowerCase() : "";
}

export function int(value: unknown, min: number, max: number, fallback: number): number {
	const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
	return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

export function bool(value: unknown, fallback: boolean): boolean {
	if (typeof value === "boolean") return value;
	if (value === "true" || value === 1) return true;
	if (value === "false" || value === 0) return false;
	return fallback;
}

function text(value: unknown, max: number, fallback: string): string {
	const v = typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
	return v || fallback;
}

/** Validate display settings from any untrusted object. Missing or invalid values use `base`. */
export function parseDisplay(value: unknown, base: DisplaySettings = DEFAULT_DISPLAY): DisplaySettings {
	const v = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
	return {
		layout: oneOf(v.layout, LAYOUTS) ?? base.layout,
		columns: int(v.columns, 1, 6, base.columns),
		cardStyle: oneOf(v.cardStyle, CARD_STYLES) ?? base.cardStyle,
		theme: oneOf(v.theme, THEMES) ?? base.theme,
		accentColor: v.accentColor === undefined ? base.accentColor : safeColor(v.accentColor),
		radius: int(v.radius, 0, 32, base.radius),
		imageRatio: oneOf(v.imageRatio, IMAGE_RATIOS) ?? base.imageRatio,
		ctaLabel: text(v.ctaLabel, 40, base.ctaLabel),
		showPrice: bool(v.showPrice, base.showPrice),
		showCreator: bool(v.showCreator, base.showCreator),
		showBadges: bool(v.showBadges, base.showBadges),
		newTab: bool(v.newTab, base.newTab),
		showDisclosure: bool(v.showDisclosure, base.showDisclosure),
		disclosureText: text(v.disclosureText, 300, base.disclosureText),
	};
}

/** Options accepted by `avdeb()` in astro.config. */
export interface AvdebOptions extends Partial<DisplaySettings> {
	/**
	 * Secret key (`avdeb_sk_…`) from Partner dashboard → Embeds & API. Your referral code is then added
	 * automatically and embeds can show up to 48 products. Defaults to the `AVDEB_SECRET_KEY` env var.
	 * Server-only: never sent to the browser.
	 */
	apiKey?: string;
	/** Referral code added as `?ref=` when there's no secret key. Defaults to the `AVDEB_REF_CODE` env var. */
	refCode?: string;
	/** How long products are cached in memory, in minutes (5–2880, default 360). */
	cacheMinutes?: number;
	/** Max AVDEB API calls per minute from this site (default 120). */
	requestsPerMinute?: number;
	/** Locale for prices (default: the page's `Astro.currentLocale`, else "en-US"). */
	locale?: string;
	/**
	 * Ship the default stylesheet (default true). Set to false to style the `.avdeb*` classes yourself,
	 * or import `astro-avdeb/styles.css` where you want it (e.g. into a cascade layer).
	 */
	styles?: boolean;
}

/** What the integration serialises into `virtual:astro-avdeb/config` (server-only module). */
export interface ResolvedConfig {
	apiKey: string;
	refCode: string;
	cacheMinutes: number;
	requestsPerMinute: number;
	locale: string;
	display: DisplaySettings;
	warnings: string[];
}

const LOCALE_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

export function resolveConfig(opts: AvdebOptions = {}, env: Record<string, string | undefined> = {}): ResolvedConfig {
	const rawKey = (opts.apiKey ?? env.AVDEB_SECRET_KEY ?? "").trim();
	const rawRef = opts.refCode ?? env.AVDEB_REF_CODE ?? "";
	const warnings: string[] = [];
	const problem = keyProblem(rawKey);
	if (problem === "publishable") {
		warnings.push("apiKey is a publishable key (avdeb_pk_…). Use the secret key (avdeb_sk_…); links fall back to refCode.");
	} else if (problem === "malformed") {
		warnings.push("apiKey doesn't look like an AVDEB secret key (avdeb_sk_ + 32 characters); it is ignored.");
	}
	const refCode = cleanRef(rawRef);
	if (String(rawRef).trim() && refCode !== String(rawRef).trim()) {
		warnings.push(`refCode was cleaned to "${refCode}" (letters, digits, "-" and "_" only).`);
	}
	if (opts.accentColor && !safeColor(opts.accentColor)) {
		warnings.push(`accentColor "${opts.accentColor}" is not a hex colour; the default is used.`);
	}
	const locale = typeof opts.locale === "string" && LOCALE_RE.test(opts.locale) ? opts.locale : "";
	return {
		apiKey: usableKey(rawKey),
		refCode,
		cacheMinutes: int(opts.cacheMinutes, 5, 2880, 360),
		requestsPerMinute: int(opts.requestsPerMinute, 1, 6000, 120),
		locale,
		display: parseDisplay(opts),
		warnings,
	};
}

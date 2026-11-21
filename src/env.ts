/** Reads AVDEB_* variables for the integration (config time only, Node). */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Minimal .env reader (KEY=value, optional quotes, # comments) — only for AVDEB_* variables. */
export function parseEnvFile(source: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of source.split(/\r?\n/)) {
		const m = /^\s*(?:export\s+)?(AVDEB_[A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
		if (!m) continue;
		let value = m[2]!;
		const quoted = /^(["'])(.*)\1$/.exec(value);
		value = quoted ? quoted[2]! : value.replace(/\s+#.*$/, "");
		out[m[1]!] = value;
	}
	return out;
}

/** AVDEB_* variables from the project's .env files (Vite's order) with process.env taking priority. */
export function readEnv(root: string, mode: string): Record<string, string | undefined> {
	const merged: Record<string, string | undefined> = {};
	for (const file of [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`]) {
		try {
			Object.assign(merged, parseEnvFile(readFileSync(join(root, file), "utf8")));
		} catch {
			// missing file
		}
	}
	for (const k of ["AVDEB_SECRET_KEY", "AVDEB_REF_CODE"]) {
		if (process.env[k]) merged[k] = process.env[k];
	}
	return merged;
}

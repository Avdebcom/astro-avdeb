import { defineConfig } from "astro/config";
import avdeb from "astro-avdeb";

export default defineConfig({
	devToolbar: { enabled: false },
	integrations: [
		avdeb({
			// Secret key or referral code also come from AVDEB_SECRET_KEY / AVDEB_REF_CODE in .env
			refCode: "DEMO123",
			cardStyle: "elevated",
			accentColor: "#2f6b4f",
		}),
	],
});

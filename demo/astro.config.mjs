import { defineConfig } from "astro/config";
import avdeb from "astro-avdeb";

export default defineConfig({
	devToolbar: { enabled: false },
	integrations: [
		avdeb({
			// Referral code / secret key come from AVDEB_REF_CODE / AVDEB_SECRET_KEY in .env
			cardStyle: "elevated",
			accentColor: "#2f6b4f",
		}),
	],
});

import { config } from "dotenv";
import path from "path";

// Integration tests talk to the same Supabase project the app uses in dev —
// there's no separate test database (see README "Bekannte Lücken"). They are
// solely responsible for cleaning up everything they create.
config({ path: path.resolve(__dirname, "../.env.local") });

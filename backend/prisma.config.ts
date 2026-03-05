import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // The CLI needs a direct string to your Supabase DB
    url: env('DATABASE_URL'), 
  },
});

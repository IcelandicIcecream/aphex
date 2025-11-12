import { config } from 'dotenv';
import '../src/lib/generated-types';

// Load environment variables
config();

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL not set. Create a .env file with DATABASE_URL');
}

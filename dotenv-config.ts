import dotenv from 'dotenv';
import path from 'node:path';

// Load .env file from project root
dotenv.config({ path: path.join(process.cwd(), '.env') });

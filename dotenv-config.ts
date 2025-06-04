import dotenv from 'dotenv';
import path from 'node:path';

// Load .env file but don't override existing environment variables
dotenv.config({ 
  path: path.join(process.cwd(), '.env'),
  override: false 
});

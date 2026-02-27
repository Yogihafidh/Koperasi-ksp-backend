import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env di setiap worker process Jest agar DATABASE_URL tersedia
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Override untuk mode test
process.env.NODE_ENV = 'test';
process.env.TZ = 'Asia/Jakarta';

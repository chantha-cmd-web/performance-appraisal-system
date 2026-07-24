import dotenv from 'dotenv';
dotenv.config();
import { migrate } from './db';

migrate()
  .then(() => {
    console.log('Database migration completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database migration failed:', err);
    process.exit(1);
  });

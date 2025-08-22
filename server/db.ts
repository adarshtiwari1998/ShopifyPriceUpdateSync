import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Render PostgreSQL configuration
const renderConfig = {
  host: process.env.PGHOST || 'dpg-d2k81mom-78-3ht7l8u0mg1e5uh8mg60-a.oregon-postgres.render.com',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'shopifypriceupdatesync',
  user: process.env.PGUSER || 'shopifypriceupdatesync_user',
  password: process.env.PGPASSWORD || '5kTa9BoCIEhio',
  ssl: {
    rejectUnauthorized: false
  }
};

// Use Render DATABASE_URL if available, otherwise use individual config
const connectionConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : renderConfig;

export const pool = new Pool(connectionConfig);

export const db = drizzle(pool, { schema });

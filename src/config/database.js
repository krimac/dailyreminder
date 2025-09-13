const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Database configuration
const config = {
    host: process.env.DATABASE_HOST || '172.17.0.1',
    port: parseInt(process.env.DATABASE_PORT) || 5433,
    database: process.env.DATABASE_NAME || 'backbone_db',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    max: 10, // maximum number of clients in the pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
    connectionTimeoutMillis: 2000, // how long to wait when connecting a client
    searchPath: ['dailyreminder', 'public'], // set search path to our schema
    ssl: false, // disable SSL for local development
};

// Create connection pool
const pool = new Pool(config);

// Handle pool events
pool.on('connect', (client) => {
    console.log('📊 New database client connected');
    // Set search path for each new connection
    client.query('SET search_path TO dailyreminder, public');
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

// Test database connection
const testConnection = async () => {
    try {
        console.log('🧪 Testing database connection...');
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, current_database(), current_user');
        console.log('✅ Database connection successful!');
        console.log(`📅 Current time: ${result.rows[0].current_time}`);
        console.log(`🗄️  Database: ${result.rows[0].current_database}`);
        console.log(`👤 User: ${result.rows[0].current_user}`);
        client.release();
        return true;
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        return false;
    }
};

// Initialize database schema if needed
const initializeDatabase = async () => {
    try {
        console.log('🔧 Checking database schema...');
        const client = await pool.connect();

        // Check if schema exists
        const schemaCheck = await client.query(
            "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'dailyreminder'"
        );

        if (schemaCheck.rows.length === 0) {
            console.log('📋 Creating dailyreminder schema...');
            await client.query('CREATE SCHEMA dailyreminder');
        }

        // Set search path
        await client.query('SET search_path TO dailyreminder, public');

        // Check if tables exist
        const tableCheck = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'dailyreminder'
        `);

        console.log(`📊 Found ${tableCheck.rows.length} tables in dailyreminder schema`);
        client.release();
    } catch (err) {
        console.error('❌ Database initialization error:', err.message);
        throw err;
    }
};

module.exports = {
    pool,
    testConnection,
    initializeDatabase
};
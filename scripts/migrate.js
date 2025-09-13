const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../src/config/database');

async function runMigrations() {
    console.log('🔄 Running database migrations...');

    try {
        const migrationsDir = path.join(__dirname, '../migrations');
        const files = await fs.readdir(migrationsDir);

        // Filter and sort migration files
        const migrationFiles = files
            .filter(file => file.endsWith('.sql'))
            .sort();

        console.log(`📋 Found ${migrationFiles.length} migration files`);

        for (const file of migrationFiles) {
            console.log(`📄 Executing ${file}...`);

            const filePath = path.join(migrationsDir, file);
            const sql = await fs.readFile(filePath, 'utf8');

            await pool.query(sql);
            console.log(`✅ ${file} completed successfully`);
        }

        console.log('🎉 All migrations completed successfully!');

        // Test the schema by counting tables
        const result = await pool.query(`
            SELECT COUNT(*) as table_count
            FROM information_schema.tables
            WHERE table_schema = 'dailyreminder'
        `);

        console.log(`📊 Created ${result.rows[0].table_count} tables in dailyreminder schema`);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migrations if called directly
if (require.main === module) {
    runMigrations()
        .then(() => {
            console.log('✅ Migration process completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration process failed:', error);
            process.exit(1);
        });
}

module.exports = runMigrations;
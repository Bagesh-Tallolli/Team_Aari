import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  password: '2026',
  host: 'localhost',
  port: 5432,
  database: 'nutrition_db',
});

async function checkDatabase() {
  try {
    // Get all tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Tables in nutrition_db:');
    console.log('========================');
    result.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    // Get schema for each table
    for (const row of result.rows) {
      const tableName = row.table_name;
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position;
      `);

      console.log(`\n${tableName}:`);
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();

import { query, closeDB } from './src/config/db.js';

async function removeMock() {
  try {
    const res = await query(`DELETE FROM food_logs WHERE food_item LIKE '%Mock%'`);
    console.log(`Deleted ${res.rowCount} mock food logs`);

    // Let's also check if there are any mock health_status entries to delete
    // Actually if we just delete mock health_status, it might be good. But the user specifically asked for "remove this ptehr food mock data only keep tested real data"
    // Let's delete health statuses that might have been seeded as mock? Wait, they might have "mock" in reason.
    const res2 = await query(`DELETE FROM health_status WHERE reason LIKE '%Mock%'`);
    console.log(`Deleted ${res2.rowCount} mock health statuses`);

    await closeDB();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

removeMock();

import asyncio
import time
import uuid
from datetime import date

from sqlalchemy.ext.asyncio import create_async_engine


async def run_bench(num_workers, chunk_size, rows):
    db_url = "postgresql+asyncpg://flipkart_admin:password123@db:5432/product_verification"
    engine = create_async_engine(db_url)

    # Create workers
    workers = []
    queue = asyncio.Queue(maxsize=num_workers * 2)

    # Acquire connections
    for _ in range(num_workers):
        conn = await engine.connect()
        raw = await conn.get_raw_connection()
        apg = raw.driver_connection
        temp = f"_tmp_ingest_bench_{uuid.uuid4().hex[:12]}"
        await apg.execute(f"CREATE TEMP TABLE {temp} (LIKE products INCLUDING DEFAULTS)")
        await apg.execute("SET synchronous_commit = off")
        workers.append((conn, apg, temp))

    async def _worker(apg_conn, temp_table):
        while True:
            chunk = await queue.get()
            if chunk is None:
                break
            # copy
            await apg_conn.copy_records_to_table(temp_table, records=chunk, columns=("wid", "ean", "manufacturing_date", "expiry_date"))
            # merge
            cols = "wid, ean, manufacturing_date, expiry_date"
            await apg_conn.execute(
                f"INSERT INTO products ({cols}) SELECT {cols} FROM {temp_table} ON CONFLICT (wid) DO NOTHING"
            )
            await apg_conn.execute(f"TRUNCATE {temp_table}")
            queue.task_done()

    tasks = []
    for conn, apg, temp in workers:
        tasks.append(asyncio.create_task(_worker(apg, temp)))

    t_start = time.time()

    # Enqueue chunks
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i:i+chunk_size]
        await queue.put(chunk)

    # Wait for queue to be processed
    for _ in range(num_workers):
        await queue.put(None)

    await asyncio.gather(*tasks)
    t_elapsed = time.time() - t_start

    # Cleanup
    for conn, apg, temp in workers:
        try:
            await apg.execute(f"DROP TABLE IF EXISTS {temp}")
        except:
            pass
        await conn.close()

    await engine.dispose()
    return t_elapsed

async def main():
    # Let's generate 1,000,000 mock validated rows in memory
    print("Generating 1,000,000 mock rows in memory...")
    rows = []
    for i in range(1_000_000):
        # We want to check INSERT speed (with conflicts, as they already exist, and without conflicts using new WIDs)
        # First, let's test WITH conflicts (WIDs that already exist)
        wid = f"WID_EXISTING_{i:08d}"
        ean = "8901030753018"
        mfg = date(2024, 1, 10)
        exp = date(2025, 1, 10)
        rows.append((wid, ean, mfg, exp))

    configs = [
        (1, 1_000_000),
        (2, 500_000),
        (4, 250_000),
        (8, 125_000),
    ]

    for num_workers, chunk_size in configs:
        print(f"Testing Config: workers={num_workers}, chunk_size={chunk_size}...")
        t = await run_bench(num_workers, chunk_size, rows)
        print(f"  -> Time: {t:.2f} s | Speed: {1_000_000/t:.2f} rows/sec")

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
import time
import uuid
from datetime import date

from sqlalchemy.ext.asyncio import create_async_engine


async def main():
    db_url = "postgresql+asyncpg://flipkart_admin:password123@db:5432/product_verification"
    engine = create_async_engine(db_url)

    # Let's generate 1,000,000 mock validated rows in memory
    print("Generating 1,000,000 mock rows in memory...")
    rows = []
    t0 = time.time()
    for i in range(1_000_000):
        # Unique WID per run using UUID or loop index + timestamp
        wid = f"WID_{uuid.uuid4().hex[:12]}"
        ean = "8901030753018"
        mfg = date(2024, 1, 10)
        exp = date(2025, 1, 10)
        rows.append((wid, ean, mfg, exp))
    print(f"Generated 1,000,000 rows in {time.time() - t0:.2f} seconds")

    # Let's drop index ix_products_ean manually
    async with engine.connect() as conn:
        raw = await conn.get_raw_connection()
        drv = raw.driver_connection
        exists = await drv.fetchval("SELECT 1 FROM pg_indexes WHERE indexname = 'ix_products_ean'")
        if exists:
            print("Dropping ix_products_ean index...")
            await drv.execute("DROP INDEX IF EXISTS ix_products_ean")

    # Let's test different chunk sizes and worker counts
    num_workers = 4
    chunk_size = 250_000
    merge_every_n_chunks = 1 # Merge every chunk

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

    print("Starting DB insertion benchmark...")
    t_start = time.time()

    # Enqueue chunks
    # Divide 1M rows into chunks of `chunk_size`
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i:i+chunk_size]
        await queue.put(chunk)

    # Wait for queue to be processed
    for _ in range(num_workers):
        await queue.put(None)

    await asyncio.gather(*tasks)
    t_elapsed = time.time() - t_start

    print(f"Inserted 1,000,000 rows in {t_elapsed:.2f} seconds")
    print(f"Speed: {1_000_000 / t_elapsed:.2f} rows/sec")

    # Recreate index
    async with engine.connect() as conn:
        raw = await conn.get_raw_connection()
        drv = raw.driver_connection
        print("Recreating ix_products_ean index...")
        await drv.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_products_ean ON products (ean)")

    # Cleanup
    for conn, apg, temp in workers:
        try:
            await apg.execute(f"DROP TABLE IF EXISTS {temp}")
        except:
            pass
        await conn.close()

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())

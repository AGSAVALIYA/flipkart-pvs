import asyncio
import logging
import sys
import time

from sqlalchemy.ext.asyncio import create_async_engine

# Configure logging
logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

from src.infrastructure.bulk_loader import PostgresBulkLoader


async def main():
    db_url = "postgresql+asyncpg://flipkart_admin:password123@db:5432/product_verification"
    engine = create_async_engine(db_url)

    from sqlalchemy import text
    # Check current row count
    async with engine.connect() as conn:
        count = await conn.scalar(text("SELECT count(*) FROM products"))
        print(f"Current row count in products table: {count}")

    # Initialize loader with standard settings
    loader = PostgresBulkLoader(
        engine,
        num_workers=4,
        chunk_size=500_000,
        merge_every_n_chunks=3,
        max_error_details=200,
    )

    # We want to measure the performance of loader.load_csv
    # Let's time it
    print("Starting ingestion profile on 10M rows...")
    t0 = time.time()

    # Drop index manually before load for timing
    async with engine.connect() as conn:
        raw = await conn.get_raw_connection()
        drv = raw.driver_connection
        exists = await drv.fetchval("SELECT 1 FROM pg_indexes WHERE indexname = 'ix_products_ean'")
        if exists:
            print("Dropping EAN index...")
            t_drop = time.time()
            await drv.execute("DROP INDEX IF EXISTS ix_products_ean")
            print(f"Dropped EAN index in {time.time() - t_drop:.2f} seconds")

    t_load_start = time.time()
    # Modify the PostgresBulkLoader instance slightly to add timings to copy and merge operations
    original_copy = loader.load_csv

    result = await loader.load_csv("/workspace/product_data.csv")
    t_load_end = time.time()
    print(f"Loader completed in {t_load_end - t_load_start:.2f} seconds")
    print(f"Results: Total={result.total_rows}, Success={result.success_count}, Errors={result.error_count}")

    # Recreate index manually for timing
    async with engine.connect() as conn:
        raw = await conn.get_raw_connection()
        drv = raw.driver_connection
        print("Recreating EAN index...")
        t_index = time.time()
        await drv.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_products_ean ON products (ean)")
        print(f"Recreated EAN index in {time.time() - t_index:.2f} seconds")

    print(f"Total script execution time: {time.time() - t0:.2f} seconds")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())

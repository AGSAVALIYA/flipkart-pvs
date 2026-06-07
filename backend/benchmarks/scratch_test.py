import asyncio
import logging
import os
import sys

# Configure logging to stdout
logging.basicConfig(stream=sys.stdout, level=logging.INFO)

from src.app.dependencies import get_settings
from src.infrastructure.bulk_loader import PostgresBulkLoader
from src.infrastructure.database import get_session_factory
from src.infrastructure.redis import RedisCacheProvider, RedisClient
from src.infrastructure.storage.local import LocalFileStorage
from src.products.ingestion_repository import IngestionJobRepository
from src.products.repository import ProductRepository
from src.products.service import ProductService


async def main():
    settings = get_settings()
    session_factory = get_session_factory()

    # Setup dependencies
    storage = LocalFileStorage(settings.upload_dir, settings.image_dir)
    redis_client = RedisClient(settings.redis_url)
    cache = RedisCacheProvider(redis_client)

    async with session_factory() as session:
        product_repo = ProductRepository(session)
        ingestion_repo = IngestionJobRepository(session)
        loader = PostgresBulkLoader(session)
        service = ProductService(product_repo, storage, cache, ingestion_repo, loader)

        # Create a tiny mock file
        os.makedirs(settings.upload_dir, exist_ok=True)
        file_path = os.path.join(settings.upload_dir, "test_ingest.csv")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("WID,EAN,Manufacturing_Date,Expiry_Date\n")
            for i in range(100):
                f.write(f"WID_TEST_{i:04d},8901030753018,2024-01-10,2025-01-10\n")

        with open(file_path, "rb") as f:
            content = f.read()

        job_id = await service.upload_csv(content, "test_ingest.csv", "admin")
        print(f"Created job {job_id}")

        # Run process_ingestion
        await service.process_ingestion(job_id)

        # Inspect job status after execution
        # We need a new session since the previous session was committed/closed
        async with session_factory() as session2:
            ing_repo2 = IngestionJobRepository(session2)
            job = await ing_repo2.get_by_id(job_id)
            print(f"After Ingestion -> Status: {job.status}, Total Rows: {job.total_rows}, Processed: {job.processed_rows}, Errors: {job.error_count}")

        # Clean up
        if os.path.exists(file_path):
            os.remove(file_path)

    await redis_client.close()

if __name__ == "__main__":
    asyncio.run(main())

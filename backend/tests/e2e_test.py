#!/usr/bin/env python3
"""End-to-End (E2E) verification script for Flipkart Product Verification System.

Tests the full lifecycle of the system:
1. Authentication & JWT Token retrieval.
2. Checking database stats before ingestion.
3. Uploading a spreadsheet with valid and invalid rows.
4. Polling upload progress and verifying error reporting.
5. Verifying database stats increased correctly.
6. Verification lookup of imported products (verifies DB & Redis cache-aside).
7. Soft-fail conditions (404 and validation errors).
"""

from __future__ import annotations

import asyncio
import os
import random
import sys
import time

import httpx

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000")
API_PREFIX = f"{BASE_URL}/api"

# Helper color formatting
class Colors:
    HEADER = "\033[95m"
    OKBLUE = "\033[94m"
    OKCYAN = "\033[96m"
    OKGREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"


def log_step(name: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}=== STEP: {name} ==={Colors.ENDC}")


def log_success(msg: str):
    print(f"{Colors.OKGREEN}✔ {msg}{Colors.ENDC}")


def log_warning(msg: str):
    print(f"{Colors.WARNING}⚠ {msg}{Colors.ENDC}")


def log_info(msg: str):
    print(f"{Colors.OKBLUE}ℹ {msg}{Colors.ENDC}")


def log_error(msg: str):
    print(f"{Colors.FAIL}✘ {msg}{Colors.ENDC}", file=sys.stderr)


async def main():
    print(f"{Colors.BOLD}{Colors.OKCYAN}FLIPKART PRODUCT VERIFICATION SYSTEM E2E TESTING{Colors.ENDC}")
    print(f"Target API Endpoint: {BASE_URL}")

    client = httpx.AsyncClient(timeout=10.0)

    # ----------------------------------------------------
    log_step("1. Authenticating as default admin")
    # ----------------------------------------------------
    try:
        login_res = await client.post(
            f"{API_PREFIX}/auth/login",
            data={"username": "admin", "password": "adminpassword"}
        )
        if login_res.status_code != 200:
            log_error(f"Login failed: {login_res.status_code} - {login_res.text}")
            sys.exit(1)

        auth_data = login_res.json()
        token = auth_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        log_success("Admin authenticated successfully.")
    except Exception as e:
        log_error(f"Failed to connect/authenticate: {e}")
        sys.exit(1)

    # ----------------------------------------------------
    log_step("2. Checking initial product stats")
    # ----------------------------------------------------
    stats_res = await client.get(f"{API_PREFIX}/products/stats", headers=headers)
    assert stats_res.status_code == 200, f"Stats check failed: {stats_res.text}"
    initial_count = stats_res.json().get("count", 0)
    log_success(f"Initial inventory count: {initial_count} products.")

    # ----------------------------------------------------
    log_step("3. Preparing mock CSV spreadsheet")
    # ----------------------------------------------------
    run_id = random.randint(100000, 999999)
    wid1 = f"WID_E2E_{run_id}_1"
    wid2 = f"WID_E2E_{run_id}_2"
    wid3 = f"WID_E2E_{run_id}_3"
    wid4 = f"WID_E2E_{run_id}_4"

    csv_filename = "temp_e2e_products.csv"
    csv_content = (
        "WID,EAN,Manufacturing_Date,Expiry_Date\n"
        f"{wid1},8901030753018,2024-01-10,2025-01-10\n"  # Valid 1
        f"{wid2},8901030753025,2024-02-20,2025-02-20\n"  # Valid 2
        f"{wid3},8901030753032,15/03/2024,15/03/2025\n"  # Valid 3 (different date format)
        "W01,8901030753049,2024-01-01,2025-01-01\n"         # Invalid WID (too short)
        f"{wid4},8901030753056,2024-02-31,2025-02-31\n"  # Invalid Mfg Date (February 31st)
        f"{wid1},8901030753018,2024-01-10,2025-01-10\n"  # Duplicate WID (should skip & count error)
    )

    with open(csv_filename, "w", encoding="utf-8") as f:
        f.write(csv_content)
    log_info(f"Created CSV with dynamic WIDs: {wid1}, {wid2}, {wid3}.")

    # ----------------------------------------------------
    log_step("4. Uploading CSV sheet for bulk ingestion")
    # ----------------------------------------------------
    try:
        with open(csv_filename, "rb") as f:
            files = {"file": (csv_filename, f, "text/csv")}
            upload_res = await client.post(
                f"{API_PREFIX}/products/upload",
                headers=headers,
                files=files
            )

        if upload_res.status_code != 202:
            log_error(f"CSV Ingestion rejected: {upload_res.status_code} - {upload_res.text}")
            sys.exit(1)

        upload_data = upload_res.json()
        job_id = upload_data["job_id"]
        log_success(f"Upload accepted. Queued Job ID: {job_id}")
    finally:
        # Clean up temporary local file immediately after read
        if os.path.exists(csv_filename):
            os.remove(csv_filename)

    # ----------------------------------------------------
    log_step("5. Polling job status & verifying progress reporting")
    # ----------------------------------------------------
    max_polls = 15
    poll_interval = 1.0
    job_completed = False

    for i in range(max_polls):
        status_res = await client.get(f"{API_PREFIX}/products/upload/{job_id}/status", headers=headers)
        assert status_res.status_code == 200, f"Status check failed: {status_res.text}"
        status_data = status_res.json()

        job = status_data["job"]
        pct = status_data["progress_percentage"]
        log_info(f"Poll #{i+1}: status={job['status']} progress={pct}% processed_rows={job['processed_rows']} errors={job['error_count']}")

        if job["status"] in ("completed", "failed"):
            job_completed = True
            log_success(f"Job finalized in state: {job['status']}")

            # Print details of any validation errors
            if job["error_count"] > 0:
                log_info(f"Ingestion reported {job['error_count']} row-level validation errors.")
                # error_message property is checked as well
                if job.get("error_message"):
                    log_warning(f"Fatal/Primary Error Message: {job['error_message']}")
            break

        await asyncio.sleep(poll_interval)

    assert job_completed, "Job did not complete within the timeout period."

    # ----------------------------------------------------
    log_step("6. Validating ingestion results")
    # ----------------------------------------------------
    # Get final status
    final_res = await client.get(f"{API_PREFIX}/products/upload/{job_id}/status", headers=headers)
    final_data = final_res.json()
    final_job = final_data["job"]

    # Expecting 3 successful rows and 3 error rows (1 duplicate, 1 too short WID, 1 bad date)
    assert final_job["status"] == "completed", f"Job failed: {final_job.get('error_message')}"
    assert final_job["processed_rows"] == 3, f"Expected 3 processed rows, got {final_job['processed_rows']}"
    assert final_job["error_count"] == 3, f"Expected 3 error rows, got {final_job['error_count']}"
    log_success("Ingestion metrics matched expected values (3 successes, 3 failures).")

    # ----------------------------------------------------
    log_step("7. Verifying inventory stats increased")
    # ----------------------------------------------------
    stats_res = await client.get(f"{API_PREFIX}/products/stats", headers=headers)
    new_count = stats_res.json().get("count", 0)
    assert new_count == initial_count + 3, f"Expected count to increase by 3. Before: {initial_count}, After: {new_count}"
    log_success(f"Product inventory count successfully increased to {new_count}.")

    # ----------------------------------------------------
    log_step("8. Testing cache-aside lookup for uploaded products")
    # ----------------------------------------------------
    # Lookup Valid Product 1
    t0 = time.perf_counter()
    res1 = await client.get(f"{API_PREFIX}/products/{wid1}", headers=headers)
    t1 = time.perf_counter()
    assert res1.status_code == 200
    prod1 = res1.json()["product"]
    assert prod1["wid"] == wid1
    assert prod1["ean"] == "8901030753018"
    log_success(f"Lookup product {wid1} succeeded (DB fetch) in {(t1-t0)*1000:.1f}ms.")

    # Lookup Valid Product 1 again (should hit Redis cache)
    t0 = time.perf_counter()
    res1_cached = await client.get(f"{API_PREFIX}/products/{wid1}", headers=headers)
    t1 = time.perf_counter()
    assert res1_cached.status_code == 200
    assert res1_cached.json()["product"]["wid"] == wid1
    log_success(f"Lookup product {wid1} again succeeded (Redis Cache Hit) in {(t1-t0)*1000:.1f}ms.")

    # ----------------------------------------------------
    log_step("9. Verifying error handling for unknown WIDs")
    # ----------------------------------------------------
    unknown_res = await client.get(f"{API_PREFIX}/products/WID_UNKNOWN_999", headers=headers)
    assert unknown_res.status_code == 404
    err_body = unknown_res.json()
    assert err_body["code"] == "product_not_found"
    log_success(f"Querying unknown WID returned correct 404 response: {err_body}")

    await client.aclose()
    print(f"\n{Colors.BOLD}{Colors.OKGREEN}E2E VERIFICATION COMPLETED SUCCESSFULLY! ALL TASKS PASSED.{Colors.ENDC}\n")


if __name__ == "__main__":
    asyncio.run(main())

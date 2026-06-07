# Data Model & Storage Schema

The Flipkart Product Verification System utilizes **PostgreSQL 17** for persistent, relational metadata storing and **Redis 7** as an ephemeral cache-aside memory store.

---

## 1. PostgreSQL Schema Design

All tables are defined in Python using SQLAlchemy Declarative models. Below are the physical layouts.

```mermaid
erDiagram
    users {
        uuid id PK
        varchar username UK
        varchar hashed_password
        varchar role "admin | operator | qa_manager"
        boolean is_active
        timestamp created_at
    }

    products {
        varchar wid PK "Warehouse unique ID"
        varchar ean "Barcode number"
        date manufacturing_date
        date expiry_date
    }

    ingestion_jobs {
        uuid id PK
        varchar filename
        varchar file_path
        varchar status "pending | processing | completed | failed"
        integer total_rows
        integer processed_rows
        integer error_count
        jsonb error_details "List of row parsing errors"
        varchar created_by
        timestamp started_at
        timestamp completed_at
    }

    validation_logs {
        integer id PK "Serial auto-increment"
        varchar wid FK "Links to products.wid"
        varchar captured_image_url "Local path to photo"
        varchar validation_status "VERIFIED | MISMATCH"
        varchar verified_by "Username of operator"
        timestamp verified_at
        jsonb ai_extraction "OCR data details"
        jsonb ai_match_result "Pass/Fail comparison details"
        varchar ai_processing_mode "disabled | synchronous | background"
        varchar ai_processing_status "pending | success | failed"
        varchar ai_provider_name
        varchar ai_error_message
        timestamp ai_processed_at
        text notes
    }

    products ||--o{ validation_logs : "has validation logs"
```

---

### A. Core Inventory Table (`products`)
Houses reference inventory details. For performance, EAN matches are heavily indexed.
*   **WID (Primary Key)**: Encased index for sub-millisecond point queries.
*   **EAN Index**: Indexed concurrently using B-Tree indexing (`ix_products_ean`) to speed up EAN grouping and analytics searches.

### B. Ingestion Job Log (`ingestion_jobs`)
Tracks bulk CSV loading jobs and reports progress and row-level parsing errors.
*   **error_details (JSONB)**: Captures up to 200 row-level parsing errors (row numbers, field names, error messages) allowing compliance managers to review format anomalies.

### C. Validation Log Table (`validation_logs`)
Captures all physical packages inspection logs recorded by operators on the warehouse floor.
*   **captured_image_url**: Holds path to stored photographs (validations `<= 1MB` are enforced).
*   **ai_extraction / ai_match_result (JSONB)**: Store raw JSON structures from Gemini API containing OCR parsed dates, confidence values, and match boolean statuses.

---

## 2. Redis Caching Schema (Cache-Aside Engine)

To protect the Postgres instance from heavy floor queries, points lookups check Redis first.

| Cache Key Pattern | Data Structure | Purpose | TTL (Expiry) |
| :--- | :--- | :--- | :--- |
| **`product:{WID}`** | String (JSON Payload) | Holds serialized product data (WID, EAN, Mfg/Exp dates) for fast client lookups. | **3600 seconds** (1 Hour) |
| **`product:{WID}`** (negative) | String (`"NOT_FOUND"`) | Negative caching for invalid scans to prevent connection pool exhaustion. | **300 seconds** (5 Minutes) |

### Cache State Transitions

```mermaid
stateDiagram-v2
    [*] --> Uncached : "WID Scanned by Operator"
    Uncached --> Redis_Query : "Check Cache Key"
    Redis_Query --> Hit : "Key exists in Redis"
    Hit --> [*] : "Return cached data (<1ms)"

    Redis_Query --> Miss : "Key does not exist"
    Miss --> Postgres_Query : "SELECT * FROM products WHERE wid = WID"
    
    Postgres_Query --> Found_In_DB : "Product exists"
    Found_In_DB --> Cache_Set : "Write JSON to Redis (TTL 1h)"
    Cache_Set --> [*] : "Return product data"

    Postgres_Query --> Not_Found_In_DB : "Product does not exist"
    Not_Found_In_DB --> Negative_Cache_Set : "Write 'NOT_FOUND' to Redis (TTL 5m)"
    Negative_Cache_Set --> [*] : "Return HTTP 404"
```

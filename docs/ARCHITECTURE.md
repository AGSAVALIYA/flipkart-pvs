# System Architecture Guide

This document details the software design patterns, architectural boundaries, and performance patterns of the **Flipkart Product Verification System (PVS)**.

---

## 1. High-Level Architecture Component Stack

The platform is designed around a decoupled, three-tier architecture:

```mermaid
graph TD
    subgraph Client [Vite + React SPA Frontend]
        Vite[Vite + React 19 Client]
        Zustand[Zustand Persistent Store]
        Query[React Query Server State]
    end

    subgraph Server [FastAPI Backend Server]
        API[FastAPI Router Engine]
        Service[Service Domain Layer]
        Repo[Repository Database Abstraction]
    end

    subgraph Infrastructure [Data & external integrations]
        Postgres[(PostgreSQL 17 DB)]
        Redis[(Redis 7 Cache)]
        Gemini[Google Gemini Vision AI]
        Storage[Local File System Storage]
    end

    Vite -->|JSON / HTTPS REST API| API
    API --> Service
    Service --> Repo
    Repo -->|SQLAlchemy / Asyncpg| Postgres
    Service -->|Cache-Aside Pattern| Redis
    Service -->|Adapter Protocol| Gemini
    Service -->|Image & CSV File IO| Storage
```

---

## 2. Decoupled Design Patterns & Extensibility

### A. Repository Pattern (Database Abstraction)
*   **Purpose**: Isolate core business and API services from raw SQL and ORM queries.
*   **Files**:
    *   Interface: `src/domain/interfaces/repositories.py`
    *   Implementations: `src/products/repository.py`, `src/validation/repository.py`
*   **Merits**: Swapping PostgreSQL for another engine (e.g. MongoDB, DynamoDB) or optimizing queries only requires updates in the repository class. No router or business logic is affected.

### B. Adapter Pattern (AI Provider Agnosticism)
*   **Purpose**: Decoupled AI labels parsing logic so the system is provider-agnostic.
*   **Files**:
    *   Interface: `src/domain/interfaces/ai_provider.py` (defines `IAIProvider` protocol)
    *   Implementations: `src/infrastructure/ai/gemini.py`
    *   Factory resolving logic: `src/infrastructure/ai/factory.py`
*   **Merits**: Swapping Google Gemini for OpenAI GPT-4o, Claude 3.5 Sonnet, or an offline local model (like LLaVA) simply requires writing a new class implementing the interface and updating the Factory configuration.

### C. Fault Tolerance & Automatic Retry Policies
*   **Exponential Jitter Retries**: The Gemini Vision API provider calls are wrapped with `tenacity` retry loops. On transient exceptions (e.g. rate limit HTTP 429), it automatically retries up to **3 times** with exponential backoff and randomized jitter to prevent API key quota exhaustion.
*   **Database pre-ping connection pool**: Database connections run `pool_pre_ping=True` to automatically discard stale database sockets and recover from transient network splits.

---

## 3. High-Throughput Ingestion & Performance Patterns

### A. Constant $O(1)$ Memory CSV Streaming
Traditional CSV parsers load the entire payload into RAM, causing memory exhaustion and server failure on files containing millions of rows.
1.  **FastAPI Chunked Streamer**: Streams uploads in **1MB chunks** directly to disk storage, bypassing RAM.
2.  **Binary Chunk Scanning**: Counts row newlines inside the file by scanning raw binary byte arrays in 10MB blocks, calculating the exact total rows in milliseconds without memory load.

### B. Postgres COPY Protocol & Hybrid Merge
Standard ORM inserts create high overhead by compiling SQL per row. Our system streams data directly into the DB:

```mermaid
sequenceDiagram
    participant Manager as Upload Dashboard
    participant API as Ingestion API
    participant BG as Background Task (process_ingestion)
    participant Staging as Staging Table (Postgres)
    participant Main as Products Table (Postgres)

    Manager->>API: HTTP POST product CSV file (chunked stream)
    API-->>Manager: HTTP 202 Accepted (job queued, returns Job ID)
    API->>BG: Spawn BackgroundTasks worker
    BG->>BG: Scan CSV row count (constant memory)
    BG->>Staging: PostgreSQL Binary COPY (asyncpg copy_records_to_table)
    Note over BG,Staging: Streams 10M rows in ~30s (direct binary stream)
    BG->>Main: Execute raw SQL Hybrid Merge (ON CONFLICT DO NOTHING)
    Main-->>BG: Merge success
    BG->>Main: Run SQL ANALYZE products (updates planner stats)
    BG-->>API: Job completed
```

---

## 4. Product Lookup Cache-Aside Flow

To maintain sub-millisecond barcode lookup times for floor operators, lookups use Redis as a caching layer:

```mermaid
sequenceDiagram
    participant Operator as Operator Handheld Terminal
    participant API as FastAPI Lookup Router
    participant Redis as Redis Cache Store
    participant DB as PostgreSQL Database

    Operator->>API: Scan barcode / GET /api/products/{WID}
    API->>Redis: Check cache (key: "product:{WID}")
    
    alt Cache Hit
        Redis-->>API: Return product details JSON
        API-->>Operator: Return HTTP 200 (Success) in <1ms
    else Cache Miss
        Redis-->>API: Return None / Miss
        API->>DB: Query Database (SELECT where WID={WID})
        
        alt Product Exists in DB
            DB-->>API: Return Product record
            API->>Redis: Cache JSON (TTL = 1 hour)
            API-->>Operator: Return HTTP 200 (Success)
        else Product Does Not Exist
            DB-->>API: Return None
            API->>Redis: Cache negative lookup ("NOT_FOUND", TTL = 5 mins)
            API-->>Operator: Return HTTP 404 (Product Not Found)
        end
    end
```

*(Note: Negative Caching prevents **Cache Penetration Attacks/Issues** where invalid scans query missing barcodes repeatedly and exhaust Postgres connection pools).*

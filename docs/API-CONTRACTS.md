# API Specifications & Contracts

This document details the HTTP REST endpoints, request/response payloads, authentication requirements, and role-based permissions for the Flipkart Product Verification System.

---

## 1. Authentication Router (`/api/auth`)

### A. Operator & Admin Login
*   **Endpoint**: `POST /api/auth/login`
*   **Auth Required**: None (Public)
*   **Request Type**: `application/x-www-form-urlencoded`
    *   `username` (string, required)
    *   `password` (string, required)
*   **Response (HTTP 200)**:
    ```json
    {
      "access_token": "eyJhbGciOi...",
      "refresh_token": "eyJhbGciOi...",
      "token_type": "bearer",
      "expires_in": 1800,
      "user": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "username": "admin",
        "role": "admin",
        "is_active": true
      }
    }
    ```

### B. Get Current User Info
*   **Endpoint**: `GET /api/auth/me`
*   **Auth Required**: Valid JWT Access Token
*   **Response (HTTP 200)**:
    ```json
    {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "username": "operator_1",
      "role": "operator",
      "is_active": true
    }
    ```

### C. Create User Account (Admin Only)
*   **Endpoint**: `POST /api/auth/users`
*   **Auth Required**: Admin role (`users:create` permission)
*   **Request Payload**:
    ```json
    {
      "username": "new_operator",
      "password": "securepassword123",
      "role": "operator"
    }
    ```
*   **Response (HTTP 201)**:
    ```json
    {
      "id": "e98a76b5-5c4d-3e2f-1a0b-9c8d7e6f5a4b",
      "username": "new_operator",
      "role": "operator",
      "is_active": true
    }
    ```

---

## 2. Products Router (`/api/products`)

### A. Get Product Stats
*   **Endpoint**: `GET /api/products/stats`
*   **Auth Required**: `products:view` permission
*   **Response (HTTP 200)**:
    ```json
    {
      "count": 10000012
    }
    ```

### B. Bulk CSV Ingestion (Admin Only)
*   **Endpoint**: `POST /api/products/upload`
*   **Auth Required**: Admin role (`products:upload` permission)
*   **Request Type**: `multipart/form-data`
    *   `file` (CSV File, required, max 600MB)
*   **Response (HTTP 202 Accepted)**:
    ```json
    {
      "job_id": "89a432e1-cc75-477e-82b1-ea709f3f0a30",
      "status": "pending",
      "message": "CSV upload accepted. Bulk ingestion job queued in the background."
    }
    ```

### C. Ingestion Job Progress Status (Admin Only)
*   **Endpoint**: `GET /api/products/upload/{job_id}/status`
*   **Auth Required**: Admin role (`products:upload` permission)
*   **Response (HTTP 200)**:
    ```json
    {
      "job": {
        "id": "89a432e1-cc75-477e-82b1-ea709f3f0a30",
        "filename": "inventory_sheet.csv",
        "status": "processing",
        "processed_rows": 4500000,
        "error_count": 12,
        "total_rows": 10000000,
        "created_by": "admin"
      },
      "progress_percentage": 45.0,
      "current_rows_per_second": 125400.0,
      "elapsed_seconds": 35.9,
      "estimated_remaining_seconds": 43.8,
      "errors": []
    }
    ```

### D. Reference WID Barcode Lookup
*   **Endpoint**: `GET /api/products/{wid}`
*   **Auth Required**: `products:view` permission
*   **Response (HTTP 200)**:
    ```json
    {
      "found": true,
      "product": {
        "wid": "WID_E2E_610004_1",
        "ean": "8901030753018",
        "manufacturing_date": "2024-01-10",
        "expiry_date": "2025-01-10"
      }
    }
    ```
*   **Error Response (HTTP 404)**:
    ```json
    {
      "code": "product_not_found",
      "detail": "Product not found: WID_INVALID"
    }
    ```

---

## 3. Floor Verification Router (`/api/validation`)

### A. Verify Package Scan & Upload Image
*   **Endpoint**: `POST /api/validation/verify`
*   **Auth Required**: Operator or Admin (`validation:verify` permission)
*   **Request Type**: `multipart/form-data`
    *   `wid` (string, required)
    *   `validation_status` (string, required: `"VERIFIED" | "MISMATCH"`)
    *   `file` (Image file, required, max 1MB)
    *   `notes` (string, optional)
*   **Response (HTTP 201)**:
    ```json
    {
      "validation": {
        "id": 412,
        "wid": "WID_E2E_610004_1",
        "captured_image_url": "storage/images/f3a2b1_image.jpg",
        "validation_status": "VERIFIED",
        "verified_by": "operator_1",
        "verified_at": "2026-06-07T17:16:04Z",
        "ai_processing_status": "pending"
      },
      "product": {
        "wid": "WID_E2E_610004_1",
        "ean": "8901030753018",
        "manufacturing_date": "2024-01-10",
        "expiry_date": "2025-01-10"
      }
    }
    ```

---

## 4. Reports Router (`/api/reports`)

### A. Get Summary Metrics (QA/Admin Only)
*   **Endpoint**: `GET /api/reports/summary`
*   **Auth Required**: `reports:view` permission
*   **Query Parameters**:
    *   `start_date` (string, required, format `YYYY-MM-DD`)
    *   `end_date` (string, required, format `YYYY-MM-DD`)
*   **Response (HTTP 200)**:
    ```json
    {
      "total_checks": 4510,
      "verified_count": 4480,
      "mismatch_count": 30,
      "pending_ai_count": 5
    }
    ```

### B. List Validation Log History (QA/Admin Only)
*   **Endpoint**: `GET /api/reports/logs`
*   **Auth Required**: `reports:view` permission
*   **Query Parameters**:
    *   `start_date` (string, required)
    *   `end_date` (string, required)
    *   `page` (int, default 1)
    *   `page_size` (int, default 50)
*   **Response (HTTP 200)**:
    ```json
    {
      "items": [
        {
          "id": 412,
          "wid": "WID_E2E_610004_1",
          "captured_image_url": "storage/images/f3a2b1_image.jpg",
          "validation_status": "VERIFIED",
          "verified_by": "operator_1",
          "verified_at": "2026-06-07T17:16:04Z",
          "ai_processing_status": "success",
          "ai_match_result": {
            "ean_matched": true,
            "mfg_matched": true,
            "exp_matched": true,
            "overall_pass": true
          }
        }
      ],
      "total": 1240,
      "page": 1,
      "page_size": 50,
      "pages": 25
    }
    ```

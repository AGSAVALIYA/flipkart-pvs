from __future__ import annotations

from unittest.mock import AsyncMock

from src.infrastructure.bulk_loader import IngestionResult, PostgresBulkLoader


def _make_loader() -> PostgresBulkLoader:
    return PostgresBulkLoader(AsyncMock())


class TestPostgresBulkLoader:
    def test_resolves_required_columns_once(self) -> None:
        loader = _make_loader()

        columns = loader._resolve_csv_columns(
            [" wid ", "EAN", " manufacturing_date ", "Expiry_Date"]
        )

        assert columns == {
            "wid": 0,
            "ean": 1,
            "manufacturing_date": 2,
            "expiry_date": 3,
        }

    def test_validates_indexed_csv_row(self) -> None:
        loader = _make_loader()
        result = IngestionResult()
        column_indexes = loader._resolve_csv_columns(
            ["WID", "EAN", "Manufacturing_Date", "Expiry_Date"]
        )

        validated = loader._validate_csv_row(
            ["WID12345", "1234567890123", "2024-01-15", "2025-01-15"],
            1,
            column_indexes,
            result,
        )

        assert validated == (
            "WID12345",
            "1234567890123",
            loader._date_parser.parse("2024-01-15"),
            loader._date_parser.parse("2025-01-15"),
        )
        assert result.error_count == 0
        assert result.errors == []

    def test_reports_missing_value_when_row_is_shorter_than_header(self) -> None:
        loader = _make_loader()
        result = IngestionResult()
        column_indexes = loader._resolve_csv_columns(
            ["WID", "EAN", "Manufacturing_Date", "Expiry_Date"]
        )

        validated = loader._validate_csv_row(
            ["WID12345", "1234567890123", "2024-01-15"],
            7,
            column_indexes,
            result,
        )

        assert validated is None
        assert result.error_count == 1
        assert result.errors[0].row_number == 7
        assert result.errors[0].field == "Expiry_Date"

    def test_caps_retained_error_details(self) -> None:
        loader = PostgresBulkLoader(AsyncMock(), max_error_details=2)
        result = IngestionResult()

        loader._append_error(result, 1, "WID", "bad wid")
        loader._append_error(result, 2, "EAN", "bad ean")
        loader._append_error(result, 3, "Expiry_Date", "bad expiry")

        assert result.error_count == 3
        assert len(result.errors) == 2
        assert [error.row_number for error in result.errors] == [1, 2]

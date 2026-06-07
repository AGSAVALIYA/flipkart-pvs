import os
import re
import time
from datetime import date, datetime

_WID_RE = re.compile(r"^[A-Za-z0-9_-]{6,20}$")

class DateParser:
    def __init__(self) -> None:
        self._formats = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%m/%d/%Y")
        self._last_format = "%Y-%m-%d"

    def parse(self, value: str) -> date | None:
        value = value.strip()
        if not value:
            return None

        # Fast path: YYYY-MM-DD
        if len(value) == 10 and value[4] == "-" and value[7] == "-":
            try:
                return date(int(value[0:4]), int(value[5:7]), int(value[8:10]))
            except ValueError:
                pass

        # Fast path: DD-MM-YYYY
        if len(value) == 10 and value[2] == "-" and value[5] == "-":
            try:
                return date(int(value[6:10]), int(value[3:5]), int(value[0:2]))
            except ValueError:
                pass

        # Fast path: DD/MM/YYYY
        if len(value) == 10 and value[2] == "/" and value[5] == "/":
            try:
                return date(int(value[6:10]), int(value[3:5]), int(value[0:2]))
            except ValueError:
                pass

        try:
            return datetime.strptime(value, self._last_format).date()
        except ValueError:
            pass
        for fmt in self._formats:
            if fmt == self._last_format:
                continue
            try:
                dt = datetime.strptime(value, fmt).date()
                self._last_format = fmt
                return dt
            except ValueError:
                continue
        return None

def main():
    csv_path = "../product_data.csv"
    if not os.path.exists(csv_path):
        print(f"File not found: {csv_path}")
        return

    import csv
    parser = DateParser()
    start_time = time.time()
    count = 0
    valid_count = 0

    print("Starting CSV benchmark...")
    with open(csv_path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.reader(fh)
        header = next(reader, None)
        print("Header:", header)

        # Resolving columns
        col_idx = {"wid": 0, "ean": 1, "manufacturing_date": 2, "expiry_date": 3}
        # In case headers differ: WID, EAN, Manufacturing_Date, Expiry_Date
        for i, h in enumerate(header):
            h_norm = h.strip().lower()
            if h_norm in ("wid", "warehouse_id"):
                col_idx["wid"] = i
            elif h_norm in ("ean", "barcode"):
                col_idx["ean"] = i
            elif h_norm in ("manufacturing_date", "mfg_date", "manufacturing"):
                col_idx["manufacturing_date"] = i
            elif h_norm in ("expiry_date", "exp_date", "expiry"):
                col_idx["expiry_date"] = i

        for row in reader:
            count += 1
            if count > 1000000:  # Benchmark first 1M rows
                break

            # Inline/manual extraction to replicate bulk_loader validation
            wid = row[col_idx["wid"]].strip() if col_idx["wid"] < len(row) else ""
            wid_len = len(wid)
            if not wid or not (6 <= wid_len <= 20) or (not wid.isalnum() and not _WID_RE.match(wid)):
                continue

            ean = row[col_idx["ean"]].strip() if col_idx["ean"] < len(row) else ""
            if not ean:
                continue

            mfg_str = row[col_idx["manufacturing_date"]].strip() if col_idx["manufacturing_date"] < len(row) else ""
            if not mfg_str:
                continue
            mfg = parser.parse(mfg_str)
            if mfg is None:
                continue

            exp_str = row[col_idx["expiry_date"]].strip() if col_idx["expiry_date"] < len(row) else ""
            if not exp_str:
                continue
            exp = parser.parse(exp_str)
            if exp is None:
                continue

            valid_count += 1

    elapsed = time.time() - start_time
    print(f"Processed {count} rows in {elapsed:.4f} seconds")
    print(f"Valid rows: {valid_count}")
    print(f"Speed: {count / elapsed:.2f} rows/sec")

if __name__ == "__main__":
    main()

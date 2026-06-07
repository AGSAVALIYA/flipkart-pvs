"""Google Gemini Vision API provider for label extraction.

Implements ``IAIProvider`` using ``httpx.AsyncClient`` to call the Gemini
Vision REST endpoint.  Retries transient failures with exponential backoff
via ``tenacity``.
"""

from __future__ import annotations

import base64
import json
import logging
from pathlib import Path

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from src.domain.exceptions import AIProviderError
from src.domain.interfaces.ai_provider import LabelExtractionResult

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────
# Gemini REST endpoint template
# ──────────────────────────────────────────────────────────────────────
_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={api_key}"
)

_DEFAULT_MODEL = "gemini-3.1-flash-lite"

_EXTRACTION_PROMPT = (
    "Extract manufacturing and expiry dates from the product labels according to these rules:\n"
    "\n"
    "1. Return all dates in YYYY-MM-DD format.\n"
    "2. Manufacturing Date: Look for labels such as Mfg. Date, Manufactured On, Production Date, Dom, or similar.\n"
    "3. Expiry Date: Look for labels such as Exp, Expiry Date, Expiration Date, Use By, or similar.\n"
    "4. If no expiry/expiration label is found but a date is printed without a label (or with an ambiguous label), treat it as the manufacturing date.\n"
    "5. If a 'Best Before' duration is stated (e.g., Best Before 12 months) instead of an explicit expiry date, calculate the expiry date by adding that duration to the manufacturing date.\n"
    "\n"
    "Output format must be strict JSON (no markdown fences):\n"
    "{\n"
    '  "ean": "<EAN/barcode number or null>",\n'
    '  "manufacturing_date": "<YYYY-MM-DD or null>",\n'
    '  "expiry_date": "<YYYY-MM-DD or null>",\n'
    '  "raw_text": "<all visible text on the label>"\n'
    "}\n"
    "If either date cannot be determined, output null for that field. Return ONLY the JSON object."
)


class GeminiVisionProvider:
    """``IAIProvider`` implementation backed by Google Gemini Vision.

    Attributes:
        api_key: Gemini API key.
        model: Model identifier (default ``gemini-3.1-flash-lite``).
        timeout: Per-request timeout in seconds.
    """

    def __init__(
        self,
        api_key: str,
        *,
        model: str = _DEFAULT_MODEL,
        timeout: float = 30.0,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._timeout = timeout

    # ── public interface ──────────────────────────────────────────────

    @retry(
        retry=retry_if_exception_type(AIProviderError),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True,
    )
    async def extract_label_text(self, image_path: str) -> LabelExtractionResult:
        """Extract structured label data from a product image.

        Sends the image to Gemini Vision, parses the JSON response, and
        returns a ``LabelExtractionResult``.

        Args:
            image_path: Path to the product label image on disk.

        Returns:
            Parsed label extraction result.

        Raises:
            AIProviderError: On any API or parsing failure.
        """
        image_bytes = self._read_image(image_path)
        mime_type = self._guess_mime(image_path)
        payload = self._build_payload(image_bytes, mime_type)

        url = _GEMINI_URL.format(model=self._model, api_key=self._api_key)

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return self._parse_response(response.json())
        except httpx.TimeoutException as exc:
            raise AIProviderError(
                "Gemini API request timed out", original=exc
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise AIProviderError(
                f"Gemini API returned {exc.response.status_code}",
                original=exc,
            ) from exc
        except httpx.HTTPError as exc:
            raise AIProviderError(
                "Gemini API connection error", original=exc
            ) from exc

    # ── private helpers ───────────────────────────────────────────────

    @staticmethod
    def _read_image(path: str) -> bytes:
        """Read an image file from disk synchronously.

        Gemini requires the full image payload; reading a small label
        image synchronously is acceptable and avoids async complexity.
        """
        try:
            return Path(path).read_bytes()
        except OSError as exc:
            raise AIProviderError(
                f"Failed to read image: {path}", original=exc
            ) from exc

    @staticmethod
    def _guess_mime(path: str) -> str:
        """Guess MIME type from file extension."""
        suffix = Path(path).suffix.lower()
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
        }
        return mime_map.get(suffix, "image/jpeg")

    def _build_payload(self, image_bytes: bytes, mime_type: str) -> dict:
        """Build the Gemini generateContent request body."""
        b64 = base64.b64encode(image_bytes).decode("ascii")
        return {
            "contents": [
                {
                    "parts": [
                        {"text": _EXTRACTION_PROMPT},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": b64,
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 1024,
            },
        }

    @staticmethod
    def _parse_response(body: dict) -> LabelExtractionResult:
        """Parse the Gemini API response into a ``LabelExtractionResult``.

        Expects the model to return a JSON object inside the first
        candidate's first text part.
        """
        try:
            candidates = body.get("candidates", [])
            if not candidates:
                raise AIProviderError("Gemini returned no candidates")

            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                raise AIProviderError("Gemini returned no content parts")

            raw_text = parts[0].get("text", "")

            # Strip markdown fences if present
            cleaned = raw_text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1]
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
            cleaned = cleaned.strip()

            data = json.loads(cleaned)

            return LabelExtractionResult(
                ean=data.get("ean"),
                manufacturing_date=data.get("manufacturing_date"),
                expiry_date=data.get("expiry_date"),
                confidence=float(data.get("confidence", 0.8)),
                raw_text=data.get("raw_text", raw_text),
            )
        except (json.JSONDecodeError, KeyError, IndexError, TypeError) as exc:
            raise AIProviderError(
                "Failed to parse Gemini response", original=exc
            ) from exc

"""File storage protocol definition.

Abstracts file I/O so the domain/service layer never depends on the
filesystem, cloud storage, or any other concrete storage backend.
"""

from __future__ import annotations

from pathlib import Path
from typing import Protocol


class IFileStorage(Protocol):
    """Contract for file storage operations."""

    async def save_upload(self, file_content: bytes, filename: str) -> str:
        """Persist an uploaded file and return its relative storage path.

        Args:
            file_content: Raw bytes of the uploaded file.
            filename: Original filename (used for extension extraction only).

        Returns:
            Relative path where the file was stored.
        """
        ...

    async def save_upload_stream(self, upload_file: object, filename: str) -> str:
        """Stream an upload to storage in chunks and return its relative path.

        Unlike ``save_upload``, this method avoids loading the entire file
        into memory — keeping RAM usage constant regardless of file size.

        Args:
            upload_file: An object with an async ``read(size)`` method
                (e.g. FastAPI ``UploadFile``).
            filename: Original filename (used for extension extraction only).

        Returns:
            Relative path where the file was stored.
        """
        ...

    async def save_image(self, image_data: bytes, filename: str) -> str:
        """Persist an image file and return its relative storage path.

        Args:
            image_data: Raw image bytes.
            filename: Original filename (used for extension extraction only).

        Returns:
            Relative path where the image was stored.
        """
        ...

    def get_file_path(self, relative_path: str) -> Path:
        """Resolve a relative storage path to an absolute filesystem path.

        Args:
            relative_path: The relative path returned by ``save_upload``
                or ``save_image``.

        Returns:
            Absolute ``Path`` object on the local filesystem.
        """
        ...

    async def delete(self, path: str) -> None:
        """Delete a file from storage.

        Args:
            path: Relative path of the file to delete.
        """
        ...

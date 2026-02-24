"""
Spec10x Backend — File Storage Abstraction

Supports MinIO (local dev) and Google Cloud Storage (production).
Provides signed URL generation for direct browser uploads.
"""

import logging
from datetime import timedelta

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# MinIO client — initialized lazily
_minio_client = None


def _get_minio_client():
    """Initialize and return MinIO client."""
    global _minio_client
    if _minio_client is None:
        from minio import Minio

        _minio_client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_use_ssl,
        )
    return _minio_client


def generate_upload_url(
    object_name: str,
    content_type: str = "application/octet-stream",
    expires: timedelta = timedelta(minutes=15),
) -> str:
    """
    Generate a pre-signed URL for direct file upload from the browser.

    Args:
        object_name: The storage path/key for the file (e.g., "user-id/filename.pdf")
        content_type: MIME type of the file
        expires: URL expiration time (default 15 minutes)

    Returns:
        Pre-signed upload URL string
    """
    if settings.storage_backend == "minio":
        client = _get_minio_client()
        url = client.presigned_put_object(
            bucket_name=settings.minio_bucket,
            object_name=object_name,
            expires=expires,
        )
        return url

    elif settings.storage_backend == "gcs":
        from google.cloud import storage

        client = storage.Client()
        bucket = client.bucket(settings.minio_bucket)
        blob = bucket.blob(object_name)
        url = blob.generate_signed_url(
            version="v4",
            expiration=expires,
            method="PUT",
            content_type=content_type,
        )
        return url

    else:
        raise ValueError(f"Unknown storage backend: {settings.storage_backend}")


def generate_download_url(
    object_name: str,
    expires: timedelta = timedelta(hours=1),
) -> str:
    """
    Generate a pre-signed URL for downloading a file.

    Args:
        object_name: The storage path/key for the file
        expires: URL expiration time (default 1 hour)

    Returns:
        Pre-signed download URL string
    """
    if settings.storage_backend == "minio":
        client = _get_minio_client()
        url = client.presigned_get_object(
            bucket_name=settings.minio_bucket,
            object_name=object_name,
            expires=expires,
        )
        return url

    elif settings.storage_backend == "gcs":
        from google.cloud import storage

        client = storage.Client()
        bucket = client.bucket(settings.minio_bucket)
        blob = bucket.blob(object_name)
        url = blob.generate_signed_url(
            version="v4",
            expiration=expires,
            method="GET",
        )
        return url

    else:
        raise ValueError(f"Unknown storage backend: {settings.storage_backend}")


def download_file(object_name: str, local_path: str) -> str:
    """
    Download a file from storage to a local path.

    Args:
        object_name: The storage path/key
        local_path: Where to save the file locally

    Returns:
        The local file path
    """
    if settings.storage_backend == "minio":
        client = _get_minio_client()
        client.fget_object(
            bucket_name=settings.minio_bucket,
            object_name=object_name,
            file_path=local_path,
        )
        return local_path

    elif settings.storage_backend == "gcs":
        from google.cloud import storage

        client = storage.Client()
        bucket = client.bucket(settings.minio_bucket)
        blob = bucket.blob(object_name)
        blob.download_to_filename(local_path)
        return local_path

    else:
        raise ValueError(f"Unknown storage backend: {settings.storage_backend}")


def delete_file(object_name: str) -> None:
    """Delete a file from storage."""
    if settings.storage_backend == "minio":
        client = _get_minio_client()
        client.remove_object(
            bucket_name=settings.minio_bucket,
            object_name=object_name,
        )

    elif settings.storage_backend == "gcs":
        from google.cloud import storage

        client = storage.Client()
        bucket = client.bucket(settings.minio_bucket)
        blob = bucket.blob(object_name)
        blob.delete()

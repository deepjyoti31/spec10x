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


def _get_gcs_client():
    """Helper to get GCS client with impersonation if configured."""
    from google.cloud import storage
    
    # On Cloud Run, we need to use impersonation to sign URLs
    # because the default compute engine credentials don't have a private key.
    if settings.gcp_service_account_email:
        from google.auth import default
        from google.auth.impersonated_credentials import Credentials as ImpersonatedCredentials
        
        try:
            source_creds, project = default()
            target_scopes = ["https://www.googleapis.com/auth/devstorage.read_write"]
            
            creds = ImpersonatedCredentials(
                source_credentials=source_creds,
                target_principal=settings.gcp_service_account_email,
                target_scopes=target_scopes,
            )
            return storage.Client(project=settings.gcp_project_id or project, credentials=creds)
        except Exception as e:
            logger.warning(f"Failed to create impersonated credentials: {e}. Falling back to default.")
    
    return storage.Client(project=settings.gcp_project_id or None)


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
        try:
            logger.info(f"Generating GCS signed URL: bucket={settings.gcs_bucket}, email={settings.gcp_service_account_email}")
            client = _get_gcs_client()
            bucket = client.bucket(settings.gcs_bucket)
            blob = bucket.blob(object_name)
            
            sign_args = {
                "version": "v4",
                "expiration": expires,
                "method": "PUT",
                "content_type": content_type,
            }
            
            # Note: For impersonated creds, providing service_account_email here is required by some lib versions
            if settings.gcp_service_account_email:
                sign_args["service_account_email"] = settings.gcp_service_account_email
                
            url = blob.generate_signed_url(**sign_args)
            return url
        except Exception as e:
            logger.exception(f"GCS signed URL generation failed: {e}")
            raise

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
        try:
            logger.info(f"Generating GCS download URL: bucket={settings.gcs_bucket}, email={settings.gcp_service_account_email}")
            client = _get_gcs_client()
            bucket = client.bucket(settings.gcs_bucket)
            blob = bucket.blob(object_name)
            
            sign_args = {
                "version": "v4",
                "expiration": expires,
                "method": "GET",
            }
            
            if settings.gcp_service_account_email:
                sign_args["service_account_email"] = settings.gcp_service_account_email
                
            url = blob.generate_signed_url(**sign_args)
            return url
        except Exception as e:
            logger.exception(f"GCS download URL generation failed: {e}")
            raise

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
        client = _get_gcs_client()
        bucket = client.bucket(settings.gcs_bucket)
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
        client = _get_gcs_client()
        bucket = client.bucket(settings.gcs_bucket)
        blob = bucket.blob(object_name)
        blob.delete()

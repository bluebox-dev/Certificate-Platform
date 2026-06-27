import os
import boto3
from botocore.client import Config

STORAGE_ENDPOINT = os.getenv("STORAGE_ENDPOINT", "http://localhost:9000")
ACCESS_KEY = os.getenv("MINIO_ROOT_USER", "minio")
SECRET_KEY = os.getenv("MINIO_ROOT_PASSWORD", "miniosecret")
BUCKET_NAME = os.getenv("BUCKET_NAME", "certificates")

def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=STORAGE_ENDPOINT,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1"
    )

def ensure_bucket_exists():
    s3 = get_s3_client()
    try:
        s3.head_bucket(Bucket=BUCKET_NAME)
    except Exception:
        try:
            s3.create_bucket(Bucket=BUCKET_NAME)
            print(f"Bucket '{BUCKET_NAME}' created successfully.")
        except Exception as e:
            print(f"Error creating bucket: {e}")

def upload_file_bytes(file_bytes: bytes, file_name: str, content_type: str = "application/pdf"):
    s3 = get_s3_client()
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=file_name,
        Body=file_bytes,
        ContentType=content_type
    )
    return f"{STORAGE_ENDPOINT}/{BUCKET_NAME}/{file_name}"

def get_presigned_download_url(file_name: str, expiration_seconds: int = 900):
    s3 = get_s3_client()
    # Note: Pre-signed URL generates a temporary URL.
    # Since storage endpoint is relative to containers, we must replace it with host domain if accessed from outside.
    # We can handle external versus internal URL in the application logic.
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET_NAME, "Key": file_name},
        ExpiresIn=expiration_seconds
    )
    # Replace internal minio host with external host if configured
    external_endpoint = os.getenv("EXTERNAL_STORAGE_ENDPOINT")
    if external_endpoint:
        url = url.replace(STORAGE_ENDPOINT, external_endpoint)
    return url

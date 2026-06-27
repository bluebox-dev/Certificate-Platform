import os
import json
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

def get_redis_client():
    return redis.from_url(REDIS_URL)

def push_pdf_job(certificate_id: str):
    r = get_redis_client()
    job = {
        "certificate_id": str(certificate_id)
    }
    r.rpush("certificate_pdf_queue", json.dumps(job))

def push_bulk_pdf_jobs(certificate_ids: list):
    r = get_redis_client()
    pipe = r.pipeline()
    for cert_id in certificate_ids:
        job = {"certificate_id": str(cert_id)}
        pipe.rpush("certificate_pdf_queue", json.dumps(job))
    pipe.execute()

"""
RunPod Serverless handler for ACE-Step inference.

Input:
  {
    "lyrics": str,
    "tags": str,          # style prompt
    "duration": int,      # seconds (default 120)
    "bpm": int | null,
    "audio_format": "mp3" | "wav"
  }

Output:
  { "audio_url": str }    # publicly accessible URL (R2 or S3)

Environment variables required:
  ACESTEP_MODEL_PATH      path to ACE-Step model weights
  R2_ACCOUNT_ID           Cloudflare R2 account ID
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_BUCKET               bucket name
  R2_PUBLIC_URL           public base URL for bucket
"""

import runpod
import os
import tempfile
import uuid
import boto3
from botocore.config import Config

# ─── Lazy model load (cached across warm invocations) ─────────────────────────
_pipeline = None

def get_pipeline():
    global _pipeline
    if _pipeline is None:
        print("[handler] Loading ACE-Step pipeline...")
        # Import here so cold-start only pays the cost once
        import sys
        sys.path.insert(0, '/app/ACE-Step')
        from acestep.pipeline import ACEStepPipeline  # adjust to actual import path

        model_path = os.environ.get('ACESTEP_MODEL_PATH', '/app/ACE-Step/checkpoints')
        _pipeline = ACEStepPipeline(model_path=model_path)
        print("[handler] Pipeline ready.")
    return _pipeline

# ─── R2 / S3 client ───────────────────────────────────────────────────────────
def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4'),
        region_name='auto',
    )

def upload_to_r2(local_path: str, filename: str) -> str:
    client = get_r2_client()
    bucket = os.environ['R2_BUCKET']
    public_url = os.environ['R2_PUBLIC_URL'].rstrip('/')
    client.upload_file(
        local_path,
        bucket,
        filename,
        ExtraArgs={'ContentType': 'audio/mpeg' if filename.endswith('.mp3') else 'audio/wav'},
    )
    return f"{public_url}/{filename}"

# ─── Handler ──────────────────────────────────────────────────────────────────
def handler(event):
    job_input = event.get('input', {})

    lyrics       = job_input.get('lyrics', '')
    tags         = job_input.get('tags', "children's song, gentle, warm vocal")
    duration     = int(job_input.get('duration', 120))
    bpm          = job_input.get('bpm')
    audio_format = job_input.get('audio_format', 'mp3')

    if not lyrics:
        return {'error': 'lyrics is required'}

    pipeline = get_pipeline()

    with tempfile.TemporaryDirectory() as tmpdir:
        out_path = os.path.join(tmpdir, f"output.{audio_format}")

        print(f"[handler] Generating {duration}s song | tags: {tags[:60]}...")
        pipeline.generate(
            lyrics=lyrics,
            tags=tags,
            duration=duration,
            bpm=bpm,
            output_path=out_path,
            audio_format=audio_format,
        )

        if not os.path.exists(out_path):
            return {'error': 'Generation produced no output file'}

        filename = f"songs/{uuid.uuid4()}.{audio_format}"
        audio_url = upload_to_r2(out_path, filename)
        print(f"[handler] Uploaded to {audio_url}")

    return {'audio_url': audio_url}


if __name__ == '__main__':
    runpod.serverless.start({'handler': handler})

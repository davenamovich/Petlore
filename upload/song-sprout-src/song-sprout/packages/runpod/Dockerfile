FROM runpod/pytorch:2.2.0-py3.11-cuda12.1.0-devel-ubuntu22.04

WORKDIR /app

# System deps (ffmpeg required by ACE-Step for audio encoding)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg git wget \
    && rm -rf /var/lib/apt/lists/*

# Clone ACE-Step model code
RUN git clone https://github.com/ace-step/ACE-Step.git /app/ACE-Step
WORKDIR /app/ACE-Step
RUN pip install -r requirements.txt --no-cache-dir

# RunPod handler
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir

COPY handler.py .

# Model weights are downloaded at first run or baked in via volume mount.
# To bake them in (faster cold start but larger image):
#   RUN python -c "from acestep.pipeline import ACEStepPipeline; ACEStepPipeline()"

ENV PYTHONUNBUFFERED=1

CMD ["python", "-u", "handler.py"]

# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*


COPY requirements.txt ./
# Install Python dependencies (only rerun if requirements.txt changes)
RUN pip install --upgrade --no-cache-dir -r requirements.txt

# Create cache directory for models
RUN mkdir -p /app/.cache/huggingface /app/.cache/torch

# Set environment variables for model caching
ENV PYTHONPATH=/app
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface
ENV HF_HOME=/app/.cache/huggingface
ENV TORCH_HOME=/app/.cache/torch
ENV SENTENCE_TRANSFORMERS_HOME=/app/.cache/sentence_transformers

# Pre-download ALL AI models during build for faster startup
# This makes the Docker build slower but runtime much faster
# Implements RF-01.02: LGPD Agent with BERTimbau NER
# Implements RF-06: Matching with semantic similarity
# Implements RF-08: Adherence analysis

# 1. BERTimbau NER model for entity extraction (Portuguese)
RUN python -c "\
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline; \
print('1/4 Pre-downloading BERTimbau NER model...'); \
model_name = 'neuralmind/bert-base-portuguese-cased'; \
tokenizer = AutoTokenizer.from_pretrained(model_name); \
model = AutoModelForTokenClassification.from_pretrained(model_name); \
print('BERTimbau model downloaded successfully')" || echo "BERTimbau download optional - will download at runtime"

# 2. Sentiment analysis model (multilingual)
RUN python -c "\
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline; \
print('2/4 Pre-downloading Sentiment Analysis model...'); \
model_name = 'lxyuan/distilbert-base-multilingual-cased-sentiments-student'; \
tokenizer = AutoTokenizer.from_pretrained(model_name); \
model = AutoModelForSequenceClassification.from_pretrained(model_name); \
print('Sentiment model downloaded successfully')" || echo "Sentiment model download optional - will download at runtime"

# 3. Sentence-transformers for semantic similarity (multilingual)
RUN python -c "\
print('3/4 Pre-downloading Sentence-Transformers model...'); \
from sentence_transformers import SentenceTransformer; \
model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'); \
print('Sentence-Transformers model downloaded successfully')" || echo "Sentence-transformers download optional - will download at runtime"

# 4. Verify all models are cached (skipped in Docker build)
# Model cache verification at build time is optional and was removed
# to avoid embedding multiline Python in the Dockerfile which causes
# some static analyzers to misinterpret the file. Runtime verification
# can be performed by the entrypoint if needed.

COPY . .

# Install our entrypoint which runs migrations and optionally seeds
COPY docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh || true

# Environment variables for models
ENV BERTIMBAU_NER_MODEL=neuralmind/bert-base-portuguese-cased
ENV SENTIMENT_MODEL=lxyuan/distilbert-base-multilingual-cased-sentiments-student
ENV EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run migrations, optional seeds and start server via entrypoint
# Use the entrypoint installed at /usr/local/bin to avoid host volume
# mounts hiding files placed under `/app`.
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

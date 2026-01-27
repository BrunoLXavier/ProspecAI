"""
Kafka consumer for processing meeting-minutes generation jobs.

Run this as a separate worker process. It consumes messages on
`prospecai.communications.minutes` and generates meeting minutes by
aggregating thread messages and using the NLP service to produce a summary.

This is a best-effort implementation intended as a starting point; in a
production system you'd add robust error handling, retries, and metrics.
"""
import asyncio
import os
import ast
import json
import logging
from datetime import datetime
from aiokafka import AIOKafkaConsumer

from adapters.database.connection import get_db_context
from adapters.database.models import (
    CommunicationMessageModel,
    MeetingMinutesModel,
    CommunicationAttachmentModel,
)
from infrastructure.ai.nlp_service import NLPService
from infrastructure.file_storage import get_file_storage, StorageBucket

logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
TOPIC = os.getenv("KAFKA_COMM_MINUTES_TOPIC", "prospecai.communications.minutes")


async def process_message(msg_value: str):
    try:
        payload = ast.literal_eval(msg_value)
    except Exception:
        try:
            payload = json.loads(msg_value)
        except Exception:
            logger.error("Failed to parse message payload: %s", msg_value)
            return

    minutes_id = payload.get("minutes_id")
    thread_id = payload.get("thread_id")
    if not minutes_id or not thread_id:
        logger.error("Invalid payload: %s", payload)
        return

    async with get_db_context() as db:
        # Fetch messages for thread
        msgs = await db.execute(
            CommunicationMessageModel.__table__.select().where(CommunicationMessageModel.thread_id == thread_id)
        )
        rows = msgs.fetchall()
        text_blocks = []
        for r in rows:
            body = r[CommunicationMessageModel.body.name] or ""
            author = r[CommunicationMessageModel.author_name.name] or r[CommunicationMessageModel.author.name]
            text_blocks.append(f"{author}: {body}")

        # Also list attachments filenames
        atq = await db.execute(CommunicationAttachmentModel.__table__.select().where(CommunicationAttachmentModel.thread_id == thread_id))
        atrows = atq.fetchall()
        if atrows:
            text_blocks.append("Attachments:")
            for a in atrows:
                text_blocks.append(a[CommunicationAttachmentModel.filename.name])

        transcript = "\n\n".join(text_blocks)[:20000]  # limit size

        # Summarize using NLPService (best-effort)
        nlp = NLPService()
        try:
            demands = nlp.detect_implicit_demands(transcript)
            # Create a simple minutes summary
            summary_lines = [f"Auto-generated summary ({len(demands)} categories):"]
            for k, v in demands.items():
                summary_lines.append(f"- {k}: {v.get('description', '')} (confidence={v.get('confidence')})")
            summary = "\n".join(summary_lines)
        except Exception as e:
            logger.exception("NLP summarization failed: %s", e)
            summary = transcript[:4000]

        # Update minutes record
        await db.execute(
            MeetingMinutesModel.__table__.update().where(MeetingMinutesModel.id == minutes_id).values(
                content=summary,
                status='done',
                generated_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        )

        # Optionally upload minutes as a text file to storage
        try:
            fs = get_file_storage()
            filename = f"minutes-{minutes_id}.txt"
            upload = await fs.upload_bytes(tenant_id="default", bucket=StorageBucket.REPORTS, filename=filename, content=summary.encode('utf-8'))
            if upload.success:
                # Create an attachment record linking minutes (store as attachment)
                await db.execute(CommunicationAttachmentModel.__table__.insert().values(
                    thread_id=thread_id,
                    message_id=None,
                    filename=filename,
                    object_name=upload.object_name,
                    bucket=upload.bucket,
                    url=await fs.get_presigned_url(StorageBucket.REPORTS, upload.object_name),
                    content_type=upload.content_type,
                    size=upload.size,
                    created_by=None,
                    updated_by=None,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                ))
        except Exception as e:
            logger.warning("Failed to upload minutes file: %s", e)

        await db.commit()


async def consume_loop():
    consumer = AIOKafkaConsumer(TOPIC, bootstrap_servers=KAFKA_BOOTSTRAP, group_id="communications-minutes-consumer")
    await consumer.start()
    try:
        async for msg in consumer:
            logger.info("Received minutes job: %s", msg.value)
            await process_message(msg.value.decode('utf-8') if isinstance(msg.value, (bytes, bytearray)) else msg.value)
    finally:
        await consumer.stop()


def run():
    logging.basicConfig(level=logging.INFO)
    asyncio.run(consume_loop())


if __name__ == '__main__':
    run()

"""Script to fix feedback_type values in the database."""
import asyncio
from sqlalchemy import text
from adapters.database.connection import engine


async def fix_feedback_types():
    """Fix invalid feedback_type values."""
    async with engine.begin() as conn:
        # Map old values to valid enum values
        result1 = await conn.execute(
            text("UPDATE feedbacks SET feedback_type = 'bug_report' WHERE feedback_type = 'bug'")
        )
        print(f"Updated 'bug' to 'bug_report': {result1.rowcount} rows")
        
        result2 = await conn.execute(
            text("UPDATE feedbacks SET feedback_type = 'ui_feedback' WHERE feedback_type = 'improvement'")
        )
        print(f"Updated 'improvement' to 'ui_feedback': {result2.rowcount} rows")
        
        print("Done!")


if __name__ == "__main__":
    asyncio.run(fix_feedback_types())

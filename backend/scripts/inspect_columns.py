import asyncio
import traceback
from adapters.database.connection import get_session

async def run():
    try:
        async with get_session() as session:
            q = "SELECT column_name FROM information_schema.columns WHERE table_name = 'funding_sources' ORDER BY ordinal_position"
            res = await session.execute(q)
            cols = [r[0] for r in res.fetchall()]
            print('columns:', cols)
    except Exception:
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(run())

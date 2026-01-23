from alembic.config import Config
from alembic.script import ScriptDirectory
c = Config('/app/alembic.ini')
s = ScriptDirectory.from_config(c)
print('heads:', s.get_heads())
for r in s.walk_revisions():
    print(f"{r.revision} -> {r.down_revision}")

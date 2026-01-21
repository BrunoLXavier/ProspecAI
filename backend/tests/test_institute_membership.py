import pytest
import sqlalchemy as sa
from uuid import uuid4
from fastapi import HTTPException

from services.institute_service import InstituteService
from infrastructure.di_container import DependencyContainer


@pytest.mark.asyncio
async def test_user_belongs_to_institute(db_session, tenant_id, user_id):
    # Create institute
    inst_id = uuid4()
    await db_session.execute(
        sa.text("INSERT INTO institutes (id, tenant_id, name, code, description, metadata, created_by, updated_by, created_at, updated_at) VALUES (:id, :tenant_id, :name, :code, :desc, :meta, :cb, :ub, current_timestamp, current_timestamp)"),
        {
            'id': str(inst_id), 'tenant_id': str(tenant_id), 'name': 'Inst A', 'code': 'INST-A',
            'desc': 'Test institute', 'meta': '{}', 'cb': str(user_id), 'ub': str(user_id)
        }
    )

    # Assign user to institute
    await db_session.execute(
        sa.text("INSERT INTO user_institutes (id, tenant_id, user_id, institute_id, role, created_by, updated_by, created_at, updated_at) VALUES (gen_random_uuid(), :tenant_id, :user_id, :inst, :role, :cb, :ub, current_timestamp, current_timestamp)"),
        {'tenant_id': str(tenant_id), 'user_id': str(user_id), 'inst': str(inst_id), 'role': 'member', 'cb': str(user_id), 'ub': str(user_id)}
    )
    await db_session.commit()

    svc = InstituteService(db_session)
    assert await svc.user_belongs_to_institute(user_id, inst_id) is True


@pytest.mark.asyncio
async def test_ensure_user_member_or_admin_denies(db_session, tenant_id, user_id):
    # No institute assignment
    container = DependencyContainer(db_session)
    from infrastructure.dependencies import ensure_user_member_or_admin

    with pytest.raises(HTTPException) as exc:
        await ensure_user_member_or_admin(user_id, [uuid4()], container)

    assert exc.value.status_code == 403

"""
Merge auth tables from 001 into main migration chain

Revision ID: 006_auth_tables_integration
Revises: 004_llm_ingestion_pii
Create Date: 2026-01-13 12:00:00.000000

Merges the orphaned 001_add_auth_tables into the main migration chain.
Implements internal authentication system with RLS.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
import uuid

# revision identifiers, used by Alembic.
revision: str = '006_auth_tables_integration'
down_revision: Union[str, None] = '004_llm_ingestion_pii'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Default credentials
ADMIN_EMAIL = 'admin@prospecai.local'
ADMIN_USERNAME = 'admin'
# bcrypt hash for 'Admin@123'
ADMIN_PASSWORD_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4OoYwOjN4R1COKKS'
DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'


def upgrade() -> None:
    """Create authentication tables and seed admin user."""
    
    # Check if users table already exists (from previous runs)
    if op.get_context().dialect.has_table(op.get_context().bind, 'users'):
        return
    
    # ==========================================================================
    # CREATE AUTHENTICATION TABLES
    # ==========================================================================
    
    # Users table
    op.create_table(
        'users',
        sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
        sa.Column('tenant_id', UUID(), nullable=True, index=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(100), nullable=True),
        sa.Column('email_verified', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('tenant_id', 'email', name='uq_users_tenant_email'),
        sa.UniqueConstraint('tenant_id', 'username', name='uq_users_tenant_username'),
    )
    
    # Create indexes for users
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_username', 'users', ['username'])
    op.create_index('ix_users_tenant_active', 'users', ['tenant_id', 'is_active'])
    
    # Refresh tokens table
    op.create_table(
        'refresh_tokens',
        sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
        sa.Column('user_id', UUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(255), nullable=False, unique=True),
        sa.Column('token_type', sa.String(30), nullable=False),  # refresh, password_reset, email_verification
        sa.Column('used', sa.Boolean(), default=False, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('created_by_ip', sa.String(45), nullable=True),  # IPv4/IPv6
    )
    
    # Create indexes for refresh_tokens
    op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'])
    op.create_index('ix_refresh_tokens_token_hash', 'refresh_tokens', ['token_hash'])
    op.create_index('ix_refresh_tokens_expires', 'refresh_tokens', ['expires_at'])
    op.create_index('ix_refresh_tokens_type_used', 'refresh_tokens', ['token_type', 'used'])
    
    # User roles table
    op.create_table(
        'user_roles',
        sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
        sa.Column('user_id', UUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role_name', sa.String(50), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('assigned_by', UUID(), nullable=True),
        sa.UniqueConstraint('user_id', 'role_name', name='uq_user_roles'),
    )
    
    # Create index for user_roles
    op.create_index('ix_user_roles_user_id', 'user_roles', ['user_id'])
    op.create_index('ix_user_roles_role_name', 'user_roles', ['role_name'])
    
    # Login attempts table
    op.create_table(
        'login_attempts',
        sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('ip_address', INET(), nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('attempted_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('tenant_id', UUID(), nullable=True),
    )
    
    # Create indexes for login_attempts
    op.create_index('ix_login_attempts_email', 'login_attempts', ['email'])
    op.create_index('ix_login_attempts_email_time', 'login_attempts', ['email', 'attempted_at'])
    op.create_index('ix_login_attempts_ip', 'login_attempts', ['ip_address'])
    
    # System config table
    op.create_table(
        'system_config',
        sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
        sa.Column('tenant_id', UUID(), nullable=True, index=True),
        sa.Column('config_key', sa.String(50), nullable=False),
        sa.Column('config_value', JSONB(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('updated_by', UUID(), nullable=True),
        sa.UniqueConstraint('tenant_id', 'config_key', name='uq_system_config_tenant_key'),
    )
    
    # Create indexes for system_config
    op.create_index('ix_system_config_key', 'system_config', ['config_key'])
    
    # ==========================================================================
    # ENABLE ROW LEVEL SECURITY
    # ==========================================================================
    
    # Enable RLS on users table
    op.execute(text("""
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS users_tenant_isolation ON users;
        CREATE POLICY users_tenant_isolation ON users
            FOR ALL
            USING (
                tenant_id IS NULL 
                OR tenant_id::text = current_setting('app.current_tenant', true)
                OR current_setting('app.is_superadmin', true) = 'true'
            );
        
        ALTER TABLE users FORCE ROW LEVEL SECURITY;
    """))
    
    # Enable RLS on other tables
    op.execute(text("""
        ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS user_roles_tenant_isolation ON user_roles;
        CREATE POLICY user_roles_tenant_isolation ON user_roles
            FOR ALL
            USING (
                user_id IN (
                    SELECT id FROM users 
                    WHERE tenant_id IS NULL 
                    OR tenant_id::text = current_setting('app.current_tenant', true)
                    OR current_setting('app.is_superadmin', true) = 'true'
                )
            );
        
        ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;
    """))
    
    op.execute(text("""
        ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS login_attempts_tenant_isolation ON login_attempts;
        CREATE POLICY login_attempts_tenant_isolation ON login_attempts
            FOR ALL
            USING (
                tenant_id IS NULL 
                OR tenant_id::text = current_setting('app.current_tenant', true)
                OR current_setting('app.is_superadmin', true) = 'true'
            );
        
        ALTER TABLE login_attempts FORCE ROW LEVEL SECURITY;
    """))
    
    op.execute(text("""
        ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS system_config_tenant_isolation ON system_config;
        CREATE POLICY system_config_tenant_isolation ON system_config
            FOR ALL
            USING (
                tenant_id IS NULL 
                OR tenant_id::text = current_setting('app.current_tenant', true)
                OR current_setting('app.is_superadmin', true) = 'true'
            );
        
        ALTER TABLE system_config FORCE ROW LEVEL SECURITY;
    """))
    
    op.execute(text("""
        ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS refresh_tokens_user_isolation ON refresh_tokens;
        CREATE POLICY refresh_tokens_user_isolation ON refresh_tokens
            FOR ALL
            USING (
                user_id IN (
                    SELECT id FROM users 
                    WHERE tenant_id IS NULL 
                    OR tenant_id::text = current_setting('app.current_tenant', true)
                    OR current_setting('app.is_superadmin', true) = 'true'
                )
            );
        
        ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;
    """))
    
    # ==========================================================================
    # SEED DEFAULT TENANT
    # ==========================================================================
    op.execute(text(f"""
        INSERT INTO tenants (id, name, slug, is_active, created_at, updated_at)
        VALUES (
            '{DEFAULT_TENANT_ID}'::uuid,
            'Default Tenant',
            'default',
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    """))
    
    # ==========================================================================
    # SEED ADMIN USER
    # ==========================================================================
    op.execute(text(f"""
        INSERT INTO users (
            id, 
            tenant_id, 
            email, 
            username, 
            password_hash, 
            full_name, 
            email_verified, 
            is_active, 
            created_at, 
            updated_at
        )
        VALUES (
            '{str(uuid.uuid4())}'::uuid,
            '{DEFAULT_TENANT_ID}'::uuid,
            '{ADMIN_EMAIL}',
            '{ADMIN_USERNAME}',
            '{ADMIN_PASSWORD_HASH}',
            'System Administrator',
            true,
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT ON CONSTRAINT uq_users_tenant_email DO NOTHING;
    """))
    
    # ==========================================================================
    # ASSIGN ADMIN ROLES
    # ==========================================================================
    op.execute(text(f"""
        INSERT INTO user_roles (id, user_id, role_name, assigned_at)
        SELECT 
            '{str(uuid.uuid4())}'::uuid,
            id,
            'admin',
            NOW()
        FROM users 
        WHERE email = '{ADMIN_EMAIL}' AND tenant_id = '{DEFAULT_TENANT_ID}'::uuid
        ON CONFLICT ON CONSTRAINT uq_user_roles DO NOTHING;
    """))
    
    op.execute(text(f"""
        INSERT INTO user_roles (id, user_id, role_name, assigned_at)
        SELECT 
            '{str(uuid.uuid4())}'::uuid,
            id,
            'superadmin',
            NOW()
        FROM users 
        WHERE email = '{ADMIN_EMAIL}' AND tenant_id = '{DEFAULT_TENANT_ID}'::uuid
        ON CONFLICT ON CONSTRAINT uq_user_roles DO NOTHING;
    """))
    
    # ==========================================================================
    # SEED DEFAULT SYSTEM CONFIGURATIONS
    # ==========================================================================
    
    op.execute(text(f"""
        INSERT INTO system_config (id, tenant_id, config_key, config_value, created_at, updated_at)
        VALUES (
            '{str(uuid.uuid4())}'::uuid,
            NULL,
            'email_config',
            '{{"smtp_host": "mailhog", "smtp_port": 1025, "smtp_username": "", "smtp_password_encrypted": "", "smtp_use_tls": false, "smtp_use_ssl": false, "from_email": "noreply@prospecai.local", "from_name": "ProspecAI", "fallback_smtp_host": null, "fallback_smtp_port": null}}'::jsonb,
            NOW(),
            NOW()
        )
        ON CONFLICT ON CONSTRAINT uq_system_config_tenant_key DO NOTHING;
    """))
    
    op.execute(text(f"""
        INSERT INTO system_config (id, tenant_id, config_key, config_value, created_at, updated_at)
        VALUES (
            '{str(uuid.uuid4())}'::uuid,
            NULL,
            'security_config',
            '{{"max_login_attempts": 5, "lockout_duration_minutes": 15, "password_min_length": 8, "password_require_uppercase": true, "password_require_lowercase": true, "password_require_number": true, "password_require_special": true, "password_reset_expiry_hours": 8, "email_verification_expiry_hours": 24, "access_token_expire_minutes": 30, "refresh_token_expire_days": 7}}'::jsonb,
            NOW(),
            NOW()
        )
        ON CONFLICT ON CONSTRAINT uq_system_config_tenant_key DO NOTHING;
    """))


def downgrade() -> None:
    """Remove authentication tables."""
    
    op.drop_table('system_config')
    op.drop_table('login_attempts')
    op.drop_table('user_roles')
    op.drop_table('refresh_tokens')
    op.drop_table('users')

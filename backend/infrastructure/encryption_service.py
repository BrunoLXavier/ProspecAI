"""
Encryption Service Module
Re-exports encryption service for backward compatibility
"""
from infrastructure.security.encryption import EncryptionService

__all__ = ['EncryptionService', 'get_encryption_service']


def get_encryption_service() -> EncryptionService:
    """Get singleton instance of encryption service."""
    return EncryptionService()

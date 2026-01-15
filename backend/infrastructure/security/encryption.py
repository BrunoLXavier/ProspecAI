# Encryption Service for Secure Credential Storage
# Implements RNF-01: AES-256 encryption for sensitive data
import os
import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken


class EncryptionService:
    """
    Encryption service using Fernet (symmetric encryption).
    Used for encrypting API keys and sensitive credentials before database storage.
    
    Implements RNF-01: AES-256 encryption for PII and sensitive data
    
    Usage:
        service = EncryptionService()
        encrypted = service.encrypt("my-api-key")
        decrypted = service.decrypt(encrypted)
    """
    
    _instance: Optional["EncryptionService"] = None
    
    def __new__(cls) -> "EncryptionService":
        """Singleton pattern for encryption service."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self) -> None:
        """Initialize encryption service with key from environment."""
        if self._initialized:
            return
        
        self._key = self._get_or_generate_key()
        self._fernet = Fernet(self._key)
        self._initialized = True
    
    def _get_or_generate_key(self) -> bytes:
        """
        Get encryption key from environment or generate a new one.
        
        The ENCRYPTION_KEY environment variable should be a base64-encoded 32-byte key.
        If not provided, generates a deterministic key from a secret phrase.
        """
        env_key = os.getenv("ENCRYPTION_KEY")
        
        if env_key:
            try:
                # Try to use as-is if it's a valid Fernet key
                Fernet(env_key.encode())
                return env_key.encode()
            except Exception:
                # If not a valid Fernet key, derive one from the value
                return self._derive_key_from_secret(env_key)
        
        # Fallback: use a default secret (NOT recommended for production)
        default_secret = os.getenv("SECRET_KEY", "prospecai-default-secret-key-change-in-production")
        return self._derive_key_from_secret(default_secret)
    
    def _derive_key_from_secret(self, secret: str) -> bytes:
        """
        Derive a Fernet-compatible key from an arbitrary secret string.
        Uses SHA-256 to generate a 32-byte key, then base64 encodes it.
        """
        # Hash the secret to get consistent 32 bytes
        hash_bytes = hashlib.sha256(secret.encode()).digest()
        # Fernet requires base64-encoded 32-byte key
        return base64.urlsafe_b64encode(hash_bytes)
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a string value.
        
        Args:
            plaintext: The string to encrypt
            
        Returns:
            Base64-encoded encrypted string
        """
        if not plaintext:
            return ""
        
        encrypted_bytes = self._fernet.encrypt(plaintext.encode("utf-8"))
        return encrypted_bytes.decode("utf-8")
    
    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypt an encrypted string value.
        
        Args:
            ciphertext: The encrypted string to decrypt
            
        Returns:
            Decrypted plaintext string
            
        Raises:
            InvalidToken: If decryption fails (wrong key or corrupted data)
        """
        if not ciphertext:
            return ""
        
        try:
            decrypted_bytes = self._fernet.decrypt(ciphertext.encode("utf-8"))
            return decrypted_bytes.decode("utf-8")
        except InvalidToken:
            raise ValueError("Failed to decrypt: invalid token or corrupted data")
    
    def encrypt_if_not_empty(self, value: Optional[str]) -> Optional[str]:
        """Encrypt a value only if it's not None or empty."""
        if value is None or value == "":
            return None
        return self.encrypt(value)
    
    def decrypt_if_not_empty(self, value: Optional[str]) -> Optional[str]:
        """Decrypt a value only if it's not None or empty."""
        if value is None or value == "":
            return None
        return self.decrypt(value)
    
    def mask_credential(self, credential: str, visible_chars: int = 4) -> str:
        """
        Mask a credential for display purposes.
        Shows only the last N characters.
        
        Args:
            credential: The credential to mask
            visible_chars: Number of characters to show at the end
            
        Returns:
            Masked string like "****abcd"
        """
        if not credential or len(credential) <= visible_chars:
            return "*" * 8
        
        masked_length = len(credential) - visible_chars
        return "*" * min(masked_length, 12) + credential[-visible_chars:]
    
    @staticmethod
    def generate_new_key() -> str:
        """
        Generate a new Fernet encryption key.
        Use this to create a new ENCRYPTION_KEY for environment variables.
        
        Returns:
            A base64-encoded 32-byte key suitable for Fernet
        """
        return Fernet.generate_key().decode("utf-8")


# Singleton instance for easy import
encryption_service = EncryptionService()

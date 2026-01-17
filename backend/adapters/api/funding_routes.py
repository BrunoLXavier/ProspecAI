"""
This file previously contained a stubbed funding API used during early development.
The application now exposes `backend.routers.funding` which is DB-backed.

To avoid accidental imports of mocked routes, this module is intentionally left
as a no-op. Remove this file only after ensuring no external references remain.
"""

# No runtime routes exported.
router = None

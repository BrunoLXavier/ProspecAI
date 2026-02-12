"""
Institute Filter Mixin - Reusable Institute-Level Filtering
Implements RF-04, RF-05, RF-08: Multi-institute CRM/Pipeline/Proposal filtering

Provides a lightweight mixin and helper function to apply institute_id
filtering to SQLAlchemy queries. Now that institute_id lives directly
on the clients, opportunities and proposals tables, the expensive JOINs
through the projects table are no longer needed.
"""
from typing import List, Optional, Sequence, TypeVar, Union
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.orm import Query
from sqlalchemy.sql import Select

import logging

logger = logging.getLogger(__name__)

# Type alias for institute ID values
InstituteIdList = Optional[Sequence[Union[str, UUID]]]


def apply_institute_filter(
    query: Select,
    model_class,
    institute_ids: InstituteIdList,
) -> Select:
    """
    Apply institute_id IN(...) filter to a SQLAlchemy select query.

    If *institute_ids* is empty or None the query is returned unchanged,
    which means "no institute restriction" (superadmin / global view).

    Args:
        query: The current SQLAlchemy select() statement.
        model_class: The SQLAlchemy model class that has an `institute_id` column.
        institute_ids: A list of institute UUIDs to filter by.

    Returns:
        The augmented query with the WHERE clause appended.
    """
    if not institute_ids:
        return query

    # Ensure we have a column to filter on
    if not hasattr(model_class, "institute_id"):
        logger.warning(
            f"Model {model_class.__name__} has no institute_id column; "
            "skipping institute filter."
        )
        return query

    # Normalise to str UUIDs so that comparison works regardless of type
    id_values = [str(iid) for iid in institute_ids]

    return query.where(model_class.institute_id.in_(id_values))


class InstituteFilterMixin:
    """
    Mixin for repositories that need institute-level filtering.

    Requirements on the host class:
    - ``self.model_class`` must exist (the SQLAlchemy model).

    Usage::

        class MyRepository(BaseRepository[T, M], InstituteFilterMixin):
            async def list_for_institutes(self, institute_ids, ...):
                query = select(self.model_class).where(...)
                query = self.filter_by_institutes(query, institute_ids)
                ...
    """

    def filter_by_institutes(
        self,
        query: Select,
        institute_ids: InstituteIdList,
    ) -> Select:
        """Convenience wrapper around the module-level helper."""
        return apply_institute_filter(query, self.model_class, institute_ids)

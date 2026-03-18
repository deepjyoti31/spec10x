"""
Spec10x — Connector Registry

Central registry that maps (source_type, provider) pairs to their
connector implementation classes.  Use ``get_connector()`` to obtain
an instance, or ``register_connector()`` as a class decorator when
adding a new provider.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.connectors.base import BaseConnector

logger = logging.getLogger(__name__)

# Maps (source_type_value, provider_value) → connector class
CONNECTOR_REGISTRY: dict[tuple[str, str], type["BaseConnector"]] = {}


def register_connector(source_type: str, provider: str):
    """Class decorator that registers a connector under the given key."""

    def _decorator(cls: type["BaseConnector"]) -> type["BaseConnector"]:
        key = (source_type, provider)
        if key in CONNECTOR_REGISTRY:
            logger.warning(
                "Overwriting connector registration for %s — was %s, now %s",
                key,
                CONNECTOR_REGISTRY[key].__name__,
                cls.__name__,
            )
        CONNECTOR_REGISTRY[key] = cls
        return cls

    return _decorator


def get_connector(source_type: str, provider: str) -> type["BaseConnector"] | None:
    """Look up a connector class by source type and provider.

    Returns ``None`` if no connector is registered for the pair.
    """
    return CONNECTOR_REGISTRY.get((source_type, provider))


# Auto-import concrete connectors so they self-register on module load.
# New connectors only need to be added to this list.
def _auto_discover() -> None:
    try:
        import app.connectors.zendesk  # noqa: F401
    except ImportError:
        logger.debug("Zendesk connector not available")
    try:
        import app.connectors.csv_import  # noqa: F401
    except ImportError:
        logger.debug("CSV import connector not available")


_auto_discover()

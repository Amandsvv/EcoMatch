"""pytest configuration."""

import pytest
import asyncio


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )

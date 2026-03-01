---
name: Python Testing Patterns
description: Comprehensive guide to implementing robust testing strategies in Python using pytest, fixtures, mocking, parameterization, and test-driven development practices.
---

# Python Testing Patterns

## When to Use This Skill
- Writing unit tests for Python code
- Setting up test suites and test infrastructure
- Implementing test-driven development (TDD)
- Creating integration tests for APIs and services
- Mocking external dependencies and services
- Testing async code and concurrent operations
- Setting up continuous testing in CI/CD
- Implementing property-based testing
- Testing database operations
- Debugging failing tests

## Core Concepts

### 1. Test Types
- Unit Tests: Test individual functions/classes in isolation
- Integration Tests: Test interaction between components
- Functional Tests: Test complete features end-to-end
- Performance Tests: Measure speed and resource usage

### 2. Test Structure (AAA Pattern)
- Arrange: Set up test data and preconditions
- Act: Execute the code under test
- Assert: Verify the results

### 3. Test Coverage
- Measure what code is exercised by tests
- Identify untested code paths
- Aim for meaningful coverage, not just high percentages

### 4. Test Isolation
- Tests should be independent
- No shared state between tests
- Each test should clean up after itself

## Quick Start
```python
# test_example.py
def add(a, b):
    return a + b

def test_add():
    """Basic test example."""
    result = add(2, 3)
    assert result == 5

def test_add_negative():
    """Test with negative numbers."""
    assert add(-1, 1) == 0

# Run with: pytest test_example.py
```

## Fundamental Patterns

### Pattern 1: Basic pytest Tests
```python
# test_calculator.py
import pytest

class Calculator:
    """Simple calculator for testing."""
    def add(self, a: float, b: float) -> float:
        return a + b

    def subtract(self, a: float, b: float) -> float:
        return a - b

    def multiply(self, a: float, b: float) -> float:
        return a * b

    def divide(self, a: float, b: float) -> float:
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b

def test_addition():
    """Test addition."""
    calc = Calculator()
    assert calc.add(2, 3) == 5
    assert calc.add(-1, 1) == 0
    assert calc.add(0, 0) == 0

def test_division_by_zero():
    """Test division by zero raises error."""
    calc = Calculator()
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        calc.divide(5, 0)
```

### Pattern 2: Fixtures for Setup and Teardown
```python
# test_database.py
import pytest
from typing import Generator

class Database:
    """Simple database class."""
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.connected = False

    def connect(self):
        """Connect to database."""
        self.connected = True
        
    def disconnect(self):
        """Disconnect from database."""
        self.connected = False
        
    def query(self, sql: str) -> list:
        """Execute query."""
        if not self.connected:
            raise RuntimeError("Not connected")
        return [{"id": 1, "name": "Test"}]

@pytest.fixture
def db() -> Generator[Database, None, None]:
    """Fixture that provides connected database."""
    # Setup
    database = Database("sqlite:///:memory:")
    database.connect()
    
    # Provide to test
    yield database
    
    # Teardown
    database.disconnect()

def test_database_query(db):
    """Test database query with fixture."""
    results = db.query("SELECT * FROM users")
    assert len(results) == 1
    assert results[0]["name"] == "Test"

@pytest.fixture(scope="session")
def app_config():
    """Session-scoped fixture - created once per test session."""
    return {
        "database_url": "postgresql://localhost/test",
        "api_key": "test-key",
        "debug": True
    }
```

### Pattern 3: Parameterized Tests
```python
# test_validation.py
import pytest

def is_valid_email(email: str) -> bool:
    """Check if email is valid."""
    return "@" in email and "." in email.split("@")[1]

@pytest.mark.parametrize("email,expected", [
    ("user@example.com", True),
    ("test.user@domain.co.uk", True),
    ("invalid.email", False),
    ("@example.com", False),
    ("user@domain", False),
    ("", False),
])
def test_email_validation(email, expected):
    """Test email validation with various inputs."""
    assert is_valid_email(email) == expected
```

### Pattern 4: Mocking with unittest.mock
```python
# test_api_client.py
import pytest
from unittest.mock import Mock, patch, MagicMock
import requests

class APIClient:
    """Simple API client."""
    def __init__(self, base_url: str):
        self.base_url = base_url

    def get_user(self, user_id: int) -> dict:
        """Fetch user from API."""
        response = requests.get(f"{self.base_url}/users/{user_id}")
        response.raise_for_status()
        return response.json()

def test_get_user_success():
    """Test successful API call with mock."""
    client = APIClient("https://api.example.com")
    
    mock_response = Mock()
    mock_response.json.return_value = {"id": 1, "name": "John Doe"}
    mock_response.raise_for_status.return_value = None
    
    with patch("requests.get", return_value=mock_response) as mock_get:
        user = client.get_user(1)
        assert user["id"] == 1
        assert user["name"] == "John Doe"
        mock_get.assert_called_once_with("https://api.example.com/users/1")

@patch("requests.post")
def test_create_user(mock_post):
    """Test user creation with decorator syntax."""
    client = APIClient("https://api.example.com")
    mock_post.return_value.json.return_value = {"id": 2, "name": "Jane Doe"}
    mock_post.return_value.raise_for_status.return_value = None
    
    user_data = {"name": "Jane Doe", "email": "jane@example.com"}
    result = client.create_user(user_data)
    
    assert result["id"] == 2
    mock_post.assert_called_once()
    call_args = mock_post.call_args
    assert call_args.kwargs["json"] == user_data
```

### Pattern 5: Testing Exceptions
```python
# test_exceptions.py
import pytest

def divide(a: float, b: float) -> float:
    """Divide a by b."""
    if b == 0:
        raise ZeroDivisionError("Division by zero")
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        raise TypeError("Arguments must be numbers")
    return a / b

def test_zero_division():
    """Test exception is raised for division by zero."""
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)
```

## Advanced Patterns

### Pattern 6: Testing Async Code
```python
# test_async.py
import pytest
import asyncio

async def fetch_data(url: str) -> dict:
    """Fetch data asynchronously."""
    await asyncio.sleep(0.1)
    return {"url": url, "data": "result"}

@pytest.mark.asyncio
async def test_fetch_data():
    """Test async function."""
    result = await fetch_data("https://api.example.com")
    assert result["url"] == "https://api.example.com"
    assert "data" in result
```

### Pattern 7: Monkeypatch for Testing
```python
# test_environment.py
import os
import pytest

def get_database_url() -> str:
    """Get database URL from environment."""
    return os.environ.get("DATABASE_URL", "sqlite:///:memory:")

def test_database_url_custom(monkeypatch):
    """Test custom database URL with monkeypatch."""
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/test")
    assert get_database_url() == "postgresql://localhost/test"
```

### Pattern 8: Temporary Files and Directories
```python
# test_file_operations.py
import pytest
from pathlib import Path

def test_file_operations(tmp_path):
    """Test file operations with temporary directory."""
    # tmp_path is a pathlib.Path object
    test_file = tmp_path / "test_data.txt"
    
    # Save data
    test_file.write_text("Hello, World!")
    
    # Verify file exists
    assert test_file.exists()
    assert test_file.read_text() == "Hello, World!"
```

### Pattern 10: Property-Based Testing
```python
# test_properties.py
from hypothesis import given, strategies as st
import pytest

def reverse_string(s: str) -> str:
    """Reverse a string."""
    return s[::-1]

@given(st.text())
def test_reverse_twice_is_original(s):
    """Property: reversing twice returns original."""
    assert reverse_string(reverse_string(s)) == s

@given(st.integers(), st.integers())
def test_addition_commutative(a, b):
    """Property: addition is commutative."""
    assert a + b == b + a
```

## Test Design Principles
1. **One Behavior Per Test**: Each test should verify exactly one behavior.
2. **Test Error Paths**: Always test failure cases, not just happy paths.

## Testing Best Practices
- **Test Organization**: Split tests into `test_unit/`, `test_integration/`, `test_e2e/`.
- **Naming Conventions**: Use `test_<unit>_<scenario>_<expected_outcome>`.
- **Mocking Time**: Use `freezegun` (`@freeze_time`) for predictable time-dependent behavior.
- **Markers**: Use `@pytest.mark.slow`, `@pytest.mark.skip`, `@pytest.mark.xfail` effectively.
- **Coverage**: Use `pytest-cov` to monitor testing coverage. Ensure all edge cases are met.

## Configuration Files Example
```ini
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --strict-markers --tb=short --cov=myapp --cov-report=term-missing
markers =
    slow: marks tests as slow
    integration: marks integration tests
    unit: marks unit tests
    e2e: marks end-to-end tests
```

## Resources
- pytest documentation: https://docs.pytest.org/
- unittest.mock: https://docs.python.org/3/library/unittest.mock.html
- hypothesis: Property-based testing
- pytest-asyncio: Testing async code
- pytest-cov: Coverage reporting
- pytest-mock: pytest wrapper for mock

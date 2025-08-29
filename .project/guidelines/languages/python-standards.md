# Python Coding Standards

## General Principles
- Python 3.12+ required (3.13 recommended for performance improvements)
- Type hints mandatory for all functions and methods
- Async-first for web APIs and I/O operations
- PEP 8 compliance with Black formatter

## Python Version and Features

### Minimum Requirements
- Python 3.12 or higher
- Python 3.13 recommended for:
  - 7% smaller memory footprint
  - JIT compiler improvements
  - Free-threaded mode (experimental)
  - 15-20% faster NumPy/Pandas operations

## Type Hints and Annotations

### Modern Type Hints (Python 3.12+)
```python
from typing import Annotated, Union, Optional
from datetime import datetime

# Use Union for multiple types (3.10+ can use |)
def process_data(value: Union[str, int]) -> str:
    return str(value)

# Python 3.10+ syntax
def process_data_modern(value: str | int) -> str:
    return str(value)

# Use Annotated for metadata
UserId = Annotated[int, "User ID must be positive"]

# Optional is Union[T, None]
def find_user(user_id: UserId) -> Optional[User]:
    # Implementation
    pass
```

### Function Annotations
```python
from typing import Callable, TypeVar, Generic

T = TypeVar('T')
R = TypeVar('R')

# Annotate function parameters
def apply_function(
    func: Callable[[T], R],
    value: T
) -> R:
    return func(value)

# Generic class
class Repository(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []
    
    def add(self, item: T) -> None:
        self._items.append(item)
    
    def get_all(self) -> list[T]:
        return self._items.copy()
```

## FastAPI Patterns (for API Backend)

### Basic API Structure
```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

app = FastAPI(
    title="API Title",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Pydantic models for validation
class UserCreate(BaseModel):
    email: str = Field(..., example="user@example.com")
    name: str = Field(..., min_length=1, max_length=100)
    age: Optional[int] = Field(None, ge=0, le=120)

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime
    
    class Config:
        from_attributes = True
```

### Async Route Handlers
```python
# GOOD: Async handler for I/O operations
@app.get("/users/{user_id}")
async def get_user(user_id: int) -> UserResponse:
    user = await fetch_user_from_db(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# GOOD: Sync handler for CPU-bound operations
@app.post("/calculate")
def calculate_result(data: CalculationInput) -> CalculationResult:
    # CPU-intensive calculation
    result = perform_calculation(data)
    return result
```

### Dependency Injection
```python
from fastapi import Depends
from typing import Annotated

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    # Validate token and return user
    pass

# Use Annotated for cleaner dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]

@app.get("/me")
async def read_users_me(current_user: CurrentUser) -> User:
    return current_user
```

## Async/Await Patterns

### Async Context Managers
```python
import asyncio
from contextlib import asynccontextmanager

@asynccontextmanager
async def database_session():
    session = await create_session()
    try:
        yield session
    finally:
        await session.close()

# Usage
async def get_data():
    async with database_session() as session:
        return await session.execute(query)
```

### Concurrent Operations
```python
import asyncio
from typing import List

async def fetch_multiple_users(user_ids: List[int]) -> List[User]:
    # Concurrent fetching
    tasks = [fetch_user(uid) for uid in user_ids]
    users = await asyncio.gather(*tasks)
    return users

# With error handling
async def fetch_with_errors(user_ids: List[int]) -> List[Union[User, Exception]]:
    tasks = [fetch_user(uid) for uid in user_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

## Error Handling

### Custom Exceptions
```python
class AppError(Exception):
    """Base application exception"""
    def __init__(self, message: str, code: str) -> None:
        self.message = message
        self.code = code
        super().__init__(message)

class ValidationError(AppError):
    """Validation error"""
    def __init__(self, field: str, message: str) -> None:
        super().__init__(
            message=f"Validation failed for {field}: {message}",
            code="VALIDATION_ERROR"
        )
        self.field = field

class NotFoundError(AppError):
    """Resource not found"""
    def __init__(self, resource: str, identifier: str) -> None:
        super().__init__(
            message=f"{resource} with id {identifier} not found",
            code="NOT_FOUND"
        )
```

### Result Type Pattern
```python
from typing import TypeVar, Generic, Union
from dataclasses import dataclass

T = TypeVar('T')
E = TypeVar('E')

@dataclass
class Success(Generic[T]):
    value: T

@dataclass  
class Failure(Generic[E]):
    error: E

Result = Union[Success[T], Failure[E]]

def divide(a: float, b: float) -> Result[float, str]:
    if b == 0:
        return Failure("Division by zero")
    return Success(a / b)

# Usage
result = divide(10, 2)
match result:
    case Success(value):
        print(f"Result: {value}")
    case Failure(error):
        print(f"Error: {error}")
```

## Code Organization

### Project Structure
```
src/
├── api/
│   ├── __init__.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── users.py
│   │   └── auth.py
│   └── dependencies.py
├── core/
│   ├── __init__.py
│   ├── config.py
│   └── security.py
├── models/
│   ├── __init__.py
│   └── user.py
├── services/
│   ├── __init__.py
│   └── user_service.py
├── db/
│   ├── __init__.py
│   └── session.py
└── main.py
```

### Module Imports
```python
# Absolute imports preferred
from src.models.user import User
from src.services.user_service import UserService

# Relative imports for package internals only
from .models import User
from ..services import UserService

# Import order (PEP 8)
# 1. Standard library
import os
import sys
from typing import List, Optional

# 2. Third-party
import fastapi
from pydantic import BaseModel

# 3. Local application
from src.models import User
from src.config import settings
```

## Testing with Pytest

### Test Structure
```python
import pytest
from httpx import AsyncClient
from unittest.mock import Mock, AsyncMock

# Fixtures
@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def mock_user():
    return User(
        id=1,
        email="test@example.com",
        name="Test User"
    )

# Async test
@pytest.mark.asyncio
async def test_get_user(client: AsyncClient, mock_user: User):
    response = await client.get(f"/users/{mock_user.id}")
    assert response.status_code == 200
    assert response.json()["email"] == mock_user.email

# Parametrized test
@pytest.mark.parametrize("input,expected", [
    (0, 0),
    (1, 1),
    (-1, 1),
])
def test_absolute_value(input: int, expected: int):
    assert abs(input) == expected
```

### Mocking
```python
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
async def test_with_mock():
    with patch('src.services.user_service.fetch_user') as mock_fetch:
        mock_fetch.return_value = AsyncMock(return_value=mock_user)
        result = await get_user_endpoint(1)
        assert result.id == 1
        mock_fetch.assert_called_once_with(1)
```

## Configuration Management

### Settings with Pydantic
```python
from pydantic import BaseSettings, Field
from functools import lru_cache

class Settings(BaseSettings):
    app_name: str = "Web App"
    debug: bool = False
    database_url: str = Field(..., env="DATABASE_URL")
    secret_key: str = Field(..., env="SECRET_KEY")
    
    # API Configuration
    api_prefix: str = "/api/v1"
    cors_origins: List[str] = ["http://localhost:3000"]
    
    # Auth0 Configuration
    auth0_domain: str = Field(..., env="AUTH0_DOMAIN")
    auth0_api_audience: str = Field(..., env="AUTH0_API_AUDIENCE")
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

## Logging Best Practices

```python
import logging
from logging import Logger

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger: Logger = logging.getLogger(__name__)

# Use structured logging
logger.info(
    "User action",
    extra={
        "user_id": user.id,
        "action": "login",
        "ip_address": request.client.host
    }
)

# Never log sensitive data
# BAD: logger.info(f"User {email} logged in with password {password}")
# GOOD: logger.info(f"User {email} logged in")
```

## Performance Optimization

- Use `asyncio` for I/O-bound operations
- Use `multiprocessing` for CPU-bound operations
- Profile before optimizing with `cProfile` or `py-spy`
- Use `__slots__` for classes with many instances
- Leverage Python 3.13's JIT compiler for numerical computations
- Consider `uvloop` for better async performance

## Security Best Practices

- Never store passwords in plain text
- Use `secrets` module for cryptographic tokens
- Validate all input with Pydantic models
- Use parameterized queries (SQLAlchemy)
- Keep dependencies updated
- Use environment variables for secrets
- Implement rate limiting on APIs
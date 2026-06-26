class FinVaultException(Exception):
    def __init__(self, message: str, code: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code

class NotFoundError(FinVaultException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, "NOT_FOUND", 404)

class ForbiddenError(FinVaultException):
    def __init__(self, message: str = "Access forbidden"):
        super().__init__(message, "FORBIDDEN", 403)

class ConflictError(FinVaultException):
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(message, "CONFLICT", 409)

class ValidationError(FinVaultException):
    def __init__(self, message: str = "Validation failed"):
        super().__init__(message, "VALIDATION_FAILED", 422)

class UnauthorizedError(FinVaultException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, "UNAUTHORIZED", 401)

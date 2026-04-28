"""Domain exception'ları — routes katmanında HTTPException'a dönüştürülür."""


class NotFoundError(Exception):
    def __init__(self, detail: str = "Not found"):
        self.detail = detail
        super().__init__(detail)


class ForbiddenError(Exception):
    def __init__(self, detail: str = "Forbidden"):
        self.detail = detail
        super().__init__(detail)


class ConflictError(Exception):
    def __init__(self, detail: str = "Conflict"):
        self.detail = detail
        super().__init__(detail)

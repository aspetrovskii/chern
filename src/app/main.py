from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.v1 import router as v1_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

app = FastAPI(title=settings.app_name, version="0.1.0")

_cors_origins = list(
    dict.fromkeys(
        [
            settings.frontend_public_url.rstrip("/"),
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:5174",
            "http://localhost:5174",
            "http://127.0.0.1:8080",
            "http://localhost:8080",
        ]
    )
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    _ = request
    return JSONResponse(
        status_code=exc.status_code,
        content={"error_code": f"http_{exc.status_code}", "message": str(exc.detail)},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    _ = request
    return JSONResponse(
        status_code=422,
        content={"error_code": "validation_error", "message": str(exc.errors())},
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(v1_router)

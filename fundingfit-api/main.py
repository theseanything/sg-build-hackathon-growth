import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import database
from routers import admin, business, history, match, plan, schemes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    logger.info("FundingFit API running — visit /docs for the interactive spec")
    yield


app = FastAPI(title="FundingFit API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router, prefix="/api")
app.include_router(business.router, prefix="/api")
app.include_router(schemes.router, prefix="/api")
app.include_router(match.router, prefix="/api")
app.include_router(plan.router, prefix="/api")
app.include_router(history.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

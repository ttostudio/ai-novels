from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import novels, bookmarks, analytics, generate

app = FastAPI(title="AI Novels API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(novels.router, prefix="/api")
app.include_router(bookmarks.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(generate.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}

# ✅ src/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import auth_router
from protected import usuarios_router

app = FastAPI(title="OMNIFACE Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cambiar en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(usuarios_router)

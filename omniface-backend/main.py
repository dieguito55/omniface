# ✅ omniface-backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import auth_router
from protected import usuarios_router
from personas import personas_router
from fastapi.staticfiles import StaticFiles
from departamentos import departamentos_router
from recon_live import router as recon_router
from asistencia import router as asistencia_router

app = FastAPI(title="OMNIFACE Backend")

# 🔐 CORS: permitir origenes frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.31.146:5173",  # tu frontend en red local
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔀 Routers
app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(departamentos_router)
app.include_router(personas_router)
app.include_router(recon_router)
app.include_router(asistencia_router)

# 📂 Rutas estáticas para imágenes
app.mount("/imagenes_originales", StaticFiles(directory="imagenes_originales"), name="imagenes_originales")
app.mount("/imagenes_optimizadas", StaticFiles(directory="imagenes_optimizadas"), name="imagenes_optimizadas")
app.mount("/capturas", StaticFiles(directory="capturas"), name="capturas")

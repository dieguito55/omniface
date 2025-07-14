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
from salida import router as salida_router  # El nuevo
app = FastAPI(title="OMNIFACE Backend")

# 🔐 CORS: permitir origenes frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.0.104:5173",  # tu frontend en red local
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
app.include_router(salida_router)  # /salida/...
# 📂 Rutas estáticas para imágenes
app.mount("/imagenes_originales", StaticFiles(directory="imagenes_originales"), name="imagenes_originales")
app.mount("/imagenes_optimizadas", StaticFiles(directory="imagenes_optimizadas"), name="imagenes_optimizadas")
app.mount("/capturas", StaticFiles(directory="capturas"), name="capturas")
app.mount("/capturas_salidas", StaticFiles(directory="capturas_salidas"), name="capturas_salidas")

# omniface-backend/recon_live.py
"""
Endpoints para reconocimiento facial en vivo:

•  GET /recon/camaras        → lista las cámaras disponibles
•  WS  /recon/ws?cam_id=0&token=…  → stream de vídeo + datos
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import cv2, json, asyncio

from recognition_core import RecognitionSession
from config          import SECRET_KEY, ALGORITHM
from jose            import jwt, JWTError
import time
import os
_cam_cache = {"camaras": [], "ts": 0}

router = APIRouter(prefix="/recon", tags=["Reconocimiento en vivo"])

# ──────────────────────────────
#  Helper: validar token en la query
# ──────────────────────────────
def get_user_id_from_token(token: str) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["id"])           # el campo que guardas en el JWT
    except (JWTError, KeyError, ValueError):
        raise

# ──────────────────────────────
#  Listar cámaras locales
# ──────────────────────────────
@router.get("/camaras")
def listar_camaras():
    if time.time() - _cam_cache["ts"] < 30:          # ← 30 s
        return {"camaras": _cam_cache["camaras"]}

    cams = []
    for i in range(3):                               # prueba 0-2
        backend = cv2.CAP_MSMF if os.name == "nt" else 0
        cap = cv2.VideoCapture(i, backend)
        if cap.isOpened():
            cams.append({"id": i, "name": f"Cámara {i}"})
            cap.release()
    _cam_cache.update({"camaras": cams, "ts": time.time()})
    return {"camaras": cams}

# ──────────────────────────────
#  WebSocket principal
# ──────────────────────────────
@router.websocket("/ws")
async def websocket_recon(
        ws: WebSocket,
        cam_id: int = 0,
        token: str = Query(...)):           # token obligatorio en la URL
    # ── autenticar ───────────────────────
    try:
        user_id = get_user_id_from_token(token)
    except Exception:
        await ws.close(code=4401, reason="Token inválido")
        return

    await ws.accept()

    # ── crear sesión ─────────────────────
    try:
        session = RecognitionSession(user_id, cam_id)
    except FileNotFoundError as e:
        await ws.send_text(json.dumps(
            {"type": "error", "detail": str(e)}
        ))
        await asyncio.sleep(2)
        await ws.close(code=4004)
        return

    # ── bucle ────────────────────────────
    try:
        await session.stream(ws)
    except WebSocketDisconnect:
        
        pass
    finally:
        await session.close()

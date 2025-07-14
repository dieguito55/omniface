import mysql.connector

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import cv2, json, asyncio

from recognition_core import RecognitionSession
from config          import SECRET_KEY, ALGORITHM
from jose            import jwt, JWTError
import time
import os
from fastapi import HTTPException

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
def listar_camaras(force: bool = False):
    if force or time.time() - _cam_cache["ts"] < 30:          # ← 30 s o force
        _cam_cache["ts"] = 0  # Force reload
    if time.time() - _cam_cache["ts"] < 30:
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
#  Recargar modelo
# ──────────────────────────────
@router.get("/reload_model")
def reload_model(token: str = Query(...)):
    try:
        user_id = get_user_id_from_token(token)
        RecognitionSession.reload_model(user_id)
        return {"mensaje": "Modelo recargado"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ──────────────────────────────
#  WebSocket principal
# ──────────────────────────────
@router.websocket("/ws")
async def websocket_recon(
    ws: WebSocket,
    cam_id: int = 0,
    token: str = Query(...),
    modo: str = Query("normal")
):
    # ── autenticar ───────────────────────
    try:
        user_id = get_user_id_from_token(token)
    except Exception:
        await ws.close(code=4401, reason="Token inválido")
        return

    await ws.accept()

    # ── crear sesión ─────────────────────
    try:
        session = RecognitionSession(user_id, cam_id, modo)
    except Exception as e:  # Cambiado de FileNotFoundError a Exception para atrapar todo
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
# ──────────────────────────────
#  Endpoint para salidas del día
# ──────────────────────────────
@router.get("/salida/dia/{usuario_id}")
def salidas_dia(usuario_id: int):
    try:
        conn = mysql.connector.connect(host="localhost", user="root", password="", database="omniface")
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT s.nombre, s.foto_path, s.fecha, s.hora, d.nombre AS departamento
            FROM salidas s
            LEFT JOIN departamentos d ON s.departamento_id = d.id
            WHERE s.usuario_id = %s AND s.fecha = CURDATE()
            ORDER BY s.hora DESC
        """, (usuario_id,))
        resultados = cursor.fetchall()
        cursor.close()
        conn.close()
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/estados")
def get_estados(token: str = Query(...)):
  try:
    user_id = get_user_id_from_token(token)
    conn = mysql.connector.connect(host="localhost", user="root", password="", database="omniface")
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
      SELECT p.nombre_completo as nombre, e.emocion_actual as emocion, e.ubicacion_actual as ubicacion, e.timestamp_ultimo
      FROM estado_persona e
      LEFT JOIN personas p ON e.persona_id = p.id
      WHERE p.usuario_id = %s
    """, (user_id,))
    estados = cursor.fetchall()
    cursor.close()
    conn.close()
    return estados
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
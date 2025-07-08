# omniface-backend/recognition_core.py
"""
Motor de reconocimiento en vivo.

•  Carga los modelos InsightFace únicamente la PRIMERA vez que alguien inicia
   un WebSocket (lazy-load).
•  Mantiene en caché los índices FAISS de cada usuario.
•  Captura la cámara en un hilo aparte para no bloquear el event-loop.
•  Envía los frames como JPEG base64 + metadatos (rostros, FPS, timestamp).
"""

import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"       # evita warning de MKL
os.environ["OMP_NUM_THREADS"]      = "1"          # ↓ evita desbordar hilos
os.environ["CUDA_MODULE_LOADING"]  = "LAZY"

import cv2, faiss, pickle, time, base64, asyncio, queue
import numpy as np
from pathlib import Path
from threading import Thread
from typing import List, Tuple
from insightface.app import FaceAnalysis
import functools
# arrastra junto a las demás importaciones
import base64
import torch
torch.backends.cudnn.benchmark = True
torch.set_num_threads(1)
torch.cuda.set_per_process_memory_fraction(0.8)
def dibujar_esquinas(frame, x1, y1, x2, y2, color, grosor=2, largo=30, radio=8):
    esquinas = [
        ((x1, y1), (x1 + largo, y1), (x1, y1 + largo)),
        ((x2, y1), (x2 - largo, y1), (x2, y1 + largo)),
        ((x1, y2), (x1 + largo, y2), (x1, y2 - largo)),
        ((x2, y2), (x2 - largo, y2), (x2, y2 - largo))
    ]
    
    for centro, horizontal, vertical in esquinas:
        cv2.line(frame, centro, horizontal, (255, 255, 255), grosor+2)
        cv2.line(frame, centro, vertical, (255, 255, 255), grosor+2)
        cv2.line(frame, centro, horizontal, color, grosor)
        cv2.line(frame, centro, vertical, color, grosor)
        cv2.circle(frame, centro, radio, color, -1)
        cv2.circle(frame, centro, radio-2, (255, 255, 255), 1)

def dibujar_landmarks(frame, puntos):
    puntos = puntos.astype(int)
    color_puntos = (80, 220, 255)
    color_lineas = (30, 150, 200)

    conexiones = [
        (0, 16), (36, 45), (48, 54), (27, 30),
        (17, 21), (22, 26), (36, 39), (42, 45), (48, 67)
    ]

    overlay = frame.copy()
    for i, j in conexiones:
        if i < len(puntos) and j < len(puntos):
            cv2.line(overlay, tuple(puntos[i]), tuple(puntos[j]), color_lineas, 1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

    for (x, y) in puntos:
        cv2.circle(frame, (x, y), 2, (255, 255, 255), -1)
        cv2.circle(frame, (x, y), 1, color_puntos, -1)

# ──────────────────────────────
#  Captura de vídeo (hilo)
# ──────────────────────────────
class VideoCaptureThread:
    """
    Captura frames en segundo plano y mantiene sólo el más reciente.
    """
    def __init__(self, cam_id: int, width=1280, height=720):
        # En Windows MSMF suele dar menos problemas que DSHOW
        backend = cv2.CAP_MSMF if os.name == "nt" else 0
        self.cap = cv2.VideoCapture(cam_id, backend)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH,  width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        self.cap.set(cv2.CAP_PROP_FPS,          30)

        self.q        = queue.Queue(maxsize=1)
        self.running  = True
        self.thread   = Thread(target=self._loop, daemon=True)
        self.thread.start()

    def _loop(self):
        while self.running:
            ok, frame = self.cap.read()
            if not ok:
                continue
            if not self.q.empty():
                try: self.q.get_nowait()
                except queue.Empty: pass
            self.q.put(frame)

    def read(self):
        try:    return self.q.get_nowait()
        except queue.Empty: return None

    def stop(self):
        self.running = False
        self.thread.join(timeout=0.5)
        self.cap.release()

# ──────────────────────────────
#  Sesión de reconocimiento
# ──────────────────────────────
class RecognitionSession:
    """
    Una instancia por WebSocket.

    • Almacena: índice FAISS + nombres del usuario.
    • Reutiliza (cachea) el modelo InsightFace y los índices cargados.
    """

    # --- caches compartidos ---
    _face_app = None                                          # modelo single-ton
    _models   = {}  # {user_id: (index, [nombres])}

    # --- parámetros ---
    _TH_SIMILARITY = 0.45
    _JPEG_PARAMS   = [int(cv2.IMWRITE_JPEG_QUALITY), 80]

    # ╭─────────────────────────╮
    # │  Inicialización lazy    │
    # ╰─────────────────────────╯
    @classmethod
    def _get_face_app(cls) -> FaceAnalysis:
        if cls._face_app is None:
            print("[Recon] ▶ Cargando InsightFace (antelopev2)…")
            app = FaceAnalysis(
                name="antelopev2",
                providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
            )
            app.prepare(ctx_id=0, det_size=(480, 480))
            cls._face_app = app
        return cls._face_app

    @classmethod
    def _load_model(cls, user_id: int):
        base      = Path(f"modelo_final/usuario_{user_id}")
        idx_path  = base / "faiss.index"
        names_pkl = base / "nombres.pkl"
        mtime     = idx_path.stat().st_mtime  # último mod.

        # cache válido ➜ devolver
        if (cached := cls._models.get(user_id)) and cached[2] == mtime:
            return cached[:2]

        # …si existe pero desactualizado, lo descartamos
        cls._models.pop(user_id, None)

        # recarga desde disco
        index   = faiss.read_index(str(idx_path))
        with open(names_pkl, "rb") as f:
            names = pickle.load(f)

        cls._models[user_id] = (index, names, mtime)
        print(f"[Recon] ⚡ Modelo usuario {user_id} cargado ({len(names)} emb.)")
        return index, names

    # ╭─────────────────────────╮
    # │  Constructor            │
    # ╰─────────────────────────╯
    def __init__(self, user_id: int, cam_id: int):
        self.user_id  = user_id
        self.face_app  = self._get_face_app()
        self.index, self.nombres = self._load_model(user_id)

        self.cam       = VideoCaptureThread(cam_id)
        self._fps_hist = []

    # ───── in-stream FPS suavizado ─────
    def _fps(self, frame_count: int, start_ts: float) -> float:
        fps = frame_count / (time.time() - start_ts + 1e-5)
        self._fps_hist.append(fps)
        self._fps_hist = self._fps_hist[-10:]
        return sum(self._fps_hist) / len(self._fps_hist)

    # ──────────────────────────────
    #  Detección + reconocimiento
    # ──────────────────────────────
    def _infer(self, frame) -> List[dict]:
        rostros = self.face_app.get(frame)
        if not rostros:
            return []

        embeds = np.array([r.embedding for r in rostros], np.float32)
        faiss.normalize_L2(embeds)
        D, I = self.index.search(embeds, 1)

        results = []
        for r, d, i in zip(rostros, D.ravel(), I.ravel()):
            sim  = float(d)
            name = self.nombres[i] if sim >= self._TH_SIMILARITY else "Desconocido"

            x1, y1, x2, y2 = map(int, r.bbox)
            color = (50, 255, 80) if name != "Desconocido" else (80, 50, 255)
            color_sec = (20, 180, 20) if name != "Desconocido" else (20, 20, 180)

            # ───── Diseño profesional ─────
            dibujar_esquinas(frame, x1, y1, x2, y2, color)
            if sim > 0.6 and r.kps is not None:
                dibujar_landmarks(frame, r.kps)

            cv2.rectangle(frame, (x1, y1 - 35), (x2, y1), color_sec, -1)
            cv2.rectangle(frame, (x1, y1 - 35), (x2, y1), color, 1)
            cv2.putText(frame, f"{name} ({sim:.2f})", (x1 + 5, y1 - 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            results.append({
                "bbox": [x1, y1, x2, y2],
                "nombre": name,
                "similitud": sim
            })

        return results


    # ──────────────────────────────
    #  Bucle de envío
    # ──────────────────────────────
    async def stream(self, ws):
        frame_cnt, t0 = 0, time.time()
        loop = asyncio.get_running_loop()

        while True:
            frame = self.cam.read()
            if frame is None:
                await asyncio.sleep(0.01)
                continue

            # ➜ 1) copia sobre la que dibujaremos
            proc_frame = frame.copy()

            # ➜ 2) inferencia en thread-pool **sobre proc_frame**
            faces = await loop.run_in_executor(
                None,
                functools.partial(self._infer, proc_frame)
            )

            # ➜ 3) codificamos **proc_frame** (ya tiene rectángulos)
            _, buf = cv2.imencode(".jpg", proc_frame, self._JPEG_PARAMS)
            b64 = base64.b64encode(buf).decode()

            await ws.send_json({
                "type"     : "frame",
                "frame"    : b64,
                "faces"    : faces,
                "fps"      : self._fps(frame_cnt, t0),
                "timestamp": time.time()
            })
            frame_cnt += 1
            await asyncio.sleep(0)   

    # ──────────────────────────────
    async def close(self):
        self.cam.stop()
        # ➋ liberar cache para que un próximo “Iniciar” recargue
        self._models.pop(self.user_id, None)
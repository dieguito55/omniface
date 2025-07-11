
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
from datetime import datetime, time
from collections import defaultdict
import uuid
import mysql.connector
import time  # <--- para time.time()
from datetime import datetime, time as dtime  # <--- renombrar para evitar conflicto
import mediapipe as mp
mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
# arrastra junto a las demás importaciones
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

def dibujar_landmarks(frame, bbox, face_mesh):
    """
    Dibuja un enmallado facial detallado usando MediaPipe Face Mesh.
    
    Args:
        frame: Imagen BGR de OpenCV donde se dibujará el enmallado.
        bbox: Bounding box del rostro [x1, y1, x2, y2].
        face_mesh: Instancia de MediaPipe FaceMesh.
    """
    x1, y1, x2, y2 = map(int, bbox)
    
    # Expandir ligeramente el bbox para mejor detección (opcional, pero ayuda si el bbox es muy ajustado)
    margin = 20
    y1 = max(0, y1 - margin)
    x1 = max(0, x1 - margin)
    y2 = min(frame.shape[0], y2 + margin)
    x2 = min(frame.shape[1], x2 + margin)
    
    face_region = frame[y1:y2, x1:x2]
    if face_region.size == 0:
        return
    
    # Convertir a RGB para procesar con MediaPipe
    rgb_face = cv2.cvtColor(face_region, cv2.COLOR_BGR2RGB)
    
    # Procesar con Face Mesh
    results = face_mesh.process(rgb_face)
    
    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            # Dibujar el mesh completo (tesselation)
            mp_drawing.draw_landmarks(
                image=rgb_face,
                landmark_list=face_landmarks,
                connections=mp_face_mesh.FACEMESH_TESSELATION,
                landmark_drawing_spec=None,
                connection_drawing_spec=mp_drawing_styles.get_default_face_mesh_tesselation_style()
            )
            
            # Dibujar contornos (ojos, labios, cejas, etc.)
            mp_drawing.draw_landmarks(
                image=rgb_face,
                landmark_list=face_landmarks,
                connections=mp_face_mesh.FACEMESH_CONTOURS,
                landmark_drawing_spec=None,
                connection_drawing_spec=mp_drawing_styles.get_default_face_mesh_contours_style()
            )
            
            # Dibujar iris (si refine_landmarks=True)
            mp_drawing.draw_landmarks(
                image=rgb_face,
                landmark_list=face_landmarks,
                connections=mp_face_mesh.FACEMESH_IRISES,
                landmark_drawing_spec=None,
                connection_drawing_spec=mp_drawing_styles.get_default_face_mesh_iris_connections_style()
            )
    
    # Convertir de vuelta a BGR y copiar al frame original
    face_region[:] = cv2.cvtColor(rgb_face, cv2.COLOR_RGB2BGR)
def es_rostro_valido(r, frame):
    """Valida la calidad del rostro detectado"""
    try:
        if r is None or r.bbox is None:
            return False
            
        x1, y1, x2, y2 = map(int, r.bbox)
        
        # Tamaño mínimo
        if (x2 - x1) < 50 or (y2 - y1) < 50:
            return False
            
        # Extraer región del rostro del frame completo
        face_region = frame[y1:y2, x1:x2]
        if face_region.size == 0:
            return False
            
        # Verificar blur (varianza Laplaciana)
        gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
        fm = cv2.Laplacian(gray, cv2.CV_64F).var()
        print(f"[DEBUG] Blur fm: {fm}")  # Debería ser >100 para bueno
        if fm < 100:  # Umbral para considerar borroso
            return False
            
        # Verificar iluminación (valor promedio en HSV)
        hsv = cv2.cvtColor(face_region, cv2.COLOR_BGR2HSV)
        mean_v = hsv[...,2].mean()
        print(f"[DEBUG] Iluminación mean_V: {mean_v}")  # >50 para bueno
        if mean_v < 50:  # Valor/V muy bajo
            return False
            
        return True
    except Exception as e:
        print(f"Error en validación de rostro: {str(e)}")
        return False


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
    def _registrar_asistencia(self, persona_nombre, estado, tipo, path_foto, fecha, hora):
        try:
            conn = mysql.connector.connect(
                host="localhost",
                user="root",
                password="",
                database="omniface"
            )
            cursor = conn.cursor()

            # Buscar persona
            cursor.execute("SELECT id, usuario_id, departamentos_id FROM personas WHERE nombre_completo=%s", (persona_nombre,))
            persona = cursor.fetchone()

            if persona:
                persona_id, usuario_id, dep_id = persona
            else:
                persona_id = None
                usuario_id = self.user_id
                dep_id = None

            cursor.execute("""
                INSERT INTO asistencias
                (persona_id, usuario_id, departamento_id, nombre, estado, tipo, foto_path, fecha, hora)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                persona_id,
                usuario_id,
                dep_id,
                persona_nombre,
                estado,
                tipo,
                path_foto,
                fecha,
                hora
            ))

            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"[ERROR] Registro de asistencia falló: {e}")
    # --- caches compartidos ---
    _face_app = None                                          # modelo single-ton
    _models   = {}  # {user_id: (index, [nombres])}
    _face_mesh = None  # modelo single-ton para MediaPipe

    @classmethod
    def _get_face_mesh(cls):
        if cls._face_mesh is None:
            print("[Recon] ▶ Cargando MediaPipe Face Mesh…")
            cls._face_mesh = mp_face_mesh.FaceMesh(
                static_image_mode=False,      # Modo de video (tracking)
                max_num_faces=10,             # Soporte para múltiples rostros
                refine_landmarks=True,        # Refina iris y detalles
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
        return cls._face_mesh
    # --- parámetros ---
    _TH_SIMILARITY = 0.55
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
    @classmethod
    def _load_fotos(cls, user_id: int):
        conn = mysql.connector.connect(host="localhost", user="root", password="", database="omniface")
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT nombre_completo, imagen_original FROM personas WHERE usuario_id = %s", (user_id,))
        fotos = {row['nombre_completo']: row['imagen_original'] for row in cursor.fetchall()}
        cursor.close()
        conn.close()
        return fotos
    def __init__(self, user_id: int, cam_id: int):
        self.user_id  = user_id
        self.face_app  = self._get_face_app()
        self.face_mesh = self._get_face_mesh()
        self.index, self.nombres = self._load_model(user_id)
        self.fotos = self._load_fotos(user_id)  # Nuevo método
        self.cam       = VideoCaptureThread(cam_id)
        self._fps_hist = []
        self.registrados_hoy = set()
        self.ultimo_reconocido = defaultdict(lambda: 0)
        self.directorio_capturas = Path("capturas") / f"usuario_{user_id}"
        self.directorio_capturas.mkdir(parents=True, exist_ok=True)
    # ───── in-stream FPS suavizado ─────
    def _fps(self, frame_count: int, start_ts: float) -> float:
        fps = frame_count / (time.time() - start_ts + 1e-5)
        self._fps_hist.append(fps)
        self._fps_hist = self._fps_hist[-10:]
        return sum(self._fps_hist) / len(self._fps_hist)
    @staticmethod
    def _sanitize_filename(name: str) -> str:
        return "".join(c for c in name if c.isalnum() or c in "-_").rstrip()
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
            sim = float(d)
            name = self.nombres[i] if sim >= self._TH_SIMILARITY else "Desconocido"

            x1, y1, x2, y2 = map(int, r.bbox)
            color = (50, 255, 80) if name != "Desconocido" else (80, 50, 255)
            color_sec = (20, 180, 20) if name != "Desconocido" else (20, 20, 180)

            # Solo si pasa validación → registrar asistencia y guardar foto
            if es_rostro_valido(r, frame):
                rostro_crop = frame[y1:y2, x1:x2]
                ahora = datetime.now()
                fecha_str = ahora.strftime("%Y-%m-%d")
                hora_str = ahora.strftime("%H:%M:%S")
                estado = "Temprano" if ahora.time() <= dtime(8,10) else "Tarde" if ahora.time() <= dtime(2,30) else "Falto"

                if name != "Desconocido":
                    if name not in self.registrados_hoy:    
                        self.registrados_hoy.add(name)
                        nombre_folder = self.directorio_capturas / self._sanitize_filename(name)
                        nombre_folder.mkdir(parents=True, exist_ok=True)
                        nombre_img = f"{self._sanitize_filename(name)}_{fecha_str}_{hora_str.replace(':', '-')}.jpg"
                        path_img = nombre_folder / nombre_img
                        cv2.imwrite(str(path_img), rostro_crop)

                        self._registrar_asistencia(
                            persona_nombre=name,
                            estado=estado,
                            tipo="Conocido",
                            path_foto=str(path_img).replace("\\", "/"),
                            fecha=fecha_str,
                            hora=hora_str
                        )
                else:
                    continue

            # Dibujar el recuadro y nombre SIEMPRE (fuera del if, para todos los rostros detectados)
            dibujar_esquinas(frame, x1, y1, x2, y2, color)
            dibujar_landmarks(frame, r.bbox, self.face_mesh)
            cv2.rectangle(frame, (x1, y1 - 35), (x2, y1), color_sec, -1)
            cv2.rectangle(frame, (x1, y1 - 35), (x2, y1), color, 1)
            nombre_completo = f"{name} ({sim:.2f})"
            cv2.putText(frame, nombre_completo, (x1 + 5, y1 - 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            # ✅ Si ya fue registrado hoy, mostrar etiqueta "Registrado"
            if name != "Desconocido" and name in self.registrados_hoy:
                cv2.putText(frame, " Registrado", (x1 + 5, y1 - 45),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2)

            # Retornar el rostro, para frontend
            # Enviar datos para card
            foto_path = self.fotos.get(name) if name != "Desconocido" else None
            registrado = name != "Desconocido" and name in self.registrados_hoy
            results.append({
                "bbox": [x1, y1, x2, y2],
                "nombre": name,
                "similitud": sim,
                "foto_path": foto_path,  # Ruta relativa, ej. "usuario_1/juan.jpg"
                "registrado": registrado  # Para animación
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
    
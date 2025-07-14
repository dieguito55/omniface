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
from datetime import datetime, time as dtime 
from collections import defaultdict
import uuid
import mysql.connector
import mediapipe as mp
mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
import torch
torch.backends.cudnn.benchmark = True
torch.set_num_threads(1)
torch.cuda.set_per_process_memory_fraction(0.8)
from tensorflow.keras.models import load_model  # Para cargar el .h5
TH_SIMILARITY = 0.55

# ────────────────────────────────────────────────
#  Worker global de inferencia     (Paso 2)
# ────────────────────────────────────────────────
class InferenceWorker(Thread):
    """
    Recibe (frame, future) de varias RecognitionSession,
    procesa por lotes en GPU y resuelve los futures.
    """
    def __init__(self, face_app, face_mesh, index, nombres,emotion_model):
        super().__init__(daemon=True)
        self.face_app  = face_app
        self.face_mesh = face_mesh 
        self.index     = index
        self.nombres   = nombres
        self.emotion_model = emotion_model
        self.q_in = queue.Queue()   # (frame, future)
        self.start()

    # Sesión llama → devuelve asyncio.Future
    def submit(self, frame):
        fut = asyncio.get_running_loop().create_future()
        self.q_in.put((frame, fut))
        return fut

    # Bucle permanente
    def run(self):
        while True:
            frames, futs = [], []
            try:
                fr, fu = self.q_in.get(timeout=0.05)
                frames.append(fr); futs.append(fu)
                while not self.q_in.empty():
                    fr, fu = self.q_in.get_nowait()
                    frames.append(fr); futs.append(fu)
            except queue.Empty:
                continue

            # ---------- INFERENCIA LOTE ----------
            batch_results = [self._infer_single(f) for f in frames]

            # ---------- Resolver futures ----------
            for fu, res in zip(futs, batch_results):
                if not fu.cancelled():
                    fu.set_result(res)

    # Copia aquí tu antigua lógica de RecognitionSession._infer
    def _infer_single(self, frame):
        rostros = self.face_app.get(frame)
        print(f"[DEBUG] Rostros detectados por InsightFace: {len(rostros)}")  # Log para depuración
        if not rostros:
            return []
        embeds = np.array([r.embedding for r in rostros], np.float32)
        faiss.normalize_L2(embeds)
        D, I = self.index.search(embeds, 1)
        faces = []
        for r, d, i in zip(rostros, D.ravel(), I.ravel()):
            sim = float(d)
            name = self.nombres[i] if sim >= TH_SIMILARITY else "Desconocido"
            x1, y1, x2, y2 = map(int, r.bbox)
            emocion = "N/A"
            if self.emotion_model is not None:
                try:
                    face_region = frame[y1:y2, x1:x2]
                    if face_region.size > 0:
                        gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
                        gray = cv2.convertScaleAbs(gray, alpha=1.2, beta=10)
                        resized = cv2.resize(gray, (48, 48))
                        resized = resized.astype('float32') / 255.0
                        input_array = np.expand_dims(np.expand_dims(resized, axis=-1), axis=0)
                        pred = self.emotion_model.predict(input_array, verbose=0)[0]
                        emociones = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']
                        emocion = emociones[np.argmax(pred)]
                        probs_str = ', '.join(f'{emociones[i]}: {float(pred[i]):.4f}' for i in range(len(emociones)))
                        print(f"[DEBUG] Emoción probs para {name}: {{ {probs_str} }}")
                except Exception as e:
                    print(f"[ERROR] Fallo en detección de emoción para {name}: {e}")
            faces.append({
                "bbox": (x1, y1, x2, y2),
                "nombre": name,
                "emocion": emocion,
                "r": r,
                "confidence": sim
            })
        return faces

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


# ────────────────────────────────────────────────
#  Gestor global de cámaras        (Paso 1)
# ────────────────────────────────────────────────
class VideoManager:
    """
    Devuelve un VideoCaptureThread por cam_id.
    Lleva un conteo de cuántas sesiones la usan
    y cierra la cámara cuando nadie la necesita.
    """
    _threads: dict[int, "VideoCaptureThread"] = {}
    _refcnt : dict[int, int] = {}

    @classmethod
    def get(cls, cam_id: int) -> "VideoCaptureThread":
        if cam_id not in cls._threads or not cls._threads[cam_id].running:
            cls._threads[cam_id] = VideoCaptureThread(cam_id)
            cls._refcnt[cam_id]  = 0
        cls._refcnt[cam_id] += 1
        return cls._threads[cam_id]

    @classmethod
    def release(cls, cam_id: int):
        if cam_id not in cls._threads:
            return
        cls._refcnt[cam_id] -= 1
        if cls._refcnt[cam_id] <= 0:
            cls._threads[cam_id].stop()
            del cls._threads[cam_id]
            del cls._refcnt[cam_id]

# ──────────────────────────────
#  Captura de vídeo (hilo)
# ──────────────────────────────
class VideoCaptureThread:
    """
    Captura frames en segundo plano y mantiene sólo el más reciente.
    """
    def __init__(self, cam_id: int, width=960, height=540):
        # En Windows MSMF suele dar menos problemas que DSHOW
        backend = cv2.CAP_MSMF if os.name == "nt" else 0
        self.cap = cv2.VideoCapture(cam_id, backend)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH,  width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        self.cap.set(cv2.CAP_PROP_FPS,          20)

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
    def _registrar_salida(self, persona_nombre, path_foto, fecha, hora):
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
                INSERT INTO salidas
                (persona_id, usuario_id, departamento_id, nombre, foto_path, fecha, hora)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, (
                persona_id,
                usuario_id,
                dep_id,
                persona_nombre,
                path_foto,
                fecha,
                hora
            ))

            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"[ERROR] Registro de salida falló: {e}")

    async def _actualizar_estado_persona(self, persona_nombre: str, emocion: str, camara_id: str):
        if persona_nombre == "Desconocido":
            return  # Ignora desconocidos por ahora

        try:
            conn = mysql.connector.connect(
                host="localhost",
                user="root",
                password="",
                database="omniface"
            )
            cursor = conn.cursor()

            # Obtener persona_id (para conocidos)
            cursor.execute("SELECT id FROM personas WHERE nombre_completo = %s AND usuario_id = %s", (persona_nombre, self.user_id))
            persona = cursor.fetchone()
            if not persona:
                return  # No es conocido, ignora

            persona_id = persona[0]
            ubicacion = f"camara_{camara_id}"  # Formato con guión bajo y minúscula

            # UPSERT: Insert si no existe, update si sí (fluido, una query)
            cursor.execute("""
                INSERT INTO estado_persona (persona_id, emocion_actual, ubicacion_actual)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE
                emocion_actual = VALUES(emocion_actual),
                ubicacion_actual = VALUES(ubicacion_actual)
            """, (persona_id, emocion, ubicacion))

            conn.commit()
            print(f"[DEBUG] Estado actualizado para {persona_nombre}: Emoción={emocion}, Ubicación={ubicacion}")  # Log para depurar
        except mysql.connector.Error as e:
            print(f"[ERROR] Actualizar estado persona: {e}")
        finally:
            cursor.close()
            conn.close()


    # --- caches compartidos ---
    _face_app = None                                          # modelo single-ton
    _models   = {}  # {user_id: (index, [nombres])}
    _face_mesh = None  # modelo single-ton para MediaPipe
    _workers = {}  # {user_id: InferenceWorker}  # Worker per user
    _emotion_model = None  # Modelo single-ton para emociones

    @classmethod
    def _get_emotion_model(cls):
        if cls._emotion_model is None:
            print("[Recon] ▶ Cargando modelo de emociones (emotion_model.h5)…")
            try:
                cls._emotion_model = load_model('emotion_model.h5')
            except Exception as e:
                print(f"[ERROR] Fallo al cargar modelo de emociones: {e}")
                cls._emotion_model = None
        return cls._emotion_model
    _ultimo_dia = None
    _registrados_hoy = defaultdict(set)
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

    @classmethod
    def reload_model(cls, user_id: int):
        cls._models.pop(user_id, None)  # Limpia cache modelo
        cls._workers.pop(user_id, None)  # Limpia worker para recrear con nuevo index
        return cls._load_model(user_id)  # Recarga modelo

    # ╭─────────────────────────╮
    # │  Constructor            │
    # ╰─────────────────────────╯
    @classmethod
    def _load_fotos(cls, user_id: int):
        try:
            conn = mysql.connector.connect(host="localhost", user="root", password="", database="omniface")
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT nombre_completo, imagen_original FROM personas WHERE usuario_id = %s", (user_id,))
            rows = cursor.fetchall()
            if not rows:
                print(f"[WARNING] No personas encontradas en BD para user_id {user_id}")
            fotos = {}
            for row in rows:
                if row['imagen_original']:
                    key = row['nombre_completo'].strip().lower()
                    fotos[key] = row['imagen_original']  # Incluye "usuario_X/..."
            cursor.close()
            conn.close()
            print(f"[DEBUG] Fotos cargadas para user {user_id}: {fotos}")
            print(f"[DEBUG] Número de fotos: {len(fotos)}")
            return fotos
        except mysql.connector.Error as e:
            print(f"[ERROR] Fallo al cargar fotos de BD: {e}")
            return {}

    def __init__(self, user_id: int, cam_id: int, modo: str = "normal"):
        print(f"[DEBUG] Iniciando RecognitionSession para user_id={user_id}, cam_id={cam_id}, modo={modo}")
        self.user_id = user_id
        self.cam_id = cam_id
        hoy = datetime.now().date()
        if not hasattr(self, '_ultimo_dia') or self._ultimo_dia != hoy:
            self._registrados_hoy[self.user_id].clear()
            self._ultimo_dia = hoy
        self.modo = modo

        # ---- modelo/índice/mesh ----------
        self.face_app = self._get_face_app()
        self.face_mesh = self._get_face_mesh()
        print("[DEBUG] Cargando modelo...")
        self.index, self.nombres = self._load_model(user_id)
        # Normaliza self.nombres para que coincida con fotos (lower/strip)
        self.nombres = [n.strip().lower() for n in self.nombres]
        print(f"[DEBUG] Nombres normalizados del modelo: {self.nombres}")
        print("[DEBUG] Cargando fotos de DB...")
        self.fotos = self._load_fotos(user_id)
        self.emotion_model = self._get_emotion_model()

        # ---- caché optimizado: horas por departamento y dep_id por persona ----
        self.horas_por_departamento = {}
        self.dep_por_persona = {}
        print("[DEBUG] Iniciando carga de cachés optimizados...")
        try:
            conn = mysql.connector.connect(host="localhost", user="root", password="", database="omniface")
            print("[DEBUG] Conexión BD exitosa")
            cursor = conn.cursor(dictionary=True)

            # Caché de horas por departamento
            cursor.execute("""
                SELECT id, hora_temprano, hora_tarde
                FROM departamentos
                WHERE usuario_id = %s
            """, (user_id,))
            rows_dep = cursor.fetchall()
            print(f"[DEBUG] Encontrados {len(rows_dep)} departamentos")
            for row in rows_dep:
                try:
                    hora_temprano_td = row["hora_temprano"]
                    hora_tarde_td = row["hora_tarde"]
                    if hora_temprano_td is None or hora_tarde_td is None:
                        raise ValueError("Hora nula")

                    # Convertir timedelta a time
                    hora_temprano = dtime(
                        hora_temprano_td.seconds // 3600,
                        (hora_temprano_td.seconds // 60) % 60,
                        hora_temprano_td.seconds % 60
                    )
                    hora_tarde = dtime(
                        hora_tarde_td.seconds // 3600,
                        (hora_tarde_td.seconds // 60) % 60,
                        hora_tarde_td.seconds % 60
                    )

                    self.horas_por_departamento[row["id"]] = {
                        "hora_temprano": hora_temprano,
                        "hora_tarde": hora_tarde
                    }
                    print(f"[DEBUG] Horas cargadas para dep {row['id']}: {self.horas_por_departamento[row['id']]}")
                except Exception as ve:
                    print(f"[ERROR] Hora inválida para dep {row['id']}, usando defaults: {ve}")
                    self.horas_por_departamento[row["id"]] = {
                        "hora_temprano": dtime(8, 10),
                        "hora_tarde": dtime(14, 30)
                    }

            # Caché de dep_id por persona (para mapear rápido en stream)
            cursor.execute("""
                SELECT nombre_completo, departamentos_id
                FROM personas
                WHERE usuario_id = %s
            """, (user_id,))
            rows_personas = cursor.fetchall()
            print(f"[DEBUG] Encontradas {len(rows_personas)} personas")
            for row in rows_personas:
                if row["departamentos_id"] is not None:
                    self.dep_por_persona[row["nombre_completo"]] = row["departamentos_id"]
                    print(f"[DEBUG] Dep cargado para {row['nombre_completo']}: {row['departamentos_id']}")
                else:
                    print(f"[DEBUG] Persona {row['nombre_completo']} sin dep, usará defaults")

        except mysql.connector.Error as e:
            print(f"[ERROR] Fallo en conexión o query para cachés: {e}")
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()
            print("[DEBUG] Carga de cachés completada")

        # ---- cámara compartida -----------
        self.cam = VideoManager.get(cam_id)

        # ---- worker per user -----------
        if self.user_id not in self._workers:
            self._workers[self.user_id] = InferenceWorker(
                self.face_app, self.face_mesh, self.index, self.nombres, self.emotion_model
            )
        self.worker = self._workers[self.user_id]
        self._fps_hist = []
        self.ultimo_reconocido = defaultdict(lambda: 0)
        self.directorio_capturas = Path("capturas" if modo == "asistencia" else "capturas_salidas") / f"usuario_{user_id}"
        self.directorio_capturas.mkdir(parents=True, exist_ok=True)
        self._last_faces = []
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
            faces = await self.worker.submit(proc_frame)
            # ➜ 2) inferencia en thread-pool **sobre proc_frame**
            final_faces = []               # lo que mandaremos al frontend
            for face in faces:
                r = face.pop("r")  # objeto InsightFace
                name = face["nombre"].strip().lower()  # Normaliza ANTES de get()
                emocion = face["emocion"]
                x1, y1, x2, y2 = face["bbox"]

                if name != "Desconocido":
                    await self._actualizar_estado_persona(name, emocion, str(self.cam_id))

                color = (0, 255, 100) if name != "desconocido" else (255, 80, 80)
                color_sec = (20, 180, 20) if name != "Desconocido" else (20, 20, 180)

                # ---- validación + registro + guardado (solo para conocidos en modos apropiados) ----
                if es_rostro_valido(r, proc_frame):
                    ahora = datetime.now()
                    fecha_str = ahora.strftime("%Y-%m-%d")
                    hora_str = ahora.strftime("%H:%M:%S")
                    estado = "Falto"  # Default, solo se usa en asistencia

                    if name != "Desconocido" and self.modo == "asistencia":
                        # Calcular estado para conocidos en asistencia
                        dep_id = self.dep_por_persona.get(name)
                        if dep_id is not None and dep_id in self.horas_por_departamento:
                            horas_dep = self.horas_por_departamento[dep_id]
                            hora_temprano = horas_dep["hora_temprano"]
                            hora_tarde = horas_dep["hora_tarde"]
                            ahora_time = ahora.time()
                            if ahora_time <= hora_temprano:
                                estado = "Temprano"
                            elif ahora_time <= hora_tarde:
                                estado = "Tarde"
                            else:
                                estado = "Falto"
                        else:
                            # Fallback
                            estado = ("Temprano" if ahora.time() <= dtime(8,10) else "Tarde" if ahora.time() <= dtime(14,30) else "Falto")

                        # Registrar solo si no ya registrado hoy
                        if name not in self._registrados_hoy[self.user_id]:
                            self._registrados_hoy[self.user_id].add(name)
                            # Guardar recorte
                            folder = self.directorio_capturas / self._sanitize_filename(name)
                            folder.mkdir(parents=True, exist_ok=True)
                            fname = f"{self._sanitize_filename(name)}_{fecha_str}_{hora_str.replace(':','-')}.jpg"
                            path = folder / fname
                            cv2.imwrite(str(path), proc_frame[y1:y2, x1:x2])
                            # Registrar en BD
                            self._registrar_asistencia(
                                persona_nombre=name,
                                estado=estado,
                                tipo="Conocido",
                                path_foto=str(path).replace("\\", "/"),
                                fecha=fecha_str,
                                hora=hora_str
                            )

                    elif name != "Desconocido" and self.modo == "salida":
                        # Para salidas: registrar cada detección (sin chequeo de "ya registrado")
                        # Guardar recorte
                        folder = self.directorio_capturas / self._sanitize_filename(name)
                        folder.mkdir(parents=True, exist_ok=True)
                        fname = f"{self._sanitize_filename(name)}_{fecha_str}_{hora_str.replace(':','-')}.jpg"
                        path = folder / fname
                        cv2.imwrite(str(path), proc_frame[y1:y2, x1:x2])
                        # Registrar en BD
                        self._registrar_salida(
                            persona_nombre=name,
                            path_foto=str(path).replace("\\", "/"),
                            fecha=fecha_str,
                            hora=hora_str
                        )

                # ---- dibujos siempre ----
                dibujar_esquinas(proc_frame, x1, y1, x2, y2, color)
                dibujar_landmarks(proc_frame, (x1,y1,x2,y2), self.face_mesh)

                # ---- info para frontend ----
                face["foto_path"] = self.fotos.get(name) if name != "desconocido" else None
                face["registrado"] = name != "Desconocido" and name in self._registrados_hoy[self.user_id]
                final_faces.append(face)
                
            # Calcula summary
            summary = {
                "emociones_conteo": {},
                "dominante_por_camara": "",
                "tendencia": "",
                "personalizados": {},  # e.g., "Juan": "Happy"
                "visitantes": {},  # Conteo emociones desconocidos
                "personas_por_area": {},  # Nueva: conteo personas conocidas por cámara
                "visitantes_por_area": {}  # Nueva: conteo visitantes por cámara
            }

            # Conteo current emociones
            for face in final_faces:
                emocion = face["emocion"]               
                name = face["nombre"].lower()  # Normaliza name para get()
                print(f"[DEBUG] Buscando foto para name normalizado '{name}': {self.fotos.get(name)}")
                summary["emociones_conteo"][emocion] = summary["emociones_conteo"].get(emocion, 0) + 1
                if name == "Desconocido":
                    summary["visitantes"][emocion] = summary["visitantes"].get(emocion, 0) + 1
                else:
                    summary["personalizados"][name] = emocion  # Última emoción

            # Dominante por cámara
            if summary["emociones_conteo"]:
                dominante = max(summary["emociones_conteo"], key=summary["emociones_conteo"].get)
                count = summary["emociones_conteo"][dominante]
                summary["dominante_por_camara"] = f"{dominante} ({count} personas)"

            # Tendencias (últimos 5 frames)
            self._last_faces.append(final_faces)
            self._last_faces = self._last_faces[-5:]
            all_emoc = [f["emocion"] for faces in self._last_faces for f in faces if f["nombre"] != "Desconocido"]
            if all_emoc:
                dominante_tend = max(set(all_emoc), key=all_emoc.count)
                percent = (all_emoc.count(dominante_tend) / len(all_emoc)) * 100
                summary["tendencia"] = f"{dominante_tend} ({percent:.0f}%)"

            # Nuevos campos para localización (por esta cámara)
            cam_key = f"camara_{self.cam_id}"
            summary["personas_por_area"][cam_key] = len([f for f in final_faces if f["nombre"] != "Desconocido"])
            summary["visitantes_por_area"][cam_key] = len([f for f in final_faces if f["nombre"] == "Desconocido"])

            # ➜ 3) codificamos **proc_frame** (ya tiene rectángulos)
            _, buf = cv2.imencode(".jpg", proc_frame, self._JPEG_PARAMS)
            b64 = base64.b64encode(buf).decode()

            await ws.send_json({                       # 2️⃣
                "type": "frame",
                "frame": b64,
                "faces": final_faces,
                "fps"      : self._fps(frame_cnt, t0),
                "timestamp": time.time(),
                "camara_id": self.cam_id,
                "summary": summary  # Incluye los nuevos campos
            })
            frame_cnt += 1
            await asyncio.sleep(0)   
        
    # ──────────────────────────────
    async def close(self):
        VideoManager.release(self.cam_id)  # Libera cámara
        if self.user_id in self._workers:
            # Opcional: si quieres limpiar worker, pero solo si no hay otras sesiones
            del self._workers[self.user_id]
        self._models.pop(self.user_id, None)
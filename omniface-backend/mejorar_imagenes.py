# ✅ omniface-backend/mejorar_imagenes.py
import cv2
import onnxruntime
import numpy as np
import os
import sys
import json

CARPETA_ENTRADA = "imagenes_originales"
CARPETA_SALIDA = "imagenes_optimizadas"
MODEL_PATH = "modelos/gpen/GPEN-BFR-512.onnx"
INPUT_SIZE = 512

# Asegurar carpeta de salida
os.makedirs(CARPETA_SALIDA, exist_ok=True)

# Mensajes solo al log (stderr)
print("[INFO] Cargando modelo GPEN...", file=sys.stderr)
session = onnxruntime.InferenceSession(MODEL_PATH, providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

# Leer lista de imágenes desde stdin
try:
    imagenes = json.loads(sys.stdin.read())
except Exception as e:
    print(f"[ERROR] No se pudo leer input JSON: {e}", file=sys.stderr)
    print(json.dumps({"procesadas": []}))
    sys.exit(1)

print(f"[INFO] Recibidas {len(imagenes)} imágenes para mejorar.", file=sys.stderr)

procesadas = []

for nombre in imagenes:
    ruta = os.path.join(CARPETA_ENTRADA, nombre)
    salida = os.path.join(CARPETA_SALIDA, nombre)
    os.makedirs(os.path.dirname(salida), exist_ok=True)  # ✅ CREAR SUBCARPETA

    img = cv2.imread(ruta)
    if img is None:
        print(f"[ERROR] No se pudo leer: {nombre}", file=sys.stderr)
        continue

    try:
        img = cv2.resize(img, (INPUT_SIZE, INPUT_SIZE))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = img.astype(np.float32) / 127.5 - 1.0
        img = np.transpose(img, (2, 0, 1))[np.newaxis, :]

        output = session.run([output_name], {input_name: img})[0]
        output = np.squeeze(output).transpose(1, 2, 0)
        output = (output + 1.0) * 127.5
        output = np.clip(output, 0, 255).astype(np.uint8)
        output = cv2.cvtColor(output, cv2.COLOR_RGB2BGR)

        cv2.imwrite(salida, output)
        procesadas.append(nombre)

    except Exception as e:
        print(f"[ERROR] Fallo al procesar {nombre}: {e}", file=sys.stderr)

# ✅ Imprimir solo el resultado final en JSON para FastAPI (a stdout)
print(json.dumps({"procesadas": procesadas}))

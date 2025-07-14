import mediapipe as mp
mp_pose = mp.solutions.pose
try:
    pose = mp_pose.Pose(static_image_mode=False, model_complexity=1)
    print("MediaPipe Pose cargado correctamente")
except Exception as e:
    print(f"Error al cargar MediaPipe Pose: {str(e)}")
extends RefCounted
class_name LookMath

## Positive pitch looks up (Godot camera -Z rises when rotation.x increases).
## Mouse up is a negative relative.y. Non-inverted: that increases pitch.

static func apply_mouse(yaw: float, pitch: float, rel_x: float, rel_y: float, sens: float, invert_y: bool) -> Vector2:
	yaw -= rel_x * sens
	if invert_y:
		pitch += rel_y * sens
	else:
		pitch -= rel_y * sens
	pitch = clampf(pitch, -1.05, 0.85)
	return Vector2(yaw, pitch)

static func wish_dir(yaw: float, wish_x: float, wish_y: float) -> Vector3:
	var forward := Vector3(-sin(yaw), 0.0, -cos(yaw))
	var right := Vector3(cos(yaw), 0.0, -sin(yaw))
	var dir := right * wish_x + forward * wish_y
	if dir.length() > 1.0:
		dir = dir.normalized()
	return dir

static func face_yaw(dir: Vector3) -> float:
	return atan2(-dir.x, -dir.z)

extends RefCounted
class_name LookMath

## Positive pitch looks up (Godot camera -Z rises when rotation.x increases).
## Mouse up is a negative relative.y. Non-inverted: that increases pitch.

const PITCH_MIN := -1.0471975512
const PITCH_MAX := 0.78539816339
const REST_PITCH := -0.12
const RETURN_RATE := 7.5

static func apply_mouse(yaw: float, pitch: float, rel_x: float, rel_y: float, sens: float, invert_y: bool) -> Vector2:
	yaw -= rel_x * sens
	if invert_y:
		pitch += rel_y * sens
	else:
		pitch -= rel_y * sens
	pitch = clampf(pitch, PITCH_MIN, PITCH_MAX)
	return Vector2(yaw, pitch)

static func follow_orbit(cam_yaw: float, cam_pitch: float, body_yaw: float, delta: float, free_look: bool) -> Vector2:
	if free_look:
		return Vector2(cam_yaw, clampf(cam_pitch, PITCH_MIN, PITCH_MAX))
	var blend := 1.0 - exp(-RETURN_RATE * delta)
	return Vector2(lerp_angle(cam_yaw, body_yaw, blend), lerpf(cam_pitch, REST_PITCH, blend))

static func wish_dir(yaw: float, wish_x: float, wish_y: float) -> Vector3:
	var forward := Vector3(-sin(yaw), 0.0, -cos(yaw))
	var right := Vector3(cos(yaw), 0.0, -sin(yaw))
	var dir := right * wish_x + forward * wish_y
	if dir.length() > 1.0:
		dir = dir.normalized()
	return dir

static func face_yaw(dir: Vector3) -> float:
	return atan2(-dir.x, -dir.z)

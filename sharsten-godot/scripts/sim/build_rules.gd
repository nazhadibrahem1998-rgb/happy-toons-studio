extends RefCounted
class_name BuildRules

static func snap(pos: Vector3, grid: float) -> Vector3:
	return Vector3(snappedf(pos.x, grid), 0.0, snappedf(pos.z, grid))

static func blocked(placed: Array, pos: Vector3, min_dist: float) -> bool:
	for p in placed:
		var d := Vector2(float(p.get("x", 0.0)) - pos.x, float(p.get("z", 0.0)) - pos.z).length()
		if d < min_dist:
			return true
	return false

static func yaw_step(yaw: float, steps: int) -> float:
	var n := maxi(steps, 1)
	var slice := TAU / float(n)
	return snappedf(yaw, slice)

extends RefCounted
class_name AnimalFlocks

## Herd positions for sheep, goats, chickens, dogs, cats, birds, donkeys, and horses.
## The bodies are original low-poly silhouettes instanced with MultiMesh. The
## Quaternius animal pack was not reachable from this build machine.

const SPECIES := [
	{"id": "sheep", "color": "f4f1ea", "scale": Vector3(0.55, 0.4, 0.8), "speed": 0.35},
	{"id": "goat", "color": "d8d0c4", "scale": Vector3(0.45, 0.42, 0.7), "speed": 0.42},
	{"id": "chicken", "color": "e8d48a", "scale": Vector3(0.22, 0.28, 0.32), "speed": 0.55},
	{"id": "dog", "color": "8a623c", "scale": Vector3(0.28, 0.36, 0.7), "speed": 0.9},
	{"id": "cat", "color": "c47a3a", "scale": Vector3(0.2, 0.22, 0.46), "speed": 0.7},
	{"id": "bird", "color": "2a2420", "scale": Vector3(0.16, 0.12, 0.28), "speed": 1.4},
	{"id": "donkey", "color": "8d8a86", "scale": Vector3(0.45, 0.7, 1.05), "speed": 0.5},
	{"id": "horse", "color": "6b4226", "scale": Vector3(0.5, 0.85, 1.35), "speed": 0.85},
	{"id": "cart", "color": "6b4226", "scale": Vector3(1.1, 0.7, 1.8), "speed": 0.55},
	{"id": "cow", "color": "c4a574", "scale": Vector3(0.7, 0.8, 1.3), "speed": 0.28},
]

var pos: PackedVector2Array = PackedVector2Array()
var heading: PackedFloat32Array = PackedFloat32Array()
var home: PackedVector2Array = PackedVector2Array()
var species: PackedInt32Array = PackedInt32Array()
var phase: PackedFloat32Array = PackedFloat32Array()

func setup(count: int, seed_value: int) -> void:
	pos = PackedVector2Array()
	heading = PackedFloat32Array()
	home = PackedVector2Array()
	species = PackedInt32Array()
	phase = PackedFloat32Array()
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var yards := [
		Vector2(36, 28), Vector2(70, 24), Vector2(24, 78), Vector2(96, 60),
		Vector2(52, 110), Vector2(18, 120), Vector2(110, 36), Vector2(84, 140), Vector2(48, 18),
	]
	for i in count:
		var sp := i % SPECIES.size()
		var yard: Vector2 = yards[sp % yards.size()]
		species.append(sp)
		home.append(yard)
		pos.append(yard + Vector2(rng.randf_range(-3.5, 3.5), rng.randf_range(-3.5, 3.5)))
		heading.append(rng.randf() * TAU)
		phase.append(rng.randf() * TAU)

func tick(delta: float, blocks: Array) -> void:
	for i in pos.size():
		var sp: int = species[i]
		var speed: float = float(SPECIES[sp]["speed"])
		var goal: Vector2 = home[i]
		var bird := str(SPECIES[sp]["id"]) == "bird"
		if bird:
			phase[i] = phase[i] + delta * 0.8
			var fly := home[i] + Vector2(cos(phase[i]) * 6.0, sin(phase[i] * 0.7) * 4.0)
			pos[i] = pos[i].lerp(fly, 1.0 - exp(-delta * 0.8))
			continue
		var to := goal - pos[i]
		if to.length() > 4.2:
			heading[i] = lerp_angle(heading[i], to.angle(), 0.15)
		else:
			heading[i] = heading[i] + sin(phase[i]) * delta * 0.4
			phase[i] = phase[i] + delta
		var step := Vector2(cos(heading[i]), sin(heading[i])) * speed * delta
		var nxt: Vector2 = pos[i] + step
		if _blocked(nxt, blocks):
			heading[i] += 1.4
		else:
			pos[i] = nxt

func blocked_count(blocks: Array) -> int:
	var n := 0
	for p in pos:
		if _blocked(p, blocks):
			n += 1
	return n

func max_lift() -> float:
	return 0.0

static func _blocked(p: Vector2, blocks: Array) -> bool:
	for box in blocks:
		var mn: Vector2 = box[0]
		var mx: Vector2 = box[1]
		if p.x > mn.x and p.x < mx.x and p.y > mn.y and p.y < mx.y:
			return true
	return false

extends Node3D

## A wooden door on a hinge. It swings outward in about 0.4 s and
## drops its collider while it moves so nobody is pinned in the frame.

var open := false
var opened_by := ""
var panel: AnimatableBody3D
var _from := 0.0
var _to := 0.0
var _tween := 1.0
var light: OmniLight3D

func build() -> void:
	add_to_group("house_door")
	add_to_group("interact")
	set_meta("kind", "door")
	set_meta("verb", "Open door")
	panel = AnimatableBody3D.new()
	panel.collision_layer = 1
	panel.sync_to_physics = false
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(0.92, 2.1, 0.08)
	shape.shape = box
	shape.position = Vector3(0.46, 1.05, 0)
	panel.add_child(shape)
	var mi := MeshInstance3D.new()
	mi.name = "DoorLeaf"
	mi.mesh = MeshLib.box(0.92, 2.1, 0.08)
	mi.position = Vector3(0.46, 1.05, 0)
	var wood := StandardMaterial3D.new()
	wood.albedo_color = Color("6a4228")
	wood.albedo_texture = MeshLib.tex("wood")
	wood.roughness = 0.88
	mi.material_override = wood
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	panel.add_child(mi)
	add_child(panel)
	var audio := AudioStreamPlayer3D.new()
	audio.name = "Creak"
	var creak: AudioStream = load("res://assets/audio/cc0/creak.ogg")
	audio.stream = creak
	audio.volume_db = -16.0
	audio.bus = "SFX"
	audio.max_distance = 12.0
	add_child(audio)

func _exit_tree() -> void:
	var audio := get_node_or_null("Creak")
	if audio is AudioStreamPlayer3D:
		audio.stop()
		audio.stream = null

func use(_who = null) -> void:
	set_open(not open, "player")

func set_open(on: bool, who: String = "") -> void:
	if panel == null:
		return
	if on == open and _tween >= 1.0:
		return
	open = on
	opened_by = who
	_from = panel.rotation.y
	_to = deg_to_rad(95.0) if on else 0.0
	_tween = 0.0
	set_meta("verb", "Close door" if on else "Open door")
	panel.collision_layer = 0
	var audio := get_node_or_null("Creak")
	if audio and is_inside_tree() and not GameState.headless():
		audio.play()

func angle_deg() -> float:
	if panel == null:
		return 0.0
	return rad_to_deg(panel.rotation.y)

func advance(delta: float) -> void:
	if panel == null or _tween >= 1.0:
		_settle()
		return
	_tween = minf(1.0, _tween + delta / 0.4)
	var k := _tween * _tween * (3.0 - 2.0 * _tween)
	panel.rotation.y = lerpf(_from, _to, k)
	if _tween >= 1.0:
		_settle()

func _settle() -> void:
	if panel == null:
		return
	if open:
		panel.collision_layer = 1
	else:
		panel.collision_layer = 0 if _body_in_door() else 1

func _body_in_door() -> bool:
	if panel == null or not is_inside_tree():
		return false
	var center := panel.to_global(Vector3(0.46, 1.0, 0.0))
	for group in ["player", "villager"]:
		for n in get_tree().get_nodes_in_group(group):
			if n is Node3D and center.distance_to((n as Node3D).global_position) < 0.75:
				return true
	return false

func _process(delta: float) -> void:
	advance(delta)
	if light == null:
		return
	var near := false
	var player := get_tree().get_first_node_in_group("player")
	if player is Node3D:
		near = global_position.distance_to((player as Node3D).global_position) < 7.0
	light.light_energy = 0.65 if open or near else 0.0

func _creak() -> AudioStreamWAV:
	# A short original creak at the same rate as the rest of the mix.
	var rate := 44100
	var count := int(rate * 0.35)
	var data := PackedByteArray()
	data.resize(count * 2)
	for i in count:
		var t := float(i) / float(rate)
		var env := sin(PI * clampf(t / 0.35, 0.0, 1.0))
		var tone := sin(t * 140.0 * TAU) * 0.45 + sin(t * 63.0 * TAU) * 0.25
		var v := int(clampf(tone * env * 0.35, -1.0, 1.0) * 32000.0)
		if v < 0:
			v += 65536
		data[i * 2] = v & 255
		data[i * 2 + 1] = (v >> 8) & 255
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = rate
	wav.stereo = false
	wav.data = data
	return wav

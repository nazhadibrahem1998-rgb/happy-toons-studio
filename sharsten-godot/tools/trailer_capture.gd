extends Node

## Cinematic capture for a 4K trailer. No gameplay HUD.
## Re-run on a real GPU with the command in TRAILER.md.

const Pieces = preload("res://scripts/world/pieces.gd")

const SHOTS := {
	"establish": 8.0,
	"routines": 8.0,
	"craft": 8.0,
	"diary": 7.0,
	"spring": 8.0,
	"wake": 8.0,
	"ruins": 9.0,
}

var shot := "establish"
var duration := 8.0
var elapsed := 0.0
var cam: Camera3D
var world: Node
var overlay: ColorRect
var armed := false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	DisplayServer.window_set_size(Vector2i(3840, 2160))
	get_tree().root.size = Vector2i(3840, 2160)
	shot = _shot_name()
	duration = float(SHOTS.get(shot, 8.0))
	GameState.save_path_override = "/tmp/sharsten-trailer.json"
	GameState.start_new()
	GameState.data["cinematic"] = true
	world = load("res://scripts/world/village_world.gd").new()
	add_child(world)
	cam = Camera3D.new()
	cam.fov = 32.0
	cam.near = 0.15
	cam.far = 500.0
	cam.current = true
	add_child(cam)
	overlay = ColorRect.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.color = Color(1, 1, 1, 0)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var layer := CanvasLayer.new()
	layer.layer = 50
	layer.add_child(overlay)
	add_child(layer)

func _shot_name() -> String:
	var env := OS.get_environment("TRAILER_SHOT")
	if env != "":
		return env
	for arg in OS.get_cmdline_user_args():
		if str(arg).begins_with("--trailer-shot="):
			return str(arg).trim_prefix("--trailer-shot=")
		if str(arg) == "--trailer=1":
			return "establish"
	return "establish"

func _process(delta: float) -> void:
	if not armed:
		_arm()
		armed = true
	elapsed += delta
	var t := clampf(elapsed / duration, 0.0, 1.0)
	_frame(t)
	if elapsed >= duration:
		print("TRAILER_DONE ", shot, " ", duration)
		get_tree().quit(0)

func _arm() -> void:
	var ui := get_tree().get_first_node_in_group("ui")
	if ui:
		ui.visible = shot == "diary"
	var player := get_tree().get_first_node_in_group("player")
	if player:
		player.camera_locked = true
		player.camera.current = false
		player.visible = shot == "craft"
		if shot == "craft":
			player.global_position = Vector3(52.2, 0.2, 84.6)
			player.yaw = 0.4
			player.force_action = "carve"
	for v in get_tree().get_nodes_in_group("villager"):
		if v.get("label"):
			v.label.visible = false
	if shot == "routines":
		GameState.data["play_time"] = 160.0
	if shot == "diary":
		get_tree().call_group("ui", "open_diary", "quests")
		if ui:
			ui.visible = true
	if shot == "ruins" or shot == "wake":
		pass
	_golden(shot == "establish")

func _golden(on: bool) -> void:
	var sun = world.get("sun") if world else null
	if sun == null:
		return
	if on:
		sun.rotation_degrees = Vector3(-16, 48, 0)
		sun.light_color = Color(1.0, 0.72, 0.42)
		sun.light_energy = 1.55
	else:
		sun.rotation_degrees = Vector3(-42, 32, 0)
		sun.light_color = Color(1.0, 0.9, 0.74)
		sun.light_energy = 1.2

func _frame(t: float) -> void:
	var smooth := t * t * (3.0 - 2.0 * t)
	match shot:
		"establish":
			var from := Vector3(96, 16, 128).lerp(Vector3(52, 6.5, 86), smooth)
			_aim(from, Vector3(43, 3.2, 72))
		"routines":
			var pivot := Vector3(54, 1.5, 84).lerp(Vector3(43, 1.6, 70), smooth)
			var ang := t * TAU * 0.35
			_aim(pivot + Vector3(sin(ang) * 7.5, 1.8, cos(ang) * 7.5), pivot + Vector3(0, 0.4, 0))
		"craft":
			var from2 := Vector3(48.5, 1.7, 80.5).lerp(Vector3(50.2, 1.45, 83.2), smooth)
			_aim(from2, Vector3(53.2, 1.1, 86.2))
			_raise_fence(smooth)
		"diary":
			_aim(Vector3(48, 3.2, 78), Vector3(43, 2.0, 72))
		"spring":
			var altar := Vector3(67.2, 0.9, -4.8)
			var ang2 := -0.4 + t * 1.1
			_aim(altar + Vector3(sin(ang2) * 5.2, 1.55, cos(ang2) * 5.2), altar)
		"wake":
			_aim(Vector3(70, 4.2, 18).lerp(Vector3(78, 6.0, 30), smooth), Vector3(67, 1.2, 8))
			if t < 0.45:
				overlay.color = Color(1, 1, 1, smoothstep(0.15, 0.42, t))
			else:
				if world and world.get("dream") and world.has_method("apply_wake"):
					world.apply_wake()
				overlay.color = Color(1, 1, 1, 1.0 - smoothstep(0.5, 0.78, t))
		"ruins":
			if world and world.get("dream") and world.has_method("apply_wake"):
				world.apply_wake()
			var from3 := Vector3(40, 3.2, 30).lerp(Vector3(88, 5.5, 62), smooth)
			_aim(from3, Vector3(96, 2.6, 48).lerp(Vector3(52, 0.8, 108), smooth))

func _aim(from: Vector3, at: Vector3) -> void:
	cam.look_at_from_position(from, at, Vector3.UP)

func _raise_fence(t: float) -> void:
	var fence = get_node_or_null("TrailerFence")
	if fence == null and t > 0.35:
		fence = Pieces.make("fence")
		fence.name = "TrailerFence"
		fence.position = Vector3(54.5, 0.0, 83.0)
		add_child(fence)
	if fence:
		fence.scale = Vector3(1, clampf((t - 0.35) / 0.4, 0.05, 1.0), 1)

func smoothstep(a: float, b: float, x: float) -> float:
	var k := clampf((x - a) / maxf(b - a, 0.0001), 0.0, 1.0)
	return k * k * (3.0 - 2.0 * k)

extends Node

const PRESETS := ["low", "medium", "high", "ultra"]
var index := 0
var samples: Array = []
var started_ms := 0
var world: Node
var reported: Array = []
var warmup := 0

func _ready() -> void:
	Settings.vsync = false
	Settings.fps_cap = 0
	Settings.scale = 1.0
	Settings.fsr_mode = "off"
	Settings.apply_runtime()
	get_window().size = Vector2i(1920, 1080)
	GameState.ignore_station = true
	GameState.save_path_override = "/tmp/sharsten-bench.json"
	GameState.start_new()
	world = load("res://scripts/world/village_world.gd").new()
	add_child(world)
	_begin_preset()

func _begin_preset() -> void:
	Settings.set_preset(PRESETS[index])
	if world and world.has_method("apply_graphics"):
		world.apply_graphics()
	samples = []
	warmup = 0
	started_ms = Time.get_ticks_msec()

func _process(delta: float) -> void:
	var player = get_tree().get_first_node_in_group("player")
	if player == null:
		return
	warmup += 1
	if warmup < 8:
		return
	player.bot_override = true
	var t := Time.get_ticks_msec() / 1000.0
	player.bot_wish = Vector2(sin(t * 0.7), 1.0).normalized()
	player.bot_sprint = false
	samples.append(delta)
	if Time.get_ticks_msec() - started_ms < 8000:
		return
	var row := _stats(PRESETS[index])
	reported.append(row)
	print("BENCH_ROW ", JSON.stringify(row))
	index += 1
	if index >= PRESETS.size():
		print("BENCH_JSON ", JSON.stringify(reported))
		get_tree().quit(0)
		return
	_begin_preset()

func _stats(preset: String) -> Dictionary:
	var times: Array = samples.duplicate()
	times.sort()
	var sum := 0.0
	for v in times:
		sum += float(v)
	var avg := sum / maxf(times.size(), 1)
	var worst_n := maxi(1, int(ceil(times.size() * 0.01)))
	var worst := 0.0
	for i in range(times.size() - worst_n, times.size()):
		worst += float(times[i])
	worst /= worst_n
	return {
		"preset": preset,
		"frames": times.size(),
		"seconds": sum,
		"avg_fps": 1.0 / avg if avg > 0.0 else 0.0,
		"one_percent_low_fps": 1.0 / worst if worst > 0.0 else 0.0,
		"adapter": RenderingServer.get_video_adapter_name(),
		"renderer": RenderingServer.get_current_rendering_method(),
	}

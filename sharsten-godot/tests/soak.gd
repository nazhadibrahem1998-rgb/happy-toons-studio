extends Node

var samples: Array = []
var mem: Array = []
var started := 0
var world: Node
var warmed := false

func _ready() -> void:
	Settings.set_preset("low")
	Settings.vsync = false
	Settings.fps_cap = 0
	Settings.apply_runtime()
	GameState.ignore_station = true
	GameState.save_path_override = "/tmp/sharsten-soak.json"
	GameState.start_new()
	world = load("res://scripts/world/village_world.gd").new()
	add_child(world)
	started = Time.get_ticks_msec()

func _process(delta: float) -> void:
	var player = get_tree().get_first_node_in_group("player")
	if player == null:
		return
	if not warmed:
		var warm_ms := 20000
		if int(OS.get_environment("SOAK_SECONDS")) > 0 and int(OS.get_environment("SOAK_SECONDS")) < 300:
			warm_ms = 5000
		if Time.get_ticks_msec() - started < warm_ms:
			player.bot_override = true
			player.bot_wish = Vector2(0, 1)
			return
		warmed = true
		started = Time.get_ticks_msec()
		samples = []
		mem = [int(Performance.get_monitor(Performance.MEMORY_STATIC))]
	player.bot_override = true
	var t := Time.get_ticks_msec() / 1000.0
	var leg := int(t / 12.0) % 4
	player.bot_wish = [Vector2(0, 1), Vector2(1, 0.2), Vector2(0, -1), Vector2(-1, 0.3)][leg]
	player.bot_sprint = false
	if int(t) % 40 == 0 and delta < 0.05:
		GameState.gather("wood", 1)
		GameState.save_now()
	samples.append(delta)
	if samples.size() % 600 == 0:
		mem.append(int(Performance.get_monitor(Performance.MEMORY_STATIC)))
	var elapsed := Time.get_ticks_msec() - started
	var limit_ms := int(OS.get_environment("SOAK_SECONDS")) * 1000
	if limit_ms <= 0:
		limit_ms = 900000
	if elapsed < limit_ms:
		return
	mem.append(int(Performance.get_monitor(Performance.MEMORY_STATIC)))
	var sum := 0.0
	for v in samples:
		sum += float(v)
	var avg := sum / maxf(samples.size(), 1)
	var times: Array = samples.duplicate()
	times.sort()
	var worst_n := maxi(1, int(ceil(times.size() * 0.01)))
	var worst := 0.0
	for i in range(times.size() - worst_n, times.size()):
		worst += float(times[i])
	worst /= worst_n
	var growth := int(mem[mem.size() - 1]) - int(mem[0])
	var y: float = float(player.global_position.y)
	var ok: bool = y > -0.5 and growth < 64 * 1024 * 1024
	print("SOAK_JSON ", JSON.stringify({
		"preset": "low",
		"seconds": elapsed / 1000.0,
		"frames": samples.size(),
		"avg_fps": 1.0 / avg if avg > 0 else 0,
		"one_percent_low_fps": 1.0 / worst if worst > 0 else 0,
		"memory_start": mem[0],
		"memory_end": mem[mem.size() - 1],
		"memory_growth_bytes": growth,
		"player_y": y,
		"adapter": RenderingServer.get_video_adapter_name(),
		"ok": ok,
	}))
	get_tree().quit(0 if ok else 1)

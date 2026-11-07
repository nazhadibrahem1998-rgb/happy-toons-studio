extends Node

## Measures frame time on Low, then Medium. Startup frames are ignored.

var phase := "low"
var left := 0
var samples: Array = []
var world: Node

func _ready() -> void:
	Settings.preset = "low"
	Settings.vsync = false
	Settings.scale = 1.0
	Settings.fsr_mode = "off"
	Settings.apply_runtime()
	GameState.ignore_station = true
	GameState.save_path_override = "/tmp/sharsten-frame.json"
	GameState.start_new()
	world = load("res://scripts/world/village_world.gd").new()
	add_child(world)
	left = 20

func _process(delta: float) -> void:
	if left > 0:
		left -= 1
		return
	samples.append(delta)
	if samples.size() < 40:
		return
	_report(phase)
	if phase == "low":
		phase = "medium"
		samples.clear()
		Settings.preset = "medium"
		Settings.apply_runtime()
		if world.has_method("apply_graphics"):
			world.apply_graphics()
		left = 10
		return
	get_tree().quit(0)

func _report(name: String) -> void:
	var sum := 0.0
	var worst := 0.0
	for v in samples:
		sum += float(v)
		worst = maxf(worst, float(v))
	var avg := sum / float(samples.size())
	print("FRAME %s avg_ms=%.2f max_ms=%.2f frames=%d" % [name, avg * 1000.0, worst * 1000.0, samples.size()])

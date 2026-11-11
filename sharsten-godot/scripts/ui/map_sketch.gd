extends Control

func _ready() -> void:
	custom_minimum_size = Vector2(520, 420)
	var map = load("res://scripts/ui/valley_map.gd").new()
	map.mode = "diary"
	map.set_anchors_preset(Control.PRESET_FULL_RECT)
	map.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(map)

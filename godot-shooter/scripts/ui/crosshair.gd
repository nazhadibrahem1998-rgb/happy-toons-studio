extends Control

var ads: float = 0.0
var hot: bool = false
var hit: float = 0.0


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	var center := size * 0.5
	var gap := lerpf(7.0, 3.0, ads)
	var length := lerpf(8.0, 13.0, ads)
	var color := Color(0.93, 0.90, 0.84, 0.88)
	if hot:
		color = Color(0.92, 0.62, 0.42, 0.95)
	if hit > 0.0:
		color = color.lerp(Color(1.0, 0.95, 0.85), hit)
	draw_line(center + Vector2(gap, 0), center + Vector2(gap + length, 0), color, 1.6, true)
	draw_line(center + Vector2(-gap, 0), center + Vector2(-gap - length, 0), color, 1.6, true)
	draw_line(center + Vector2(0, gap), center + Vector2(0, gap + length), color, 1.6, true)
	draw_line(center + Vector2(0, -gap), center + Vector2(0, -gap - length), color, 1.6, true)
	draw_circle(center, 1.2, Color(color.r, color.g, color.b, 0.8))

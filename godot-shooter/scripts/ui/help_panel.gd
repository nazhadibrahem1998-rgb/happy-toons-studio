extends Control

signal closed


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new()
	dim.color = Color(0.04, 0.03, 0.025, 0.72)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.offset_left = -320
	panel.offset_top = -310
	panel.offset_right = 340
	panel.offset_bottom = 310
	add_child(panel)
	SoraniTheme.apply(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	panel.add_child(box)
	var title := Label.new()
	title.text = GameConfig.STR["controls"]
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_override("font", SoraniTheme.bold())
	title.add_theme_font_size_override("font_size", 32)
	box.add_child(title)
	var lines := [
		["جوڵە", "W A S D"],
		["سەیرکردن", "ماوس / ڕاکێشان"],
		["هێرشی سووک", "کلیکی چەپ"],
		["هێرشی قورس", "F"],
		["گرتن", "کلیکی ڕاست"],
		["خۆلادان", "Q"],
		["قوفڵی نەرم", "V"],
		["بازدان", "Space"],
		["وەستان", "Esc"],
	]
	for row in lines:
		var label := Label.new()
		label.text = "%s    %s" % [row[0], row[1]]
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.text_direction = Control.TEXT_DIRECTION_RTL
		box.add_child(label)
	var back := Button.new()
	back.text = GameConfig.STR["back"]
	back.custom_minimum_size = Vector2(0, 48)
	back.pressed.connect(func() -> void:
		hide()
		closed.emit()
	)
	box.add_child(back)

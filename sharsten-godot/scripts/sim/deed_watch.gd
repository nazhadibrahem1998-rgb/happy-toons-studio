extends RefCounted

## How long the current deed stays on screen, then how it fades.
const HOLD := 8.0
const FADE := 1.15

var text := ""
var age := 0.0
var alpha := 0.0

func push(line: String) -> void:
	if line == text:
		return
	text = line
	age = 0.0
	alpha = 1.0 if line != "" else 0.0

func reveal() -> void:
	if text == "":
		return
	age = 0.0
	alpha = 1.0

func tick(delta: float) -> void:
	if text == "":
		alpha = 0.0
		return
	age += maxf(delta, 0.0)
	if age <= HOLD:
		alpha = 1.0
	else:
		alpha = clampf(1.0 - (age - HOLD) / FADE, 0.0, 1.0)

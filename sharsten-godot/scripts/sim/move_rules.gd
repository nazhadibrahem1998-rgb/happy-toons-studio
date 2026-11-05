extends RefCounted
class_name MoveRules

## Walk matches v3 (120b620): the controller did not change through v6.
## Run is new. The Sprint and Jog clips carry root motion that fights the
## foot plant, so running keeps the grounded walk cycle and scales its pace.

const WALK := 1.28
const RUN := 4.75
const RUN_ACCEL := 22.0
const TURN_RATE := 10.0
const IDLE_TURN_RATE := 4.0
const GRAVITY := 22.0
const FLOOR_STICK := -2.0
const FLOOR_SNAP := 0.3
const SAFE_MARGIN := 0.08

static func target_speed(wish_len: float, running: bool) -> float:
	if wish_len < 0.1:
		return 0.0
	return RUN if running else WALK

static func step_speed(current: float, target: float, delta: float) -> float:
	# v3 snapped walk and a full stop. Only the climb into a run eases in.
	if target <= WALK:
		return target
	return move_toward(current, target, RUN_ACCEL * delta)

static func turn_blend(delta: float, moving: bool) -> float:
	var rate := TURN_RATE if moving else IDLE_TURN_RATE
	return 1.0 - exp(-rate * delta)

static func anim_pace(ground_speed: float) -> float:
	if ground_speed <= 0.2:
		return 1.0
	return ground_speed / WALK

static func stick_y(on_floor: bool, y: float, delta: float) -> float:
	if on_floor:
		return FLOOR_STICK
	return y - GRAVITY * delta

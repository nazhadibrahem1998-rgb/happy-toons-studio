extends RefCounted
class_name MoveRules

## The walk clip was paced for 1.28 m/s. Pace is ground speed divided by that,
## so a faster walk and the run keep their feet on the ground.

const WALK := 2.2
const RUN := 5.5
const CROUCH := 1.2
const CLIP_SPEED := 1.28
const EASE := 22.0
const TURN_RATE := 10.0
const IDLE_TURN_RATE := 4.0
const GRAVITY := 22.0
const JUMP_HEIGHT := 0.5
const COYOTE := 0.12
const JUMP_BUFFER := 0.12
const MANTLE_MIN := 0.4
const MANTLE_MAX := 4.0
const DROP_MIN := 0.45
const DROP_MAX := 3.7
const GAP_MAX := 1.7
const FLOOR_STICK := -2.0
const FLOOR_SNAP := 0.3
const SAFE_MARGIN := 0.08

static func target_speed(wish_len: float, running: bool, crouched: bool = false) -> float:
	if wish_len < 0.1:
		return 0.0
	if crouched:
		return CROUCH
	return RUN if running else WALK

static func stay_crouched(key_down: bool, ceiling: bool) -> bool:
	return key_down or ceiling

static func step_speed(current: float, target: float, delta: float) -> float:
	if target <= 0.001:
		return 0.0
	return move_toward(current, target, EASE * delta)

static func turn_blend(delta: float, moving: bool) -> float:
	var rate := TURN_RATE if moving else IDLE_TURN_RATE
	return 1.0 - exp(-rate * delta)

static func anim_pace(ground_speed: float) -> float:
	if ground_speed <= 0.2:
		return 1.0
	return ground_speed / CLIP_SPEED

static func jump_velocity() -> float:
	return sqrt(2.0 * GRAVITY * JUMP_HEIGHT)

static func can_jump(recent_ground: bool, buffered: bool, already: bool, crouched: bool) -> bool:
	return recent_ground and buffered and not already and not crouched

static func mantle_ok(rise: float) -> bool:
	return rise >= MANTLE_MIN and rise <= MANTLE_MAX

static func drop_ok(drop: float, gap: float) -> bool:
	return drop >= DROP_MIN and drop <= DROP_MAX and gap <= GAP_MAX

static func cross_ok(rise: float, gap: float) -> bool:
	return absf(rise) <= 1.05 and gap >= 0.55 and gap <= GAP_MAX

static func stick_y(on_floor: bool, y: float, delta: float) -> float:
	if on_floor:
		return FLOOR_STICK
	return y - GRAVITY * delta

extends RefCounted
class_name CombatRules

## Bloodless melee. Bindings, kept off the old keys:
## Left click strikes (already "attack"). Q dodges. F blocks. X cycles a weapon.
## A block pressed within PARRY seconds of a hit is a counter.
## The flintlock is a waking-world relic and is refused while phase is "dream".

const PARRY := 0.16
const BLOCK_SCALE := 0.35
const FISTS := ["jab", "cross", "kick"]
const CYCLE := ["fists", "dagger", "sword", "shovel", "sickle", "hammer", "staff"]

const WEAPONS := {
	"fists": {"damage": 8, "speed": 0.38, "reach": 1.15, "dream": true, "kind": "unarmed", "move": "jab"},
	"dagger": {"damage": 14, "speed": 0.36, "reach": 1.35, "dream": true, "kind": "blade", "move": "blade"},
	"sword": {"damage": 20, "speed": 0.52, "reach": 1.7, "dream": true, "kind": "blade", "move": "blade"},
	"shovel": {"damage": 16, "speed": 0.68, "reach": 1.75, "dream": true, "kind": "tool", "move": "tool"},
	"sickle": {"damage": 13, "speed": 0.44, "reach": 1.3, "dream": true, "kind": "tool", "move": "tool"},
	"hammer": {"damage": 22, "speed": 0.74, "reach": 1.45, "dream": true, "kind": "tool", "move": "tool"},
	"staff": {"damage": 12, "speed": 0.48, "reach": 2.0, "dream": true, "kind": "tool", "move": "tool"},
	"flintlock": {"damage": 34, "speed": 1.5, "reach": 14.0, "dream": false, "kind": "relic", "move": "tool", "reload": 2.2},
}

static func weapon(id: String) -> Dictionary:
	return WEAPONS.get(id, WEAPONS["fists"])

static func allowed(id: String, phase: String) -> bool:
	var row: Dictionary = weapon(id)
	if not bool(row.get("dream", true)) and phase != "woke":
		return false
	return WEAPONS.has(id)

static func next_weapon(id: String, phase: String) -> String:
	var list: Array = CYCLE.duplicate()
	if phase == "woke":
		list.append("flintlock")
	var i := list.find(id)
	if i < 0:
		i = 0
	return str(list[(i + 1) % list.size()])

static func can_damage(target: Node) -> bool:
	if target == null:
		return false
	if target.is_in_group("villager"):
		return false
	return target.is_in_group("enemy")

static func resolve(amount: float, blocking: bool, timed: bool) -> float:
	if timed:
		return 0.0
	if blocking:
		return amount * BLOCK_SCALE
	return amount

static func apply_hit(target: Node, amount: float, from: Vector3, blocking: bool, timed: bool) -> float:
	if not can_damage(target):
		return 0.0
	var dealt := resolve(amount, blocking, timed)
	if target.has_method("receive_hit"):
		target.receive_hit(dealt, from, timed)
	return dealt

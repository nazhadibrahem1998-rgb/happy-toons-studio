extends GutTest

const Combat = preload("res://scripts/sim/combat_rules.gd")

func test_a_hit_damages_and_a_block_reduces_it() -> void:
	var beast = load("res://scripts/npc/beast.gd").new()
	add_child_autofree(beast)
	var start: float = beast.health
	var dealt: float = Combat.apply_hit(beast, 10.0, Vector3.ZERO, false, false)
	assert_eq(dealt, 10.0, "an open hit deals its damage")
	assert_eq(beast.health, start - 10.0, "the beast loses that health")
	var blocked: float = Combat.apply_hit(beast, 10.0, Vector3.ZERO, true, false)
	assert_lt(blocked, 10.0, "a block reduces the damage")
	assert_gt(blocked, 0.0, "a plain block still lands")
	assert_eq(beast.health, start - 10.0 - blocked, "blocked damage is what was dealt")
	var before: float = beast.health
	var countered: float = Combat.apply_hit(beast, 10.0, Vector3.ZERO, true, true)
	assert_eq(countered, 0.0, "a timed block deals nothing")
	assert_eq(beast.health, before, "a counter does not cut health")
	assert_gt(beast.stagger, 0.4, "a counter staggers the attacker")

func test_pistol_is_unavailable_in_part_one() -> void:
	assert_false(Combat.allowed("flintlock", "dream"), "the flintlock is shut in the dream")
	assert_true(Combat.allowed("flintlock", "woke"), "the flintlock can exist after the dream")
	assert_true(Combat.allowed("sword", "dream"), "a sword is allowed in the dream")
	assert_eq(Combat.next_weapon("staff", "dream"), "fists", "cycling in the dream skips the flintlock")
	assert_eq(Combat.next_weapon("staff", "woke"), "flintlock", "cycling after the dream can reach the flintlock")

func test_villagers_cannot_be_damaged() -> void:
	var person := Node3D.new()
	person.add_to_group("villager")
	add_child_autofree(person)
	assert_false(Combat.can_damage(person), "a villager is not a target")
	assert_eq(Combat.apply_hit(person, 20.0, Vector3.ZERO, false, false), 0.0, "a swing on a villager deals nothing")
	var beast = load("res://scripts/npc/beast.gd").new()
	beast.add_to_group("villager")
	add_child_autofree(beast)
	assert_false(Combat.can_damage(beast), "even a beast marked as a villager cannot be harmed")
	assert_eq(Combat.apply_hit(beast, 12.0, Vector3.ZERO, false, false), 0.0, "that mark blocks the hit")

extends GutTest

## The blend follows real speed. Jump landing is covered in test_jump.gd.

func test_anim_state_follows_speed() -> void:
	var rig = load("res://scripts/world/humanoid.gd").new()
	add_child_autofree(rig)
	rig.setup({"kind": "man", "costume": false})
	rig.tick(0.05, 0.0, "idle")
	assert_eq(str(rig._clip), "Armature|Idle", "standing still is idle")
	rig.tick(0.05, 2.2, "walk")
	assert_eq(str(rig._clip), "Armature|Walk", "walk speed uses the walk clip")
	assert_between(rig.blend_speed, 2.0, 2.4, "the blend position is the real speed")
	rig.tick(0.05, 5.5, "walk")
	assert_eq(str(rig._clip), "Armature|Sprint", "run speed uses the sprint clip")
	rig.tick(0.05, 1.1, "crouch")
	assert_eq(str(rig._clip), "Armature|Crouch_Fwd", "a crouch walk uses the crouch clip")
	rig.tick(0.05, 0.0, "chop")
	assert_eq(str(rig._clip), "Armature|Interact", "a tool action uses the interact clip")
	assert_true(rig.tree != null, "motion goes through an AnimationTree")

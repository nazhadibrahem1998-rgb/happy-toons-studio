extends GutTest

func test_mantle_lands_on_the_ledge() -> void:
	var floor_body := StaticBody3D.new()
	var floor_shape := CollisionShape3D.new()
	var floor_box := BoxShape3D.new()
	floor_box.size = Vector3(12, 1, 12)
	floor_shape.shape = floor_box
	floor_body.add_child(floor_shape)
	floor_body.position = Vector3(0, -0.5, 0)
	add_child_autofree(floor_body)
	var ledge := StaticBody3D.new()
	ledge.add_to_group("climbable")
	ledge.set_meta("climb", "ledge")
	var ledge_shape := CollisionShape3D.new()
	var ledge_box := BoxShape3D.new()
	ledge_box.size = Vector3(2.2, 1.2, 2.0)
	ledge_shape.shape = ledge_box
	ledge.add_child(ledge_shape)
	ledge.position = Vector3(0, 0.6, -0.2)
	add_child_autofree(ledge)
	var player = load("res://scripts/player/player.gd").new()
	add_child_autofree(player)
	player.global_position = Vector3(0, 0.35, 1.7)
	player.yaw = 0.0
	player.body_yaw = 0.0
	player.bot_override = true
	player.bot_wish = Vector2(0, 1)
	await wait_physics_frames(6)
	player.request_jump()
	var landed := false
	for _i in 50:
		await wait_physics_frames(1)
		if player.global_position.y > 0.9:
			player.bot_wish = Vector2.ZERO
		if player.global_position.y > 1.05 and player.is_on_floor():
			landed = true
			break
	assert_true(landed, "the mantle puts Azad on the ledge")
	assert_gt(player.global_position.y, 1.0, "he is standing on top")
	assert_lt(player.global_position.y, 1.6, "he did not overshoot the ledge")
	assert_lt(absf(player.global_position.x), 0.9, "he stays on the slab")

func test_blended_toggles_with_the_crowd() -> void:
	var floor_body := StaticBody3D.new()
	var floor_shape := CollisionShape3D.new()
	var floor_box := BoxShape3D.new()
	floor_box.size = Vector3(20, 1, 20)
	floor_shape.shape = floor_box
	floor_body.add_child(floor_shape)
	floor_body.position = Vector3(0, -0.5, 0)
	add_child_autofree(floor_body)
	var player = load("res://scripts/player/player.gd").new()
	add_child_autofree(player)
	player.global_position = Vector3(0, 0.35, 0)
	player.yaw = 0.0
	player.body_yaw = 0.0
	player.bot_override = true
	player.bot_wish = Vector2(0, 1)
	player.bot_sprint = false
	var marks: Array = []
	for i in 2:
		var person := Node3D.new()
		person.add_to_group("villager")
		person.position = Vector3(-0.7 + float(i) * 1.3, 0, -0.8)
		add_child_autofree(person)
		marks.append(person)
	await wait_physics_frames(14)
	assert_true(GameState.blended, "walking in a group of two blends Azad in")
	assert_true(bool(GameState.data["flags"].get("blended", false)), "the blend flag is set for later quests")
	for person in marks:
		person.position = Vector3(40, 0, 40)
	await wait_physics_frames(4)
	assert_false(GameState.blended, "leaving the group clears the blend")
	player.bot_sprint = true
	for person in marks:
		person.global_position = player.global_position + Vector3(0.5, 0, -0.4)
	await wait_physics_frames(10)
	assert_false(GameState.blended, "running through the group does not blend")
	player.bot_wish = Vector2.ZERO
	player.bot_sprint = false
	var bench := Node3D.new()
	bench.add_to_group("seat")
	add_child_autofree(bench)
	bench.global_position = player.global_position
	await wait_physics_frames(6)
	assert_true(GameState.blended, "sitting on a bench blends Azad in")

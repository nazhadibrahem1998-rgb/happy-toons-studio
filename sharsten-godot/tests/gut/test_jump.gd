extends GutTest

func test_jump_lands_back_on_the_floor() -> void:
	var floor_body := StaticBody3D.new()
	var floor_shape := CollisionShape3D.new()
	var floor_box := BoxShape3D.new()
	floor_box.size = Vector3(16, 1, 16)
	floor_shape.shape = floor_box
	floor_body.add_child(floor_shape)
	floor_body.position = Vector3(0, -0.5, 0)
	add_child_autofree(floor_body)
	var wall := StaticBody3D.new()
	var wall_shape := CollisionShape3D.new()
	var wall_box := BoxShape3D.new()
	wall_box.size = Vector3(4, 3, 0.4)
	wall_shape.shape = wall_box
	wall.add_child(wall_shape)
	wall.position = Vector3(0, 1.5, 0)
	add_child_autofree(wall)
	var roof := StaticBody3D.new()
	var roof_shape := CollisionShape3D.new()
	var roof_box := BoxShape3D.new()
	roof_box.size = Vector3(6, 0.3, 6)
	roof_shape.shape = roof_box
	roof.add_child(roof_shape)
	roof.position = Vector3(0, 2.3, 2.4)
	add_child_autofree(roof)
	var player = load("res://scripts/player/player.gd").new()
	add_child_autofree(player)
	player.global_position = Vector3(0, 0.4, 1.6)
	player.yaw = 0.0
	player.body_yaw = 0.0
	player.bot_override = true
	player.bot_wish = Vector2(0, 1)
	await wait_physics_frames(20)
	var start_y: float = player.global_position.y
	assert_true(player.is_on_floor(), "Azad starts on the floor")
	player.request_jump()
	var peak := start_y
	var second := false
	for _i in 50:
		await wait_physics_frames(1)
		peak = maxf(peak, player.global_position.y)
		if not player.is_on_floor() and not second:
			var before: float = player.velocity.y
			player.request_jump()
			await wait_physics_frames(1)
			second = true
			assert_lte(player.velocity.y, before + 0.05, "a second press does not jump again")
			player._jump_buffer = 0.0
	assert_gt(peak, start_y + 0.25, "the jump leaves the ground")
	assert_lt(peak, start_y + 0.85, "the jump stays about half a metre")
	assert_true(player.is_on_floor(), "Azad lands on the floor")
	assert_lt(player.global_position.y, start_y + 0.2, "he is not standing on the roof")
	assert_gt(player.global_position.z, 0.35, "the jump does not pass through the wall")
	player.bot_crouch = true
	player._crouch = 1.0
	var crouched_y: float = player.global_position.y
	player.request_jump()
	await wait_physics_frames(12)
	assert_lt(player.global_position.y, crouched_y + 0.15, "crouch does not jump")

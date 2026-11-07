extends GutTest

## Camera, floor, and door checks. The older suite in tests/run_tests.gd still runs too.

func test_player_does_not_fall_through_the_floor() -> void:
	var floor_body := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(12, 1, 12)
	shape.shape = box
	floor_body.add_child(shape)
	floor_body.position = Vector3(0, -0.5, 0)
	add_child_autofree(floor_body)
	var player = load("res://scripts/player/player.gd").new()
	add_child_autofree(player)
	player.global_position = Vector3(0, 1.2, 0)
	await wait_physics_frames(50)
	assert_true(player.is_on_floor(), "Azad should be standing on the floor")
	assert_gt(player.global_position.y, -0.05, "Azad sank through the floor")
	assert_lt(player.global_position.y, 0.5, "Azad is floating above the floor")

func test_camera_does_not_enter_a_wall() -> void:
	var floor_body := StaticBody3D.new()
	var floor_shape := CollisionShape3D.new()
	var floor_box := BoxShape3D.new()
	floor_box.size = Vector3(20, 1, 20)
	floor_shape.shape = floor_box
	floor_body.add_child(floor_shape)
	floor_body.position = Vector3(0, -0.5, 0)
	add_child_autofree(floor_body)
	var wall := StaticBody3D.new()
	var wall_shape := CollisionShape3D.new()
	var wall_box := BoxShape3D.new()
	wall_box.size = Vector3(6, 4, 0.8)
	wall_shape.shape = wall_box
	wall.add_child(wall_shape)
	wall.position = Vector3(0, 1.5, 2.2)
	add_child_autofree(wall)
	var player = load("res://scripts/player/player.gd").new()
	add_child_autofree(player)
	player.global_position = Vector3(0, 0.35, 0)
	player.yaw = 0.0
	player.pitch = -0.1
	player.cam_target = 6.0
	player.cam_dist = 6.0
	await wait_physics_frames(20)
	var cam: Vector3 = player.camera.global_position
	var inside := cam.z > 1.85 and cam.z < 2.55 and absf(cam.x) < 2.8 and cam.y > 0.2 and cam.y < 3.2
	assert_false(inside, "camera is inside the wall at %s" % cam)
	assert_lt(cam.z, 1.9, "camera passed into the wall, z=%s" % cam.z)

func test_door_opens_and_closes() -> void:
	var door = load("res://scripts/world/house_door.gd").new()
	add_child_autofree(door)
	door.build()
	door.use(null)
	door.advance(0.45)
	assert_true(door.open, "the door should open")
	assert_gt(door.angle_deg(), 70.0, "the door should swing open")
	door.use(null)
	door.advance(0.45)
	assert_false(door.open, "the door should close")
	assert_lt(door.angle_deg(), 5.0, "the door should be shut")

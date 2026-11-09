extends Node3D

enum Flow { PLAY, PAUSED, DEAD, CLEAR }

var flow: int = Flow.PLAY
var alive: int = 0
var total: int = 0
var ui: CanvasLayer
var player: PlayerBody

const CRATES: Array[Vector3] = [
	Vector3(2.6, 0.0, 9.0),
	Vector3(-16.5, 2.4, -18.0),
	Vector3(16.5, 3.1, -22.0),
	Vector3(-1.5, 1.4, -48.5),
]


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	player = $Player
	player.process_mode = Node.PROCESS_MODE_PAUSABLE
	_make_sfx_host()
	VillageBuilder.build($World)
	_environment()
	Settings.apply_to_current_scene()
	_build_ui()
	_spawn_pickups()
	_spawn_enemies()
	_connect_player()
	_ambience()
	_bake_nav()
	await get_tree().physics_frame
	await get_tree().physics_frame
	get_tree().call_group("enemy", "start_ai")
	print("LEVEL_READY")


func toggle_pause() -> void:
	if flow == Flow.DEAD or flow == Flow.CLEAR:
		return
	if flow == Flow.PAUSED:
		resume_game()
		return
	flow = Flow.PAUSED
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	ui.call("show_pause")


func resume_game() -> void:
	if flow != Flow.PAUSED:
		return
	flow = Flow.PLAY
	get_tree().paused = false
	if player.alive:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	ui.call("hide_menus")
	get_viewport().gui_release_focus()


func restart_game() -> void:
	get_tree().paused = false
	LevelManager.restart_level()


func go_menu() -> void:
	get_tree().paused = false
	LevelManager.load_main_menu()


func try_next() -> void:
	if LevelManager.has_next_level():
		get_tree().paused = false
		LevelManager.advance_level()
	else:
		ui.call("show_soon", GameConfig.STR["coming_soon"])


func _make_sfx_host() -> void:
	var host := Node3D.new()
	host.name = "SFX"
	host.process_mode = Node.PROCESS_MODE_PAUSABLE
	host.add_to_group("sfx_host")
	add_child(host)


func _environment() -> void:
	var env := Environment.new()
	var sky_mat := PanoramaSkyMaterial.new()
	sky_mat.panorama = Materials.SKY_HDR
	sky_mat.energy_multiplier = 0.38
	var sky := Sky.new()
	sky.sky_material = sky_mat
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.65
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 0.95
	env.tonemap_white = 6.0
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_EXPONENTIAL
	env.fog_density = 0.0085
	env.fog_light_color = Color(0.72, 0.48, 0.34)
	env.fog_light_energy = 0.7
	env.fog_aerial_perspective = 0.55
	env.fog_sky_affect = 0.65
	env.volumetric_fog_density = 0.01
	env.volumetric_fog_albedo = Color(0.62, 0.48, 0.38)
	env.volumetric_fog_length = 48.0
	env.volumetric_fog_detail_spread = 2.0
	env.volumetric_fog_ambient_inject = 0.35
	env.volumetric_fog_anisotropy = 0.25
	env.ssao_radius = 1.35
	env.ssao_intensity = 1.7
	env.ssao_power = 1.35
	env.ssao_horizon = 0.12
	env.glow_intensity = 0.35
	env.glow_bloom = 0.12
	env.glow_hdr_threshold = 1.05
	env.sdfgi_cascades = 4
	env.sdfgi_min_cell_size = 0.35
	env.sdfgi_max_distance = 80.0
	env.sdfgi_y_scale = Environment.SDFGI_Y_SCALE_75_PERCENT
	env.sdfgi_energy = 0.75
	env.sdfgi_bounce_feedback = 0.35
	env.sdfgi_use_occlusion = true
	env.adjustment_enabled = true
	env.adjustment_brightness = 1.0
	env.adjustment_contrast = 1.06
	env.adjustment_saturation = 0.9
	env.adjustment_color_correction = _grade_lut()
	env.ssao_enabled = false
	env.glow_enabled = false
	env.sdfgi_enabled = false
	env.volumetric_fog_enabled = false
	var world := WorldEnvironment.new()
	world.name = "WorldEnvironment"
	world.environment = env
	world.add_to_group("world_env")
	add_child(world)
	var sun := DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation_degrees = Vector3(-24, -42, 0)
	sun.light_color = Color(1.0, 0.62, 0.38)
	sun.light_energy = 2.6
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 70.0
	sun.directional_shadow_blend_splits = true
	sun.shadow_bias = 0.04
	sun.shadow_normal_bias = 1.1
	sun.light_angular_distance = 0.55
	sun.add_to_group("sun_light")
	add_child(sun)
	var moon := DirectionalLight3D.new()
	moon.rotation_degrees = Vector3(-28, 140, 0)
	moon.light_color = Color(0.55, 0.62, 0.78)
	moon.light_energy = 0.16
	moon.shadow_enabled = false
	add_child(moon)


func _grade_lut() -> Texture2D:
	var img := Image.create(256, 1, false, Image.FORMAT_RGB8)
	for x in 256:
		var t := float(x) / 255.0
		var lifted := pow(t, 0.96)
		img.set_pixel(x, 0, Color(lifted * 1.02, pow(t, 1.02) * 0.96, pow(t, 1.12) * 0.88))
	return ImageTexture.create_from_image(img)


func _build_ui() -> void:
	ui = load("res://scripts/ui/level_ui.gd").new()
	ui.name = "UI"
	add_child(ui)
	ui.call("bind", self)
	ui.call("set_enemies", 0, 0)
	ui.call("set_health", player.health, player.max_health)


func _connect_player() -> void:
	player.damaged.connect(func(from_pos: Vector3) -> void:
		ui.call("on_damaged", from_pos)
	)
	player.player_died.connect(_on_player_died)


func _spawn_enemies() -> void:
	var packed: PackedScene = preload("res://scenes/enemies/soldier.tscn")
	var parent := $Enemies
	var spawns: Array = [
		["soldier", Vector3(0.8, 0.1, -1.0), [Vector3(0.8, 0.1, -1.0), Vector3(-1.2, 0.1, -12.0)]],
		["soldier", Vector3(-2.2, 0.1, -18.0), [Vector3(-2.2, 0.1, -18.0), Vector3(2.4, 0.1, -22.0)]],
		["shield", Vector3(-15.0, 2.5, -3.0), [Vector3(-15.0, 2.5, -3.0), Vector3(-22.0, 2.5, -16.0)]],
		["soldier", Vector3(-20.0, 2.5, -24.0), [Vector3(-20.0, 2.5, -24.0), Vector3(-16.0, 2.5, -34.0)]],
		["soldier", Vector3(14.5, 3.2, -8.0), [Vector3(14.5, 3.2, -8.0), Vector3(22.0, 3.2, -18.0)]],
		["shield", Vector3(19.0, 3.2, -26.0), [Vector3(19.0, 3.2, -26.0), Vector3(15.0, 3.2, -34.0)]],
		["soldier", Vector3(0.2, 0.1, -30.0), [Vector3(0.2, 0.1, -30.0), Vector3(-2.0, 0.1, -39.0)]],
		["shield", Vector3(3.0, 0.1, -43.0), [Vector3(3.0, 0.1, -43.0), Vector3(-1.0, 0.1, -40.5)]],
		["commander", Vector3(1.5, 1.55, -56.0), [Vector3(1.5, 1.55, -56.0), Vector3(-4.0, 1.55, -50.0)]],
		["soldier", Vector3(8.5, 1.55, -49.0), [Vector3(8.5, 1.55, -49.0), Vector3(4.0, 1.55, -58.0)]],
	]
	for entry in spawns:
		var soldier := packed.instantiate() as EnemySoldier
		soldier.setup(entry[0], entry[2])
		soldier.process_mode = Node.PROCESS_MODE_PAUSABLE
		parent.add_child(soldier)
		soldier.global_position = entry[1]
		soldier.died.connect(_on_enemy_died)
		alive += 1
	total = alive
	ui.call("set_enemies", alive, total)


func _spawn_pickups() -> void:
	var packed: PackedScene = preload("res://scenes/props/ammo_crate.tscn")
	for pos in CRATES:
		var crate := packed.instantiate()
		crate.process_mode = Node.PROCESS_MODE_PAUSABLE
		$Pickups.add_child(crate)
		crate.global_position = pos


func _on_enemy_died() -> void:
	alive = maxi(0, alive - 1)
	ui.call("set_enemies", alive, total)
	if alive == 0 and flow == Flow.PLAY:
		flow = Flow.CLEAR
		player.control_enabled = false
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		var timer := get_tree().create_timer(0.7)
		timer.timeout.connect(_show_clear)


func _show_clear() -> void:
	if flow != Flow.CLEAR:
		return
	ui.call("show_level_complete")
	get_tree().paused = true


func _on_player_died() -> void:
	if flow == Flow.CLEAR:
		return
	flow = Flow.DEAD
	var timer := get_tree().create_timer(0.6)
	timer.timeout.connect(_show_dead)


func _show_dead() -> void:
	if flow != Flow.DEAD:
		return
	ui.call("show_game_over")
	get_tree().paused = true


func _ambience() -> void:
	var stream := AudioDirector.make_loop("ambience")
	if stream == null:
		return
	var player_2d := AudioStreamPlayer.new()
	player_2d.stream = stream
	player_2d.volume_db = -16.0
	player_2d.autoplay = false
	add_child(player_2d)
	player_2d.play()


func _bake_nav() -> void:
	var region := $NavigationRegion3D as NavigationRegion3D
	var navmesh := NavigationMesh.new()
	navmesh.geometry_parsed_geometry_type = NavigationMesh.PARSED_GEOMETRY_STATIC_COLLIDERS
	navmesh.geometry_collision_mask = 1
	navmesh.agent_radius = 0.5
	navmesh.agent_height = 1.75
	navmesh.agent_max_climb = 0.5
	navmesh.agent_max_slope = 35.0
	navmesh.cell_size = 0.25
	navmesh.cell_height = 0.25
	navmesh.region_min_size = 2.0
	var source := NavigationMeshSourceGeometryData3D.new()
	NavigationServer3D.parse_source_geometry_data(navmesh, source, self, Callable())
	NavigationServer3D.bake_from_source_geometry_data(navmesh, source, Callable())
	region.navigation_mesh = navmesh
	print("NAV_POLYS ", navmesh.get_polygon_count())

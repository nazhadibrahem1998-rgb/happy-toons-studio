class_name HitscanRifle
extends Node3D

var mag: int = GameConfig.MAG_SIZE
var reserve: int = GameConfig.START_RESERVE
var reloading: bool = false
var reload_elapsed: float = 0.0
var bloom: float = 0.0
var next_shot: float = 0.0
var empty_lock: float = 0.0
var spread_scale: float = 1.0
var muzzle: Marker3D
var flash: OmniLight3D
var player: CharacterBody3D


func _ready() -> void:
	muzzle = WeaponFactory.attach_ak(self)
	flash = OmniLight3D.new()
	flash.name = "MuzzleFlash"
	flash.light_color = Color(1.0, 0.72, 0.38)
	flash.light_energy = 0.0
	flash.omni_range = 4.2
	flash.shadow_enabled = false
	muzzle.add_child(flash)


func bind(body: CharacterBody3D) -> void:
	player = body


func can_fire() -> bool:
	return not reloading and mag > 0


func try_fire(camera: Camera3D, ads: float) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	if reloading:
		return
	if mag <= 0:
		if now >= empty_lock:
			empty_lock = now + 0.28
			AudioDirector.play_3d("empty", global_position, -6.0)
		return
	if now < next_shot:
		return
	next_shot = now + GameConfig.FIRE_INTERVAL
	mag -= 1
	bloom = minf(bloom + GameConfig.bloom_per_shot(), GameConfig.bloom_max())
	_shoot(camera, ads)
	if player and player.has_method("add_recoil"):
		var kick := lerpf(0.0105, 0.0048, ads)
		player.call("add_recoil", kick, randf_range(-0.0035, 0.0035) * lerpf(1.0, 0.45, ads))


func try_reload() -> void:
	if reloading or mag >= GameConfig.MAG_SIZE or reserve <= 0:
		return
	reloading = true
	reload_elapsed = 0.0
	AudioDirector.play_3d("reload", global_position, -6.0)


func advance(delta: float) -> void:
	bloom = maxf(0.0, bloom - GameConfig.bloom_decay() * delta)
	if not reloading:
		return
	reload_elapsed += delta
	if reload_elapsed < GameConfig.RELOAD_TIME:
		return
	var need := GameConfig.MAG_SIZE - mag
	var take := mini(need, reserve)
	mag += take
	reserve -= take
	reloading = false
	reload_elapsed = 0.0


func reload_ratio() -> float:
	if not reloading:
		return 0.0
	return clampf(reload_elapsed / GameConfig.RELOAD_TIME, 0.0, 1.0)


func add_reserve(amount: int) -> bool:
	if reserve >= GameConfig.MAX_RESERVE and mag >= GameConfig.MAG_SIZE:
		return false
	reserve = mini(GameConfig.MAX_RESERVE, reserve + amount)
	return true


func _shoot(camera: Camera3D, ads: float) -> void:
	# The bullet follows the camera-center ray so the crosshair is the impact.
	# The player's body is on layer 2 and is also excluded, so the shoulder
	# camera can see past Gurut without the capsule eating the shot.
	var origin := _aim_origin(camera)
	var dir := _aim_direction(camera)
	dir = _magnetize(camera, origin, dir)
	var spread := deg_to_rad(lerpf(GameConfig.hip_spread_deg(), GameConfig.ads_spread_deg(), ads) + bloom * lerpf(0.55, 0.2, ads))
	spread *= spread_scale
	if spread > 0.0001:
		dir = dir.rotated(Vector3.UP, randf_range(-spread, spread))
		var axis := dir.cross(Vector3.UP)
		if axis.length() > 0.001:
			dir = dir.rotated(axis.normalized(), randf_range(-spread, spread))
	dir = dir.normalized()
	var end := origin + dir * 180.0
	var exclude: Array[RID] = []
	if player:
		exclude.append(player.get_rid())
	var query := PhysicsRayQueryParameters3D.create(origin, end, 1 | 4, exclude)
	query.collide_with_areas = false
	query.collide_with_bodies = true
	query.hit_from_inside = false
	var hit := camera.get_world_3d().direct_space_state.intersect_ray(query)
	var muzzle_pos := muzzle.global_position if muzzle else origin
	AudioDirector.play_3d("ak", muzzle_pos, -1.0)
	_muzzle_flash()
	if not hit.is_empty():
		end = hit.position
		var collider: Object = hit.collider
		if collider is Node and (collider as Node).is_in_group("enemy") and (collider as Node).has_method("apply_damage"):
			var body := collider as Node3D
			var hit_y: float = float(hit.position.y)
			var headshot: bool = hit_y >= body.global_position.y + 1.48
			var amount := GameConfig.HEAD_DAMAGE if headshot else GameConfig.BODY_DAMAGE
			body.call("apply_damage", amount, muzzle_pos, headshot)
			if player and player.has_method("notify_hit"):
				player.call("notify_hit")
			ImpactEffect.spawn(hit.position, hit.normal, "flesh")
		else:
			ImpactEffect.spawn(hit.position, hit.normal, "world")
	ImpactEffect.tracer(muzzle_pos, end, Color(1.0, 0.82, 0.55))
	get_tree().call_group("enemy", "hear_noise", muzzle_pos, GameConfig.GUNSHOT_HEAR_RADIUS)


func _aim_origin(camera: Camera3D) -> Vector3:
	var size := _viewport_size(camera)
	if size.x < 2.0 or size.y < 2.0:
		return camera.global_position
	return camera.project_ray_origin(size * 0.5)


func _aim_direction(camera: Camera3D) -> Vector3:
	var size := _viewport_size(camera)
	if size.x < 2.0 or size.y < 2.0:
		return -camera.global_transform.basis.z
	return camera.project_ray_normal(size * 0.5)


func _viewport_size(camera: Camera3D) -> Vector2:
	var vp := camera.get_viewport()
	if vp == null:
		return Vector2.ZERO
	return vp.get_visible_rect().size


func _magnetize(camera: Camera3D, origin: Vector3, dir: Vector3) -> Vector3:
	var cone := deg_to_rad(GameConfig.magnet_deg())
	if cone <= 0.001 or spread_scale <= 0.001:
		return dir
	var best := dir
	var best_ang := cone
	var space := camera.get_world_3d().direct_space_state
	for node in get_tree().get_nodes_in_group("enemy"):
		var enemy := node as Node3D
		if enemy == null or not bool(enemy.get("alive")):
			continue
		var chest := enemy.global_position + Vector3(0, 1.1, 0)
		var to := chest - origin
		var dist := to.length()
		if dist < 0.6 or dist > 42.0:
			continue
		to = to.normalized()
		var ang := dir.angle_to(to)
		if ang >= best_ang:
			continue
		var exclude: Array[RID] = []
		if player:
			exclude.append(player.get_rid())
		var query := PhysicsRayQueryParameters3D.create(origin, chest, 1 | 4, exclude)
		query.collide_with_areas = false
		query.hit_from_inside = false
		var hit := space.intersect_ray(query)
		if hit.is_empty() or hit.collider != enemy:
			continue
		best_ang = ang
		best = to
	return best


func _muzzle_flash() -> void:
	if flash == null:
		return
	flash.light_energy = 8.0
	var tw := create_tween()
	tw.tween_property(flash, "light_energy", 0.0, 0.045)

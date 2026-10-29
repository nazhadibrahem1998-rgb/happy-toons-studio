class_name HitscanRifle
extends Node3D

var mag: int = GameConfig.MAG_SIZE
var reserve: int = GameConfig.START_RESERVE
var reloading: bool = false
var reload_elapsed: float = 0.0
var bloom: float = 0.0
var next_shot: float = 0.0
var empty_lock: float = 0.0
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
	bloom = minf(bloom + 0.55, 6.2)
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
	bloom = maxf(0.0, bloom - 8.5 * delta)
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
	var center := camera.get_viewport().get_visible_rect().size * 0.5
	var origin := camera.project_ray_origin(center)
	var dir := camera.project_ray_normal(center)
	var spread := deg_to_rad(lerpf(1.55, 0.22, ads) + bloom * lerpf(1.0, 0.42, ads))
	dir = dir.rotated(Vector3.UP, randf_range(-spread, spread))
	var axis := dir.cross(Vector3.UP)
	if axis.length() > 0.001:
		dir = dir.rotated(axis.normalized(), randf_range(-spread, spread))
	dir = dir.normalized()
	var end := origin + dir * 180.0
	var query := PhysicsRayQueryParameters3D.create(origin, end, 1 | 4)
	if player:
		query.exclude = [player.get_rid()]
	var hit := camera.get_world_3d().direct_space_state.intersect_ray(query)
	var muzzle_pos := muzzle.global_position if muzzle else origin
	AudioDirector.play_3d("ak", muzzle_pos, -1.0)
	_muzzle_flash()
	if not hit.is_empty():
		end = hit.position
		var collider: Object = hit.collider
		if collider is Node and (collider as Node).is_in_group("enemy") and (collider as Node).has_method("apply_damage"):
			(collider as Node).call("apply_damage", 26, muzzle_pos)
			if player and player.has_method("notify_hit"):
				player.call("notify_hit")
			ImpactEffect.spawn(hit.position, hit.normal, "flesh")
		else:
			ImpactEffect.spawn(hit.position, hit.normal, "world")
	ImpactEffect.tracer(muzzle_pos, end, Color(1.0, 0.82, 0.55))
	get_tree().call_group("enemy", "hear_noise", muzzle_pos, GameConfig.GUNSHOT_HEAR_RADIUS)


func _muzzle_flash() -> void:
	if flash == null:
		return
	flash.light_energy = 8.0
	var tw := create_tween()
	tw.tween_property(flash, "light_energy", 0.0, 0.045)

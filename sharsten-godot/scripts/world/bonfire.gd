extends Node3D

## A Newroz hearth in the square. Fire, embers, smoke, a warm lamp,
## a quiet crackle, and an original daf-and-melody loop that is only
## loud beside the fire. No flags, colours of a party, or slogans.

var light: OmniLight3D
var music: AudioStreamPlayer3D
var _time := 0.0

func setup(low: bool) -> void:
	name = "NewrozFire"
	add_to_group("bonfire")
	var stones := MeshLib.mat("6a5a48", 0.95)
	for i in 8:
		var ang := float(i) / 8.0 * TAU
		MeshLib.part(self, MeshLib.box(0.45, 0.28, 0.28), stones, Vector3(cos(ang) * 1.15, 0.14, sin(ang) * 1.15))
	MeshLib.part(self, MeshLib.cyl(0.55, 0.18), MeshLib.mat("3a2418", 0.9), Vector3(0, 0.1, 0))
	_flame(low)
	_embers(low)
	_smoke(low)
	light = OmniLight3D.new()
	light.position = Vector3(0, 1.1, 0)
	light.light_color = Color(1.0, 0.62, 0.28)
	light.light_energy = 1.2 if not low else 0.8
	light.omni_range = 8.0 if not low else 6.0
	light.shadow_enabled = false
	add_child(light)
	var crackle := AudioStreamPlayer3D.new()
	crackle.name = "Crackle"
	var fire: AudioStream = load("res://assets/audio/cc0/fire.ogg")
	if fire is AudioStreamOggVorbis:
		(fire as AudioStreamOggVorbis).loop = true
	crackle.stream = fire
	_place_voice(crackle, -8.0, "SFX", 2.5, 14.0)
	add_child(crackle)
	if not OS.has_feature("headless"):
		crackle.play()
	music = AudioStreamPlayer3D.new()
	music.name = "Tune"
	music.stream = load("res://scripts/world/ambience.gd").folk_loop()
	_place_voice(music, -10.0, "Music", 3.0, 20.0)
	add_child(music)
	if not OS.has_feature("headless"):
		music.play()

func _place_voice(voice: AudioStreamPlayer3D, db: float, bus_name: String, unit: float, reach: float) -> void:
	# Sit in the flames. Inverse distance: full at `unit` metres, gone past `reach`.
	voice.position = Vector3(0.0, 0.7, 0.0)
	voice.volume_db = db
	voice.bus = bus_name
	voice.unit_size = unit
	voice.max_distance = reach
	voice.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE
	voice.panning_strength = 1.0
	voice.max_polyphony = 1
	voice.doppler_tracking = AudioStreamPlayer3D.DOPPLER_TRACKING_DISABLED

func fire_amount() -> int:
	for c in get_children():
		if c is CPUParticles3D and str(c.name) == "Flame":
			return (c as CPUParticles3D).amount
	return 0

func _flame(low: bool) -> void:
	var p := CPUParticles3D.new()
	p.name = "Flame"
	p.amount = 14 if low else 48
	p.lifetime = 0.7
	p.explosiveness = 0.0
	p.direction = Vector3.UP
	p.spread = 16.0
	p.gravity = Vector3(0, 0.6, 0)
	p.initial_velocity_min = 0.5
	p.initial_velocity_max = 1.3
	p.scale_amount_min = 0.12
	p.scale_amount_max = 0.38
	p.mesh = MeshLib.sphere(0.18)
	p.material_override = _glow("ff8a2a", 1.4)
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 0.28
	add_child(p)

func _embers(low: bool) -> void:
	var p := CPUParticles3D.new()
	p.name = "Embers"
	p.amount = 8 if low else 28
	p.lifetime = 1.6
	p.direction = Vector3.UP
	p.spread = 28.0
	p.gravity = Vector3(0, 0.15, 0)
	p.initial_velocity_min = 0.4
	p.initial_velocity_max = 1.1
	p.scale_amount_min = 0.03
	p.scale_amount_max = 0.07
	p.mesh = MeshLib.sphere(0.05)
	p.material_override = _glow("ffb060", 1.1)
	add_child(p)

func _smoke(low: bool) -> void:
	var p := CPUParticles3D.new()
	p.name = "Smoke"
	p.amount = 4 if low else 14
	p.lifetime = 2.8
	p.direction = Vector3.UP
	p.spread = 12.0
	p.gravity = Vector3(0, 0.35, 0)
	p.initial_velocity_min = 0.25
	p.initial_velocity_max = 0.55
	p.scale_amount_min = 0.35
	p.scale_amount_max = 0.9
	p.mesh = MeshLib.sphere(0.22)
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.35, 0.32, 0.28, 0.28)
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	p.material_override = m
	add_child(p)

func _glow(hex: String, energy: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(hex)
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.emission_enabled = true
	m.emission = Color(hex)
	m.emission_energy_multiplier = energy
	return m

func _process(delta: float) -> void:
	_time += delta
	if light == null:
		return
	var flick := 0.85 + sin(_time * 11.0) * 0.12 + sin(_time * 27.0) * 0.06
	light.light_energy = flick * (0.8 if Settings.preset == "low" else 1.2)

func _local_crackle() -> AudioStreamWAV:
	return load("res://scripts/world/ambience.gd")._ticks(2.4)

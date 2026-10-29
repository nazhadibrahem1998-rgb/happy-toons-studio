class_name Materials
extends RefCounted

const GROUND_ALB: Texture2D = preload("res://assets/textures/ground/ground.jpg")
const GROUND_NOR: Texture2D = preload("res://assets/textures/ground/ground_nor.jpg")
const PLASTER_ALB: Texture2D = preload("res://assets/textures/plaster/plaster.jpg")
const PLASTER_NOR: Texture2D = preload("res://assets/textures/plaster/plaster_nor.jpg")
const WOOD_ALB: Texture2D = preload("res://assets/textures/wood/wood.jpg")
const WOOD_NOR: Texture2D = preload("res://assets/textures/wood/wood_nor.jpg")
const ROCK_ALB: Texture2D = preload("res://assets/textures/rock/rock.jpg")
const ROCK_NOR: Texture2D = preload("res://assets/textures/rock/rock_nor.jpg")
const SKY_HDR: Texture2D = preload("res://assets/textures/sky.hdr")

static var _cache: Dictionary = {}


static func ground() -> Material:
	return _shared("ground", GROUND_ALB, GROUND_NOR, Color(0.70, 0.66, 0.56), 0.94, 0.0, 0.18)

static func path() -> Material:
	return _shared("path", GROUND_ALB, GROUND_NOR, Color(0.46, 0.38, 0.30), 0.97, 0.0, 0.26)

static func plaster() -> Material:
	return _shared("plaster", PLASTER_ALB, PLASTER_NOR, Color(0.80, 0.68, 0.52), 0.9, 0.0, 0.42)

static func plaster_dark() -> Material:
	return _shared("plaster_dark", PLASTER_ALB, PLASTER_NOR, Color(0.40, 0.34, 0.28), 0.92, 0.0, 0.38)

static func wood() -> Material:
	return _shared("wood", WOOD_ALB, WOOD_NOR, Color(0.70, 0.58, 0.44), 0.8, 0.0, 0.5)

static func rock() -> Material:
	return _shared("rock", ROCK_ALB, ROCK_NOR, Color(0.58, 0.56, 0.54), 0.96, 0.02, 0.16)

static func rock_far() -> Material:
	return _shared("rock_far", ROCK_ALB, ROCK_NOR, Color(0.42, 0.46, 0.54), 1.0, 0.0, 0.06)

static func flat(color: Color, rough: float = 0.8, metal: float = 0.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = rough
	mat.metallic = metal
	return mat

static func metal_dark() -> Material:
	return _flat_shared("metal_dark", Color(0.15, 0.15, 0.14), 0.4, 0.84)

static func wood_furniture() -> Material:
	return _flat_shared("wood_furniture", Color(0.28, 0.16, 0.09), 0.72, 0.0)

static func _flat_shared(key: String, color: Color, rough: float, metal: float) -> Material:
	if not _cache.has(key):
		_cache[key] = flat(color, rough, metal)
	return _cache[key]

static func _shared(key: String, albedo: Texture2D, normal: Texture2D, tint: Color, rough: float, metal: float, scale: float) -> Material:
	if _cache.has(key):
		return _cache[key]
	var mat := StandardMaterial3D.new()
	mat.albedo_color = tint
	mat.albedo_texture = albedo
	mat.normal_enabled = true
	mat.normal_texture = normal
	mat.normal_scale = 0.65
	mat.roughness = rough
	mat.metallic = metal
	mat.uv1_triplanar = true
	mat.uv1_world_triplanar = true
	mat.uv1_scale = Vector3.ONE * scale
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	_cache[key] = mat
	return mat

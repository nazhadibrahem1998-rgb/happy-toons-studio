extends Node

signal settings_changed

const BASE_SENS := 0.00235
const PATH := "user://settings.cfg"

var sensitivity: float = BASE_SENS
var volume: float = 0.8
var quality: String = "high"
var user_chose_quality: bool = false
var best_score: int = 0
var tips_seen: bool = false

const TIPS_KEY := "gurut-tips-seen"
const BEST_KEY := "hts:best:gurut"


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_load()
	var forced := OS.get_environment("SHOOTER_QUALITY")
	if forced == "low" or forced == "medium" or forced == "high":
		quality = forced
	elif not user_chose_quality:
		quality = _detect_quality()
	_apply_audio()
	var adapter := ""
	if RenderingServer.has_method("get_video_adapter_name"):
		adapter = RenderingServer.get_video_adapter_name()
	print("GPU: ", adapter, " quality=", quality)


func _detect_quality() -> String:
	if DisplayServer.get_name() == "headless":
		return "low"
	var adapter := ""
	if RenderingServer.has_method("get_video_adapter_name"):
		adapter = RenderingServer.get_video_adapter_name().to_lower()
	if adapter == "" or "llvmpipe" in adapter or "lavapipe" in adapter or "swiftshader" in adapter:
		return "low"
	return "high"


func set_volume(value: float) -> void:
	volume = clampf(value, 0.0, 1.0)
	_apply_audio()
	_save()
	settings_changed.emit()


func set_sensitivity_multiplier(multiplier: float) -> void:
	sensitivity = BASE_SENS * clampf(multiplier, 0.35, 2.4)
	_save()
	settings_changed.emit()


func sensitivity_multiplier() -> float:
	return sensitivity / BASE_SENS


func set_quality(next: String) -> void:
	if next != "low" and next != "medium" and next != "high":
		return
	quality = next
	user_chose_quality = true
	_save()
	apply_to_current_scene()
	settings_changed.emit()


func _apply_audio() -> void:
	var db := linear_to_db(maxf(volume, 0.0001))
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("Master"), db)


func apply_to_current_scene() -> void:
	var tree := get_tree()
	if tree == null:
		return
	var env_node := tree.get_first_node_in_group("world_env") as WorldEnvironment
	if env_node == null or env_node.environment == null:
		return
	var light := tree.get_first_node_in_group("sun_light") as DirectionalLight3D
	var viewport := tree.root.get_viewport()
	_apply_quality(env_node.environment, light, viewport)
	for lamp in tree.get_nodes_in_group("lamp"):
		if lamp is OmniLight3D:
			lamp.shadow_enabled = quality == "high"


func _apply_quality(env: Environment, light: DirectionalLight3D, viewport: Viewport) -> void:
	var headless := DisplayServer.get_name() == "headless"
	var q := "low" if headless else quality
	env.adjustment_enabled = true
	env.fog_enabled = true
	match q:
		"low":
			env.ssao_enabled = false
			env.sdfgi_enabled = false
			env.glow_enabled = false
			env.volumetric_fog_enabled = false
			viewport.msaa_3d = Viewport.MSAA_DISABLED
			viewport.scaling_3d_mode = Viewport.SCALING_3D_MODE_BILINEAR
			viewport.scaling_3d_scale = 0.75
			if light:
				light.shadow_enabled = true
				light.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
				light.directional_shadow_max_distance = 36.0
				light.shadow_blur = 0.4
		"medium":
			env.ssao_enabled = true
			env.sdfgi_enabled = false
			env.glow_enabled = true
			env.volumetric_fog_enabled = true
			env.volumetric_fog_density = 0.008
			viewport.msaa_3d = Viewport.MSAA_2X
			viewport.scaling_3d_mode = Viewport.SCALING_3D_MODE_BILINEAR
			viewport.scaling_3d_scale = 0.9
			if light:
				light.shadow_enabled = true
				light.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
				light.directional_shadow_max_distance = 55.0
				light.shadow_blur = 1.0
		_:
			env.ssao_enabled = true
			env.sdfgi_enabled = true
			env.glow_enabled = true
			env.volumetric_fog_enabled = true
			env.volumetric_fog_density = 0.012
			viewport.msaa_3d = Viewport.MSAA_2X
			viewport.scaling_3d_mode = Viewport.SCALING_3D_MODE_BILINEAR
			viewport.scaling_3d_scale = 1.0
			if light:
				light.shadow_enabled = true
				light.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
				light.directional_shadow_max_distance = 80.0
				light.directional_shadow_blend_splits = true
				light.shadow_blur = 1.4
	_cap_pixel_ratio(viewport)


func _load() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PATH) == OK:
		volume = float(cfg.get_value("audio", "volume", volume))
		sensitivity = float(cfg.get_value("input", "sensitivity", sensitivity))
		quality = str(cfg.get_value("video", "quality", quality))
		user_chose_quality = bool(cfg.get_value("video", "chosen", false))
		best_score = int(cfg.get_value("score", "best", best_score))
		tips_seen = bool(cfg.get_value("meta", TIPS_KEY, tips_seen))
	if _web_get(TIPS_KEY) == "1":
		tips_seen = true
	var web_best := _parse_int(_web_get(BEST_KEY))
	if web_best > best_score:
		best_score = web_best


func _save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("audio", "volume", volume)
	cfg.set_value("input", "sensitivity", sensitivity)
	cfg.set_value("video", "quality", quality)
	cfg.set_value("video", "chosen", user_chose_quality)
	cfg.set_value("score", "best", best_score)
	cfg.set_value("meta", TIPS_KEY, tips_seen)
	cfg.save(PATH)
	if tips_seen:
		_web_set(TIPS_KEY, "1")
	if best_score > 0:
		_web_set(BEST_KEY, str(best_score))


func prefers_reduced_motion() -> bool:
	if OS.get_environment("SHOOTER_REDUCED_MOTION") == "1":
		return true
	if DisplayServer.has_method("accessibility_should_reduce_animation"):
		if bool(DisplayServer.call("accessibility_should_reduce_animation")):
			return true
	if OS.has_feature("web"):
		var raw = _web_eval("window.matchMedia('(prefers-reduced-motion: reduce)').matches")
		return bool(raw)
	return false


func should_show_tips() -> bool:
	if tips_seen:
		return false
	if OS.get_environment("SHOOTER_SCREENSHOTS") == "1" or OS.get_environment("SHOOTER_SMOKE") == "1":
		return false
	var args := OS.get_cmdline_user_args()
	if args.has("--screenshots") or args.has("--smoke"):
		return false
	return true


func mark_tips_seen() -> void:
	tips_seen = true
	_save()


func record_score(points: int) -> Dictionary:
	var safe := maxi(0, points)
	var is_new := safe > best_score
	if is_new:
		best_score = safe
		_save()
	return {"score": safe, "best": best_score, "is_new": is_new and safe > 0}


func _cap_pixel_ratio(viewport: Viewport) -> void:
	if viewport == null or DisplayServer.get_name() == "headless":
		return
	var dpr := maxf(DisplayServer.screen_get_scale(), 1.0)
	var limit := 2.0 / dpr
	viewport.scaling_3d_scale = minf(viewport.scaling_3d_scale, minf(1.0, limit))


func _web_eval(code: String) -> Variant:
	if not OS.has_feature("web"):
		return null
	var bridge = Engine.get_singleton("JavaScriptBridge")
	if bridge == null:
		return null
	return bridge.call("eval", code)


func _parse_int(text: String) -> int:
	if text.is_valid_int():
		return int(text)
	return 0


func _js_quote(text: String) -> String:
	return "'" + text.replace("\\", "\\\\").replace("'", "\\'") + "'"


func _web_get(key: String) -> String:
	var raw = _web_eval("localStorage.getItem(%s)" % _js_quote(key))
	if raw == null:
		return ""
	var text := str(raw)
	if text == "null" or text == "<null>":
		return ""
	return text


func _web_set(key: String, value: String) -> void:
	_web_eval("localStorage.setItem(%s, %s)" % [_js_quote(key), _js_quote(value)])

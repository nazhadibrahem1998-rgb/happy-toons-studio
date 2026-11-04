extends RefCounted
class_name GraphicsRules

const ORDER := ["low", "medium", "high", "ultra"]

static func flags(preset: String) -> Dictionary:
	match preset:
		"low":
			return {
				"id": "low",
				"shadows": false, "shadow_size": 1024, "shadow_distance": 18.0, "shadow_splits": 1,
				"msaa": 0, "sdfgi": false, "ssao": false, "ssr": false, "ssr_steps": 0,
				"volumetric_fog": false, "vol_density": 0.0, "glow": false,
				"fog_density": 0.008, "view": 42.0, "trees": 28, "grass": 0,
				"lod_full": 16.0, "grass_range": 0.0, "lamps": 0, "foliage_shadows": false,
				"sdfgi_cell": 1.5, "sdfgi_cascades": 4,
			}
		"high":
			return {
				"id": "high",
				"shadows": true, "shadow_size": 4096, "shadow_distance": 64.0, "shadow_splits": 2,
				"msaa": 4, "sdfgi": true, "ssao": true, "ssr": true, "ssr_steps": 32,
				"volumetric_fog": true, "vol_density": 0.008, "glow": true,
				"fog_density": 0.007, "view": 130.0, "trees": 160, "grass": 360,
				"lod_full": 34.0, "grass_range": 46.0, "lamps": 4, "foliage_shadows": true,
				"sdfgi_cell": 1.1, "sdfgi_cascades": 4,
			}
		"ultra":
			return {
				"id": "ultra",
				"shadows": true, "shadow_size": 8192, "shadow_distance": 100.0, "shadow_splits": 4,
				"msaa": 4, "sdfgi": true, "ssao": true, "ssr": true, "ssr_steps": 64,
				"volumetric_fog": true, "vol_density": 0.01, "glow": true,
				"fog_density": 0.005, "view": 190.0, "trees": 240, "grass": 640,
				"lod_full": 48.0, "grass_range": 64.0, "lamps": 8, "foliage_shadows": true,
				"sdfgi_cell": 0.65, "sdfgi_cascades": 4,
			}
		_:
			return {
				"id": "medium",
				"shadows": true, "shadow_size": 2048, "shadow_distance": 36.0, "shadow_splits": 1,
				"msaa": 0, "sdfgi": false, "ssao": false, "ssr": false, "ssr_steps": 0,
				"volumetric_fog": false, "vol_density": 0.0, "glow": false,
				"fog_density": 0.006, "view": 70.0, "trees": 56, "grass": 70,
				"lod_full": 24.0, "grass_range": 28.0, "lamps": 0, "foliage_shadows": false,
				"sdfgi_cell": 1.5, "sdfgi_cascades": 4,
			}

static func for_renderer(src: Dictionary, method: String) -> Dictionary:
	var f := src.duplicate(true)
	if method != "forward_plus":
		f["sdfgi"] = false
		f["ssao"] = false
		f["ssr"] = false
		f["volumetric_fog"] = false
		f["glow"] = false
	return f

static func preset_for_adapter(adapter_name: String, vram_mb: int) -> String:
	var n := adapter_name.to_lower()
	var software := ["llvmpipe", "lavapipe", "swiftshader", "softpipe", "basic render", "microsoft basic"]
	for s in software:
		if n.find(s) >= 0:
			return "low"
	var ultra_bits := ["rtx 4090", "rtx 4080", "rtx 4070", "rx 7900", "rx 7800", "rx 6950"]
	for s in ultra_bits:
		if n.find(s) >= 0:
			return "ultra"
	var medium_bits := [
		"gtx 1060", "gtx 1660", "gtx 1650", "gtx 980", "gtx 970",
		"rx 580", "rx 570", "rx 590", "rx 480", "rx 5500", "rx 5600", "rx 5700",
	]
	for s in medium_bits:
		if n.find(s) >= 0:
			return "medium"
	# Integrated APUs, including "AMD Radeon(TM) Graphics". Low keeps them smooth.
	# A larger reported VRAM can step up to Medium, never to High.
	if n.find("radeon(tm) graphics") >= 0 or n.find("radeon graphics") >= 0:
		if vram_mb >= 6144:
			return "medium"
		return "low"
	var low_bits := ["intel hd", "uhd graphics", "intel(r) uhd", "iris", "vega 3", "vega 8", "hd graphics"]
	for s in low_bits:
		if n.find(s) >= 0:
			return "low"
	var high_bits := ["rtx", "rx 6", "rx 7", "gtx 1080", "gtx 1070", "arc a7"]
	for s in high_bits:
		if n.find(s) >= 0:
			return "high"
	if vram_mb >= 10000:
		return "ultra"
	if vram_mb >= 7500:
		return "high"
	if vram_mb >= 3500:
		return "medium"
	if vram_mb > 0 and vram_mb < 2500:
		return "low"
	return "medium"

static func clamp_scale(scale: float) -> float:
	return clampf(scale, 0.5, 1.0)

static func scaling_mode(fsr_mode, scale: float) -> String:
	var mode := "off"
	if typeof(fsr_mode) == TYPE_BOOL:
		mode = "fsr2" if fsr_mode else "off"
	else:
		mode = str(fsr_mode)
	if scale >= 0.999 or mode == "off" or mode == "false":
		return "bilinear"
	if mode == "fsr1" or mode == "1":
		return "fsr1"
	if mode == "fsr2" or mode == "2" or mode == "true":
		return "fsr2"
	return "bilinear"

class_name Banner
extends RefCounted

# Invented Iron Empire emblem (dark red field, black geometric crown).
# Not a flag of any real country. The player's Kurdistan flag lives in KurdistanFlag.

const FLAG_SHADER := """shader_type spatial;
render_mode cull_disabled, diffuse_burley, specular_schlick_ggx;
uniform sampler2D albedo_tex : source_color;
void vertex() {
	float flutter = sin(TIME * 1.7 + VERTEX.y * 4.0 + VERTEX.x * 2.0) * 0.08 * UV.x;
	VERTEX.z += flutter;
}
void fragment() {
	vec4 tex = texture(albedo_tex, UV);
	ALBEDO = tex.rgb;
	ROUGHNESS = 0.84;
	METALLIC = 0.0;
}
"""

static var _tex: Texture2D


static func texture() -> Texture2D:
	if _tex == null:
		_tex = _make_texture()
	return _tex


static func make_flag(parent: Node3D, width: float = 1.15, height: float = 1.7) -> void:
	var pole := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.03
	cyl.bottom_radius = 0.042
	cyl.height = height + 0.9
	pole.mesh = cyl
	pole.material_override = Materials.metal_dark()
	pole.position = Vector3(0, cyl.height * 0.5, 0)
	pole.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	parent.add_child(pole)

	var cloth := MeshInstance3D.new()
	var quad := QuadMesh.new()
	quad.size = Vector2(width, height)
	quad.orientation = QuadMesh.FACE_Z
	cloth.mesh = quad
	cloth.position = Vector3(width * 0.5, height * 0.45 + 0.55, 0)
	cloth.material_override = _flag_material()
	cloth.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	cloth.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(cloth)


static func _flag_material() -> Material:
	var shader := Shader.new()
	shader.code = FLAG_SHADER
	var mat := ShaderMaterial.new()
	mat.shader = shader
	mat.set_shader_parameter("albedo_tex", texture())
	return mat


static func _make_texture() -> Texture2D:
	var w := 128
	var h := 192
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	var field := Color(0.34, 0.045, 0.055, 1.0)
	var ink := Color(0.03, 0.03, 0.035, 1.0)
	img.fill(field)
	for y in h:
		for x in w:
			if x < 6 or y < 6 or x >= w - 6 or y >= h - 6:
				img.set_pixel(x, y, ink)
	_crown(img, w / 2, 86, ink)
	return ImageTexture.create_from_image(img)


static func _crown(img: Image, cx: int, cy: int, col: Color) -> void:
	for y in range(cy + 16, cy + 32):
		for x in range(cx - 30, cx + 30):
			_px(img, x, y, col)
	var peaks: Array[int] = [cx - 20, cx, cx + 20]
	var heights: Array[int] = [24, 36, 24]
	for i in peaks.size():
		var px0: int = peaks[i]
		var ph: int = heights[i]
		for dy in ph:
			var half := int((1.0 - float(dy) / float(ph)) * 9.0)
			var y := cy + 16 - dy
			for x in range(px0 - half, px0 + half + 1):
				_px(img, x, y, col)
	var gem := Color(0.55, 0.1, 0.1, 1.0)
	for dx in [-16, 0, 16]:
		_disc(img, cx + dx, cy + 24, 3, gem)


static func _disc(img: Image, cx: int, cy: int, r: int, col: Color) -> void:
	for y in range(cy - r, cy + r + 1):
		for x in range(cx - r, cx + r + 1):
			if Vector2(x - cx, y - cy).length() <= r:
				_px(img, x, y, col)


static func _px(img: Image, x: int, y: int, col: Color) -> void:
	if x < 0 or y < 0 or x >= img.get_width() or y >= img.get_height():
		return
	img.set_pixel(x, y, col)

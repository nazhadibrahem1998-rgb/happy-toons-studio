class_name KurdistanFlag
extends RefCounted

# Original procedural drawing of the Kurdistan flag (red, white, and green
# horizontal stripes with a golden 21-ray sun). Used only on the player's side:
# the main menu, Gurut's vest, and the southern village. The enemy keeps the
# invented Iron Empire emblem in Banner and is never given this flag.

const RED := Color8(235, 32, 40)
const WHITE := Color.WHITE
const GREEN := Color8(36, 140, 66)
const GOLD := Color8(252, 188, 12)

const CLOTH_SHADER := """shader_type spatial;
render_mode cull_disabled, diffuse_burley, specular_schlick_ggx;
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap, repeat_disable;
uniform float flutter_amp = 0.07;
uniform float hanging = 0.0;
void vertex() {
	float free_edge = mix(UV.x, UV.y, hanging);
	float wave = sin(TIME * 1.85 + VERTEX.y * 3.4 + VERTEX.x * 2.1);
	VERTEX.z += wave * flutter_amp * free_edge;
	VERTEX.y += sin(TIME * 1.25 + VERTEX.x * 2.2) * flutter_amp * 0.18 * free_edge;
}
void fragment() {
	vec4 tex = texture(albedo_tex, UV);
	ALBEDO = tex.rgb;
	ROUGHNESS = 0.86;
	METALLIC = 0.02;
}
"""

static var _tex: Texture2D
static var _pole_mat: ShaderMaterial
static var _hang_mat: ShaderMaterial
static var _patch_mat: ShaderMaterial


static func texture() -> Texture2D:
	if _tex == null:
		var img := draw(768, 512)
		img.generate_mipmaps()
		_tex = ImageTexture.create_from_image(img)
	return _tex


static func draw(w: int, h: int) -> Image:
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	var cx := (w - 1) * 0.5
	var cy := (h - 1) * 0.5
	var band := h / 3.0
	var r_disk := h * 0.108
	var r_tip := h * 0.468
	var sector := TAU / 21.0
	var half_base := sector * 0.40
	for y in h:
		var stripe := 0 if float(y) < band else (1 if float(y) < band * 2.0 else 2)
		var base := RED if stripe == 0 else (WHITE if stripe == 1 else GREEN)
		for x in w:
			var dx := float(x) - cx
			var sy := -(float(y) - cy)
			var dist := sqrt(dx * dx + sy * sy)
			var gold := 0.0
			if dist < r_tip + 1.5:
				var ang := atan2(sy, dx)
				var rel := wrapf(ang - PI * 0.5, -PI, PI)
				var k := rel / sector
				var nearest: float = floorf(k + 0.5)
				var delta := absf((k - nearest) * sector)
				var t := 0.0 if dist <= r_disk else (dist - r_disk) / (r_tip - r_disk)
				var half_w := half_base * maxf(0.0, 1.0 - clampf(t, 0.0, 1.0))
				var aa := 1.35 / maxf(dist, 1.0)
				if t >= 0.0 and t <= 1.0 and half_w > 0.0:
					if delta <= half_w - aa:
						gold = 1.0
					elif delta < half_w + aa:
						gold = 1.0 - (delta - (half_w - aa)) / (2.0 * aa)
				var disk_aa := 1.2
				if dist < r_disk + disk_aa:
					var disk := 1.0
					if dist > r_disk - disk_aa:
						disk = 1.0 - (dist - (r_disk - disk_aa)) / (2.0 * disk_aa)
					gold = maxf(gold, disk)
			gold = clampf(gold, 0.0, 1.0)
			img.set_pixel(x, y, base.lerp(GOLD, gold))
	return img


static func make_pole(parent: Node3D, width: float = 1.62, height: float = 1.08) -> void:
	var pole_h := height + 1.15
	var pole := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.028
	cyl.bottom_radius = 0.046
	cyl.height = pole_h
	cyl.radial_segments = 8
	pole.mesh = cyl
	pole.material_override = Materials.wood()
	pole.position = Vector3(0, pole_h * 0.5, 0)
	pole.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	parent.add_child(pole)
	var finial := MeshInstance3D.new()
	var ball := SphereMesh.new()
	ball.radius = 0.048
	ball.height = 0.096
	ball.radial_segments = 10
	ball.rings = 6
	finial.mesh = ball
	finial.material_override = Materials.flat(GOLD, 0.38, 0.55)
	finial.position = Vector3(0, pole_h + 0.02, 0)
	finial.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	finial.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(finial)
	var cloth := _cloth(width, height)
	cloth.position = Vector3(width * 0.5, pole_h - 0.16 - height * 0.5, 0.045)
	cloth.material_override = _material(false, 0.075)
	parent.add_child(cloth)


static func make_hanging(parent: Node3D, width: float = 1.22, height: float = 0.82) -> void:
	var bar := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(width + 0.14, 0.055, 0.055)
	bar.mesh = box
	bar.position = Vector3(width * 0.5, 0.0, 0.0)
	bar.material_override = Materials.wood()
	bar.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	parent.add_child(bar)
	var cloth := _cloth(width, height)
	cloth.position = Vector3(width * 0.5, -height * 0.5, 0.02)
	cloth.material_override = _material(true, 0.055)
	parent.add_child(cloth)


static func patch_material() -> Material:
	return _material(false, 0.0)


static func _cloth(width: float, height: float) -> MeshInstance3D:
	var cloth := MeshInstance3D.new()
	var quad := QuadMesh.new()
	quad.size = Vector2(width, height)
	quad.orientation = QuadMesh.FACE_Z
	cloth.mesh = quad
	cloth.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	cloth.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return cloth


static func _material(hanging: bool, flutter: float) -> ShaderMaterial:
	if hanging:
		if _hang_mat == null:
			_hang_mat = _make_material(1.0, flutter)
		return _hang_mat
	if flutter <= 0.001:
		if _patch_mat == null:
			_patch_mat = _make_material(0.0, 0.0)
		return _patch_mat
	if _pole_mat == null:
		_pole_mat = _make_material(0.0, flutter)
	return _pole_mat


static func _make_material(hanging: float, flutter: float) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = CLOTH_SHADER
	var mat := ShaderMaterial.new()
	mat.shader = shader
	mat.set_shader_parameter("albedo_tex", texture())
	mat.set_shader_parameter("flutter_amp", flutter)
	mat.set_shader_parameter("hanging", hanging)
	return mat

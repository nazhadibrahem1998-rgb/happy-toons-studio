extends Node

var streams: Dictionary = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for id in ["ak", "m16", "reload", "impact", "hurt", "empty", "foot", "ui", "ambience"]:
		var path := "res://assets/audio/%s.wav" % id
		if ResourceLoader.exists(path):
			streams[id] = load(path)


func play_3d(id: String, at: Vector3, db: float = 0.0) -> void:
	var stream: AudioStream = streams.get(id)
	if stream == null:
		return
	var host := _host()
	if host == null:
		return
	var player := AudioStreamPlayer3D.new()
	player.stream = stream
	player.volume_db = db
	player.max_distance = 48.0
	player.unit_size = 6.0
	player.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE
	host.add_child(player)
	player.global_position = at
	player.finished.connect(player.queue_free)
	player.play()


func play_2d(id: String, db: float = 0.0) -> void:
	var stream: AudioStream = streams.get(id)
	if stream == null:
		return
	var player := AudioStreamPlayer.new()
	player.stream = stream
	player.volume_db = db
	player.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(player)
	player.finished.connect(player.queue_free)
	player.play()


func make_loop(id: String) -> AudioStream:
	var stream: AudioStream = streams.get(id)
	if stream == null:
		return null
	var dup := stream.duplicate()
	if dup is AudioStreamWAV:
		dup.loop_mode = AudioStreamWAV.LOOP_FORWARD
	return dup


func _host() -> Node:
	var tree := get_tree()
	if tree == null:
		return null
	var host := tree.get_first_node_in_group("sfx_host")
	if host:
		return host
	return tree.current_scene

extends Node

## Original procedural beds. No sampled music and no copied melody.
## The old crackle was a single-sample spike on about one percent of
## the samples, which reads as a constant buzz. Pops now have a short
## decay, every loop fades to silence at both ends, and the mix stays
## under the limiter.

const RATE := 44100
const MAX_ONESHOTS := 2

var _click: AudioStreamWAV
var _oneshots := 0

func _ready() -> void:
	add_to_group("ambience")
	_ensure_buses()
	# Wind is the only village-wide bed. Crackle and the tune are 3D voices on the fire.
	_bed("wind", _air(3.2, 80.0, 0.06), -10.0)
	_click = _blip(880.0, 0.045)
	_chirp()

static func _ensure_buses() -> void:
	_bus("Ambience", -8.0)
	_bus("Music", -10.0)
	_bus("SFX", -6.0)
	var master := AudioServer.get_bus_index("Master")
	if master < 0:
		return
	for i in AudioServer.get_bus_effect_count(master):
		if AudioServer.get_bus_effect(master, i) is AudioEffectLimiter:
			return
	var lim := AudioEffectLimiter.new()
	lim.ceiling_db = -1.0
	lim.threshold_db = -8.0
	lim.soft_clip_db = 2.0
	lim.soft_clip_ratio = 10.0
	AudioServer.add_bus_effect(master, lim)

static func _bus(bus_name: String, db: float) -> void:
	var idx := AudioServer.get_bus_index(bus_name)
	if idx < 0:
		AudioServer.add_bus()
		idx = AudioServer.bus_count - 1
		AudioServer.set_bus_name(idx, bus_name)
		AudioServer.set_bus_send(idx, "Master")
	AudioServer.set_bus_volume_db(idx, db)

func play_click() -> void:
	_oneshot(_click, -10.0 + _gain(Settings.sfx))

func _chirp() -> void:
	var t := Timer.new()
	t.wait_time = 7.0
	t.autostart = true
	t.timeout.connect(func():
		if _oneshots >= MAX_ONESHOTS:
			return
		_oneshot(_blip(900.0 + randf() * 180.0, 0.07), -16.0 + _gain(Settings.sfx))
	)
	add_child(t)

func _gain(linear: float) -> float:
	return linear_to_db(maxf(linear, 0.001))

func _bed(bus_name: String, stream: AudioStreamWAV, db: float) -> void:
	stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
	stream.loop_begin = 0
	stream.loop_end = stream.data.size() / 2
	var p := AudioStreamPlayer.new()
	p.name = bus_name
	p.stream = stream
	p.volume_db = db
	p.bus = "Ambience"
	p.max_polyphony = 1
	add_child(p)
	p.play()

func _oneshot(stream: AudioStream, db: float) -> void:
	if _oneshots >= MAX_ONESHOTS:
		return
	_oneshots += 1
	var p := AudioStreamPlayer.new()
	p.stream = stream
	p.volume_db = db
	p.bus = "SFX"
	p.max_polyphony = 1
	add_child(p)
	p.finished.connect(func():
		_oneshots = maxi(_oneshots - 1, 0)
		p.queue_free()
	)
	p.play()

static func _air(seconds: float, cutoff: float, amp: float) -> AudioStreamWAV:
	var n := int(RATE * seconds)
	var data := PackedByteArray()
	data.resize(n * 2)
	var hold := 0.0
	var seed := 17
	for i in n:
		seed = (seed * 1103515245 + 12345) & 0x7fffffff
		var white := float(seed % 2000) / 1000.0 - 1.0
		var a := exp(-TAU * cutoff / float(RATE))
		hold = hold * a + white * (1.0 - a)
		_store(data, i, hold * amp)
	_fade_ends(data, n, int(RATE * 0.03))
	return _wav(data)

static func _ticks(seconds: float) -> AudioStreamWAV:
	# A few soft pops a second, each with a decay, never a one-sample spike.
	var n := int(RATE * seconds)
	var data := PackedByteArray()
	data.resize(n * 2)
	var pops := int(seconds * 3.0)
	var rng := RandomNumberGenerator.new()
	rng.seed = 1407
	var fade := int(RATE * 0.04)
	for _p in pops:
		var at := rng.randi_range(fade, n - fade - int(RATE * 0.03))
		var amp := rng.randf_range(0.08, 0.16) * (1.0 if rng.randf() > 0.5 else -1.0)
		var decay := int(RATE * 0.012)
		for k in decay:
			var env := 1.0 - float(k) / float(decay)
			var prev := _read(data, at + k)
			_store(data, at + k, prev + amp * env * env)
	_fade_ends(data, n, fade)
	return _wav(data)

static func folk_loop() -> AudioStreamWAV:
	# Original daf pulse and a short original phrase. Not a recording
	# and not any published Newroz song.
	var seconds := 8.0
	var n := int(RATE * seconds)
	var data := PackedByteArray()
	data.resize(n * 2)
	var phrase := [293.66, 329.63, 349.23, 392.0, 349.23, 329.63, 293.66, 261.63]
	for i in n:
		var t := float(i) / float(RATE)
		var beat := int(t * 2.0) % phrase.size()
		var local := fmod(t * 2.0, 1.0)
		var env := sin(clampf(local, 0.0, 1.0) * PI)
		var freq: float = phrase[beat]
		var tone := sin(TAU * freq * t) * 0.11 * env
		tone += sin(TAU * freq * 2.0 * t) * 0.025 * env
		var step := fmod(t * 2.0, 1.0)
		var thump := exp(-step * 18.0) * 0.16
		var tak := 0.0
		var off := fmod(t * 2.0 + 0.5, 1.0)
		if off < 0.04:
			tak = (1.0 - off / 0.04) * 0.05
		_store(data, i, tone + thump + tak)
	_fade_ends(data, n, int(RATE * 0.04))
	var stream := _wav(data)
	stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
	stream.loop_begin = 0
	stream.loop_end = n
	return stream

static func seam(stream: AudioStreamWAV) -> float:
	var n := stream.data.size() / 2
	if n < 2:
		return 1.0
	return absf(_read(stream.data, 0) - _read(stream.data, n - 1))

static func peak(stream: AudioStreamWAV) -> float:
	var n := stream.data.size() / 2
	var m := 0.0
	for i in n:
		m = maxf(m, absf(_read(stream.data, i)))
	return m

static func mixed_peak() -> float:
	var beds := [_air(3.2, 80.0, 0.06)]
	var gains := [db_to_linear(-10.0)]
	var n := 44100
	var m := 0.0
	for i in n:
		var s := 0.0
		for b in beds.size():
			var len: int = int(beds[b].data.size()) / 2
			s += _read(beds[b].data, i % len) * gains[b]
		m = maxf(m, absf(s))
	return m

static func _blip(freq: float, seconds: float) -> AudioStreamWAV:
	var n := maxi(int(RATE * seconds), 8)
	var data := PackedByteArray()
	data.resize(n * 2)
	for i in n:
		var env := 1.0 - float(i) / float(n)
		_store(data, i, sin(TAU * freq * float(i) / float(RATE)) * env * 0.25)
	return _wav(data)

static func _wav(data: PackedByteArray) -> AudioStreamWAV:
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = RATE
	stream.stereo = false
	stream.data = data
	return stream

static func _fade_ends(data: PackedByteArray, n: int, fade: int) -> void:
	fade = mini(fade, n / 4)
	for i in fade:
		var g := float(i) / float(fade)
		_store(data, i, _read(data, i) * g)
		_store(data, n - 1 - i, _read(data, n - 1 - i) * g)

static func _read(data: PackedByteArray, i: int) -> float:
	var lo := int(data[i * 2])
	var hi := int(data[i * 2 + 1])
	var v := lo | (hi << 8)
	if v >= 32768:
		v -= 65536
	return float(v) / 32000.0

static func _store(data: PackedByteArray, i: int, sample: float) -> void:
	var v := int(clampf(sample, -1.0, 1.0) * 32000.0)
	if v < 0:
		v += 65536
	data[i * 2] = v & 255
	data[i * 2 + 1] = (v >> 8) & 255

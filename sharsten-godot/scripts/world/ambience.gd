extends Node

## Original procedural beds. No sampled music and no copied melody.

var _click: AudioStreamWAV

func _ready() -> void:
	add_to_group("ambience")
	_bed("wind", _air(3.2, 90.0, 0.22), -16.0)
	_bed("murmur", _air(2.4, 220.0, 0.05), -28.0)
	_bed("crackle", _ticks(1.8), -14.0)
	_bed("theme", _theme(), -18.0)
	_click = _blip(880.0, 0.045)
	_chirp()

func play_click() -> void:
	_play(_click, -6.0 + _gain(Settings.sfx), false)

func _chirp() -> void:
	var t := Timer.new()
	t.wait_time = 5.5
	t.autostart = true
	t.timeout.connect(func():
		_play(_blip(1400.0 + randf() * 400.0, 0.09), -12.0 + _gain(Settings.sfx), false)
	)
	add_child(t)

func _gain(linear: float) -> float:
	return linear_to_db(maxf(linear, 0.001))

func _bed(bus_name: String, stream: AudioStreamWAV, db: float) -> void:
	stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
	stream.loop_end = stream.data.size() / 2
	_play(stream, db + _gain(Settings.ambience), true)

func _play(stream: AudioStream, db: float, looping: bool) -> void:
	var p := AudioStreamPlayer.new()
	p.stream = stream
	p.volume_db = db
	p.bus = "Master"
	add_child(p)
	if looping:
		p.play()
	else:
		p.finished.connect(p.queue_free)
		p.play()

func _air(seconds: float, cutoff: float, amp: float) -> AudioStreamWAV:
	var rate := 22050
	var n := int(rate * seconds)
	var data := PackedByteArray()
	data.resize(n * 2)
	var hold := 0.0
	var seed := 17
	for i in n:
		seed = (seed * 1103515245 + 12345) & 0x7fffffff
		var white := float(seed % 2000) / 1000.0 - 1.0
		var a := exp(-TAU * cutoff / float(rate))
		hold = hold * a + white * (1.0 - a)
		_store(data, i, hold * amp)
	return _wav(data, rate)

func _ticks(seconds: float) -> AudioStreamWAV:
	var rate := 22050
	var n := int(rate * seconds)
	var data := PackedByteArray()
	data.resize(n * 2)
	var seed := 3
	for i in n:
		seed = (seed * 1664525 + 1013904223) & 0x7fffffff
		var pop := 1.0 if (seed % 1800) < 18 else 0.0
		var env := 1.0 - float(seed % 1800) / 1800.0
		_store(data, i, pop * env * 0.35 * (1.0 if (seed % 2) == 0 else -1.0))
	return _wav(data, rate)

func _theme() -> AudioStreamWAV:
	var rate := 22050
	var seconds := 8.0
	var n := int(rate * seconds)
	var data := PackedByteArray()
	data.resize(n * 2)
	var notes := [196.0, 233.08, 261.63, 293.66, 349.23, 293.66, 261.63, 233.08]
	for i in n:
		var beat := int(float(i) / rate * 2.0) % notes.size()
		var freq: float = notes[beat]
		var phase := float(i) / rate
		var local := fmod(phase * 2.0, 1.0)
		var env := sin(local * PI)
		var s := sin(TAU * freq * phase) * 0.22 * env
		s += sin(TAU * freq * 0.5 * phase) * 0.08
		_store(data, i, s)
	return _wav(data, rate)

func _blip(freq: float, seconds: float) -> AudioStreamWAV:
	var rate := 22050
	var n := maxi(int(rate * seconds), 8)
	var data := PackedByteArray()
	data.resize(n * 2)
	for i in n:
		var env := 1.0 - float(i) / float(n)
		_store(data, i, sin(TAU * freq * float(i) / rate) * env * 0.4)
	return _wav(data, rate)

func _wav(data: PackedByteArray, rate: int) -> AudioStreamWAV:
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = rate
	stream.stereo = false
	stream.data = data
	return stream

func _store(data: PackedByteArray, i: int, sample: float) -> void:
	var v := int(clampf(sample, -1.0, 1.0) * 32000.0)
	data[i * 2] = v & 255
	data[i * 2 + 1] = (v >> 8) & 255

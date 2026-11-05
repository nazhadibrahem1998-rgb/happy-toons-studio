extends RefCounted
class_name VillagePaths

## Grid path around house footprints. A cell that sits on a door is open,
## so a resident can walk from the lane into the house and back out to work.

static func reaches(start: Vector2, goal: Vector2, blocks: Array, doors: Array, step: float = 1.6, bounds: Rect2 = Rect2()) -> bool:
	return route(start, goal, blocks, doors, step, bounds).size() >= 2

static func route(start: Vector2, goal: Vector2, blocks: Array, doors: Array, step: float = 1.6, bounds: Rect2 = Rect2()) -> PackedVector2Array:
	var path := PackedVector2Array()
	if start.distance_to(goal) < step:
		path.append(start)
		path.append(goal)
		return path
	var open := {}
	var came := {}
	var cost := { _key(start, step): 0.0 }
	var pending: Array = [start]
	open[_key(start, step)] = start
	var guard := 0
	while pending.size() > 0 and guard < 4000:
		guard += 1
		var best_i := 0
		var best := 1.0e9
		for i in pending.size():
			var p: Vector2 = pending[i]
			var score: float = float(cost[_key(p, step)]) + p.distance_to(goal)
			if score < best:
				best = score
				best_i = i
		var cur: Vector2 = pending[best_i]
		pending.remove_at(best_i)
		if cur.distance_to(goal) <= step:
			path = _rebuild(came, cur, step)
			path.append(goal)
			return path
		for off in [Vector2(step, 0), Vector2(-step, 0), Vector2(0, step), Vector2(0, -step)]:
			var nxt: Vector2 = cur + off
			if bounds.size != Vector2.ZERO and not bounds.has_point(nxt):
				continue
			if _blocked(nxt, blocks, doors):
				continue
			var key := _key(nxt, step)
			var next_cost := float(cost[_key(cur, step)]) + step
			if cost.has(key) and float(cost[key]) <= next_cost:
				continue
			cost[key] = next_cost
			came[key] = cur
			if not open.has(key):
				open[key] = nxt
				pending.append(nxt)
	return path

static func _rebuild(came: Dictionary, cur: Vector2, step: float) -> PackedVector2Array:
	var out := PackedVector2Array()
	var guard := 0
	while guard < 400:
		guard += 1
		out.insert(0, cur)
		var key := _key(cur, step)
		if not came.has(key):
			break
		cur = came[key]
	return out

static func _blocked(p: Vector2, blocks: Array, doors: Array) -> bool:
	for door in doors:
		var at: Vector2 = door
		if p.distance_to(at) < 1.7:
			return false
	for block in blocks:
		var mn: Vector2 = block[0]
		var mx: Vector2 = block[1]
		if p.x > mn.x and p.x < mx.x and p.y > mn.y and p.y < mx.y:
			return true
	return false

static func _key(p: Vector2, step: float) -> String:
	return "%d:%d" % [int(round(p.x / step)), int(round(p.y / step))]

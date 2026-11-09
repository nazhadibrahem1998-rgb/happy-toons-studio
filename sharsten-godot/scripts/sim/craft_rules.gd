extends RefCounted
class_name CraftRules

static func can_pay(bag: Dictionary, cost: Dictionary) -> bool:
	for k in cost.keys():
		if int(bag.get(k, 0)) < int(cost[k]):
			return false
	return true

static func pay(bag: Dictionary, cost: Dictionary) -> void:
	for k in cost.keys():
		var left := int(bag.get(k, 0)) - int(cost[k])
		if left <= 0:
			bag.erase(k)
		else:
			bag[k] = left

static func give(bag: Dictionary, item: String, n: int) -> void:
	var left := int(bag.get(item, 0)) + n
	if left <= 0:
		bag.erase(item)
	else:
		bag[item] = left

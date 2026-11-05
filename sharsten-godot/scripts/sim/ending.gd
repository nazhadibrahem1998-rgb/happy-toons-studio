extends RefCounted
class_name Ending

const BANNER := "Part 2 coming in an update"
const WHITE_THOUGHT := "The grove has folded back. I am at its gate again."
const RED_THOUGHT := "The dream cracks. I wake in the real Sharsten, worn down after a long collapse. The machines are only relics. No one is named, and no banner is raised."

static func apply(state: Dictionary, color: String, final_start: Dictionary) -> Dictionary:
	if color == "white":
		state["phase"] = "dream"
		state["dream_loops"] = int(state.get("dream_loops", 0)) + 1
		var p: Dictionary = state.get("player", {})
		p["x"] = float(final_start.get("x", 67.2))
		p["y"] = 0.0
		p["z"] = float(final_start.get("z", 8.4))
		p["yaw"] = float(final_start.get("yaw", 0.0))
		p["pitch"] = -0.05
		state["player"] = p
		var flags: Dictionary = state.get("flags", {})
		flags.erase("altar_used")
		state["flags"] = flags
		state["result"] = "loop"
		state["thought"] = WHITE_THOUGHT
		return state
	if color == "red":
		state["phase"] = "woke"
		var flags2: Dictionary = state.get("flags", {})
		flags2["ending"] = "red"
		flags2["altar_used"] = true
		state["flags"] = flags2
		state["result"] = "woke"
		state["banner"] = BANNER
		state["thought"] = RED_THOUGHT
		return state
	state["result"] = "no"
	return state

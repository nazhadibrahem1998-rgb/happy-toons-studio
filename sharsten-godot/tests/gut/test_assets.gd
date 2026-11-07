extends GutTest

func test_asset_manifest_files_exist() -> void:
	var manifest := FileAccess.get_file_as_string("res://assets/ASSET_MANIFEST.txt")
	assert_false(manifest.is_empty(), "the licence manifest is present")
	var count := 0
	for raw in manifest.split("\n"):
		var line := raw.strip_edges()
		if line.is_empty() or line.begins_with("#"):
			continue
		assert_true(FileAccess.file_exists(line), "missing %s" % line)
		count += 1
	assert_gte(count, 12, "the manifest lists the new art and audio")

func test_horse_and_donkey_keep_a_walk_clip() -> void:
	for path in ["res://assets/animals/quaternius/Horse.fbx", "res://assets/animals/quaternius/Donkey.fbx"]:
		var packed = load(path)
		assert_not_null(packed, path)
		var model = packed.instantiate()
		var anim = model.find_child("AnimationPlayer", true, false)
		assert_not_null(anim, path)
		assert_true(anim.has_animation("AnimalArmature|Walk"), path)
		assert_true(anim.has_animation("AnimalArmature|Idle"), path)
		model.free()

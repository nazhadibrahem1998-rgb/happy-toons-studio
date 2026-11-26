# Sharsten trailer capture

`tools/trailer_capture.tscn` plays one silent cinematic shot with the gameplay HUD hidden. Godot Movie Maker writes every frame at a fixed rate. Encode the AVI to H.264 afterwards.

Shots, each 6–10 seconds: `establish`, `routines`, `craft`, `diary`, `spring`, `wake`, `ruins`.

On Windows, from the folder that contains `Sharsten.exe`:

```
Sharsten.exe --write-movie out.avi --fixed-fps 30 --resolution 3840x2160 -- --trailer-shot=establish
```

Replace `establish` with any shot name. `--fixed-fps 30` is forced by Movie Maker; pass it anyway so the rate is explicit. `--resolution 3840x2160` is native 4K.

The same command works with a Godot editor binary:

```
godot --path sharsten-godot --rendering-method gl_compatibility --write-movie out.avi --fixed-fps 30 --resolution 3840x2160 res://tools/trailer_capture.tscn
```

Set the shot with the environment variable `TRAILER_SHOT` or with `-- --trailer-shot=ruins` after the scene path.

Forward+ on a gaming GPU can carry High or Ultra. This VM only finishes frames on the Compatibility renderer, so the checked-in captures were made that way. A real GPU should drop `--rendering-method gl_compatibility` and let the project use Forward+.

Encode, then delete the AVI:

```
ffmpeg -y -i out.avi -an -c:v libx264 -pix_fmt yuv420p -crf 16 shot.mp4
```

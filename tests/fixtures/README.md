# Media fixture

held-video.webm is a locally generated six-second 320x180, 12 fps VP8/Opus clip. FFmpeg testsrc2 supplies the moving pattern; a quiet synthetic sine supplies an audio track. No user recording is included.

```sh
ffmpeg -f lavfi -i 'testsrc2=size=320x180:rate=12:duration=6' -f lavfi -i 'sine=frequency=440:sample_rate=48000:duration=6' -filter:a volume=0.03 -c:v libvpx -deadline realtime -cpu-used 8 -b:v 180k -c:a libopus -b:a 24k -threads 1 -shortest held-video.webm
```

Electron media tests use --mute-audio. Playback/cleanup checks inspect media-element state and decoded frames; they do not claim listening verification.

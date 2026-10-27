# Low Poly Mario

A locally runnable voxel platformer inspired by the progression of World 1-1. The course, simulation, models, and synthesized sounds are included; Three.js 0.179.1 is vendored in `vendor/` under its MIT license. No account, build, or CDN is required.

## Play

From this directory, start a local web server:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/> in a WebGL-capable browser. A local server is needed because the game uses JavaScript modules.

- **A / D** or **Left / Right:** move
- **Space**, **W**, or **Up:** jump; hold for a higher jump
- **Shift** or **X:** run; also throw fireballs in Fire form
- **Down / S:** duck, or enter an eligible pipe while centered on top
- **P / Escape:** pause or resume
- **R:** restart the run
- **Enter:** start, resume, or play again

On touch devices, use the on-screen controls. Hold a direction while pressing jump. Sound starts after a gesture; the music button mutes music and effects.

Collect coins and power-ups, find three secrets, and touch the flag to reach the castle. A checkpoint is available halfway through the surface route. Remaining time is converted to score at the finish. Run time counts active gameplay, excluding pauses, transformations, pipe travel, death sequences, and the finish celebration. Personal records are stored in browser storage when available.

## Validation

```sh
npm test
```

The tests run the authoritative simulation directly; they do not need a browser or installed npm dependencies. See [FEATURE_AUDIT.md](FEATURE_AUDIT.md) for the candidate review, changes, checks, and remaining limitations.

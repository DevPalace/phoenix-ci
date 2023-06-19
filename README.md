# phoenix-ci

[Implementation example can be found here](https://github.com/DevPalace/phoenix-ci-example)
[Job execution example](https://github.com/DevPalace/phoenix-ci/actions/runs/5315712099)

**Features:**
- Parallel Nix CI jobs execution
- Checking if the job should be executed
- Actions execution support (Like pushing an artifact or deploying applications)
- Github Cache powered /nix/store caching
- Github Cache powered Nix evaluation cache caching

**How it works?**
- `discovery` job gets executed which searches `flake.nix` for available targets to be built/deployed
- For each target `findWork` script gets executed which checks what should be done. In the case of derivations - it just checks if the derivation is already in the binary cache
- If there is work to be done, each ci-work-unit gets assigned to a seperate build machine thus improving CI performance
- Per each job `/nix/store` gets cached using Github Cache thus heavily reducing network overhead


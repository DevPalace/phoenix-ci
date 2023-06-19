{
  description = "A very basic flake";

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

      mkEffectWithDeps = drv: {
        type = "effect";
        inherit (drv) drvPath;
        inherit drv;
        deps = {
          inherit (pkgs) hello;
        };

        discoverTargets = ''
          await execUtils.execCommandPipeOutput(target.deps.hello.path + "/bin/hello", [])
          const isUncached = await nix.isUncachedDrv(target.drvPath)
          return isUncached
            ? { build: [`''${target.attrPath}.drv`] }
            : {}
        '';

      };

    in
    {

      packages.x86_64-linux.test1 = nixpkgs.legacyPackages.x86_64-linux.writeText "test1" "test1";
      packages.x86_64-linux.test2 = nixpkgs.legacyPackages.x86_64-linux.writeText "test2" "test2";

      ci.x86_64-linux.default = {
        coreutils = pkgs.coreutils;
        bash = pkgs.bash;
        effectWithDeps = mkEffectWithDeps self.packages.x86_64-linux.test1;
      };
    };
}

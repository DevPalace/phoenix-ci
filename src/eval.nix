with builtins;
path: attrPaths:
let
  # Helper funcitons
  t = it: trace (toJSON it) it;

  splitAttrPathString = attrPath: filter isString (split "\\." attrPath);

  flatten = x:
    if isList x
    then concatMap (y: flatten y) x
    else [ x ];

  drop = count: list:
    let len = length list; in
    genList
      (n: elemAt list (n + count))
      (if count >= len then 0
      else if count + (length list) > len then len - count
      else length list);

  # Drv/Effect handling
  mkDrvEffect = drv: {
    inherit (drv) drvPath;
    type = "effect";
    discoverTargets = ''
      const isUncached = await nix.isUncachedDrv(target.drvPath)
      return isUncached
        ? { build: [target.attrPath] }
        : {}
    '';
  };


  mapEffect = baseAttrPath: name: effect: effect // {
    attrPath = "${baseAttrPath}.${name}";
    discoverTargets = if isPath effect.discoverTargets then readFile effect.discoverTargets else effect.discoverTargets;
    deps =
      if hasAttr "deps" effect then
        mapAttrs (_: it: { inherit (it) drvPath; path = it.outPath; }) effect.deps
      else { };
  };

  mapTarget = baseAttrPath: name: value:
    if (value.type or "") == "derivation" then
      mapEffect baseAttrPath name (mkDrvEffect value)
    else if (value.type or "") == "effect" then
      mapEffect baseAttrPath name value
    else throw "Unsupported target '${name}' format. Accepted types are derivations and effects";


  # Discovery
  flakeOutputs = (getFlake path).outputs;
  attrPaths' = map splitAttrPathString attrPaths;

  # Accesses attribute by string path and returns it as well as the string path of it
  findAttribute = attr: attrPathArr: attrPathStr:
    let
      pathKey = head attrPathArr;
    in
    if attrPathArr != [ ] then
      findAttribute attr.${pathKey} (drop 1 attrPathArr) "${attrPathStr}.${pathKey}"
    else {
      inherit attr;
      attrPathStr = substring 1 (stringLength attrPathStr) attrPathStr;
    };


  # We `findAttribute` and convert them to effects using `mapTarget`
  getHits = attrPath:
    let
      foundAttrs = findAttribute flakeOutputs attrPath "";
    in
    attrValues (mapAttrs (mapTarget foundAttrs.attrPathStr) (foundAttrs).attr);
in
flatten (map getHits attrPaths')

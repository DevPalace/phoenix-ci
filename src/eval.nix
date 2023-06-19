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

  # Drv/WorkUnit handling
  mkDrvWorkUnit = drv: {
    inherit (drv) drvPath;
    type = "ci-work-unit";
    findWork = ''
      const isUncached = await nix.isUncachedDrv(self.drvPath)
      return isUncached
        ? { build: [self.attrPath] }
        : {}
    '';
  };


  mapWorkUnit = baseAttrPath: name: workUnit: workUnit // {
    attrPath = "${baseAttrPath}.${name}";
    findWork = if isPath workUnit.findWork then readFile workUnit.findWork else workUnit.findWork;
    findWorkDeps =
      if hasAttr "findWorkDeps" workUnit then
        mapAttrs (_: it: { inherit (it) drvPath; path = it.outPath; }) workUnit.findWorkDeps
      else { };
  };

  mapTarget = baseAttrPath: name: value:
    if (value.type or "") == "derivation" then
      mapWorkUnit baseAttrPath name (mkDrvWorkUnit value)
    else if (value.type or "") == "ci-work-unit" then
      mapWorkUnit baseAttrPath name value
    else throw "Unsupported target '${name}' format. Accepted types are derivations and ci-work-unit";


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


  # We `findAttribute` and convert them to work units using `mapTarget`
  getHits = attrPath:
    let
      foundAttrs = findAttribute flakeOutputs attrPath "";
    in
    attrValues (mapAttrs (mapTarget foundAttrs.attrPathStr) (foundAttrs).attr);
in
flatten (map getHits attrPaths')

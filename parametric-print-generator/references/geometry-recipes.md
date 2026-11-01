# Geometry recipes (manifold-3d 3.0.0)

All snippets assume, inside `build(p)`:

```js
const { CrossSection, Manifold } = W;
const trash = []; const T = o => (trash.push(o), o);          // delete all at the end
const rect = (x0, y0, x1, y1) => T(new CrossSection([[[x0,y0],[x1,y0],[x1,y1],[x0,y1]]], 'NonZero'));
const poly = pts => T(new CrossSection([pts], 'NonZero'));
// profile (u, z) extruded along X, placed at x0 / y0:
const prism = (cs, len, x0, y0) => T(T(T(cs.extrude(len)).rotate([90, 0, 90])).translate([x0, y0, 0]));
```

Coordinates: mm, Z up, model centred in XY, z = 0 on the print bed (for wall parts: the wall side).

## Honeycomb lattice

`hexPolys(x0, y0, x1, y1, cell, web, rot)` is in the template (pointy-top hexes, rows offset by cell/2,
anchored at the origin so the pattern is symmetric). `cell` = centre-to-centre pitch, `web` = wall between cells.

```js
const latticeIn = (region, cell, web) => {
  const b = region.bounds();
  const hp = hexPolys(b.min[0], b.min[1], b.max[0], b.max[1], cell, web, p.hexRot === 90);
  return hp.length ? T(region.subtract(T(new CrossSection(hp, 'NonZero')))) : region;
};
plateParts.push(T(T(latticeIn(area, p.baseCell, p.baseWeb)).extrude(p.baseH)));
```

Plate only where needed: `area = plateRect − union(footprints)` (e.g. honeycomb only between strips),
plus an optional frame `area − inset(area)`.

## Wedge / French-cleat profile

Top width `wt` (support surface), height `h` above a plate of height `bH`, wedge angle `a` from vertical,
undercut on +u side (flip with `u → wt − u`):

```js
const dW = h * Math.tan(a * Math.PI / 180), wb = wt - dW;    // foot width
const H = bH + h;
const outer = [[0,0],[wb,0],[wb,bH],[wt,H],[0,H]];            // foot runs straight through the plate height
```

Pitch between strips = `wt + gap`; auto count `n = floor((size + gap) / pitch)`; centre the block.
For modular grids the module size should be `n × pitch` so spacing continues across modules – warn otherwise.

## Hollow shell, open top and bottom, honeycomb inside

```js
const e = 2, uAt = z => wb + (z - bH) * dW / h;               // extend the slanted side beyond the z-range
const innerRaw = [[0,-e],[wb,-e],[wb,bH],[uAt(H+e),H+e],[0,H+e]];
const innerCS = T(T(new CrossSection([innerRaw], 'NonZero')).offset(-wall, 'Miter', 10));
const outerP = prism(T(new CrossSection([outer], 'NonZero')), L, xL, ys);
const innerP = prism(innerCS, closedEnds ? L - 2*wall : L + 2, closedEnds ? xL + wall : xL - 1, ys);
parts.push(T(outerP.subtract(innerP)));                       // side + end walls only
const bb = innerP.boundingBox();
const reg = rect(bb.min[0]-1, bb.min[1]-1, bb.max[0]+1, bb.max[1]+1);
parts.push(T(T(T(latticeIn(reg, fillCell, fillWeb)).extrude(H)).intersect(innerP)));
```

Guard: `if (innerCS.area() < 0.01)` → use the solid profile and warn.

## Countersunk screw hole with solid boss

```js
const hr = holeD/2, rr = headD/2, rb = rr + bossWall;
const csDepth = (rr - hr) / Math.tan(csAngle/2 * Math.PI/180);  // 90° → (rr - hr)
parts.push(T(T(T(Manifold.cylinder(H, rb, rb, segs)).translate([x, y, 0])).intersect(outerP)));  // boss inside the profile
cuts.push(T(T(Manifold.cylinder(H + 2, hr, hr, segs)).translate([x, y, -1])));
cuts.push(T(T(Manifold.cylinder(csDepth, hr, rr, segs)).translate([x, y, H - csDepth])));
cuts.push(T(T(Manifold.cylinder(2, rr, rr, segs)).translate([x, y, H - 0.001])));
```

Place holes where the material is widest at the bottom (e.g. centre of the foot, not of the top) so the bore
does not break through a slanted face. Hole rows: all / first+last / first+middle+last / every 2nd / manual list.
Holes per row: explicit count (default 3) or auto `max(2, round(usable/95) + 1)`.

## Dovetail socket + plug-in key (inserted perpendicular to the wall, from the front)

```js
const dovetail = (base, sign, cx, w1, w2, d) =>              // narrow (w1) at the face, wide (w2) at depth d
  poly([[cx - w1/2, base], [cx - w2/2, base + sign*d], [cx + w2/2, base + sign*d], [cx + w1/2, base]]);
// socket in the part (open top and bottom), with a solid wall around it:
const sock = dovetail(face, +1, x, w1, w2, d);
parts.push(T(T(T(sock.offset(wallAround, 'Miter', 4)).extrude(H)).intersect(stripOuter)));
cuts.push(T(T(T(sock.offset(clearance, 'Miter', 4)).extrude(H + 2)).translate([0, 0, -1])));
// key = nominal heads (∩ the strip profile so the strip looks continuous) + flat tab across the gap:
const headA = T(T(T(dovetail(faceA, +1, x, w1, w2, d).extrude(H + 2)).translate([0,0,-1])).intersect(stripA));
const headB = T(T(T(dovetail(faceB, -1, x, w1, w2, d).extrude(H + 2)).translate([0,0,-1])).intersect(stripB_ofNeighbour));
const tab   = T(rect(x - w1/2, faceB, x + w1/2, faceA).extrude(tabH));
const key   = T(Manifold.union([headA, headB, tab]));
```

The neighbour's strip is the same strip translated by the module pitch (`stripOuter.translate([0, -SY, 0])`).

## Triangular pin channel (pushed in sideways, tip up)

Triangle base `tb`, flank angle `α` (60° = equilateral), raised by `zf` (e.g. the plate height, so the
channel has a closed floor). Channels print without support because the tip points up.

```js
const th = tb/2 * Math.tan(α * Math.PI/180);
const tri = c => { const cs = poly([[-tb/2, zf], [tb/2, zf], [0, zf + th]]); return c > 0 ? T(cs.offset(c, 'Miter', 10)) : cs; };
// channel along X into a strip end (yc = foot centre):
cuts.push(T(T(T(tri(clear).extrude(depth + clear + 1)).rotate([90, 0, 90])).translate([xL - 1, yc, 0])));
// only a wall around the channel (+ floor), honeycomb stays above it:
const shell = T(T(T(tri(clear + wall).extrude(depth + clear + wall + 1)).rotate([90, 0, 90])).translate([xL - 1, yc, 0]));
const floor = T(T(Manifold.cube([depth + clear + wall + 1, tb + 2*(clear + wall), zf + 0.01])).translate([xL - 1, yc - tb/2 - clear - wall, 0]));
parts.push(T(T(Manifold.union([shell, floor])).intersect(stripOuter)));
// along Y instead: .rotate([90, 0, 0]) extrudes towards −Y.
```

Pin length `2·depth − 2·axialClearance`; chamfer the ends with `extrude(ch, 0, 0, [s, s])` on a profile
translated so its centroid is at the origin.

## Separate print parts (pins / keys)

- Keep two lists: `pinsShow` (assembled position, shown in the viewer in the part colour) and `pinsPrint`
  (laid flat in a row for printing, one module's worth). Export `pinsPrint` via a `Stifte STL` button.
- Tolerances as parameters: across (per side) and length (per end), defaults 0.15 / 0.3 mm.

## Two colour bodies

```js
const cut = cuts.length ? T(Manifold.union(cuts)) : null;
const sub = m => cut ? T(m.subtract(cut)) : m;
const bodyB = sub(T(Manifold.union(partsB)));
const bodyA = T(sub(T(Manifold.union(partsA))).subtract(bodyB));   // no overlap
const result = Manifold.union(bodyA, bodyB);
// split by height instead: result ∩ box(z < zSplit) / result ∩ box(z > zSplit)
```

Return copies (`bodyA.translate([0,0,0])`) because `bodyA` is in `trash`.

## Viewer helpers

- `toGeo(man)` converts to a non-indexed `BufferGeometry` with flat normals (x, z, −y).
- Neighbour ghosts: reuse the geometry, `MeshStandardMaterial({ transparent, opacity: .35, depthWrite: false })`,
  positions `(±SX, 0)`, `(0, ±SY)`.
- X-ray: set `transparent = true, opacity ≈ 0.32, depthWrite = false` on the part materials.
- Optional surface preview (e.g. chipboard): canvas texture with random flakes on a box under the model.

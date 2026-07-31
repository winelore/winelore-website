# Wine-region map data

`eu-wine-pdo.geojson` contains 1,177 municipality-level European wine PDO
boundaries simplified to 500 metres for interactive-map use.

- Boundary source: [A geospatial inventory of regulatory information for wine
  protected designations of origin in
  Europe](https://doi.org/10.6084/m9.figshare.c.5877659.v1), CC0 1.0.
- Boundary coverage date: 2021-11-04.
- GI identifiers and statuses were matched by `fileNumber` against the current
  [eAmbrosia API](https://webgate.ec.europa.eu/eambrosia-api/) when this file
  was generated.
- Rebuild with `scripts/build-wine-regions.py`; the 44 MB source GeoPackage is
  intentionally not committed.

These polygons indicate that a coordinate lies inside a mapped PDO production
area. They do not establish that a beverage is certified to use that PDO.

`ukraine-wine-regions.geojson` contains six contemporary Ukrainian wine
geographical indications registered by the
[Ukrainian NIPO](https://nipo.gov.ua/reiestr-heohrafichnykh-zaznachen/):
Chabag, Acha-Abag, Danubian Bessarabia, Yalpuh, Zakarpattia Wine, and
Frumushika Valley.

Their polygons are reconstructed from the geographic definitions in the
official product specifications and the Ukraine Common Operational
administrative-boundary dataset:

- Source: [Ukraine - Subnational Administrative Boundaries](https://data.humdata.org/dataset/cod-ab-ukr)
- Contributor: OCHA Ukraine; quality-assured and published by OCHA FIS/HDX
- Boundary version: 2025-09-01
- License: Creative Commons Attribution for Intergovernmental Organisations
  (CC BY-IGO)

Some Ukrainian specifications describe an area using communities/districts and
coordinate extents rather than publishing a reusable vector boundary. Those
features carry an internal `coverage` property so their reconstructed geometry
is not confused with a surveyed legal boundary.

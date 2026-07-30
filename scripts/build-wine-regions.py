#!/usr/bin/env python3
"""Build the browser-friendly EU wine PDO layer used by the beverages map.

Source datasets:
  * EU_PDO.gpkg and PDO_EU_id.csv from
    https://doi.org/10.6084/m9.figshare.c.5877659.v1 (CC0)
  * Optional current eAmbrosia JSON from
    https://webgate.ec.europa.eu/eambrosia-api/api/v1/geographical-indications

The GeoPackage is deliberately not committed. This script simplifies its
municipality-level polygons, converts them from EPSG:3035 to WGS84, and adds
the compact metadata needed by the website.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

import geopandas
from shapely.geometry import mapping


SOURCE_URL = "https://doi.org/10.6084/m9.figshare.c.5877659.v1"
SOURCE_DATE = "2021-11-04"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--geopackage", required=True, type=Path)
    parser.add_argument("--metadata", required=True, type=Path)
    parser.add_argument("--eambrosia", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--simplify-metres", type=float, default=500)
    return parser.parse_args()


def round_coordinates(value: Any, digits: int = 5) -> Any:
    if isinstance(value, float):
        return round(value, digits)
    if isinstance(value, (list, tuple)):
        return [round_coordinates(item, digits) for item in value]
    return value


def load_metadata(path: Path) -> dict[str, dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return {
            row["PDOid"]: row
            for row in csv.DictReader(handle)
            if row.get("PDOid")
        }


def load_eambrosia(path: Path | None) -> dict[str, dict[str, Any]]:
    if not path:
        return {}

    with path.open(encoding="utf-8") as handle:
        records = json.load(handle)

    return {
        record["fileNumber"]: record
        for record in records
        if record.get("fileNumber")
        and record.get("productType") == "WINE"
        and not record.get("removedFlag", False)
    }


def main() -> None:
    args = parse_args()
    metadata_by_id = load_metadata(args.metadata)
    eambrosia_by_file = load_eambrosia(args.eambrosia)

    regions = geopandas.read_file(args.geopackage, layer="EU_PDO")
    regions["geometry"] = regions.geometry.simplify(
        args.simplify_metres,
        preserve_topology=True,
    )
    regions = regions.to_crs(epsg=4326)

    features: list[dict[str, Any]] = []
    matched_eambrosia = 0

    for row in regions.itertuples(index=False):
        pdo_id = row.PDOid
        metadata = metadata_by_id.get(pdo_id, {})
        eambrosia = eambrosia_by_file.get(pdo_id)
        if eambrosia:
            matched_eambrosia += 1

        min_x, min_y, max_x, max_y = row.geometry.bounds
        geometry = mapping(row.geometry)
        geometry["coordinates"] = round_coordinates(geometry["coordinates"])

        properties = {
            "id": pdo_id,
            "name": metadata.get("PDOnam") or pdo_id,
            "country": metadata.get("Country") or "",
            "bbox": round_coordinates([min_x, min_y, max_x, max_y]),
        }

        if eambrosia:
            properties.update(
                {
                    "eAmbrosiaId": eambrosia.get("giIdentifier"),
                    "type": eambrosia.get("giType"),
                    "status": eambrosia.get("status"),
                    "modifiedOn": eambrosia.get("modificationDate"),
                }
            )

        features.append(
            {
                "type": "Feature",
                "id": pdo_id,
                "properties": properties,
                "geometry": geometry,
            }
        )

    features.sort(key=lambda feature: feature["properties"]["id"])
    payload = {
        "type": "FeatureCollection",
        "metadata": {
            "title": "European wine PDO regions",
            "source": SOURCE_URL,
            "sourceDate": SOURCE_DATE,
            "license": "CC0-1.0",
            "simplificationMetres": args.simplify_metres,
            "featureCount": len(features),
            "eAmbrosiaMatches": matched_eambrosia,
        },
        "features": features,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        f"Wrote {len(features)} PDO regions "
        f"({matched_eambrosia} matched current eAmbrosia records) "
        f"to {args.output}"
    )


if __name__ == "__main__":
    main()

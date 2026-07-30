#!/usr/bin/env python3
"""Build the compact Ukrainian wine-region layer used by the beverages map.

Region definitions and registration metadata come from the Ukrainian NIPO
geographical-indications register. Administrative polygons come from the
Ukraine Common Operational Dataset maintained by OCHA and published on HDX.

The contemporary specifications describe some regions with exact coordinate
extents and others by districts or communities. This script clips/merges the
corresponding administrative polygons and marks broader reconstructions as
approximated in the internal metadata.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

NIPO_REGISTER_URL = "https://nipo.gov.ua/reiestr-heohrafichnykh-zaznachen/"
NIPO_API_URL = "https://sis.nipo.gov.ua/api/v1/open-data/"
BOUNDARY_DATASET_URL = "https://data.humdata.org/dataset/cod-ab-ukr"
BOUNDARY_SERVICE_URL = (
    "https://services6.arcgis.com/OO2s4OoyCZkYJ6oE/arcgis/rest/services/"
    "ukr_admin_boundaries_gdb/FeatureServer"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def fetch_geojson(layer: int, pcodes: list[str]) -> list[dict[str, Any]]:
    field = f"adm{layer}_pcode"
    quoted = ",".join(f"'{pcode}'" for pcode in pcodes)
    params = urlencode(
        {
            "where": f"{field} IN ({quoted})",
            "outFields": field,
            "returnGeometry": "true",
            "outSR": "4326",
            "geometryPrecision": "5",
            "maxAllowableOffset": "0.002",
            "f": "geojson",
        }
    )
    request = Request(
        f"{BOUNDARY_SERVICE_URL}/{layer}/query?{params}",
        headers={"User-Agent": "WineLoreWebsite/1.0 (contact@winelore.com)"},
    )
    with urlopen(request, timeout=30) as response:
        payload = json.load(response)

    if "error" in payload:
        raise RuntimeError(payload["error"])

    return [feature["geometry"] for feature in payload["features"]]


def round_coordinates(value: Any, digits: int = 5) -> Any:
    if isinstance(value, float):
        return round(value, digits)
    if isinstance(value, (list, tuple)):
        return [round_coordinates(item, digits) for item in value]
    return value


def rectangle(
    west: float,
    south: float,
    east: float,
    north: float,
) -> dict[str, Any]:
    return {
        "type": "Polygon",
        "coordinates": [[
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
        ]],
    }


def area_ellipse(
    lng: float,
    lat: float,
    area_hectares: float,
) -> dict[str, Any]:
    radius_km = math.sqrt((area_hectares / 100) / math.pi)
    latitude_degrees = radius_km / 111.32
    longitude_degrees = latitude_degrees / math.cos(math.radians(lat))
    points = [
        [
            lng + longitude_degrees * math.cos(math.radians(angle)),
            lat + latitude_degrees * math.sin(math.radians(angle)),
        ]
        for angle in range(0, 361, 5)
    ]
    return {"type": "Polygon", "coordinates": [points]}


def combine_polygons(geometries: list[dict[str, Any]]) -> dict[str, Any]:
    polygons: list[Any] = []
    for geometry in geometries:
        if geometry["type"] == "Polygon":
            polygons.append(geometry["coordinates"])
        elif geometry["type"] == "MultiPolygon":
            polygons.extend(geometry["coordinates"])
        else:
            raise ValueError(f"Unsupported geometry: {geometry['type']}")
    return {"type": "MultiPolygon", "coordinates": polygons}


def coordinate_pairs(value: Any) -> list[list[float]]:
    if (
        isinstance(value, list)
        and len(value) >= 2
        and isinstance(value[0], (int, float))
        and isinstance(value[1], (int, float))
    ):
        return [value]
    if isinstance(value, list):
        return [
            pair
            for child in value
            for pair in coordinate_pairs(child)
        ]
    return []


def make_feature(
    *,
    registration_number: str,
    name: str,
    local_name: str,
    registration_date: str,
    region_type: str,
    geometry: dict[str, Any],
    coverage: str,
) -> dict[str, Any]:
    pairs = coordinate_pairs(geometry["coordinates"])
    longitudes = [pair[0] for pair in pairs]
    latitudes = [pair[1] for pair in pairs]
    min_x, min_y = min(longitudes), min(latitudes)
    max_x, max_y = max(longitudes), max(latitudes)
    serialized_geometry = geometry
    serialized_geometry["coordinates"] = round_coordinates(
        serialized_geometry["coordinates"]
    )

    region_id = f"UA-GI-{registration_number}"
    return {
        "type": "Feature",
        "id": region_id,
        "properties": {
            "id": region_id,
            "name": name,
            "localName": local_name,
            "country": "UA",
            "bbox": round_coordinates([min_x, min_y, max_x, max_y]),
            "type": region_type,
            "status": "registered",
            "registrationNumber": registration_number,
            "registrationDate": registration_date,
            "coverage": coverage,
        },
        "geometry": serialized_geometry,
    }


def main() -> None:
    args = parse_args()

    danubian_bessarabia_districts = combine_polygons(
        fetch_geojson(2, ["UA5106", "UA5108"])
    )
    zakarpattia_districts = combine_polygons(
        fetch_geojson(2, ["UA2102", "UA2104", "UA2110", "UA2112"])
    )

    chabag_extent = rectangle(
        30.3080556,
        46.0891667,
        30.4130556,
        46.1586111,
    )
    yalpuh_extent = rectangle(
        28.4786111,
        45.4644444,
        28.7102778,
        45.7705556,
    )
    frumushika_extent = rectangle(
        29.3591667,
        46.1304194,
        29.4544753,
        46.3667861,
    )

    features = [
        make_feature(
            registration_number="3125",
            name="Chabag",
            local_name="ШАБАГ",
            registration_date="2023-12-20",
            region_type="Appellation",
            geometry=chabag_extent,
            coverage="approximated",
        ),
        make_feature(
            registration_number="3126",
            name="Acha-Abag",
            local_name="АША-АБАГ",
            registration_date="2023-12-20",
            region_type="Geographical indication",
            geometry=area_ellipse(30.385, 46.1269444, 2939.46),
            coverage="approximated",
        ),
        make_feature(
            registration_number="3127",
            name="Danubian Bessarabia",
            local_name="ПРИДУНАЙСЬКА БЕССАРАБІЯ",
            registration_date="2023-12-20",
            region_type="Geographical indication",
            geometry=danubian_bessarabia_districts,
            coverage="approximated",
        ),
        make_feature(
            registration_number="3128",
            name="Yalpuh",
            local_name="ЯЛПУГ",
            registration_date="2023-12-20",
            region_type="Appellation",
            geometry=yalpuh_extent,
            coverage="approximated",
        ),
        make_feature(
            registration_number="3129",
            name="Zakarpattia Wine",
            local_name="ЗАКАРПАТТЯ / ЗАКАРПАТСЬКЕ ВИНО",
            registration_date="2024-05-29",
            region_type="Geographical indication",
            geometry=zakarpattia_districts,
            coverage="defined",
        ),
        make_feature(
            registration_number="3132",
            name="Frumushika Valley",
            local_name="ДОЛИНА ФРУМУШИКА",
            registration_date="2024-07-24",
            region_type="Appellation",
            geometry=frumushika_extent,
            coverage="approximated",
        ),
    ]
    features.sort(key=lambda feature: feature["properties"]["name"])

    payload = {
        "type": "FeatureCollection",
        "metadata": {
            "title": "Ukrainian wine regions",
            "registry": NIPO_REGISTER_URL,
            "registryApi": NIPO_API_URL,
            "boundarySource": BOUNDARY_DATASET_URL,
            "boundaryLicense": "CC-BY-IGO",
            "boundaryVersion": "2025-09-01",
            "featureCount": len(features),
        },
        "features": features,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Wrote {len(features)} Ukrainian wine regions to {args.output}")


if __name__ == "__main__":
    main()

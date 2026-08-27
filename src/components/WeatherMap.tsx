import { useEffect, useRef, useState } from "react";

import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";

import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";

import WebTileLayer from "@arcgis/core/layers/WebTileLayer";
import ImageryLayer from "@arcgis/core/layers/ImageryLayer";
import WMSLayer from "@arcgis/core/layers/WMSLayer";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import TileLayer from "@arcgis/core/layers/TileLayer";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";

import BasemapToggle from "@arcgis/core/widgets/BasemapToggle";

import "@arcgis/core/assets/esri/themes/light/main.css";

/* =========================================================
   TYPES
   ========================================================= */

interface WeatherData {
  name: string;

  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };

  weather: {
    description: string;
    icon: string;
  }[];

  wind: {
    speed: number;
  };
}

interface WeatherMapProps {
  coordinates: {
    lat: number;
    lon: number;
  };

  weatherData: WeatherData | null;
}

interface LayerVisibility {
  precipitation: boolean;
  weatherAlerts: boolean;
  nir: boolean;
  ndvi: boolean;
  wildfire: boolean;
  airQuality: boolean;
  elevationTint: boolean;
  hillshade: boolean;
  contours: boolean;
  lidarCoverage: boolean;
}

/* =========================================================
   DEFAULT LAYER STATES
   ========================================================= */

const defaultLayerVisibility: LayerVisibility = {
  precipitation: true,
  weatherAlerts: false,
  nir: false,
  ndvi: false,
  wildfire: false,
  airQuality: false,
  elevationTint: false,
  hillshade: false,
  contours: false,
  lidarCoverage: false,
};

const allLayersOff: LayerVisibility = {
  precipitation: false,
  weatherAlerts: false,
  nir: false,
  ndvi: false,
  wildfire: false,
  airQuality: false,
  elevationTint: false,
  hillshade: false,
  contours: false,
  lidarCoverage: false,
};

/* =========================================================
   COMPONENT
   ========================================================= */

function WeatherMap({
  coordinates,
  weatherData,
}: WeatherMapProps) {
  const mapDiv = useRef<HTMLDivElement>(null);

  const viewRef =
    useRef<MapView | null>(null);

  const graphicRef =
    useRef<Graphic | null>(null);

  /* =======================================================
     LAYER REFERENCES
     ======================================================= */

  const precipitationRef =
    useRef<WebTileLayer | null>(null);

  const weatherAlertsRef =
    useRef<GeoJSONLayer | null>(null);

  const nirRef =
    useRef<ImageryLayer | null>(null);

  const ndviRef =
    useRef<ImageryLayer | null>(null);

  const wildfireRef =
    useRef<WMSLayer | null>(null);

  const airQualityRef =
    useRef<FeatureLayer | null>(null);

  const elevationTintRef =
    useRef<ImageryLayer | null>(null);

  const hillshadeRef =
    useRef<TileLayer | null>(null);

  const contourRef =
    useRef<MapImageLayer | null>(null);

  const lidarCoverageRef =
    useRef<FeatureLayer | null>(null);

  /* =======================================================
     UI STATE
     ======================================================= */

  const [layersOpen, setLayersOpen] =
    useState(false);

  const [
    layerVisibility,
    setLayerVisibility,
  ] =
    useState<LayerVisibility>(
      defaultLayerVisibility
    );

  const activeLayerCount =
    Object.values(
      layerVisibility
    ).filter(Boolean).length;

  /* =======================================================
     HELPERS
     ======================================================= */

  const formatDate = (
    value:
      | number
      | string
      | null
      | undefined
  ) => {
    if (!value) {
      return "Not available";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Not available";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  };

  const safeText = (
    value: unknown,
    fallback =
      "Not available"
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return fallback;
    }

    return String(value);
  };

  const safeUrl = (
    value: unknown
  ) => {
    if (
      typeof value !==
        "string" ||
      value.trim() === ""
    ) {
      return null;
    }

    try {
      const url =
        new URL(value);

      if (
        url.protocol !==
          "http:" &&
        url.protocol !==
          "https:"
      ) {
        return null;
      }

      return url.toString();
    } catch {
      return null;
    }
  };

  /* =======================================================
     APPLY REACT STATE TO ARCGIS LAYERS
     ======================================================= */

  const applyLayerVisibility = (
    nextState:
      LayerVisibility
  ) => {
    if (
      precipitationRef.current
    ) {
      precipitationRef.current.visible =
        nextState.precipitation;
    }

    if (
      weatherAlertsRef.current
    ) {
      weatherAlertsRef.current.visible =
        nextState.weatherAlerts;
    }

    if (nirRef.current) {
      nirRef.current.visible =
        nextState.nir;
    }

    if (ndviRef.current) {
      ndviRef.current.visible =
        nextState.ndvi;
    }

    if (
      wildfireRef.current
    ) {
      wildfireRef.current.visible =
        nextState.wildfire;
    }

    if (
      airQualityRef.current
    ) {
      airQualityRef.current.visible =
        nextState.airQuality;
    }

    if (
      elevationTintRef.current
    ) {
      elevationTintRef.current.visible =
        nextState.elevationTint;
    }

    if (
      hillshadeRef.current
    ) {
      hillshadeRef.current.visible =
        nextState.hillshade;
    }

    if (
      contourRef.current
    ) {
      contourRef.current.visible =
        nextState.contours;
    }

    if (
      lidarCoverageRef.current
    ) {
      lidarCoverageRef.current.visible =
        nextState.lidarCoverage;
    }
  };

  /* =======================================================
     CREATE MAP
     ======================================================= */

  useEffect(() => {
    if (!mapDiv.current) {
      return;
    }

    const map =
      new Map({
        basemap:
          "topo-vector",
      });

    /* =====================================================
       WEATHER // PRECIPITATION
       ===================================================== */

    const precipitationLayer =
      new WebTileLayer({
        urlTemplate:
          `https://tile.openweathermap.org/map/precipitation_new/{level}/{col}/{row}.png?appid=${import.meta.env.VITE_API_KEY}`,

        title:
          "Precipitation",

        opacity: 1,

        visible: true,
      });

    /* =====================================================
       WEATHER // ALERTS
       ===================================================== */

    const weatherAlertsLayer =
      new GeoJSONLayer({
        url:
          "https://api.weather.gov/alerts/active",

        title:
          "Weather Alerts",

        visible: false,

        opacity: 0.8,

        renderer: {
          type: "simple",

          symbol: {
            type:
              "simple-fill",

            color: [
              239,
              68,
              68,
              0.18,
            ],

            outline: {
              color: [
                248,
                113,
                113,
                0.95,
              ],

              width: 2,
            },
          },
        },

        popupTemplate: {
          title:
            "{event}",

          content: [
            {
              type:
                "fields",

              fieldInfos: [
                {
                  fieldName:
                    "severity",
                  label:
                    "Severity",
                },

                {
                  fieldName:
                    "urgency",
                  label:
                    "Urgency",
                },

                {
                  fieldName:
                    "certainty",
                  label:
                    "Certainty",
                },

                {
                  fieldName:
                    "areaDesc",
                  label:
                    "Affected Area",
                },

                {
                  fieldName:
                    "headline",
                  label:
                    "Headline",
                },

                {
                  fieldName:
                    "expires",
                  label:
                    "Expires",
                },
              ],
            },
          ],
        },
      });

    const weatherGroup =
      new GroupLayer({
        title:
          "Weather",

        visibilityMode:
          "independent",

        layers: [
          precipitationLayer,
          weatherAlertsLayer,
        ],
      });

    /* =====================================================
       REMOTE SENSING // NIR
       ===================================================== */

    const nirLayer =
      new ImageryLayer({
        url:
          "https://landsat2.arcgis.com/arcgis/rest/services/Landsat8_Views/ImageServer",

        title:
          "NIR Imagery",

        renderingRule: {
          functionName:
            "Color Infrared with DRA",
        },

        opacity: 0.85,

        visible: false,
      });

    /* =====================================================
       REMOTE SENSING // NDVI
       ===================================================== */

    const ndviLayer =
      new ImageryLayer({
        url:
          "https://landsat2.arcgis.com/arcgis/rest/services/Landsat8_Views/ImageServer",

        title:
          "Vegetation / NDVI",

        renderingRule: {
          functionName:
            "NDVI Colorized",
        },

        opacity: 0.85,

        visible: false,
      });

    const remoteSensingGroup =
      new GroupLayer({
        title:
          "Remote Sensing",

        visibilityMode:
          "independent",

        layers: [
          nirLayer,
          ndviLayer,
        ],
      });

    /* =====================================================
       HAZARDS // ACTIVE FIRES
       ===================================================== */

    const wildfireLayer =
      new WMSLayer({
        url:
          `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${import.meta.env.VITE_FIRMS_MAP_KEY}/`,

        title:
          "Active Fires",

        sublayers: [
          {
            name:
              "fires_viirs_24",
          },
        ],

        opacity: 0.9,

        visible: false,
      });

    const hazardsGroup =
      new GroupLayer({
        title:
          "Hazards",

        visibilityMode:
          "independent",

        layers: [
          wildfireLayer,
        ],
      });

    /* =====================================================
       ENVIRONMENT // AIR QUALITY
       ===================================================== */

    const airQualityLayer =
      new FeatureLayer({
        url:
          "https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services/AirNowLatestContoursPM25/FeatureServer/0",

        title:
          "Air Quality / PM2.5",

        visible: false,

        opacity: 0.55,

        popupEnabled:
          true,
      });

    const environmentGroup =
      new GroupLayer({
        title:
          "Environment",

        visibilityMode:
          "independent",

        layers: [
          airQualityLayer,
        ],
      });

    /* =====================================================
       TERRAIN // USGS 3DEP ELEVATION TINT
       ===================================================== */

    const elevationTintLayer =
      new ImageryLayer({
        url:
          "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer",

        title:
          "USGS Elevation Tint",

        visible: false,

        opacity: 0.78,

        renderingRule: {
          functionName:
            "Hillshade Elevation Tinted",
        },
      });

    /* =====================================================
       TERRAIN // HILLSHADE
       ===================================================== */

    const hillshadeLayer =
      new TileLayer({
        url:
          "https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer",

        title:
          "Hillshade / Relief",

        visible: false,

        opacity: 0.72,

        blendMode:
          "multiply",
      });

    /* =====================================================
       TERRAIN // USGS ELEVATION CONTOURS

       IMPORTANT:

       Do not hardcode one contour sublayer here.

       The USGS service selects different contour
       groups depending on the current map scale.
       ===================================================== */

    const contourLayer =
      new MapImageLayer({
        url:
          "https://carto.nationalmap.gov/arcgis/rest/services/contours/MapServer",

        title:
          "USGS Elevation Contours",

        visible: false,

        opacity: 1,
      });

    const terrainGroup =
      new GroupLayer({
        title:
          "Terrain",

        visibilityMode:
          "independent",

        layers: [
          elevationTintLayer,
          hillshadeLayer,
          contourLayer,
        ],
      });

    /* =====================================================
       LIDAR // USGS 3DEP COVERAGE
       ===================================================== */

    const lidarCoverageLayer =
      new FeatureLayer({
        url:
          "https://index.nationalmap.gov/arcgis/rest/services/3DEPElevationIndex/MapServer/8",

        title:
          "USGS 3DEP LiDAR Coverage",

        visible: false,

        opacity: 0.55,

        outFields: [
          "*",
        ],

        popupEnabled:
          true,

        popupTemplate: {
          title:
            "USGS 3DEP // {project}",

          content: [
            (event) => {
              const attributes =
                event.graphic
                  .attributes;

              const project =
                safeText(
                  attributes.project
                );

              const workUnit =
                safeText(
                  attributes.workunit
                );

              const qualityLevel =
                safeText(
                  attributes.ql
                );

              const method =
                safeText(
                  attributes.p_method
                );

              const specification =
                safeText(
                  attributes.spec
                );

              const horizontalCrs =
                safeText(
                  attributes.horiz_crs
                );

              const verticalCrs =
                safeText(
                  attributes.vert_crs
                );

              const geoid =
                safeText(
                  attributes.geoid
                );

              const startDate =
                formatDate(
                  attributes.collect_start
                );

              const endDate =
                formatDate(
                  attributes.collect_end
                );

              const publicationDate =
                formatDate(
                  attributes.lpc_pub_date
                );

              const sourceDataUrl =
                safeUrl(
                  attributes.lpc_link
                );

              const metadataUrl =
                safeUrl(
                  attributes.metadata_link
                );

              const sourceButton =
                sourceDataUrl
                  ? `
                    <a
                      href="${sourceDataUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="
                        display:block;
                        padding:9px 10px;
                        margin-top:10px;
                        text-decoration:none;
                        text-align:center;
                        background:#0e4e7d;
                        color:#e0f2fe;
                        border:1px solid #38bdf8;
                        border-radius:4px;
                        font-size:11px;
                        font-weight:700;
                        letter-spacing:0.7px;
                      "
                    >
                      OPEN SOURCE DATA
                    </a>
                  `
                  : "";

              const metadataButton =
                metadataUrl
                  ? `
                    <a
                      href="${metadataUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="
                        display:block;
                        padding:9px 10px;
                        margin-top:7px;
                        text-decoration:none;
                        text-align:center;
                        background:#1e293b;
                        color:#cbd5e1;
                        border:1px solid #475569;
                        border-radius:4px;
                        font-size:11px;
                        font-weight:700;
                        letter-spacing:0.7px;
                      "
                    >
                      OPEN METADATA
                    </a>
                  `
                  : "";

              return `
                <div
                  style="
                    padding:4px 4px 8px;
                    font-family:Segoe UI, Arial, sans-serif;
                  "
                >
                  <div
                    style="
                      color:#38bdf8;
                      font-size:9px;
                      font-weight:800;
                      letter-spacing:1.5px;
                      margin-bottom:10px;
                    "
                  >
                    LIDAR DATASET // USGS 3DEP
                  </div>

                  <div
                    style="
                      display:grid;
                      grid-template-columns:1fr;
                      gap:8px;
                    "
                  >
                    <div>
                      <strong>
                        Project
                      </strong>
                      <br />
                      ${project}
                    </div>

                    <div>
                      <strong>
                        Work Unit
                      </strong>
                      <br />
                      ${workUnit}
                    </div>

                    <div>
                      <strong>
                        Quality Level
                      </strong>
                      <br />
                      ${qualityLevel}
                    </div>

                    <div>
                      <strong>
                        Method
                      </strong>
                      <br />
                      ${method}
                    </div>

                    <div>
                      <strong>
                        Collection
                      </strong>
                      <br />
                      ${startDate} – ${endDate}
                    </div>

                    <div>
                      <strong>
                        Specification
                      </strong>
                      <br />
                      ${specification}
                    </div>

                    <div>
                      <strong>
                        Horizontal CRS
                      </strong>
                      <br />
                      ${horizontalCrs}
                    </div>

                    <div>
                      <strong>
                        Vertical CRS
                      </strong>
                      <br />
                      ${verticalCrs}
                    </div>

                    <div>
                      <strong>
                        Geoid
                      </strong>
                      <br />
                      ${geoid}
                    </div>

                    <div>
                      <strong>
                        Publication
                      </strong>
                      <br />
                      ${publicationDate}
                    </div>
                  </div>

                  ${sourceButton}

                  ${metadataButton}
                </div>
              `;
            },
          ],
        },
      });

    const lidarGroup =
      new GroupLayer({
        title:
          "LiDAR",

        visibilityMode:
          "independent",

        layers: [
          lidarCoverageLayer,
        ],
      });

    /* =====================================================
       SAVE REFERENCES
       ===================================================== */

    precipitationRef.current =
      precipitationLayer;

    weatherAlertsRef.current =
      weatherAlertsLayer;

    nirRef.current =
      nirLayer;

    ndviRef.current =
      ndviLayer;

    wildfireRef.current =
      wildfireLayer;

    airQualityRef.current =
      airQualityLayer;

    elevationTintRef.current =
      elevationTintLayer;

    hillshadeRef.current =
      hillshadeLayer;

    contourRef.current =
      contourLayer;

    lidarCoverageRef.current =
      lidarCoverageLayer;

    /* =====================================================
       ADD GROUPS
       ===================================================== */

    map.addMany([
      weatherGroup,
      remoteSensingGroup,
      hazardsGroup,
      environmentGroup,
      terrainGroup,
      lidarGroup,
    ]);

    /* =====================================================
       MAP VIEW
       ===================================================== */

    const view =
      new MapView({
        container:
          mapDiv.current,

        map,

        center: [
          coordinates.lon,
          coordinates.lat,
        ],

        zoom: 9,
      });

    viewRef.current =
      view;

    /* =====================================================
       BASEMAP TOGGLE
       ===================================================== */

    const basemapToggle =
      new BasemapToggle({
        view,

        nextBasemap:
          "satellite",
      });

    view.ui.add(
      basemapToggle,
      "bottom-right"
    );

    /* =====================================================
       CLEANUP
       ===================================================== */

    return () => {
      view.ui.remove(
        basemapToggle
      );

      view.destroy();

      viewRef.current =
        null;

      precipitationRef.current =
        null;

      weatherAlertsRef.current =
        null;

      nirRef.current =
        null;

      ndviRef.current =
        null;

      wildfireRef.current =
        null;

      airQualityRef.current =
        null;

      elevationTintRef.current =
        null;

      hillshadeRef.current =
        null;

      contourRef.current =
        null;

      lidarCoverageRef.current =
        null;
    };
  }, []);

  /* =========================================================
     INDIVIDUAL LAYER TOGGLE
     ========================================================= */

  const toggleLayer = (
    layer:
      keyof LayerVisibility
  ) => {
    const nextState = {
      ...layerVisibility,

      [layer]:
        !layerVisibility[
          layer
        ],
    };

    setLayerVisibility(
      nextState
    );

    applyLayerVisibility(
      nextState
    );
  };

  /* =========================================================
     RESET
     ========================================================= */

  const resetLayers =
    () => {
      setLayerVisibility(
        defaultLayerVisibility
      );

      applyLayerVisibility(
        defaultLayerVisibility
      );
    };

  /* =========================================================
     ALL OFF
     ========================================================= */

  const turnAllLayersOff =
    () => {
      setLayerVisibility(
        allLayersOff
      );

      applyLayerVisibility(
        allLayersOff
      );
    };

  /* =========================================================
     UPDATE SEARCHED LOCATION
     ========================================================= */

  useEffect(() => {
    if (
      !viewRef.current
    ) {
      return;
    }

    const view =
      viewRef.current;

    const point =
      new Point({
        longitude:
          coordinates.lon,

        latitude:
          coordinates.lat,
      });

    view.goTo({
      target:
        point,

      zoom: 10,
    });

    if (
      graphicRef.current
    ) {
      view.graphics.remove(
        graphicRef.current
      );
    }

    const popupTemplate =
      {
        title:
          weatherData?.name ||
          "Selected Location",

        content: `
          <div
            style="
              padding:6px 10px 10px;
              font-family:Arial,sans-serif;
              color:#374151;
            "
          >
            <div
              style="
                font-size:11px;
                font-weight:700;
                letter-spacing:2px;
                color:#3b82f6;
                margin-bottom:14px;
              "
            >
              CURRENT CONDITIONS
            </div>

            ${
              weatherData
                ? `
                  <div
                    style="
                      font-size:34px;
                      font-weight:700;
                    "
                  >
                    ${Math.round(
                      weatherData
                        .main
                        .temp
                    )}°
                  </div>

                  <div
                    style="
                      text-transform:capitalize;
                      margin-top:4px;
                    "
                  >
                    ${
                      weatherData
                        .weather[0]
                        .description
                    }
                  </div>
                `
                : `
                  <div>
                    Weather unavailable
                  </div>
                `
            }
          </div>
        `,
      };

    const graphic =
      new Graphic({
        geometry:
          point,

        symbol: {
          type:
            "simple-marker",

          color:
            "#3b82f6",

          size: 12,

          outline: {
            color:
              "#ffffff",

            width: 2,
          },
        },

        popupTemplate,
      });

    view.graphics.add(
      graphic
    );

    graphicRef.current =
      graphic;

    view.openPopup({
      features: [
        graphic,
      ],

      location:
        point,
    });
  }, [
    coordinates,
    weatherData,
  ]);

  /* =========================================================
     UI
     ========================================================= */

  return (
    <div className="weather-map-wrapper">
      <div
        ref={mapDiv}
        className="weather-map-view"
      />

      {!layersOpen && (
        <button
          type="button"
          className="map-layers-open-button"
          onClick={() =>
            setLayersOpen(
              true
            )
          }
          aria-label="Open map layers"
        >
          ☰
        </button>
      )}

      {layersOpen && (
        <aside className="map-layers-panel">

          {/* HEADER */}

          <div className="map-layers-header">
            <div>
              <span className="map-layers-eyebrow">
                ATMOSMAP
              </span>

              <h3>
                Map Layers
              </h3>
            </div>

            <button
              type="button"
              className="map-layers-close-button"
              onClick={() =>
                setLayersOpen(
                  false
                )
              }
              aria-label="Close map layers"
            >
              ›
            </button>
          </div>

          {/* OPERATIONS TOOLBAR */}

          <div className="layer-operations-toolbar">
            <span className="active-layer-count">
              {String(
                activeLayerCount
              ).padStart(
                2,
                "0"
              )}{" "}
              ACTIVE
            </span>

            <div className="layer-operation-actions">
              <button
                type="button"
                onClick={
                  resetLayers
                }
              >
                RESET
              </button>

              <button
                type="button"
                onClick={
                  turnAllLayersOff
                }
              >
                ALL OFF
              </button>
            </div>
          </div>

          {/* LAYER LIST */}

          <div className="map-layers-scroll">

            {/* WEATHER */}

            <section className="layer-category">
              <p className="layer-category-title">
                WEATHER
              </p>

              <LayerButton
                label="Precipitation"
                active={
                  layerVisibility
                    .precipitation
                }
                onClick={() =>
                  toggleLayer(
                    "precipitation"
                  )
                }
              />

              <LayerButton
                label="Weather Alerts"
                active={
                  layerVisibility
                    .weatherAlerts
                }
                onClick={() =>
                  toggleLayer(
                    "weatherAlerts"
                  )
                }
              />
            </section>

            {/* REMOTE SENSING */}

            <section className="layer-category">
              <p className="layer-category-title">
                REMOTE SENSING
              </p>

              <LayerButton
                label="NIR Imagery"
                active={
                  layerVisibility
                    .nir
                }
                onClick={() =>
                  toggleLayer(
                    "nir"
                  )
                }
              />

              <LayerButton
                label="Vegetation / NDVI"
                active={
                  layerVisibility
                    .ndvi
                }
                onClick={() =>
                  toggleLayer(
                    "ndvi"
                  )
                }
              />
            </section>

            {/* HAZARDS */}

            <section className="layer-category">
              <p className="layer-category-title">
                HAZARDS
              </p>

              <LayerButton
                label="Active Fires"
                active={
                  layerVisibility
                    .wildfire
                }
                onClick={() =>
                  toggleLayer(
                    "wildfire"
                  )
                }
              />
            </section>

            {/* ENVIRONMENT */}

            <section className="layer-category">
              <p className="layer-category-title">
                ENVIRONMENT
              </p>

              <LayerButton
                label="Air Quality / PM2.5"
                active={
                  layerVisibility
                    .airQuality
                }
                onClick={() =>
                  toggleLayer(
                    "airQuality"
                  )
                }
              />
            </section>

            {/* TERRAIN */}

            <section className="layer-category">
              <p className="layer-category-title">
                TERRAIN
              </p>

              <LayerButton
                label="USGS Elevation Tint"
                active={
                  layerVisibility
                    .elevationTint
                }
                onClick={() =>
                  toggleLayer(
                    "elevationTint"
                  )
                }
              />

              <LayerButton
                label="Hillshade / Relief"
                active={
                  layerVisibility
                    .hillshade
                }
                onClick={() =>
                  toggleLayer(
                    "hillshade"
                  )
                }
              />

              <LayerButton
                label="USGS Elevation Contours"
                active={
                  layerVisibility
                    .contours
                }
                onClick={() =>
                  toggleLayer(
                    "contours"
                  )
                }
              />
            </section>

            {/* LIDAR */}

            <section className="layer-category">
              <p className="layer-category-title">
                LIDAR
              </p>

              <LayerButton
                label="USGS 3DEP Coverage"
                active={
                  layerVisibility
                    .lidarCoverage
                }
                onClick={() =>
                  toggleLayer(
                    "lidarCoverage"
                  )
                }
              />
            </section>

          </div>
        </aside>
      )}
    </div>
  );
}

/* =========================================================
   REUSABLE LAYER BUTTON
   ========================================================= */

interface LayerButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function LayerButton({
  label,
  active,
  onClick,
}: LayerButtonProps) {
  return (
    <button
      type="button"
      className="custom-layer-row"
      onClick={
        onClick
      }
      aria-pressed={
        active
      }
    >
      <span>
        {label}
      </span>

      <span
        className={
          active
            ? "layer-switch layer-switch-on"
            : "layer-switch"
        }
      >
        <span />
      </span>
    </button>
  );
}

export default WeatherMap;
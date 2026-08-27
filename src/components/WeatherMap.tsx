import { useEffect, useRef, useState } from "react";

import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";

import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";

import WebTileLayer from "@arcgis/core/layers/WebTileLayer";
import ImageryLayer from "@arcgis/core/layers/ImageryLayer";
import WMSLayer from "@arcgis/core/layers/WMSLayer";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";

import BasemapToggle from "@arcgis/core/widgets/BasemapToggle";

import "@arcgis/core/assets/esri/themes/light/main.css";

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
}

function WeatherMap({
  coordinates,
  weatherData,
}: WeatherMapProps) {
  const mapDiv = useRef<HTMLDivElement>(null);

  const viewRef = useRef<MapView | null>(null);
  const graphicRef = useRef<Graphic | null>(null);

  /*
   * References to the real ArcGIS layers.
   *
   * Our React menu will control these.
   */
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

  /*
   * Custom AtmosMap menu state.
   */
  const [layersOpen, setLayersOpen] =
    useState(false);

  const [layerVisibility, setLayerVisibility] =
    useState<LayerVisibility>({
      precipitation: true,
      weatherAlerts: false,
      nir: false,
      ndvi: false,
      wildfire: false,
    });

  /*
   * =====================================================
   * CREATE ARCGIS MAP
   * =====================================================
   */

  useEffect(() => {
    if (!mapDiv.current) return;

    const map = new Map({
      basemap: "topo-vector",
    });

    /*
     * =====================================================
     * WEATHER
     * =====================================================
     */

    const precipitationLayer =
      new WebTileLayer({
        urlTemplate:
          `https://tile.openweathermap.org/map/precipitation_new/{level}/{col}/{row}.png?appid=${import.meta.env.VITE_API_KEY}`,

        title: "Precipitation",

        opacity: 1,

        visible: true,
      });

    const weatherAlertsLayer =
      new GeoJSONLayer({
        url:
          "https://api.weather.gov/alerts/active",

        title: "Weather Alerts",

        visible: false,

        opacity: 0.8,

        renderer: {
          type: "simple",

          symbol: {
            type: "simple-fill",

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
          title: "{event}",

          content: [
            {
              type: "fields",

              fieldInfos: [
                {
                  fieldName: "severity",
                  label: "Severity",
                },
                {
                  fieldName: "urgency",
                  label: "Urgency",
                },
                {
                  fieldName: "certainty",
                  label: "Certainty",
                },
                {
                  fieldName: "areaDesc",
                  label: "Affected Area",
                },
                {
                  fieldName: "headline",
                  label: "Headline",
                },
                {
                  fieldName: "expires",
                  label: "Expires",
                },
              ],
            },
          ],
        },
      });

    const weatherGroup =
      new GroupLayer({
        title: "Weather",

        visibilityMode:
          "independent",

        layers: [
          precipitationLayer,
          weatherAlertsLayer,
        ],
      });

    /*
     * =====================================================
     * REMOTE SENSING
     * =====================================================
     */

    const nirLayer =
      new ImageryLayer({
        url:
          "https://landsat2.arcgis.com/arcgis/rest/services/Landsat8_Views/ImageServer",

        title: "NIR Imagery",

        renderingRule: {
          functionName:
            "Color Infrared with DRA",
        },

        opacity: 0.85,

        visible: false,
      });

    const ndviLayer =
      new ImageryLayer({
        url:
          "https://landsat2.arcgis.com/arcgis/rest/services/Landsat8_Views/ImageServer",

        title:
          "Vegetation (NDVI)",

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

    /*
     * =====================================================
     * HAZARDS
     * =====================================================
     */

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
        title: "Hazards",

        visibilityMode:
          "independent",

        layers: [
          wildfireLayer,
        ],
      });

    /*
     * Keep references to the REAL ArcGIS layers.
     */

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

    /*
     * Add our groups.
     */

    map.addMany([
      weatherGroup,
      remoteSensingGroup,
      hazardsGroup,
    ]);

    /*
     * =====================================================
     * MAP VIEW
     * =====================================================
     */

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

    viewRef.current = view;

    /*
     * =====================================================
     * BASEMAP CONTROL
     * =====================================================
     */

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

    /*
     * =====================================================
     * CLEANUP
     * =====================================================
     */

    return () => {
      view.ui.remove(
        basemapToggle
      );

      view.destroy();

      viewRef.current = null;

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
    };
  }, []);

  /*
   * =====================================================
   * CUSTOM LAYER CONTROL FUNCTION
   * =====================================================
   */

  const toggleLayer = (
    layer:
      keyof LayerVisibility
  ) => {
    setLayerVisibility(
      (previous) => {
        const nextValue =
          !previous[layer];

        /*
         * Update the REAL ArcGIS layer.
         */

        if (
          layer ===
            "precipitation" &&
          precipitationRef.current
        ) {
          precipitationRef.current.visible =
            nextValue;
        }

        if (
          layer ===
            "weatherAlerts" &&
          weatherAlertsRef.current
        ) {
          weatherAlertsRef.current.visible =
            nextValue;
        }

        if (
          layer === "nir" &&
          nirRef.current
        ) {
          nirRef.current.visible =
            nextValue;
        }

        if (
          layer === "ndvi" &&
          ndviRef.current
        ) {
          ndviRef.current.visible =
            nextValue;
        }

        if (
          layer ===
            "wildfire" &&
          wildfireRef.current
        ) {
          wildfireRef.current.visible =
            nextValue;
        }

        return {
          ...previous,

          [layer]:
            nextValue,
        };
      }
    );
  };

  /*
   * =====================================================
   * UPDATE SEARCH LOCATION
   * =====================================================
   */

  useEffect(() => {
    if (!viewRef.current) {
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
      target: point,

      zoom: 10,
    });

    if (
      graphicRef.current
    ) {
      view.graphics.remove(
        graphicRef.current
      );
    }

    /*
     * =====================================================
     * WEATHER POPUP
     * =====================================================
     */

    const popupTemplate = {
      title:
        weatherData?.name ||
        "Selected Location",

      content: `
        <div style="
          padding: 6px 10px 10px;
          font-family: Arial, sans-serif;
          color: #374151;
        ">

          <div style="
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #3b82f6;
            margin-bottom: 14px;
          ">
            CURRENT CONDITIONS
          </div>

          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 14px;
          ">

            ${
              weatherData
                ? `
                  <img
                    src="https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png"
                    style="
                      width: 58px;
                      height: 58px;
                    "
                    alt="${weatherData.weather[0].description}"
                  />
                `
                : ""
            }

            <div>

              <div style="
                font-size: 38px;
                font-weight: 700;
                line-height: 1;
                color: #1f2937;
              ">
                ${
                  weatherData
                    ? Math.round(
                        weatherData
                          .main
                          .temp
                      )
                    : "—"
                }°
              </div>

              <div style="
                margin-top: 4px;
                font-size: 14px;
                color: #6b7280;
                text-transform: capitalize;
              ">
                ${
                  weatherData
                    ?.weather[0]
                    .description ||
                  "Weather unavailable"
                }
              </div>

            </div>

          </div>

          <div style="
            border-top: 1px solid #d1d5db;
            padding-top: 12px;
          ">

            <div style="
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            ">

              <div>
                <div style="
                  font-size: 10px;
                  color: #6b7280;
                ">
                  FEELS LIKE
                </div>

                <strong>
                  ${
                    weatherData
                      ? Math.round(
                          weatherData
                            .main
                            .feels_like
                        )
                      : "—"
                  }°F
                </strong>
              </div>

              <div>
                <div style="
                  font-size: 10px;
                  color: #6b7280;
                ">
                  HUMIDITY
                </div>

                <strong>
                  ${
                    weatherData
                      ? weatherData
                          .main
                          .humidity
                      : "—"
                  }%
                </strong>
              </div>

              <div>
                <div style="
                  font-size: 10px;
                  color: #6b7280;
                ">
                  WIND
                </div>

                <strong>
                  ${
                    weatherData
                      ? weatherData
                          .wind
                          .speed
                      : "—"
                  } mph
                </strong>
              </div>

              <div>
                <div style="
                  font-size: 10px;
                  color: #6b7280;
                ">
                  CONDITION
                </div>

                <strong style="
                  text-transform: capitalize;
                ">
                  ${
                    weatherData
                      ?.weather[0]
                      .description ||
                    "—"
                  }
                </strong>
              </div>

            </div>

          </div>

        </div>
      `,
    };

    /*
     * CITY MARKER
     */

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

  /*
   * =====================================================
   * MAP + CUSTOM ATMOSMAP LAYER MENU
   * =====================================================
   */

  return (
    <div className="weather-map-wrapper">
      <div
        ref={mapDiv}
        className="weather-map-view"
      />

      {/* =================================================
          COLLAPSED BUTTON
         ================================================= */}

      {!layersOpen && (
        <button
          type="button"
          className="map-layers-open-button"
          onClick={() =>
            setLayersOpen(true)
          }
          aria-label="Open map layers"
        >
          ☰
        </button>
      )}

      {/* =================================================
          CUSTOM MAP LAYERS PANEL
         ================================================= */}

      {layersOpen && (
        <aside className="map-layers-panel">
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
                setLayersOpen(false)
              }
              aria-label="Close map layers"
            >
              ›
            </button>
          </div>

          <div className="map-layers-scroll">
            {/* ==============================
                WEATHER
               ============================== */}

            <section className="layer-category">
              <p className="layer-category-title">
                WEATHER
              </p>

              <button
                type="button"
                className="custom-layer-row"
                onClick={() =>
                  toggleLayer(
                    "precipitation"
                  )
                }
              >
                <span>
                  Precipitation
                </span>

                <span
                  className={
                    layerVisibility.precipitation
                      ? "layer-switch layer-switch-on"
                      : "layer-switch"
                  }
                >
                  <span />
                </span>
              </button>

              <button
                type="button"
                className="custom-layer-row"
                onClick={() =>
                  toggleLayer(
                    "weatherAlerts"
                  )
                }
              >
                <span>
                  Weather Alerts
                </span>

                <span
                  className={
                    layerVisibility.weatherAlerts
                      ? "layer-switch layer-switch-on"
                      : "layer-switch"
                  }
                >
                  <span />
                </span>
              </button>
            </section>

            {/* ==============================
                REMOTE SENSING
               ============================== */}

            <section className="layer-category">
              <p className="layer-category-title">
                REMOTE SENSING
              </p>

              <button
                type="button"
                className="custom-layer-row"
                onClick={() =>
                  toggleLayer("nir")
                }
              >
                <span>
                  NIR Imagery
                </span>

                <span
                  className={
                    layerVisibility.nir
                      ? "layer-switch layer-switch-on"
                      : "layer-switch"
                  }
                >
                  <span />
                </span>
              </button>

              <button
                type="button"
                className="custom-layer-row"
                onClick={() =>
                  toggleLayer("ndvi")
                }
              >
                <span>
                  Vegetation / NDVI
                </span>

                <span
                  className={
                    layerVisibility.ndvi
                      ? "layer-switch layer-switch-on"
                      : "layer-switch"
                  }
                >
                  <span />
                </span>
              </button>
            </section>

            {/* ==============================
                HAZARDS
               ============================== */}

            <section className="layer-category">
              <p className="layer-category-title">
                HAZARDS
              </p>

              <button
                type="button"
                className="custom-layer-row"
                onClick={() =>
                  toggleLayer(
                    "wildfire"
                  )
                }
              >
                <span>
                  Active Fires
                </span>

                <span
                  className={
                    layerVisibility.wildfire
                      ? "layer-switch layer-switch-on"
                      : "layer-switch"
                  }
                >
                  <span />
                </span>
              </button>
            </section>
          </div>
        </aside>
      )}
    </div>
  );
}

export default WeatherMap;
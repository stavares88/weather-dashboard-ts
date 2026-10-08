import { useEffect, useRef, useState } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import WebTileLayer from "@arcgis/core/layers/WebTileLayer";
import ImageryLayer from "@arcgis/core/layers/ImageryLayer";
import WMSLayer from "@arcgis/core/layers/WMSLayer";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import esriRequest from "@arcgis/core/request";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import TileLayer from "@arcgis/core/layers/TileLayer";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import BasemapToggle from "@arcgis/core/widgets/BasemapToggle";
import "@arcgis/core/assets/esri/themes/light/main.css";
import "./WeatherMap.css";
/* =========================================================
   TYPES
   ========================================================= */
interface WeatherAlertLegendItem {
  key: string;
  label: string;
  imageData: string;
  outline: boolean;
}
interface NOAAAlertLegendResponse {
  layers: {
    layerId: number;
    legend: { label: string; values: string[]; imageData: string }[];
  }[];
}
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
    useRef<MapImageLayer | null>(null);
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
  const [weatherAlertsStatus, setWeatherAlertsStatus] = useState("Loading weather alerts…");
  const [weatherAlertLegendItems, setWeatherAlertLegendItems] =
    useState<WeatherAlertLegendItem[]>([]);
  const [wildfireStatus, setWildfireStatus] = useState("Loading satellite hotspots…");
  const [airQualityStatus, setAirQualityStatus] = useState("Loading air quality…");
  const [airQualityLegend, setAirQualityLegend] = useState<{ value: string; label: string; color: string }[]>([]);
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
    // NWS CAP alerts can reference forecast zones without polygon geometry.
    // NOAA's map service supplies the alert areas for both kinds of alert.
    const alertPopup = new PopupTemplate({
      title: "{prod_type}",
      content: [
        {
          type: "fields",
          fieldInfos: [
            { fieldName: "prod_type", label: "Alert" },
            { fieldName: "wfo", label: "Issuing NWS office" },
            { fieldName: "issuance", label: "Issued" },
            { fieldName: "onset", label: "Onset" },
            { fieldName: "ends", label: "Ends" },
            { fieldName: "expiration", label: "Expires" },
          ],
        },
        {
          type: "text",
          text: '<a href="{url}" target="_blank" rel="noopener noreferrer">Read official NWS alert</a>',
        },
      ],
    });
    const weatherAlertsLayer = new MapImageLayer({
      url: "https://mapservices.weather.noaa.gov/eventdriven/rest/services/WWA/watch_warn_adv/MapServer",
      title: "Weather Alerts",
      visible: false,
      opacity: 0.8,
      refreshInterval: 5,
      // Retain NOAA's event colors and priority order: storm warnings on top.
      sublayers: [
        { id: 1, visible: true, popupEnabled: true, popupTemplate: alertPopup },
        { id: 0, visible: true, popupEnabled: true, popupTemplate: alertPopup },
      ],
    });
    const weatherGroup =
      new GroupLayer({
        title:
          "Weather",
        visibilityMode:
          "independent",
        layers: [
          precipitationLayer,
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
        rasterFunction: {
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
        rasterFunction: {
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
    const firmsMapKey = import.meta.env.VITE_FIRMS_MAP_KEY?.trim();
    const wildfireLayer =
      new WMSLayer({
        url:
          `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${firmsMapKey || "missing-key"}/`,
        title:
          "Active Fires",
        sublayers: [
          {
            name:
              "fires_viirs_24",
          },
        ],
          // NASA FIRMS supports these explicit WMS symbol parameters.
          // Keep the legend swatch in sync with this requested color.
          customLayerParameters: { symbols: "circle", colors: "255+80+40", size: "6" },
          imageTransparency: true,
          refreshInterval: 15,
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
        refreshInterval: 15,
        outFields: ["gridcode", "Timestamp"],
        popupTemplate: {
          title: "Air Quality / PM2.5",
          expressionInfos: [{
            name: "aqi-category", title: "AQI category",
            expression: "Decode($feature.gridcode, 1, 'Good', 2, 'Moderate', 3, 'Unhealthy for Sensitive Groups', 4, 'Unhealthy', 5, 'Very Unhealthy', 6, 'Hazardous', 'Unknown category')",
          }],
          content: [{ type: "fields", fieldInfos: [
            { fieldName: "expression/aqi-category", label: "PM2.5 AQI category" },
            { fieldName: "Timestamp", label: "Observation time", format: { dateFormat: "short-date-short-time" } },
          ] }],
        },
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
        rasterFunction: {
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
          content: (event) => {
            
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
      terrainGroup,
      lidarGroup,
      // Alert polygons must draw above satellite imagery and terrain overlays.
      environmentGroup,
      weatherAlertsLayer,
      // Hotspot markers stay above alert fills, imagery, and terrain.
      hazardsGroup,
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
    let alertLegendCache: NOAAAlertLegendResponse | null = null;
    let disposed = false;
    let alertQueryController = new AbortController();
    const updateAlertStatus = async () => {
      alertQueryController.abort();
      if (disposed) return;
      setWeatherAlertLegendItems([]);
      if (!weatherAlertsLayer.visible || !view.extent) return;
      if (!view.stationary) {
        setWeatherAlertsStatus("Updating weather alerts…");
        return;
      }
      alertQueryController = new AbortController();
      const { signal } = alertQueryController;
      const extent = view.extent.clone();
      setWeatherAlertsStatus("Loading weather alerts…");
      try {
        await weatherAlertsLayer.load();
        if (signal.aborted || disposed) return;
        await view.whenLayerView(weatherAlertsLayer);
        if (signal.aborted || disposed) return;
        // Distinct event types keep the legend compact even at national scales.
        const [legendData, eventResults] = await Promise.all([
          alertLegendCache
            ? Promise.resolve(alertLegendCache)
            : esriRequest<NOAAAlertLegendResponse>(weatherAlertsLayer.url + "/legend", {
                query: { f: "json" }, responseType: "json", signal,
              }).then(({ data }) => data),
          Promise.all([0, 1].map(async (id) => {
            const sublayer = weatherAlertsLayer.findSublayerById(id);
            if (!sublayer) throw new Error("NOAA alert sublayer is unavailable");
            const result = await sublayer.queryFeatures({
              where: "1=1", geometry: extent, spatialRelationship: "intersects",
              outFields: ["prod_type", "phenom", "sig"],
              returnGeometry: false, returnDistinctValues: true,
            }, { signal });
            if (result.exceededTransferLimit) throw new Error("Incomplete alert type query");
            return { id, features: result.features };
          })),
        ]);
        if (signal.aborted || disposed) return;
        alertLegendCache = legendData;
        const items: WeatherAlertLegendItem[] = [];
        for (const result of eventResults) {
          const symbols = legendData.layers.find((layer) => layer.layerId === result.id)?.legend ?? [];
          const keys = new Set(result.features.map(({ attributes }) => result.id === 0
            ? String(attributes.phenom) + "," + String(attributes.sig)
            : String(attributes.prod_type)));
          for (const symbol of symbols) {
            if (symbol.values.some((value) => keys.has(value))) {
              items.push({
                key: result.id + ":" + symbol.values.join("|"),
                label: symbol.label, imageData: symbol.imageData, outline: result.id === 0,
              });
            }
          }
        }
        setWeatherAlertLegendItems(items);
        const hasAlerts = eventResults.some((result) => result.features.length > 0);
        setWeatherAlertsStatus(hasAlerts
          ? (items.length > 0
            ? "Alert areas in view. Click a colored area for details."
            : "Alert areas in view; NOAA legend symbols are unavailable.")
          : "No active alert areas in this view. Zoom out to check nearby areas.");
      } catch (error) {
        if (signal.aborted || disposed) return;
        console.error("AtmosMap weather alerts:", error);
        setWeatherAlertsStatus("Unable to load weather alerts. Toggle off and on to retry.");
      }
    };
    const alertStatusWatch = reactiveUtils.watch(
      () => [view.stationary, weatherAlertsLayer.visible],
      () => { void updateAlertStatus(); },
      { initial: true },
    );
    const alertStatusRefresh = window.setInterval(() => {
      void updateAlertStatus();
    }, 5 * 60 * 1000);
    let fireCheckController = new AbortController();
    const updateFireStatus = async () => {
      fireCheckController.abort();
      if (disposed || !wildfireLayer.visible) return;
      if (!firmsMapKey) {
        setWildfireStatus("NASA FIRMS map key is missing. Configure VITE_FIRMS_MAP_KEY and restart the app.");
        return;
      }
      if (!view.stationary || !view.extent) {
        setWildfireStatus("Updating satellite hotspots…");
        return;
      }
      fireCheckController = new AbortController();
      const { signal } = fireCheckController;
      const extent = view.extent.clone();
      setWildfireStatus("Loading satellite hotspots…");
      try {
        await wildfireLayer.load();
        if (signal.aborted || disposed) return;
        // Verify a real map response rather than treating capabilities as data.
        await wildfireLayer.fetchImage(extent, 256, 256, { signal });
        if (signal.aborted || disposed) return;
        setWildfireStatus("24-hour hotspot imagery loaded. Zoom out if no markers appear.");
      } catch {
        if (signal.aborted || disposed) return;
        // Avoid logging service URLs because they contain the FIRMS map key.
        setWildfireStatus("Unable to load NASA FIRMS. Check the map key or connection, then toggle off and on.");
      }
    };
    const fireStatusWatch = reactiveUtils.watch(
      () => [view.stationary, wildfireLayer.visible],
      () => { void updateFireStatus(); },
      { initial: true },
    );
    const fireStatusRefresh = window.setInterval(() => {
      void updateFireStatus();
    }, 15 * 60 * 1000);
    let airQueryController = new AbortController();
    const updateAirQuality = async () => {
      airQueryController.abort();
      if (disposed || !airQualityLayer.visible) return;
      if (!view.stationary || !view.extent) {
        setAirQualityStatus("Updating air quality…");
        return;
      }
      airQueryController = new AbortController();
      const { signal } = airQueryController;
      const extent = view.extent.clone();
      setAirQualityStatus("Loading air quality…");
      try {
        await airQualityLayer.load();
        if (signal.aborted || disposed) return;
        const renderer = airQualityLayer.renderer;
        if (renderer instanceof UniqueValueRenderer) {
          setAirQualityLegend((renderer.uniqueValueInfos ?? []).flatMap((info) => {
            const symbol = info.symbol;
            return symbol instanceof SimpleFillSymbol && symbol.color
              ? [{ value: String(info.value), label: info.label || String(info.value), color: symbol.color.toCss(true) }]
              : [];
          }));
        } else {
          setAirQualityLegend([]);
        }
        const result = await airQualityLayer.queryFeatures({
          where: "1=1", geometry: extent, spatialRelationship: "intersects",
          outFields: ["Timestamp"], returnGeometry: false,
          orderByFields: ["Timestamp DESC"], num: 1,
        }, { signal });
        if (signal.aborted || disposed) return;
        if (!result.features.length) {
          setAirQualityStatus("No PM2.5 coverage in this view. Missing coverage does not mean good air quality.");
          return;
        }
        const timestamp = Number(result.features[0].attributes.Timestamp);
        const valid = Number.isFinite(timestamp) && timestamp > 0;
        const stale = valid && Date.now() - timestamp > 24 * 60 * 60 * 1000;
        setAirQualityStatus(valid
          ? (stale ? "Data may be outdated. Latest observation in view: " : "Latest observation in view: ") + new Date(timestamp).toLocaleString()
          : "PM2.5 coverage loaded; observation time is unavailable.");
      } catch {
        if (signal.aborted || disposed) return;
        setAirQualityStatus("Unable to load AirNow. Check the connection, then toggle off and on.");
      }
    };
    const airStatusWatch = reactiveUtils.watch(
      () => [view.stationary, airQualityLayer.visible],
      () => { void updateAirQuality(); }, { initial: true },
    );
    const airStatusRefresh = window.setInterval(() => { void updateAirQuality(); }, 15 * 60 * 1000);
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
      disposed = true;
      airQueryController.abort();
      airStatusWatch.remove();
      window.clearInterval(airStatusRefresh);
      fireCheckController.abort();
      fireStatusWatch.remove();
      window.clearInterval(fireStatusRefresh);
      alertQueryController.abort();
      alertStatusWatch.remove();
      window.clearInterval(alertStatusRefresh);
      graphicRef.current = null;
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
      <div className="map-legends-stack"
        hidden={!layerVisibility.ndvi && !layerVisibility.weatherAlerts && !layerVisibility.wildfire && !layerVisibility.airQuality}>
      <aside className="ndvi-legend-panel air-quality-legend-panel"
        hidden={!layerVisibility.airQuality} aria-label="Air Quality legend">
        <h3>Air Quality / PM2.5</h3>
        <p className="weather-alerts-legend-caption">Air Quality Index categories</p>
        <ul className="air-quality-legend-list">
          {airQualityLegend.map((item) => (
            <li key={item.value}>
              <span aria-hidden="true" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        {!airQualityLegend.length && <p className="ndvi-legend-note">Service color key is unavailable.</p>}
        <p className="ndvi-legend-note" role="status" aria-live="polite">{airQualityStatus}</p>
        <p className="ndvi-legend-note">EPA / AirNow · Interpolated, preliminary PM2.5 AQI. The source updates hourly; this layer checks every 15 minutes. Map opacity blends these colors with underlying layers.</p>
      </aside>
      <aside className="ndvi-legend-panel wildfire-legend-panel"
        hidden={!layerVisibility.wildfire} aria-label="Active Fires legend">
        <h3>Active Fires / Hotspots</h3>
        <div className="wildfire-legend-symbol">
          <span className="wildfire-marker" aria-hidden="true" />
          <span>VIIRS satellite detection · Past 24 hours</span>
        </div>
        <p className="ndvi-legend-description">
          Satellite-detected heat anomalies, including fires. Markers do not show fire boundaries or burned area.
        </p>
        <p className="ndvi-legend-note" role="status" aria-live="polite">{wildfireStatus}</p>
        <p className="ndvi-legend-note">NASA FIRMS · Refreshes every 15 minutes.</p>
      </aside>
      <aside
        className="ndvi-legend-panel weather-alerts-legend-panel"
        hidden={!layerVisibility.weatherAlerts}
        aria-label="Weather Alerts legend"
      >
        <h3>Weather Alerts</h3>
        <p className="weather-alerts-legend-caption">Alert types in this map view</p>
        {weatherAlertLegendItems.length > 0 ? (
          <ul className="weather-alerts-legend-list">
            {weatherAlertLegendItems.map((item) => (
              <li key={item.key}>
                <img src={"data:image/png;base64," + item.imageData} alt="" width={24} height={24} />
                <span>
                  {item.label}
                  {item.outline && <small>Storm warning outline</small>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ndvi-legend-note">{weatherAlertsStatus}</p>
        )}
        <p className="ndvi-legend-note">NOAA / National Weather Service · Refreshes every 5 minutes.</p>
      </aside>
      <aside
        className="ndvi-legend-panel"
        hidden={!layerVisibility.ndvi}
        aria-label="NDVI color legend"
      >
        <h3>Vegetation / NDVI</h3>
        {/* Representative RGB samples decoded from this service's
            NDVI Colorized legend on October 8, 2026. Intermediate colors
            are omitted. Service display codes are not raw NDVI values. */}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, textAlign: "left" }}>
          {[
            { color: "#BEE8FF", name: "Light blue" },
            { color: "#B88F3D", name: "Brown" },
            { color: "#DBBA76", name: "Tan" },
            { color: "#F2DDB3", name: "Cream" },
            { color: "#BA7654", name: "Reddish brown" },
            { color: "#E5EE00", name: "Yellow" },
            { color: "#8BB000", name: "Yellow-green" },
            { color: "#00332D", name: "Dark green" },
          ].map(({ color, name }) => (
            <li
              key={color}
              style={{ display: "flex", alignItems: "center", gap: 10,
                marginBottom: 7, fontSize: 12 }}
            >
              <span
                aria-hidden="true"
                style={{ display: "inline-block", width: 24, height: 16,
                  flexShrink: 0, backgroundColor: color,
                  border: "1px solid #64748b", borderRadius: 2 }}
              />
              <span>{name}</span>
            </li>
          ))}
        </ul>
        <p className="ndvi-legend-description">
          <strong>Brown:</strong> sparse vegetation.
          <br />
          <strong>Dark green:</strong> thick, vigorous vegetation.
        </p>
        <p className="ndvi-legend-note">
          Representative colors sampled from the Landsat NDVI Colorized
          service legend. Intermediate shades are omitted. These are color
          names, not numeric NDVI classes. Layer opacity and the basemap
          affect how colors appear on the map.
        </p>
      </aside>
      </div>
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
              {layerVisibility.weatherAlerts && (
                <p role="status" aria-live="polite" style={{
                  margin: "8px", color: "#bae6fd", fontSize: 11, lineHeight: 1.5,
                }}>
                  {weatherAlertsStatus}
                </p>
              )}
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
                {layerVisibility.wildfire && (
                  <p className="ndvi-legend-note" role="status" aria-live="polite">{wildfireStatus}</p>
                )}
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

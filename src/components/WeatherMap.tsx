import { useEffect, useRef } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";

import WebTileLayer from "@arcgis/core/layers/WebTileLayer";
import ImageryLayer from "@arcgis/core/layers/ImageryLayer";
import WMSLayer from "@arcgis/core/layers/WMSLayer";

import LayerList from "@arcgis/core/widgets/LayerList";
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

function WeatherMap({
    coordinates,
    weatherData,
}: WeatherMapProps) {
    const mapDiv = useRef<HTMLDivElement>(null);

    const viewRef = useRef<MapView | null>(null);

    const graphicRef = useRef<Graphic | null>(null);

    useEffect(() => {
        if (!mapDiv.current) return;

        /*
         * BASEMAP
         */
        const map = new Map({
            basemap: "topo-vector",
        });

        /*
         * PRECIPITATION
         */
        const precipitationLayer = new WebTileLayer({
            urlTemplate:
                `https://tile.openweathermap.org/map/precipitation_new/{level}/{col}/{row}.png?appid=${import.meta.env.VITE_API_KEY}`,

            title: "Precipitation",

            opacity: 1,

            visible: true,
        });

        /*
         * NIR / COLOR INFRARED
         */
        const nirLayer = new ImageryLayer({
            url:
                "https://landsat2.arcgis.com/arcgis/rest/services/Landsat8_Views/ImageServer",

            title: "Landsat 8 - Color Infrared (NIR)",

            renderingRule: {
                functionName: "Color Infrared with DRA",
            },

            opacity: 0.85,

            visible: false,
        });

        /*
         * NDVI VEGETATION INDEX
         */
        const ndviLayer = new ImageryLayer({
            url:
                "https://landsat2.arcgis.com/arcgis/rest/services/Landsat8_Views/ImageServer",

            title: "NDVI - Vegetation Index",

            renderingRule: {
                functionName: "NDVI Colorized",
            },

            opacity: 0.85,

            visible: false,
        });

        /*
         * NASA FIRMS ACTIVE FIRE LAYER
         *
         * FIRMS exposes active fire detections
         * through an OGC Web Map Service.
         */
        const wildfireLayer = new WMSLayer({
            url:
                `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${import.meta.env.VITE_FIRMS_MAP_KEY}/`,

            title: "NASA FIRMS - Active Fires",

            /*
             * VIIRS combined fire detections
             * from the last 24 hours.
             */
            sublayers: [
                {
                    name: "fires_viirs_24",
                },
            ],

            opacity: 0.9,

            visible: false,
        });

        /*
         * ADD OPERATIONAL GIS LAYERS
         */
        map.addMany([
            precipitationLayer,
            nirLayer,
            ndviLayer,
            wildfireLayer,
        ]);

        /*
         * MAP VIEW
         */
        const view = new MapView({
            container: mapDiv.current,

            map,

            center: [
                coordinates.lon,
                coordinates.lat,
            ],

            zoom: 9,
        });

        viewRef.current = view;

        /*
         * BASEMAP TOGGLE
         *
         * Topographic <-> Satellite
         */
        const basemapToggle = new BasemapToggle({
            view,

            nextBasemap: "satellite",
        });

        view.ui.add(
            basemapToggle,
            "bottom-right"
        );

        /*
         * LAYER LIST
         */
        const layerList = new LayerList({
            view,
        });

        view.ui.add(
            layerList,
            "top-right"
        );

        /*
         * CLEANUP
         */
        return () => {
            view.ui.remove(layerList);

            view.ui.remove(basemapToggle);

            view.destroy();

            viewRef.current = null;
        };
    }, []);

    /*
     * UPDATE MAP WHEN SEARCH CHANGES
     */
    useEffect(() => {
        if (!viewRef.current) return;

        const view = viewRef.current;

        /*
         * SEARCHED LOCATION
         */
        const point = new Point({
            longitude: coordinates.lon,
            latitude: coordinates.lat,
        });

        /*
         * MOVE MAP
         */
        view.goTo({
            target: point,
            zoom: 10,
        });

        /*
         * REMOVE PREVIOUS MARKER
         */
        if (graphicRef.current) {
            view.graphics.remove(
                graphicRef.current
            );
        }

        /*
         * WEATHER POPUP
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
                                              weatherData.main.temp
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
                                    letter-spacing: 1px;
                                    color: #6b7280;
                                    margin-bottom: 3px;
                                ">
                                    FEELS LIKE
                                </div>

                                <strong style="
                                    font-size: 17px;
                                    color: #1f2937;
                                ">
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
                                    letter-spacing: 1px;
                                    color: #6b7280;
                                    margin-bottom: 3px;
                                ">
                                    HUMIDITY
                                </div>

                                <strong style="
                                    font-size: 17px;
                                    color: #1f2937;
                                ">
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
                                    letter-spacing: 1px;
                                    color: #6b7280;
                                    margin-bottom: 3px;
                                ">
                                    WIND
                                </div>

                                <strong style="
                                    font-size: 17px;
                                    color: #1f2937;
                                ">
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
                                    letter-spacing: 1px;
                                    color: #6b7280;
                                    margin-bottom: 3px;
                                ">
                                    CONDITION
                                </div>

                                <strong style="
                                    font-size: 13px;
                                    color: #1f2937;
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
         * CITY GRAPHIC
         */
        const graphic = new Graphic({
            geometry: point,

            symbol: {
                type: "simple-marker",

                color: "#3b82f6",

                size: 12,

                outline: {
                    color: "#ffffff",
                    width: 2,
                },
            },

            popupTemplate,
        });

        view.graphics.add(graphic);

        graphicRef.current = graphic;

        /*
         * OPEN POPUP
         */
        view.openPopup({
            features: [graphic],

            location: point,
        });
    }, [coordinates, weatherData]);

    return (
        <div
            ref={mapDiv}
            style={{
                height: "100%",
                width: "100%",
            }}
        />
    );
}

export default WeatherMap;
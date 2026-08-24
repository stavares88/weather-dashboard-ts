import { useEffect, useRef } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
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

        const map = new Map({
            basemap: "topo-vector",
        });

        const view = new MapView({
            container: mapDiv.current,
            map,
            center: [coordinates.lon, coordinates.lat],
            zoom: 9,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
        };
    }, []);

    useEffect(() => {
        if (!viewRef.current) return;

        const view = viewRef.current;

        const point = new Point({
            longitude: coordinates.lon,
            latitude: coordinates.lat,
        });

        view.goTo({
            target: point,
            zoom: 10,
        });

        if (graphicRef.current) {
            view.graphics.remove(graphicRef.current);
        }

        const popupTemplate = {
            title: weatherData?.name || "Selected Location",

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
                                        ? Math.round(weatherData.main.temp)
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
                                    weatherData?.weather[0].description ||
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
                                                  weatherData.main.feels_like
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
                                            ? weatherData.main.humidity
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
                                            ? weatherData.wind.speed
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
                                        weatherData?.weather[0].description ||
                                        "—"
                                    }
                                </strong>
                            </div>

                        </div>

                    </div>

                </div>
            `,
        };

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
import { useEffect, useRef } from "react";

import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import Graphic from "@arcgis/core/Graphic";

interface WeatherData {
    name: string;

    main: {
        temp: number;
        humidity: number;
    };

    weather: {
        description: string;
    }[];
}

interface WeatherMapProps {
    coordinates: {
        lat: number;
        lon: number;
    };

    weatherData: WeatherData | null;
}

function WeatherMap({ coordinates, weatherData }: WeatherMapProps) {
    const mapDiv = useRef<HTMLDivElement>(null);
    const viewRef = useRef<MapView | null>(null);

    useEffect(() => {
        if (!mapDiv.current) return;

        const map = new Map({
            basemap: "topo-vector",
        });

        const view = new MapView({
            container: mapDiv.current,
            map: map,
            center: [coordinates.lon, coordinates.lat],
            zoom: 10,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
        };
    }, []);

    useEffect(() => {
        if (!viewRef.current) return;

        const view = viewRef.current;

        view.graphics.removeAll();

        const cityGraphic = new Graphic({
            geometry: {
                type: "point",
                longitude: coordinates.lon,
                latitude: coordinates.lat,
            },

            symbol: {
                type: "simple-marker",
                color: "red",
                size: 20,
                outline: {
                    color: "white",
                    width: 2,
                },
            },

            attributes: {
                name: weatherData?.name || "Selected Location",

                temperature: weatherData
                    ? `${Math.round(weatherData.main.temp)}°F`
                    : "Weather unavailable",

                humidity: weatherData
                    ? `${weatherData.main.humidity}%`
                    : "Weather unavailable",

                conditions: weatherData
                    ? weatherData.weather[0].description
                    : "Weather unavailable",
            },

            popupTemplate: {
                title: "{name}",
                content: `
                    <strong>Temperature:</strong> {temperature}<br>
                    <strong>Humidity:</strong> {humidity}<br>
                    <strong>Conditions:</strong> {conditions}
                `,
            },
        });

        view.graphics.add(cityGraphic);

        view.goTo({
            center: [coordinates.lon, coordinates.lat],
            zoom: 10,
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
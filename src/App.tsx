import { useState } from "react";
import WeatherMap from "./components/WeatherMap";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import "./App.css";

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

function App() {
    const [coordinates, setCoordinates] = useState({
        lat: 39.7392,
        lon: -104.9903,
    });

    const [weatherData, setWeatherData] =
        useState<WeatherData | null>(null);

    return (
        <div className="dashboard">
            <div className="dashboard-content">
                <Header />

                <SearchBar
                    setCoordinates={setCoordinates}
                    weatherData={weatherData}
                    setWeatherData={setWeatherData}
                />

                <div className="dashboard-main">
                    <div className="weather-panel">
                        {weatherData ? (
                            <div className="weather-card">
                                <p className="weather-label">
                                    CURRENT WEATHER
                                </p>

                                <h2>{weatherData.name}</h2>

                                <div className="temperature">
                                    {Math.round(weatherData.main.temp)}°
                                </div>

                                <p className="condition">
                                    {weatherData.weather[0].description}
                                </p>

                                <div className="weather-details">
                                    <div className="weather-detail">
                                        <span>💧</span>

                                        <div>
                                            <p>Humidity</p>
                                            <strong>
                                                {weatherData.main.humidity}%
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="weather-detail">
                                        <span>📍</span>

                                        <div>
                                            <p>Location</p>
                                            <strong>
                                                {weatherData.name}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-weather">
                                <span>🌤️</span>

                                <h2>Weather Dashboard</h2>

                                <p>
                                    Search for a city to view current weather
                                    data.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="map-panel">
                        <div className="map-header">
                            <div>
                                <p className="map-label">
                                    INTERACTIVE MAP
                                </p>

                                <h2>Weather Location</h2>
                            </div>

                            {weatherData && (
                                <span className="map-location">
                                    📍 {weatherData.name}
                                </span>
                            )}
                        </div>

                        <div className="map-container">
                            <WeatherMap
                                coordinates={coordinates}
                                weatherData={weatherData}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
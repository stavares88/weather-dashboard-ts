import { useState } from "react";
import WeatherMap from "./components/WeatherMap";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import "./App.css";

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

interface ForecastItem {
    dt: number;

    main: {
        temp: number;
    };

    weather: {
        description: string;
        icon: string;
    }[];
}

function App() {
    const [coordinates, setCoordinates] = useState({
        lat: 39.7392,
        lon: -104.9903,
    });

    const [weatherData, setWeatherData] =
        useState<WeatherData | null>(null);

    const [forecastData, setForecastData] =
        useState<ForecastItem[]>([]);

    const getWeatherStatus = () => {
        if (!weatherData) return "";

        const condition =
            weatherData.weather[0].description.toLowerCase();

        if (condition.includes("clear")) {
            return "☀️ CLEAR SKIES";
        }

        if (condition.includes("cloud")) {
            return "☁️ CLOUDY";
        }

        if (condition.includes("rain")) {
            return "🌧️ RAINING";
        }

        if (condition.includes("snow")) {
            return "❄️ SNOWING";
        }

        if (condition.includes("thunder")) {
            return "⛈️ STORM CONDITIONS";
        }

        return "🌤️ CURRENT CONDITIONS";
    };

    return (
        <div className="dashboard">
            <div className="dashboard-content">
                <Header />

                <SearchBar
                    setCoordinates={setCoordinates}
                    weatherData={weatherData}
                    setWeatherData={setWeatherData}
                    setForecastData={setForecastData}
                />

                <div className="dashboard-main">
                    <div className="weather-panel">
                        {weatherData ? (
                            <div className="weather-card">
                                <p className="weather-label">
                                    CURRENT WEATHER
                                </p>

                                <h2>{weatherData.name}</h2>

                                <img
                                    className="weather-icon"
                                    src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`}
                                    alt={weatherData.weather[0].description}
                                />

                                <div className="temperature">
                                    {Math.round(weatherData.main.temp)}°
                                </div>

                                <div className="weather-status">
                                    {getWeatherStatus()}
                                </div>

                                <p className="condition">
                                    {weatherData.weather[0].description}
                                </p>

                                <div className="weather-details">
                                    <div className="weather-detail">
                                        <span>🌡️</span>

                                        <div>
                                            <p>Feels Like</p>
                                            <strong>
                                                {Math.round(
                                                    weatherData.main.feels_like
                                                )}
                                                °
                                            </strong>
                                        </div>
                                    </div>

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
                                        <span>🌬️</span>

                                        <div>
                                            <p>Wind Speed</p>
                                            <strong>
                                                {weatherData.wind.speed} mph
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

                {forecastData.length > 0 && (
                    <div className="forecast-section">
                        <p className="weather-label">
                            5-DAY FORECAST
                        </p>

                        <div className="forecast-grid">
                            {forecastData.map((forecast) => (
                                <div
                                    className="forecast-card"
                                    key={forecast.dt}
                                >
                                    <p>
                                        {new Date(
                                            forecast.dt * 1000
                                        ).toLocaleDateString("en-US", {
                                            weekday: "short",
                                        })}
                                    </p>

                                    <img
                                        src={`https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png`}
                                        alt={
                                            forecast.weather[0].description
                                        }
                                    />

                                    <strong>
                                        {Math.round(
                                            forecast.main.temp
                                        )}
                                        °
                                    </strong>

                                    <span>
                                        {
                                            forecast.weather[0]
                                                .description
                                        }
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
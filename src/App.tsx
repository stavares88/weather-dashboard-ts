import { useEffect, useState } from "react";
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

  // Controls the full GIS workspace.
  const [isMapFullscreen, setIsMapFullscreen] =
    useState(false);

  // Allow Escape to leave GIS Workspace Mode.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMapFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  const getWeatherStatus = () => {
    if (!weatherData) {
      return "";
    }

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

  // =========================================================
  // FULL GIS WORKSPACE
  // =========================================================

  if (isMapFullscreen) {
    return (
      <div className="gis-workspace">
        <div className="gis-workspace-header">
          <div className="gis-workspace-brand">
            <span className="gis-workspace-label">
              ATMOSMAP
            </span>

            <span className="gis-workspace-title">
              GIS Workspace
            </span>

            {weatherData && (
              <span className="gis-workspace-location">
                📍 {weatherData.name}
              </span>
            )}
          </div>

          <button
            type="button"
            className="exit-workspace-button"
            onClick={() => setIsMapFullscreen(false)}
          >
            ✕ Exit Full Map
          </button>
        </div>

        <div className="gis-workspace-map map-container">
          <WeatherMap
            coordinates={coordinates}
            weatherData={weatherData}
          />
        </div>
      </div>
    );
  }

  // =========================================================
  // NORMAL ATMOSMAP DASHBOARD
  // =========================================================

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
          {/* =================================================
              WEATHER PANEL
             ================================================= */}

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
                  alt={
                    weatherData.weather[0].description
                  }
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
                  Search for a city to view current
                  weather data.
                </p>
              </div>
            )}

            {/* =================================================
                SCROLLABLE 5-DAY FORECAST
               ================================================= */}

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
                      <img
                        className="forecast-icon"
                        src={`https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png`}
                        alt={
                          forecast.weather[0]
                            .description
                        }
                      />

                      <div className="forecast-info">
                        <div className="forecast-temp">
                          {Math.round(
                            forecast.main.temp
                          )}
                          °
                        </div>

                        <div className="forecast-condition">
                          {
                            forecast.weather[0]
                              .description
                          }
                        </div>
                      </div>

                      <div className="forecast-day">
                        {new Date(
                          forecast.dt * 1000
                        ).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                          }
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              MAP PANEL
             ================================================= */}

          <div className="map-panel">
            <div className="map-header">
              <div>
                <p className="map-label">
                  INTERACTIVE MAP
                </p>

                <h2>Weather Location</h2>
              </div>

              <div className="map-header-actions">
                {weatherData && (
                  <span className="map-location">
                    📍 {weatherData.name}
                  </span>
                )}

                <button
                  type="button"
                  className="fullscreen-map-button"
                  onClick={() =>
                    setIsMapFullscreen(true)
                  }
                >
                  ⛶ Full Map
                </button>
              </div>
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
import { useState } from "react";

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

interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

interface SearchBarProps {
  setCoordinates: (coordinates: {
    lat: number;
    lon: number;
  }) => void;

  weatherData: WeatherData | null;

  setWeatherData: (data: WeatherData | null) => void;

  setForecastData: (data: ForecastItem[]) => void;
}

const apiKey = import.meta.env.VITE_API_KEY;

function SearchBar({
  setCoordinates,
  setWeatherData,
  setForecastData,
}: SearchBarProps) {
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const searchTerm = city.trim();

    if (!searchTerm) {
      setError("Please enter a city");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // =====================================================
      // 1. GEOCODE SEARCH
      // =====================================================

      const geocodingUrl =
        `https://api.openweathermap.org/geo/1.0/direct` +
        `?q=${encodeURIComponent(searchTerm)}` +
        `&limit=5` +
        `&appid=${apiKey}`;

      const geocodingResponse = await fetch(geocodingUrl);

      if (!geocodingResponse.ok) {
        throw new Error("Geocoding request failed");
      }

      const geocodingData: GeocodingResult[] =
        await geocodingResponse.json();

      if (geocodingData.length === 0) {
        setError("Location not found");
        setWeatherData(null);
        setForecastData([]);
        return;
      }

      // For now, use the highest-ranked geocoding result.
      const location = geocodingData[0];

      const { lat, lon } = location;

      console.log("AtmosMap geocoding result:", location);
      console.log("AtmosMap coordinates:", {
        lat,
        lon,
      });

      // =====================================================
      // 2. UPDATE MAP COORDINATES
      // =====================================================

      setCoordinates({
        lat,
        lon,
      });

      // =====================================================
      // 3. CURRENT WEATHER BY COORDINATES
      // =====================================================

      const currentWeatherUrl =
        `https://api.openweathermap.org/data/2.5/weather` +
        `?lat=${lat}` +
        `&lon=${lon}` +
        `&appid=${apiKey}` +
        `&units=imperial`;

      // =====================================================
      // 4. FORECAST BY SAME COORDINATES
      // =====================================================

      const forecastUrl =
        `https://api.openweathermap.org/data/2.5/forecast` +
        `?lat=${lat}` +
        `&lon=${lon}` +
        `&appid=${apiKey}` +
        `&units=imperial`;

      const [weatherResponse, forecastResponse] =
        await Promise.all([
          fetch(currentWeatherUrl),
          fetch(forecastUrl),
        ]);

      if (!weatherResponse.ok || !forecastResponse.ok) {
        throw new Error("Weather request failed");
      }

      const weatherData: WeatherData =
        await weatherResponse.json();

      const forecastData = await forecastResponse.json();

      // =====================================================
      // 5. UPDATE CURRENT WEATHER
      // =====================================================

      setWeatherData(weatherData);

      // =====================================================
      // 6. BUILD DAILY FORECAST
      // =====================================================

      const dailyForecast: ForecastItem[] =
        forecastData.list
          .filter(
            (item: { dt_txt: string }) =>
              item.dt_txt.includes("12:00:00")
          )
          .slice(0, 5);

      setForecastData(dailyForecast);
    } catch (error) {
      console.error("AtmosMap search error:", error);

      setError("Unable to load location data");

      setWeatherData(null);
      setForecastData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-section">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search city, state, or location..."
          value={city}
          onChange={(event) => {
            setCity(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSearch();
            }
          }}
        />

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "Locating..." : "Search"}
        </button>
      </div>

      {loading && (
        <p className="loading-message">
          Locating geographic coordinates...
        </p>
      )}

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}
    </div>
  );
}

export default SearchBar;
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
        if (!city.trim()) {
            setError("Please enter a city");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const currentWeatherUrl =
                `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=imperial`;

            const forecastUrl =
                `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=imperial`;

            const [weatherResponse, forecastResponse] =
                await Promise.all([
                    fetch(currentWeatherUrl),
                    fetch(forecastUrl),
                ]);

            if (!weatherResponse.ok || !forecastResponse.ok) {
                setError("City not found");
                setWeatherData(null);
                setForecastData([]);
                return;
            }

            const weatherData = await weatherResponse.json();
            const forecastData = await forecastResponse.json();

            setWeatherData(weatherData);

            setCoordinates({
                lat: weatherData.coord.lat,
                lon: weatherData.coord.lon,
            });

            const dailyForecast = forecastData.list.filter(
                (item: { dt_txt: string }) =>
                    item.dt_txt.includes("12:00:00")
            );

            setForecastData(dailyForecast);

        } catch (error) {
            console.error(error);
            setError("Unable to load weather data");
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
                    placeholder="Search for a city..."
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            handleSearch();
                        }
                    }}
                />

                <button
                    onClick={handleSearch}
                    disabled={loading}
                >
                    {loading ? "Loading..." : "Search"}
                </button>
            </div>

            {loading && (
                <p className="loading-message">
                    Updating AtmosMap...
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
import { useState } from "react";

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

interface SearchBarProps {
    setCoordinates: (coordinates: {
        lat: number;
        lon: number;
    }) => void;

    weatherData: WeatherData | null;

    setWeatherData: (data: WeatherData | null) => void;
}

const apiKey = import.meta.env.VITE_API_KEY;

function SearchBar({
    setCoordinates,
    setWeatherData,
}: SearchBarProps) {
    const [city, setCity] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=imperial`;

        const response = await fetch(url);

        if (!response.ok) {
            setError("City not found");
            setWeatherData(null);
            return;
        }

        const data = await response.json();

        setWeatherData(data);
        setError(null);

        setCoordinates({
            lat: data.coord.lat,
            lon: data.coord.lon,
        });
    };

    return (
        <div className="search-section">
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search for a city..."
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                />

                <button onClick={handleSearch}>
                    Search
                </button>
            </div>

            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default SearchBar;
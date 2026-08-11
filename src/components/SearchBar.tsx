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

const apiKey = import.meta.env.VITE_API_KEY;

function SearchBar() {
    const [city, setCity] = useState("");
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

    const handleSearch = async () => {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;

        const response = await fetch(url);

        const data = await response.json();

        setWeatherData(data);
    };

    return (
        <div>
            <input
                type="text"
                placeholder="Enter a city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
            />

            <button onClick={handleSearch}>Search</button>

            <p>Current City: {city}</p>

           {weatherData && (
    <div>
        <h2>{weatherData.name}</h2>
        <p>Temperature: {weatherData.main.temp}</p>
    </div>
)}
        </div>
    );
}

export default SearchBar;
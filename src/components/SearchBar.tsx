import { useState } from "react";
const apiKey = import.meta.env.VITE_API_KEY;
function SearchBar() {
    const [city, setCity] = useState("");
    const handleSearch = async () => {
      console.log("API KEY:",apiKey);
const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;
const response = await fetch(url);
const data = await response.json();
console.log(data);
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
    </div>
 );
}

export default SearchBar;

 
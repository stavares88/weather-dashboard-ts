import { useState } from "react";
const apiKey = import.meta.env.VITE_API_KEY;
function SearchBar() {
    const [city, setCity] = useState("");
    const handleSearch = () => {
  console.log(city);
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

 
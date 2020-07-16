import {
  calculateCloudsFactor,
  mapUVIndexToColor,
  mapUVIndexToLabel,
  transformDailyForcast,
  transformHourlyForcast,
  focusWhenTabPressed,
  addFavicon,
} from "./utils.js";

import { locationManager } from "./location.js";
import { fetchCurrentUV, fetchForecastedUV, fetchWeather } from "./network.js";
import { renderer } from "./renderer.js";
import {
  temperatureManager,
  forecastModeManager,
  skinTypeManager,
} from "./controls.js";

import { errorManager } from "./error.js";

function main() {
  let lat = null;
  let lng = null;
  let address = null;
  let now = new Date();

  let tempUnit = "celsius";
  let currentTemp = null;
  let currentCloudCover = null;
  let sunriseDateTime = null;
  let sunsetDateTime = null;
  let windSpeed = null;
  let humidity = null;
  let dewPoint = null;
  let pressure = null;
  let uvColorHex = null;
  let uvIndex = null;
  let uvLabel = null;
  let forecastMode = "hourly";
  let dailyForecast = null;
  let hourlyForecast = null;
  let skinType = null;

  const { render, renderTempUnitOnly } = renderer();

  locationManager(onLocationChanged);
  temperatureManager(onTemperatureUnitChanged);
  forecastModeManager(onForecastModeChanged);
  skinTypeManager(onSkinTypeChanged);

  focusWhenTabPressed();
  addFavicon();

  function setLocationState(location) {
    lat = location.lat;
    lng = location.lng;
    address = location.locationName;
  }

  function setWeatherState([currentUV, forecastedUV, weatherData]) {
    currentTemp = weatherData.current.temp;
    currentCloudCover = weatherData.current.clouds;
    sunriseDateTime = currentUV.result.sun_info.sun_times.sunrise;
    sunsetDateTime = currentUV.result.sun_info.sun_times.sunset;
    uvIndex = calculateCloudsFactor(currentUV.result.uv, currentCloudCover);
    uvColorHex = mapUVIndexToColor(uvIndex);
    uvLabel = mapUVIndexToLabel(uvIndex);
    windSpeed = weatherData.current.wind_speed;
    humidity = weatherData.current.humidity;
    dewPoint = weatherData.current.dew_point;
    pressure = weatherData.current.pressure;

    dailyForecast = transformDailyForcast(weatherData.daily);
    hourlyForecast = transformHourlyForcast(
      weatherData.hourly,
      forecastedUV.result
    );
  }

  function fetchData() {
    return Promise.all([
      fetchCurrentUV(lat, lng),
      fetchForecastedUV(lat, lng, now),
      fetchWeather(lat, lng),
    ]);
  }

  async function onLocationChanged(location) {
    setLocationState(location);
    const response = await fetchData();
    setWeatherState(response);
    renderUI();
  }

  function onForecastModeChanged(newMode) {
    forecastMode = newMode;
    renderUI();
  }

  function onTemperatureUnitChanged(newUnit) {
    tempUnit = newUnit;

    !lat || !lng ? renderTempUnitOnly(tempUnit) : renderUI();
  }

  function onSkinTypeChanged(newType) {
    skinType = newType;
    renderUI();
  }

  function renderUI() {
    errorManager().clearErrorMessage();

    render(
      address,
      uvIndex,
      uvColorHex,
      uvLabel,
      tempUnit,
      currentTemp,
      currentCloudCover,
      sunriseDateTime,
      sunsetDateTime,
      windSpeed,
      humidity,
      dewPoint,
      pressure,
      forecastMode,
      dailyForecast,
      hourlyForecast,
      skinType
    );
  }
}

document.addEventListener("DOMContentLoaded", main);

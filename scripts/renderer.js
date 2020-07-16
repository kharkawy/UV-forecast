import {
  convertTemperature,
  extractTimeFromDate,
  safeExposure,
  vitDExposure,
} from "./utils.js";
import { iconMap } from "./consts.js";

export function renderer() {
  const $locationInput = document.querySelector("#uv-forecast__location-input");
  const $content = document.querySelector("#uv-forecast__main-content");
  const $locationName = document.querySelector("#uv-forecast__location-name");
  const $uvIndex = document.querySelector("#uv-forecast__uv-index-value");
  const $uvLabel = document.querySelector("#uv-forecast__uv-index-label");
  const $currentTemp = document.querySelector("#uv-forecast__current-temp");
  const $currentCloudCover = document.querySelector(
    "#uv-forecast__current-clouds"
  );
  const $sunriseTime = document.querySelector("#uv-forecast__sunrise-time");
  const $sunsetTime = document.querySelector("#uv-forecast__sunset-time");
  const $weatherDetails = document.querySelector(
    "#uv-forecast__current-weather-with-text"
  );
  const $forecastHourlyBtn = document.querySelector("[data-mode='hourly']");
  const $forecastDailyBtn = document.querySelector("[data-mode='daily']");
  const $forecastContainer = document.querySelector(
    "#uv-forecast__forecast-content"
  );
  const $exposureTimesContainer = document.querySelector(
    "#uv-forecast__exposure-times"
  );
  const $skinTypeBtns = document.querySelectorAll("[data-skin]");

  function dailyForecastRow(forecast, tempUnit) {
    return `<div id="uv-forecast__forecast-row" class="forecast-row">
      <span class="weekday">${forecast.nameDayOfWeek}</span>
      <span class="daily-temp">${convertTemperature(
        tempUnit,
        forecast.maxTemp
      )}/${convertTemperature(tempUnit, forecast.minTemp)}
      </span>
      <span><img class="forecast-icon" src="./icons/${
        iconMap[forecast.icon]
      }.svg" alt="${iconMap[forecast.icon]}"></span>
      <span class="forecast-uv-value">UV: ${forecast.uvIndex}</span>
      <span class="forecast-uv-label">${forecast.uvLabel}</span>
    </div>`;
  }

  function hourlyForecastRow(forecast, tempUnit) {
    return `<div id="uv-forecast__forecast-row" class="forecast-row">
      <span class="forecast-hour">${forecast.time}</span>
      <span class="hourly-temp">${convertTemperature(
        tempUnit,
        forecast.temp
      )}</span>
      <span><img class="forecast-icon" src="./icons/${
        iconMap[forecast.icon]
      }.svg" alt="${iconMap[forecast.icon]}"></span>
        <span class="forecast-uv-value">UV: ${forecast.uvIndex}</span>
        <span class="forecast-uv-label">${forecast.uvLabel}</span>
      </div>`;
  }

  function skinTypeExposureRow(skinType, uvIndex, uvLabel) {
    return `<div class="exposure-container">
    <span class="exposure-value">${safeExposure(skinType, uvIndex)}</span>
    <span class="exposure-label">to get sunburnt</span>
    </div>
    <div class="exposure-container">
    <span class="exposure-value">${vitDExposure(skinType, uvLabel)}min</span>
    <span class="exposure-label">for daily vitamin D dose</span>
    </div>`;
  }
  function currentWeatherRow(wind, humidity, tempUnit, dewPoint, pressure) {
    return `<div class="curent-weather-row">
  <span class="weather-item-label">Wind</span>
  <span class="weather-detail-value">${wind}m/s</span>
  </div>
    <div class="curent-weather-row">
  <span class="weather-item-label">Humidity</span>
  <span class="weather-detail-value">${humidity}%</span>
  </div>
    <div class="curent-weather-row">
  <span class="weather-item-label">Dew point</span>
  <span class="weather-detail-value">${convertTemperature(
    tempUnit,
    dewPoint
  )}</span>
  </div>
    <div class="curent-weather-row">
  <span class="weather-item-label">Pressure</span>
  <span class="weather-detail-value">${pressure}hPa</span>
  </div>`;
  }

  function renderCurrentWeatherDetails(
    wind,
    humidity,
    tempUnit,
    dewPoint,
    pressure
  ) {
    $weatherDetails.innerHTML = "";
    const html = currentWeatherRow(
      wind,
      humidity,
      tempUnit,
      dewPoint,
      pressure
    );
    $weatherDetails.insertAdjacentHTML("beforeend", html);
  }

  function renderDailyForecast(dailyForecast, tempUnit) {
    $forecastContainer.innerHTML = "";
    dailyForecast.forEach(function (forecast) {
      const html = dailyForecastRow(forecast, tempUnit);
      $forecastContainer.insertAdjacentHTML("beforeend", html);
    });
  }

  function renderHourlyForecast(hourlyForecast, tempUnit) {
    $forecastContainer.innerHTML = "";
    hourlyForecast.forEach(function (forecast) {
      const html = hourlyForecastRow(forecast, tempUnit);
      $forecastContainer.insertAdjacentHTML("beforeend", html);
    });
  }
  function renderSkinTypeData(skinType, uvIndex, uvLabel) {
    $exposureTimesContainer.innerHTML = "";
    const html = skinTypeExposureRow(skinType, uvIndex, uvLabel);
    $exposureTimesContainer.insertAdjacentHTML("beforeend", html);
  }

  function render(
    location,
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
  ) {
    $locationInput.value = "";
    $content.style.display = "flex";
    $locationName.innerHTML = location;
    $uvIndex.innerHTML = uvIndex;
    $uvLabel.innerHTML = uvLabel + " uv";
    $currentTemp.innerHTML = convertTemperature(tempUnit, currentTemp);
    $currentCloudCover.innerHTML = currentCloudCover + `%`;
    $sunriseTime.innerHTML = extractTimeFromDate(sunriseDateTime);
    $sunsetTime.innerHTML = extractTimeFromDate(sunsetDateTime);

    document.body.style.backgroundColor = uvColorHex;

    renderCurrentWeatherDetails(
      windSpeed,
      humidity,
      tempUnit,
      dewPoint,
      pressure
    );

    renderTempUnit(tempUnit);

    if (forecastMode === "daily") {
      renderDailyForecast(dailyForecast, tempUnit);
      $forecastHourlyBtn.classList.remove("btn-forecast-mode-active");
      $forecastDailyBtn.classList.add("btn-forecast-mode-active");
    } else if (forecastMode === "hourly") {
      renderHourlyForecast(hourlyForecast, tempUnit);
      $forecastDailyBtn.classList.remove("btn-forecast-mode-active");
      $forecastHourlyBtn.classList.add("btn-forecast-mode-active");
    }

    if (skinType) {
      renderSkinTypeData(skinType, uvIndex, uvLabel);
      $skinTypeBtns.forEach(function (btn) {
        if (btn.dataset.skin === skinType) {
          btn.classList.add("btn-skin-type-active");
        } else {
          btn.classList.remove("btn-skin-type-active");
        }
      });
    }
  }

  function renderTempUnit(tempUnit) {
    const $tempCelsiusBtn = document.querySelector("[data-unit='celsius']");
    const $tempFahrenheitBtn = document.querySelector(
      "[data-unit='fahrenheit']"
    );
    if (tempUnit === "celsius") {
      $tempFahrenheitBtn.classList.remove("btn-temp-active");
      $tempCelsiusBtn.classList.add("btn-temp-active");
    } else {
      $tempCelsiusBtn.classList.remove("btn-temp-active");
      $tempFahrenheitBtn.classList.add("btn-temp-active");
    }
  }
  return { render, renderTempUnitOnly: renderTempUnit };
}

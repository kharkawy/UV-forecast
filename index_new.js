/* ---!-- Main function --!--- */
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
  let uvColorHex = null;
  let uvIndex = null;
  let uvLabel = null;
  let forecastMode = "hourly";
  let dailyForecast = null;
  let hourlyForecast = null;
  let skinType = null;

  const render = renderer();

  locationManager(onLocationChanged);
  temperatureManager(onTemperatureUnitChanged);
  forecastModeManager(onForecastModeChanged);
  skinTypeManager(onSkinTypeChanged);

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
    renderUI();
  }

  function onSkinTypeChanged(newType) {
    skinType = newType;
    renderUI();
  }

  function renderUI() {
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
      forecastMode,
      dailyForecast,
      hourlyForecast,
      skinType
    );
  }
}

document.addEventListener("DOMContentLoaded", main);

//DOM
const appStatus = document.getElementById("status");

/* ---!-- Finding location --!--- */

function locationManager(onLocationChanged) {
  //Autocomplete

  const locationInput = document.getElementById("location-input");

  const autocompleteOptions = {
    types: ["(cities)"],
  };

  const autocomplete = new google.maps.places.Autocomplete(
    locationInput,
    autocompleteOptions
  );

  function onAutocompletePlaceChanged() {
    const place = autocomplete.getPlace();

    if (!place.geometry) {
      appStatus.innerHTML =
        "No details available for input: '" + place.name + "'";
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const locationName = extractLocationName(place.address_components);

    onLocationChanged({ lat, lng, locationName });
  }

  autocomplete.addListener("place_changed", onAutocompletePlaceChanged);

  function extractLocationName(location) {
    const name = location.find(function (addressComp) {
      return addressComp.types.includes("locality");
    }).long_name;

    return name ? name : null;
  }

  //Geolocation

  const geolocationBtn = document.getElementById("geolocation-btn");

  const geolocationOptions = {
    timeout: 10000,
  };

  function onGeolocationPlaceChanged() {
    appStatus.innerHTML = "Locating...";
    navigator.geolocation.getCurrentPosition(
      geolocationSuccess,
      geolocationError,
      geolocationOptions
    );
  }

  async function geolocationSuccess(position) {
    const geocoder = new google.maps.Geocoder();

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    const LatLng = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    };

    const locationName = await findLocationName(geocoder, LatLng);
    appStatus.innerHTML = "";

    onLocationChanged({ lat, lng, locationName });
  }

  function geolocationError(err) {
    appStatus.innerHTML = "Unable to retrieve your location.";
  }

  function findLocationName(geocoder, latlng) {
    return new Promise(function (resolve, reject) {
      geocoder.geocode({ location: latlng }, function (result, status) {
        if (status === "OK" && result[0]) {
          appStatus.innerHTML = "";
          const locationName = extractLocationName(
            result[0].address_components
          );
          locationName ? resolve(locationName) : reject();
        } else {
          appStatus.innerHTML = "Geocoder failed due to: " + status;
          reject();
        }
      });
    });
  }

  geolocationBtn.addEventListener("click", onGeolocationPlaceChanged);
}

/* ---!-- Fetching data from APIs --!--- */

const openuvApiToken = "85797c8abf405c359f7f51563fc05172";
const openuvApiURL = "https://api.openuv.io/api/v1/";

const openweatherApiToken = "c1d13ca3ce67ce7193a0ba5b70468f07";
const openweatherApiUrl = "https://api.openweathermap.org/data/2.5/onecall";

const excl = "minutely";

const useMockApiResponse = true;

function fetchCurrentUV(lat, lng) {
  let url = new URL(openuvApiURL + "/uv");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lng", lng);

  if (useMockApiResponse) {
    return fakeResponseCurrentUV;
  }

  return fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-access-token": openuvApiToken,
    },
  })
    .then(handleErrors)
    .then(function (response) {
      return response.json();
    })
    .catch(function (err) {
      appStatus.innerHTML = err;
    });
}
function fetchForecastedUV(lat, lng, date) {
  let url = new URL(openuvApiURL + "/forecast");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lng", lng);
  url.searchParams.set("dt", date);

  if (useMockApiResponse) {
    return fakeResponseForcastedUV;
  }

  return fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-access-token": openuvApiToken,
    },
  })
    .then(handleErrors)
    .then(function (response) {
      return response.json();
    })
    .catch(function (err) {
      appStatus.innerHTML = err;
    });
}

function fetchWeather(lat, lng) {
  let url = new URL(openweatherApiUrl);
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lng);
  url.searchParams.set("exclude", excl);
  url.searchParams.set("appid", openweatherApiToken);
  return fetch(url, {
    headers: {
      Accept: "application/json",
    },
  })
    .then(handleErrors)
    .then(function (response) {
      return response.json();
    })
    .catch(function (err) {
      appStatus.innerHTML = err;
    });
}

function handleErrors(response) {
  if (!response.ok) {
    throw Error(response.statusText);
  }
  return response;
}

/*---!-- Mock responses --!---*/

const fakeResponseCurrentUV = JSON.parse(
  '{"result":{"uv":5.8835,"uv_time":"2020-06-14T09:18:12.322Z","uv_max":7.7543,"uv_max_time":"2020-06-14T11:35:10.026Z","ozone":316.7,"ozone_time":"2020-06-14T09:06:59.038Z","safe_exposure_time":{"st1":28,"st2":34,"st3":45,"st4":57,"st5":91,"st6":170},"sun_info":{"sun_times":{"solarNoon":"2020-06-14T11:35:10.026Z","nadir":"2020-06-13T23:35:10.026Z","sunrise":"2020-06-14T03:12:16.882Z","sunset":"2020-06-14T19:58:03.170Z","sunriseEnd":"2020-06-14T03:16:55.729Z","sunsetStart":"2020-06-14T19:53:24.323Z","dawn":"2020-06-14T02:22:47.012Z","dusk":"2020-06-14T20:47:33.041Z","nauticalDawn":"2020-06-14T01:02:19.397Z","nauticalDusk":"2020-06-14T22:08:00.655Z","nightEnd":null,"night":null,"goldenHourEnd":"2020-06-14T04:07:54.670Z","goldenHour":"2020-06-14T19:02:25.382Z"},"sun_position":{"azimuth":-0.9575741922053829,"altitude":0.8913679676798139}}}}'
);

const fakeResponseForcastedUV = JSON.parse(
  '{"result":[{"uv":0,"uv_time":"2020-06-17T03:11:50.020Z","sun_position":{"azimuth":-2.300558991888468,"altitude":-0.012853676119981058}},{"uv":0.1066,"uv_time":"2020-06-17T04:11:50.020Z","sun_position":{"azimuth":-2.0976884543522463,"altitude":0.11632311843687819}},{"uv":0.4069,"uv_time":"2020-06-17T05:11:50.020Z","sun_position":{"azimuth":-1.9026768013681659,"altitude":0.26144683023119064}},{"uv":1.0948,"uv_time":"2020-06-17T06:11:50.020Z","sun_position":{"azimuth":-1.7080473839286456,"altitude":0.4166480142261406}},{"uv":2.3931,"uv_time":"2020-06-17T07:11:50.020Z","sun_position":{"azimuth":-1.5033357654461672,"altitude":0.5760998889718945}},{"uv":3.7786,"uv_time":"2020-06-17T08:11:50.020Z","sun_position":{"azimuth":-1.2733422373844654,"altitude":0.7330208058308647}},{"uv":5.6,"uv_time":"2020-06-17T09:11:50.020Z","sun_position":{"azimuth":-0.9952499478473227,"altitude":0.877755517528925}},{"uv":6.8595,"uv_time":"2020-06-17T10:11:50.020Z","sun_position":{"azimuth":-0.6387703195513221,"altitude":0.9945263962089368}},{"uv":7.6637,"uv_time":"2020-06-17T11:11:50.020Z","sun_position":{"azimuth":-0.1883661473555341,"altitude":1.059247757901336}},{"uv":7.6637,"uv_time":"2020-06-17T12:11:50.020Z","sun_position":{"azimuth":0.3016273657580936,"altitude":1.050127263400716}},{"uv":6.6464,"uv_time":"2020-06-17T13:11:50.020Z","sun_position":{"azimuth":0.7313995703606322,"altitude":0.970744514571426}},{"uv":5.1834,"uv_time":"2020-06-17T14:11:50.020Z","sun_position":{"azimuth":1.0667449392142758,"altitude":0.8455289552362888}},{"uv":3.4104,"uv_time":"2020-06-17T15:11:50.020Z","sun_position":{"azimuth":1.3309859044903414,"altitude":0.6968169977145249}},{"uv":1.9474,"uv_time":"2020-06-17T16:11:50.020Z","sun_position":{"azimuth":1.5533195849522707,"altitude":0.5386058003595273}},{"uv":0.901,"uv_time":"2020-06-17T17:11:50.020Z","sun_position":{"azimuth":1.7545183537842346,"altitude":0.37963349183952855}},{"uv":0.3003,"uv_time":"2020-06-17T18:11:50.020Z","sun_position":{"azimuth":1.9484334809632404,"altitude":0.22632811037608222}},{"uv":0.0678,"uv_time":"2020-06-17T19:11:50.020Z","sun_position":{"azimuth":2.144719776418195,"altitude":0.08446193084077307}}]}'
);

/*---!-- Helper functions --!---*/

function calculateCloudsFactor(uv, clouds) {
  if (clouds < 20) {
    return Math.round(uv);
  } else if (clouds >= 20 && clouds < 70) {
    return Math.round(uv * 0.89);
  } else if (clouds >= 70 && clouds < 90) {
    return Math.round(uv * 0.73);
  } else if (clouds >= 90) {
    return Math.round(uv * 0.31);
  }
}

function mapUVIndexToLabel(uv) {
  if (uv >= 0 && uv < 3) {
    return "low";
  } else if (uv >= 3 && uv < 6) {
    return "moderate";
  } else if (uv >= 6 && uv < 8) {
    return "high";
  } else if (uv >= 8 && uv < 11) {
    return "very high";
  } else if (uv >= 11) {
    return "extreme";
  } else {
    return "not found";
  }
}
function mapUVIndexToColor(uv) {
  if (uv >= 0 && uv < 3) {
    return "#709D4F";
  } else if (uv >= 3 && uv < 6) {
    return "#F9A825";
  } else if (uv >= 6 && uv < 8) {
    return "#EF6C00";
  } else if (uv >= 8 && uv < 11) {
    return "#B71C1C";
  } else if (uv >= 11) {
    return "#854BA9";
  } else {
    return "not found";
  }
}

function extractTimeFromDate(date) {
  return (convertedDate = new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }));
}

function convertTemperature(tempUnit, tempInKelvins) {
  if (tempUnit === "celsius") {
    return Math.round(tempInKelvins - 273.15) + `&degC`;
  } else if (tempUnit === "fahrenheit") {
    return Math.round(tempInKelvins * 1.8 - 459.67) + `&degF`;
  }
}

function transformDailyForcast(dailyForecast) {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return dailyForecast
    .map(function (day) {
      const numberDayOfWeek = new Date(day.dt * 1000).getDay();
      const nameDayOfWeek = daysOfWeek[numberDayOfWeek];
      const maxTemp = day.temp.max;
      const minTemp = day.temp.min;
      const icon = day.weather[0].icon;
      const clouds = day.clouds;
      const uv = day.uvi;
      const uvIndex = calculateCloudsFactor(uv, clouds);
      const uvLabel = mapUVIndexToLabel(uvIndex);

      return {
        nameDayOfWeek,
        maxTemp,
        minTemp,
        icon,
        uvIndex,
        uvLabel,
      };
    })
    .slice(1);
}

function transformHourlyForcast(hourlyForecast, uvForecast) {
  return hourlyForecast
    .map(function (forecast) {
      const time = extractTimeFromDate(new Date(forecast.dt * 1000));
      const temp = forecast.temp;
      const icon = forecast.weather[0].icon;
      const clouds = forecast.clouds;
      let rawUV = null;

      uvForecast.find(function (elem) {
        if (
          time.substring(0, 2) ==
          extractTimeFromDate(elem.uv_time).substring(0, 2)
        ) {
          rawUV = elem.uv;
        } //spytać Rafała czemu else tu nie działa, tylko zwraca wszędzie 0
      });

      const uvIndex = calculateCloudsFactor(rawUV, clouds);
      const uvLabel = mapUVIndexToLabel(uvIndex);

      return {
        time,
        temp,
        icon,
        uvIndex,
        uvLabel,
      };
    })
    .slice(0, 8);
}

function safeExposure(skinType, uv) {
  let factor;
  switch (skinType) {
    case "type-1":
      factor = 2.5;
      return calculateExposure(factor, uv);
    case "type-3":
      factor = 4;
      return calculateExposure(factor, uv);
    case "type-4":
      factor = 5;
      return calculateExposure(factor, uv);
    case "type-5":
      factor = 8;
      return calculateExposure(factor, uv);
    case "type-6":
      factor = 15;
      return calculateExposure(factor, uv);
  }
}

function calculateExposure(factor, uv) {
  const exposureInMinutes = Math.round((200 * factor) / (3 * uv));
  const exposureInHours = Math.floor(exposureInMinutes / 60);
  const rest = exposureInMinutes % 60;
  let safeExposureTime;

  if (exposureInHours === 0) {
    return (safeExposureTime = rest + "min");
  } else {
    return (safeExposureTime = exposureInHours + "h " + rest + "min");
  }
}

function vitDExposure(skinType, uvLabel) {
  uvLabel.replace(/\s+/g, "");
  return vitDExposureTimes[uvLabel][skinType];
}

/*---!-- Temperature Unit Change --!---*/

function temperatureManager(onTemperatureUnitChanged) {
  const btns = document.querySelectorAll("#uv-forecast__temperature-btn");

  function onTemperatureBtnClicked(event) {
    onTemperatureUnitChanged(event.target.dataset.unit);
  }

  btns.forEach(function (btn) {
    btn.addEventListener("click", onTemperatureBtnClicked);
  });
}
/*---!-- Forecast Mode Change --!---*/

function forecastModeManager(onForecastModeChanged) {
  const btns = document.querySelectorAll("#uv-forecast__forecast-btn");

  function onForecastBtnClicked(event) {
    onForecastModeChanged(event.target.dataset.mode);
  }

  btns.forEach(function (btn) {
    btn.addEventListener("click", onForecastBtnClicked);
  });
}

/*---!-- Skin Type Change --!---*/

function skinTypeManager(onSkinTypeChanged) {
  const btns = document.querySelectorAll("#uv-forecast__skin-btn");

  function onSkinTypeBtnClicked(event) {
    onSkinTypeChanged(event.target.dataset.skin);
  }

  btns.forEach(function (btn) {
    btn.addEventListener("click", onSkinTypeBtnClicked);
  });
}

/*---!-- Render UI --!---*/

function renderer() {
  const $content = document.querySelector(".main-content");
  const $tempCelsiusBtn = document.querySelector("[data-unit='celsius']");
  const $tempFahrenheitBtn = document.querySelector("[data-unit='fahrenheit']");
  const $locationName = document.querySelector("#location-name");
  const $uvIndex = document.querySelector("#uv-index-value");
  const $uvLabel = document.querySelector("#uv-index-label");
  const $currentTemp = document.querySelector("#current-temp");
  const $currentCloudCover = document.querySelector("#current-clouds");
  const $sunriseTime = document.querySelector("#sunrise-time");
  const $sunsetTime = document.querySelector("#sunset-time");
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
    return `<p id="safe-time-label" class="skin-type-data">Safe exposure:
    <span id="safe-time" class="skin-type-data-value">${safeExposure(
      skinType,
      uvIndex
    )}</span>
  </p>
  <p id="vit-d-intake-label" class="skin-type-data">Sufficient VitD intake: 
    <span id="vit-d-time" class="skin-type-data-value">${vitDExposure(
      skinType,
      uvLabel
    )}min</span>
  </p>`;
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

  return function render(
    location,
    uvIndex,
    uvColorHex,
    uvLabel,
    tempUnit,
    currentTemp,
    currentCloudCover,
    sunriseDateTime,
    sunsetDateTime,
    forecastMode,
    dailyForecast,
    hourlyForecast,
    skinType
  ) {
    $content.style.display = "block";
    $locationName.innerHTML = location;
    $uvIndex.innerHTML = uvIndex;
    $uvLabel.innerHTML = uvLabel;
    $currentTemp.innerHTML = convertTemperature(tempUnit, currentTemp);
    $currentCloudCover.innerHTML = currentCloudCover + `%`;
    $sunriseTime.innerHTML = extractTimeFromDate(sunriseDateTime);
    $sunsetTime.innerHTML = extractTimeFromDate(sunsetDateTime);

    document.body.style.backgroundColor = uvColorHex;

    if (tempUnit === "celsius") {
      $tempFahrenheitBtn.classList.remove("btn-temp-active");
      $tempCelsiusBtn.classList.add("btn-temp-active");
    } else {
      $tempCelsiusBtn.classList.remove("btn-temp-active");
      $tempFahrenheitBtn.classList.add("btn-temp-active");
    }

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
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
  };
}

/*---!-- Data--!---*/

const iconMap = {
  "01d": "sun",
  "01n": "moon",
  "02d": "cloudy-sun",
  "02n": "cloudy-moon",
  "03d": "cloud",
  "03n": "cloud",
  "04d": "cloud",
  "04n": "cloud",
  "09d": "rain",
  "09n": "rain",
  "10d": "rain",
  "10n": "rain",
  "11d": "thunderstorm",
  "11n": "thunderstorm",
  "13d": "snow",
  "13n": "snow",
  "50d": "mist",
  "50n": "mist",
};

const vitDExposureTimes = {
  low: {
    "type-1": "15-20",
    "type-3": "30-40",
    "type-4": "40-60",
    "type-5": "60-80",
    "type-6": ">80",
  },
  moderate: {
    "type-1": "10-15",
    "type-3": "20-30",
    "type-4": "30-40",
    "type-5": "40-60",
    "type-6": "60-80",
  },
  high: {
    "type-1": "5-10",
    "type-3": "15-20",
    "type-4": "20-30",
    "type-5": "30-40",
    "type-6": "40-60",
  },
  veryhigh: {
    "type-1": "2-8",
    "type-3": "10-15",
    "type-4": "15-20",
    "type-5": "20-30",
    "type-6": "30-40",
  },
  extreme: {
    "type-1": "1-5",
    "type-3": "5-10",
    "type-4": "10-15",
    "type-5": "15-20",
    "type-6": "20-30",
  },
};

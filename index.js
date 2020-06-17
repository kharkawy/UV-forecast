/* TO DO:
- fix hands data update
- change class and id naming

*/

document.addEventListener("DOMContentLoaded", function () {
  //ALL DECLARATIONS

  const openuvApiToken = "85797c8abf405c359f7f51563fc05172";
  const openuvApiURL = "https://api.openuv.io/api/v1/";

  const openweatherApiToken = "c1d13ca3ce67ce7193a0ba5b70468f07";
  const openweatherApiUrl = "https://api.openweathermap.org/data/2.5/onecall";
  const excludeForecast = "minutely";

  const useMockApiResponse = true;

  const locationInput = document.getElementById("location-input");
  const autocompleteOptions = {
    types: ["(cities)"],
  };
  const autocomplete = new google.maps.places.Autocomplete(
    locationInput,
    autocompleteOptions
  );

  const geolocationBtn = document.getElementById("geolocation-btn");
  const geolocationOptions = {
    timeout: 10000,
  };

  const currentTemp = document.getElementById("current-temp");
  const currentClouds = document.getElementById("current-clouds");
  const sunriseTime = document.getElementById("sunrise-time");
  const sunsetTime = document.getElementById("sunset-time");

  const celsiusBtn = document.getElementById("celsius-btn");
  const fahrenheitBtn = document.getElementById("fahrenheit-btn");
  let tempInKelvins = "";
  let tempScale = "C";

  const appStatus = document.getElementById("status");

  const todayDate = new Date();

  //Get UV Data

  function fetchCurrentUVByLatLng(lat, lng) {
    if (useMockApiResponse) {
      return new Promise(function (resolve) {
        resolve(fakeResponse);
      });
    }
    return fetch(openuvApiURL + "uv" + "?lat=" + lat + "&lng=" + lng, {
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

  function handleErrors(response) {
    if (!response.ok) {
      throw Error(response.statusText);
    }
    return response;
  }
  //Get UV Forecast Data

  function fetchForecastUVByLatLng(lat, lng) {
    if (useMockApiResponse) {
      return new Promise(function (resolve) {
        resolve(fakeForecastResponse);
      });
    }
    return fetch(
      openuvApiURL +
        "forecast" +
        "?lat=" +
        lat +
        "&lng=" +
        lng +
        "&dt=" +
        todayDate,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-access-token": openuvApiToken,
        },
      }
    )
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

  //Get Weather Data

  function fetchWeatherDataByLatLng(lat, lng, excl) {
    return fetch(
      openweatherApiUrl +
        `?lat=` +
        lat +
        `&lon=` +
        lng +
        `&exclude=` +
        excl +
        `&appid=` +
        openweatherApiToken,
      {
        headers: {
          Accept: "application/json",
        },
      }
    )
      .then(handleErrors)
      .then(function (response) {
        return response.json();
      })
      .catch(function (err) {
        appStatus.innerHTML = err;
      });
  }

  //Autocomplete

  autocomplete.addListener("place_changed", function () {
    const place = autocomplete.getPlace();

    appStatus.innerHTML = "";

    if (!place.geometry) {
      appStatus.innerHTML =
        "No details available for input: '" + place.name + "'";
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const location = place.address_components;

    fetchCurrentUVByLatLng(lat, lng).then(function (openuv) {
      fetchForecastUVByLatLng(lat, lng).then(function (uvforecast) {
        fetchWeatherDataByLatLng(lat, lng, excludeForecast).then(function (
          openweather
        ) {
          updateUI(openuv.result, location, openweather, uvforecast);
        });
      });
    });
  });

  //Geolocation

  geolocationBtn.addEventListener("click", function () {
    appStatus.innerHTML = "Locating...";
    navigator.geolocation.getCurrentPosition(
      geolocationSuccess,
      geolocationError,
      geolocationOptions
    );
  });

  function geolocationSuccess(position) {
    const geocoder = new google.maps.Geocoder();

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    const LatLng = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    };

    appStatus.innerHTML = "";

    findLocationName(geocoder, LatLng).then(function (location) {
      fetchCurrentUVByLatLng(lat, lng).then(function (openuv) {
        fetchWeatherDataByLatLng(lat, lng, excludeForecast).then(function (
          openweather
        ) {
          updateUI(openuv.result, location, openweather);
        });
      });
    });
  }
  function geolocationError(err) {
    appStatus.innerHTML = "Unable to retrieve your location.";
  }

  function findLocationName(geocoder, latlng) {
    return new Promise(function (resolve, reject) {
      geocoder.geocode({ location: latlng }, function (result, status) {
        if (status === "OK") {
          if (result[0]) {
            const targetAddressComp = result[0].address_components;

            appStatus.innerHTML = "";

            resolve(targetAddressComp ? targetAddressComp : "");
          } else {
            appStatus.innerHTML = "Location name unavailable";
            reject();
          }
        } else {
          appStatus.innerHTML = "Geocoder failed due to: " + status;
          reject();
        }
      });
    });
  }

  //Changes in UI

  function updateUI(uvData, location, weatherData, uvforecast) {
    const city = location.find(function (addressComp) {
      return addressComp.types.includes("locality");
    }).long_name;

    const rawUV = uvData.uv;
    const cloudsCoverage = weatherData.current.clouds;
    tempInKelvins = weatherData.current.temp;

    const cloudsUV = calculateCloudsFactor(rawUV, cloudsCoverage);
    const cloudsUVLabel = findColorAndLevelName(cloudsUV);

    document.querySelector("#current-conditions-container").style.display =
      "flex";

    document.getElementById("location-city").innerHTML = city;
    document.getElementById("uv-index-value").innerHTML = cloudsUV;
    document.getElementById("uv-index-level-name").innerHTML = cloudsUVLabel;

    currentTemp.innerHTML = convertTemperature(tempInKelvins, tempScale);

    currentClouds.innerHTML = cloudsCoverage + `%`;

    sunriseTime.innerHTML = convertDate(uvData.sun_info.sun_times.sunrise);

    sunsetTime.innerHTML = convertDate(uvData.sun_info.sun_times.sunset);

    addListenerSkinBtns(cloudsUV, cloudsUVLabel);
    displayForecast(weatherData, uvforecast);
  }

  function createWeeklyWeatherForcast(weatherData) {
    const dailyWeather = weatherData.daily;
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const forecast = [];
    for (let i = 1; i < dailyWeather.length; i++) {
      const numberDayOfWeek = new Date(dailyWeather[i].dt * 1000).getDay();
      const nameDayOfWeek = daysOfWeek[numberDayOfWeek];
      const maxTemp = convertTemperature(dailyWeather[i].temp.max, tempScale);
      const minTemp = convertTemperature(dailyWeather[i].temp.min, tempScale);
      const description = dailyWeather[i].weather[0].description;
      const clouds = dailyWeather[i].clouds;
      const uv = dailyWeather[i].uvi;
      const convertedUV = calculateCloudsFactor(uv, clouds);

      forecast.push([
        nameDayOfWeek,
        maxTemp,
        minTemp,
        description,
        convertedUV,
      ]);
    }
    return forecast;
  }

  function createHourlyWeatherForcast(weatherData, uvforecast) {
    const hourlyWeather = weatherData.hourly;
    const hourlyUV = uvforecast.result;
    const forecast = [];
    const uvUpcomingHours = [];

    for (let j = 0; j < hourlyUV.length; j++) {
      const uvHour = convertDate(hourlyUV[j].uv_time).substring(0, 2);
      const currentHour = convertDate(todayDate).substring(0, 2);

      if (uvHour >= currentHour) {
        uvUpcomingHours.push(hourlyUV[j]); //push only UV value to array - after testing
      }
    }

    console.log(uvUpcomingHours);

    for (let i = 1; i < 8; i++) {
      let hour = new Date(hourlyWeather[i].dt * 1000);
      hour = convertDate(hour);
      const temp = convertTemperature(hourlyWeather[i].temp, tempScale);
      const description = hourlyWeather[i].weather[0].description;
      const clouds = hourlyWeather[i].clouds;
      let uv = 0;

      if (uvUpcomingHours[i]) {
        uv = calculateCloudsFactor(uvUpcomingHours[i].uv, clouds);
        console.log(
          uvUpcomingHours[i].uv,
          convertDate(uvUpcomingHours[i].uv_time),
          hour
        );
      }

      forecast.push([hour, temp, description, uv]);
    }

    return forecast;
  }

  function displayForecast(weatherData, uvforecast) {
    const weeklyForecast = createWeeklyWeatherForcast(weatherData);
    const hourlyForecast = createHourlyWeatherForcast(weatherData, uvforecast);

    const weekForecastIds = [
      "w-forecast-weekday",
      "w-forecast-max-temp",
      "w-forecast-min-temp",
      "w-forecast-description",
      "w-forecast-uv-value",
    ];

    const hourForecastIds = [
      "h-forecast-hour",
      "h-forecast-temp",
      "h-forecast-description",
      "h-forecast-uv-value",
    ];

    const uvForecastContainer = document.querySelector("#uv-forecast");

    uvForecastContainer.innerHTML = "";

    const weeklyForecastHTML = createForecastHTML(
      weeklyForecast,
      weekForecastIds
    );
    const hourlyForecastHTML = createForecastHTML(
      hourlyForecast,
      hourForecastIds
    );

    uvForecastContainer.appendChild(weeklyForecastHTML);
    uvForecastContainer.appendChild(hourlyForecastHTML);
  }

  function createForecastHTML(forecast, ids) {
    const forecastContainer = document.createElement("div");

    for (let i = 0; i < forecast.length; i++) {
      const forecastUnit = forecast[i];
      const forecastUnitContainer = document.createElement("div");

      for (let j = 0; j < forecastUnit.length; j++) {
        const forecastUnitValue = document.createElement("span");
        forecastUnitValue.innerHTML = forecastUnit[j];
        forecastUnitValue.id = ids[j];

        if (
          typeof forecastUnit[j] === "string" &&
          forecastUnit[j].includes("deg")
        ) {
          forecastUnitValue.classList.add("temp");
        }

        forecastUnitContainer.appendChild(forecastUnitValue);
      }

      forecastContainer.appendChild(forecastUnitContainer);
    }
    return forecastContainer;
  }

  function convertDate(date) {
    return (convertedDate = new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }));
  }

  function findColorAndLevelName(uv) {
    const body = document.body.style;

    if (uv >= 0 && uv < 3) {
      body.backgroundColor = "#709D4F";
      return "low";
    } else if (uv >= 3 && uv < 6) {
      body.backgroundColor = "#F9A825";
      return "moderate";
    } else if (uv >= 6 && uv < 8) {
      body.backgroundColor = "#EF6C00";
      return "high";
    } else if (uv >= 8 && uv < 11) {
      body.backgroundColor = "#B71C1C";
      return "very high";
    } else if (uv >= 11) {
      body.backgroundColor = "#854BA9";
      return "extreme";
    } else {
      return "not found";
    }
  }

  celsiusBtn.addEventListener("click", function () {
    if (!celsiusBtn.classList.contains("btn-temp-active")) {
      celsiusBtn.classList.toggle("btn-temp-active");
      fahrenheitBtn.classList.toggle("btn-temp-active");
      tempScale = "C";
      updateTemperatureInUI();
    } else {
      return;
    }
  });

  fahrenheitBtn.addEventListener("click", function () {
    if (!fahrenheitBtn.classList.contains("btn-temp-active")) {
      celsiusBtn.classList.toggle("btn-temp-active");
      fahrenheitBtn.classList.toggle("btn-temp-active");
      tempScale = "F";
      updateTemperatureInUI();
    } else {
      return;
    }
  });

  function convertTemperature(temp, tempScale) {
    if (!temp) {
      return;
    }
    if (tempScale == "C") {
      return Math.round(temp - 273.15) + `&degC`;
    } else if (tempScale == "F") {
      return Math.round(temp * 1.8 - 459.67) + `&degF`;
    }
  }

  function updateTemperatureInUI() {
    const tempUI = document.querySelectorAll(".temp");

    for (let i = 0; i < tempUI.length; i++) {
      tempUI[i].innerHTML = convertTemperature(tempInKelvins, tempScale);
    }
  }

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

  //Skin type data

  function addListenerSkinBtns(uv, uvLabel) {
    document.getElementById("skin-type-data-container").style.display = "flex";
    const btnsSkinType = document.querySelectorAll(".btn-skin-type");

    for (let i = 0; i < btnsSkinType.length; i++) {
      btnsSkinType[i].addEventListener("click", function () {
        event.target.classList.add("active");
        const skinType = event.target.id;
        const exposure = calculateSkinTypeData(skinType, uv, uvLabel);

        document.getElementById("safe-time").innerHTML = exposure[0];
        document.getElementById("vit-d-time").innerHTML = exposure[1] + "min";

        for (let i = 0; i < btnsSkinType.length; i++) {
          if (btnsSkinType[i] === event.target) continue;
          btnsSkinType[i].classList.remove("active");
        }
      });
    }
  }

  function calculateSkinTypeData(skinType, uv, uvLabel) {
    let factor;
    switch (skinType) {
      case "type-1":
        factor = 2.5;
        return [
          calculateExposure(factor, uv),
          checkVitDExposureTime(skinType, uvLabel),
        ];
      case "type-3":
        factor = 4;
        return [
          calculateExposure(factor, uv),
          checkVitDExposureTime(skinType, uvLabel),
        ];
      case "type-4":
        factor = 5;
        return [
          calculateExposure(factor, uv),
          checkVitDExposureTime(skinType, uvLabel),
        ];
      case "type-5":
        factor = 8;
        return [
          calculateExposure(factor, uv),
          checkVitDExposureTime(skinType, uvLabel),
        ];
      case "type-6":
        factor = 15;
        return [
          calculateExposure(factor, uv),
          checkVitDExposureTime(skinType, uvLabel),
        ];
    }
  }

  function calculateExposure(skinFactor, uv) {
    const exposureInMinutes = Math.round((200 * skinFactor) / (3 * uv));
    const exposureInHours = Math.floor(exposureInMinutes / 60);
    const rest = exposureInMinutes % 60;
    let safeExposureTime = "";

    if (exposureInHours == 0) {
      safeExposureTime = rest + "min";
    } else {
      safeExposureTime = exposureInHours + "h " + rest + "min";
    }
    return safeExposureTime;
  }

  function checkVitDExposureTime(skin, uvLabel) {
    uvLabel = uvLabel.replace(/\s+/g, "");
    return vitDExposureTimes[uvLabel][skin];
  }

  //Long data

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

  const fakeResponse = JSON.parse(
    '{"result":{"uv":5.8835,"uv_time":"2020-06-14T09:18:12.322Z","uv_max":7.7543,"uv_max_time":"2020-06-14T11:35:10.026Z","ozone":316.7,"ozone_time":"2020-06-14T09:06:59.038Z","safe_exposure_time":{"st1":28,"st2":34,"st3":45,"st4":57,"st5":91,"st6":170},"sun_info":{"sun_times":{"solarNoon":"2020-06-14T11:35:10.026Z","nadir":"2020-06-13T23:35:10.026Z","sunrise":"2020-06-14T03:12:16.882Z","sunset":"2020-06-14T19:58:03.170Z","sunriseEnd":"2020-06-14T03:16:55.729Z","sunsetStart":"2020-06-14T19:53:24.323Z","dawn":"2020-06-14T02:22:47.012Z","dusk":"2020-06-14T20:47:33.041Z","nauticalDawn":"2020-06-14T01:02:19.397Z","nauticalDusk":"2020-06-14T22:08:00.655Z","nightEnd":null,"night":null,"goldenHourEnd":"2020-06-14T04:07:54.670Z","goldenHour":"2020-06-14T19:02:25.382Z"},"sun_position":{"azimuth":-0.9575741922053829,"altitude":0.8913679676798139}}}}'
  );
});

const fakeForecastResponse = JSON.parse(
  '{"result":[{"uv":0,"uv_time":"2020-06-17T03:11:50.020Z","sun_position":{"azimuth":-2.300558991888468,"altitude":-0.012853676119981058}},{"uv":0.1066,"uv_time":"2020-06-17T04:11:50.020Z","sun_position":{"azimuth":-2.0976884543522463,"altitude":0.11632311843687819}},{"uv":0.4069,"uv_time":"2020-06-17T05:11:50.020Z","sun_position":{"azimuth":-1.9026768013681659,"altitude":0.26144683023119064}},{"uv":1.0948,"uv_time":"2020-06-17T06:11:50.020Z","sun_position":{"azimuth":-1.7080473839286456,"altitude":0.4166480142261406}},{"uv":2.3931,"uv_time":"2020-06-17T07:11:50.020Z","sun_position":{"azimuth":-1.5033357654461672,"altitude":0.5760998889718945}},{"uv":3.7786,"uv_time":"2020-06-17T08:11:50.020Z","sun_position":{"azimuth":-1.2733422373844654,"altitude":0.7330208058308647}},{"uv":5.6,"uv_time":"2020-06-17T09:11:50.020Z","sun_position":{"azimuth":-0.9952499478473227,"altitude":0.877755517528925}},{"uv":6.8595,"uv_time":"2020-06-17T10:11:50.020Z","sun_position":{"azimuth":-0.6387703195513221,"altitude":0.9945263962089368}},{"uv":7.6637,"uv_time":"2020-06-17T11:11:50.020Z","sun_position":{"azimuth":-0.1883661473555341,"altitude":1.059247757901336}},{"uv":7.6637,"uv_time":"2020-06-17T12:11:50.020Z","sun_position":{"azimuth":0.3016273657580936,"altitude":1.050127263400716}},{"uv":6.6464,"uv_time":"2020-06-17T13:11:50.020Z","sun_position":{"azimuth":0.7313995703606322,"altitude":0.970744514571426}},{"uv":5.1834,"uv_time":"2020-06-17T14:11:50.020Z","sun_position":{"azimuth":1.0667449392142758,"altitude":0.8455289552362888}},{"uv":3.4104,"uv_time":"2020-06-17T15:11:50.020Z","sun_position":{"azimuth":1.3309859044903414,"altitude":0.6968169977145249}},{"uv":1.9474,"uv_time":"2020-06-17T16:11:50.020Z","sun_position":{"azimuth":1.5533195849522707,"altitude":0.5386058003595273}},{"uv":0.901,"uv_time":"2020-06-17T17:11:50.020Z","sun_position":{"azimuth":1.7545183537842346,"altitude":0.37963349183952855}},{"uv":0.3003,"uv_time":"2020-06-17T18:11:50.020Z","sun_position":{"azimuth":1.9484334809632404,"altitude":0.22632811037608222}},{"uv":0.0678,"uv_time":"2020-06-17T19:11:50.020Z","sun_position":{"azimuth":2.144719776418195,"altitude":0.08446193084077307}}]}'
);

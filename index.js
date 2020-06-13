document.addEventListener("DOMContentLoaded", function () {
  var status = document.getElementById("status");

  //Get UV data

  const openuvApiToken = "85797c8abf405c359f7f51563fc05172";
  const openuvApiURL = "https://api.openuv.io/api/v1/uv";

  function fetchCurrentUVByLatLng(lat, lng) {
    return fetch(openuvApiURL + "?lat=" + lat + "&lng=" + lng, {
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
        status.innerHTML = err;
      });
  }

  function handleErrors(response) {
    if (!response.ok) {
      throw Error(response.statusText);
    }
    return response;
  }

  //Get Weather Data

  const openweatherApiToken = "c1d13ca3ce67ce7193a0ba5b70468f07";
  const openweatherApiUrl = "https://api.openweathermap.org/data/2.5/onecall";
  const excl = "minutely,hourly";

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
        status.innerHTML = err;
      });
  }

  //Autocomplete

  var locationInput = document.getElementById("location-input");
  var autocompleteOptions = {
    types: ["(cities)"],
  };

  const autocomplete = new google.maps.places.Autocomplete(
    locationInput,
    autocompleteOptions
  );

  autocomplete.addListener("place_changed", function () {
    var place = autocomplete.getPlace();

    if (!place.geometry) {
      status.innerHTML = "No details available for input: '" + place.name + "'";
      return;
    }

    var lat = place.geometry.location.lat();
    var lng = place.geometry.location.lng();
    var location = place.address_components;

    fetchCurrentUVByLatLng(lat, lng).then(function (openuv) {
      fetchWeatherDataByLatLng(lat, lng, excl).then(function (openweather) {
        updateUI(openuv.result, location, openweather);
      });
    });
  });

  //Geolocation

  var geolocationBtn = document.getElementById("geolocation-btn");

  geolocationBtn.addEventListener("click", function () {
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

    findLocationName(geocoder, LatLng).then(function (location) {
      fetchCurrentUVByLatLng(lat, lng).then(function (openuv) {
        fetchWeatherDataByLatLng(lat, lng, excl).then(function (openweather) {
          updateUI(openuv.result, location, openweather);
        });
      });
    });
  }
  function geolocationError(err) {
    status.innerHTML = "Unable to retrieve your location.";
  }

  var geolocationOptions = {
    timeout: 10000,
  };

  function findLocationName(geocoder, latlng) {
    return new Promise(function (resolve, reject) {
      geocoder.geocode({ location: latlng }, function (result, status) {
        if (status === "OK") {
          if (result[0]) {
            const targetAddressComp = result[0].address_components;

            resolve(targetAddressComp ? targetAddressComp : "");
          } else {
            status.innerHTML("Location name unavailable");
            reject();
          }
        } else {
          status.innerHTML("Geocoder failed due to: " + status);
          reject();
        }
      });
    });
  }

  //Changes in UI

  var tempInKelvins = "";

  function updateUI(uvData, location, weatherData) {
    const city = location.find(function (addressComp) {
      return addressComp.types.includes("locality");
    }).long_name;

    var rawUV = uvData.uv;
    var cloudsCoverage = weatherData.current.clouds;
    tempInKelvins = weatherData.current.temp;

    const cloudsUV = calculateCloudsFactor(rawUV, cloudsCoverage);

    document.getElementById("location-city").innerHTML = city;

    document.getElementById("uv-index-value").innerHTML = cloudsUV;

    document.getElementById(
      "uv-index-level-name"
    ).innerHTML = findColorAndLevelName(cloudsUV);

    document
      .getElementById("current-temp")
      .insertAdjacentHTML("beforebegin", thermometerIcon);
    convertTemperature(tempInKelvins, scale);

    document
      .getElementById("current-clouds")
      .insertAdjacentHTML("beforebegin", cloudIcon);
    document.getElementById("current-clouds").innerHTML = cloudsCoverage + `%`;

    document
      .getElementById("sunrise-time")
      .insertAdjacentHTML("beforebegin", sunriseIcon);
    document.getElementById("sunrise-time").innerHTML = convertDate(
      uvData.sun_info.sun_times.sunrise
    );

    document
      .getElementById("sunset-time")
      .insertAdjacentHTML("beforebegin", sunsetIcon);
    document.getElementById("sunset-time").innerHTML = convertDate(
      uvData.sun_info.sun_times.sunset
    );
  }

  function convertDate(date) {
    return (convertedDate = new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }));
  }

  function findColorAndLevelName(uv) {
    var body = document.body.style;

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

  const celsiusBtn = document.getElementById("celsius-btn");
  const fahrenheitBtn = document.getElementById("fahrenheit-btn");
  var scale = "c";

  celsiusBtn.addEventListener("click", function () {
    if (!celsiusBtn.classList.contains("btn-active")) {
      celsiusBtn.classList.toggle("btn-active");
      fahrenheitBtn.classList.toggle("btn-active");
      scale = "c";
      console.log(scale);
      convertTemperature(tempInKelvins, scale);
    } else {
      return;
    }
  });

  fahrenheitBtn.addEventListener("click", function () {
    if (!fahrenheitBtn.classList.contains("btn-active")) {
      celsiusBtn.classList.toggle("btn-active");
      fahrenheitBtn.classList.toggle("btn-active");
      scale = "f";
      console.log(scale);
      convertTemperature(tempInKelvins, scale);
    } else {
      return;
    }
  });

  function convertTemperature(temp, scale) {
    if (!temp) {
      return;
    }

    if (scale == "c") {
      document.getElementById("current-temp").innerHTML =
        Math.round(temp - 273.15) + `&degC`;
    } else if (scale == "f") {
      document.getElementById("current-temp").innerHTML =
        Math.round(temp * 1.8 - 459.67) + `&degF`;
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

  /* TO DO:
- UV index forcast for the next few hours
- forecast for the next week: temp, clouds, UV
- safe exposure time
- vitamine D intake 
- celsius and fahrenheit switch
*/

  var thermometerIcon = `<svg class="weather-item-icon" width="32px" height="32px" viewbox="0 0 32 32" version="1.1">
<g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage">
  <g id="icon-69-thermometer-half" sketch:type="MSArtboardGroup" fill="#000000">
    <path d="M16.9856957,23.1656908 C18.1583541,23.5734612 19,24.6884421 19,26 C19,27.6568543 17.6568543,29 16,29 C14.3431457,29 13,27.6568543 13,26 C13,24.6885853 13.841462,23.5737048 15.01392,23.1658244 C15.0047629,23.1111049 15,23.0548783 15,22.9975267 L15,13.0024733 C15,12.455761 15.4477153,12 16,12 C16.5561352,12 17,12.4488226 17,13.0024733 L17,22.9975267 C17,23.0547158 16.995101,23.1109097 16.9856957,23.1656908 L16.9856957,23.1656908 Z M18,22.5351287 C19.1956028,23.2267475 20,24.5194352 20,26 C20,28.2091391 18.2091391,30 16,30 C13.7908609,30 12,28.2091391 12,26 C12,24.5194352 12.8043972,23.2267475 14,22.5351287 L14,4.00359486 C14,2.88976324 14.8954305,2 16,2 C17.1122704,2 18,2.89703997 18,4.00359486 L18,22.5351287 L18,22.5351287 L18,22.5351287 Z M19.9686149,21.4998925 C21.2143165,22.5993118 22,24.2079027 22,26 C22,29.3137087 19.3137087,32 16,32 C12.6862913,32 10,29.3137087 10,26 C10,24.2079329 10.785657,22.599366 12.0313221,21.4999481 C12.0106518,21.3352618 12,21.1674643 12,20.9971835 L12,4.00281647 C12,1.79793835 13.790861,0 16,0 C18.2046438,0 20,1.79212198 20,4.00281647 L20,20.9971835 C20,21.1673915 19.9893278,21.3351745 19.9686149,21.4998925 L19.9686149,21.4998925 L19.9686149,21.4998925 Z" id="thermometer-half" sketch:type="MSShapeGroup"></path>
  </g>
</g>
</svg>`;

  var cloudIcon = `<svg class="weather-item-icon" viewbox="0 0 24 16" version="1.1">
<g id="Icons" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
  <g id="Outlined" transform="translate(-304.000000, -2284.000000)">
    <g id="File" transform="translate(100.000000, 2226.000000)">
      <g id="Outlined-/-File-/-cloud_queue" transform="translate(204.000000, 54.000000)">
        <g>
          <polygon id="Path" points="0 0 24 0 24 24 0 24"></polygon>
          <path d="M19.35,10.04 C18.67,6.59 15.64,4 12,4 C9.11,4 6.6,5.64 5.35,8.04 C2.34,8.36 0,10.91 0,14 C0,17.31 2.69,20 6,20 L19,20 C21.76,20 24,17.76 24,15 C24,12.36 21.95,10.22 19.35,10.04 Z M19,18 L6,18 C3.79,18 2,16.21 2,14 C2,11.79 3.79,10 6,10 L6.71,10 C7.37,7.69 9.48,6 12,6 C15.04,6 17.5,8.46 17.5,11.5 L17.5,12 L19,12 C20.66,12 22,13.34 22,15 C22,16.66 20.66,18 19,18 Z" id="🔹-Icon-Color" fill="#1D1D1D"></path>
        </g>
      </g>
    </g>
  </g>
</g>
</svg>`;

  var sunriseIcon = `<svg class="weather-item-icon" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M17 18a5 5 0 0 0-10 0"></path>
<line x1="12" y1="2" x2="12" y2="9"></line>
<line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line>
<line x1="1" y1="18" x2="3" y2="18"></line>
<line x1="21" y1="18" x2="23" y2="18"></line>
<line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line>
<line x1="23" y1="22" x2="1" y2="22"></line>
<polyline points="8 6 12 2 16 6"></polyline>
</svg>`;

  var sunsetIcon = `<svg class="weather-item-icon" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M17 18a5 5 0 0 0-10 0"></path>
<line x1="12" y1="9" x2="12" y2="2"></line>
<line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line>
<line x1="1" y1="18" x2="3" y2="18"></line>
<line x1="21" y1="18" x2="23" y2="18"></line>
<line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line>
<line x1="23" y1="22" x2="1" y2="22"></line>
<polyline points="16 5 12 9 8 5"></polyline>
</svg>`;
});

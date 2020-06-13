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
  }).then(function (response) {
    return response.json();
  });
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
  ).then(function (response) {
    return response.json();
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
  var lat = autocomplete.getPlace().geometry.location.lat();
  var lng = autocomplete.getPlace().geometry.location.lng();
  var location = autocomplete.getPlace().address_components;

  fetchCurrentUVByLatLng(lat, lng).then(function (openuv) {
    fetchWeatherDataByLatLng(lat, lng, excl).then(function (openweather) {
      updateUI(openuv.result, location, openweather);
    });
  });
});

//Geolocation

var geolocationBtn = document.getElementById("geolocation-button");
var geolocationStatus = document.getElementById("geolocation-status");

geolocationBtn.addEventListener("click", function () {
  geolocationStatus.innerHTML = "Locating…"; //turn updating status into a function
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

  geolocationStatus.innerHTML = ""; //turn updating status into a function

  findLocationName(geocoder, LatLng).then(function (location) {
    fetchCurrentUVByLatLng(lat, lng).then(function (openuv) {
      fetchWeatherDataByLatLng(lat, lng, excl).then(function (openweather) {
        updateUI(openuv.result, location, openweather);
      });
    });
  });
}

function geolocationError(err) {
  geolocationStatus.innerHTML = "Unable to retrieve your location."; //turn updating status into a function
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
          console.log("No results found");
          reject();
        }
      } else {
        console.log("Geocoder failed due to: " + status);
        reject();
      }
    });
  });
}

//Changes in UI

function updateUI(uvData, location, weatherData) {
  const city = location.find(function (addressComp) {
    return addressComp.types.includes("locality");
  }).long_name;

  var rawUV = uvData.uv;
  var cloudsCoverage = weatherData.current.clouds;
  var temp = weatherData.current.temp;

  const cloudsUV = calculateCloudsFactor(rawUV, cloudsCoverage);

  document.getElementById("uv-index-value").innerHTML = cloudsUV;
  document.getElementById(
    "uv-index-level-name"
  ).innerHTML = findColorAndLevelName(cloudsUV);

  document.getElementById("location-city").innerHTML = city;
  document.getElementById("sunrise-time").innerHTML =
    `Sunrise: ` + convertDate(uvData.sun_info.sun_times.sunrise);
  document.getElementById("sunset-time").innerHTML =
    `Sunset: ` + convertDate(uvData.sun_info.sun_times.sunset);
  document.getElementById("current-temp").innerHTML = convertTemperature(
    temp,
    location
  );
  document.getElementById("current-clouds").innerHTML =
    `Clouds coverage: ` + cloudsCoverage;
}

function convertDate(date) {
  return (convertedDate = new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }));
}

function findColorAndLevelName(uv) {
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

function convertTemperature(temp, location) {
  const countryCode = location.find(function (addressComp) {
    return addressComp.types.includes("country");
  }).short_name;

  if (countryCode == "US") {
    return Math.round(temp * 1.8 - 459.67) + `F&deg`;
  } else {
    return Math.round(temp - 273.15) + `C&deg`;
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

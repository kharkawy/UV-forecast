const apiToken = "85797c8abf405c359f7f51563fc05172";
const apiURL = "https://api.openuv.io/api/v1/uv";

var locationInput = document.getElementById("location-input");
const autocomplete = new google.maps.places.Autocomplete(locationInput);

autocomplete.addListener("place_changed", function () {
  var lat = autocomplete.getPlace().geometry.location.lat();
  var lng = autocomplete.getPlace().geometry.location.lng();

  fetchUVDataByLatLng(lat, lng).then(function (uvForecast) {
    updateUVLabel(uvForecast.result.uv);
  });
});

function fetchUVDataByLatLng(lat, lng) {
  return fetch(apiURL + "?lat=" + lat + "&lng=" + lng, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-access-token": apiToken,
    },
  }).then(function (response) {
    return response.json();
  });
}

function updateUVLabel(uv) {
  document.getElementById("uv-index-value").innerHTML = Math.round(uv);
}

//Geolocation

var geolocationBtn = document.getElementById("geolocation-button");
var geolocationStatus = document.getElementById("geolocation-status");

geolocationBtn.addEventListener("click", function () {
  geolocationStatus.innerHTML = "Locating…";
  navigator.geolocation.getCurrentPosition(
    geolocationSuccess,
    geolocationError,
    geolocationOptions
  );
});

function geolocationSuccess(position) {
  var lat = position.coords.latitude;
  var lng = position.coords.longitude;

  geolocationStatus.innerHTML = "";

  fetchUVDataByLatLng(lat, lng).then(function (uvForecast) {
    updateUVLabel(uvForecast.result.uv);
  });
}

function geolocationError(err) {
  geolocationStatus.innerHTML = "Unable to retrieve your location.";
  console.log(err.code, err.message);
}

var geolocationOptions = {
  timeout: 10000,
};

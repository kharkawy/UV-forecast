const apiToken = "85797c8abf405c359f7f51563fc05172";
const apiURL = "https://api.openuv.io/api/v1/uv";

var input = document.getElementsByTagName("input")[0];
const autocomplete = new google.maps.places.Autocomplete(input);

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
  }).then(function (res) {
    return res.json();
  });
}

function updateUVLabel(uv) {
  document.getElementsByTagName("p")[0].innerHTML = uv;
}

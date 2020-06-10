const apiToken = "85797c8abf405c359f7f51563fc05172";
const apiURL = "https://api.openuv.io/api/v1/uv";

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
  var locationName = autocomplete.getPlace().address_components[0].long_name;

  fetchCurrentUVByLatLng(lat, lng).then(function (openuv) {
    updateUI(openuv.result, locationName);
  });
});

function fetchCurrentUVByLatLng(lat, lng) {
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

function updateUI(uvdata, location) {
  console.log(uvdata);

  document.getElementById("uv-index-value").innerHTML = Math.round(uvdata.uv);
  document.getElementById(
    "uv-index-level-name"
  ).innerHTML = findColorAndLevelName(uvdata.uv);

  document.getElementById("location-city").innerHTML = location;
  document.getElementById("sunrise-time").innerHTML = convertDate(
    uvdata.sun_info.sun_times.sunrise
  );
  document.getElementById("sunset-time").innerHTML = convertDate(
    uvdata.sun_info.sun_times.sunset
  );
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

  findLocationName(geocoder, LatLng).then(function (locationName) {
    fetchCurrentUVByLatLng(lat, lng).then(function (openuv) {
      updateUI(openuv.result, locationName);
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
          const targetAddressComp = result[0].address_components.find(function (
            addressComp
          ) {
            return addressComp.types.includes("locality");
          });

          resolve(targetAddressComp ? targetAddressComp.long_name : "");
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

/* TO DO:
- import temeperature and cloud coverage form some weather API
- calculate UV based on cloud coverage
- UV index forcast for the next few hours
- forecast for the next week: temp, clouds, UV
- safe exposure time
- vitamine D intake 
*/

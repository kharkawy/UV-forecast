import { errorManager } from "./error.js";

export function locationManager(onLocationChanged) {
  //Autocomplete

  const locationInput = document.getElementById("uv-forecast__location-input");

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
      errorManager().renderErrorMessage(
        "No details available for input: '" + place.name + "'"
      );
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

  const geolocationBtn = document.getElementById(
    "uv-forecast__geolocation-btn"
  );

  const geolocationOptions = {
    timeout: 10000,
  };

  function onGeolocationPlaceChanged() {
    errorManager().renderErrorMessage("Locating...");
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

    onLocationChanged({ lat, lng, locationName });
  }

  function geolocationError(err) {
    console.log(err);
    errorManager().renderErrorMessage("Unable to retrieve your location.");
  }

  function findLocationName(geocoder, latlng) {
    return new Promise(function (resolve, reject) {
      geocoder.geocode({ location: latlng }, function (result, status) {
        if (status === "OK" && result[0]) {
          const locationName = extractLocationName(
            result[0].address_components
          );
          locationName ? resolve(locationName) : reject();
        } else {
          errorManager().renderErrorMessage(
            "Geocoder failed due to: " + status
          );
          reject();
        }
      });
    });
  }

  geolocationBtn.addEventListener("click", onGeolocationPlaceChanged);
}

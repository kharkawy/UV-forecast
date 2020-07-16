import {
  openuvApiToken,
  openuvApiURL,
  openweatherApiToken,
  openweatherApiUrl,
  excl,
  useMockApiResponse,
} from "./consts.js";

import { fakeResponseCurrentUV, fakeResponseForcastedUV } from "./mocks.js";

import { errorManager } from "./error.js";

export function fetchCurrentUV(lat, lng) {
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
      errorManager().renderErrorMessage(err);
    });
}
export function fetchForecastedUV(lat, lng, date) {
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
      errorManager().renderErrorMessage(err);
    });
}

export function fetchWeather(lat, lng) {
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
      errorManager().renderErrorMessage(err);
    });
}

function handleErrors(response) {
  if (!response.ok) {
    throw Error(response.statusText);
  }
  return response;
}

import { vitDExposureTimes } from "./consts.js";

export function calculateCloudsFactor(uv, clouds) {
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

export function mapUVIndexToLabel(uv) {
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

export function mapUVIndexToColor(uv) {
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

export function extractTimeFromDate(date) {
  return new Date(date).toLocaleTimeString(["nl-NL"], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function convertTemperature(tempUnit, tempInKelvins) {
  if (tempUnit === "celsius") {
    return Math.round(tempInKelvins - 273.15) + `&degC`;
  } else if (tempUnit === "fahrenheit") {
    return Math.round(tempInKelvins * 1.8 - 459.67) + `&degF`;
  }
}

export function transformDailyForcast(dailyForecast) {
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

export function transformHourlyForcast(hourlyForecast, uvForecast) {
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
        }
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

export function safeExposure(skinType, uv) {
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

  if (uv !== 0) {
    if (exposureInHours === 0) {
      return (safeExposureTime = rest + "min");
    } else {
      return (safeExposureTime = exposureInHours + "h " + rest + "min");
    }
  } else {
    return "Indefinite time";
  }
}

export function vitDExposure(skinType, uvLabel) {
  uvLabel.replace(/\s+/g, "");
  return vitDExposureTimes[uvLabel][skinType];
}

export function focusWhenTabPressed() {
  if (!document || !window) {
    return;
  }

  const onKeyPressedStyle = `
  *:focus{
    outline: 1px solid black !important;
  }`;
  const onMousePressedStyle = `
  *:focus {
    outline: none;
  }`;

  const style = document.createElement("style");

  document.addEventListener("keydown", function (event) {
    if (event.keyCode === 9) {
      style.innerHTML = "";
      if (style.styleSheet) {
        style.styleSheet.cssText = onKeyPressedStyle;
      } else {
        style.appendChild(document.createTextNode(onKeyPressedStyle));
      }
      document.getElementsByTagName("head")[0].appendChild(style);
    }
  });

  document.addEventListener("mousedown", function () {
    style.innerHTML = "";
    if (style.styleSheet) {
      style.styleSheet.cssText = onMousePressedStyle;
    } else {
      style.appendChild(document.createTextNode(onMousePressedStyle));
    }
    document.getElementsByTagName("head")[0].appendChild(style);
  });
}

export function addFavicon() {
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg";
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    link.href = "favicon-dark.svg";
    document.getElementsByTagName("head")[0].appendChild(link);
  } else {
    link.href = "favicon.svg";
    document.getElementsByTagName("head")[0].appendChild(link);
  }
}

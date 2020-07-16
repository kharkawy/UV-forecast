export function temperatureManager(onTemperatureUnitChanged) {
  const btns = document.querySelectorAll("#uv-forecast__temperature-btn");

  function onTemperatureBtnClicked(event) {
    onTemperatureUnitChanged(event.target.dataset.unit);
  }

  btns.forEach(function (btn) {
    btn.addEventListener("click", onTemperatureBtnClicked);
  });
}

export function forecastModeManager(onForecastModeChanged) {
  const btns = document.querySelectorAll("#uv-forecast__forecast-btn");

  function onForecastBtnClicked(event) {
    onForecastModeChanged(event.target.dataset.mode);
  }

  btns.forEach(function (btn) {
    btn.addEventListener("click", onForecastBtnClicked);
  });
}

export function skinTypeManager(onSkinTypeChanged) {
  const btns = document.querySelectorAll("#uv-forecast__skin-btn");

  function onSkinTypeBtnClicked(event) {
    onSkinTypeChanged(event.target.dataset.skin);
  }

  btns.forEach(function (btn) {
    btn.addEventListener("click", onSkinTypeBtnClicked);
  });
}

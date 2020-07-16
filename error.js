export function errorManager() {
  const $appStatus = document.querySelector("#status");
  function renderErrorMessage(msg) {
    $appStatus.innerHTML = msg;
  }
  function clearErrorMessage() {
    $appStatus.innerHTML = "";
  }
  return { renderErrorMessage, clearErrorMessage };
}

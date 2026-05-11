(function () {
  "use strict";

  var api = window.Debbreviation;
  if (!api) {
    throw new Error("Debbreviation API not loaded.");
  }

  var convertInput = document.getElementById("convertInput");
  var convertButton = document.getElementById("convertButton");
  var convertDeb = document.getElementById("convertDeb");
  var convertSci = document.getElementById("convertSci");
  var convertRound = document.getElementById("convertRound");

  var calcInput = document.getElementById("calcInput");
  var calcButton = document.getElementById("calcButton");
  var calcDeb = document.getElementById("calcDeb");
  var calcSci = document.getElementById("calcSci");

  var status = document.getElementById("status");

  function clearStatus() {
    status.textContent = "";
  }

  function showError(message) {
    status.textContent = message;
  }

  function runConverter() {
    clearStatus();

    try {
      var input = convertInput.value.trim();
      if (!input) {
        throw new Error("Converter input is empty.");
      }

      var parsed = api.parseNumberString(input);
      var deb = api.toDebbreviation(parsed, { precision: 8, reduceLetters: true });
      var roundTrip = api.parseNumberString(deb);

      convertDeb.textContent = deb;
      convertSci.textContent = parsed.toString();
      convertRound.textContent = roundTrip.toString();
    } catch (error) {
      showError(error.message);
    }
  }

  function runCalculator() {
    clearStatus();

    try {
      var input = calcInput.value.trim();
      if (!input) {
        throw new Error("Calculator expression is empty.");
      }

      var result = api.evaluateExpression(input);
      calcDeb.textContent = api.toDebbreviation(result, { precision: 8, reduceLetters: true });
      calcSci.textContent = result.toString();
    } catch (error) {
      showError(error.message);
    }
  }

  convertButton.addEventListener("click", runConverter);
  calcButton.addEventListener("click", runCalculator);

  convertInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") runConverter();
  });
  calcInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") runCalculator();
  });

  convertInput.value = "1e1e999";
  calcInput.value = "log(1df) + sin(pi / 2)";
})();


(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("break_eternity.js"));
    return;
  }

  if (typeof root.Decimal === "undefined") {
    throw new Error("Decimal (break_eternity.js) is required before debbreviation.js");
  }

  root.Debbreviation = factory(root.Decimal);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Decimal) {
  "use strict";

  var LETTER_BASE = 26n;
  var LETTER_BASE_MINUS_ONE = 25n;
  var MAX_EXACT_EXP = Decimal.fromNumber(Number.MAX_SAFE_INTEGER);

  function pow10Decimal(exponent) {
    var expText = exponent.toString();
    if (
      expText !== "NaN" &&
      expText !== "Infinity" &&
      expText !== "-Infinity" &&
      expText.indexOf(".") === -1
    ) {
      return Decimal.fromString("1e" + expText);
    }
    return Decimal.pow(10, exponent);
  }

  function trimTrailingZeros(value) {
    if (!value.includes(".")) {
      return value;
    }

    return value.replace(/\.?0+$/, "");
  }

  function parseUnsignedDecimal(text, start) {
    var i = start;
    var hasDigit = false;

    while (i < text.length && /[0-9]/.test(text[i])) {
      hasDigit = true;
      i += 1;
    }

    if (text[i] === ".") {
      i += 1;
      while (i < text.length && /[0-9]/.test(text[i])) {
        hasDigit = true;
        i += 1;
      }
    }

    if (!hasDigit) {
      return null;
    }

    return i;
  }

  function readBalancedBraces(text, start) {
    var depth = 1;
    var i = start;

    while (i < text.length) {
      var c = text[i];
      if (c === "{") {
        depth += 1;
      } else if (c === "}") {
        depth -= 1;
        if (depth === 0) {
          return { end: i, inner: text.slice(start, i) };
        }
      }
      i += 1;
    }

    throw new Error("Unclosed brace in extended notation.");
  }

  function parseNumberToken(text, start) {
    var i = parseUnsignedDecimal(text, start);
    if (i === null) {
      return null;
    }

    while (i < text.length && (text[i] === "e" || text[i] === "E")) {
      var next = i + 1;
      if (text[next] === "{") {
        var balanced = readBalancedBraces(text, next + 1);
        i = balanced.end + 1;
        break;
      }

      if (text[next] === "+" || text[next] === "-") {
        next += 1;
      }

      var end = parseUnsignedDecimal(text, next);
      if (end === null) {
        break;
      }

      i = end;
    }

    while (i < text.length && /[A-Za-z]/.test(text[i])) {
      i += 1;
      if (text[i] === "(") {
        i += 1;
        var digitStart = i;
        while (i < text.length && /[0-9]/.test(text[i])) {
          i += 1;
        }
        if (digitStart === i || text[i] !== ")") {
          throw new Error("Invalid derepetitive count in notation number.");
        }
        i += 1;
      }
    }

    return { text: text.slice(start, i), end: i };
  }

  function powBigInt(base, exp) {
    var result = 1n;
    var b = base;
    var e = exp;

    while (e > 0n) {
      if ((e & 1n) === 1n) {
        result *= b;
      }
      e >>= 1n;
      if (e > 0n) {
        b *= b;
      }
    }

    return result;
  }

  function compressLetters(letters) {
    if (!letters) {
      return letters;
    }

    var out = "";
    var i = 0;
    while (i < letters.length) {
      var j = i + 1;
      while (j < letters.length && letters[j] === letters[i]) {
        j += 1;
      }
      var count = j - i;
      if (count >= 4) {
        out += letters[i] + "(" + count + ")";
      } else {
        out += letters.slice(i, j);
      }
      i = j;
    }

    return out;
  }

  function encodeExponentBigInt(exp, useReduction) {
    if (exp <= 0n) {
      return "";
    }

    var n = exp;
    var chars = [];
    while (n > 0n) {
      n -= 1n;
      var rem = n % LETTER_BASE;
      chars.push(String.fromCharCode(97 + Number(rem)));
      n /= LETTER_BASE;
    }

    chars.reverse();
    var letters = chars.join("");
    return useReduction ? compressLetters(letters) : letters;
  }

  function decodeLettersReduced(lettersText) {
    var text = lettersText.trim();
    if (!text) {
      throw new Error("Missing letter exponent.");
    }

    var i = 0;
    var value = 0n;
    while (i < text.length) {
      var ch = text[i];
      if (!/[A-Za-z]/.test(ch)) {
        throw new Error("Invalid letter '" + ch + "' in notation exponent.");
      }

      var digit = BigInt(ch.toLowerCase().charCodeAt(0) - 96);
      i += 1;
      var count = 1n;

      if (text[i] === "(") {
        i += 1;
        var start = i;
        while (i < text.length && /[0-9]/.test(text[i])) {
          i += 1;
        }
        if (start === i || text[i] !== ")") {
          throw new Error("Malformed derepetitive count.");
        }
        count = BigInt(text.slice(start, i));
        i += 1;
      }

      if (count <= 0n) {
        throw new Error("Repeat count must be >= 1.");
      }

      if (count === 1n) {
        value = value * LETTER_BASE + digit;
      } else {
        var pow = powBigInt(LETTER_BASE, count);
        var geometric = (pow - 1n) / LETTER_BASE_MINUS_ONE;
        value = value * pow + digit * geometric;
      }
    }

    return value;
  }

  function tryParseExtendedNumberBody(body) {
    var baseEnd = parseUnsignedDecimal(body, 0);
    if (baseEnd === null) {
      return null;
    }
    if (body.slice(baseEnd, baseEnd + 2).toLowerCase() !== "e{") {
      return null;
    }
    var balanced = readBalancedBraces(body, baseEnd + 2);
    if (balanced.end !== body.length - 1) {
      return null;
    }
    return { base: body.slice(0, baseEnd), exponent: balanced.inner };
  }

  function parseNumberString(input) {
    var raw = String(input).trim();
    if (!raw) {
      throw new Error("Expected a number.");
    }

    var sign = 1;
    var body = raw;
    if (body[0] === "+" || body[0] === "-") {
      sign = body[0] === "-" ? -1 : 1;
      body = body.slice(1);
    }
    if (!body) {
      throw new Error("Expected digits after sign.");
    }

    var extended = tryParseExtendedNumberBody(body);
    if (extended) {
      var base = Decimal.fromString(extended.base);
      var exponent = parseNumberString(extended.exponent);
      var value = pow10Decimal(exponent).mul(base);
      return sign < 0 ? value.neg() : value;
    }

    var notationMatch = body.match(/^(\d+(?:\.\d*)?|\.\d+)((?:[A-Za-z](?:\(\d+\))?)+)$/);
    if (notationMatch) {
      var mantissa = Decimal.fromString(notationMatch[1]);
      var expBigInt = decodeLettersReduced(notationMatch[2]);
      var exponentValue = Decimal.fromString(expBigInt.toString());
      var notationValue = pow10Decimal(exponentValue).mul(mantissa);
      return sign < 0 ? notationValue.neg() : notationValue;
    }

    var sciMatch = body.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+\-]?(?:\d+(?:\.\d*)?|\.\d+))*$/i);
    if (sciMatch) {
      var parsed = Decimal.fromString(body);
      return sign < 0 ? parsed.neg() : parsed;
    }

    throw new Error("Could not parse number '" + input + "'.");
  }

  function formatMantissa(dec, places) {
    return trimTrailingZeros(dec.toStringWithDecimalPlaces(places));
  }

  function toDebbreviation(value, options, depth) {
    var opts = options || {};
    var precision = typeof opts.precision === "number" ? opts.precision : 6;
    var useReduction = opts.reduceLetters !== false;
    var maxDepth = typeof opts.maxDepth === "number" ? opts.maxDepth : 10;
    var currentDepth = typeof depth === "number" ? depth : 0;

    var d = Decimal.fromValue_noAlloc ? Decimal.fromValue_noAlloc(value) : new Decimal(value);
    if (!d.isFinite()) {
      return d.toString();
    }
    if (d.sign === 0) {
      return "0";
    }

    var signPrefix = d.sign < 0 ? "-" : "";
    var abs = d.abs();

    if (abs.lt(10)) {
      return signPrefix + formatMantissa(abs, precision);
    }

    var exponent = abs.log10().floor();
    if (exponent.layer === 0 && exponent.gte(1) && exponent.lte(MAX_EXACT_EXP)) {
      var expBigInt = BigInt(exponent.toStringWithDecimalPlaces(0));
      var letters = encodeExponentBigInt(expBigInt, useReduction);
      var mantissa = abs.div(pow10Decimal(exponent));
      return signPrefix + formatMantissa(mantissa, precision) + letters;
    }

    if (currentDepth >= maxDepth) {
      return signPrefix + abs.toString();
    }

    var bigMantissa = abs.layer <= 1 ? abs.mantissa : 1;
    var mantissaStr = trimTrailingZeros(bigMantissa.toFixed(precision));
    var exponentDeb = toDebbreviation(exponent, opts, currentDepth + 1);
    return signPrefix + mantissaStr + "e{" + exponentDeb + "}";
  }

  function tokenizeExpression(expression) {
    var expr = String(expression);
    var tokens = [];
    var i = 0;

    while (i < expr.length) {
      var ch = expr[i];

      if (/\s/.test(ch)) {
        i += 1;
        continue;
      }

      if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^") {
        tokens.push({ type: "op", value: ch });
        i += 1;
        continue;
      }

      if (ch === "(" || ch === ")") {
        tokens.push({ type: "paren", value: ch });
        i += 1;
        continue;
      }

      if (ch === ",") {
        tokens.push({ type: "comma", value: ch });
        i += 1;
        continue;
      }

      if (/[0-9.]/.test(ch)) {
        var number = parseNumberToken(expr, i);
        if (!number) {
          throw new Error("Invalid number token near '" + expr.slice(i, i + 12) + "'.");
        }
        tokens.push({ type: "number", value: number.text });
        i = number.end;
        continue;
      }

      if (/[A-Za-z_]/.test(ch)) {
        var j = i + 1;
        while (j < expr.length && /[A-Za-z0-9_]/.test(expr[j])) {
          j += 1;
        }
        tokens.push({ type: "identifier", value: expr.slice(i, j) });
        i = j;
        continue;
      }

      throw new Error("Unexpected character '" + ch + "' in expression.");
    }

    return tokens;
  }

  function ExpressionParser(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  ExpressionParser.prototype.peek = function () {
    return this.tokens[this.pos] || null;
  };

  ExpressionParser.prototype.next = function () {
    var token = this.peek();
    this.pos += 1;
    return token;
  };

  ExpressionParser.prototype.expect = function (type, value) {
    var token = this.peek();
    if (!token || token.type !== type || (typeof value !== "undefined" && token.value !== value)) {
      var found = token ? token.type + " '" + token.value + "'" : "end of input";
      throw new Error("Expected " + type + (value ? " '" + value + "'" : "") + ", found " + found + ".");
    }
    this.pos += 1;
    return token;
  };

  ExpressionParser.prototype.parse = function () {
    var value = this.parseExpression();
    if (this.peek()) {
      throw new Error("Unexpected token '" + this.peek().value + "' at end of expression.");
    }
    return value;
  };

  ExpressionParser.prototype.parseExpression = function () {
    var left = this.parseTerm();
    while (true) {
      var token = this.peek();
      if (!token || token.type !== "op" || (token.value !== "+" && token.value !== "-")) {
        break;
      }
      this.next();
      var right = this.parseTerm();
      left = token.value === "+" ? left.add(right) : left.sub(right);
    }
    return left;
  };

  ExpressionParser.prototype.parseTerm = function () {
    var left = this.parsePower();
    while (true) {
      var token = this.peek();
      if (!token || token.type !== "op" || (token.value !== "*" && token.value !== "/")) {
        break;
      }
      this.next();
      var right = this.parsePower();
      left = token.value === "*" ? left.mul(right) : left.div(right);
    }
    return left;
  };

  ExpressionParser.prototype.parsePower = function () {
    var left = this.parseUnary();
    var token = this.peek();
    if (token && token.type === "op" && token.value === "^") {
      this.next();
      var right = this.parsePower();
      return left.pow(right);
    }
    return left;
  };

  ExpressionParser.prototype.parseUnary = function () {
    var token = this.peek();
    if (token && token.type === "op" && (token.value === "+" || token.value === "-")) {
      this.next();
      var value = this.parseUnary();
      return token.value === "-" ? value.neg() : value;
    }
    return this.parsePrimary();
  };

  function parseConstant(name) {
    var key = name.toLowerCase();
    if (key === "pi") {
      return Decimal.fromNumber(Math.PI);
    }
    if (key === "tau") {
      return Decimal.fromNumber(Math.PI * 2);
    }
    if (key === "e") {
      return Decimal.fromNumber(Math.E);
    }
    throw new Error("Unknown identifier '" + name + "'.");
  }

  function callFunction(name, args) {
    var fn = name.toLowerCase();
    if (fn === "sin" && args.length === 1) return args[0].sin();
    if (fn === "cos" && args.length === 1) return args[0].cos();
    if (fn === "tan" && args.length === 1) return args[0].tan();
    if (fn === "asin" && args.length === 1) return args[0].asin();
    if (fn === "acos" && args.length === 1) return args[0].acos();
    if (fn === "atan" && args.length === 1) return args[0].atan();
    if (fn === "sqrt" && args.length === 1) return args[0].sqrt();
    if (fn === "abs" && args.length === 1) return args[0].abs();
    if (fn === "ln" && args.length === 1) return args[0].ln();
    if (fn === "log10" && args.length === 1) return args[0].log10();
    if (fn === "log" && args.length === 1) return args[0].log10();
    if (fn === "log" && args.length === 2) return args[0].log(args[1]);
    if (fn === "exp" && args.length === 1) return args[0].exp();
    if (fn === "floor" && args.length === 1) return args[0].floor();
    if (fn === "ceil" && args.length === 1) return args[0].ceil();

    if (fn === "min" && args.length >= 1) {
      var min = args[0];
      for (var i = 1; i < args.length; i += 1) {
        if (args[i].lt(min)) min = args[i];
      }
      return min;
    }

    if (fn === "max" && args.length >= 1) {
      var max = args[0];
      for (var j = 1; j < args.length; j += 1) {
        if (args[j].gt(max)) max = args[j];
      }
      return max;
    }

    throw new Error("Unsupported function '" + name + "' with " + args.length + " argument(s).");
  }

  ExpressionParser.prototype.parsePrimary = function () {
    var token = this.peek();
    if (!token) {
      throw new Error("Unexpected end of expression.");
    }

    if (token.type === "number") {
      this.next();
      return parseNumberString(token.value);
    }

    if (token.type === "identifier") {
      this.next();
      var name = token.value;
      var maybeParen = this.peek();
      if (maybeParen && maybeParen.type === "paren" && maybeParen.value === "(") {
        this.next();
        var args = [];
        var closing = this.peek();
        if (!(closing && closing.type === "paren" && closing.value === ")")) {
          while (true) {
            args.push(this.parseExpression());
            var separator = this.peek();
            if (separator && separator.type === "comma") {
              this.next();
              continue;
            }
            break;
          }
        }
        this.expect("paren", ")");
        return callFunction(name, args);
      }

      return parseConstant(name);
    }

    if (token.type === "paren" && token.value === "(") {
      this.next();
      var value = this.parseExpression();
      this.expect("paren", ")");
      return value;
    }

    throw new Error("Unexpected token '" + token.value + "'.");
  };

  function evaluateExpression(expression) {
    var tokens = tokenizeExpression(expression);
    var parser = new ExpressionParser(tokens);
    return parser.parse();
  }

  return {
    Decimal: Decimal,
    parseNumberString: parseNumberString,
    toDebbreviation: toDebbreviation,
    evaluateExpression: evaluateExpression,
    encodeExponentBigInt: encodeExponentBigInt,
    decodeLettersReduced: decodeLettersReduced,
  };
});

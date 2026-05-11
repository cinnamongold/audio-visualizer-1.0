# Debbreviation Lab

Small browser app for Debbreviation notation conversion + calculation.

## Run

1. Open `index.html` in a browser.
2. Use **Converter** for natural/scientific inputs (`12345`, `1e500`, `1e1e999`).
3. Use **Calculator** with notation and math functions.

## Supported Calculator Syntax

- Operators: `+ - * / ^`
- Parentheses: `( ... )`
- Functions: `log(x)`, `log(x, base)`, `ln(x)`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `sqrt`, `abs`, `exp`, `floor`, `ceil`, `min`, `max`
- Constants: `pi`, `tau`, `e`

## Notation Notes

- Core format: `mantissa + letters` where letters encode decimal exponent in bijective base-26 (`a=1`, ..., `z=26`, `aa=27`, ...).
- Derepetitives are supported in input/output (`a(5)` means `aaaaa`).
- For exponents too large to encode directly, the app uses recursive extended form:
  - `mantissae{<debbreviation exponent>}`
  - Example shape: `1e{1abc}`


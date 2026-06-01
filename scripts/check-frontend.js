const fs = require("node:fs");

const html = fs.readFileSync("frontend/index.html", "utf8");
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);

if (!scriptMatch) {
  throw new Error("frontend/index.html does not contain an inline script block");
}

new Function(scriptMatch[1]);
console.log("frontend script parsed");

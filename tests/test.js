const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", (err) => {
  console.error("JSDOM Error:", err);
});
virtualConsole.on("jsdomError", (err) => {
  console.error("JSDOM Internal Error:", err.message);
});
virtualConsole.sendTo(console);

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  virtualConsole: virtualConsole,
  url: "http://localhost:8080/linkstash/"
});

setTimeout(() => {
    console.log("Done evaluating.");
    process.exit(0);
}, 2000);

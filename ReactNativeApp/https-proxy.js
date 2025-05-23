// Simple HTTPS proxy for Expo (React Native) development server
const https = require("https");
const httpProxy = require("http-proxy");
const fs = require("fs");

const PORT = 9443; // HTTPS port for proxy
const TARGET = "http://localhost:8081"; // Expo dev server

const certPath = "../BackendServer/certs/server.cert";
const keyPath = "../BackendServer/certs/server.key";

const proxy = httpProxy.createProxyServer({
  target: TARGET,
  ws: true,
});

const server = https.createServer(
  {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  },
  (req, res) => {
    proxy.web(req, res);
  }
);

server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(PORT, () => {
  console.log(`HTTPS proxy running at https://localhost:${PORT} → ${TARGET}`);
});

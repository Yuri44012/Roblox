const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/login", async (req, res) => {
  const { username, password, proxy } = req.body;
  const agent = new HttpsProxyAgent("http://" + proxy);
  const loginUrl = "https://auth.roblox.com/v2/login";

  try {
    // Step 1: Get X-CSRF-TOKEN
    const firstAttempt = await axios.post(loginUrl, {}, {
      httpsAgent: agent,
      validateStatus: () => true
    });
    const csrfToken = firstAttempt.headers["x-csrf-token"];

    // Step 2: Actual login request
    const loginResp = await axios.post(loginUrl, {
      ctype: "Username",
      cvalue: username,
      password: password
    }, {
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken
      },
      httpsAgent: agent,
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: () => true
    });

    const robloCookie = loginResp.headers["set-cookie"]?.find(c => c.includes(".ROBLOSECURITY"));

    if (robloCookie) {
      res.json({
        success: true,
        cookie: robloCookie
      });
    } else {
      res.json({
        success: false,
        error: loginResp.data.errors || "Login failed. Check credentials or proxy."
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

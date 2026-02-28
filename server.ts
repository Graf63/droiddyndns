import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API to get the public IP of the requester
  // In a real scenario, the server sees the client's IP
  app.get("/api/my-ip", async (req, res) => {
    try {
      // We use an external service to be sure we get the public IP even if behind proxies
      const response = await axios.get("https://api.ipify.org?format=json");
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch IP" });
    }
  });

  // Proxy to DynDNS providers to avoid CORS issues in the browser
  app.post("/api/update-dns", async (req, res) => {
    const { provider, domain, user, password, ip } = req.body;

    if (!provider || !domain || !user || !password || !ip) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    try {
      const auth = Buffer.from(`${user}:${password}`).toString("base64");
      let url = "";

      if (provider === "ovh") {
        url = `https://www.ovh.com/nic/update?system=dyndns&hostname=${domain}&myip=${ip}`;
      } else if (provider === "noip") {
        // No-IP update protocol is very similar
        url = `https://dynupdate.no-ip.com/nic/update?hostname=${domain}&myip=${ip}`;
      } else {
        return res.status(400).json({ error: "Unsupported provider" });
      }
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          // No-IP requires a specific User-Agent
          "User-Agent": "DroidDynDNS/1.0 grafics63@gmail.com"
        },
      });

      res.json({ status: response.data });
    } catch (error: any) {
      console.error(`${provider.toUpperCase()} Update Error:`, error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ 
        error: `${provider.toUpperCase()} update failed`, 
        details: error.response?.data || error.message 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

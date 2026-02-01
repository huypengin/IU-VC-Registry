import 'dotenv/config';
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import {
  initStatusList,
  allocateStatusIndices,
  setStatusBit,
  getStatusList,
  getStatusListByPublicUrl,
  getAuditLogs,
} from "./status/status-list-service.js";
import { publishStatusList } from "./status/status-list-publisher.js";

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Static registry assets are built into `public/` (via `npm run registry:build`).
// In some setups (e.g. Docker), dynamic status files may be written into `public/status`
// while the rest of the registry is served from another directory (e.g. mounted static build).
const DYNAMIC_PUBLIC_DIR = path.resolve("public");
const STATIC_PUBLIC_DIR = process.env.REGISTRY_STATIC_DIR
  ? path.resolve(process.env.REGISTRY_STATIC_DIR)
  : DYNAMIC_PUBLIC_DIR;

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.static(DYNAMIC_PUBLIC_DIR, {
  setHeaders: (res, filepath) => {
    if (filepath.includes('/status/')) {
      res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    } else if (filepath.endsWith('.json') || filepath.endsWith('.jsonld')) {
      res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

if (STATIC_PUBLIC_DIR !== DYNAMIC_PUBLIC_DIR) {
  app.use(express.static(STATIC_PUBLIC_DIR, {
    setHeaders: (res, filepath) => {
      if (filepath.includes("/status/")) {
        res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
      } else if (filepath.endsWith(".json") || filepath.endsWith(".jsonld")) {
        res.setHeader("Cache-Control", "public, max-age=3600, immutable");
      }
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }));
}

app.post("/admin/status-lists/init", async (req, res) => {
  try {
    const { listId, size = 16384, statusPurpose = 'revocation' } = req.body;
    
    if (!listId) {
      res.status(400).json({ error: "listId is required" });
      return;
    }

    const statusList = await initStatusList(listId, size, statusPurpose);
    
    await publishStatusList(listId);
    
    res.json({
      ok: true,
      statusList: {
        id: statusList.id,
        size: statusList.size,
        nextIndex: statusList.nextIndex,
        statusPurpose: statusList.statusPurpose,
      },
    });
  } catch (error: any) {
    console.error('Error initializing status list:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/status-lists/:listId/allocate", async (req, res) => {
  try {
    const { listId } = req.params;
    const { count = 1, credentialId } = req.body ?? {};
    
    if (count < 1 || count > 1000) {
      res.status(400).json({ error: "count must be between 1 and 1000" });
      return;
    }

    const allocations = await allocateStatusIndices(listId, count, credentialId);
    
    res.json({
      ok: true,
      listId,
      allocations,
      count: allocations.length,
    });
  } catch (error: any) {
    console.error('Error allocating indices:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/status/revoke", async (req, res) => {
  try {
    const { statusListCredential, statusListIndex, credentialId, reason } = req.body ?? {};
    
    if (!statusListCredential || typeof statusListIndex !== 'string') {
      res.status(400).json({ 
        error: "statusListCredential and statusListIndex are required" 
      });
      return;
    }

    const list = await getStatusListByPublicUrl(statusListCredential);
    
    if (!list) {
      res.status(404).json({ 
        error: `Status list not found for URL: ${statusListCredential}` 
      });
      return;
    }

    const index = parseInt(statusListIndex, 10);
    
    if (isNaN(index) || index < 0) {
      res.status(400).json({ error: "statusListIndex must be a valid non-negative number" });
      return;
    }

    await setStatusBit(list.id, index, 1, credentialId, { reason });
    await publishStatusList(list.id);
    
    res.json({
      ok: true,
      listId: list.id,
      index,
      action: 'revoked',
    });
  } catch (error: any) {
    console.error('Error revoking credential:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/status-lists/:listId/revoke", async (req, res) => {
  try {
    const { listId } = req.params;
    const { index, credentialId, reason } = req.body ?? {};
    
    if (typeof index !== "number") {
      res.status(400).json({ error: "index is required and must be a number" });
      return;
    }

    await setStatusBit(listId, index, 1, credentialId, { reason });
    
    await publishStatusList(listId);
    
    res.json({
      ok: true,
      listId,
      index,
      action: 'revoked',
    });
  } catch (error: any) {
    console.error('Error revoking credential:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/status-lists/:listId/unrevoke", async (req, res) => {
  try {
    const { listId } = req.params;
    const { index, credentialId, reason } = req.body ?? {};
    
    if (typeof index !== "number") {
      res.status(400).json({ error: "index is required and must be a number" });
      return;
    }

    await setStatusBit(listId, index, 0, credentialId, { reason });
    
    await publishStatusList(listId);
    
    res.json({
      ok: true,
      listId,
      index,
      action: 'unrevoked',
    });
  } catch (error: any) {
    console.error('Error unrevoking credential:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/status/unrevoke", async (req, res) => {
  try {
    const { statusListCredential, statusListIndex, credentialId, reason } = req.body ?? {};
    
    if (!statusListCredential || typeof statusListIndex !== 'string') {
      res.status(400).json({ 
        error: "statusListCredential and statusListIndex are required" 
      });
      return;
    }

    const list = await getStatusListByPublicUrl(statusListCredential);
    
    if (!list) {
      res.status(404).json({ 
        error: `Status list not found for URL: ${statusListCredential}` 
      });
      return;
    }

    const index = parseInt(statusListIndex, 10);
    
    if (isNaN(index) || index < 0) {
      res.status(400).json({ error: "statusListIndex must be a valid non-negative number" });
      return;
    }

    await setStatusBit(list.id, index, 0, credentialId, { reason });
    await publishStatusList(list.id);
    
    res.json({
      ok: true,
      listId: list.id,
      index,
      action: 'unrevoked',
    });
  } catch (error: any) {
    console.error('Error unrevoking credential:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/status-lists/:listId", async (req, res) => {
  try {
    const { listId } = req.params;
    const statusList = await getStatusList(listId);
    
    if (!statusList) {
      res.status(404).json({ error: "Status list not found" });
      return;
    }

    res.json({
      ok: true,
      statusList: {
        id: statusList.id,
        size: statusList.size,
        nextIndex: statusList.nextIndex,
        statusPurpose: statusList.statusPurpose,
        createdAt: statusList.createdAt,
        updatedAt: statusList.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error getting status list:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/status-lists/:listId/audit", async (req, res) => {
  try {
    const { listId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const logs = await getAuditLogs(listId, limit, offset);
    
    res.json({
      ok: true,
      listId,
      logs,
      count: logs.length,
    });
  } catch (error: any) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "registry-server" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`✅ Registry server listening on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📁 Serving dynamic files from: ${DYNAMIC_PUBLIC_DIR}`);
  console.log(`📁 Serving static files from: ${STATIC_PUBLIC_DIR}`);
  console.log(`🔧 Admin API: http://localhost:${port}/admin/...`);
});

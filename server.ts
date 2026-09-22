import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const app = express();
const PORT = 3000;

// Increase payload limits for direct high-resolution mobile camera photo uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directories for persistent cloud database and uploaded photos
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const DB_FILE = path.join(DATA_DIR, 'incidents.json');
const DELETED_DB_FILE = path.join(DATA_DIR, 'deleted_incidents.json');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper functions for persistent deleted IDs tombstones
function readDeletedDatabase(): string[] {
  try {
    if (fs.existsSync(DELETED_DB_FILE)) {
      const content = fs.readFileSync(DELETED_DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading deleted incidents database:', err);
  }
  return [];
}

function recordDeletedId(id: string): void {
  try {
    const existing = readDeletedDatabase();
    if (!existing.includes(id)) {
      existing.push(id);
      fs.writeFileSync(DELETED_DB_FILE, JSON.stringify(existing, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error recording deleted id:', err);
  }
}

// Helper functions for persistent database
function readDatabase(): any[] {
  try {
    const deletedIds = new Set(readDeletedDatabase());
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.filter((r: any) => r && r.id && !deletedIds.has(r.id));
      }
    }
  } catch (err) {
    console.error('Error reading incidents database:', err);
  }
  return [];
}

function writeDatabase(data: any[]): boolean {
  try {
    const deletedIds = new Set(readDeletedDatabase());
    const cleanData = Array.isArray(data) ? data.filter((r: any) => r && r.id && !deletedIds.has(r.id)) : [];
    fs.writeFileSync(DB_FILE, JSON.stringify(cleanData, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing incidents database:', err);
    return false;
  }
}

// Static route for uploaded media (accessible cross-device across phones, laptops, and tablets)
app.use('/uploads', express.static(UPLOADS_DIR));

// API: Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    reportsCount: readDatabase().length,
    storage: 'central-cloud-disk'
  });
});

// API: Central Cloud Storage Photo & Video Upload
// Accepts base64 image or video data URL and saves to public/uploads
app.post('/api/upload', (req, res) => {
  try {
    const rawPayload = req.body.media || req.body.video || req.body.image;
    if (!rawPayload || typeof rawPayload !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid media payload' });
      return;
    }

    let mimeType = '';
    let base64Data = rawPayload;

    // Robust base64 data URL extraction (handles codecs like "data:video/webm;codecs=vp9,opus;base64,...")
    if (rawPayload.startsWith('data:')) {
      const base64Marker = ';base64,';
      const markerIndex = rawPayload.indexOf(base64Marker);
      if (markerIndex !== -1) {
        mimeType = rawPayload.substring(5, markerIndex).toLowerCase().trim();
        base64Data = rawPayload.substring(markerIndex + base64Marker.length);
      }
    }

    if (!mimeType && req.body.mimeType && typeof req.body.mimeType === 'string') {
      mimeType = req.body.mimeType.toLowerCase().trim();
    }

    // Determine extension and media type
    let ext = 'jpg';
    let isVideo = false;

    if (
      mimeType.includes('webm') ||
      mimeType.includes('mp4') ||
      mimeType.includes('quicktime') ||
      mimeType.includes('mov') ||
      mimeType.includes('ogg') ||
      mimeType.includes('ogv') ||
      mimeType.includes('mkv') ||
      mimeType.includes('avi') ||
      mimeType.startsWith('video/') ||
      Boolean(req.body.video)
    ) {
      isVideo = true;
      if (mimeType.includes('mp4')) ext = 'mp4';
      else if (mimeType.includes('quicktime') || mimeType.includes('mov')) ext = 'mov';
      else if (mimeType.includes('ogg') || mimeType.includes('ogv')) ext = 'ogv';
      else if (mimeType.includes('mkv')) ext = 'mkv';
      else ext = 'webm';
    } else if (mimeType.includes('png')) {
      ext = 'png';
    } else if (mimeType.includes('webp')) {
      ext = 'webp';
    } else if (mimeType.includes('gif')) {
      ext = 'gif';
    } else {
      ext = 'jpg';
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const uniqueId = `${isVideo ? 'video' : 'incident'}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const safeName = `${uniqueId}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeName);

    fs.writeFileSync(filePath, buffer);

    // Public URL accessible to any phone or laptop device
    const publicUrl = `/uploads/${safeName}`;

    res.json({
      success: true,
      url: publicUrl,
      imageUrl: !isVideo ? publicUrl : undefined,
      videoUrl: isVideo ? publicUrl : undefined,
      isVideo,
      sizeBytes: buffer.length,
      mimeType: isVideo ? (mimeType.startsWith('video/') ? mimeType : `video/${ext}`) : (mimeType || `image/${ext}`)
    });
  } catch (err: any) {
    console.error('Upload processing error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to upload media' });
  }
});

// API: Get all incidents (Cross-device sync endpoint)
app.get('/api/incidents', (req, res) => {
  const incidents = readDatabase();
  res.json({
    success: true,
    data: incidents,
    count: incidents.length,
    lastSync: new Date().toISOString()
  });
});

// API: Create new incident (Persisted across devices)
app.post('/api/incidents', (req, res) => {
  try {
    const newReport = req.body;
    if (!newReport || !newReport.id || !newReport.title) {
      res.status(400).json({ success: false, error: 'Invalid incident report payload' });
      return;
    }

    const deletedIds = readDeletedDatabase();
    if (deletedIds.includes(newReport.id)) {
      res.status(200).json({
        success: true,
        ignored: true,
        message: 'Report was previously deleted permanently and cannot be re-added.'
      });
      return;
    }

    const current = readDatabase();
    // Prepend new report to top of list
    const updated = [newReport, ...current.filter((r) => r.id !== newReport.id)];
    writeDatabase(updated);

    res.status(201).json({
      success: true,
      data: newReport,
      message: 'Report saved to shared database'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Database write error' });
  }
});

// API: Update incident status / operator notes / upvotes
app.put('/api/incidents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const current = readDatabase();
    const index = current.findIndex((r) => r.id === id);

    if (index === -1) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }

    // Automatically delete resolved incident from database
    if (updates.status === 'resolved') {
      const remaining = current.filter((r) => r.id !== id);
      writeDatabase(remaining);
      res.json({
        success: true,
        message: 'Report resolved and automatically deleted from persistent database',
        resolvedAndDeleted: true
      });
      return;
    }

    current[index] = {
      ...current[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // If imageUrl is explicitly cleared or deleted
    if (updates.imageUrl === null || updates.imageUrl === '' || updates.deleteImage) {
      delete current[index].imageUrl;
      delete current[index].additionalImages;
    }

    writeDatabase(current);
    res.json({ success: true, data: current[index] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Update failed' });
  }
});

// API: Delete image from an incident
app.delete('/api/incidents/:id/image', (req, res) => {
  try {
    const { id } = req.params;
    const current = readDatabase();
    const index = current.findIndex((r) => r.id === id);

    if (index === -1) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }

    delete current[index].imageUrl;
    delete current[index].additionalImages;
    current[index].updatedAt = new Date().toISOString();

    writeDatabase(current);
    res.json({
      success: true,
      message: 'AI/Incident image deleted from database',
      data: current[index]
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Image delete failed' });
  }
});

// API: Get list of permanently deleted tombstoned incident IDs
app.get('/api/incidents/deleted', (req, res) => {
  const deleted = readDeletedDatabase();
  res.json({ success: true, data: deleted, count: deleted.length });
});

// API: Delete an AI-reported incident permanently
app.delete('/api/incidents/ai/:id', (req, res) => {
  try {
    const { id } = req.params;
    recordDeletedId(id);
    const current = readDatabase();
    const target = current.find((r) => r.id === id);
    const updated = current.filter((r) => r.id !== id);
    writeDatabase(updated);

    res.json({
      success: true,
      message: `AI reported incident ${target?.ticketNumber || id} permanently deleted from database.`,
      deletedId: id
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Delete failed' });
  }
});

// API: Delete an incident permanently
app.delete('/api/incidents/:id', (req, res) => {
  try {
    const { id } = req.params;
    recordDeletedId(id);
    const current = readDatabase();
    const target = current.find((r) => r.id === id);
    const updated = current.filter((r) => r.id !== id);
    writeDatabase(updated);
    res.json({
      success: true,
      message: `Report ${target?.ticketNumber || id} permanently deleted from database`,
      deletedId: id
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Delete failed' });
  }
});

// API: Batch sync or initialize database
app.post('/api/incidents/batch', (req, res) => {
  try {
    const { reports } = req.body;
    if (Array.isArray(reports)) {
      const deletedIds = new Set(readDeletedDatabase());
      const filteredReports = reports.filter((r) => r && r.id && !deletedIds.has(r.id));
      writeDatabase(filteredReports);
      res.json({ success: true, count: filteredReports.length });
    } else {
      res.status(400).json({ success: false, error: 'Expected array of reports' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// API: Citizen AI Assistant Chatbot (Powered by Gemini 3.8 Flash)
app.post('/api/citizen-assistant', async (req, res) => {
  try {
    const { message, history, context } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid message string' });
      return;
    }

    const ai = getAi();
    if (!ai) {
      res.json({
        success: false,
        fallback: true,
        reply: "Running in offline assistant mode. I can assist you with reporting issues, checking ticket statuses, finding safe routes, or sounding the emergency buzzer."
      });
      return;
    }

    const systemInstruction = `You are the BEACON Civic AI Copilot, a helpful 24/7 intelligent assistant embedded in the BEACON Citizen Reporter Portal for Chennai, Tamil Nadu.
Your job is to provide instant, practical guidance and help citizens access and use every feature of this app:
1. "Report an Incident" - Filing civic or safety reports (potholes, water leaks, streetlights, garbage, fallen trees, fires, crimes, electrical hazards) with EXIF photos and voice notes.
2. "Track / Search Incidents" - Checking the status of submitted tickets (e.g., CHN-2026-...) or finding nearby reports.
3. "Safe Route Navigation" - Suggesting safe travel corridors avoiding reported hotspots, unlit areas, or flooded streets.
4. "Emergency Alert & Buzzer" - Sounding sirens or broadcasting simulated geo-fenced APNs/FCM push alerts for critical life-safety hazards.
5. "Cluster Detection & Hotspot Analysis" - Explaining how 5 reports of the same problem within 100m auto-merge into an escalated priority hotspot ticket.
6. "Report Integrity & Anti-Duplicate Scanner" - Verifying reports via perceptual image hashing.
7. "View Switching & Filtering" - Guiding citizens between GIS Map view, Community Feed, and "My Submissions" tab.

Context of active system state:
- Active reports count: ${context?.reportsCount ?? 'several'}
- Emergency hazards active: ${context?.emergencyCount ?? 0}
- Citizen District: ${context?.userDistrict || 'Central Chennai'}
- Sample active tickets: ${JSON.stringify(context?.recentReports?.slice(0, 4) || [])}

Tone: Friendly, concise, professional, and action-oriented. Keep responses to 2-4 sentences unless detailed instructions are requested. Highlight departments and ticket numbers in bold. Always offer clear next steps.`;

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-6)) {
        if (item && item.role && item.content) {
          contents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.content }]
          });
        }
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const reply = response.text || "I am here to help you access all civic incident reporting, safe navigation, and emergency features.";
    res.json({
      success: true,
      reply
    });
  } catch (err: any) {
    console.error('Citizen assistant API error:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to process AI assistant response',
      fallback: true
    });
  }
});

// Start server with Vite middleware in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CivicSafe Beacon] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[CivicSafe Beacon] Cloud Media Uploads mounted at /uploads`);
    console.log(`[CivicSafe Beacon] Multi-device database initialized at ${DB_FILE}`);
  });
}

startServer();

import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

router.get('/dev/logs', (req, res) => {
  try {
    const logPath = path.join(process.cwd(), 'logs', 'combined.log');

    if (!fs.existsSync(logPath)) {
      return res.json({ logs: 'No logs yet' });
    }

    const logs = fs.readFileSync(logPath, 'utf-8');
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

export default router;

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { pool, migrate, transaction } from './db';

const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-2026';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string; name: string };
    }
  }
}

type AuthenticatedSocket = WebSocket & {
  userId?: string;
  userRole?: string;
  userName?: string;
  isAlive: boolean;
};

const wsClients = new Set<AuthenticatedSocket>();

function broadcast(event: string, data: any, excludeUserId?: string) {
  const message = JSON.stringify({ event, data, ts: Date.now() });
  wsClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN && (!excludeUserId || ws.userId !== excludeUserId)) {
      ws.send(message);
    }
  });
}

function broadcastToUser(userId: string, event: string, data: any) {
  const message = JSON.stringify({ event, data, ts: Date.now() });
  wsClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN && ws.userId === userId) {
      ws.send(message);
    }
  });
}

function setupWebSocket() {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: AuthenticatedSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      ws.userId = decoded.id;
      ws.userRole = decoded.role;
      ws.userName = decoded.name;
      ws.isAlive = true;

      wsClients.add(ws);
      ws.send(JSON.stringify({ event: 'connected', data: { userId: decoded.id } }));

      ws.on('pong', () => { ws.isAlive = true; });
      ws.on('close', () => { wsClients.delete(ws); });
      ws.on('error', () => { wsClients.delete(ws); });
    } catch {
      ws.close(1008, 'Invalid token');
    }
  });

  const interval = setInterval(() => {
    wsClients.forEach((ws) => {
      if (!ws.isAlive) {
        wsClients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
}

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user as any;
    next();
  });
};

const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'superadmin') return res.status(403).json({ error: 'Access denied. Super Admin only.' });
  next();
};

const isRelatedToEvaluation = (user: any, ev: any): boolean => {
  return ev.createdBy === user.id || ev.appraiser === user.id || ev.supporter === user.id || ev.employeeId === user.id;
};

const logAudit = async (userId: string, userName: string, action: string, details: string) => {
  try {
    await pool.query('INSERT INTO "audit_logs" ("userId", "userName", "action", "details") VALUES ($1, $2, $3, $4)', [userId, userName, action, details]);
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

const app = express();
app.use(express.json());
const server = http.createServer(app);

// --- AUTH ROUTES ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    const result = await pool.query('SELECT * FROM "users" WHERE "id" = $1', [userId]);
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid User ID or Password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
    await logAudit(user.id, user.name, 'login', `User logged in from ${req.ip || 'unknown'}`);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// --- USER ROUTES ---
app.get('/api/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT "id", "name", "role" FROM "users"');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id, name, role, password } = req.body;
    const existing = await pool.query('SELECT "id" FROM "users" WHERE "id" = $1', [id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User ID already exists' });
    }
    const hash = bcrypt.hashSync(password, 10);
    await pool.query('INSERT INTO "users" ("id", "name", "password", "role") VALUES ($1, $2, $3, $4)', [id, name, hash, role]);
    await logAudit(req.user!.id, req.user!.name, 'create_user', `Created user ${name} (${id})`);
    broadcast('users:updated', { action: 'create', userId: id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, password } = req.body;
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await pool.query('UPDATE "users" SET "name" = $1, "role" = $2, "password" = $3 WHERE "id" = $4', [name, role, hash, id]);
    } else {
      await pool.query('UPDATE "users" SET "name" = $1, "role" = $2 WHERE "id" = $3', [name, role, id]);
    }
    await logAudit(req.user!.id, req.user!.name, 'update_user', `Updated user ${name} (${id})`);
    broadcast('users:updated', { action: 'update', userId: id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user!.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    if (id === 'superadmin') return res.status(400).json({ error: 'Cannot delete the default superadmin' });
    await pool.query('DELETE FROM "users" WHERE "id" = $1', [id]);
    await logAudit(req.user!.id, req.user!.name, 'delete_user', `Deleted user (${id})`);
    broadcast('users:updated', { action: 'delete', userId: id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SETTINGS ROUTES ---
app.get('/api/settings/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query('SELECT "value" FROM "app_settings" WHERE "key" = $1', [key]);
    if (result.rows.length > 0) {
      try {
        res.json(JSON.parse(result.rows[0].value));
      } catch {
        res.json(result.rows[0].value);
      }
    } else {
      res.json(key === 'evaluation_config' ? null : (key === 'position_form_configs' ? [] : null));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/:key', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const data = req.body;
    await pool.query(
      'INSERT INTO "app_settings" ("key", "value") VALUES ($1, $2) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"',
      [key, JSON.stringify(data)]
    );
    await logAudit(req.user!.id, req.user!.name, 'update_settings', `Updated ${key}`);
    broadcast('settings:updated', { key });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- NOTIFICATION ROUTES ---
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications: any[] = [];
    const userId = req.user!.id;

    const myEvals = await pool.query(
      `SELECT COUNT(*)::int as count FROM "evaluations" WHERE "employeeId" = $1 AND "status" IN ('Draft', 'Self Evaluation Pending')`,
      [userId]
    );
    if (myEvals.rows[0].count > 0) {
      notifications.push({ id: 'self-eval', message: `You have ${myEvals.rows[0].count} self-evaluation(s) to complete.`, type: 'warning', link: '/dashboard' });
    }

    const superEvals = await pool.query(
      `SELECT COUNT(*)::int as count FROM "evaluations" WHERE "appraiser" = $1 AND "status" = 'Waiting for Supervisor'`,
      [userId]
    );
    if (superEvals.rows[0].count > 0) {
      notifications.push({ id: 'super-eval', message: `You have ${superEvals.rows[0].count} evaluation(s) waiting for your supervisor review.`, type: 'info', link: '/dashboard' });
    }

    const supporterEvals = await pool.query(
      `SELECT COUNT(*)::int as count FROM "evaluations" WHERE "supporter" = $1 AND "status" = 'Waiting for Supporter'`,
      [userId]
    );
    if (supporterEvals.rows[0].count > 0) {
      notifications.push({ id: 'supporter-eval', message: `You have ${supporterEvals.rows[0].count} evaluation(s) waiting for your supporter review.`, type: 'info', link: '/dashboard' });
    }

    if (req.user!.role === 'superadmin') {
      const allPending = await pool.query(`SELECT COUNT(*)::int as count FROM "evaluations" WHERE "status" NOT IN ('Completed', 'Approved')`);
      if (allPending.rows[0].count > 0) {
        notifications.push({ id: 'admin-pending', message: `There are ${allPending.rows[0].count} evaluation(s) in progress across the system.`, type: 'default', link: '/dashboard' });
      }
    }

    const storedNotifs = await pool.query('SELECT * FROM "notifications" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 50', [userId]);
    for (const n of storedNotifs.rows) {
      notifications.push(n);
    }

    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { id, userId, type, title, message, khMessage, link, evaluationId } = req.body;
    const notifId = id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await pool.query(
      'INSERT INTO "notifications" ("id", "userId", "type", "title", "message", "khMessage", "link", "evaluationId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [notifId, userId, type || 'info', title || '', message, khMessage || '', link || '', evaluationId || null]
    );
    broadcast('notifications:updated', { userId });
    res.json({ success: true, id: notifId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { id, read, markAllRead, userId } = req.body;
    if (id && read) {
      await pool.query('UPDATE "notifications" SET "read" = TRUE WHERE "id" = $1', [id]);
    }
    if (markAllRead && userId) {
      await pool.query('UPDATE "notifications" SET "read" = TRUE WHERE "userId" = $1', [userId]);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM "notifications" WHERE "id" = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- DATA MANAGEMENT ---
app.get('/api/data/export', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const [usersRes, evalsRes, scoresRes, settingsRes] = await Promise.all([
      pool.query('SELECT "id", "name", "role" FROM "users"'),
      pool.query('SELECT * FROM "evaluations"'),
      pool.query('SELECT * FROM "criteria_scores"'),
      pool.query('SELECT * FROM "app_settings"'),
    ]);
    await logAudit(req.user!.id, req.user!.name, 'export_data', 'Exported full system backup');
    res.json({ users: usersRes.rows, evaluations: evalsRes.rows, criteriaScores: scoresRes.rows, settings: settingsRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/data/import', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { users, evaluations, criteriaScores, settings } = req.body;
    await transaction(async (client) => {
      if (evaluations && Array.isArray(evaluations)) {
        for (const e of evaluations) {
          await client.query(
            `INSERT INTO "evaluations" ("id","employeeId","employeeName","campus","position","appraiser","reviewDate","weightScheme","evaluationType","totalSelf","totalSuper","overallScore","createdBy","createdByName","createdAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             ON CONFLICT ("id") DO UPDATE SET "employeeId"=EXCLUDED."employeeId","employeeName"=EXCLUDED."employeeName","campus"=EXCLUDED."campus","position"=EXCLUDED."position","appraiser"=EXCLUDED."appraiser","reviewDate"=EXCLUDED."reviewDate","weightScheme"=EXCLUDED."weightScheme","evaluationType"=EXCLUDED."evaluationType","totalSelf"=EXCLUDED."totalSelf","totalSuper"=EXCLUDED."totalSuper","overallScore"=EXCLUDED."overallScore","createdBy"=EXCLUDED."createdBy","createdByName"=EXCLUDED."createdByName","createdAt"=EXCLUDED."createdAt"`,
            [e.id, e.employeeId, e.employeeName, e.campus, e.position, e.appraiser, e.reviewDate, e.weightScheme, e.evaluationType, e.totalSelf, e.totalSuper, e.overallScore, e.createdBy, e.createdByName, e.createdAt]
          );
        }
      }
      if (criteriaScores && Array.isArray(criteriaScores)) {
        for (const c of criteriaScores) {
          await client.query(
            `INSERT INTO "criteria_scores" ("id","evaluationId","criteriaId","selfScore","superScore","supporterScore","managementScore","aspScore")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT ("id") DO UPDATE SET "evaluationId"=EXCLUDED."evaluationId","criteriaId"=EXCLUDED."criteriaId","selfScore"=EXCLUDED."selfScore","superScore"=EXCLUDED."superScore","supporterScore"=EXCLUDED."supporterScore","managementScore"=EXCLUDED."managementScore","aspScore"=EXCLUDED."aspScore"`,
            [c.id, c.evaluationId, c.criteriaId, c.selfScore, c.superScore, c.supporterScore, c.managementScore, c.aspScore]
          );
        }
      }
      if (settings && Array.isArray(settings)) {
        for (const s of settings) {
          await client.query(
            'INSERT INTO "app_settings" ("key","value") VALUES ($1,$2) ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value"',
            [s.key, s.value]
          );
        }
      }
    });
    await logAudit(req.user!.id, req.user!.name, 'import_data', 'Imported data from backup');
    broadcast('data:imported', {});
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/data/reset/:type', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    if (!['evaluations', 'users', 'employees', 'all'].includes(type)) {
      return res.status(400).json({ error: 'Invalid reset type' });
    }
    await transaction(async (client) => {
      if (type === 'evaluations') {
        await client.query('DELETE FROM "criteria_scores"');
        await client.query('DELETE FROM "peer_feedback"');
        await client.query('DELETE FROM "evaluations"');
      } else if (type === 'users') {
        await client.query("DELETE FROM \"users\" WHERE \"id\" != 'superadmin'");
      } else if (type === 'employees') {
        await client.query('DELETE FROM "employees"');
      } else if (type === 'all') {
        await client.query('DELETE FROM "criteria_scores"');
        await client.query('DELETE FROM "peer_feedback"');
        await client.query('DELETE FROM "evaluations"');
        await client.query('DELETE FROM "employees"');
        await client.query("DELETE FROM \"users\" WHERE \"id\" != 'superadmin'");
        await client.query('DELETE FROM "app_settings"');
      }
    });
    await logAudit(req.user!.id, req.user!.name, 'reset_data', `Reset data: ${type}`);
    broadcast('data:reset', { type });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- EVALUATION ROUTES ---
app.get('/api/evaluations', authenticateToken, async (req, res) => {
  try {
    let result;
    if (req.user?.role === 'superadmin') {
      result = await pool.query('SELECT * FROM "evaluations" ORDER BY "createdAt" DESC');
    } else {
      result = await pool.query(
        'SELECT * FROM "evaluations" WHERE "createdBy" = $1 OR "appraiser" = $1 OR "supporter" = $1 OR "employeeId" = $1 ORDER BY "createdAt" DESC',
        [req.user!.id]
      );
    }
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/evaluations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const evalResult = await pool.query('SELECT * FROM "evaluations" WHERE "id" = $1', [id]);
    if (evalResult.rows.length === 0) return res.status(404).json({ error: 'Evaluation not found' });

    const ev = evalResult.rows[0];
    if (req.user!.role !== 'superadmin' && !isRelatedToEvaluation(req.user, ev)) {
      await logAudit(req.user!.id, req.user!.name, 'unauthorized_access', `Attempted to view evaluation #${id}`);
      return res.status(403).json({ error: 'Access denied. You can only view your own evaluations.' });
    }

    const [scores, peers] = await Promise.all([
      pool.query('SELECT * FROM "criteria_scores" WHERE "evaluationId" = $1', [id]),
      pool.query('SELECT * FROM "peer_feedback" WHERE "evaluationId" = $1', [id]),
    ]);

    res.json({ ...ev, criteriaScores: scores.rows, peerFeedbacks: peers.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/evaluations', authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    const createdBy = req.user!.id;
    const createdByName = req.user!.name;

    if (req.user!.role !== 'superadmin' && data.employeeId !== req.user!.id && data.appraiser !== req.user!.id && data.supporter !== req.user!.id) {
      await logAudit(req.user!.id, req.user!.name, 'unauthorized_access', `Attempted to create evaluation for employee ${data.employeeId}`);
      return res.status(403).json({ error: 'Access denied.' });
    }

    const evalResult = await transaction(async (client) => {
      const insertResult = await client.query(
        `INSERT INTO "evaluations" ("employeeId","employeeName","campus","department","position","appraiser","supporter","reviewDate","weightScheme","evaluationType","evalPeriod","totalSelf","totalSuper","overallScore","evaluatorComments","status","createdBy","createdByName")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING "id"`,
        [
          data.employeeId, data.employeeName, data.campus, data.department || '', data.position,
          data.appraiser, data.supporter || '', data.reviewDate, data.weightScheme,
          data.evaluationType || 'management', data.evalPeriod || '',
          data.totalSelf, data.totalSuper, data.overallScore,
          data.evaluatorComments || '', data.status || 'Draft', createdBy, createdByName
        ]
      );
      const evalId = insertResult.rows[0].id;

      for (const c of data.criteriaScores) {
        await client.query(
          'INSERT INTO "criteria_scores" ("evaluationId","criteriaId","selfScore","superScore","supporterScore","managementScore","aspScore") VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [evalId, c.criteriaId, c.selfScore, c.superScore, c.supporterScore || 0, c.managementScore || 0, c.aspScore || 0]
        );
      }

      if (data.peerFeedbacks) {
        for (const p of data.peerFeedbacks) {
          await client.query(
            'INSERT INTO "peer_feedback" ("evaluationId","peerName","feedback","score") VALUES ($1,$2,$3,$4)',
            [evalId, p.peerName, p.feedback, p.score]
          );
        }
      }

      return evalId;
    });

    await logAudit(createdBy, createdByName, 'create_evaluation', `Created evaluation for employee ID: ${data.employeeId} (${data.employeeName}) - Position: ${data.position || 'N/A'}`);
    broadcast('evaluations:updated', { action: 'create', evaluationId: evalResult });
    res.json({ success: true, id: evalResult });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/evaluations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const evResult = await pool.query('SELECT "createdBy","appraiser","supporter","employeeId" FROM "evaluations" WHERE "id" = $1', [id]);
    if (evResult.rows.length === 0) return res.status(404).json({ error: 'Evaluation not found' });

    const ev = evResult.rows[0];
    if (req.user!.role !== 'superadmin' && ev.createdBy !== req.user!.id && ev.appraiser !== req.user!.id && ev.supporter !== req.user!.id && ev.employeeId !== req.user!.id) {
      await logAudit(req.user!.id, req.user!.name, 'unauthorized_access', `Attempted to edit evaluation #${id}`);
      return res.status(403).json({ error: 'Not authorized to edit this evaluation' });
    }

    await transaction(async (client) => {
      await client.query(
        `UPDATE "evaluations" SET
          "employeeId"=$1,"employeeName"=$2,"campus"=$3,"department"=$4,"position"=$5,
          "appraiser"=$6,"supporter"=$7,"reviewDate"=$8,"weightScheme"=$9,"evaluationType"=$10,
          "evalPeriod"=$11,"totalSelf"=$12,"totalSuper"=$13,"overallScore"=$14,
          "evaluatorComments"=$15,"status"=$16
         WHERE "id"=$17`,
        [
          data.employeeId, data.employeeName, data.campus, data.department || '', data.position,
          data.appraiser, data.supporter || '', data.reviewDate, data.weightScheme,
          data.evaluationType || 'management', data.evalPeriod || '',
          data.totalSelf, data.totalSuper, data.overallScore,
          data.evaluatorComments || '', data.status || 'Draft', id
        ]
      );

      await client.query('DELETE FROM "criteria_scores" WHERE "evaluationId" = $1', [id]);
      for (const score of data.criteriaScores) {
        await client.query(
          'INSERT INTO "criteria_scores" ("evaluationId","criteriaId","selfScore","superScore","supporterScore","managementScore","aspScore") VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [id, score.criteriaId, score.selfScore || 0, score.superScore || 0, score.supporterScore || 0, score.managementScore || 0, score.aspScore || 0]
        );
      }

      await client.query('DELETE FROM "peer_feedback" WHERE "evaluationId" = $1', [id]);
      if (data.peerFeedbacks && data.peerFeedbacks.length > 0) {
        for (const peer of data.peerFeedbacks) {
          await client.query(
            'INSERT INTO "peer_feedback" ("evaluationId","peerName","feedback","score") VALUES ($1,$2,$3,$4)',
            [id, peer.peerName, peer.feedback, peer.score || 0]
          );
        }
      }
    });

    await logAudit(req.user!.id, req.user!.name, 'update_evaluation', `Updated evaluation #${id} for ${data.employeeName} (Status: ${data.status || 'Draft'}, Role: ${req.user!.role})`);
    broadcast('evaluations:updated', { action: 'update', evaluationId: Number(id) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/evaluations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const evResult = await pool.query('SELECT "createdBy" FROM "evaluations" WHERE "id" = $1', [id]);
    if (evResult.rows.length === 0) return res.status(404).json({ error: 'Evaluation not found' });

    if (req.user!.role !== 'superadmin' && evResult.rows[0].createdBy !== req.user!.id) {
      await logAudit(req.user!.id, req.user!.name, 'unauthorized_access', `Attempted to delete evaluation #${id}`);
      return res.status(403).json({ error: 'Not authorized to delete this evaluation' });
    }

    await transaction(async (client) => {
      await client.query('DELETE FROM "criteria_scores" WHERE "evaluationId" = $1', [id]);
      await client.query('DELETE FROM "peer_feedback" WHERE "evaluationId" = $1', [id]);
      await client.query('DELETE FROM "evaluations" WHERE "id" = $1', [id]);
    });

    await logAudit(req.user!.id, req.user!.name, 'delete_evaluation', `Deleted evaluation #${id}`);
    broadcast('evaluations:updated', { action: 'delete', evaluationId: Number(id) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- EMPLOYEE ROUTES ---
app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const { id } = req.query;
    if (id) {
      const empResult = await pool.query('SELECT * FROM "employees" WHERE "id" = $1', [id as string]);
      const emp = empResult.rows[0] || null;
      if (emp && req.user!.role !== 'superadmin' && req.user!.role !== 'admin' && emp.id !== req.user!.id) {
        await logAudit(req.user!.id, req.user!.name, 'unauthorized_access', `Attempted to view employee ${id}`);
        return res.status(403).json({ error: 'Access denied.' });
      }
      return res.json(emp);
    }

    let result;
    if (req.user!.role === 'superadmin') {
      result = await pool.query('SELECT * FROM "employees" ORDER BY "name" ASC');
    } else if (req.user!.role === 'admin') {
      result = await pool.query('SELECT * FROM "employees" WHERE "supervisorId" = $1 OR "supporterId" = $1 ORDER BY "name" ASC', [req.user!.id]);
    } else {
      const empResult = await pool.query('SELECT * FROM "employees" WHERE "id" = $1', [req.user!.id]);
      result = empResult.rows.length > 0 ? { rows: empResult.rows } : { rows: [] };
    }
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      `INSERT INTO "employees" ("id","name","khmerName","campus","department","position","category","supervisorId","supporterId","evalModel","evalPeriod")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT ("id") DO UPDATE SET "name"=EXCLUDED."name","khmerName"=EXCLUDED."khmerName","campus"=EXCLUDED."campus","department"=EXCLUDED."department","position"=EXCLUDED."position","category"=EXCLUDED."category","supervisorId"=EXCLUDED."supervisorId","supporterId"=EXCLUDED."supporterId","evalModel"=EXCLUDED."evalModel","evalPeriod"=EXCLUDED."evalPeriod"`,
      [d.id, d.name, d.khmerName || '', d.campus || '', d.department || '', d.position || '', d.category || '', d.supervisorId || '', d.supporterId || '', d.evalModel || '', d.evalPeriod || '']
    );
    broadcast('employees:updated', { action: 'upsert', employeeId: d.id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/employees/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM "employees" WHERE "id" = $1', [req.params.id]);
    broadcast('employees:updated', { action: 'delete', employeeId: req.params.id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUDIT LOGS ---
app.get('/api/audit-logs', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "audit_logs" ORDER BY "timestamp" DESC LIMIT 500');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit-logs', authenticateToken, async (req, res) => {
  try {
    const { userId, userName, action, details } = req.body;
    await pool.query(
      'INSERT INTO "audit_logs" ("userId", "userName", "action", "details") VALUES ($1, $2, $3, $4)',
      [userId || req.user!.id, userName || req.user!.name, action, details || '']
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API 404 Fallback
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Start Server
async function startServer() {
  await migrate();
  setupWebSocket();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

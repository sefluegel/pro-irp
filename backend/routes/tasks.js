// backend/routes/tasks.js (PostgreSQL version - ready for scale!)
const express = require("express");
const db = require("../db");

const router = express.Router();

// ============================================================================
// MIDDLEWARE - Require Authentication
// ============================================================================
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

router.use(requireAuth);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Format task for API response
function formatTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    notes: row.description, // Alias for compatibility
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    reminderAt: row.due_date, // Alias for compatibility
    completedAt: row.completed_at,
    clientId: row.client_id,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Auto-log task completion to communications
async function autoLogTaskCompletion(clientId, userId, taskTitle) {
  if (!clientId) return; // Only log for client tasks

  try {
    await db.query(
      `INSERT INTO communications (client_id, user_id, type, direction, subject, body)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        clientId,
        userId,
        'note',
        'outbound',
        'Task Completed',
        `Completed task: ${taskTitle}`
      ]
    );
  } catch (error) {
    // Non-blocking - don't fail if logging fails
    console.error('Auto-log task error:', error);
  }
}

// Auto-log task creation to communications
async function autoLogTaskCreation(clientId, userId, taskTitle) {
  if (!clientId) return; // Only log for client tasks

  try {
    await db.query(
      `INSERT INTO communications (client_id, user_id, type, direction, subject, body)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        clientId,
        userId,
        'note',
        'outbound',
        'Task Created',
        `Created task: ${taskTitle}`
      ]
    );
  } catch (error) {
    console.error('Auto-log task error:', error);
  }
}

// ============================================================================
// GLOBAL TASKS (not tied to specific client)
// ============================================================================

// GET /tasks - List global tasks (no client)
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, q } = req.query;

    // Build query
    let query = `
      SELECT * FROM tasks
      WHERE assigned_to = $1 AND client_id IS NULL
    `;
    let params = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (q) {
      paramCount++;
      const searchPattern = `%${q}%`;
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(searchPattern);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    const tasks = result.rows.map(formatTask);

    return res.json({ ok: true, data: tasks });

  } catch (error) {
    console.error('Get global tasks error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// POST /tasks - Create global task
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, notes, description, status, priority, dueDate } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({ ok: false, error: "Title is required" });
    }

    const result = await db.query(
      `INSERT INTO tasks (
        assigned_to, created_by, client_id,
        title, description, status, priority, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        userId,
        null, // global task - no client
        title.trim(),
        description || notes || '',
        status || 'pending',
        priority || 'normal',
        dueDate || null
      ]
    );

    return res.json({
      ok: true,
      data: formatTask(result.rows[0])
    });

  } catch (error) {
    console.error('Create global task error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// PATCH /tasks/:taskId - Update global task
router.patch("/:taskId", async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.taskId;
    const { title, notes, description, status, priority, dueDate } = req.body || {};

    // Get existing task
    const existing = await db.query(
      'SELECT * FROM tasks WHERE id = $1 AND assigned_to = $2 AND client_id IS NULL',
      [taskId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Task not found" });
    }

    const oldTask = existing.rows[0];
    const wasNotDone = oldTask.status !== 'completed' && oldTask.status !== 'done';
    const nowDone = status === 'completed' || status === 'done';

    // Update task
    const result = await db.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        due_date = COALESCE($5, due_date),
        completed_at = CASE WHEN $3 IN ('completed', 'done') THEN CURRENT_TIMESTAMP ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *`,
      [
        title,
        description || notes,
        status,
        priority,
        dueDate,
        taskId
      ]
    );

    return res.json({
      ok: true,
      data: formatTask(result.rows[0])
    });

  } catch (error) {
    console.error('Update global task error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// DELETE /tasks/:taskId - Delete global task
router.delete("/:taskId", async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.taskId;

    const result = await db.query(
      'DELETE FROM tasks WHERE id = $1 AND assigned_to = $2 AND client_id IS NULL',
      [taskId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Task not found" });
    }

    return res.json({ ok: true });

  } catch (error) {
    console.error('Delete global task error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// CLIENT-SCOPED TASKS
// ============================================================================

// GET /tasks/clients/:clientId - List tasks for specific client
router.get("/clients/:clientId", async (req, res) => {
  try {
    const userId = req.user.id;
    const clientId = req.params.clientId;
    const { status, q } = req.query;

    // Check client access
    const clientCheck = await db.query(
      'SELECT owner_id FROM clients WHERE id = $1',
      [clientId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Client not found" });
    }

    // Build query
    let query = `
      SELECT * FROM tasks
      WHERE client_id = $1
    `;
    let params = [clientId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (q) {
      paramCount++;
      const searchPattern = `%${q}%`;
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(searchPattern);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    const tasks = result.rows.map(formatTask);

    return res.json({ ok: true, data: tasks });

  } catch (error) {
    console.error('Get client tasks error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// POST /tasks/clients/:clientId - Create task for client
router.post("/clients/:clientId", async (req, res) => {
  try {
    const userId = req.user.id;
    const clientId = req.params.clientId;
    const { title, notes, description, status, priority, dueDate } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({ ok: false, error: "Title is required" });
    }

    // Check client exists
    const clientCheck = await db.query(
      'SELECT id FROM clients WHERE id = $1',
      [clientId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Client not found" });
    }

    const result = await db.query(
      `INSERT INTO tasks (
        assigned_to, created_by, client_id,
        title, description, status, priority, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        userId,
        clientId,
        title.trim(),
        description || notes || '',
        status || 'pending',
        priority || 'normal',
        dueDate || null
      ]
    );

    const task = result.rows[0];

    // Auto-log to communications
    await autoLogTaskCreation(clientId, userId, title);

    return res.json({
      ok: true,
      data: formatTask(task)
    });

  } catch (error) {
    console.error('Create client task error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// PATCH /tasks/clients/:clientId/:taskId - Update client task
router.patch("/clients/:clientId/:taskId", async (req, res) => {
  try {
    const userId = req.user.id;
    const clientId = req.params.clientId;
    const taskId = req.params.taskId;
    const { title, notes, description, status, priority, dueDate } = req.body || {};

    // Get existing task
    const existing = await db.query(
      'SELECT * FROM tasks WHERE id = $1 AND client_id = $2',
      [taskId, clientId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Task not found" });
    }

    const oldTask = existing.rows[0];
    const wasNotDone = oldTask.status !== 'completed' && oldTask.status !== 'done';
    const nowDone = status === 'completed' || status === 'done';

    // Update task
    const result = await db.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        due_date = COALESCE($5, due_date),
        completed_at = CASE WHEN $3 IN ('completed', 'done') THEN CURRENT_TIMESTAMP ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *`,
      [
        title,
        description || notes,
        status,
        priority,
        dueDate,
        taskId
      ]
    );

    const updatedTask = result.rows[0];

    // Auto-log completion
    if (wasNotDone && nowDone) {
      await autoLogTaskCompletion(clientId, userId, updatedTask.title);
    }

    return res.json({
      ok: true,
      data: formatTask(updatedTask)
    });

  } catch (error) {
    console.error('Update client task error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// DELETE /tasks/clients/:clientId/:taskId - Delete client task
router.delete("/clients/:clientId/:taskId", async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const taskId = req.params.taskId;

    const result = await db.query(
      'DELETE FROM tasks WHERE id = $1 AND client_id = $2',
      [taskId, clientId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Task not found" });
    }

    return res.json({ ok: true });

  } catch (error) {
    console.error('Delete client task error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// COMBINED VIEWS
// ============================================================================

// GET /tasks/all - All tasks (global + client) with client names
router.get("/all", async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, q } = req.query;

    // Build query
    let query = `
      SELECT
        t.*,
        c.first_name,
        c.last_name,
        CASE
          WHEN t.client_id IS NULL THEN NULL
          ELSE CONCAT(c.first_name, ' ', c.last_name)
        END as client_name
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.assigned_to = $1
    `;
    let params = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (q) {
      paramCount++;
      const searchPattern = `%${q}%`;
      query += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
      params.push(searchPattern);
    }

    query += ' ORDER BY t.updated_at DESC';

    const result = await db.query(query, params);

    const tasks = result.rows.map(row => ({
      ...formatTask(row),
      clientName: row.client_name,
      source: row.client_id ? 'client' : 'global'
    }));

    return res.json({ ok: true, data: tasks });

  } catch (error) {
    console.error('Get all tasks error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// GET /tasks/summary - Task counts by status
router.get("/summary", async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all task counts
    const allResult = await db.query(
      `SELECT
        status,
        COUNT(*) as count
      FROM tasks
      WHERE assigned_to = $1
      GROUP BY status`,
      [userId]
    );

    // Get global task counts
    const globalResult = await db.query(
      `SELECT
        status,
        COUNT(*) as count
      FROM tasks
      WHERE assigned_to = $1 AND client_id IS NULL
      GROUP BY status`,
      [userId]
    );

    // Format counts
    const allCounts = {
      total: 0,
      pending: 0,
      todo: 0,
      in_progress: 0,
      completed: 0,
      done: 0
    };

    const globalCounts = { ...allCounts };

    for (const row of allResult.rows) {
      allCounts[row.status] = parseInt(row.count);
      allCounts.total += parseInt(row.count);
    }

    for (const row of globalResult.rows) {
      globalCounts[row.status] = parseInt(row.count);
      globalCounts.total += parseInt(row.count);
    }

    return res.json({
      ok: true,
      data: {
        global: globalCounts,
        all: allCounts
      }
    });

  } catch (error) {
    console.error('Get task summary error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

module.exports = router;

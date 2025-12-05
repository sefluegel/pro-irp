// backend/services/automation-workflows.js
// Automation Workflows for Churn Prediction
// Handles auto-workflows, notifications, and task creation based on risk changes

const db = require('../db');

// ============================================================================
// WORKFLOW DEFINITIONS
// ============================================================================

const WORKFLOW_DEFINITIONS = {
  // Score-based workflows
  score_90_plus: {
    name: 'Severe Risk Alert',
    trigger: { type: 'score_threshold', min: 90 },
    actions: [
      { type: 'create_alert', alertType: 'emergency', responseHours: 24 },
      { type: 'create_task', priority: 'urgent', title: 'EMERGENCY: Call immediately', dueHours: 24 },
      { type: 'send_notification', method: 'push' }
    ]
  },

  score_80_89: {
    name: 'Critical Risk Alert',
    trigger: { type: 'score_threshold', min: 80, max: 89 },
    actions: [
      { type: 'create_alert', alertType: 'urgent', responseHours: 24 },
      { type: 'create_task', priority: 'high', title: 'URGENT: Same-day outreach required', dueHours: 8 },
      { type: 'send_notification', method: 'push' }
    ]
  },

  score_65_79: {
    name: 'High Risk Alert',
    trigger: { type: 'score_threshold', min: 65, max: 79 },
    actions: [
      { type: 'create_task', priority: 'high', title: 'HIGH: Outreach within 48 hours', dueHours: 48 }
    ]
  },

  score_50_64: {
    name: 'Elevated Risk Alert',
    trigger: { type: 'score_threshold', min: 50, max: 64 },
    actions: [
      { type: 'create_task', priority: 'normal', title: 'ELEVATED: Outreach within 7 days', dueHours: 168 }
    ]
  },

  // Spike-based workflows
  score_spike_25_plus: {
    name: 'Risk Spike Alert',
    trigger: { type: 'score_change', minChange: 25 },
    actions: [
      { type: 'create_alert', alertType: 'warning', responseHours: 48 },
      { type: 'create_task', priority: 'high', title: 'INVESTIGATE: Score spiked', dueHours: 24 }
    ]
  },

  score_spike_20_plus: {
    name: 'Risk Increase Alert',
    trigger: { type: 'score_change', minChange: 20, maxChange: 24 },
    actions: [
      { type: 'create_task', priority: 'normal', title: 'MONITOR: Score increased significantly', dueHours: 72 }
    ]
  },

  // Event-based workflows
  auto_100_trigger: {
    name: 'Auto-100 Critical Event',
    trigger: { type: 'auto_100' },
    actions: [
      { type: 'create_alert', alertType: 'emergency', responseHours: 24 },
      { type: 'create_task', priority: 'urgent', title: 'AUTO-CRITICAL: Immediate action required', dueHours: 24 },
      { type: 'send_notification', method: 'push' },
      { type: 'send_notification', method: 'email' }
    ]
  },

  sep_detected: {
    name: 'SEP Detected',
    trigger: { type: 'sep_status' },
    actions: [
      { type: 'create_alert', alertType: 'urgent', responseHours: 48 },
      { type: 'create_task', priority: 'high', title: 'SEP ACTIVE: Review options with client', dueHours: 72 }
    ]
  },

  // Blue Button event workflows
  er_visit_detected: {
    name: 'ER Visit Detected',
    trigger: { type: 'blue_button_event', eventType: 'er_visit' },
    actions: [
      { type: 'create_task', priority: 'high', title: 'ER visit detected - Call within 48 hours', dueHours: 48 }
    ]
  },

  rx_denial_detected: {
    name: 'Rx Denial Detected',
    trigger: { type: 'blue_button_event', eventType: 'rx_denial' },
    actions: [
      { type: 'create_alert', alertType: 'urgent', responseHours: 24 },
      { type: 'create_task', priority: 'high', title: 'Rx denial detected - Call within 24 hours', dueHours: 24 }
    ]
  },

  // New client checkpoints
  new_client_day_7: {
    name: 'Day 7 Welcome Call Due',
    trigger: { type: 'new_client_checkpoint', day: 7 },
    actions: [
      { type: 'create_task', priority: 'normal', title: 'New Client: Day 7 welcome call', dueHours: 24 }
    ]
  },

  new_client_day_30: {
    name: 'Day 30 Check-in Due',
    trigger: { type: 'new_client_checkpoint', day: 30 },
    actions: [
      { type: 'create_task', priority: 'normal', title: 'New Client: Day 30 check-in', dueHours: 48 }
    ]
  },

  new_client_day_60: {
    name: 'Day 60 Check-in Due',
    trigger: { type: 'new_client_checkpoint', day: 60 },
    actions: [
      { type: 'create_task', priority: 'normal', title: 'New Client: Day 60 check-in', dueHours: 48 }
    ]
  },

  new_client_day_90: {
    name: 'Day 90 Review Due',
    trigger: { type: 'new_client_checkpoint', day: 90 },
    actions: [
      { type: 'create_task', priority: 'high', title: 'New Client: Day 90 review', dueHours: 72 }
    ]
  },

  // Annual review
  annual_review_due: {
    name: 'Annual Review Due',
    trigger: { type: 'annual_review_due' },
    actions: [
      { type: 'create_task', priority: 'normal', title: 'Annual review due', dueHours: 168 }
    ]
  }
};

// ============================================================================
// AUTOMATION WORKFLOW SERVICE
// ============================================================================

class AutomationWorkflowService {
  constructor() {
    this.workflows = WORKFLOW_DEFINITIONS;
    this.initialized = false;
  }

  async initialize() {
    console.log('[automation] Initializing automation workflow service...');
    this.initialized = true;
  }

  // ============================================================================
  // WORKFLOW EXECUTION
  // ============================================================================

  /**
   * Process a score change and trigger appropriate workflows
   */
  async processScoreChange(clientId, newScore, previousScore, isAuto100 = false, auto100Reason = null) {
    const triggeredWorkflows = [];
    const scoreChange = newScore - previousScore;

    // Get client owner
    const client = await db.query(
      `SELECT owner_id, first_name, last_name FROM clients WHERE id = $1`,
      [clientId]
    );

    if (!client.rows[0]) {
      console.error(`[automation] Client not found: ${clientId}`);
      return triggeredWorkflows;
    }

    const { owner_id: userId, first_name, last_name } = client.rows[0];
    const clientName = `${first_name} ${last_name}`;

    // Check Auto-100 trigger first
    if (isAuto100) {
      const workflow = this.workflows.auto_100_trigger;
      await this.executeWorkflow(workflow, clientId, userId, {
        clientName,
        score: newScore,
        reason: auto100Reason
      });
      triggeredWorkflows.push(workflow.name);
      return triggeredWorkflows; // Auto-100 takes precedence
    }

    // Check score spike workflows
    if (scoreChange >= 25) {
      const workflow = this.workflows.score_spike_25_plus;
      await this.executeWorkflow(workflow, clientId, userId, {
        clientName,
        score: newScore,
        previousScore,
        change: scoreChange
      });
      triggeredWorkflows.push(workflow.name);
    } else if (scoreChange >= 20) {
      const workflow = this.workflows.score_spike_20_plus;
      await this.executeWorkflow(workflow, clientId, userId, {
        clientName,
        score: newScore,
        previousScore,
        change: scoreChange
      });
      triggeredWorkflows.push(workflow.name);
    }

    // Check score threshold workflows (only if score increased or is new)
    if (newScore >= 90 && previousScore < 90) {
      const workflow = this.workflows.score_90_plus;
      await this.executeWorkflow(workflow, clientId, userId, { clientName, score: newScore });
      triggeredWorkflows.push(workflow.name);
    } else if (newScore >= 80 && newScore < 90 && previousScore < 80) {
      const workflow = this.workflows.score_80_89;
      await this.executeWorkflow(workflow, clientId, userId, { clientName, score: newScore });
      triggeredWorkflows.push(workflow.name);
    } else if (newScore >= 65 && newScore < 80 && previousScore < 65) {
      const workflow = this.workflows.score_65_79;
      await this.executeWorkflow(workflow, clientId, userId, { clientName, score: newScore });
      triggeredWorkflows.push(workflow.name);
    } else if (newScore >= 50 && newScore < 65 && previousScore < 50) {
      const workflow = this.workflows.score_50_64;
      await this.executeWorkflow(workflow, clientId, userId, { clientName, score: newScore });
      triggeredWorkflows.push(workflow.name);
    }

    return triggeredWorkflows;
  }

  /**
   * Execute a workflow's actions
   */
  async executeWorkflow(workflow, clientId, userId, context) {
    console.log(`[automation] Executing workflow: ${workflow.name} for client ${clientId}`);

    for (const action of workflow.actions) {
      try {
        switch (action.type) {
          case 'create_alert':
            await this.createAlert(clientId, userId, action, context);
            break;

          case 'create_task':
            await this.createTask(clientId, userId, action, context);
            break;

          case 'send_notification':
            await this.sendNotification(userId, action, context);
            break;

          case 'send_text':
            await this.sendText(clientId, action, context);
            break;

          case 'send_email':
            await this.sendEmail(clientId, action, context);
            break;

          default:
            console.warn(`[automation] Unknown action type: ${action.type}`);
        }
      } catch (error) {
        console.error(`[automation] Action failed: ${action.type}`, error.message);
      }
    }
  }

  /**
   * Create an alert
   */
  async createAlert(clientId, userId, action, context) {
    const responseDue = new Date();
    responseDue.setHours(responseDue.getHours() + (action.responseHours || 24));

    let alertTitle = `${context.clientName}: Risk Score ${context.score}`;
    let alertMessage = `Client risk score is ${context.score}.`;

    if (context.reason) {
      alertTitle = `AUTO-CRITICAL: ${context.reason}`;
      alertMessage = context.reason;
    } else if (context.change) {
      alertTitle = `${context.clientName}: Score spiked +${context.change}`;
      alertMessage = `Risk score increased from ${context.previousScore} to ${context.score}.`;
    }

    await db.query(`
      INSERT INTO risk_alerts
      (client_id, user_id, alert_type, alert_code, alert_title, alert_message,
       response_window_hours, response_due_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      clientId,
      userId,
      action.alertType,
      `auto_${action.alertType}`,
      alertTitle,
      alertMessage,
      action.responseHours,
      responseDue
    ]);
  }

  /**
   * Create a task
   */
  async createTask(clientId, userId, action, context) {
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + (action.dueHours || 24));

    let title = action.title;
    let description = `Risk Score: ${context.score}`;

    if (context.reason) {
      description = `AUTO-100 TRIGGER: ${context.reason}\n\nRisk Score: ${context.score}`;
    } else if (context.change) {
      description = `Score changed from ${context.previousScore} to ${context.score} (+${context.change})`;
    }

    // Check for existing open task
    const existingTask = await db.query(`
      SELECT id FROM tasks
      WHERE client_id = $1 AND assigned_to = $2
      AND title LIKE $3 || '%'
      AND status IN ('pending', 'in_progress')
    `, [clientId, userId, title.split(':')[0]]);

    if (existingTask.rows.length > 0) {
      // Update existing task instead of creating duplicate
      await db.query(`
        UPDATE tasks
        SET description = $1, due_date = $2, priority = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [description, dueDate, action.priority, existingTask.rows[0].id]);
    } else {
      await db.query(`
        INSERT INTO tasks
        (assigned_to, client_id, title, description, due_date, priority, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $1)
      `, [userId, clientId, `${title} - ${context.clientName}`, description, dueDate, action.priority]);
    }
  }

  /**
   * Send push notification (placeholder for actual push implementation)
   */
  async sendNotification(userId, action, context) {
    // This would integrate with a push notification service
    console.log(`[automation] Would send ${action.method} notification to user ${userId}`);

    // Log the notification attempt
    await db.query(`
      INSERT INTO audit_logs (user_id, action, resource_type, details)
      VALUES ($1, 'NOTIFICATION_SENT', 'notification', $2)
    `, [userId, JSON.stringify({ method: action.method, context })]);
  }

  /**
   * Send text message to client
   */
  async sendText(clientId, action, context) {
    // Get client phone
    const client = await db.query(
      `SELECT phone FROM clients WHERE id = $1`,
      [clientId]
    );

    if (!client.rows[0]?.phone) {
      console.log(`[automation] No phone number for client ${clientId}`);
      return;
    }

    // This would integrate with Twilio
    console.log(`[automation] Would send text to ${client.rows[0].phone}`);
  }

  /**
   * Send email to client
   */
  async sendEmail(clientId, action, context) {
    // Get client email
    const client = await db.query(
      `SELECT email FROM clients WHERE id = $1`,
      [clientId]
    );

    if (!client.rows[0]?.email) {
      console.log(`[automation] No email for client ${clientId}`);
      return;
    }

    // This would integrate with SendGrid
    console.log(`[automation] Would send email to ${client.rows[0].email}`);
  }

  // ============================================================================
  // CHECKPOINT WORKFLOWS
  // ============================================================================

  /**
   * Process new client checkpoints
   */
  async processNewClientCheckpoints() {
    console.log('[automation] Processing new client checkpoints...');

    const checkpoints = [
      { day: 7, workflowKey: 'new_client_day_7' },
      { day: 30, workflowKey: 'new_client_day_30' },
      { day: 60, workflowKey: 'new_client_day_60' },
      { day: 90, workflowKey: 'new_client_day_90' }
    ];

    let tasksCreated = 0;

    for (const checkpoint of checkpoints) {
      // Find clients who hit this checkpoint today
      const clients = await db.query(`
        SELECT c.id, c.owner_id, c.first_name, c.last_name, c.risk_score
        FROM clients c
        WHERE c.status = 'active'
        AND c.effective_date IS NOT NULL
        AND c.effective_date = CURRENT_DATE - INTERVAL '${checkpoint.day} days'
        AND NOT EXISTS (
          SELECT 1 FROM client_contacts cc
          WHERE cc.client_id = c.id
          AND cc.is_day_${checkpoint.day === 7 ? '7_welcome' :
                          checkpoint.day === 30 ? '30_checkin' :
                          checkpoint.day === 60 ? '60_checkin' : '90_review'} = true
        )
        AND NOT EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.client_id = c.id
          AND t.title LIKE 'New Client: Day ${checkpoint.day}%'
          AND t.status IN ('pending', 'in_progress')
        )
      `);

      for (const client of clients.rows) {
        const workflow = this.workflows[checkpoint.workflowKey];
        await this.executeWorkflow(workflow, client.id, client.owner_id, {
          clientName: `${client.first_name} ${client.last_name}`,
          score: client.risk_score
        });
        tasksCreated++;
      }
    }

    console.log(`[automation] Created ${tasksCreated} new client checkpoint tasks`);
    return tasksCreated;
  }

  /**
   * Process annual review due dates
   */
  async processAnnualReviewsDue() {
    console.log('[automation] Processing annual reviews due...');

    // Find clients with annual review due (> 11 months since last)
    const clients = await db.query(`
      SELECT c.id, c.owner_id, c.first_name, c.last_name, c.risk_score,
             MAX(cc.contact_date) as last_annual
      FROM clients c
      LEFT JOIN client_contacts cc ON cc.client_id = c.id AND cc.is_annual_review = true
      WHERE c.status = 'active'
      GROUP BY c.id
      HAVING MAX(cc.contact_date) < NOW() - INTERVAL '11 months'
         OR MAX(cc.contact_date) IS NULL
    `);

    let tasksCreated = 0;

    for (const client of clients.rows) {
      // Check if task already exists
      const existingTask = await db.query(`
        SELECT id FROM tasks
        WHERE client_id = $1
        AND title LIKE 'Annual review%'
        AND status IN ('pending', 'in_progress')
      `, [client.id]);

      if (existingTask.rows.length === 0) {
        const workflow = this.workflows.annual_review_due;
        await this.executeWorkflow(workflow, client.id, client.owner_id, {
          clientName: `${client.first_name} ${client.last_name}`,
          score: client.risk_score
        });
        tasksCreated++;
      }
    }

    console.log(`[automation] Created ${tasksCreated} annual review tasks`);
    return tasksCreated;
  }

  // ============================================================================
  // BLUE BUTTON EVENT WORKFLOWS
  // ============================================================================

  /**
   * Process Blue Button detected events
   */
  async processBlueButtonEvent(clientId, eventType, eventData) {
    const client = await db.query(
      `SELECT owner_id, first_name, last_name, risk_score FROM clients WHERE id = $1`,
      [clientId]
    );

    if (!client.rows[0]) return;

    const { owner_id: userId, first_name, last_name, risk_score } = client.rows[0];
    const context = {
      clientName: `${first_name} ${last_name}`,
      score: risk_score,
      eventData
    };

    switch (eventType) {
      case 'er_visit':
        await this.executeWorkflow(this.workflows.er_visit_detected, clientId, userId, context);
        break;

      case 'rx_denial':
        await this.executeWorkflow(this.workflows.rx_denial_detected, clientId, userId, context);
        break;

      case 'specialty_drug':
        // High cost drug workflow
        await this.createTask(clientId, userId, {
          priority: 'normal',
          title: 'New specialty drug detected - Review coverage',
          dueHours: 72
        }, context);
        break;

      case 'lis_change':
        // LIS change is auto-100, handled by score change workflow
        break;

      default:
        console.log(`[automation] Unknown Blue Button event type: ${eventType}`);
    }
  }

  // ============================================================================
  // MORNING BRIEFING GENERATION
  // ============================================================================

  /**
   * Generate morning briefings for all agents
   */
  async generateAllMorningBriefings() {
    console.log('[automation] Generating morning briefings...');

    const agents = await db.query(`
      SELECT id, name FROM users WHERE role = 'agent' AND is_active = true
    `);

    const churnEngine = require('../jobs/churn-prediction-engine');

    let generated = 0;
    for (const agent of agents.rows) {
      try {
        await churnEngine.generateMorningBriefing(agent.id);
        generated++;
      } catch (error) {
        console.error(`[automation] Failed to generate briefing for ${agent.name}:`, error.message);
      }
    }

    console.log(`[automation] Generated ${generated} morning briefings`);
    return generated;
  }

  // ============================================================================
  // DAILY AUTOMATION RUN
  // ============================================================================

  /**
   * Run all daily automation tasks
   */
  async runDailyAutomation() {
    console.log('[automation] Starting daily automation run...');

    const results = {
      checkpointTasks: 0,
      annualReviewTasks: 0,
      briefings: 0,
      errors: []
    };

    try {
      results.checkpointTasks = await this.processNewClientCheckpoints();
    } catch (error) {
      results.errors.push({ task: 'checkpoints', error: error.message });
    }

    try {
      results.annualReviewTasks = await this.processAnnualReviewsDue();
    } catch (error) {
      results.errors.push({ task: 'annual_reviews', error: error.message });
    }

    try {
      results.briefings = await this.generateAllMorningBriefings();
    } catch (error) {
      results.errors.push({ task: 'briefings', error: error.message });
    }

    console.log('[automation] Daily automation complete:', results);
    return results;
  }
}

// Export singleton
module.exports = new AutomationWorkflowService();

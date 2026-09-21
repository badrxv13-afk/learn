/**
 * PIPELINE ORCHESTRATOR (محرك إدارة وجدولة الوكلاء الذكية)
 * 
 * الميزات:
 * - يدير دورة حياة المهام (Tasks) بحالات صارمة:
 *   PENDING | RUNNING | COMPLETED | FAILED | RETRY | BLOCKED | NEEDS_REVIEW
 * - حفظ checkpoint على القرص لاستكمال التشغيل بعد أي انقطاع
 * - التحقق من الاعتماديات (Dependencies) بين المراحل
 * - تشغيل المهام المستقلة بالتوازي
 * - ميثاق موحد للاستدعاء والاستجابة (AgentContract)
 */

const fs = require('fs');
const path = require('path');
const { AgentContract } = require('../utils/agent_contract');

class Orchestrator {
  constructor(stateFile = null) {
    this.stateFile = stateFile || path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/cache/orchestrator_state.json');
    this.agentRegistry = new Map();
    this.tasks = new Map();
    this.executionLog = [];
    this.loadCheckpoint();
  }

  registerAgent(name, handlerFn) {
    this.agentRegistry.set(name, handlerFn);
  }

  loadCheckpoint() {
    if (fs.existsSync(this.stateFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'));
        if (data.tasks) {
          for (const [id, t] of Object.entries(data.tasks)) {
            this.tasks.set(id, t);
          }
        }
        this.executionLog = data.executionLog || [];
      } catch (e) {
        console.warn('[Orchestrator] Warning: Could not parse state checkpoint, starting fresh.', e.message);
      }
    }
  }

  saveCheckpoint() {
    const dir = path.dirname(this.stateFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const state = {
      updated_at: new Date().toISOString(),
      tasks: Object.fromEntries(this.tasks),
      executionLog: this.executionLog
    };
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2), 'utf-8');
  }

  createTask({ id, agent, input = {}, dependencies = [], context = {} }) {
    if (this.tasks.has(id)) {
      const existing = this.tasks.get(id);
      if (existing.status === 'COMPLETED') {
        return existing; // منع تكرار المهام المكتملة
      }
    }

    const task = {
      id,
      agent,
      status: 'PENDING',
      dependencies,
      input,
      context,
      result: null,
      errors: [],
      retryCount: 0,
      maxRetries: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.tasks.set(id, task);
    this.saveCheckpoint();
    return task;
  }

  canRun(task) {
    if (task.status !== 'PENDING' && task.status !== 'RETRY') return false;
    for (const depId of task.dependencies) {
      const dep = this.tasks.get(depId);
      if (!dep || dep.status !== 'COMPLETED') {
        return false;
      }
    }
    return true;
  }

  async runTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    const agentHandler = this.agentRegistry.get(task.agent);
    if (!agentHandler) {
      task.status = 'BLOCKED';
      task.errors.push(`Unregistered agent: ${task.agent}`);
      this.saveCheckpoint();
      return task;
    }

    task.status = 'RUNNING';
    task.started_at = new Date().toISOString();
    this.saveCheckpoint();

    const request = AgentContract.createRequest({
      task_id: task.id,
      input: task.input,
      context: task.context,
      source_constraints: task.context.source_constraints || {}
    });

    const startTime = Date.now();
    try {
      console.log(`\n======================================================`);
      console.log(`[ORCHESTRATOR] تشغيل المهمة [${task.id}] عبر الوكيل [${task.agent}]`);
      console.log(`======================================================`);

      const response = await agentHandler(request);
      AgentContract.validateResponse(response);

      task.result = response;
      task.status = response.status;
      task.updated_at = new Date().toISOString();
      task.duration_ms = Date.now() - startTime;

      this.executionLog.push({
        task_id: task.id,
        agent: task.agent,
        status: task.status,
        records_count: response.recordsCount || 0,
        duration_ms: task.duration_ms,
        timestamp: new Date().toISOString()
      });

      console.log(`[ORCHESTRATOR] اكتملت المهمة [${task.id}] بنجاح (${task.status}) خلال ${task.duration_ms}ms.`);
    } catch (err) {
      console.error(`[ORCHESTRATOR] خطأ في تنفيذ المهمة [${task.id}]:`, err.message);
      task.errors.push(err.message);
      
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = 'RETRY';
        console.log(`[ORCHESTRATOR] إعادة جدولة المهمة [${task.id}] (محاولة ${task.retryCount} من ${task.maxRetries})...`);
      } else {
        task.status = 'FAILED';
      }
    } finally {
      this.saveCheckpoint();
    }

    return task;
  }

  async runAll() {
    let progressed = true;

    while (progressed) {
      progressed = false;
      const readyTasks = Array.from(this.tasks.values()).filter(t => this.canRun(t));

      if (readyTasks.length === 0) break;

      // تشغيل المهام الجاهزة بالتوازي
      await Promise.all(readyTasks.map(async (task) => {
        await this.runTask(task.id);
        progressed = true;
      }));
    }

    this.saveCheckpoint();
    return this.getSummary();
  }

  getSummary() {
    const summary = {
      total: this.tasks.size,
      completed: 0,
      failed: 0,
      needs_review: 0,
      pending: 0,
      blocked: 0
    };

    for (const t of this.tasks.values()) {
      if (t.status === 'COMPLETED') summary.completed++;
      else if (t.status === 'FAILED') summary.failed++;
      else if (t.status === 'NEEDS_REVIEW') summary.needs_review++;
      else if (t.status === 'BLOCKED') summary.blocked++;
      else summary.pending++;
    }

    return summary;
  }
}

module.exports = { Orchestrator };

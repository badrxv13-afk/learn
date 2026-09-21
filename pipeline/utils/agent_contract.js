/**
 * AGENT CONTRACT & RUNTIME WRAPPER
 * 
 * الميثاق القياسي الموحد لكافة الوكلاء البرمجيين:
 * كل وكيل يستقبل: { task_id, input, context, source_constraints, output_schema }
 * وكل وكيل يعيد: { task_id, agent, status, records, errors, warnings, provenance, metrics }
 */

class AgentContract {
  static createRequest({ task_id, input = {}, context = {}, source_constraints = {}, output_schema = null }) {
    if (!task_id) throw new Error('task_id is required in AgentRequest');
    return {
      task_id,
      input,
      context,
      source_constraints,
      output_schema,
      created_at: new Date().toISOString()
    };
  }

  static createResponse({
    task_id,
    agent,
    status = 'COMPLETED', // COMPLETED | FAILED | NEEDS_REVIEW | BLOCKED
    records = [],
    errors = [],
    warnings = [],
    provenance = {},
    metrics = {}
  }) {
    if (!task_id || !agent) throw new Error('task_id and agent are required in AgentResponse');
    return {
      task_id,
      agent,
      status,
      recordsCount: records.length,
      records,
      errors,
      warnings,
      provenance: {
        agent_version: '2.0.0',
        executed_at: new Date().toISOString(),
        ...provenance
      },
      metrics: {
        execution_time_ms: metrics.execution_time_ms || 0,
        ...metrics
      }
    };
  }

  static validateResponse(resp) {
    const requiredKeys = ['task_id', 'agent', 'status', 'records', 'errors', 'warnings', 'provenance', 'metrics'];
    for (const key of requiredKeys) {
      if (!(key in resp)) {
        throw new Error(`AgentResponse violation: missing key "${key}"`);
      }
    }
    return true;
  }
}

module.exports = { AgentContract };

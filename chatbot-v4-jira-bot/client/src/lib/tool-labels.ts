/**
 * Maps Jira tool names to human-readable labels for display in the chat UI.
 */
export const JIRA_TOOL_LABELS: Record<string, string> = {
  create_jira_ticket: 'Creating ticket',
  get_jira_ticket: 'Fetching ticket',
  search_jira_issues: 'Searching issues',
  update_jira_ticket: 'Updating ticket',
  get_open_issues_by_reporter: 'Loading your issues',
  attach_file_to_ticket: 'Attaching file',
};

/**
 * Returns a human-readable label for a given tool name,
 * falling back to the raw tool name if not found.
 */
export function getToolLabel(toolName: string): string {
  return JIRA_TOOL_LABELS[toolName] ?? toolName.replace(/_/g, ' ');
}

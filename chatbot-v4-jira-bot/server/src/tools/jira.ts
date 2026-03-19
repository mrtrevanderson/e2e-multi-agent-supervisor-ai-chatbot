/**
 * Jira tools for the DEB (Data Engineering Bot) chat assistant.
 * Ported from jira-bot and converted to Vercel AI SDK tool() format.
 */

import { tool, jsonSchema } from 'ai';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getJiraConfig() {
  return {
    baseUrl: process.env.JIRA_BASE_URL ?? 'https://innoceanusa.atlassian.net',
    email: process.env.JIRA_EMAIL ?? '',
    token: process.env.JIRA_API_TOKEN ?? '',
  };
}

function jiraAuthHeader(): string {
  const { email, token } = getJiraConfig();
  return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
}

async function jiraFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const { baseUrl } = getJiraConfig();
  const res = await fetch(`${baseUrl}/rest/api/3${path}`, {
    ...options,
    headers: {
      Authorization: jiraAuthHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira ${res.status}: ${text}`);
  }
  return res.json();
}

async function getAccountId(email: string): Promise<string | null> {
  try {
    const users = (await jiraFetch(
      `/user/search?query=${encodeURIComponent(email)}`,
    )) as unknown[];
    if (users.length > 0) {
      return (users[0] as Record<string, unknown>).accountId as string;
    }
    return null;
  } catch {
    return null;
  }
}

function extractAdfText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const node = content as Record<string, unknown>;
  if (node.type === 'text') return (node.text as string) || '';
  if (Array.isArray(node.content)) {
    return (node.content as unknown[]).map(extractAdfText).join(' ');
  }
  return '';
}

// ── Tool factory ─────────────────────────────────────────────────────────────

/**
 * Returns all Jira tools with the user's email baked in via closure.
 * @param userEmail - The current user's email (from session)
 */
export function createJiraTools(userEmail: string) {
  const { baseUrl } = getJiraConfig();

  return {
    create_jira_ticket: tool({
      description: 'Create a new Jira ticket in the DEHGMA project',
      parameters: jsonSchema<{
        summary: string;
        description: string;
        issue_type?: 'Task' | 'Bug' | 'Story' | 'Epic';
        priority?: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
        due_date?: string;
      }>({
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Ticket summary/title' },
          description: { type: 'string', description: 'Detailed description as an ADF JSON string' },
          issue_type: {
            type: 'string',
            enum: ['Task', 'Bug', 'Story', 'Epic'],
            default: 'Task',
            description: 'Type of issue',
          },
          priority: {
            type: 'string',
            enum: ['Highest', 'High', 'Medium', 'Low', 'Lowest'],
            description: 'Priority level',
          },
          due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format, or omit if no deadline' },
        },
        required: ['summary', 'description'],
      }),
      execute: async ({ summary, description, issue_type, priority, due_date }) => {
        try {
          const accountId = await getAccountId(userEmail);

          // Parse ADF description; append "Submitted by" footer
          let adfDescription: unknown;
          try {
            const parsed =
              typeof description === 'string'
                ? JSON.parse(description)
                : description;
            (parsed as { content: unknown[] }).content.push({
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `Submitted by: ${userEmail}`,
                  marks: [{ type: 'em' }],
                },
              ],
            });
            adfDescription = parsed;
          } catch {
            adfDescription = {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: String(description) }],
                },
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: `Submitted by: ${userEmail}`,
                      marks: [{ type: 'em' }],
                    },
                  ],
                },
              ],
            };
          }

          const body = {
            fields: {
              project: { key: 'DEHGMA' },
              summary: `DEB TEST: ${summary}`,
              description: adfDescription,
              issuetype: { name: issue_type ?? 'Task' },
              ...(priority ? { priority: { name: priority } } : {}),
              ...(due_date ? { duedate: due_date } : {}),
              ...(accountId ? { reporter: { id: accountId } } : {}),
              customfield_12814: { value: 'Jira Assistant' },
            },
          };

          const result = (await jiraFetch('/issue', {
            method: 'POST',
            body: JSON.stringify(body),
          })) as Record<string, unknown>;

          return { key: result.key, url: `${baseUrl}/browse/${result.key}` };
        } catch (err) {
          return { error: String(err) };
        }
      },
    }),

    get_jira_ticket: tool({
      description: 'Get details of a specific Jira ticket by key (e.g. DEHGMA-123)',
      parameters: jsonSchema<{ ticket_key: string }>({
        type: 'object',
        properties: {
          ticket_key: { type: 'string', description: 'The Jira ticket key, e.g. DEHGMA-123' },
        },
        required: ['ticket_key'],
      }),
      execute: async ({ ticket_key }) => {
        try {
          const result = (await jiraFetch(
            `/issue/${ticket_key}`,
          )) as Record<string, unknown>;
          const fields = result.fields as Record<string, unknown>;
          return {
            key: result.key,
            summary: fields.summary,
            status: (fields.status as Record<string, unknown>)?.name,
            assignee:
              (fields.assignee as Record<string, unknown>)?.displayName ??
              'Unassigned',
            priority: (fields.priority as Record<string, unknown>)?.name,
            description: extractAdfText(fields.description),
            url: `${baseUrl}/browse/${ticket_key}`,
          };
        } catch (err) {
          return { error: String(err) };
        }
      },
    }),

    search_jira_issues: tool({
      description: 'Search for Jira issues using text search in the DEHGMA project',
      parameters: jsonSchema<{ query: string; max_results?: number }>({
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text to search for' },
          max_results: { type: 'number', default: 10, description: 'Maximum results to return (default 10)' },
        },
        required: ['query'],
      }),
      execute: async ({ query, max_results }) => {
        try {
          const jql = encodeURIComponent(
            `project = DEHGMA AND text ~ "${query}" ORDER BY updated DESC`,
          );
          const result = (await jiraFetch(
            `/search/jql?jql=${jql}&maxResults=${max_results}&fields=status,priority,summary`,
          )) as Record<string, unknown>;
          const issues = (result.issues as unknown[]).map((i: unknown) => {
            const issue = i as Record<string, unknown>;
            const fields = issue.fields as Record<string, unknown>;
            return {
              key: issue.key,
              summary: fields.summary,
              status: (fields.status as Record<string, unknown>)?.name,
              priority: (fields.priority as Record<string, unknown>)?.name,
              url: `${baseUrl}/browse/${issue.key}`,
            };
          });
          return { total: result.total, issues };
        } catch (err) {
          return { error: String(err) };
        }
      },
    }),

    update_jira_ticket: tool({
      description:
        'Add a comment to an existing Jira ticket. Use this whenever the user wants to update, comment on, or add information to a ticket.',
      parameters: jsonSchema<{ ticket_key: string; comment: string }>({
        type: 'object',
        properties: {
          ticket_key: { type: 'string', description: 'The Jira ticket key e.g. DEHGMA-123' },
          comment: { type: 'string', description: 'The comment text to add to the ticket' },
        },
        required: ['ticket_key', 'comment'],
      }),
      execute: async ({ ticket_key, comment }) => {
        try {
          await jiraFetch(`/issue/${ticket_key}/comment`, {
            method: 'POST',
            body: JSON.stringify({
              body: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: comment }],
                  },
                ],
              },
            }),
          });
          return {
            success: true,
            key: ticket_key,
            url: `${baseUrl}/browse/${ticket_key}`,
          };
        } catch (err) {
          return { error: String(err) };
        }
      },
    }),

    get_open_issues_by_reporter: tool({
      description: 'Get open Jira issues reported by a specific user email',
      parameters: jsonSchema<{ email: string; max_results?: number }>({
        type: 'object',
        properties: {
          email: { type: 'string', description: 'The reporter email address' },
          max_results: { type: 'number', default: 20, description: 'Maximum results to return (default 20)' },
        },
        required: ['email'],
      }),
      execute: async ({ email, max_results }) => {
        try {
          const users = (await jiraFetch(
            `/user/search?query=${encodeURIComponent(email)}`,
          )) as unknown[];
          if (!users.length) {
            return { error: `No Jira user found for email: ${email}` };
          }
          const accountId = (users[0] as Record<string, unknown>)
            .accountId as string;
          const jql = encodeURIComponent(
            `reporter = "${accountId}" AND project = DEHGMA AND resolution = "Unresolved" ORDER BY updated DESC`,
          );
          const result = (await jiraFetch(
            `/search/jql?jql=${jql}&maxResults=${max_results}&fields=statusCategory,priority,summary,description,status`,
          )) as Record<string, unknown>;
          const issues = (result.issues as unknown[]).map((i: unknown) => {
            const issue = i as Record<string, unknown>;
            const fields = issue.fields as Record<string, unknown>;
            return {
              key: issue.key,
              summary: fields.summary,
              status: (fields.status as Record<string, unknown>)?.name,
              priority: (fields.priority as Record<string, unknown>)?.name,
              url: `${baseUrl}/browse/${issue.key}`,
            };
          });
          return { total: result.total, issues };
        } catch (err) {
          return { error: String(err) };
        }
      },
    }),

    attach_file_to_ticket: tool({
      description:
        'Attach an uploaded file to a Jira ticket. Only call this if the user has uploaded a file in this message.',
      parameters: jsonSchema<{ ticket_key: string; filename: string }>({
        type: 'object',
        properties: {
          ticket_key: { type: 'string', description: 'The Jira ticket key e.g. DEHGMA-123' },
          filename: { type: 'string', description: 'The name of the uploaded file to attach' },
        },
        required: ['ticket_key', 'filename'],
      }),
      execute: async ({ ticket_key, filename }) => {
        // File attachments require a separate multipart upload.
        // If no file is in the current session, instruct the user to re-upload.
        return {
          success: false,
          message:
            `To attach "${filename}" to ${ticket_key}, please re-upload the file in your next message ` +
            `and say "attach this to ${ticket_key}" — files can only be attached when uploaded in the same message.`,
          url: `${baseUrl}/browse/${ticket_key}`,
        };
      },
    }),
  };
}

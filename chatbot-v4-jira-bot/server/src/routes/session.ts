import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { authMiddleware } from '../middleware/auth';
import type { ClientSession } from '@chat-template/auth';

export const sessionRouter: RouterType = Router();

// Apply auth middleware
sessionRouter.use(authMiddleware);

/**
 * GET /api/session - Get current user session
 *
 * In production (Databricks Apps), the platform provides OAuth headers and
 * the session is populated automatically.
 *
 * In local development with DATABRICKS_TOKEN + JIRA_EMAIL set, the auth
 * package falls back to JIRA_EMAIL as the user identity (no CLI required).
 */
sessionRouter.get('/', async (req: Request, res: Response) => {
  console.log('GET /api/session', req.session);
  const session = req.session;

  if (!session?.user) {
    return res.json({ user: null } as ClientSession);
  }

  // Return minimal user data for client
  const clientSession: ClientSession = {
    user: {
      email: session.user.email,
      name: session.user.name ?? session.user.preferredUsername,
      preferredUsername:
        session.user.preferredUsername ?? session.user.email.split('@')[0],
    },
  };

  res.json(clientSession);
});

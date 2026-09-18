import { handleSession } from '../../lib/panel-api.js';

/** Vercel function: sign-in state (GET), sign in (POST) and sign out (DELETE) for the content panel. */
export function GET(request) {
  return handleSession(request, process.env);
}

export function POST(request) {
  return handleSession(request, process.env);
}

export function DELETE(request) {
  return handleSession(request, process.env);
}

/**
 * POST /live-sessions/generate-token
 *
 * Re-exports the token API for mobile app compatibility.
 * Mobile expects: https://www.soundbridge.live/live-sessions/generate-token (no /api prefix)
 */
export { POST, OPTIONS } from '@/app/api/live-sessions/generate-token/route';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { NextRequest } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '../admin-auth';

/**
 * Every admin API route in this app gates on requireAdmin(). Rather than
 * testing each route's two-line wrapper (identical everywhere, and this
 * repo's plain node:test runner has no HTTP harness to actually call a
 * Next.js route handler end-to-end), this tests the shared gate itself:
 * the exact logic now protecting every route fixed in this pass.
 */

type FakeProfile = { role: string | null; is_admin: boolean } | null;
type FakeUserRole = { role: string } | null;

function makeFakeServiceClient(profile: FakeProfile, userRole: FakeUserRole) {
  return () =>
    ({
      from(table: string) {
        if (table === 'profiles') {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            maybeSingle: async () => ({ data: profile, error: null }),
          };
        }
        if (table === 'user_roles') {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            maybeSingle: async () => ({ data: userRole, error: null }),
          };
        }
        throw new Error(`unexpected table in test: ${table}`);
      },
    }) as any;
}

function fakeRequest(): NextRequest {
  return {} as NextRequest;
}

test('denies with 401 when there is no authenticated user', async () => {
  const getSupabaseRouteClientFn = async () => ({ user: null, error: null, supabase: null as any, mode: 'cookie' as const });
  const result = await requireAdmin(fakeRequest(), undefined, {
    getSupabaseRouteClientFn: getSupabaseRouteClientFn as any,
    createServiceClientFn: makeFakeServiceClient(null, null),
  });
  assert.equal(result.ok, false);
  assert.equal(isAdminAccessDenied(result), true);
  if (isAdminAccessDenied(result)) {
    assert.equal(result.status, 401);
  }
});

test('denies with 401 when auth lookup itself errors', async () => {
  const getSupabaseRouteClientFn = async () => ({
    user: null,
    error: new Error('bad token'),
    supabase: null as any,
    mode: 'cookie' as const,
  });
  const result = await requireAdmin(fakeRequest(), undefined, {
    getSupabaseRouteClientFn: getSupabaseRouteClientFn as any,
    createServiceClientFn: makeFakeServiceClient(null, null),
  });
  assert.equal(result.ok, false);
  if (isAdminAccessDenied(result)) assert.equal(result.status, 401);
});

test('denies with 403 for a logged-in user with no admin role anywhere', async () => {
  const getSupabaseRouteClientFn = async () => ({
    user: { id: 'user-1' } as any,
    error: null,
    supabase: null as any,
    mode: 'cookie' as const,
  });
  const result = await requireAdmin(fakeRequest(), undefined, {
    getSupabaseRouteClientFn: getSupabaseRouteClientFn as any,
    createServiceClientFn: makeFakeServiceClient({ role: 'creator', is_admin: false }, null),
  });
  assert.equal(result.ok, false);
  if (isAdminAccessDenied(result)) assert.equal(result.status, 403);
});

test('allows when profiles.is_admin is true, regardless of role', async () => {
  const getSupabaseRouteClientFn = async () => ({
    user: { id: 'user-2' } as any,
    error: null,
    supabase: null as any,
    mode: 'cookie' as const,
  });
  const result = await requireAdmin(fakeRequest(), undefined, {
    getSupabaseRouteClientFn: getSupabaseRouteClientFn as any,
    createServiceClientFn: makeFakeServiceClient({ role: 'listener', is_admin: true }, null),
  });
  assert.equal(result.ok, true);
});

test('allows when profiles.role is in the allowed admin roles', async () => {
  const getSupabaseRouteClientFn = async () => ({
    user: { id: 'user-3' } as any,
    error: null,
    supabase: null as any,
    mode: 'cookie' as const,
  });
  const result = await requireAdmin(fakeRequest(), undefined, {
    getSupabaseRouteClientFn: getSupabaseRouteClientFn as any,
    createServiceClientFn: makeFakeServiceClient({ role: 'admin', is_admin: false }, null),
  });
  assert.equal(result.ok, true);
});

test('allows via the user_roles fallback when profiles has neither flag', async () => {
  const getSupabaseRouteClientFn = async () => ({
    user: { id: 'user-4' } as any,
    error: null,
    supabase: null as any,
    mode: 'cookie' as const,
  });
  const result = await requireAdmin(fakeRequest(), undefined, {
    getSupabaseRouteClientFn: getSupabaseRouteClientFn as any,
    createServiceClientFn: makeFakeServiceClient({ role: 'listener', is_admin: false }, { role: 'moderator' }),
  });
  assert.equal(result.ok, true);
});

test('denies with 403 when the matched role is outside the caller-specified allowedRoles', async () => {
  const getSupabaseRouteClientFn = async () => ({
    user: { id: 'user-5' } as any,
    error: null,
    supabase: null as any,
    mode: 'cookie' as const,
  });
  // moderator is a real admin-tier role, but this caller only allows super_admin.
  const result = await requireAdmin(fakeRequest(), ['super_admin'], {
    getSupabaseRouteClientFn: getSupabaseRouteClientFn as any,
    createServiceClientFn: makeFakeServiceClient({ role: 'moderator', is_admin: false }, null),
  });
  assert.equal(result.ok, false);
  if (isAdminAccessDenied(result)) assert.equal(result.status, 403);
});

test('a successful result exposes the service client for the caller to use', async () => {
  const getSupabaseRouteClientFn = async () => ({
    user: { id: 'user-6' } as any,
    error: null,
    supabase: null as any,
    mode: 'cookie' as const,
  });
  const fakeClientFn = makeFakeServiceClient({ role: 'super_admin', is_admin: false }, null);
  const result = await requireAdmin(fakeRequest(), undefined, {
    getSupabaseRouteClientFn: getSupabaseRouteClientFn as any,
    createServiceClientFn: fakeClientFn,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(typeof result.serviceClient.from, 'function');
    assert.equal(result.userId, 'user-6');
  }
});

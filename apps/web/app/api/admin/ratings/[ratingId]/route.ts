import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';

export async function DELETE(_request: NextRequest, { params }: { params: { ratingId: string } }) {
  try {
    const adminCheck = await requireAdmin(_request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const ratingId = params.ratingId;
    const serviceClient = adminCheck.serviceClient;

    const { error } = await serviceClient
      .from('creator_ratings')
      .delete()
      .eq('id', ratingId);

    if (error) {
      console.error('Error deleting rating:', error);
      return NextResponse.json({ error: 'Failed to delete rating' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin rating delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

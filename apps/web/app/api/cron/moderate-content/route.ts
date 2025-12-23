// Vercel Cron Job: Content Moderation
// Runs every 5 minutes to process pending moderation tracks
// Endpoint: /api/cron/moderate-content

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processPendingModerationBatch } from '../../../../src/lib/moderation-orchestrator';

/**
 * Vercel Cron Job Handler
 * Configured in vercel.json to run every 5 minutes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron job access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Content moderation cron job started');

    // Create Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get admin settings for moderation configuration
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('id', 1)
      .single();

    // If settings don't exist, create default settings
    if (settingsError || !settings) {
      console.warn('⚠️  Admin settings not found, creating defaults...');
      const { data: newSettings } = await supabase
        .from('admin_settings')
        .insert({
          id: 1,
          auto_moderation_enabled: true,
          moderation_strictness: 'medium',
          whisper_model: 'base',
          transcription_enabled: true
        })
        .select()
        .single();
      
      if (!newSettings) {
        console.error('❌ Failed to create admin settings');
        return NextResponse.json({
          success: false,
          error: 'Admin settings not configured'
        }, { status: 500 });
      }
      
      // Use newly created settings
      const defaultSettings = { ...newSettings, auto_moderation_enabled: true };
      console.log('✅ Created default admin settings with auto-moderation enabled');
      
      // Continue with default settings
      const batchSize = parseInt(process.env.MODERATION_BATCH_SIZE || '10');
      const result = await processPendingModerationBatch(
        supabase,
        batchSize,
        {
          whisperModel: 'base',
          sampleOnly: true,
          maxDuration: 120,
          strictness: 'medium'
        }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Content moderation job completed (using default settings)',
        result
      });
    }

    // Check if auto-moderation is enabled
    if (!settings.auto_moderation_enabled) {
      console.log('⏸️  Auto-moderation is disabled in admin settings');
      return NextResponse.json({
        success: true,
        message: 'Auto-moderation is disabled',
        processed: 0
      });
    }

    // Determine batch size and settings
    const batchSize = parseInt(process.env.MODERATION_BATCH_SIZE || '10');
    const whisperModel = settings.whisper_model || 'base';
    const strictness = settings.moderation_strictness || 'medium';

    console.log(`Processing batch of ${batchSize} tracks (model: ${whisperModel}, strictness: ${strictness})`);

    // Process pending moderation tracks
    const result = await processPendingModerationBatch(
      supabase,
      batchSize,
      {
        whisperModel: whisperModel as any,
        sampleOnly: settings.transcription_enabled !== false,
        maxDuration: 120, // 2 minutes for efficiency
        strictness: strictness as any
      }
    );

    console.log('✅ Content moderation cron job completed');
    console.log(`   - Processed: ${result.processed}`);
    console.log(`   - Flagged: ${result.flagged}`);
    console.log(`   - Errors: ${result.errors}`);

    return NextResponse.json({
      success: true,
      message: 'Content moderation job completed',
      result
    });

  } catch (error) {
    console.error('❌ Content moderation cron job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export config for Vercel Cron
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes maximum execution time

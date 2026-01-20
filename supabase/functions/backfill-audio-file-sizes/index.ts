import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type TrackRow = {
  id: string
  file_url: string | null
  audio_metadata: Record<string, unknown> | null
}

const STORAGE_PREFIX = '/storage/v1/object/public/audio-tracks/'
const BUCKET_NAME = 'audio-tracks'

function extractStoragePath(fileUrl: string | null): string | null {
  if (!fileUrl) return null
  try {
    const url = new URL(fileUrl)
    const idx = url.pathname.indexOf(STORAGE_PREFIX)
    if (idx >= 0) {
      return url.pathname.slice(idx + STORAGE_PREFIX.length)
    }
  } catch {
    // fall through to string parsing
  }

  if (fileUrl.startsWith(`${BUCKET_NAME}/`)) {
    return fileUrl.slice(`${BUCKET_NAME}/`.length)
  }

  const markerIndex = fileUrl.indexOf(`${BUCKET_NAME}/`)
  if (markerIndex >= 0) {
    return fileUrl.slice(markerIndex + `${BUCKET_NAME}/`.length)
  }

  return null
}

function splitPath(path: string): { folder: string; fileName: string } {
  const lastSlash = path.lastIndexOf('/')
  if (lastSlash === -1) {
    return { folder: '', fileName: path }
  }
  return {
    folder: path.slice(0, lastSlash),
    fileName: path.slice(lastSlash + 1),
  }
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 500)
    const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0)
    const dryRun = url.searchParams.get('dry_run') === 'true'

    const { data: tracks, error } = await supabase
      .from('audio_tracks')
      .select('id,file_url,audio_metadata')
      .or('file_size.is.null,file_size.eq.0')
      .range(offset, offset + limit - 1)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const results: Array<{ id: string; size: number | null; source: string; path?: string | null }> = []
    let updated = 0
    let skipped = 0

    for (const track of (tracks ?? []) as TrackRow[]) {
      let size: number | null = null
      let source = 'unknown'

      const metadataSize = track.audio_metadata?.['size']
      if (typeof metadataSize === 'number' && metadataSize > 0) {
        size = metadataSize
        source = 'audio_metadata'
      } else {
        const storagePath = extractStoragePath(track.file_url)
        if (storagePath) {
          const { folder, fileName } = splitPath(storagePath)
          const { data: objects } = await supabase.storage
            .from(BUCKET_NAME)
            .list(folder, { limit: 1, search: fileName })

          const matched = objects?.find((obj) => obj.name === fileName)
          const listSize = matched?.metadata?.size
          if (typeof listSize === 'number' && listSize > 0) {
            size = listSize
            source = 'storage_list'
          }
        }
      }

      if (size && !dryRun) {
        const { error: updateError } = await supabase
          .from('audio_tracks')
          .update({ file_size: size })
          .eq('id', track.id)

        if (!updateError) {
          updated += 1
        }
      } else if (!size) {
        skipped += 1
      }

      results.push({ id: track.id, size, source })
    }

    return new Response(
      JSON.stringify({
        dry_run: dryRun,
        total: tracks?.length ?? 0,
        updated: dryRun ? 0 : updated,
        skipped,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

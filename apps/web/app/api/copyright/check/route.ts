import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env not configured');
  return createClient(url, key);
}

// Validation schema for copyright check
const CopyrightCheckSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  album: z.string().optional(),
  recordLabel: z.string().optional(),
  userId: z.string().uuid('Valid user ID is required')
});

// Major artists list (expand this regularly)
const majorArtists = [
  // Global Superstars
  'beyonce', 'drake', 'taylor swift', 'ed sheeran', 'ariana grande',
  'justin bieber', 'billie eilish', 'the weeknd', 'bad bunny', 'dua lipa',
  'harry styles', 'lizzo', 'kendrick lamar', 'adele', 'bruno mars',
  
  // African Artists (Nigeria, Ghana, South Africa, etc.)
  'davido', 'wizkid', 'burna boy', 'tiwa savage', 'asake', 'rema',
  'yemi alade', 'patoranking', 'sarkodie', 'stonebwoy', 'nasty c',
  'cassper nyovest', 'diamond platnumz', 'sauti sol',
  
  // UK Artists
  'stormzy', 'dave', 'central cee', 'j hus', 'skepta', 'giggs',
  
  // Add more as they become popular...
];

const majorLabels = [
  'universal', 'sony', 'warner', 'emi', 'columbia',
  'atlantic', 'def jam', 'interscope', 'rca', 'capitol',
  'republic', 'epic', 'arista', 'geffen', 'island',
  'virgin', 'elektra', 'mca', 'polydor', 'decca'
];

const suspiciousKeywords = [
  'official audio', 'official video', 'vevo', 'lyric video',
  'official music video', 'official lyric', 'official track',
  'official release', 'official single', 'official album'
];

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    
    // Validate request data
    const validationResult = CopyrightCheckSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: (validationResult.error as any).issues || (validationResult.error as any).errors
      }, { status: 400 });
    }
    
    const { title, artist, album, recordLabel, userId } = validationResult.data;
    
    const titleLower = title.toLowerCase();
    const artistLower = artist.toLowerCase();
    const albumLower = album?.toLowerCase() || '';
    const labelLower = recordLabel?.toLowerCase() || '';
    
    // Check 1: Major artist detection
    const majorArtistMatch = majorArtists.find(artistName => 
      artistLower.includes(artistName) || 
      titleLower.includes(artistName) ||
      albumLower.includes(artistName)
    );
    
    if (majorArtistMatch) {
      return NextResponse.json({
        success: true,
        allowed: false,
        risk: 'high',
        reason: `Major artist "${majorArtistMatch}" detected. Please verify your identity and rights to this content.`,
        requiresReview: true,
        detectionType: 'major_artist',
        matchedArtist: majorArtistMatch
      });
    }
    
    // Check 2: Major label detection
    const majorLabelMatch = majorLabels.find(labelName => 
      labelLower.includes(labelName)
    );
    
    if (majorLabelMatch) {
      return NextResponse.json({
        success: true,
        allowed: false,
        risk: 'high',
        reason: `Major record label "${majorLabelMatch}" detected. Please provide proof of rights.`,
        requiresReview: true,
        detectionType: 'major_label',
        matchedLabel: majorLabelMatch
      });
    }
    
    // Check 3: Suspicious keywords
    const suspiciousKeywordMatch = suspiciousKeywords.find(keyword => 
      titleLower.includes(keyword)
    );
    
    if (suspiciousKeywordMatch) {
      return NextResponse.json({
        success: true,
        allowed: true,
        risk: 'medium',
        reason: `Suspicious keyword "${suspiciousKeywordMatch}" detected. Content will be reviewed.`,
        requiresReview: true,
        detectionType: 'suspicious_keyword',
        matchedKeyword: suspiciousKeywordMatch
      });
    }
    
    // Check 4: User history
    const { data: user } = await supabase
      .from('profiles')
      .select('copyright_strikes, total_uploads, role')
      .eq('id', userId)
      .single();
    
    if (user) {
      // Check if user has previous copyright strikes
      if (user.copyright_strikes >= 2) {
        return NextResponse.json({
          success: true,
          allowed: false,
          risk: 'high',
          reason: 'User has previous copyright strikes. All uploads require manual review.',
          requiresReview: true,
          detectionType: 'user_history',
          strikeCount: user.copyright_strikes
        });
      }
      
      // Check if user is new (less than 3 uploads)
      if (user.total_uploads < 3) {
        return NextResponse.json({
          success: true,
          allowed: true,
          risk: 'medium',
          reason: 'New user - flagged for spot check',
          requiresReview: true,
          detectionType: 'new_user',
          uploadCount: user.total_uploads
        });
      }
    }
    
    // Check 5: Check against blacklist
    const { data: blacklistMatch } = await supabase
      .from('copyright_blacklist')
      .select('track_title, artist_name, rights_holder')
      .or(`track_title.ilike.%${title}%,artist_name.ilike.%${artist}%`)
      .limit(1)
      .single();
    
    if (blacklistMatch) {
      return NextResponse.json({
        success: true,
        allowed: false,
        risk: 'high',
        reason: 'Content matches known copyrighted material in our database.',
        requiresReview: true,
        detectionType: 'blacklist_match',
        matchedContent: blacklistMatch
      });
    }
    
    // Check 6: Check whitelist for known safe content
    const { data: whitelistMatch } = await supabase
      .from('copyright_whitelist')
      .select('track_title, artist_name, license_type')
      .or(`track_title.ilike.%${title}%,artist_name.ilike.%${artist}%`)
      .limit(1)
      .single();
    
    if (whitelistMatch) {
      return NextResponse.json({
        success: true,
        allowed: true,
        risk: 'low',
        reason: 'Content verified as safe in our whitelist.',
        requiresReview: false,
        detectionType: 'whitelist_match',
        matchedContent: whitelistMatch
      });
    }
    
    // Passed all checks
    return NextResponse.json({
      success: true,
      allowed: true,
      risk: 'low',
      reason: 'No copyright concerns detected.',
      requiresReview: false,
      detectionType: 'clean'
    });
    
  } catch (error) {
    console.error('Copyright check API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
import { supabase } from './supabase';

/**
 * Debug helper to check what data exists in the database
 */
export class DatabaseDebugger {
  
  /**
   * Check all tables and their data counts
   */
  async checkDatabaseTables() {
    console.log('🔍 DEBUGGING DATABASE TABLES...');
    
    try {
      // Check audio_tracks table
      const { data: tracks, error: tracksError, count: tracksCount } = await supabase
        .from('audio_tracks')
        .select('*', { count: 'exact', head: true });
      
      console.log('🎵 Audio Tracks Table:');
      console.log(`   Total rows: ${tracksCount || 0}`);
      if (tracksError) console.log(`   Error: ${tracksError.message}`);
      
      // Check profiles table
      const { data: profiles, error: profilesError, count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      console.log('👤 Profiles Table:');
      console.log(`   Total rows: ${profilesCount || 0}`);
      if (profilesError) console.log(`   Error: ${profilesError.message}`);
      
      // Check events table
      const { data: events, error: eventsError, count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });
      
      console.log('🎪 Events Table:');
      console.log(`   Total rows: ${eventsCount || 0}`);
      if (eventsError) console.log(`   Error: ${eventsError.message}`);
      
      return {
        tracks: tracksCount || 0,
        profiles: profilesCount || 0,
        events: eventsCount || 0,
        errors: {
          tracks: tracksError,
          profiles: profilesError,
          events: eventsError
        }
      };
    } catch (error) {
      console.error('❌ Database debug error:', error);
      return null;
    }
  }
  
  /**
   * Get sample data from each table
   */
  async getSampleData() {
    console.log('📊 GETTING SAMPLE DATA...');
    
    try {
      // Get sample tracks
      const { data: sampleTracks, error: tracksError } = await supabase
        .from('audio_tracks')
        .select(`
          id,
          title,
          creator_id,
          play_count,
          like_count,
          file_url,
          cover_art_url,
          is_public,
          created_at
        `)
        .limit(3);
      
      console.log('🎵 Sample Tracks:');
      if (tracksError) {
        console.log(`   Error: ${tracksError.message}`);
      } else {
        sampleTracks?.forEach((track, i) => {
          console.log(`   ${i + 1}. "${track.title}" - Plays: ${track.play_count}, Likes: ${track.like_count}`);
        });
      }
      
      // Get sample creators
      const { data: sampleCreators, error: creatorsError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          role,
          followers_count,
          total_plays,
          created_at
        `)
        .eq('role', 'creator')
        .limit(3);
      
      console.log('👤 Sample Creators:');
      if (creatorsError) {
        console.log(`   Error: ${creatorsError.message}`);
      } else {
        sampleCreators?.forEach((creator, i) => {
          console.log(`   ${i + 1}. "${creator.display_name}" (@${creator.username}) - Followers: ${creator.followers_count}`);
        });
      }
      
      // Get sample events
      const { data: sampleEvents, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          creator_id,
          event_date,
          current_attendees,
          created_at
        `)
        .limit(3);
      
      console.log('🎪 Sample Events:');
      if (eventsError) {
        console.log(`   Error: ${eventsError.message}`);
      } else {
        sampleEvents?.forEach((event, i) => {
          console.log(`   ${i + 1}. "${event.title}" - Attendees: ${event.current_attendees}, Date: ${event.event_date}`);
        });
      }
      
      return {
        tracks: sampleTracks || [],
        creators: sampleCreators || [],
        events: sampleEvents || [],
        errors: {
          tracks: tracksError,
          creators: creatorsError,
          events: eventsError
        }
      };
    } catch (error) {
      console.error('❌ Sample data error:', error);
      return null;
    }
  }
  
  /**
   * Check database structure and columns
   */
  async checkTableStructure() {
    console.log('🏗️ CHECKING TABLE STRUCTURE...');
    
    try {
      // This will help identify if columns exist by trying to select them
      const { data: trackStructure, error: trackError } = await supabase
        .from('audio_tracks')
        .select('id, title, file_url, cover_art_url, play_count, like_count, creator_id, is_public')
        .limit(1);
      
      console.log('🎵 Audio Tracks Structure:');
      if (trackError) {
        console.log(`   Error: ${trackError.message}`);
        console.log('   This might indicate missing columns or table structure issues');
      } else {
        console.log('   ✅ Basic structure looks good');
        if (trackStructure && trackStructure.length > 0) {
          console.log('   Sample columns:', Object.keys(trackStructure[0]));
        }
      }
      
      const { data: profileStructure, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, role, followers_count, total_plays, avatar_url')
        .limit(1);
      
      console.log('👤 Profiles Structure:');
      if (profileError) {
        console.log(`   Error: ${profileError.message}`);
      } else {
        console.log('   ✅ Basic structure looks good');
        if (profileStructure && profileStructure.length > 0) {
          console.log('   Sample columns:', Object.keys(profileStructure[0]));
        }
      }
      
    } catch (error) {
      console.error('❌ Structure check error:', error);
    }
  }
  
  /**
   * Run full database diagnostic
   */
  async runFullDiagnostic() {
    console.log('🚀 RUNNING FULL DATABASE DIAGNOSTIC...');
    console.log('=====================================');
    
    const counts = await this.checkDatabaseTables();
    console.log('');
    
    await this.checkTableStructure();
    console.log('');
    
    const samples = await this.getSampleData();
    console.log('');
    
    // Summary
    console.log('📋 DIAGNOSTIC SUMMARY:');
    console.log('=====================================');
    if (counts) {
      console.log(`Total Audio Tracks: ${counts.tracks}`);
      console.log(`Total Profiles: ${counts.profiles}`);
      console.log(`Total Events: ${counts.events}`);
      
      if (counts.tracks === 0 && counts.profiles === 0 && counts.events === 0) {
        console.log('');
        console.log('⚠️  NO DATA FOUND!');
        console.log('Your database tables exist but are empty.');
        console.log('You need to:');
        console.log('1. Create user profiles');
        console.log('2. Upload some audio tracks');
        console.log('3. Create some events');
        console.log('');
        console.log('The mobile app will show empty states until you add real data.');
      } else {
        console.log('');
        console.log('✅ Database has some data!');
        if (counts.tracks > 0) console.log(`   • Found ${counts.tracks} audio tracks`);
        if (counts.profiles > 0) console.log(`   • Found ${counts.profiles} user profiles`);
        if (counts.events > 0) console.log(`   • Found ${counts.events} events`);
      }
    }
    
    console.log('=====================================');
    
    return { counts, samples };
  }
}

// Export singleton instance
export const dbDebugger = new DatabaseDebugger();

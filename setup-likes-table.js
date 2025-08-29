const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure you have a .env.local file with your Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupLikesTable() {
  console.log('🔧 Setting up likes table and social features...\n');

  try {
    // 1. Create likes table
    console.log('1. Creating likes table...');
    const { error: likesTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS likes (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
          content_id UUID NOT NULL,
          content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'event', 'comment')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, content_id, content_type)
        );
      `
    });

    if (likesTableError) {
      console.error('❌ Error creating likes table:', likesTableError);
      console.log('⚠️  You may need to create the table manually in Supabase dashboard');
    } else {
      console.log('✅ Likes table created successfully');
    }

    // 2. Create comments table
    console.log('\n2. Creating comments table...');
    const { error: commentsTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS comments (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
          content_id UUID NOT NULL,
          content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'event')),
          content TEXT NOT NULL,
          parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (commentsTableError) {
      console.error('❌ Error creating comments table:', commentsTableError);
    } else {
      console.log('✅ Comments table created successfully');
    }

    // 3. Create shares table
    console.log('\n3. Creating shares table...');
    const { error: sharesTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS shares (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
          content_id UUID NOT NULL,
          content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'event')),
          share_type VARCHAR(20) NOT NULL DEFAULT 'repost' CHECK (share_type IN ('repost', 'external_share')),
          external_platform VARCHAR(50),
          external_url TEXT,
          caption TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (sharesTableError) {
      console.error('❌ Error creating shares table:', sharesTableError);
    } else {
      console.log('✅ Shares table created successfully');
    }

    // 4. Create bookmarks table
    console.log('\n4. Creating bookmarks table...');
    const { error: bookmarksTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS bookmarks (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
          content_id UUID NOT NULL,
          content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'event')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, content_id, content_type)
        );
      `
    });

    if (bookmarksTableError) {
      console.error('❌ Error creating bookmarks table:', bookmarksTableError);
    } else {
      console.log('✅ Bookmarks table created successfully');
    }

    // 5. Enable RLS on all tables
    console.log('\n5. Enabling Row Level Security...');
    const tables = ['likes', 'comments', 'shares', 'bookmarks'];
    
    for (const table of tables) {
      const { error: rlsError } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
      });

      if (rlsError) {
        console.error(`❌ Error enabling RLS on ${table}:`, rlsError);
      } else {
        console.log(`✅ RLS enabled on ${table} table`);
      }
    }

    // 6. Create RLS policies for likes table
    console.log('\n6. Creating RLS policies for likes table...');
    const likesPolicies = [
      `CREATE POLICY "Likes are viewable by everyone" ON likes FOR SELECT USING (true);`,
      `CREATE POLICY "Users can insert their own likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);`,
      `CREATE POLICY "Users can delete their own likes" ON likes FOR DELETE USING (auth.uid() = user_id);`
    ];

    for (const policy of likesPolicies) {
      const { error: policyError } = await supabase.rpc('exec_sql', { sql: policy });
      if (policyError) {
        console.error('❌ Error creating likes policy:', policyError);
      } else {
        console.log('✅ Likes policy created');
      }
    }

    // 7. Create RLS policies for comments table
    console.log('\n7. Creating RLS policies for comments table...');
    const commentsPolicies = [
      `CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);`,
      `CREATE POLICY "Users can insert their own comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);`,
      `CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);`,
      `CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE USING (auth.uid() = user_id);`
    ];

    for (const policy of commentsPolicies) {
      const { error: policyError } = await supabase.rpc('exec_sql', { sql: policy });
      if (policyError) {
        console.error('❌ Error creating comments policy:', policyError);
      } else {
        console.log('✅ Comments policy created');
      }
    }

    // 8. Test the likes table
    console.log('\n8. Testing likes table...');
    const { data: testData, error: testError } = await supabase
      .from('likes')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Error testing likes table:', testError);
    } else {
      console.log('✅ Likes table is working correctly');
      console.log(`Found ${testData.length} existing likes`);
    }

    console.log('\n🎉 Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your development server');
    console.log('2. Test the like functionality on the homepage');
    console.log('3. Check that the heart buttons work correctly');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n🔧 Manual setup required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the database_schema.sql file');
    console.log('4. This will create all the missing tables and policies');
  }
}

setupLikesTable();

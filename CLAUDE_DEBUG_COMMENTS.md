# Debug Request: Comment Previews and Inline Comments Not Showing

## Problem Description

I've implemented LinkedIn-style inline commenting in a Next.js/React application, but two issues persist:

1. **Comment previews don't show**: Posts that have comments (e.g., a post with 2 comments) don't display the comment previews below the post content in the feed view.

2. **New comments don't appear inline**: When a user posts a comment, it doesn't immediately appear below the post like LinkedIn. The comment is successfully created (verified via API), but it doesn't render in the UI.

## Current Implementation

### Component: `apps/web/src/components/posts/PostCard.tsx`

**State Management:**
```typescript
const [commentPreview, setCommentPreview] = useState<Array<{...}>>([]);
const [showCommentBox, setShowCommentBox] = useState(false);
const [showAllComments, setShowAllComments] = useState(false);
```

**Comment Fetching Logic (useEffect):**
```typescript
useEffect(() => {
  const commentCount = (post as any).comment_count || (post as any).comments_count || 0;
  if ((commentCount > 0 || showCommentBox || showAllComments) && !showFullContent) {
    const limit = showAllComments ? 50 : 2;
    fetch(`/api/posts/${post.id}/comments?limit=${limit}`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.comments) {
          setCommentPreview(data.data.comments);
          // Update comment count from API response if available
          if (data.data.pagination?.total !== undefined) {
            const total = data.data.pagination.total;
            if (total > 0 && !(post as any).comment_count && !(post as any).comments_count) {
              (post as any).comment_count = total;
            }
          }
        } else if (data.success && (!data.data?.comments || data.data.comments.length === 0)) {
          setCommentPreview([]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch comment preview:', err);
      });
  } else if (commentCount === 0 && !showCommentBox && !showAllComments) {
    setCommentPreview([]);
  }
}, [post.id, post.comment_count, showFullContent, showAllComments, showCommentBox]);
```

**Comment Preview Display (Simple View):**
```typescript
{/* Comment Preview - Simple inline view when not expanded */}
{commentPreview.length > 0 && !showCommentBox && !showAllComments && (
  <div className="space-y-2">
    {commentPreview.slice(0, 2).map((comment) => (
      <div key={comment.id} className="flex items-start gap-2">
        <Link href={`/creator/${comment.author?.username || comment.author?.id}`}>
          <span className="font-semibold text-white text-sm hover:text-red-400 transition-colors">
            {comment.author?.name || comment.author?.username || 'User'}
          </span>
        </Link>
        <span className="text-gray-300 text-sm flex-1 line-clamp-2 break-words">
          {comment.content}
        </span>
      </div>
    ))}
    {/* View more button */}
  </div>
)}
```

**Full Comment Display (When Comment Box is Open):**
```typescript
{/* Display Comments Inline */}
{commentPreview.length > 0 && (
  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
    {commentPreview.map((comment) => (
      <div key={comment.id} className="flex items-start gap-3">
        {/* Avatar, name, content */}
      </div>
    ))}
  </div>
)}
```

**Comment Submission:**
```typescript
const response = await fetch(`/api/posts/${post.id}/comments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ content: commentText.trim() }),
});

const data = await response.json();
if (data.success && data.data?.comment) {
  const newComment = {
    id: data.data.comment.id,
    content: data.data.comment.content,
    author: data.data.comment.author,
    created_at: data.data.comment.created_at,
  };
  setCommentPreview(prev => [newComment, ...prev]);
  setCommentText('');
  
  // Update comment count
  if (!(post as any).comment_count && !(post as any).comments_count) {
    (post as any).comment_count = 1;
  } else {
    (post as any).comment_count = ((post as any).comment_count || (post as any).comments_count || 0) + 1;
  }
  
  if (onUpdate) {
    onUpdate();
  }
}
```

## Issues Identified

### Issue 1: Comment Previews Not Showing
**Problem**: The condition `commentCount > 0` prevents fetching when `comment_count` is not set in the post object, even though comments exist in the database.

**Possible Causes:**
- Posts fetched from feed API might not include `comment_count` or `comments_count` field
- The data service (`data-service.ts`) uses `select('*')` but might not be mapping `comments_count` to `comment_count`
- The useEffect dependency array might not trigger re-fetches when needed

### Issue 2: New Comments Not Appearing Inline
**Problem**: After posting a comment, it's added to `commentPreview` state, but the display condition might not be met.

**Possible Causes:**
- The condition `commentPreview.length > 0 && !showCommentBox && !showAllComments` might be false if `showCommentBox` is true
- The full comment display section requires `commentPreview.length > 0` but doesn't check if comment box is open
- State updates might not be triggering re-renders properly

## Questions for Claude

1. **Why aren't comment previews fetching automatically?** 
   - Should we always try to fetch comments on mount, regardless of `comment_count`?
   - Should we check the database directly if `comment_count` is 0 or undefined?

2. **Why don't new comments appear immediately after posting?**
   - Is the state update `setCommentPreview(prev => [newComment, ...prev])` correct?
   - Should we also set `showCommentBox` to true or `showAllComments` to true when a comment is posted?
   - Should the comment appear in both the preview section AND the full display section?

3. **What's the correct display logic?**
   - Should comment previews show by default (even if comment box is closed)?
   - Should new comments appear in the preview section immediately, or only in the full display?
   - Should we always show comments if `commentPreview.length > 0`, regardless of `showCommentBox` state?

4. **Data Flow Issues:**
   - The feed API returns `comments_count` but the component checks for `comment_count`. Should we normalize this in the data service?
   - Should we fetch comments on every post mount, or only when needed?

## Expected Behavior (LinkedIn-style)

1. **Comment Previews**: Always show 1-2 most recent comments below the post content, even if the comment box is closed
2. **Inline Commenting**: Clicking "Comment" opens an inline comment box below the post
3. **Immediate Display**: When a comment is posted, it should immediately appear in the comment list below the post
4. **View More**: If there are more than 2 comments, show "View X more comments" link

## Files to Review

- `apps/web/src/components/posts/PostCard.tsx` - Main component with comment logic
- `apps/web/src/lib/data-service.ts` - Data fetching service (check if `comment_count` is mapped)
- `apps/web/app/api/posts/[id]/comments/route.ts` - Comments API endpoint
- `apps/web/app/feed/page.tsx` - Feed page that renders PostCard components

## Request

Please help me:
1. Fix the comment preview fetching logic to always fetch comments when a post is displayed
2. Fix the comment display logic so new comments appear immediately after posting
3. Ensure comment previews show by default (1-2 comments) even when comment box is closed
4. Verify the data flow from API → component state → UI rendering

Thank you!


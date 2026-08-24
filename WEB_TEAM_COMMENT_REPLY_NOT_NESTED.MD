# Web Team: Comment reply rendering as a top-level comment instead of nested

## Bug

A comment posted via the "Reply" button is showing up as a flat, top-level comment in the
comments list instead of nested under the comment it replied to.

**Concrete instance**: on a post, "Madives" commented "God bless you, Sir ❤️" (5 days ago).
"Asibe Cheta" replied "🙏🏾❤️" (4 days ago) using the app's Reply action on that comment. Both
now render as separate top-level comments with no indent, no connecting thread line, and no
"N replies" toggle between them — i.e. the reply is not nested under its parent at all.

## Mobile-side investigation (ruled out)

Traced every place in the mobile app that touches `parent_comment_id`, end to end:

1. **UI trigger** — `src/components/CommentCard.tsx:61`: tapping "Reply" calls
   `onReply?.(comment.id)`.
2. **State** — `src/modals/CommentsModal.tsx:251-264` (`handleReply`): looks up the comment
   being replied to and calls `setReplyingTo(commentId)`.
3. **Send** — `src/modals/CommentsModal.tsx:232`: `addCommentAPI(text, replyingTo ||
   undefined, imageUrl)` — passes the parent id through.
4. **POST request** — `src/services/api/feedService.ts:1078-1096` (`addComment`): sends
   `POST /api/posts/{postId}/comments` with body `{ content, parent_comment_id: parentCommentId,
   ... }`.
5. **GET request / normalization** — `src/services/api/feedService.ts:1017-1073`
   (`getComments`): calls `GET /api/posts/{postId}/comments`, and maps each raw comment with
   `{ ...c, user: ... }` — a full spread, so `parent_comment_id` passes through unchanged if
   present in the response.
6. **Top-level filtering** — `src/hooks/useComments.ts:27`: `newComments.filter(c =>
   !c.parent_comment_id)` decides what renders as a root-level comment vs. a nested reply
   (fetched into `repliesMap` only on demand, when "View replies" is tapped).
7. **Rendering** — `src/components/CommentCard.tsx`: nested replies already render with a
   thread line (`borderLeftWidth`), `marginLeft: 40` indent, and "View replies" / "Hide
   replies" collapse-expand — recursively, so reply-to-reply nests too. This UI already works
   correctly for any comment whose `parent_comment_id` is set and returned by the API.

All six steps are correct on the mobile side — no bug found. Since step 6 only excludes a
comment from the top-level list when `parent_comment_id` is truthy, a comment rendering as
top-level despite being sent as a reply means the client received `parent_comment_id: null` (or
missing) for it at fetch time.

## What to check on your end

- **Does `POST /api/posts/{postId}/comments` persist `parent_comment_id` to the database?**
  Check the handler actually reads that field from the request body and writes it to the
  `comments` table row, rather than defaulting to null / ignoring it.
- **Does `GET /api/posts/{postId}/comments` return `parent_comment_id` in each comment object?**
  Even if it's correctly stored, a `SELECT` that omits the column, or a serializer that drops
  it, would produce exactly this symptom on reload.
- **Direct check**: query the `comments` table for the specific row (Asibe Cheta's "🙏🏾❤️" reply
  to Madives' comment, ~4 days old) and confirm what `parent_comment_id` actually holds. If it's
  `null` there, the bug is in the POST handler; if it's correctly set there but the GET response
  omits it, the bug is in the GET handler/serializer.
- Worth checking whether this is systemic (every reply loses its parent) or isolated to this
  one comment, since that changes urgency — a systemic version of this would mean **no** replies
  are nesting correctly right now, anywhere in the app.

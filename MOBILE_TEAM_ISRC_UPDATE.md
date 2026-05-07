# Mobile Team ISRC Update (May 7, 2026)

## What changed

- Production now has `assign_soundbridge_isrc(UUID)` for server-side assignment.
- Generated ISRC format is now: `GB-KTZ-YY-NNNNN`.
- `audio_tracks.isrc_code` is expanded to `VARCHAR(32)` to support hyphenated generated codes.

## Important integration notes

- Do not assume generated ISRC length is 12.
- For `soundbridge_generated`, call `assign_soundbridge_isrc` (track must already exist).
- Keep existing behavior for:
  - `user_provided` ISRC (standard 12-character ISRC)
  - `acrcloud_detected` ISRC

## Validation expectations

- `soundbridge_generated` values should match `^GB-KTZ-\\d{2}-\\d{5}$`.
- `user_provided` and `acrcloud_detected` may remain 12-char canonical ISRC values.

## Verified production example

- Track: `c3d8927b-84ff-4d01-8232-e22ad6fd0bcd`
- Assigned: `GB-KTZ-26-00001`
- Source: `soundbridge_generated`

# Privacy Settings Setup Guide

This guide explains how to set up and use the Privacy Settings functionality in the SoundBridge application.

## Overview

The Privacy Settings feature allows users to control their profile visibility and privacy preferences, including:

- **Profile Visibility**: Control who can view your profile (Public, Followers Only, Private)
- **Contact Information**: Control visibility of email and phone number
- **Interaction Settings**: Control who can message you and comment on your content
- **Activity Settings**: Control visibility of online status and listening activity

## Database Setup

### 1. Run the Database Schema

Execute the SQL script in your Supabase SQL Editor:

```sql
-- Run the contents of database/privacy_settings_schema.sql
```

This will create:
- `user_privacy_settings` table with RLS policies
- Indexes for performance
- Default privacy settings for existing users
- A view for easy access to privacy settings

### 2. Database Structure

```sql
CREATE TABLE user_privacy_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'followers')),
    show_email BOOLEAN DEFAULT false,
    show_phone BOOLEAN DEFAULT false,
    allow_messages BOOLEAN DEFAULT true,
    allow_comments BOOLEAN DEFAULT true,
    show_online_status BOOLEAN DEFAULT true,
    show_listening_activity BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

## API Endpoints

### GET `/api/user/privacy-settings`

Retrieves the current user's privacy settings.

**Response:**
```json
{
  "success": true,
  "settings": {
    "profileVisibility": "public",
    "showEmail": false,
    "showPhone": false,
    "allowMessages": true,
    "allowComments": true,
    "showOnlineStatus": true,
    "showListeningActivity": true
  }
}
```

### POST `/api/user/privacy-settings`

Updates the user's privacy settings.

**Request Body:**
```json
{
  "profileVisibility": "public",
  "showEmail": false,
  "showPhone": false,
  "allowMessages": "everyone",
  "allowComments": "everyone",
  "showOnlineStatus": true,
  "showListeningActivity": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Privacy settings updated successfully",
  "settings": {
    "profileVisibility": "public",
    "showEmail": false,
    "showPhone": false,
    "allowMessages": "everyone",
    "allowComments": "everyone",
    "showOnlineStatus": true,
    "showListeningActivity": true
  }
}
```

## Frontend Integration

### Settings Page Integration

The privacy settings are integrated into the Settings page (`app/settings/page.tsx`) under the Privacy tab:

1. **Profile Privacy Section**:
   - Profile Visibility dropdown with three options
   - Show Email toggle
   - Show Phone toggle

2. **Interaction Privacy Section**:
   - Allow Messages dropdown (Everyone, Followers Only, Creators Only, No Messages)
   - Allow Comments dropdown (Everyone, Followers Only, No Comments)
   - Privacy tips and guidance

3. **Activity Privacy Section**:
   - Show Online Status toggle
   - Show Listening Activity toggle

### Features

- **Real-time Updates**: Changes are saved immediately to the database
- **Loading States**: Visual feedback during API calls
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Confirmation messages for successful updates
- **Optimistic Updates**: UI updates immediately for better UX

## Testing

### Manual Testing

1. **Navigate to Settings**:
   ```
   http://localhost:3000/settings
   ```

2. **Click on Privacy Tab**

3. **Test Profile Visibility**:
   - Change dropdown from "Public" to "Followers Only"
   - Verify loading state appears
   - Check for success message
   - Refresh page to verify persistence

4. **Test Toggle Settings**:
   - Toggle "Show Email" on/off
   - Toggle "Allow Messages" on/off
   - Verify immediate UI updates
   - Check for success messages

5. **Test Error Handling**:
   - Disconnect internet
   - Try changing a setting
   - Verify error message appears
   - Check that setting reverts to original value

### API Testing

Test the API endpoints directly:

```bash
# Test GET endpoint
curl -X GET http://localhost:3000/api/user/privacy-settings

# Test POST endpoint
curl -X POST http://localhost:3000/api/user/privacy-settings \
  -H "Content-Type: application/json" \
  -d '{
    "profileVisibility": "followers",
    "showEmail": true,
    "showPhone": false,
    "allowMessages": true,
    "allowComments": false,
    "showOnlineStatus": true,
    "showListeningActivity": false
  }'
```

## Privacy Settings Options

### Profile Visibility

- **Public**: Anyone can view your profile
- **Followers Only**: Only your followers can view your profile
- **Private**: Only you can view your profile

### Contact Information

- **Show Email**: Display your email address on your profile
- **Show Phone**: Display your phone number on your profile

### Interaction Settings

- **Allow Messages**: Control who can send you messages
  - **Everyone**: Anyone can send you messages
  - **Followers Only**: Only your followers can message you
  - **Creators Only**: Only verified creators can message you
  - **No Messages**: Disable all direct messages
- **Allow Comments**: Control who can comment on your content
  - **Everyone**: Anyone can comment on your content
  - **Followers Only**: Only your followers can comment
  - **No Comments**: Disable all comments on your content

### Activity Settings

- **Show Online Status**: Let others see when you're online
- **Show Listening Activity**: Let others see what you're listening to

## Security Features

- **Row Level Security (RLS)**: Users can only access their own privacy settings
- **Authentication Required**: All API endpoints require valid user authentication
- **Input Validation**: Server-side validation for all privacy settings
- **Default Values**: Safe default privacy settings for new users

## Troubleshooting

### Common Issues

1. **Settings Not Loading**:
   - Check if database schema is properly set up
   - Verify RLS policies are enabled
   - Check browser console for API errors

2. **Settings Not Saving**:
   - Verify user is authenticated
   - Check network connectivity
   - Look for validation errors in API response

3. **UI Not Updating**:
   - Check for JavaScript errors in browser console
   - Verify API responses are successful
   - Check for state management issues

### Debug Mode

Enable debug logging by checking the browser console for:
- `🔒 Privacy Settings GET API called`
- `✅ User authenticated: [user-id]`
- `✅ Privacy settings updated: [settings]`

## Future Enhancements

Potential future improvements:

1. **Bulk Privacy Settings**: Allow users to apply privacy settings to multiple content types
2. **Privacy Presets**: Quick privacy setting presets (Public, Private, Selective)
3. **Advanced Visibility**: More granular control over profile sections
4. **Privacy Analytics**: Show users how their privacy settings affect visibility
5. **Export Privacy Settings**: Allow users to export their privacy preferences

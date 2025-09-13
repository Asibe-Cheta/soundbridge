# Login Alerts Setup Guide

## Overview
The Login Alerts feature provides comprehensive session management and security monitoring for SoundBridge users. It includes:

- **Login Alerts Toggle**: Enable/disable login notifications
- **Active Session Management**: View and terminate login sessions
- **Session History**: Track login attempts and locations
- **Security Monitoring**: Monitor suspicious login activities

## Database Setup

### 1. Run the Database Schema
Execute the SQL script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of database/login_alerts_schema.sql
```

This will create:
- `user_login_sessions` - Track active login sessions
- `user_login_alerts_preferences` - Store user alert preferences
- `login_events` - Log all login attempts and events
- Views and functions for easy data access

### 2. Verify Tables Created
Check that the following tables exist in your Supabase dashboard:
- ✅ `user_login_sessions`
- ✅ `user_login_alerts_preferences` 
- ✅ `login_events`
- ✅ `user_login_sessions_view` (view)

## API Endpoints

### 1. Login Alerts Preferences
**GET** `/api/auth/login-alerts`
- Retrieves user's login alert preferences
- Returns: enabled status, email/push notification settings

**POST** `/api/auth/login-alerts`
- Updates user's login alert preferences
- Body: `{ enabled, emailNotifications, pushNotifications }`

### 2. Recent Login Sessions
**GET** `/api/auth/recent-logins`
- Retrieves user's recent login sessions
- Returns: session list with device info, location, timestamps

**DELETE** `/api/auth/recent-logins`
- Terminates a specific login session
- Body: `{ sessionId }`

## Frontend Features

### 1. Login Alerts Toggle
- Toggle switch to enable/disable login alerts
- Real-time status updates
- Loading states and error handling

### 2. Active Sessions Management
- View all active login sessions
- Session details: device, location, IP, timestamp
- Terminate individual sessions
- Current session highlighting

### 3. Session History
- Modal view of all login sessions
- Filter by date, device, location
- Export session data (future feature)

## Security Features

### 1. Row Level Security (RLS)
- Users can only access their own sessions
- Automatic user isolation
- Secure session termination

### 2. Session Tracking
- IP address logging
- User agent tracking
- Geographic location detection
- Device fingerprinting

### 3. Automatic Cleanup
- Expired session removal
- Inactive session cleanup
- Database maintenance functions

## Testing the Feature

### 1. Enable Login Alerts
1. Navigate to `/settings`
2. Go to Security tab
3. Toggle "Login Alerts" to enabled
4. Verify status updates in real-time

### 2. View Active Sessions
1. Click "View All" in Active Sessions section
2. Verify modal opens with session list
3. Check session details are displayed
4. Test session termination (non-current sessions)

### 3. API Testing
```bash
# Test login alerts status (requires authentication)
GET /api/auth/login-alerts

# Test recent sessions (requires authentication)  
GET /api/auth/recent-logins

# Test session termination (requires authentication)
DELETE /api/auth/recent-logins
Body: { "sessionId": "uuid" }
```

## Database Functions

### 1. `get_user_active_sessions_count(user_uuid)`
Returns the number of active sessions for a user.

### 2. `terminate_user_session(session_uuid, user_uuid)`
Safely terminates a specific user session.

### 3. `cleanup_expired_sessions()`
Removes expired and inactive sessions from the database.

## Monitoring and Analytics

### 1. Login Events Table
Tracks all login-related events:
- `login` - Successful logins
- `logout` - User logouts
- `failed_login` - Failed login attempts
- `suspicious_activity` - Unusual login patterns

### 2. Session Analytics
Monitor user behavior:
- Login frequency
- Device usage patterns
- Geographic distribution
- Session duration

## Future Enhancements

### 1. Email Notifications
- Send alerts for new logins
- Suspicious activity notifications
- Weekly security summaries

### 2. Push Notifications
- Real-time login alerts
- Mobile app integration
- Custom notification preferences

### 3. Advanced Security
- Device fingerprinting
- Behavioral analysis
- Risk scoring
- Automatic session termination

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify Supabase connection
   - Check environment variables
   - Ensure RLS policies are enabled

2. **Session Not Appearing**
   - Check user authentication
   - Verify database permissions
   - Review API error logs

3. **Termination Not Working**
   - Verify session ownership
   - Check database functions
   - Review error messages

### Debug Steps

1. Check browser console for errors
2. Review API response in Network tab
3. Verify database queries in Supabase logs
4. Test API endpoints with authentication

## Security Considerations

### 1. Data Privacy
- IP addresses are logged for security
- User agents are stored for device identification
- Geographic data is approximate

### 2. Session Security
- Sessions expire automatically
- Secure session termination
- No session data in client storage

### 3. Access Control
- RLS ensures user data isolation
- API endpoints require authentication
- Admin functions are server-side only

## Performance Optimization

### 1. Database Indexes
- Optimized queries with proper indexing
- Efficient session lookups
- Fast cleanup operations

### 2. Caching
- Session data caching (future)
- Preference caching
- API response optimization

### 3. Cleanup Automation
- Scheduled cleanup of expired sessions
- Database maintenance tasks
- Performance monitoring

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Test with authentication
4. Verify database setup

The Login Alerts feature is now fully functional and ready for production use!

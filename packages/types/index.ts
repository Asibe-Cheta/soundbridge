// Export all shared types
export * from './database';
export * from './revenue';
export * from './global';

// Re-export commonly used types for convenience
export type {
  Database,
  Profile,
  AudioTrack,
  Event,
  Message,
  Follow,
  Notification,
  Playlist,
  UserPreference,
  Like,
  Comment,
  Analytics,
  PublicProfile,
  TrendingTrack,
  UpcomingEvent,
  CurrencyType,
  EventStatus,
  NotificationType,
  MessageStatus,
  UserRole
} from './database';

export type {
  CreatorBankAccount,
  CreatorRevenue,
  RevenueTransaction,
  CreatorTip,
  TipFormData,
  RevenueSummary,
  PayoutRequest
} from './revenue';

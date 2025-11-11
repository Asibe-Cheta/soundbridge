import type { Database as GeneratedDatabase, Json as GeneratedJson } from './types.generated';

export type Json = GeneratedJson;
export type Database = GeneratedDatabase;
export type CurrencyType = string;
export type EventStatus = string;
export type NotificationType = string;
export type MessageStatus = string;
export type UserRole = string;
export type ProviderBadgeTier = string;

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type AudioTrack = Database['public']['Tables']['audio_tracks']['Row'];
export type AudioTrackInsert = Database['public']['Tables']['audio_tracks']['Insert'];
export type AudioTrackUpdate = Database['public']['Tables']['audio_tracks']['Update'];

export type Event = Database['public']['Tables']['events']['Row'];
export type EventInsert = Database['public']['Tables']['events']['Insert'];
export type EventUpdate = Database['public']['Tables']['events']['Update'];

export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];

export type Follow = Database['public']['Tables']['follows']['Row'];
export type FollowInsert = Database['public']['Tables']['follows']['Insert'];
export type FollowUpdate = Database['public']['Tables']['follows']['Update'];

export type EventAttendee = Database['public']['Tables']['event_attendees']['Row'];
export type EventAttendeeInsert = Database['public']['Tables']['event_attendees']['Insert'];
export type EventAttendeeUpdate = Database['public']['Tables']['event_attendees']['Update'];

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export type Playlist = Database['public']['Tables']['playlists']['Row'];
export type PlaylistInsert = Database['public']['Tables']['playlists']['Insert'];
export type PlaylistUpdate = Database['public']['Tables']['playlists']['Update'];

export type PlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row'];
export type PlaylistTrackInsert = Database['public']['Tables']['playlist_tracks']['Insert'];
export type PlaylistTrackUpdate = Database['public']['Tables']['playlist_tracks']['Update'];

export type UserPreference = Database['public']['Tables']['user_preferences']['Row'];
export type UserPreferenceInsert = Database['public']['Tables']['user_preferences']['Insert'];
export type UserPreferenceUpdate = Database['public']['Tables']['user_preferences']['Update'];

export type CreatorTypeLookup = Database['public']['Tables']['creator_type_lookup']['Row'];
export type ServiceCategoryLookup = Database['public']['Tables']['service_category_lookup']['Row'];
export type UserCreatorType = Database['public']['Tables']['user_creator_types']['Row'];
export type UserCreatorTypeInsert = Database['public']['Tables']['user_creator_types']['Insert'];
export type UserCreatorTypeUpdate = Database['public']['Tables']['user_creator_types']['Update'];

type ServiceProviderProfileRow = Database['public']['Tables']['service_provider_profiles']['Row'];
type ServiceProviderProfileInsertBase = Database['public']['Tables']['service_provider_profiles']['Insert'];
type ServiceProviderProfileUpdateBase = Database['public']['Tables']['service_provider_profiles']['Update'];

type VerificationExtensions = {
  verification_status?: string | null;
  verification_notes?: string | null;
  verification_requested_at?: string | null;
  verification_reviewed_at?: string | null;
  verification_reviewer_id?: string | null;
  id_verified?: boolean | null;
  id_verified_at?: string | null;
};

export type ServiceProviderProfileTable = ServiceProviderProfileRow & VerificationExtensions;
export type ServiceProviderProfileInsert = ServiceProviderProfileInsertBase & VerificationExtensions;
export type ServiceProviderProfileUpdate = ServiceProviderProfileUpdateBase & VerificationExtensions;

export type ServiceOfferingTable = Database['public']['Tables']['service_offerings']['Row'];
export type ServiceOfferingInsert = Database['public']['Tables']['service_offerings']['Insert'];
export type ServiceOfferingUpdate = Database['public']['Tables']['service_offerings']['Update'];

export type ServicePortfolioItemTable = Database['public']['Tables']['service_portfolio_items']['Row'];
export type ServicePortfolioItemInsert = Database['public']['Tables']['service_portfolio_items']['Insert'];
export type ServicePortfolioItemUpdate = Database['public']['Tables']['service_portfolio_items']['Update'];

export type ServiceProviderAvailabilityTable = Database['public']['Tables']['service_provider_availability']['Row'];
export type ServiceProviderAvailabilityInsert =
  Database['public']['Tables']['service_provider_availability']['Insert'];
export type ServiceProviderAvailabilityUpdate =
  Database['public']['Tables']['service_provider_availability']['Update'];

export type ServiceBookingTable = Database['public']['Tables']['service_bookings']['Row'];
export type ServiceBookingInsert = Database['public']['Tables']['service_bookings']['Insert'];
export type ServiceBookingUpdate = Database['public']['Tables']['service_bookings']['Update'];

export type BookingActivityTable = Database['public']['Tables']['booking_activity']['Row'];
export type BookingActivityInsert = Database['public']['Tables']['booking_activity']['Insert'];
export type BookingActivityUpdate = Database['public']['Tables']['booking_activity']['Update'];

export type BookingLedgerTable = Database['public']['Tables']['booking_ledger']['Row'];
export type BookingLedgerInsert = Database['public']['Tables']['booking_ledger']['Insert'];
export type BookingLedgerUpdate = Database['public']['Tables']['booking_ledger']['Update'];

export type ProviderConnectAccountTable = Database['public']['Tables']['provider_connect_accounts']['Row'];
export type ProviderConnectAccountInsert = Database['public']['Tables']['provider_connect_accounts']['Insert'];
export type ProviderConnectAccountUpdate = Database['public']['Tables']['provider_connect_accounts']['Update'];

export type ServiceProviderVerificationRequestTable =
  Database['public']['Tables']['service_provider_verification_requests']['Row'];
export type ServiceProviderVerificationRequestInsert =
  Database['public']['Tables']['service_provider_verification_requests']['Insert'];
export type ServiceProviderVerificationRequestUpdate =
  Database['public']['Tables']['service_provider_verification_requests']['Update'];

export type ServiceProviderVerificationDocumentTable =
  Database['public']['Tables']['service_provider_verification_documents']['Row'];
export type ServiceProviderVerificationDocumentInsert =
  Database['public']['Tables']['service_provider_verification_documents']['Insert'];
export type ServiceProviderVerificationDocumentUpdate =
  Database['public']['Tables']['service_provider_verification_documents']['Update'];

export type BookingNotificationTable = Database['public']['Tables']['booking_notifications']['Row'];
export type BookingNotificationInsert = Database['public']['Tables']['booking_notifications']['Insert'];
export type BookingNotificationUpdate = Database['public']['Tables']['booking_notifications']['Update'];

export type ServiceReviewTable = Database['public']['Tables']['service_reviews']['Row'];
export type ServiceReviewInsert = Database['public']['Tables']['service_reviews']['Insert'];
export type ServiceReviewUpdate = Database['public']['Tables']['service_reviews']['Update'];



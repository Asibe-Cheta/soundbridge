'use client';

import React, { useEffect, useState } from 'react';
import { Users, UserPlus } from 'lucide-react';

interface Friend {
  friend_id: string;
  friend_name: string;
  friend_avatar: string;
  profile?: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string;
  };
  ticket_info?: {
    ticket: {
      ticket_name: string;
      ticket_type: string;
    };
  };
}

interface FriendsAttendingProps {
  eventId: string;
  className?: string;
}

export function FriendsAttending({
  eventId,
  className = '',
}: FriendsAttendingProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/friends-attending`);
        const data = await response.json();
        
        if (data.success) {
          setFriends(data.friends_attending);
        }
      } catch (error) {
        console.error('Error fetching friends attending:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriends();
  }, [eventId]);

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    return null;
  }

  const displayFriends = showAll ? friends : friends.slice(0, 5);
  const remainingCount = friends.length - displayFriends.length;

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Friends Attending
        </h3>
        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
          {friends.length}
        </span>
      </div>

      {/* Friends Avatars */}
      <div className="flex flex-wrap gap-2">
        {displayFriends.map((friend) => (
          <div
            key={friend.friend_id}
            className="group relative"
            title={friend.profile?.display_name || friend.friend_name}
          >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-800 shadow-lg overflow-hidden hover:scale-110 transition-transform cursor-pointer">
              {friend.profile?.avatar_url || friend.friend_avatar ? (
                <img
                  src={friend.profile?.avatar_url || friend.friend_avatar}
                  alt={friend.profile?.display_name || friend.friend_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {(friend.profile?.display_name || friend.friend_name).charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
              <div className="font-medium">
                {friend.profile?.display_name || friend.friend_name}
              </div>
              {friend.ticket_info?.ticket && (
                <div className="text-gray-300 text-xs mt-0.5">
                  {friend.ticket_info.ticket.ticket_name}
                </div>
              )}
              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
            </div>
          </div>
        ))}

        {/* Show More Button */}
        {!showAll && remainingCount > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:scale-110"
          >
            <span className="text-xs font-medium">+{remainingCount}</span>
          </button>
        )}
      </div>

      {/* Social Proof Message */}
      <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {friends.length === 1 ? (
          <>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {friends[0].profile?.display_name || friends[0].friend_name}
            </span>{' '}
            is attending this event
          </>
        ) : friends.length === 2 ? (
          <>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {friends[0].profile?.display_name || friends[0].friend_name}
            </span>{' '}
            and{' '}
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {friends[1].profile?.display_name || friends[1].friend_name}
            </span>{' '}
            are attending
          </>
        ) : (
          <>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {friends[0].profile?.display_name || friends[0].friend_name}
            </span>
            ,{' '}
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {friends[1].profile?.display_name || friends[1].friend_name}
            </span>
            {friends.length > 2 && (
              <> and {friends.length - 2} other{friends.length - 2 > 1 ? 's' : ''}</>
            )}{' '}
            are attending
          </>
        )}
      </div>

      {/* CTA */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <UserPlus className="w-4 h-4 inline mr-1" />
          Join your friends at this event!
        </p>
      </div>
    </div>
  );
}


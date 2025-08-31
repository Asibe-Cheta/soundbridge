'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, Music, Users, Plus, Check } from 'lucide-react';
import { Card, CardContent, CardFooter } from './Card';
import { Button } from './Button';
import { cn, formatPlayCount } from '../../lib/utils';

interface CreatorCardProps {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  location?: string;
  followerCount: number;
  trackCount: number;
  isFollowing?: boolean;
  isVerified?: boolean;
  onFollow?: (id: string) => void;
  onClick?: (id: string) => void;
  className?: string;
}

export function CreatorCard({
  id,
  name,
  username,
  avatar,
  location,
  followerCount,
  trackCount,
  isFollowing = false,
  isVerified = false,
  onFollow,
  onClick,
  className
}: CreatorCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFollow?.(id);
  };

  const handleClick = () => {
    onClick?.(id);
  };

  return (
    <motion.div
      className={cn("group relative", className)}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ 
        y: -8,
        scale: 1.02,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onClick={handleClick}
    >
      <Card variant="creator" className="cursor-pointer overflow-hidden">
        <CardContent className="p-6">
          {/* Header with Avatar and Follow Button */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-primary-red to-accent-pink p-0.5">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-red to-accent-pink rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Verification Badge */}
                {isVerified && (
                  <motion.div
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-primary-red to-accent-pink rounded-full flex items-center justify-center border-2 border-background"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </div>

              {/* Creator Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-lg truncate group-hover:text-primary-red transition-colors">
                    {name}
                  </h3>
                </div>
                <p className="text-white/60 text-sm truncate">
                  @{username}
                </p>
                {location && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-white/40" />
                    <span className="text-white/40 text-xs">{location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Follow Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Button
                variant={isFollowing ? "glass" : "default"}
                size="sm"
                onClick={handleFollow}
                className={cn(
                  "min-w-[80px]",
                  isFollowing && "text-white/80 hover:text-white"
                )}
              >
                {isFollowing ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Following
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            </motion.div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              className="text-center p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-4 h-4 text-primary-red" />
                <span className="text-white font-semibold text-lg">
                  {formatPlayCount(followerCount)}
                </span>
              </div>
              <p className="text-white/60 text-xs">Followers</p>
            </motion.div>

            <motion.div
              className="text-center p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Music className="w-4 h-4 text-accent-pink" />
                <span className="text-white font-semibold text-lg">
                  {trackCount}
                </span>
              </div>
              <p className="text-white/60 text-xs">Tracks</p>
            </motion.div>
          </div>

          {/* Hover Effect Overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary-red/5 to-accent-pink/5 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
        </CardContent>

        {/* Footer with Quick Actions */}
        <CardFooter className="p-4 pt-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span>• {location || 'Unknown location'}</span>
              <span>• {trackCount} tracks</span>
            </div>
            
            <motion.div
              className="flex gap-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 20 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 hover:bg-white/10"
              >
                View Profile
              </Button>
            </motion.div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

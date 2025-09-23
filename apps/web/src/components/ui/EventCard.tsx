'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Clock, Ticket, Star } from 'lucide-react';
import { Card, CardContent, CardFooter } from './Card';
import { Button } from './Button';
import { cn, formatDate, formatPrice } from '../../lib/utils';

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  location: string;
  price?: number;
  currency?: string;
  attendeeCount: number;
  maxAttendees?: number;
  image?: string;
  category?: string;
  isFeatured?: boolean;
  isAttending?: boolean;
  rating?: number;
  onRSVP?: (id: string) => void;
  onClick?: (id: string) => void;
  className?: string;
}

export function EventCard({
  id,
  title,
  date,
  location,
  price,
  currency = 'GBP',
  attendeeCount,
  maxAttendees,
  image,
  category,
  isFeatured = false,
  isAttending = false,
  rating,
  onRSVP,
  onClick,
  className
}: EventCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleRSVP = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRSVP?.(id);
  };

  const handleClick = () => {
    onClick?.(id);
  };

  const formatEventDate = (dateString: string) => {
    const eventDate = new Date(dateString);
    const now = new Date();
    const diffTime = eventDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Past Event';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays <= 7) {
      return `In ${diffDays} days`;
    } else {
      return formatDate(dateString);
    }
  };

  const getAttendancePercentage = () => {
    if (!maxAttendees) return 0;
    return Math.round((attendeeCount / maxAttendees) * 100);
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
      <Card variant="event" className="cursor-pointer overflow-hidden">
        <CardContent className="p-0">
          {/* Event Image */}
          <div className="relative h-48 overflow-hidden">
            {image ? (
              <motion.img
                src={image}
                alt={title}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-coral/20 via-primary-red/20 to-accent-pink/20 flex items-center justify-center">
                <div className="text-4xl">🎪</div>
              </div>
            )}
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Featured Badge */}
            {isFeatured && (
              <motion.div
                className="absolute top-3 left-3 bg-gradient-to-r from-primary-red to-accent-pink text-white px-3 py-1 rounded-full text-xs font-semibold"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                Featured
              </motion.div>
            )}

            {/* Category Badge */}
            {category && (
              <motion.div
                className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {category}
              </motion.div>
            )}

            {/* Rating */}
            {rating && (
              <motion.div
                className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs flex items-center gap-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {rating.toFixed(1)}
              </motion.div>
            )}
          </div>

          {/* Event Content */}
          <div className="p-4">
            <div className="space-y-3">
              {/* Title */}
              <h3 className="font-semibold text-white text-lg line-clamp-2 group-hover:text-primary-red transition-colors">
                {title}
              </h3>

              {/* Date and Time */}
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Calendar className="w-4 h-4" />
                <span>{formatEventDate(date)}</span>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <MapPin className="w-4 h-4" />
                <span className="line-clamp-1">{location}</span>
              </div>

              {/* Price */}
              {price !== undefined && (
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Ticket className="w-4 h-4" />
                  <span className="font-semibold text-white">
                    {price === 0 ? 'Free' : formatPrice(price, currency)}
                  </span>
                </div>
              )}

              {/* Attendance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Users className="w-4 h-4" />
                  <span>
                    {attendeeCount} {maxAttendees ? `/ ${maxAttendees}` : ''} attending
                  </span>
                </div>
                
                {maxAttendees && (
                  <div className="text-xs text-white/40">
                    {getAttendancePercentage()}% full
                  </div>
                )}
              </div>

              {/* Attendance Progress Bar */}
              {maxAttendees && (
                <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-red to-accent-pink"
                    initial={{ width: 0 }}
                    animate={{ width: `${getAttendancePercentage()}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>

        {/* Footer with RSVP Button */}
        <CardFooter className="p-4 pt-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Clock className="w-3 h-3" />
              <span>{formatEventDate(date)}</span>
            </div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 20 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant={isAttending ? "glassmorphism" : "default"}
                size="sm"
                onClick={handleRSVP}
                className={cn(
                  "min-w-[100px]",
                  isAttending && "text-white/80 hover:text-white"
                )}
              >
                {isAttending ? 'Attending' : 'RSVP'}
              </Button>
            </motion.div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

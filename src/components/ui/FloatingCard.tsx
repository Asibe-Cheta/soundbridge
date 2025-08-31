'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from './Card';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface FloatingCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  defaultVisible?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function FloatingCard({ 
  title, 
  children, 
  className = '', 
  defaultVisible = true,
  position = 'top-right'
}: FloatingCardProps) {
  const [isVisible, setIsVisible] = useState(defaultVisible);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // console.log('🎯 FloatingCard rendered:', { title, position, isVisible, isCollapsed });

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-20 left-5';
      case 'top-right':
        return 'top-20 right-5';
      case 'bottom-left':
        return 'bottom-20 left-5';
      case 'bottom-right':
        return 'bottom-20 right-5';
      default:
        return 'top-20 right-5';
    }
  };

  if (!isVisible) {
    return (
      <motion.div 
        className={cn("fixed z-50", getPositionClasses())}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          variant="glassmorphism"
          onClick={() => setIsVisible(true)}
          className="flex items-center gap-2 px-4 py-2"
        >
          <ChevronUp size={16} />
          Show {title}
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.aside 
        className={cn("fixed z-50 w-80 max-w-sm", getPositionClasses())}
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
      >
        <Card variant="glass" className="shadow-2xl" style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="w-8 h-8 hover:bg-white/10"
                >
                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsVisible(false)}
                  className="w-8 h-8 hover:bg-red-500/20 hover:text-red-400"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <CardContent className="pt-0">
                  {children}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.aside>
    </AnimatePresence>
  );
} 
'use client';

import React from 'react';
import { cn } from '../../lib/utils';
// import { ButtonProps } from '../../lib/types';
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  className
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: "bg-gradient-to-r from-primary-red to-accent-pink text-white hover:from-red-700 hover:to-pink-700 focus:ring-primary-red shadow-lg hover:shadow-xl hover:-translate-y-0.5",
    secondary: "bg-transparent border border-white/20 text-white hover:bg-white/10 hover:border-white/30 focus:ring-white/20",
    outline: "bg-transparent border-2 border-primary-red text-primary-red hover:bg-primary-red hover:text-white focus:ring-primary-red",
    ghost: "text-gray-700 hover:bg-gray-100"
  };

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
} 
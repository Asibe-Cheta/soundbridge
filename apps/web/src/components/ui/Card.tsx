'use client';

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"

import { cn } from "../../lib/utils"

const cardVariants = cva(
  "rounded-lg border text-card-foreground shadow-sm transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card",
        glass: "bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-white/5",
        glassmorphism: "bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border border-white/20 hover:from-white/20 hover:to-white/10 hover:border-white/30 hover:shadow-lg",
        music: "bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border-white/10 hover:from-white/10 hover:to-white/15 hover:border-white/20 hover:shadow-lg hover:shadow-primary-red/10",
        creator: "bg-gradient-to-br from-primary-red/10 to-accent-pink/10 backdrop-blur-xl border-primary-red/20 hover:from-primary-red/20 hover:to-accent-pink/20 hover:border-primary-red/30 hover:shadow-lg hover:shadow-primary-red/15",
        event: "bg-gradient-to-br from-coral/10 to-primary-red/10 backdrop-blur-xl border-coral/20 hover:from-coral/20 hover:to-primary-red/20 hover:border-coral/30 hover:shadow-lg hover:shadow-coral/15",
        transparent: "bg-transparent border-transparent",
        elevated: "bg-white/8 backdrop-blur-xl border-white/15 hover:bg-white/12 hover:border-white/25 hover:shadow-xl hover:shadow-black/20",
        gradient: "bg-gradient-to-br from-primary-red/5 via-accent-pink/5 to-coral/5 backdrop-blur-xl border-primary-red/20 hover:from-primary-red/10 hover:via-accent-pink/10 hover:to-coral/10 hover:border-primary-red/30",
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        compact: "p-3",
        none: "p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Card = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof motion.div> & VariantProps<typeof cardVariants>
>(({ className, variant, size, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn(cardVariants({ variant, size, className }))}
    whileHover={{ 
      y: -8,
      scale: 1.02,
      transition: { duration: 0.3, ease: "easeOut" }
    }}
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants } 
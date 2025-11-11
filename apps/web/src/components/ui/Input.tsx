import * as React from "react"
import { motion } from "framer-motion"
import { useTheme } from "@/src/contexts/ThemeContext"

import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, ...props }, ref) => {
    const { theme } = useTheme();
    
    return (
      <div className="relative">
        {label && (
          <label className={`block text-sm font-medium mb-2 ${
            theme === 'dark' ? 'text-white/80' : 'text-gray-700'
          }`}>
            {label}
          </label>
        )}
        <motion.div
          className="relative"
          whileFocus={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          {icon && (
            <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              theme === 'dark' ? 'text-white/40' : 'text-gray-400'
            }`}>
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200",
              theme === 'dark'
                ? "border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary-red/50 focus:border-primary-red/50 focus:bg-white/10"
                : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 focus:bg-gray-50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              icon && "pl-10",
              error && "border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50",
              className
            )}
            ref={ref}
            {...props}
          />
        </motion.div>
        {error && (
          <motion.p
            className="mt-1 text-sm text-red-400"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }

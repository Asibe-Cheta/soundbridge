declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';

  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
    className?: string;
  }

  export type Icon = ComponentType<IconProps>;

  // Export the icons we're actually using in the project
  export const Search: Icon;
  export const Filter: Icon;
  export const TrendingUp: Icon;
  export const Music: Icon;
  export const Users: Icon;
  export const Calendar: Icon;
  export const Mic: Icon;
  export const AlertCircle: Icon;
  export const User: Icon;
  export const Plus: Icon;
  export const LogOut: Icon;
  export const Bell: Icon;
  export const Settings: Icon;
  export const Play: Icon;
  export const Pause: Icon;
  export const Heart: Icon;
  export const Share2: Icon;
  export const Loader2: Icon;
  export const Upload: Icon;
  export const Menu: Icon;
  export const X: Icon;
  export const Home: Icon;
  export const MapPin: Icon;
  export const Star: Icon;
  export const Globe: Icon;
  export const Target: Icon;
  export const Lightbulb: Icon;
  export const ArrowRight: Icon;
  export const DollarSign: Icon;
  export const Sparkles: Icon;
  export const MessageCircle: Icon;
  export const MoreHorizontal: Icon;
  export const Link: Icon;
}

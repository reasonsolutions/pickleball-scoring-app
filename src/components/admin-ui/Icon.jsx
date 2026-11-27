import React from 'react';
import {
  House, Trophy, Users, Building2, Shield, Pencil, Star, ShoppingBag, Ticket, Store, Video,
  Briefcase, Smartphone, SlidersHorizontal, Cast, Monitor, Megaphone, ClipboardCheck, Calendar,
  Search, Bell, Plus, Menu, X, Check, Clock, ChevronDown, ChevronRight, ChevronsUpDown,
  ArrowUpRight, ArrowLeft, MapPin, Trash2, LogOut, Download, Funnel, Info, TriangleAlert, Settings,
  UserCog, Image, Database, Sparkles, ChartColumn, Upload, Eye, EllipsisVertical, ExternalLink,
} from 'lucide-react';

// Design-system icon names (see design package components/icons/Icon.jsx) mapped to lucide.
export const ICONS = {
  home: House,
  trophy: Trophy,
  users: Users,
  building: Building2,
  shield: Shield,
  edit: Pencil,
  star: Star,
  bag: ShoppingBag,
  ticket: Ticket,
  store: Store,
  video: Video,
  briefcase: Briefcase,
  phone: Smartphone,
  sliders: SlidersHorizontal,
  cast: Cast,
  monitor: Monitor,
  megaphone: Megaphone,
  clipboard: ClipboardCheck,
  calendar: Calendar,
  search: Search,
  bell: Bell,
  plus: Plus,
  menu: Menu,
  close: X,
  check: Check,
  clock: Clock,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  chevronUpDown: ChevronsUpDown,
  arrowUpRight: ArrowUpRight,
  arrowLeft: ArrowLeft,
  pin: MapPin,
  trash: Trash2,
  logout: LogOut,
  download: Download,
  upload: Upload,
  filter: Funnel,
  info: Info,
  alert: TriangleAlert,
  settings: Settings,
  userCog: UserCog,
  image: Image,
  database: Database,
  sparkles: Sparkles,
  chart: ChartColumn,
  eye: Eye,
  more: EllipsisVertical,
  external: ExternalLink,
};

/**
 * Stroke icon. `name` is a design-system name (string) or a lucide component.
 * Stroke defaults to 1.7 (1.9 at ≤16px) per the iconography spec.
 */
export function Icon({ name, size = 18, strokeWidth, className = '', style, ...rest }) {
  const Cmp = typeof name === 'string' ? ICONS[name] || Info : name || Info;
  const sw = strokeWidth ?? (size <= 16 ? 1.9 : 1.7);
  return (
    <Cmp
      size={size}
      strokeWidth={sw}
      absoluteStrokeWidth={false}
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      style={style}
      {...rest}
    />
  );
}

export default Icon;

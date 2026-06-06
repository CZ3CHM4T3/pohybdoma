import {
  Sprout,
  Activity,
  Dumbbell,
  PawPrint,
  Waves,
  TrendingUp,
  Briefcase,
  Baby,
  Wind,
  Footprints,
  Bone,
  Shield,
  Target,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

/** Profesionální ikona pro každý kurz (podle slugu). */
export const COURSE_ICONS: Record<string, LucideIcon> = {
  "znovuzrozeni": Sprout,
  "kalistenika-doma": Activity,
  "kettlebell": Dumbbell,
  "animal-flow": PawPrint,
  "flowrope": Waves,
  "schody": TrendingUp,
  "office": Briefcase,
  "rodic-a-dite": Baby,
  "reset-dychani": Wind,
  "noha": Footprints,
  "kycel": Bone,
  "rameno": Shield,
  "panev": Target,
};

export const DEFAULT_COURSE_ICON: LucideIcon = BookOpen;

export interface Meal {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface DailyLog {
  id: number;
  date: string;
  current_weight: number | null;
  meals: Meal[];
}

export interface DietPlan {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
}

export interface UserProfile {
  email: string;
  age?: number;
  gender?: string;
  height?: number;
  country?: string;
  preferred_cuisine?: string;
}

export interface AIInsight {
  loading: boolean;
  text: string | null;
}

export interface MatchData {
  date: string;
  competition: string;
  home_team: string;
  home_logo: string;
  home_score?: number;
  away_team: string;
  away_logo: string;
  away_score?: number;
}

export interface TeamData {
  id: number;
  name: string;
  logo: string;
  next_match: MatchData | null;
  last_match: MatchData | null;
  error?: string;
}

export interface FootballHubData {
  national_team: TeamData | null;
  local_team: TeamData | null;
  international_team: TeamData | null;
}

export interface StockQuote {
  symbol: string;
  short_name: string;
  current_price: number;
  change_amount: number;
  change_percent: number;
  currency: string;
  is_positive: boolean;
}
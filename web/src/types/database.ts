export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Household = {
  id: string;
  owner_user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Location = {
  id: string;
  household_id: string;
  parent_location_id: string | null;
  name: string;
  icon: string | null;
  background_photo_url: string | null;
  color_tint: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Item = {
  id: string;
  household_id: string;
  location_id: string;
  name: string;
  ai_suggested_name: string | null;
  ai_confidence: number | null;
  ai_source: "vision_local" | "vision_cloud" | "text_only" | null;
  ai_last_classified_at: string | null;
  category_id: string | null;
  user_category_id: string | null;
  user_category_name_cache: string | null;
  quantity: number;
  use_count: number;
  last_used_at: string | null;
  notes: string | null;
  acquired_at: string | null;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

export type ItemPhoto = {
  id: string;
  item_id: string;
  photo_url: string;
  is_primary: boolean;
  photo_type: string | null;
  created_at: string;
};

export type UserSubscription = {
  id: string;
  user_id: string;
  tier: "free" | "pro_monthly" | "pro_annual";
  status: "active" | "expired" | "cancelled" | "in_grace_period";
  credits_balance: number;
  credits_reserved: number;
  credits_lifetime_used: number;
  current_period_started_at: string | null;
  current_period_ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      households: {
        Row: Household;
        Insert: Partial<Household> & Pick<Household, "owner_user_id" | "name">;
        Update: Partial<Household>;
      };
      locations: {
        Row: Location;
        Insert: Partial<Location> & Pick<Location, "household_id" | "name">;
        Update: Partial<Location>;
      };
      items: {
        Row: Item;
        Insert: Partial<Item> & Pick<Item, "household_id" | "location_id">;
        Update: Partial<Item>;
      };
      item_photos: {
        Row: ItemPhoto;
        Insert: Partial<ItemPhoto> & Pick<ItemPhoto, "item_id" | "photo_url">;
        Update: Partial<ItemPhoto>;
      };
      user_subscriptions: {
        Row: UserSubscription;
        Insert: never;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

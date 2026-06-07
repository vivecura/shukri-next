import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://zevrlfpyyndwjnlpidkx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldnJsZnB5eW5kd2pubHBpZGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODA2MTUsImV4cCI6MjA5MDg1NjYxNX0.upwfBBFCmlLp9Q-gXjgG89WCXkqqG3hutGiuisyV3CI"
);

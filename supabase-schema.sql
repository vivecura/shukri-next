-- =============================================
-- ViveCura Blog Posts Table
-- Run this in Supabase SQL Editor
-- =============================================

CREATE TABLE blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  html_content TEXT NOT NULL,
  thumbnail_url TEXT,
  published BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'de',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public users (anon key) can only read published posts
CREATE POLICY "Public can read published posts"
  ON blog_posts
  FOR SELECT
  USING (published = true);

-- Create index for faster slug lookups
CREATE INDEX idx_blog_posts_slug ON blog_posts (slug);

-- Create index for listing published posts
CREATE INDEX idx_blog_posts_published ON blog_posts (published, created_at DESC);

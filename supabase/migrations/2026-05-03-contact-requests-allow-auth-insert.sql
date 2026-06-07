-- Allow logged-in admin (authenticated role) to also INSERT into contact_requests.
-- Without this, submitting the contact form while logged in as admin fails with RLS 42501.
DROP POLICY IF EXISTS "auth insert" ON contact_requests;
CREATE POLICY "auth insert"
  ON contact_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

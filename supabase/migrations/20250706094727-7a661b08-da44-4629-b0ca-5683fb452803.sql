-- Fix incorrect role assignment for bartwetselaar.books@gmail.com
UPDATE user_roles 
SET role = 'moderator'
WHERE user_id = (
  SELECT user_id FROM workable_users 
  WHERE workable_email = 'bartwetselaar.books@gmail.com'
);
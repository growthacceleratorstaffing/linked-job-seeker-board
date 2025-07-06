-- Update workable_role enum to match Workable's actual roles
ALTER TYPE workable_role ADD VALUE IF NOT EXISTS 'simple';
ALTER TYPE workable_role ADD VALUE IF NOT EXISTS 'reviewer'; 
ALTER TYPE workable_role ADD VALUE IF NOT EXISTS 'no_access';
ALTER TYPE workable_role ADD VALUE IF NOT EXISTS 'hris_admin';
ALTER TYPE workable_role ADD VALUE IF NOT EXISTS 'hris_employee';
ALTER TYPE workable_role ADD VALUE IF NOT EXISTS 'hris_no_access';
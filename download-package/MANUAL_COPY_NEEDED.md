
# Files That Need Manual Copying

These files are read-only in the current project and need to be copied manually:

## Core Components (Required)
- `src/components/VacancyGenerator.tsx`
- `src/components/WorkableIntegration.tsx`
- `src/components/EmploymentDetailsForm.tsx`
- `src/components/AICopilot.tsx`

## UI Components (Copy all from src/components/ui/)
- All files in `src/components/ui/` directory
- These are the shadcn/ui components

## Hooks
- `src/hooks/use-toast.ts` (included in package)

## Supabase Integration
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`

## Other Pages (if needed)
- `src/pages/Auth.tsx`
- `src/pages/CRM.tsx`
- `src/pages/NotFound.tsx`

## Assets
- Logo image: `/lovable-uploads/b75d59b1-dda0-4ae9-aa70-24966bdd42d5.png`
- Upload this image to your new project's public folder

## Configuration Files
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `components.json`
- `postcss.config.js`

## Environment Setup
You'll need to set up Supabase integration with the same environment variables and database schema.

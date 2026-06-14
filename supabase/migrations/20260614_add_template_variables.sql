-- Add variables column to email_templates table to store user-defined variables in JSON
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'::jsonb;

-- Add variables column to global_email_templates table to store variables for global templates
ALTER TABLE global_email_templates ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'::jsonb;

-- Add email_template_variables column to users table to store global user variables like signature and name
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_template_variables JSONB DEFAULT '{"signature": "", "name": ""}'::jsonb;

INSERT OR IGNORE INTO `agents` (`id`, `name`, `command`, `args`, `prompt_flag`, `model_flag`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Gemini CLI',    'gemini',   '[]', '-p',       NULL,  'Google Gemini CLI agent',     1, 1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000002', 'Claude Code',   'claude',   '[]', '-p',       '-m',  'Anthropic Claude CLI agent',  1, 1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000003', 'OpenAI Codex',  'codex',    '[]', '-p',       NULL,  'OpenAI Codex CLI agent',      1, 1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000004', 'OpenCode AI',   'opencode', '[]', '--prompt', NULL,  'OpenCode AI CLI agent',       1, 1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000005', 'GitHub Copilot','copilot',  '[]', '-p',       NULL,  'GitHub Copilot CLI agent',    1, 1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000006', 'Kilocode CLI',  'kilo',     '[]', '--prompt', NULL,  'Kilocode CLI agent',          1, 1704067200000, 1704067200000),
  ('00000000-0000-4000-8000-000000000007', 'Cline CLI',     'cline',    '[]', '',         NULL,  'Cline CLI agent',             1, 1704067200000, 1704067200000);

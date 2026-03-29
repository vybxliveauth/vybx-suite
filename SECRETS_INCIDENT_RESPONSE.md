# Secrets Incident Response (March 29, 2026)

This runbook closes the exposed-secret incident and prevents recurrence.

## 1) Rotate credentials immediately

Rotate any key that was ever committed or shared in chat/docs:

- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- any Cloudflare/DNS API token

After rotation, update environment variables in:

- backend runtime (`.env.production` on server)
- Vercel projects (`web`, `admin`, `promoter`)

## 2) Remove leaked values from working tree

- Replace leaked values in docs/examples with placeholders.
- Confirm with:

```bash
rg -n --hidden --glob '!**/node_modules/**' --glob '!**/.git/**' \
  "re_[A-Za-z0-9_-]{16,}|sk_(live|test)_[A-Za-z0-9]{16,}|pk_(live|test)_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}" .
```

## 3) Purge git history (required)

Prefer a mirror clone (safe; no risk to your working tree):

```bash
git clone --mirror git@github.com:vybxliveauth/vybx-suite.git /tmp/vybx-suite-history-clean.git
cd /tmp/vybx-suite-history-clean.git
```

Create replacement rules file:

```bash
cat > /tmp/replacements.txt << 'EOF'
<EXPOSED_SECRET_VALUE_1>==>REDACTED_SECRET_1
<EXPOSED_SECRET_VALUE_2>==>REDACTED_SECRET_2
EOF
```

Rewrite history:

```bash
git filter-repo --replace-text /tmp/replacements.txt --force
git remote add origin git@github.com:vybxliveauth/vybx-suite.git
git push --force --mirror origin
```

If you prefer running on a normal (non-bare) clone, you can use:

```bash
CONFIRM_PURGE=YES REPLACE_TEXT_FILE=/tmp/replacements.txt ./scripts/purge-secret-history.sh
```

## 4) Invalidate stale clones

All contributors must re-clone or hard-reset to rewritten history.

## 5) Prevent recurrence

- Keep CI secret scanning enabled (`gitleaks`).
- Keep `.gitleaks.toml` custom rules committed.
- Never place real credentials in `*.md`, `*.example`, screenshots, or commits.

# GitHub Integration: Hybrid OAuth + GitHub App Guide

We have replaced the local storage OAuth token persistence with a highly secure **Hybrid GitHub Integration Flow (OAuth + GitHub App)**. This eliminates the vulnerability of storing raw OAuth tokens on the frontend and keeps all sensitive GitHub tokens on the backend.

---

## Architecture Flow

The hybrid integration splits setup-only credentials (which require user context) from operational actions. The GitHub App installation runs automatically as the final step of the login setup flow, offering a seamless setup experience with zero extra button clicks:

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant FE as Frontend (React/Next.js)
    participant BE as Backend (Server Actions)
    participant DB as Supabase Auth Database
    participant GH as GitHub API

    Note over User, GH: 1. Setup Phase (OAuth)
    User->>FE: Sign in with GitHub
    FE->>GH: Authenticate via OAuth
    GH-->>FE: Return transient session token
    FE->>BE: Fork repository & Inject Secrets (setup-only)
    BE->>GH: Execute Fork & Set Repo Secrets
    Note over FE: OAuth Token discarded; never stored in localStorage

    Note over User, GH: 2. Automatic GitHub App Redirection
    FE->>FE: Verify if github_installation_id metadata exists
    Note over FE: If missing, automatically redirect user to install GitHub App
    FE->>GH: Redirect to App Installation URL
    GH-->>FE: Redirect to /github/callback?installation_id=X
    FE->>DB: Save installation_id to user metadata
    FE->>FE: Redirect to /dashboard (setup complete!)
    
    Note over User, GH: 3. Operations Phase (GitHub App Tokens)
    FE->>BE: Call getWorkflowStatus(userId)
    BE->>DB: Fetch user metadata & installation_id
    BE->>BE: Generate JWT using Private Key + App ID
    BE->>GH: Exchange JWT for temporary installation token
    BE->>GH: Fetch workflow details
    GH-->>BE: Return metrics/status
    BE-->>FE: Return sanitized status (no token exposed!)
```

---

## Configuration & Environment Variables

To activate the GitHub App workflow, configure the following variables in your `.env.local` (and add them to your hosting environment e.g. Vercel, Supabase):

```env
# GitHub App Configuration
GITHUB_APP_ID=your-github-app-id
GITHUB_APP_PRIVATE_KEY=your-github-app-private-key-pem-or-base64
NEXT_PUBLIC_GITHUB_APP_NAME=your-github-app-slug-name
```

> [!NOTE]
> **GITHUB_APP_PRIVATE_KEY Formatting**: 
> You can input the raw PEM block replacing newlines with `\n` (e.g. `-----BEGIN RSA PRIVATE KEY-----\nMIIE...`) OR paste a standard **Base64 encoded** string of your private key (highly recommended to prevent syntax/escaping issues).

---

## GitHub App Configuration Steps

1. Go to **Settings > Developer Settings > GitHub Apps** and click **New GitHub App**.
2. Set the following fields:
   - **GitHub App name**: `Your App Name` (slug will map to `NEXT_PUBLIC_GITHUB_APP_NAME`)
   - **Homepage URL**: `https://yourdomain.com` (or `http://localhost:3000` for dev)
   - **Callback URL**: `https://yourdomain.com/github/callback` (or `http://localhost:3000/github/callback` for dev)
3. Set the following **Repository Permissions**:
   - **Actions**: `Read and write` (required to view workflow status, runs, logs, and toggle/enable/disable workflows)
   - **Metadata**: `Read-only` (automatically required/selected)
4. Under **Where can this GitHub App be installed?**, select **Any account** (to allow users to install it on their personal forked repositories).
5. Save the App.
6. Generate a **Private Key** at the bottom of the App settings page, download the `.pem` file, and set it in `GITHUB_APP_PRIVATE_KEY` (optionally base64 encode it using `cat key.pem | base64`).

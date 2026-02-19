<<<<<<< HEAD
## Welcome to GitHub Pages

You can use the [editor on GitHub](https://github.com/albertlg/legoodanfitrion.com/edit/main/README.md) to maintain and preview the content for your website in Markdown files.

Whenever you commit to this repository, GitHub Pages will run [Jekyll](https://jekyllrb.com/) to rebuild the pages in your site, from the content in your Markdown files.

### Markdown

Markdown is a lightweight and easy-to-use syntax for styling your writing. It includes conventions for

```markdown
Syntax highlighted code block

# Header 1
## Header 2
### Header 3

- Bulleted
- List

1. Numbered
2. List

**Bold** and _Italic_ and `Code` text

[Link](url) and ![Image](src)
```

For more details see [GitHub Flavored Markdown](https://guides.github.com/features/mastering-markdown/).

### Jekyll Themes

Your Pages site will use the layout and styles from the Jekyll theme you have selected in your [repository settings](https://github.com/albertlg/legoodanfitrion.com/settings/pages). The name of this theme is saved in the Jekyll `_config.yml` configuration file.

### Support or Contact

Having trouble with Pages? Check out our [documentation](https://docs.github.com/categories/github-pages-basics/) or [contact support](https://support.github.com/contact) and we’ll help you sort it out.
=======
# LeGoodAnfitrion MVP

Initial project skeleton for a mobile-first MVP with:

- Frontend service (React + Vite) running in Docker
- GitHub Actions for CI
- GitHub Actions for automated deploy to Vercel (optional)

## 1) Local setup from zero

Prerequisites:

- Docker Desktop
- Git
- A private GitHub repository

Run locally with Docker:

```bash
docker compose up --build
```

Open: <http://localhost:5173>

Stop services:

```bash
docker compose down
```

## 2) Connect to private GitHub repo

If your current folder is already a git repo, set or update remote:

```bash
git remote remove origin 2>/dev/null || true
git remote add origin git@github.com:albertlg/legoodanfitrion.com.git
git branch -M main
git add .
git commit -m "chore: bootstrap mvp frontend docker and ci"
git push -u origin main
```

## 3) CI pipeline (GitHub Actions)

Workflow file: `.github/workflows/ci.yml`

On each push/PR:

- installs dependencies
- runs lint
- runs build

## 4) Automated deploy to Vercel (optional)

Workflow file: `.github/workflows/deploy-vercel.yml`

Required repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Deploys on pushes to `main` and via manual trigger.

## 5) Suggested next MVP backend stack

- Mobile app builder: FlutterFlow (fast MVP iterations)
- Backend/data/auth/storage: Supabase
- Automations/integrations: n8n
- Payments: Stripe
- Messaging/notifications: OneSignal + email provider

This repository currently includes only the frontend service and CI/CD bootstrap.

>>>>>>> 6ad1779 (chore: bootstrap mvp frontend docker and ci)

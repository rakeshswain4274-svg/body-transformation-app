TRANSFORM PRO AI v3 — INSTALLATION AND SECURITY

1. Back up your existing app data from the current app before updating.
2. Upload all top-level app files to the existing public GitHub repository root.
3. Keep the same GitHub Pages URL and the existing Home Screen installation.
4. Wait for GitHub Pages deployment, open the app online once, and accept the update prompt or reload.
5. Test offline in Airplane Mode. AI Coach works with local rules even without a backend.

ONLINE AI IS OPTIONAL AND NOT ACTIVE UNTIL YOU DEPLOY THE SEPARATE BACKEND.
See backend/README.txt for deployment and secrets. Do not upload backend files to your Pages repository.

Your saved fitness data remains in IndexedDB. AI history is saved locally and included in the app backup.
No OpenAI API key belongs in the public app files.
The optional backend token is entered in the app and held only in memory until reload.
Public GitHub Pages is NOT a private hosting service; keep personal records out of the repository.

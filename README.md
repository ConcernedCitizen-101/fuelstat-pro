FuelStat Pro ⛽

A 100% free, zero-ad public utility for Indian citizens to monitor fuel prices and report black-market surcharges during energy crises.

Project Structure

fuel_stat_india.jsx: The React frontend application.

fuelstat_autopilot.py: The Python bot that fetches and syncs OMC fuel rates.

.github/workflows/autopilot.yml: GitHub Actions automation to run the sync bot daily.

LICENSE: Open-source MIT license.

Setup Instructions

GitHub Repository: Upload all files to your main repository page.

Workflow Folder: Ensure autopilot.yml is inside a folder named .github/workflows/.

Secrets: Add your Firebase Service Account JSON as a secret named FIREBASE_SERVICE_ACCOUNT in GitHub Repository Settings.

Deploy: Deploy the React file to Firebase Hosting or Vercel.

Design Mandate

Strictly follows a "Roger Deakins" cinematic aesthetic: deep obsidian blacks, high-contrast typography, and tungsten accents.

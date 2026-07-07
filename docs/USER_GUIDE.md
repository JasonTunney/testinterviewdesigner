# Interview Designer — Manager's Guide

*A practical guide for So Energy hiring managers and interview panelists.*

---

## 1. What this system does

Interview Designer helps you run consistent, high-quality hiring at So Energy. For any open role you:

1. Create a **requisition** (job title + your requisition ID) and let AI design a best-practice **interview kit** for it.
2. Run the interviews, capturing structured notes and scores.
3. Hold a **wash-up** to reach a fair, bias-aware decision.
4. Record who you **hired** and, three months later, rate how the hire is performing.

That final rating feeds a **Quality-per-Hire leaderboard**, so we learn which interview panels are consistently making great hiring decisions.

**Where to sign in:** https://testinterviewdesigner-vecq.vercel.app

---

## 2. Getting access

- Accounts are **created by an administrator** — there is no self sign-up. If you can't log in, ask your admin to set you up.
- You'll receive an email and a temporary password. Sign in at the link above.
- There are three access levels: **Interviewer**, **Hiring Manager**, and **Admin**. Most managers are Hiring Managers; Admins additionally manage people, logins, and company settings.

---

## 3. The home dashboard

After signing in you land on **Home**, which shows:

- **New requisition** — the button to start a new hire.
- **Candidate code** search — jump straight to a candidate using their short code.
- **Quality per Hire** — your personal average hire rating.
- **Interviews assigned** — how many interviews you're on.
- **Pending 3-month ratings** — hires you manage that are now due a rating.
- **Quality per Hire leaderboard** — how panels across So Energy are performing.
- **Your interviews** and **3-month hire ratings due** — your action lists.

The top navigation (**Home · History · People · Settings**) is available on every page.

---

## 4. Creating a requisition and interview kit

1. On Home, click **New requisition**.
2. Enter the **Job title** (e.g. *Data Analyst*) and your **Requisition ID** — the reference from your ATS/hiring system (e.g. *REQ-1042*). Each requisition ID can only be used once.
3. Provide the **job description**: drag in a file, click **Browse files**, or paste the text. Supported files are `.txt`, `.pdf`, `.docx`, and images. (Old `.doc` files aren't supported — save as `.docx` or PDF, or paste the text.)
4. If it's an **interim or internal** role, flip the toggle for a streamlined single-stage process.
5. Click **Design Interview Process**.

The AI produces a tailored interview kit — stages, questions, and 1–5 scoring guides — and saves it **against your requisition ID**. You're taken straight to the requisition workspace.

> **Panelist recommendations:** the AI only ever recommends **real people from your People directory** — it will never invent a job title or a person So Energy doesn't have. If nobody in the directory fits a stage, it leaves that panel empty and explains the gap, rather than making someone up.

---

## 5. The requisition workspace

This is your hub for the role. At the top you'll see the **job title, requisition ID, and status** (open / filled / closed). Below that:

### The interview kit
Each stage lists its purpose, suggested duration, questions, and a full 1–5 scoring rubric for every question. You can **edit or remove stages** while the kit is in draft. When you're happy, click **Submit Plan** to lock it (this prevents further edits and signals the kit is final).

- **Share Link** copies a link to the kit for colleagues.
- **PDF** downloads the kit as a document (you'll be asked for your name as the publisher).

### Candidates (optional)
Add the people you're interviewing under **Candidates**. Each gets a unique **short code** you can share with panelists so they can open the right scorecard. Candidates are where interview notes and wash-ups live — see sections 6–7.

### Record hire
When the role is filled, use **Record hire**: enter the hired person's name, optional email, and start date, then **Mark filled**. This starts the three-month Quality-per-Hire clock.

### 3-month hire rating
Once a requisition is filled, a rating card appears. Three months after the start date it also shows up on your Home dashboard under *3-month hire ratings due*. Give the hire a 1–5 score (and an optional comment). This single score is what credits your interview panel on the leaderboard.

---

## 6. Running an interview (panelists)

1. Open the candidate — either from the **Candidates** list on the requisition, or by entering their **short code** in the Home search box.
2. You'll see the interview stages as tabs. For each question, use the **1–5 buttons** to score and the notes field to record evidence.
3. Click **Save** as you go. Your notes are private to you until the wash-up is closed.

Scoring consistently against the provided rubric is what makes comparisons across candidates fair — please use the descriptions for each score rather than a gut number.

---

## 7. The wash-up (making the decision)

From a candidate, click **Wash-up** to run a structured, bias-aware decision session:

1. **Blind scores** — each panelist submits a private overall 1–5 score for the hire decision. You can't see others' scores until the session is closed, which prevents anchoring.
2. **Close the session** — once everyone has scored, closing it reveals all scores and notes and generates an **AI wash-up summary**: common themes, gaps against the job description, and points worth discussing before you decide.

Use the summary to guide the conversation, not to replace it.

---

## 8. The Quality-per-Hire leaderboard

This is how So Energy measures interviewing quality over time.

- Every requisition that gets **filled** and then **rated at three months** produces one hire-quality score.
- That score is credited to **every panelist named on that requisition's interview kit**.
- Your **Quality per Hire** is the average of all the hire scores you've been credited with.

In short: **being on the panels that pick great hires is what moves you up the leaderboard.** It rewards good collective hiring decisions, not interview volume.

> For your name to appear on a kit — and therefore earn Quality-per-Hire credit — you need to be in the **People directory** *and* have a **login** whose email matches your directory entry. Your admin sets this up.

---

## 9. For admins: managing people, skills, and access

Admins have extra tools on the **People** page and in **Settings**.

**People page → Team access (admins only):**
- **Create login** — provision an account for a colleague: name, email, a generated temporary password, and a role (Interviewer / Hiring manager / Admin). Share the temporary password with them directly.
- **Bulk import directory** — upload an Excel file (columns: **Name**, **Role**, **Email**, **Skills**) to populate the People directory in one go. Skills are comma-separated, with optional proficiency like `Data Analysis:4`. **Each upload replaces the entire directory.** Ask for the *People upload template* if you need it.

**People page → directory & skills:**
- Add individual people, and assign each person **skills with a 1–5 proficiency**. The AI uses these skills and roles to recommend the right panelists for each interview stage.
- The **Skills library** holds the shared skills taxonomy; you can add new skills as needed.

**Settings (admin, password-protected):**
- Company profile — name, values, hiring philosophy, competency framework, and limits on stage/question counts. These feed the AI so kits reflect how So Energy hires.

**History (admins only):** browse previously generated interview kits.

---

## 10. A typical end-to-end example

1. **Admin** bulk-imports the team and creates logins for the interview panel.
2. **Hiring manager** creates requisition *REQ-1042 · Data Analyst*, uploads the JD, and generates the kit. The AI recommends real So Energy panelists based on their skills.
3. Panelists interview the shortlisted candidates, scoring against the rubric.
4. The panel runs a **wash-up**, reviews the AI summary, and decides.
5. The manager **records the hire** on the requisition.
6. **Three months later**, the manager rates the hire — and everyone who was on that kit gets Quality-per-Hire credit.

---

## 11. Tips & good practice

- **Enter a real requisition ID** that matches your ATS so records line up across systems.
- **Keep the People directory current** — accurate roles and skills give better panel recommendations.
- **Use the rubric descriptions** when scoring, not just a number, so candidates are compared fairly.
- **Submit the kit** once finalized to lock it and signal it's ready to run.
- **Don't skip the 3-month rating** — it's the signal that makes the whole Quality-per-Hire system work.

---

*Questions or access issues? Contact your Interview Designer administrator.*

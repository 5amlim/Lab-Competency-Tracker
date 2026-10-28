# Sollis Lab Competency Hub

A responsive website to manage staff test-system training, initial competency, six-month competency, annual renewals, evidence files, and offboarding. Developed from the uploaded instrument training checklist archive.

## First: open the interactive demo

1. Unzip the project.
2. On a Mac, double-click `START_HERE.command` (if macOS blocks it, open Terminal, `cd` into the project, and run `bash START_HERE.command`).
3. On Windows, double-click `START_HERE.bat` (requires Python installed).
4. Or use any terminal from this folder: `python3 -m http.server 8765 --bind 127.0.0.1`, then open `http://localhost:8765`.
5. **The demo contains fictional employees.** Add people, assign instruments, complete assessments, upload sample PDFs, and offboard a fictional employee to test the flow.

The demo stores metadata in **localStorage** and document bytes in **IndexedDB** on the current browser/device. It does not email reminders, synchronize between locations or provide private multi-user access. Browser data can be wiped or lost. **Do not use it for real employee records, company-confidential documents or regulatory evidence.** Metadata export in Settings deliberately does not claim to back up uploaded file bytes.

## Easiest document storage, especially if you already use Microsoft 365

**Use a restricted SharePoint document library.** It is easier to administer than building a custom file repository, gives you organization-managed permissions and retention, and works with existing Microsoft 365/Power Automate workflows.

Suggested library: `Lab Competency Records` with folders:

```
Lab Competency Records/
  Reference Checklists/
    Sofia 2/
    PATHFAST/
    Piccolo/
    Sysmex/
    ...
  Employees/
    [Employee ID]/
      [Test system]/
        Initial Training/
        Initial Competency/
        6-Month/
        2026 Annual/
        2027 Annual/
  Offboarded/
    [Employee ID]/
```

Avoid exposing employee termination details in broad SharePoint folder names or file names. Restrict access to authorized lab leadership/HR. Turn off anonymous/anyone links. Set retention and legal hold rules with IT/HR. In this website, open an assessment and select **Link SharePoint file**. The app stores the pointer; the file stays in SharePoint and follows its permissions. **The app cannot automatically provision SharePoint folders or verify a link's permissions.**

## Alternative: direct file upload from the website

Supabase (PostgreSQL/Auth/private Storage) is included as a ready-to-configure cloud backend. It keeps files alongside assessment metadata and avoids manual SharePoint links. This is easiest technically for an integrated website, but it adds a vendor, cost, security review and backup/retention responsibilities.

### Cloud setup

1. Create an **organization-approved** Supabase project. Ask IT/security to approve vendor, data classification, residency, SSO/identity, backups, retention, and any applicable HIPAA/BAA needs. **This starter is not security-certified or compliance-certified.** Avoid patient information in any evidence files.
2. Run `supabase/schema.sql` in Supabase SQL Editor. The schema enables RLS, access policies, a private 25 MB document bucket, audit events and immutable completed assessment records.
3. In Supabase > Authentication > Users, create/invite the first administrator. Copy their Auth user UUID.
4. SQL Editor: `insert into public.app_users(user_id,role,allowed_sites) values ('UUID-FROM-AUTH','admin','{}');`
5. For staff with restricted access: `insert into public.app_users(user_id,role,allowed_sites) values ('UUID-FROM-AUTH','manager',ARRAY['Beverly Hills Flagship','Santa Monica']);` or use `viewer` (read only). **Use least-privilege roles.** Employee records in this tracker do not automatically create Auth accounts.
6. Change `config.js`:
   ```js
   window.COMPETENCY_CONFIG = {
     SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
     SUPABASE_ANON_KEY: 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY',
     APP_URL: 'https://YOUR-PRIVATE-WEBSITE.example',
     DEMO_MODE: false
   };
   ```
   Never use the `service_role` / secret key here. The publishable key is only safe when all policies are correctly applied.
7. Host ONLY the contents of the separate **Lab-Competency-Tracker-Web-Only.zip** on an approved private website/host. That web-only package intentionally excludes training templates, development scripts and backend secrets. Never deploy the full project ZIP. GitHub Pages is publicly accessible as a site and is **not** a private host. Restrict the web app itself with organizational authentication as well as Supabase. Test user access across sites with separate accounts.
8. Upload your starter files privately via the **Documents > Upload template** workflow. `private_templates/` is intentionally **not** in the website public folder. Never put training materials or employee files in a public GitHub repository.
9. Configure backups, recovery testing, document retention, monitoring, disaster recovery, and access removal as an organizational IT project before real launch.

### Automatic email reminders (optional)

The site always shows due/overdue items. To send emails automatically:

1. Have an approved mail provider and verified sending domain (the included function uses Resend; your IT team can replace it with Microsoft Graph/Power Automate if preferred).
2. Deploy `supabase/functions/send-reminders` as a Supabase Edge Function. Protect it with `CRON_SECRET` as coded. Configure function authentication so the scheduled caller can reach the function; for this dedicated cron endpoint, turn off Supabase's default JWT verification **only** if the custom `x-cron-secret` check is enabled and the URL is appropriately controlled. Follow organizational threat review.
3. In Supabase function secrets configure: `RESEND_API_KEY`, `REMINDER_TO` (comma-separated admin email addresses), `REMINDER_FROM` (verified sender), `CRON_SECRET` (long random string), `APP_URL` (HTTPS). Supabase provides the project URL and service-role credential to the function runtime.
4. In GitHub repository settings > Actions secrets, create `APP_REMINDER_ENDPOINT` (the Edge Function full HTTPS URL) and `APP_CRON_SECRET` (the same secret).
5. Enable the provided `.github/workflows/competency-reminders.yml` scheduled workflow and run **workflow_dispatch** to test with dummy records. The send function sends counts and a sign-in link, not employee names. Rules: 30, 14, 7, 0 days, then 1, 8, 15, 22... days overdue; records are skipped once completed or offboarded. Notification history is saved in `reminder_logs` to reduce repeat sends.
6. Check the automation run log, sender domain, local timezone, delivery and failure alerts. Scheduling is not operational just because the project ZIP includes a workflow.

**If using SharePoint instead:** use a SharePoint List with a Due Date column and Power Automate **Set a reminder** / a scheduled flow. This is the simplest no-code email reminder. The app's in-app reminders do not automatically sync with SharePoint List due dates.

## Markets and site directory

The site list is grouped into four markets. Each location is saved by its full site name, while the market is derived from that site.

| Market | Sites |
|---|---|
| Southern California (SoCal) | Beverly Hills Flagship, Beverly Hills Satellite, Santa Monica, Manhattan Beach |
| Northern California (NorCal) | San Francisco, Palo Alto |
| Florida (FL) | Boca Raton, Palm Beach, Coral Gables |
| New York (NY) | Upper East Side, Tribeca, Hamptons, Fifth Avenue, Gramercy, Hudson Yards |

Use the market filter to narrow the site dropdown. When adding an employee, choose a market first and then a site. Pre-existing generic locations such as `Florida`, `New York`, `San Leandro`, or `Short Pump` are preserved as legacy assignments for review rather than automatically mapped to a different clinic. The original fictional demo employees are migrated to their intended named locations in local browser storage. Before connecting a real Supabase workspace, update `app_users.allowed_sites` to these exact full-site values.

## Employee onboarding and site instrument presets

The new-employee form has a market and site selector, then a preloaded instrument catalog for that site. The employee's individual instruments are explicitly checked before creating their competency milestones. **Site availability does not mean the employee is trained or competent.** Each checked instrument starts with pending initial training/assessment, 6-month, and annual milestones, using the entered per-employee baseline date. Add other instruments later from the employee profile.

All 15 sites share the same instrument catalog except **Beverly Hills Flagship** and **Beverly Hills Satellite**, which additionally offer **BioFire TORCH**. The site-specific rule applies when adding an employee and when assigning systems later. Reference templates must still be uploaded separately.

The interface uses custom site/market/test-system selectors that appear inside the website, not browser-native dropdowns. The original `select` elements remain in the DOM for validated form submission, and the menus support keyboard focus and Escape. The assessment form includes a progress indicator and a fixed action footer, while reference uploads use a styled file-picker button.

## Competency design

Each *employee + test system* has its own first-testing date, selected test complexity/policy and schedule:

| Stage | Suggested due date | Evidence |
|---|---|---|
| Initial training | Before independent testing | Trainer checklist, SOP/IFU review, QC practice |
| Initial competency | Before independent testing | Six methods for nonwaived, assessor, observations |
| First-year 6-month | Six months after the test-system baseline | Assessment evidence |
| First annual | Twelve months after baseline | Assessment evidence |
| Subsequent annuals | Every twelve months after baseline | Assessment evidence |

The app pre-generates future annual milestones and locks completed assessments. For nonwaived testing, the six elements are covered individually. Waived testing has site-policy flexibility; **verify the CLIA complexity and applicable accreditation standard for every assay/instrument combination before assigning policies**. Training is separate from competency, and completing training alone does not authorize independent patient testing. The lab director/qualified consultant or supervisor determines and documents the policies, assessor qualifications and actual due dates. The starter's 6- and 12-month offsets are planning defaults, not a substitute for regulatory policy.

## Offboarding

A manager with the `admin` role can mark an employee as `resigned` or `terminated`. Competency reminders then exclude them; historical assessments, documents and audit history remain visible to authorized staff. The website **does not** deactivate the person's Supabase Auth account, revoke SharePoint links, or perform HR/IT access removal. Do those steps through your company's identity and HR offboarding process.

## Included templates

The full set of source PDF/DOCX checklists is in `private_templates/` and can be uploaded into the website's private template library. PATHFAST, Triage and FebriDx are listed as platforms but **no source checklist was uploaded for those systems**. Add validated source templates before operational use.

## Important current limitations

- Cloud backend requires your own project and credentials; this download is **not deployed or connected** to a production service.
- Initial cloud deployment is manual and needs access control/security review. No company SSO integration, admin self-service role management or automatic employee identity deprovisioning yet.
- No compliant electronic-signature implementation: assessor sign-off is a typed attribution plus audit event, not a legally verified electronic signature. Upload a properly signed form or link an approved e-signature tool where necessary.
- Annual deadlines are relative to **per-platform first-testing date**; custom dates and site-specific competency policies require an enhancement. Exception handling and remediation sign-off workflows should be reviewed with clinical leadership.
- The frontend paginates cloud records in batches of 1,000, with a safety limit of 50,000 rows per table. Production-scale rollouts should add server-side filters and admin reporting.
- Do not include patient names, MRNs, DOBs, or identifiable clinical test results in evidence attachments unless the storage system and workflow are expressly approved for those data.

## What to deploy, and what not to deploy

- **Lab-Competency-Tracker.zip**: the complete source, backend setup, and private templates. Keep it private. Never deploy or commit this whole directory to a public host.
- **Lab-Competency-Tracker-Web-Only.zip**: safe web source package without the uploaded checklists. This is the static website to upload to an organization-approved host (after configuring `config.js`). Note that a public URL can still reveal the app UI; Supabase Auth and RLS secure its real data after setup.
- The local start scripts bind to `127.0.0.1` so they do not expose the demo to coworkers on the local network.
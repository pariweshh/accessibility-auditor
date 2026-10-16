# Legal Master Agreement: Terms of Service, Privacy Policy & Compliance Disclaimers

> **Document Status:** Active & Legally Binding  
> **Entity:** Equivance (`accessibility-auditor`)  
> **Effective Date:** October 15, 2026  
> **Target Legal Frameworks:** United States Federal Law (ADA Title III, Section 508), State Law (California Unruh Civil Rights Act, CCPA/CPRA), European Union Law (European Accessibility Act 2025, GDPR, EU Web Accessibility Directive).

---

## Executive Plain-English Summary

We believe legal agreements should be honest, straightforward, and readable. Before getting into the detailed terms, here are the core principles you need to know:

1. **Automated audits catch roughly 30% to 50% of accessibility issues.** No automated software in the world can make a website "100% compliant" or provide legal immunity from accessibility lawsuits. A complete accessibility program always requires manual testing by human specialists and individuals with disabilities.
2. **We provide an engineering diagnostics tool, not legal advice.** We are software engineers, not your legal counsel. Using Equivance does not establish an attorney-client relationship.
3. **AI code suggestions are drafts for your developers to review.** While our AI remediation engine is trained on WCAG 2.2 specifications, your engineering team must review, test, and validate any generated code before pushing it to production.
4. **You must have permission to scan the sites you enter.** Do not use our service to launch denial-of-service attacks, scan private internal networks, or scrape protected data.
5. **We respect your privacy.** We never sell your personal information or audit data to third-party data brokers.

---

## 01 Terms of Service (TOS)

### 1. Acceptance of Terms
By accessing or using the Equivance website (`equivance.app`), APIs (`/api/scan`, `/api/fix-suggestions`, `/api/keys`), dashboard, or generated compliance reports (collectively, the **"Service"**), you agree to be legally bound by these Terms of Service. If you are entering into this agreement on behalf of a company, agency, or other legal entity, you represent that you possess the authority to bind that entity.

### 2. Description of the Service
Equivance provides automated web accessibility diagnostics, WCAG 2.2 Level A/AA rule checking (via axe-core), manual verification checklists, AI-assisted code remediation suggestions (via OpenAI), API endpoints for CI/CD pipelines, and PDF report synthesis.

### 3. User Accounts & API Keys
* **Account Security:** You are responsible for safeguarding the credentials and magic login links associated with your account.
* **API Key Responsibility:** API keys (`aud_live_...`) issued through your dashboard grant programmatic access to your account and quota. You are solely liable for any actions, scans, or charges incurred through your API keys.
* **Immediate Revocation:** If you suspect an API key has been compromised, you must immediately revoke it through your dashboard key settings.

### 4. Subscription Tiers, Billing & Quotas
* **Plan Tiers:** The Service offers Free, Pro, and Agency subscription tiers with distinct monthly scanning allowances as defined in our documentation (`lib/constants.ts`).
* **Usage Quota:** Quotas reset on the first day of each calendar month at 00:00 UTC. Unused scans do not roll over to subsequent months.
* **Payment Processing:** All payments, recurring subscriptions, and invoicing are handled through Stripe. By subscribing to a paid tier, you authorize recurring monthly charges to your selected payment method until canceled.
* **Cancellation & Refunds:** You may cancel your subscription at any time via the Customer Portal. Cancellation takes effect at the conclusion of the current prepaid billing cycle. Because compute costs (headless browser runtime and LLM tokens) are incurred immediately upon scanning, all subscription payments are non-refundable except where required by applicable consumer law.

### 5. Acceptable Use & Target Website Authorization
* **Scanning Authority:** You represent and warrant that you own, operate, or have explicit authorization from the owner to audit and submit each URL you process through our Service.
* **Prohibited Activities:** You agree not to:
  1. Input local network hostnames, loopback addresses (`localhost`, `127.0.0.1`), or private subnets (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`) in attempt to execute Server-Side Request Forgery (SSRF).
  2. Attempt to bypass, tamper with, or circumvent subscription quotas, API key rate limits, or access controls.
  3. Reverse engineer, decompile, or extract the source code of our scanning orchestrator or proprietary backend services.
  4. Resell, sublicense, or white-label the Service unless explicitly authorized under an Agency enterprise contract.
  5. Use the Service to audit websites containing malicious code, child exploitation material, or content intended to disrupt public infrastructure.

---

## 02 Accessibility Compliance & Non-Reliance Disclaimer (The "Anti-Lawsuit Shield")

> ### CRITICAL NOTICE — READ THIS SECTION CAREFULLY
> **THIS SECTION DETAILS IMPORTANT LIMITATIONS OF AUTOMATED TESTING AND RELEASES US FROM LEGAL LIABILITY REGARDING YOUR REGULATORY COMPLIANCE STATUS.**

### 1. The Reality of Automated Accessibility Testing
Web Content Accessibility Guidelines (WCAG 2.2 Levels A, AA, and AAA) contain numerous subjective and context-dependent success criteria that **cannot be evaluated by any automated script or algorithm**. Examples include, but are not limited to:
* Determining whether an image's `alt` description accurately conveys the contextual purpose of the image.
* Verifying whether a multi-step user flow makes cognitive sense.
* Ensuring focus order and visual flow match the user's logical intent.
* Confirming compatibility across diverse third-party assistive technologies (e.g. JAWS, NVDA, VoiceOver, TalkBack, refreshable braille displays).

**Industry consensus, Deque Systems, the W3C, and international regulatory bodies confirm that automated scanning tools only test approximately 30% to 50% of WCAG criteria.**

### 2. No Guarantee of Legal Compliance or Immunity
* **No Warranty of Conformance:** We make **NO WARRANTY, EXPRESS OR IMPLIED**, that any website, application, or digital asset audited by Equivance is fully compliant with WCAG 2.0, WCAG 2.1, WCAG 2.2, Section 508 of the Rehabilitation Act, Title III of the Americans with Disabilities Act (ADA), California's Unruh Civil Rights Act, the European Accessibility Act (Directive 2019/882), or any other global accessibility standard.
* **No Shield Against Litigation:** Using Equivance does **NOT** provide a legal defense, certification of compliance, safe harbor, or immunity from demand letters, regulatory enforcement, civil complaints, or class-action lawsuits.
* **Non-Reliance Clause:** You acknowledge that you will not rely on our scan results, score percentages, or PDF reports as conclusive legal proof of accessibility compliance. You agree that comprehensive compliance requires ongoing manual testing, code review, user testing by individuals with disabilities, and consultation with qualified legal counsel specializing in disability law.

### 3. No Legal or Professional Advice
All information, rule descriptions, severity ratings, and fix explanations provided by the Service are for technical and informational purposes only. None of the content provided by Equivance constitutes legal advice, statutory interpretation, or formal accessibility auditing certification.

---

## 03 AI-Generated Fix Suggestions Disclaimer

### 1. Experimental Nature of Generative Code
The fix suggestions provided through `/api/fix-suggestions` are generated by artificial intelligence models (OpenAI GPT-4o and GPT-4o-mini). While we engineer targeted prompts and reference WCAG guidelines:
* AI models can produce hallucinations, syntax errors, or code that is incompatible with your specific JavaScript framework, CSS architecture, or build environment.
* An AI-suggested code fix may resolve one specific accessibility issue (such as adding an `aria-label`) while unintentionally breaking application behavior, styling, or introducing regressions.

### 2. Mandatory Human Developer Review
* **You are solely responsible for reviewing, testing, sanitizing, and validating any code fix before integrating it into a production codebase.**
* Equivance disclaims all liability for website downtime, functional bugs, broken checkout flows, loss of revenue, or security vulnerabilities caused by deploying AI-generated code.

---

## 04 Privacy Policy & Data Processing (GDPR & CCPA/CPRA Compliant)

### 1. Information We Collect
1. **Account Information:** When you sign up via Magic Link, we collect your email address and generate a unique user identifier (`UUID`) in our Supabase authentication database.
2. **Audit Targets & URLs:** We store the URLs you submit for auditing, timestamps, scan statuses, violation counts, and axe-core evaluation JSON payloads.
3. **Billing Information:** We do not collect or store full credit card numbers. All payment data is processed directly by Stripe under PCI-DSS Level 1 certification. We retain only Stripe customer IDs, subscription IDs, and active plan statuses.
4. **API Keys:** We store only cryptographically secure SHA-256 hashes of your API keys and truncated previews (`aud_live_...`).

### 2. How We Use Your Information
* To provision and operate the scanning engine.
* To enforce monthly usage limits based on your subscription tier.
* To render historical trend graphs and score comparisons in your private dashboard.
* To communicate transactional updates (magic sign-in links, subscription receipts, critical system notices) via Resend.
* **We do not sell, rent, or trade your personal data or audit records to advertisers or third-party data brokers.**

### 3. Subprocessors
We engage reputable third-party infrastructure providers who adhere to strict data processing standards:
* **Supabase Inc:** Hosted PostgreSQL database, Authentication, Realtime WebSockets, and Storage.
* **Vercel Inc:** Web application hosting and serverless Edge compute.
* **Browserless Inc:** Ephemeral headless browser execution cluster.
* **OpenAI LLC:** Large language model API for generating code fixes (data submitted via API is not used to train public OpenAI models).
* **Stripe Inc:** Payment processing and subscription management.
* **Resend Inc:** Transactional email delivery.

### 4. Data Retention & Your Rights (GDPR & CCPA)
* **Right to Erasure (Delete Account):** You may delete your account and all associated scan history, violations, and API keys at any time through the Settings modal. Deleting your profile cascades through the database and permanently removes all stored scan records.
* **Data Portability:** You can export your audit results at any time via web report or downloadable PDF.

---

## 05 Limitation of Liability & Indemnification

### 1. Disclaimer of Warranties
**THE SERVICE IS PROVIDED STRICTLY ON AN "AS IS" AND "AS AVAILABLE" BASIS. TO THE MAXIMUM EXTENT PERMITTED BY LAW, EQUIVANCE DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.**

### 2. Cap on Liability
**IN NO EVENT SHALL EQUIVANCE, ITS FOUNDERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOSS OF REVENUE, LOSS OF REPUTATION, LOSS OF DATA, SYSTEM DOWNTIME, OR LEGAL SETTLEMENT COSTS ARISING FROM YOUR USE OF THE SERVICE, AUDIT REPORTS, OR AI-GENERATED CODE.**

**NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED HEREIN, OUR TOTAL LIABILITY TO YOU FOR ANY CAUSE WHATSOEVER AND REGARDLESS OF THE FORM OF THE ACTION, WILL AT ALL TIMES BE LIMITED TO THE AMOUNT PAID, IF ANY, BY YOU TO EQUIVANCE DURING THE TWELVE (12) MONTH PERIOD PRECEDING THE CLAIM, OR ONE HUNDRED US DOLLARS ($100), WHICHEVER IS GREATER.**

### 3. User Indemnification
You agree to defend, indemnify, and hold harmless Equivance, its affiliates, contractors, and employees from and against any claims, liabilities, damages, losses, expenses, settlements, and legal fees (including reasonable attorney's fees) arising out of or in connection with:
1. Your violation of these Terms;
2. Any demand letter, claim, arbitration, administrative complaint, or lawsuit filed by any individual or entity alleging that a website, application, or digital asset audited by you through the Service fails to comply with WCAG, the ADA, the European Accessibility Act, or any disability rights legislation;
3. Your unauthorized scanning of websites you do not own or have permission to audit;
4. Any defect, runtime failure, or vulnerability introduced into your software by deploying an AI-suggested code remediation.

---

## 06 Governing Law & Dispute Resolution

* **Governing Law:** These Terms and any dispute arising out of or relating to them shall be governed by and construed in accordance with the laws of Delaware, United States, without regard to its conflict of law principles.
* **Informal Resolution:** Before initiating formal legal proceedings, both parties agree to attempt in good faith to resolve the dispute informally by contacting `legal@equivance.app`.
* **Binding Arbitration:** Any unresolved dispute shall be resolved through confidential, binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules. You waive any right to participate in a class-action lawsuit or class-wide arbitration against Equivance.

---

## 07 Contact & Legal Inquiries

If you have questions regarding these Terms, the Privacy Policy, or our Accessibility Compliance Disclaimers, please contact our legal compliance team:

* **Email:** `legal@equivance.app`
* **Security Reporting:** `security@equivance.app`
* **Address:** Equivance Legal Department, San Francisco, CA.

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-[#1a0f0a] via-[#2d1b14] to-[#1a0f0a] text-text-primary">
      <div class="max-w-3xl mx-auto px-6 py-12">
        <a routerLink="/" class="inline-flex items-center gap-2 text-accent hover:underline mb-8 text-sm">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Back to Ember Exchange
        </a>

        <h1 class="text-3xl font-bold mb-2 bg-gradient-to-br from-accent via-[#f48c06] to-[#ffba08] bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        <p class="text-text-secondary text-sm mb-10">Last updated: May 29, 2026</p>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">1. Data Controller</h2>
          <p class="text-text-secondary leading-relaxed">
            Ember Exchange is operated as a private project. The data controller responsible for your personal data
            is the project owner, reachable at
            <a href="mailto:support@emberexchange.xyz" class="text-accent hover:underline">support&#64;emberexchange.xyz</a>.
            This Privacy Policy explains how we collect, use, and protect your data in compliance with the
            EU General Data Protection Regulation (GDPR).
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">2. What Data We Collect</h2>
          <div class="text-text-secondary leading-relaxed">
            <p class="mb-3">We collect only the data necessary to operate the Service:</p>
            <ul class="list-disc pl-5 space-y-1">
              <li><strong>Account data:</strong> username, email address, password (hashed), and optional 2FA settings.</li>
              <li><strong>Profile data:</strong> public motto, avatar, showcase preferences, and privacy settings.</li>
              <li><strong>Game data:</strong> virtual inventory, currency balances, trades, game history, and statistics.</li>
              <li><strong>Social data:</strong> chat messages, friend lists, visits, and guestbook entries.</li>
              <li><strong>Technical data:</strong> IP address (for security and rate limiting), session IDs, and browser type.</li>
              <li><strong>Security data:</strong> Turnstile challenge responses (processed by Cloudflare), violation logs, and security event logs (failed logins, rate-limit hits, suspicious requests).</li>
            </ul>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">3. How We Use Your Data</h2>
          <div class="text-text-secondary leading-relaxed">
            <ul class="list-disc pl-5 space-y-1">
              <li>To provide and maintain the Service (account management, marketplace, games).</li>
              <li>To secure the platform (fraud detection, bot prevention, IP banning for abuse, exploit patching).</li>
              <li>To communicate with you (email verification, password resets, critical announcements).</li>
              <li>To generate aggregate statistics (never identifying individual users).</li>
              <li>To enforce our Terms of Service and comply with legal obligations.</li>
            </ul>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">4. Legal Basis (GDPR)</h2>
          <div class="text-text-secondary leading-relaxed">
            <ul class="list-disc pl-5 space-y-1">
              <li><strong>Contract:</strong> Processing necessary to provide the Service you signed up for.</li>
              <li><strong>Legitimate interest:</strong> Security, fraud prevention, and platform integrity.</li>
              <li><strong>Consent:</strong> Optional features like public profile visibility and marketing emails.</li>
              <li><strong>Legal obligation:</strong> Compliance with applicable laws and regulatory requests.</li>
            </ul>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">5. Cookies & Tracking</h2>
          <p class="text-text-secondary leading-relaxed">
            We use essential session cookies to keep you logged in. We do not use third-party advertising cookies.
            Cloudflare Turnstile may set cookies or use local storage to distinguish humans from bots.
            See <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">Cloudflare's Privacy Policy</a> for details.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">6. Data Sharing</h2>
          <p class="text-text-secondary leading-relaxed mb-3">
            We do not sell your personal data. We share data only with:
          </p>
          <ul class="text-text-secondary leading-relaxed list-disc pl-5 space-y-1">
            <li><strong>Cloudflare:</strong> For DDoS protection, CDN delivery, and Turnstile bot detection.</li>
            <li><strong>Resend:</strong> For transactional email delivery (verification, password reset).</li>
            <li><strong>Hosting providers:</strong> For infrastructure (Render, Neon PostgreSQL).</li>
            <li><strong>Legal authorities:</strong> When required by law or to protect our rights.</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">7. Data Retention</h2>
          <p class="text-text-secondary leading-relaxed">
            We retain your data for as long as your account is active. After deletion, we remove personal data
            within 30 days, except where longer retention is required for legal compliance, fraud prevention,
            or security purposes. Security event logs (IPs, user agents, failed requests) are retained for
            90 days and then automatically purged. Aggregate statistics are kept indefinitely in anonymized form.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">8. Your Rights (GDPR)</h2>
          <div class="text-text-secondary leading-relaxed">
            <p class="mb-3">You have the right to:</p>
            <ul class="list-disc pl-5 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data.</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data.</li>
              <li><strong>Erasure:</strong> Delete your account and associated data.</li>
              <li><strong>Restriction:</strong> Limit how we process your data.</li>
              <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests.</li>
              <li><strong>Complaint:</strong> Lodge a complaint with your local data protection authority.</li>
            </ul>
            <p class="mt-3">
              To exercise these rights, email us at
              <a href="mailto:support@emberexchange.xyz" class="text-accent hover:underline">support&#64;emberexchange.xyz</a>.
            </p>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">9. Security</h2>
          <p class="text-text-secondary leading-relaxed">
            We take security seriously: passwords are hashed with bcrypt, sessions expire automatically,
            2FA is available, and all traffic is encrypted with TLS. However, no online service is 100% secure.
            Use a unique password and enable 2FA to protect your account.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">10. Children's Privacy</h2>
          <p class="text-text-secondary leading-relaxed">
            Ember Exchange is not directed at children under 13. We do not knowingly collect data from children
            under 13. If you believe we have collected data from a child under 13, contact us and we will delete it.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">11. Changes to This Policy</h2>
          <p class="text-text-secondary leading-relaxed">
            We may update this Privacy Policy periodically. Significant changes will be announced via email
            or in-app notice. The "Last updated" date at the top indicates the most recent revision.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">12. Contact</h2>
          <p class="text-text-secondary leading-relaxed">
            For privacy-related questions or requests, contact us at
            <a href="mailto:support@emberexchange.xyz" class="text-accent hover:underline">support&#64;emberexchange.xyz</a>.
          </p>
        </section>
      </div>
    </div>
  `
})
export class PrivacyComponent {}

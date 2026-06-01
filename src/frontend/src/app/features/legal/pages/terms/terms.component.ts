import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
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
          Terms of Service
        </h1>
        <p class="text-text-secondary text-sm mb-10">Last updated: May 29, 2026</p>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">1. Acceptance of Terms</h2>
          <p class="text-text-secondary leading-relaxed">
            By accessing or using Ember Exchange ("the Service"), you agree to be bound by these Terms of Service.
            If you do not agree, you may not use the Service. We reserve the right to update these terms at any time;
            continued use constitutes acceptance of the revised terms.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">2. Eligibility</h2>
          <p class="text-text-secondary leading-relaxed">
            You must be at least 13 years old to use Ember Exchange. If you are under 18, you represent that you have
            parental or guardian consent. We may terminate accounts that misrepresent age or identity.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">3. Account Security</h2>
          <p class="text-text-secondary leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials and for all activity
            under your account. Notify us immediately of any unauthorized use. We support two-factor authentication (2FA)
            and strongly encourage you to enable it.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">4. Virtual Currency & Items</h2>
          <p class="text-text-secondary leading-relaxed mb-3">
            Ember Exchange uses virtual currencies (Coins, Sparks) and virtual items (Stoves, Lootboxes, etc.).
            These have no real-world monetary value, cannot be redeemed for cash, and are not transferable outside
            the Service except through the in-game marketplace.
          </p>
          <ul class="text-text-secondary leading-relaxed list-disc pl-5 space-y-1">
            <li>We may adjust currency balances or item availability to correct errors or exploits.</li>
            <li>Virtual items remain our property; you receive a limited license to use them.</li>
            <li>We do not guarantee the value or future availability of any virtual item.</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">5. Marketplace & Trading Rules</h2>
          <p class="text-text-secondary leading-relaxed mb-3">
            The Ember Exchange marketplace allows players to list and purchase virtual items. All trades are final
            unless required by law.
          </p>
          <ul class="text-text-secondary leading-relaxed list-disc pl-5 space-y-1">
            <li>You may only trade items you legitimately own.</li>
            <li>Price manipulation, artificial inflation, or coordinated market abuse is prohibited.</li>
            <li>We reserve the right to cancel suspicious trades and reverse transactions.</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">6. Prohibited Conduct</h2>
          <p class="text-text-secondary leading-relaxed mb-3">
            You agree not to engage in any of the following:
          </p>
          <ul class="text-text-secondary leading-relaxed list-disc pl-5 space-y-1">
            <li>Cheating, exploiting bugs, or using unauthorized third-party tools.</li>
            <li>Harassment, hate speech, or abusive behavior toward other players.</li>
            <li>Impersonating other users, staff, or automated systems.</li>
            <li>Spamming, phishing, or distributing malware.</li>
            <li>Attempting to circumvent security measures (Turnstile, rate limits, etc.).</li>
            <li>Real-money trading (RMT) of virtual items or accounts outside the Service.</li>
            <li>Reverse engineering, scraping, or automated data collection.</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">7. Content & Intellectual Property</h2>
          <p class="text-text-secondary leading-relaxed">
            All game content, artwork, code, and branding are the property of Ember Exchange or its licensors.
            User-generated content (chat messages, profiles) remains yours, but you grant us a worldwide, royalty-free
            license to use, display, and moderate it within the Service.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">8. Termination</h2>
          <p class="text-text-secondary leading-relaxed">
            We may suspend or terminate your account without notice for violations of these terms, fraudulent activity,
            or prolonged inactivity. Upon termination, your right to use the Service ceases immediately; virtual items
            and currency are forfeited. You may delete your account at any time from your profile settings.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">9. Disclaimers</h2>
          <p class="text-text-secondary leading-relaxed">
            The Service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access,
            error-free operation, or preservation of virtual items. To the extent permitted by law, our liability is
            limited to the amount you paid us in the preceding 12 months (if any) or EUR 100, whichever is lower.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">10. Governing Law</h2>
          <p class="text-text-secondary leading-relaxed">
            These terms are governed by the laws of Austria, without regard to conflict-of-law principles.
            Disputes shall first be attempted to be resolved amicably; if unresolved, they shall be submitted to
            the competent courts in Linz, Austria.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold text-accent mb-3">11. Contact</h2>
          <p class="text-text-secondary leading-relaxed">
            For questions about these Terms, contact us at
            <a href="mailto:support@emberexchange.xyz" class="text-accent hover:underline">support&#64;emberexchange.xyz</a>.
          </p>
        </section>
      </div>
    </div>
  `
})
export class TermsComponent {}

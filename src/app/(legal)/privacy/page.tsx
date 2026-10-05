import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED, OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  // Optional services appear only while they're switched on, so the list stays true.
  const sentry = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const posthog = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
  const mail = <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>;

  return (
    <article>
      <h1>Privacy policy</h1>
      <p className="text-muted-foreground">Last updated {LEGAL_UPDATED}</p>

      <p>
        Tickr is a time tracker run by {OPERATOR.name} (&ldquo;we&rdquo;). This page explains what we collect, why,
        where it&apos;s kept and what you can do about it. Questions: {mail}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your email address, your name if you add one, and your password (stored only as
          a one-way hash; we can&apos;t read it). If you sign in with Google, we receive your email and name from Google.
        </li>
        <li>
          <strong>What you track:</strong> time entries, descriptions, projects, clients, tags, rates and goals.
        </li>
        <li>
          <strong>Your settings:</strong> time zone, week start, time and duration formats.
        </li>
        <li>
          <strong>Security set-up:</strong> if you turn on two-step verification, the secret for your authenticator
          app.
        </li>
        <li>
          <strong>Payments:</strong> if you subscribe, your plan, renewal date and a record of each payment (amount,
          date, transaction number). Card details go straight to Flutterwave; we never see or store them.
        </li>
        <li>
          <strong>Technical logs:</strong> our hosting providers record requests (such as IP address, browser and time)
          to run the service and keep it secure. These logs are kept for a short time.
        </li>
      </ul>
      <p>We don&apos;t sell your data, show ads or use it to train AI models.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To provide Tickr to you: your account and your data are what the service is (the contract between us).</li>
        <li>To keep it secure and working: preventing abuse and fixing errors (our legitimate interest).</li>
        <li>To answer you when you write to us.</li>
      </ul>

      <h2>Where it&apos;s stored and who helps us</h2>
      <ul>
        <li>
          <strong>Supabase</strong> stores the database and handles sign-in, in Ireland (EU).
        </li>
        <li>
          <strong>Vercel</strong> runs the app, in Paris (EU), and delivers pages through its worldwide network.
        </li>
        <li>
          <strong>Flutterwave</strong> processes subscription payments, only if you subscribe.
        </li>
        <li>
          <strong>Google</strong>, only if you choose &ldquo;Continue with Google&rdquo;.
        </li>
        {sentry && (
          <li>
            <strong>Sentry</strong> receives error reports so we can fix bugs. They contain no cookies, form contents or
            request details.
          </li>
        )}
        {posthog && (
          <li>
            <strong>PostHog</strong> (EU) receives anonymous usage counts, such as &ldquo;a timer was started&rdquo;. No
            screen recordings and no content of your entries.
          </li>
        )}
      </ul>
      <p>
        These providers process data only on our instructions. Some are US companies; where data leaves the EU, it&apos;s
        covered by the EU&apos;s standard contractual clauses or the EU-US Data Privacy Framework.
      </p>

      <h2>Cookies and storage</h2>
      <p>
        We use only the cookies needed to keep you signed in. Your browser also remembers a few display choices, such as
        light or dark mode and calendar zoom. There are no advertising or tracking cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>
        As long as you have an account. Payment records may be kept longer where tax or accounting law requires it. When you delete your account, your data is removed from our database straight
        away. Copies in our providers&apos; backups disappear when those backups expire, normally within 7 days.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>
          <strong>Get a copy:</strong> download all your time entries as CSV in{" "}
          <Link href="/settings#data">Settings → Your data</Link>.
        </li>
        <li>
          <strong>Correct:</strong> edit anything in the app, or your name in Settings.
        </li>
        <li>
          <strong>Delete:</strong> <Link href="/settings#danger">Settings → Danger zone → Delete account</Link> removes
          your account and everything in it.
        </li>
        <li>
          <strong>Ask or object:</strong> write to {mail} for anything else, including a full copy of what we hold. We
          reply within 30 days.
        </li>
      </ul>
      <p>
        If you&apos;re unhappy with how we handle your data, you can also complain to your local data protection
        authority.
      </p>

      <h2>Security</h2>
      <p>
        Connections are encrypted, each account can only reach its own data (enforced in the database), and you can turn
        on two-step verification in Settings.
      </p>

      <h2>Children</h2>
      <p>Tickr isn&apos;t meant for children under 16.</p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we&apos;ll update the date at the top, and tell you in the app or by email when the
        change matters.
      </p>
    </article>
  );
}

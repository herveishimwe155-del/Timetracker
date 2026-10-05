import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED, OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  const mail = <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>;

  return (
    <article>
      <h1>Terms of use</h1>
      <p className="text-muted-foreground">Last updated {LEGAL_UPDATED}</p>

      <p>
        These terms are the agreement between you and {OPERATOR.name} (&ldquo;we&rdquo;), who runs Tickr. By creating an
        account or using Tickr, you accept them. Questions: {mail}.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You need to be at least 16 to use Tickr.</li>
        <li>Give a real email address, keep your password private, and tell us if you think someone else got in.</li>
        <li>You&apos;re responsible for what happens in your account.</li>
      </ul>

      <h2>Your data is yours</h2>
      <p>
        You own everything you put into Tickr. We use it only to run the service for you, as described in the{" "}
        <Link href="/privacy">privacy policy</Link>. You can export or delete it at any time from Settings.
      </p>

      <h2>Fair use</h2>
      <p>Don&apos;t use Tickr to:</p>
      <ul>
        <li>break the law or store content you don&apos;t have the right to;</li>
        <li>try to reach other people&apos;s data, or test, probe or overload the service without our permission;</li>
        <li>copy, resell or automate access to the service in ways that harm it or other users.</li>
      </ul>

      <h2>The service</h2>
      <p>
        Tickr is free and provided &ldquo;as is&rdquo;. We work to keep it available and your data safe, but we
        can&apos;t promise it will always be available or free of errors. Keep your own exports of anything you
        can&apos;t afford to lose, such as hours you bill to clients. We may change or add features, and we&apos;ll give
        reasonable notice before removing important ones or ending the service, so you can export your data.
      </p>

      <h2>Liability</h2>
      <p>
        As far as the law allows, we aren&apos;t liable for indirect losses, such as lost income or lost data, from using
        or being unable to use Tickr. Nothing here limits rights you have under consumer law that can&apos;t be waived.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can delete your account at any time in Settings. We may suspend or close accounts that seriously or
        repeatedly break these terms, and will tell you why unless the law prevents it.
      </p>

      <h2>Changes</h2>
      <p>
        If we change these terms, we&apos;ll update the date at the top, and tell you in the app or by email before
        important changes apply. Continuing to use Tickr after that means you accept them.
      </p>
    </article>
  );
}

import { useState } from 'react'
import { getAbout } from '../lib/content'

/* -------------------------------------------------------------------------- */
/*  Google Form configuration — fill these in, then the form below goes live.  */
/*                                                                            */
/*  1. Create a Google Form with three short-answer questions.                */
/*  2. Open the ⋮ menu → "Get pre-filled link", fill dummy values, Get link.   */
/*  3. The link contains the two things you need:                             */
/*       .../forms/d/e/<FORM_ID>/viewform?entry.123456=Dummy&entry.789012=... */
/*     Copy FORM_ID below, and each entry.NNNN id into the matching field.    */
/*                                                                            */
/*  See docs/03-features-and-ui.md#the-form--google-forms-and-its-one-catch   */
/* -------------------------------------------------------------------------- */

const FORM_ID = ''

const FIELDS = {
  name: 'entry.000000000',
  email: 'entry.000000001',
  message: 'entry.000000002',
}

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function Contact() {
  const about = getAbout()
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    // Honeypot: real people leave this hidden field empty, bots fill it in.
    // Pretend success so the bot doesn't retry.
    if (data.get('website')) {
      setStatus('sent')
      return
    }

    const body = new FormData()
    body.append(FIELDS.name, String(data.get('name') ?? ''))
    body.append(FIELDS.email, String(data.get('email') ?? ''))
    body.append(FIELDS.message, String(data.get('message') ?? ''))

    setStatus('sending')
    try {
      // Google sends no CORS headers on this endpoint, so the response is opaque:
      // the submission goes through, but we cannot read whether it succeeded.
      // A network failure throws; a rejected submission does not. Hence the
      // email address shown alongside this form.
      await fetch(`https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`, {
        method: 'POST',
        mode: 'no-cors',
        body,
      })
      setStatus('sent')
      form.reset()
    } catch {
      setStatus('error')
    }
  }

  return (
    <section
      id="contact"
      className="border-t border-neutral-200 py-20 dark:border-neutral-800"
    >
      <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        Contact
      </h2>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <div>
          <p className="text-neutral-600 dark:text-neutral-400">
            The quickest way to reach me is email.
          </p>

          <a
            href={`mailto:${about.email}`}
            className="mt-3 inline-block font-medium text-sky-700 underline
                       underline-offset-4 hover:text-sky-800 dark:text-sky-400
                       dark:hover:text-sky-300"
          >
            {about.email}
          </a>

          <ul className="mt-6 space-y-2">
            {about.socials.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-600 underline underline-offset-4
                             hover:text-neutral-900 dark:text-neutral-400
                             dark:hover:text-neutral-200"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {FORM_ID === '' ? (
          <SetupNote />
        ) : status === 'sent' ? (
          <p
            className="self-start rounded-lg border border-neutral-200 p-4 text-sm
                       text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
          >
            Thanks — message sent. I&rsquo;ll be in touch.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field name="name" label="Name" required />
            <Field name="email" label="Email" type="email" required />

            <label className="block">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Message
              </span>
              <textarea
                name="message"
                rows={4}
                required
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-transparent
                           px-3 py-2 text-sm outline-none focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-sky-500
                           dark:border-neutral-800"
              />
            </label>

            {/* Honeypot — hidden from people, irresistible to bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute left-[-9999px]"
            />

            <button
              type="submit"
              disabled={status === 'sending'}
              className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white
                         transition hover:bg-neutral-700 disabled:opacity-50
                         dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              {status === 'sending' ? 'Sending…' : 'Send'}
            </button>

            {status === 'error' && (
              <p className="text-sm text-red-600 dark:text-red-400">
                That didn&rsquo;t send — please email me directly at {about.email}.
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  )
}

function Field({
  name,
  label,
  type = 'text',
  required,
}: {
  name: string
  label: string
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-transparent px-3
                   py-2 text-sm outline-none focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-sky-500
                   dark:border-neutral-800"
      />
    </label>
  )
}

function SetupNote() {
  return (
    <div
      className="self-start rounded-lg border border-dashed border-neutral-300 p-4 text-sm
                 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
    >
      <p className="font-medium text-neutral-700 dark:text-neutral-300">
        Contact form not configured yet
      </p>
      <p className="mt-2">
        Set <code>FORM_ID</code> and the three <code>entry.*</code> ids at the top of{' '}
        <code>src/components/Contact.tsx</code> and the form appears here.
      </p>
    </div>
  )
}

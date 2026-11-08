import { useState } from 'react'
import { getAbout } from '../lib/content'
import { MailIcon, PinIcon, socialIcon } from './Icons'

/* -------------------------------------------------------------------------- */
/*  Google Form configuration — fill these in, then the form below goes live.  */
/*                                                                            */
/*  1. Create a Google Form with one question per FIELDS entry below.         */
/*  2. Open the ⋮ menu → "Get pre-filled link", fill dummy values, Get link.   */
/*  3. The link contains the two things you need:                             */
/*       .../forms/d/e/<FORM_ID>/viewform?entry.123456=Dummy&entry.789012=... */
/*     Copy FORM_ID below, and each entry.NNNN id into the matching field.    */
/*                                                                            */
/*  See docs/03-features-and-ui.md#the-form--google-forms-and-its-one-catch   */
/* -------------------------------------------------------------------------- */

const FORM_ID: string = '1FAIpQLScZt3bKIdW-Z3gGKUkXAwc7ceoQzXENRvwYAn9NMqITTAHnjQ'

const FIELDS = {
  name: 'entry.2005620554',
  email: 'entry.1045781291',
  phone: 'entry.132746793',
  message: 'entry.1025592492',
}

type Status = 'idle' | 'sending' | 'sent' | 'error'

/** A step above the form's field labels, so it reads as a heading, not a field. */
const COLUMN_HEADING = 'font-semibold text-neutral-900 dark:text-neutral-100'

/** Same outlined button as the About section's links, with room for an icon. */
const BUTTON = `inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4
  py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100
  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500
  dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800`

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
    body.append(FIELDS.phone, String(data.get('phone') ?? ''))
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

      {/* A short note first, then the form, then direct links. */}
      <div className="mt-4 max-w-2xl text-neutral-600 dark:text-neutral-400">
        <p>
          Hey, thanks for stopping by! From perception to learned control, I&rsquo;m always
          up for a chat about what&rsquo;s new in robotics. Happy to talk over coffee or a
          call.
        </p>
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div>
          <h3 className={`${COLUMN_HEADING} mb-3`}>Send me a message</h3>
          {FORM_ID === '' ? (
            <SetupNote />
          ) : status === 'sent' ? (
            <p
              className="self-start rounded-lg border border-neutral-200 p-4 text-sm
                         text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
            >
              Thanks! Message sent. I&rsquo;ll be in touch.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field name="name" label="Name" autoComplete="name" required />
              <Field name="email" label="Email" type="email" autoComplete="email" required />
              <Field name="phone" label="Phone" type="tel" autoComplete="tel" />

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
                  That didn&rsquo;t send. Please email me directly at {about.email}.
                </p>
              )}
            </form>
          )}
        </div>

        <div>
          <h3 className={COLUMN_HEADING}>Or reach me directly</h3>

          <a href={`mailto:${about.email}`} className={`${BUTTON} mt-3 break-all`}>
            <MailIcon className="size-4 shrink-0" />
            {about.email}
          </a>

          <ul className="mt-3 flex flex-wrap gap-3">
            {about.socials.map((s) => {
              const Icon = socialIcon(s.url)
              return (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className={BUTTON}>
                    {Icon && <Icon className="size-4 shrink-0" />}
                    {s.label}
                  </a>
                </li>
              )
            })}
          </ul>

          {about.location && (
            <p className="mt-5 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <PinIcon className="size-4 shrink-0" />
              Based in {about.location}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function Field({
  name,
  label,
  type = 'text',
  autoComplete,
  required,
}: {
  name: string
  label: string
  type?: string
  autoComplete?: string
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
        autoComplete={autoComplete}
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
        Set <code>FORM_ID</code> and the <code>entry.*</code> ids at the top of{' '}
        <code>src/components/Contact.tsx</code> and the form appears here.
      </p>
    </div>
  )
}

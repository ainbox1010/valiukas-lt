export default function ContactPage() {
  return (
    <div className="section contact-page">
      <section className="hero">
        <h1>Contact</h1>
        <p>
          If you&apos;re considering change at any level — from process clarity to
          automation and AI implementation — send a short description of your
          situation.
        </p>
        <p>
          <strong>Include:</strong>
        </p>
        <ul className="contact-include-list">
          <li>what you&apos;re trying to improve</li>
          <li>where the current process breaks</li>
          <li>what systems are involved (if known)</li>
        </ul>
        <div className="contact-email-cta">
          <a
            href="mailto:contact@valiukas.lt?subject=Contact"
            className="contact-email-button"
          >
            Just email me.
          </a>
          <p className="contact-email-note">I respond personally.</p>
        </div>
      </section>
    </div>
  );
}

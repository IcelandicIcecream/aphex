---
'@aphexcms/plugin-forms': minor
---

Form emails for apps that run several sites, and replies that reach the right person.

- **Reply goes to the visitor.** A notification whose "Reply to" is empty now replies to the email address the visitor gave (the form's first email question). Before, a reply went to the sending address.
- **`site` option.** Returns a site's `name` and `email`, read when a form is submitted. The name goes in front of `from` (`"Lily's Bakery" <forms@example.com>`), and a form with no notification emails now notifies the site's `email`.
- **A confirmation for the visitor** (`confirmationEmail` on a form, off by default). It sends the owner's own subject and message to the visitor's address, and replies go to the site's email. It refuses `{{answers}}`, so a stranger can't send their text to someone else through the form. It is delivered by its own `forms.confirm` consumer, so a retried notification never sends the visitor a second copy.

// Both values are safe to publish: the publishable key only reaches what Row
// Level Security allows. Never put any other Supabase key here or in the repo.
export const config = {
  supabaseUrl: 'https://ndkgmenntqhjojalqbdm.supabase.co',
  supabasePublishableKey: 'sb_publishable_7dOebgGKU2_CJ8-dfYVGDg_LkDRTQrh',
  emailDomain: 'marcona.invalid',
  /** REQ-153: where the QR code sends a friend's phone. */
  siteUrl: 'https://marccompta.github.io/marcona-app/',
}

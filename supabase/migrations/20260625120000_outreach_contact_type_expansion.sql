-- Expand outreach_contacts.contact_type for CSV import (choir, media, partner).

ALTER TABLE public.outreach_contacts
  DROP CONSTRAINT IF EXISTS outreach_contacts_contact_type_check;

ALTER TABLE public.outreach_contacts
  ADD CONSTRAINT outreach_contacts_contact_type_check
    CHECK (
      contact_type IN (
        'institution',
        'artist',
        'choir',
        'church',
        'venue',
        'media',
        'partner',
        'other'
      )
    );

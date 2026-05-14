insert into reviewer_comments (
  project_id,
  application_number,
  comment_id,
  reviewer_name,
  department,
  status,
  priority,
  comment_text,
  response_text,
  responsible_party
)
select
  p.id,
  seeded.application_number,
  seeded.comment_id,
  seeded.reviewer_name,
  seeded.department,
  seeded.status,
  seeded.priority,
  seeded.comment_text,
  seeded.response_text,
  seeded.responsible_party
from projects p
cross join (
  values
    (
      'SUBD-24-0106',
      'PLN-01',
      'Planning Staff',
      'Planning',
      'open',
      'high',
      'Clarify the document trail supporting private access assumptions.',
      'Collecting deed and easement support into the portal.',
      'Thomas'
    ),
    (
      'DEPN-25-0102',
      'SWENT-04',
      'Stormwater Reviewer',
      'City Engineering - SWENT',
      'waiting_on_engineer',
      'critical',
      'Identify culvert assumptions and supporting field evidence for drainage routing.',
      null,
      'Dave Gorman / MVE'
    ),
    (
      'STM-MP24-0278',
      'FIRE-02',
      'Fire Reviewer',
      'Fire',
      'in_progress',
      'medium',
      'Provide access observations relevant to seasonal or gate-related constraints.',
      null,
      'Fire'
    ),
    (
      'STM-REV24-0768',
      'USFS-03',
      'USFS Reviewer',
      'USFS',
      'open',
      'medium',
      'Assemble correspondence and field observations relevant to road and access coordination.',
      null,
      'USFS'
    )
) as seeded (
  application_number,
  comment_id,
  reviewer_name,
  department,
  status,
  priority,
  comment_text,
  response_text,
  responsible_party
)
where p.slug = '3245-rampart-range-road'
  and not exists (
    select 1
    from reviewer_comments rc
    where rc.project_id = p.id
      and rc.application_number = seeded.application_number
      and rc.comment_id = seeded.comment_id
  );

insert into storage.buckets (id, name, public)
values
  ('project-documents', 'project-documents', false),
  ('field-photos', 'field-photos', false),
  ('lidar-scans', 'lidar-scans', false),
  ('exports', 'exports', false)
on conflict (id) do nothing;

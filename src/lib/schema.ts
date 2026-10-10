// Idempotent schema. Applied lazily on first request and by `npm run migrate`.
export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  short_name text,
  is_principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  school_id uuid NOT NULL REFERENCES schools(id),
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, key)
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text,
  photo_file uuid,
  mfa_secret text,
  mfa_enabled boolean NOT NULL DEFAULT false,
  recovery_codes jsonb,
  must_change_password boolean NOT NULL DEFAULT false,
  failed_logins int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uq ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_role_idx ON users (school_id, role);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  school_id uuid NOT NULL REFERENCES schools(id),
  role text NOT NULL,
  permissions jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, role)
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mfa_passed boolean NOT NULL DEFAULT true,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  count int NOT NULL,
  window_start timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS reset_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  school_id uuid,
  category text NOT NULL DEFAULT 'audit',
  actor_id uuid,
  actor_label text,
  action text NOT NULL,
  entity text,
  entity_id text,
  meta jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_logs (school_id, created_at DESC);
CREATE OR REPLACE FUNCTION audit_immutable() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_no_change ON audit_logs;
CREATE TRIGGER audit_no_change BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION audit_immutable();

CREATE TABLE IF NOT EXISTS academic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  name text NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  UNIQUE (school_id, name)
);
CREATE TABLE IF NOT EXISTS terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  session_id uuid NOT NULL REFERENCES academic_sessions(id),
  name text NOT NULL,
  starts_on date,
  ends_on date,
  is_current boolean NOT NULL DEFAULT false,
  UNIQUE (session_id, name)
);
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  term_id uuid REFERENCES terms(id),
  kind text NOT NULL,
  title text NOT NULL,
  starts_on date NOT NULL,
  ends_on date,
  audience text NOT NULL DEFAULT 'all'
);

CREATE TABLE IF NOT EXISTS sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  name text NOT NULL,
  sort int NOT NULL DEFAULT 0,
  UNIQUE (school_id, name)
);
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  name text NOT NULL,
  head_id uuid,
  archived boolean NOT NULL DEFAULT false,
  UNIQUE (school_id, name)
);
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  section_id uuid REFERENCES sections(id),
  level int NOT NULL,
  name text NOT NULL,
  arm text NOT NULL DEFAULT '',
  department_id uuid REFERENCES departments(id),
  class_teacher_id uuid REFERENCES users(id),
  archived boolean NOT NULL DEFAULT false,
  UNIQUE (school_id, name, arm, department_id)
);
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  name text NOT NULL,
  code text,
  department_id uuid REFERENCES departments(id),
  archived boolean NOT NULL DEFAULT false,
  UNIQUE (school_id, name)
);
CREATE TABLE IF NOT EXISTS class_subjects (
  class_id uuid NOT NULL REFERENCES classes(id),
  subject_id uuid NOT NULL REFERENCES subjects(id),
  teacher_id uuid REFERENCES users(id),
  PRIMARY KEY (class_id, subject_id)
);
CREATE TABLE IF NOT EXISTS teacher_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  teacher_id uuid NOT NULL REFERENCES users(id),
  kind text NOT NULL,
  from_class_id uuid REFERENCES classes(id),
  to_class_id uuid REFERENCES classes(id),
  subject_id uuid REFERENCES subjects(id),
  by_user uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id),
  employee_id text,
  position text,
  department_id uuid REFERENCES departments(id),
  qualification text,
  certification text,
  years_experience int NOT NULL DEFAULT 0,
  employment_date date,
  specialization text,
  bio text,
  subjects_text text,
  is_senior boolean NOT NULL DEFAULT false,
  public boolean NOT NULL DEFAULT true,
  employment_status text NOT NULL DEFAULT 'active',
  sort int NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  user_id uuid UNIQUE REFERENCES users(id),
  admission_no text NOT NULL,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  dob date,
  gender text,
  class_id uuid REFERENCES classes(id),
  department_id uuid REFERENCES departments(id),
  address text, state text, country text,
  guardian_name text, guardian_phone text, guardian_email text, emergency_contact text,
  previous_school text,
  admission_year int,
  status text NOT NULL DEFAULT 'enrolled',
  code_hash text UNIQUE,
  code_enc text,
  code_status text NOT NULL DEFAULT 'active',
  code_activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, admission_no)
);
CREATE INDEX IF NOT EXISTS students_class_idx ON students (class_id);

CREATE TABLE IF NOT EXISTS parent_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  address text,
  relationship text,
  emergency_contact text
);
CREATE TABLE IF NOT EXISTS parent_links (
  parent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  student_id uuid NOT NULL REFERENCES students(id),
  action text NOT NULL,
  from_class_id uuid REFERENCES classes(id),
  to_class_id uuid REFERENCES classes(id),
  from_department_id uuid,
  to_department_id uuid,
  session_id uuid REFERENCES academic_sessions(id),
  term_id uuid REFERENCES terms(id),
  by_user uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  name text NOT NULL,
  mime text NOT NULL,
  size int NOT NULL,
  public boolean NOT NULL DEFAULT false,
  data bytea NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}',
  audience text NOT NULL DEFAULT 'public',
  published boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 100,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_kind_idx ON content_items (school_id, kind, published);

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  name text NOT NULL, email text NOT NULL, phone text, subject text NOT NULL, message text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  status text NOT NULL DEFAULT 'new',
  reply text,
  email_status text,
  whatsapp_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  teacher_id uuid NOT NULL REFERENCES users(id),
  class_id uuid REFERENCES classes(id),
  subject_id uuid REFERENCES subjects(id),
  term_id uuid REFERENCES terms(id),
  week int, lesson_date date,
  topic text NOT NULL, subtopic text,
  body jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  reviewer_id uuid, review_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  title text NOT NULL, description text,
  subject_id uuid REFERENCES subjects(id),
  class_id uuid REFERENCES classes(id),
  department_id uuid REFERENCES departments(id),
  term_id uuid REFERENCES terms(id),
  lesson_id uuid REFERENCES lesson_notes(id),
  topic text, subtopic text,
  kind text NOT NULL,
  url text, file_id uuid REFERENCES files(id),
  platform text, duration text,
  recommended boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT false,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  subject_id uuid REFERENCES subjects(id),
  class_id uuid REFERENCES classes(id),
  department_id uuid REFERENCES departments(id),
  term_id uuid REFERENCES terms(id),
  topic text, subtopic text,
  text text NOT NULL,
  options jsonb NOT NULL,
  correct text NOT NULL,
  explanation text,
  difficulty text NOT NULL DEFAULT 'medium',
  marks numeric NOT NULL DEFAULT 1,
  source text, copyright text NOT NULL DEFAULT 'original',
  exam_category text,
  author_id uuid,
  status text NOT NULL DEFAULT 'PENDING_REVIEW',
  reviewed_by uuid,
  import_id uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS questions_filter_idx ON questions (school_id, status, subject_id, class_id);

CREATE TABLE IF NOT EXISTS question_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  filename text, accepted int, rejected int, by_user uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  kind text NOT NULL,
  title text NOT NULL,
  subject_id uuid REFERENCES subjects(id),
  class_id uuid REFERENCES classes(id),
  term_id uuid REFERENCES terms(id),
  topic text, instructions text,
  start_at timestamptz, due_at timestamptz,
  duration_min int NOT NULL DEFAULT 30,
  attempt_limit int NOT NULL DEFAULT 1,
  pass_mark int NOT NULL DEFAULT 40,
  draw_count int,
  randomize boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',
  release_mode text NOT NULL DEFAULT 'immediate',
  released boolean NOT NULL DEFAULT false,
  mock_category text, mock_type text,
  created_by uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS assessment_questions (
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id),
  marks numeric NOT NULL DEFAULT 1,
  PRIMARY KEY (assessment_id, question_id)
);
CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id),
  student_id uuid NOT NULL REFERENCES students(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  deadline_at timestamptz NOT NULL,
  submitted_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress',
  plan jsonb NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  flags jsonb NOT NULL DEFAULT '[]',
  score numeric,
  max_score numeric,
  assessment_version int NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS attempts_student_idx ON attempts (student_id, assessment_id);

CREATE TABLE IF NOT EXISTS results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  student_id uuid NOT NULL REFERENCES students(id),
  term_id uuid NOT NULL REFERENCES terms(id),
  subject_id uuid NOT NULL REFERENCES subjects(id),
  class_id uuid REFERENCES classes(id),
  assignment numeric, ca numeric, exam numeric,
  total numeric NOT NULL DEFAULT 0,
  grade text, remark text, teacher_remark text,
  released boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, term_id, subject_id)
);
CREATE TABLE IF NOT EXISTS report_remarks (
  student_id uuid NOT NULL REFERENCES students(id),
  term_id uuid NOT NULL REFERENCES terms(id),
  class_teacher text, hod text, principal text, conduct text,
  PRIMARY KEY (student_id, term_id)
);
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  student_id uuid NOT NULL REFERENCES students(id),
  number text UNIQUE NOT NULL,
  title text NOT NULL,
  exam_label text, score numeric, grade text,
  issued_on date NOT NULL DEFAULT current_date,
  issued_by uuid,
  revoked boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  class_id uuid NOT NULL REFERENCES classes(id),
  subject_id uuid REFERENCES subjects(id),
  teacher_id uuid REFERENCES users(id),
  day int NOT NULL,
  period int NOT NULL,
  room text,
  published boolean NOT NULL DEFAULT false,
  UNIQUE (class_id, day, period)
);
CREATE INDEX IF NOT EXISTS tt_teacher_idx ON timetable_slots (teacher_id, day, period);

CREATE TABLE IF NOT EXISTS attendance (
  school_id uuid NOT NULL REFERENCES schools(id),
  day date NOT NULL,
  kind text NOT NULL,
  subject_ref uuid NOT NULL,
  status text NOT NULL,
  marked_by uuid,
  PRIMARY KEY (day, kind, subject_ref)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications (user_id, read, created_at DESC);
`;

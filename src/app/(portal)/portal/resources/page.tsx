import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, listDepartments, listSubjects, listTerms, opts } from "@/lib/data";
import { Badge, Card, Empty, Field, PageHeader, Select, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { addResource, deleteResource, toggleResource } from "./actions";

export const metadata = { title: "Resources" };

export default async function Resources() {
  const me = await requirePerm("resources:create");
  const [classes, subjects, depts, terms] = await Promise.all([listClasses(me.schoolId), listSubjects(me.schoolId), listDepartments(me.schoolId), listTerms(me.schoolId)]);
  const own = can(me, "resources:manage") || can(me, "resources:publish");
  const rows = await sql`SELECT r.id, r.title, r.kind, r.platform, r.published, r.recommended, r.url, r.file_id, r.topic, s.name AS subject, c.name AS class_name, c.arm
                         FROM resources r LEFT JOIN subjects s ON s.id = r.subject_id LEFT JOIN classes c ON c.id = r.class_id
                         WHERE r.school_id = ${me.schoolId} ${own ? sql`` : sql`AND r.uploaded_by = ${me.id}`} ORDER BY r.created_at DESC LIMIT 100`;
  return (
    <>
      <PageHeader title="Learning resources" sub="Upload PDF, Word, PowerPoint, Excel, audio, images or add links (YouTube, Facebook, Google Drive, educational sites). Files up to 4 MB." />
      <details className="card card-pad mb-5" open>
        <summary className="cursor-pointer font-display text-lg">Add a resource</summary>
        <div className="mt-4">
          <ActionForm action={addResource} submit="Save resource" className="grid gap-3 sm:grid-cols-3" encType="multipart/form-data">
            <div className="sm:col-span-2"><Field label="Title" name="title" required /></div>
            <Field label="Duration" name="duration" placeholder="e.g. 12 min" />
            <Select label="Subject" name="subjectId" options={opts(subjects, (s) => s.name)} />
            <Select label="Class" name="classId" options={opts(classes, (c) => c.label)} />
            <Select label="Department" name="departmentId" options={opts(depts, (d) => d.name)} />
            <Select label="Term" name="termId" options={opts(terms, (t) => `${t.session} · ${t.name}`)} />
            <Field label="Topic" name="topic" /><Field label="Subtopic" name="subtopic" />
            <div className="field"><label htmlFor="file">Upload file</label><input id="file" name="file" type="file" className="input" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp3,.mp4,.png,.jpg,.jpeg,.webp" /></div>
            <div className="sm:col-span-2"><Field label="…or web link" name="url" type="url" placeholder="https://" /></div>
            <div className="sm:col-span-3"><TextArea label="Description" name="description" rows={2} /></div>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="recommended" /> Recommended</label>
            {can(me, "resources:publish") && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="published" defaultChecked /> Publish now</label>}
          </ActionForm>
        </div>
      </details>
      {rows.length === 0 ? <Empty title="No resources yet" /> : (
        <Card pad={false} className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Title</th><th>Type</th><th>Subject / class</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><a className="font-bold text-royal hover:underline" target="_blank" rel="noopener noreferrer" href={r.file_id ? `/api/files/${r.file_id}` : r.url}>{r.title}</a>{r.recommended && <> <Badge tone="info">Recommended</Badge></>}<br /><span className="text-xs text-muted">{r.topic}</span></td>
                  <td>{r.kind}{r.platform ? <span className="block text-xs text-muted">{r.platform}</span> : null}</td>
                  <td>{r.subject ?? "—"}<br /><span className="text-xs text-muted">{r.class_name ? `${r.class_name} ${r.arm}` : ""}</span></td>
                  <td><Badge tone={r.published ? "ok" : "warn"}>{r.published ? "Published" : "Unpublished"}</Badge></td>
                  <td className="whitespace-nowrap">
                    {can(me, "resources:publish") && <form action={toggleResource} className="inline"><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost btn-sm">{r.published ? "Unpublish" : "Publish"}</button></form>}{" "}
                    <form action={deleteResource} className="inline"><input type="hidden" name="id" value={r.id} /><button className="btn btn-danger btn-sm">Delete</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";

type State = { error?: string; ok?: string };
const UUID = /^[0-9a-f-]{36}$/i;
const done = () => revalidatePath("/portal/library");

export async function addBook(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("library:manage");
  const title = clean(fd.get("title"), 200), copies = Math.round(Number(fd.get("copies")) || 1);
  if (!title) return { error: "Enter the book title." };
  if (copies < 0 || copies > 500) return { error: "Copies must be between 0 and 500." };
  await sql`INSERT INTO lib_books (school_id, title, author, isbn, category, shelf, copies)
            VALUES (${me.schoolId}, ${title}, ${clean(fd.get("author"), 120)}, ${clean(fd.get("isbn"), 30) || null}, ${clean(fd.get("category"), 60) || "General"}, ${clean(fd.get("shelf"), 30) || null}, ${copies})`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "library.book.add", entity: "lib_book", meta: { title } });
  done();
  return { ok: "Book added." };
}

export async function deleteBook(fd: FormData): Promise<void> {
  const me = await requirePerm("library:manage");
  const id = clean(fd.get("id"), 40);
  if (!UUID.test(id)) return;
  const [open] = await sql`SELECT 1 FROM lib_loans WHERE book_id = ${id} AND returned_on IS NULL LIMIT 1`;
  if (open) return; // never delete a book that is still out
  await sql`DELETE FROM lib_books WHERE id = ${id} AND school_id = ${me.schoolId}`;
  done();
}

/** Lends a copy to a student (by admission number) or a staff member (by email). One copy at a time per borrower per book. */
export async function issueBook(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("library:manage");
  const book = clean(fd.get("book"), 40), who = clean(fd.get("who"), 80).toLowerCase(), days = Math.min(Math.max(Math.round(Number(fd.get("days")) || 14), 1), 120);
  if (!UUID.test(book) || !who) return { error: "Choose the book and enter the borrower." };
  const [b] = await sql`SELECT id, title, copies, (SELECT count(*)::int FROM lib_loans l WHERE l.book_id = lib_books.id AND l.returned_on IS NULL) AS out FROM lib_books WHERE id = ${book} AND school_id = ${me.schoolId}`;
  if (!b) return { error: "Book not found." };
  if (b.out >= b.copies) return { error: "No copy of this book is available right now." };
  const [st] = await sql`SELECT id FROM students WHERE school_id = ${me.schoolId} AND lower(admission_no) = ${who} AND status IN ('active','enrolled')`;
  const [us] = st ? [] : await sql`SELECT id FROM users WHERE school_id = ${me.schoolId} AND lower(email) = ${who} AND status = 'active' AND role NOT IN ('student','parent','developer')`;
  if (!st && !us) return { error: "No student with that admission number or staff member with that email." };
  const [dup] = await sql`SELECT 1 FROM lib_loans WHERE book_id = ${book} AND returned_on IS NULL AND (${st ? sql`student_id = ${st.id}` : sql`user_id = ${us.id}`})`;
  if (dup) return { error: "That person already has this book." };
  await sql`INSERT INTO lib_loans (school_id, book_id, student_id, user_id, due_on, issued_by)
            VALUES (${me.schoolId}, ${book}, ${st?.id ?? null}, ${us?.id ?? null}, (current_date + ${days}::int), ${me.id})`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "library.issue", entity: "lib_book", entityId: book });
  done();
  return { ok: `Issued "${b.title}" for ${days} days.` };
}

export async function returnBook(fd: FormData): Promise<void> {
  const me = await requirePerm("library:manage");
  const id = clean(fd.get("id"), 40);
  if (!UUID.test(id)) return;
  await sql`UPDATE lib_loans SET returned_on = current_date WHERE id = ${id} AND school_id = ${me.schoolId} AND returned_on IS NULL`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "library.return", entity: "lib_loan", entityId: id });
  done();
}

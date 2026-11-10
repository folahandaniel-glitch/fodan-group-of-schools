import { sql } from "./db";

export const HYMN_BOOKS: [string, string][] = [
  ["common", "Common Hymns (public domain)"], ["catholic", "Catholic Hymn Book"], ["methodist", "Methodist Hymn Book"],
  ["cs", "Cherubim & Seraphim (C&S) Hymns"], ["cac", "Christ Apostolic Church (CAC) Hymns"], ["baptist", "Baptist Hymnal"], ["anglican", "Anglican Hymns"],
];

// Public-domain texts only. The official Catholic, Methodist, C&S, CAC, Baptist and Anglican books are loaded by the school
// through Hymns > Import, because their numbering and many texts are under copyright.
const H: [string, string, string][] = [
  ["Amazing Grace", "John Newton, 1779", `Amazing grace! how sweet the sound,
That saved a wretch like me!
I once was lost, but now am found;
Was blind, but now I see.

'Twas grace that taught my heart to fear,
And grace my fears relieved;
How precious did that grace appear
The hour I first believed!

Through many dangers, toils, and snares,
I have already come;
'Tis grace hath brought me safe thus far,
And grace will lead me home.

The Lord has promised good to me,
His word my hope secures;
He will my shield and portion be,
As long as life endures.`],
  ["Holy, Holy, Holy", "Reginald Heber, 1826", `Holy, holy, holy! Lord God Almighty!
Early in the morning our song shall rise to thee;
Holy, holy, holy! merciful and mighty!
God in three persons, blessed Trinity!

Holy, holy, holy! all the saints adore thee,
Casting down their golden crowns around the glassy sea;
Cherubim and seraphim falling down before thee,
Which wert, and art, and evermore shalt be.

Holy, holy, holy! though the darkness hide thee,
Though the eye of sinful man thy glory may not see;
Only thou art holy; there is none beside thee,
Perfect in power, in love, and purity.

Holy, holy, holy! Lord God Almighty!
All thy works shall praise thy name, in earth, and sky, and sea;
Holy, holy, holy! merciful and mighty!
God in three persons, blessed Trinity!`],
  ["Rock of Ages", "Augustus Toplady, 1776", `Rock of Ages, cleft for me,
Let me hide myself in thee;
Let the water and the blood,
From thy wounded side which flowed,
Be of sin the double cure;
Save from wrath and make me pure.

Not the labors of my hands
Can fulfill thy law's demands;
Could my zeal no respite know,
Could my tears forever flow,
All for sin could not atone;
Thou must save, and thou alone.

Nothing in my hand I bring,
Simply to thy cross I cling;
Naked, come to thee for dress;
Helpless, look to thee for grace;
Foul, I to the fountain fly;
Wash me, Savior, or I die.

While I draw this fleeting breath,
When mine eyes shall close in death,
When I rise to worlds unknown,
And behold thee on thy throne,
Rock of Ages, cleft for me,
Let me hide myself in thee.`],
  ["When I Survey the Wondrous Cross", "Isaac Watts, 1707", `When I survey the wondrous cross
On which the Prince of glory died,
My richest gain I count but loss,
And pour contempt on all my pride.

Forbid it, Lord, that I should boast,
Save in the death of Christ my God;
All the vain things that charm me most,
I sacrifice them to his blood.

See, from his head, his hands, his feet,
Sorrow and love flow mingled down;
Did e'er such love and sorrow meet,
Or thorns compose so rich a crown?

Were the whole realm of nature mine,
That were a present far too small;
Love so amazing, so divine,
Demands my soul, my life, my all.`],
  ["O for a Thousand Tongues to Sing", "Charles Wesley, 1739", `O for a thousand tongues to sing
My great Redeemer's praise,
The glories of my God and King,
The triumphs of his grace!

My gracious Master and my God,
Assist me to proclaim,
To spread through all the earth abroad
The honors of thy name.

Jesus! the name that charms our fears,
That bids our sorrows cease;
'Tis music in the sinner's ears,
'Tis life, and health, and peace.

He breaks the power of canceled sin,
He sets the prisoner free;
His blood can make the foulest clean;
His blood availed for me.`],
  ["Abide with Me", "Henry Francis Lyte, 1847", `Abide with me; fast falls the eventide;
The darkness deepens; Lord, with me abide.
When other helpers fail and comforts flee,
Help of the helpless, O abide with me.

Swift to its close ebbs out life's little day;
Earth's joys grow dim, its glories pass away;
Change and decay in all around I see;
O thou who changest not, abide with me.

I need thy presence every passing hour;
What but thy grace can foil the tempter's power?
Who like thyself my guide and stay can be?
Through cloud and sunshine, Lord, abide with me.

Hold thou thy cross before my closing eyes;
Shine through the gloom and point me to the skies.
Heaven's morning breaks, and earth's vain shadows flee;
In life, in death, O Lord, abide with me.`],
];

export async function seedHymns(schoolId: string): Promise<void> {
  for (const [i, [code, name]] of HYMN_BOOKS.entries())
    await sql`INSERT INTO hymn_books (school_id, code, name, sort) VALUES (${schoolId}, ${code}, ${name}, ${i}) ON CONFLICT DO NOTHING`;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM hymns WHERE school_id = ${schoolId}`;
  if (n > 0) return;
  for (const [title, author, lyrics] of H)
    await sql`INSERT INTO hymns (school_id, book, title, author, lyrics) VALUES (${schoolId}, 'common', ${title}, ${author}, ${lyrics}) ON CONFLICT DO NOTHING`;
}

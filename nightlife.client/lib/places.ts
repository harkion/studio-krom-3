export type Place = {
  id: string;
  name: string;
  query: string;
  category: string;
  title: string;
  summary: string;
  source?: string;
  scope: string;
  status: string;
};
export const places: Place[] = [
  {
    id: "stratumseind",
    name: "Stratumseind",
    query: "Stratumseind Eindhoven",
    category: "Main location",
    title: "Our starting location",
    summary:
      "This is the starting street from the group prototype. No interview or published account has been attached here yet.",
    scope: "Street overview only. No confirmed installation location.",
    status: "Main location",
  },
  {
    id: "montgomerylaan",
    name: "Veldmaarschalk Montgomerylaan",
    query: "Veldmaarschalk Montgomerylaan Eindhoven",
    category: "Sexual harassment",
    title: "An unsettling early-morning encounter",
    summary:
      "A Reddit author describes a stranger exposing himself while they were walking along this street early in the morning. They walked away and described feeling frightened and unsure how to respond.",
    source: "https://www.reddit.com/r/eindhoven/comments/196ro8p/",
    scope:
      "The source names the street, not the exact incident location. This is an early-morning account, not a confirmed nightlife outing.",
    status: "Published account • unverified",
  },
  {
    id: "boschdijk",
    name: "Boschdijk area",
    query: "Boschdijk Eindhoven",
    category: "Unwanted attention",
    title: "Repeated harassment changes everyday routines",
    summary:
      "A Reddit author describes repeated unwanted attention in Eindhoven and changing how they dress. In a follow-up, they name Woensel, Strijp in the evening and the Boschdijk area. This marker represents one broad area mentioned, not a single incident.",
    source: "https://www.reddit.com/r/Netherlands/comments/1nfykio/",
    scope:
      "Broad area reference only. The source describes several places and times, not one precise event here.",
    status: "Published account • unverified",
  },
];
export function matches(p: Place, q: string, category: string) {
  return (
    (category === "All" || p.category === category) &&
    `${p.name} ${p.title}`.toLowerCase().includes(q.toLowerCase().trim())
  );
}

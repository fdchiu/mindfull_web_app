export const curatedVideos = [
  { id: "inpok4MKVLM", title: "10 Minute Guided Meditation For Anxiety", channelTitle: "The Mindful Movement", durationSec: 10*60, thumbnailUrl: "https://i.ytimg.com/vi/inpok4MKVLM/hqdefault.jpg", tags: ["anxiety","daily","guided"] },
  { id: "sG7DBA-mgFY", title: "Body Scan Meditation for Sleep (10 Minutes)", channelTitle: "Great Meditation", durationSec: 10*60, thumbnailUrl: "https://i.ytimg.com/vi/sG7DBA-mgFY/hqdefault.jpg", tags: ["sleep","body scan"] },
  { id: "SEfs5TJZ6Nk", title: "Breathing Exercise - 4-7-8 (Guided)", channelTitle: "The Mindful Movement", durationSec: 8*60, thumbnailUrl: "https://i.ytimg.com/vi/SEfs5TJZ6Nk/hqdefault.jpg", tags: ["breath","focus"] },
  { id: "ZToicYcHIOU", title: "15 Minute Meditation for Stress", channelTitle: "Great Meditation", durationSec: 15*60, thumbnailUrl: "https://i.ytimg.com/vi/ZToicYcHIOU/hqdefault.jpg", tags: ["stress","daily"] },
  { id: "O-6f5wQXSu8", title: "5 Minute Morning Meditation", channelTitle: "Great Meditation", durationSec: 5*60, thumbnailUrl: "https://i.ytimg.com/vi/O-6f5wQXSu8/hqdefault.jpg", tags: ["morning","short"] },
];

const corpus = [
  ...curatedVideos,
  { id: "aXItOY0sLRY", title: "20 Minute Guided Meditation for Focus", channelTitle: "The Mindful Movement", durationSec: 20*60, thumbnailUrl: "https://i.ytimg.com/vi/aXItOY0sLRY/hqdefault.jpg", tags: ["focus","work"] },
  { id: "lWn5vIYzW6o", title: "10 Minute Meditation for Beginners", channelTitle: "Great Meditation", durationSec: 10*60, thumbnailUrl: "https://i.ytimg.com/vi/lWn5vIYzW6o/hqdefault.jpg", tags: ["beginner","daily"] },
  { id: "xQq2c9JtG3Q", title: "15 Minute Body Scan", channelTitle: "The Mindful Movement", durationSec: 15*60, thumbnailUrl: "https://i.ytimg.com/vi/xQq2c9JtG3Q/hqdefault.jpg", tags: ["body scan"] },
];

export function mockSearchVideos(query) {
  const q = (query ?? "").toLowerCase().trim();
  if (!q) return corpus;
  const terms = q.split(/\s+/).filter(Boolean);
  const score = (v) => {
    const t = (v.title ?? "").toLowerCase();
    let s = 0; for (const term of terms) if (t.includes(term)) s += 2;
    return s;
  };
  return [...corpus].sort((a,b) => score(b) - score(a));
}

export type MarketUpdate = {
  title: string;
  organizer: string;
  category: string;
  status: string;
  deadline: string;
  audience: string;
  reward: string;
  summary: string;
  officialUrl: string;
  verifiedAt: string;
};

export const marketUpdates: MarketUpdate[] = [
  {
    title: "NASA TechRise Student Challenge 2026–2027",
    organizer: "NASA",
    category: "Science fair",
    status: "Now accepting proposals",
    deadline: "November 2, 2026",
    audience: "U.S. students in grades 6–12, applying in school teams",
    reward: "$1,500 to build the experiment + NASA-supported mentorship",
    summary: "Design an experiment for a NASA-sponsored suborbital flight test. No prior experience is required.",
    officialUrl: "https://www.nasa.gov/stmd-flight-opportunities/access-flight-tests/techrise/",
    verifiedAt: "2026-09-29",
  },
  {
    title: "Regeneron Science Talent Search 2027",
    organizer: "Society for Science",
    category: "Science competition",
    status: "Applications open",
    deadline: "November 5, 2026 at 8 PM ET",
    audience: "Eligible students in their final year of secondary school",
    reward: "$3.1M in annual awards; first-place prize is $250,000",
    summary: "Submit original, independent research to the United States’ oldest and most prestigious high-school science competition.",
    officialUrl: "https://www.societyforscience.org/regeneron-sts/",
    verifiedAt: "2026-09-29",
  },
  {
    title: "NASA Space Apps Challenge 2026",
    organizer: "NASA",
    category: "Global hackathon",
    status: "Registration open",
    deadline: "November 14–15, 2026",
    audience: "Anyone interested in space, science, design, or technology",
    reward: "Global recognition, community, and NASA challenge experience",
    summary: "Join NASA’s largest annual global hackathon and build a solution around real-world space and Earth-science challenges.",
    officialUrl: "https://www.nasa.gov/prizes-challenges-and-crowdsourcing/",
    verifiedAt: "2026-09-29",
  },
  {
    title: "NASA Dream With Us Design Challenge 2026–2027",
    organizer: "NASA Aeronautics",
    category: "Engineering competition",
    status: "Newly opened",
    deadline: "Registration due December 8, 2026",
    audience: "U.S. middle- and high-school students in grades 6–12",
    reward: "Finalist presentation, NASA recognition, and engineering experience",
    summary: "Work in a student team to research and present an aeronautics design responding to a real future-flight challenge.",
    officialUrl: "https://www.nasa.gov/aeronautics/aeronautics-stem/2026-2027-dwu-high-school-engineering-challenge/",
    verifiedAt: "2026-09-29",
  },
];

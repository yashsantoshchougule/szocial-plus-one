import "server-only";
import meera from "@/public/discover/demo/meera.webp";
import arjun from "@/public/discover/demo/arjun.webp";
import ananya from "@/public/discover/demo/ananya.webp";
import kabir from "@/public/discover/demo/kabir.webp";
import type { DirectoryCard } from "./data";
import type { DiscoverFilters } from "./filters";

type DemoMember = DirectoryCard & { bio: string; languages: string[] };

const demoMembers: DemoMember[] = [
  {
    id: "00000090-0000-4000-8000-000000000001",
    display_name: "Meera Kulkarni",
    area: "Bandra",
    activities: ["coffee", "walks"],
    hourly_rate_paise: 65000,
    busy: false,
    photoUrl: meera.src,
    languages: ["English", "Marathi", "Hindi"],
    bio: "I like quiet coffee shops, the Bandstand promenade, and finding independent bookshops. Happy to make an afternoon of any of the three.",
  },
  {
    id: "00000090-0000-4000-8000-000000000002",
    display_name: "Arjun Mehta",
    area: "Fort",
    activities: ["city-outings", "arts-culture"],
    hourly_rate_paise: 80000,
    busy: false,
    photoUrl: arjun.src,
    languages: ["English", "Hindi", "Gujarati"],
    bio: "I’m usually wandering around a gallery or looking up the story behind an old Mumbai building. I enjoy a leisurely city walk with a few stops along the way.",
  },
  {
    id: "00000090-0000-4000-8000-000000000003",
    display_name: "Ananya Rao",
    area: "Powai",
    activities: ["walks", "food"],
    hourly_rate_paise: 70000,
    busy: true,
    photoUrl: ananya.src,
    languages: ["English", "Hindi", "Kannada"],
    bio: "I’m up for a walk near the lake or a long lunch somewhere new. I like discovering small places that do one thing especially well.",
  },
  {
    id: "00000090-0000-4000-8000-000000000004",
    display_name: "Kabir Shah",
    area: "Juhu",
    activities: ["events", "coffee"],
    hourly_rate_paise: 75000,
    busy: false,
    photoUrl: kabir.src,
    languages: ["English", "Hindi", "Gujarati"],
    bio: "I enjoy live music, comedy nights, and an early coffee near the beach. I’m easygoing about plans and like meeting somewhere relaxed.",
  },
];

export function discoverDemoEnabled() {
  return process.env.PLUS_ONE_DISCOVER_DEMO === "1"
    && !process.env.SZOCIAL_PUBLIC_ORIGIN
    && !process.env.PLUS_ONE_DATABASE_URL
    && !Reflect.get(process.env, "NEXT_PUBLIC_SUPABASE_URL")
    && !Reflect.get(process.env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

export function findDemoMembers({ area, activity, after }: DiscoverFilters) {
  return after ? [] : demoMembers.filter((member) =>
    (!area || member.area.toLowerCase() === area.toLowerCase())
    && (!activity || member.activities.includes(activity))
  );
}

export function findDemoMember(id: string) {
  return demoMembers.find((member) => member.id === id);
}

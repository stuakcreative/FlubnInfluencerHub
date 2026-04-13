// ── Centralized worldwide location data ──
// Used in Signup, Profile Edit, and anywhere a location picker is needed.
// The Discover filter derives its options dynamically from live influencer data,
// so it doesn't use this file — but this ensures consistent city names across the app.

export interface LocationGroup {
  region: string;
  cities: string[];
}

export const LOCATION_GROUPS: LocationGroup[] = [
  {
    region: "India",
    cities: [
      "Mumbai, India", "Delhi, India", "Bangalore, India",
      "Hyderabad, India", "Pune, India", "Jaipur, India",
      "Chennai, India", "Kolkata, India", "Ahmedabad, India",
      "Lucknow, India", "Chandigarh, India", "Goa, India",
    ],
  },
  {
    region: "United States",
    cities: [
      "New York, USA", "Los Angeles, USA", "San Francisco, USA",
      "Chicago, USA", "Miami, USA", "Houston, USA",
    ],
  },
  {
    region: "United Kingdom",
    cities: ["London, UK", "Manchester, UK", "Birmingham, UK"],
  },
  {
    region: "UAE",
    cities: ["Dubai, UAE", "Abu Dhabi, UAE"],
  },
  {
    region: "Canada",
    cities: ["Toronto, Canada", "Vancouver, Canada"],
  },
  {
    region: "Australia",
    cities: ["Sydney, Australia", "Melbourne, Australia"],
  },
  {
    region: "Europe",
    cities: [
      "Paris, France", "Berlin, Germany", "Amsterdam, Netherlands",
      "Barcelona, Spain", "Milan, Italy",
    ],
  },
  {
    region: "Asia",
    cities: [
      "Singapore", "Tokyo, Japan", "Seoul, South Korea",
      "Bangkok, Thailand", "Jakarta, Indonesia", "Kuala Lumpur, Malaysia",
    ],
  },
];

// Flat list of all cities (for validation, etc.)
export const ALL_LOCATIONS: string[] = LOCATION_GROUPS.flatMap((g) => g.cities);

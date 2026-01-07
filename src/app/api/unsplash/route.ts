import { NextRequest, NextResponse } from "next/server";

// Unsplash API endpoint
const UNSPLASH_API = "https://api.unsplash.com";

// CURATED FALLBACK IMAGES for categories where Unsplash search fails
// These are direct Unsplash image URLs that are VERIFIED to be relevant
const CURATED_IMAGES: Record<string, string[]> = {
  // Hip hop / streetwear - ACTUAL streetwear fashion images from Unsplash
  "hip hop": [
    "https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=1200", // Person in hoodie urban
    "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=1200", // Streetwear fashion
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1200", // Fashion model
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200", // Street fashion
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200", // Urban style
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200", // Fashion portrait
    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1200", // Street style
    "https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?w=1200", // Urban man fashion
  ],
  "streetwear": [
    "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=1200", // Streetwear fashion
    "https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=1200", // Person in hoodie
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1200", // Fashion model
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200", // Street fashion
    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1200", // Street style
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200", // Urban style
  ],
  "urban fashion": [
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200", // Street fashion
    "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=1200", // Streetwear fashion
    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1200", // Street style
    "https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?w=1200", // Urban man
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200", // Fashion portrait
  ],
  "clothing brand": [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200", // Clothing store
    "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1200", // Fashion retail
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200", // Clothes rack
    "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200", // T-shirts display
  ],
};

// Keywords that should trigger curated images instead of search
const CURATED_TRIGGERS = ["hip hop", "hip-hop", "hiphop", "streetwear", "urban fashion", "urban clothing", "street style"];

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
  };
  width: number;
  height: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const count = parseInt(searchParams.get("count") || "5");
  const orientation = searchParams.get("orientation") || "landscape";

  if (!query) {
    return NextResponse.json({ error: "Query parameter required" }, { status: 400 });
  }

  const lowerQuery = query.toLowerCase();
  
  // CHECK IF THIS IS A CATEGORY WHERE UNSPLASH SEARCH FAILS
  // Use curated images instead of searching
  const shouldUseCurated = CURATED_TRIGGERS.some(trigger => lowerQuery.includes(trigger));
  
  if (shouldUseCurated) {
    // Find the best matching curated category
    let curatedKey = "hip hop"; // default
    for (const key of Object.keys(CURATED_IMAGES)) {
      if (lowerQuery.includes(key)) {
        curatedKey = key;
        break;
      }
    }
    
    const curatedUrls = CURATED_IMAGES[curatedKey] || CURATED_IMAGES["hip hop"];
    
    // Shuffle and return requested count
    const shuffled = [...curatedUrls].sort(() => Math.random() - 0.5);
    const photos = shuffled.slice(0, count).map((url, i) => ({
      id: `curated-${curatedKey}-${i}`,
      url: url,
      thumb: url.replace("w=1200", "w=400"),
      alt: `${curatedKey} fashion`,
      credit: {
        name: "Unsplash",
        username: "unsplash",
        link: "https://unsplash.com"
      },
      width: 1200,
      height: 800
    }));
    
    console.log(`[Unsplash] Using ${photos.length} CURATED images for "${query}" (trigger: ${curatedKey})`);
    return NextResponse.json({ photos, source: "curated" });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({
      photos: generatePlaceholders(query, count),
      source: "placeholder"
    });
  }

  try {
    const response = await fetch(
      `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=${orientation}`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    
    const photos = data.results.map((photo: UnsplashPhoto) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.small,
      alt: photo.alt_description || photo.description || query,
      credit: {
        name: photo.user.name,
        username: photo.user.username,
        link: `https://unsplash.com/@${photo.user.username}?utm_source=buildr&utm_medium=referral`
      },
      width: photo.width,
      height: photo.height
    }));

    return NextResponse.json({ photos, source: "unsplash" });
  } catch (error) {
    console.error("Unsplash API error:", error);
    return NextResponse.json({
      photos: generatePlaceholders(query, count),
      source: "placeholder"
    });
  }
}

// Generate placeholder images when Unsplash is unavailable
function generatePlaceholders(query: string, count: number) {
  const placeholders = [];
  
  // Use high-quality placeholder services
  for (let i = 0; i < count; i++) {
    const width = 1200;
    const height = 800;
    // Use picsum.photos which provides real stock photos
    placeholders.push({
      id: `placeholder-${i}`,
      url: `https://picsum.photos/seed/${encodeURIComponent(query)}${i}/${width}/${height}`,
      thumb: `https://picsum.photos/seed/${encodeURIComponent(query)}${i}/400/300`,
      alt: query,
      credit: null,
      width,
      height
    });
  }
  
  return placeholders;
}

// POST endpoint for batch image search (multiple queries at once)
export async function POST(request: NextRequest) {
  try {
    const { queries } = await request.json();
    
    if (!queries || !Array.isArray(queries)) {
      return NextResponse.json({ error: "Queries array required" }, { status: 400 });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    
    if (!accessKey) {
      // Return placeholders for each query
      const results: Record<string, unknown[]> = {};
      for (const query of queries) {
        results[query] = generatePlaceholders(query, 3);
      }
      return NextResponse.json({ results, source: "placeholder" });
    }

    const results: Record<string, unknown[]> = {};
    
    // Fetch images for each query (with rate limiting consideration)
    for (const query of queries.slice(0, 10)) { // Limit to 10 queries
      try {
        const response = await fetch(
          `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
          {
            headers: {
              Authorization: `Client-ID ${accessKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          results[query] = data.results.map((photo: UnsplashPhoto) => ({
            id: photo.id,
            url: photo.urls.regular,
            thumb: photo.urls.small,
            alt: photo.alt_description || query,
            credit: {
              name: photo.user.name,
              username: photo.user.username,
            }
          }));
        } else {
          results[query] = generatePlaceholders(query, 3);
        }
      } catch {
        results[query] = generatePlaceholders(query, 3);
      }
    }

    return NextResponse.json({ results, source: "unsplash" });
  } catch (error) {
    console.error("Batch Unsplash error:", error);
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}
